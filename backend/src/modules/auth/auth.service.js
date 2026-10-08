import { query, sql } from '../../database/db.js'
import { ApiError } from '../../utils/apiError.js'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { signToken, verifySsoPortalToken } from '../../utils/jwt.js'

async function findUserByLogin(login) {
  const result = await query(
    `
    SELECT TOP 1
      u.id_usuario,
      u.username,
      u.nombre,
      u.email,
      u.password_hash,
      u.activo,
      u.is_owner
    FROM dbo.fleet_users u
    WHERE u.username = @login OR u.email = @login
    `,
    { login: { type: sql.NVarChar(150), value: String(login || '').trim() } },
  )
  return result.recordset[0] || null
}

async function loadRoles(userId) {
  const result = await query(
    `
    SELECT r.nombre
    FROM dbo.fleet_user_roles ur
    INNER JOIN dbo.fleet_roles r ON r.id_rol = ur.id_rol
    WHERE ur.id_usuario = @userId
    `,
    { userId: { type: sql.BigInt, value: userId } },
  )
  return result.recordset.map((row) => row.nombre)
}

function toPublicUser(user, roles) {
  return {
    id_usuario: user.id_usuario,
    username: user.username,
    nombre: user.nombre,
    email: user.email,
    roles,
    is_owner: Boolean(user.is_owner),
  }
}

function isSsoPortalJwtPayload(payload) {
  if (!payload || typeof payload !== 'object') return false
  if (payload.id_usuario != null || payload.sessionId != null || payload.userId != null) return false
  if (payload.type === '2fa-login' || payload.type === 'sso_2fa_login') return false
  if (typeof payload.email !== 'string' || !payload.email.trim()) return false
  if (payload.id == null) return false
  return true
}

/** Intercambia el JWT del portal UCM SSO por una sesión local. El usuario debe existir activo con el mismo correo. */
export async function exchangeSsoToken({ ssoToken }) {
  let payload
  try {
    payload = verifySsoPortalToken(ssoToken)
  } catch {
    throw new ApiError(401, 'Token SSO invalido o expirado')
  }
  if (!isSsoPortalJwtPayload(payload)) {
    throw new ApiError(401, 'Token no es un JWT de portal SSO valido')
  }

  const email = String(payload.email).trim()
  const user = await findUserByLogin(email)
  if (!user || !user.activo) {
    throw new ApiError(403, 'Usuario no autorizado en Fleet. Debe existir activo con el mismo correo del portal SSO.')
  }

  const roles = await loadRoles(user.id_usuario)
  const publicUser = toPublicUser(user, roles)
  const token = signToken({
    id_usuario: publicUser.id_usuario,
    username: publicUser.username,
    email: publicUser.email,
    nombre: publicUser.nombre,
    roles: publicUser.roles,
    is_owner: publicUser.is_owner,
  })
  return { token, user: publicUser }
}

export async function login({ username, password }) {
  const user = await findUserByLogin(username)
  if (!user || !user.activo) {
    throw new ApiError(401, 'Credenciales invalidas')
  }
  if (!verifyPassword(password, user.password_hash)) {
    throw new ApiError(401, 'Credenciales invalidas')
  }

  const roles = await loadRoles(user.id_usuario)
  const publicUser = toPublicUser(user, roles)
  const token = signToken({
    id_usuario: publicUser.id_usuario,
    username: publicUser.username,
    email: publicUser.email,
    nombre: publicUser.nombre,
    roles: publicUser.roles,
    is_owner: publicUser.is_owner,
  })

  return { token, user: publicUser }
}

export async function getMe(userId) {
  const result = await query(
    `
    SELECT id_usuario, username, nombre, email, activo, is_owner
    FROM dbo.fleet_users
    WHERE id_usuario = @userId
    `,
    { userId: { type: sql.BigInt, value: userId } },
  )
  const user = result.recordset[0]
  if (!user || !user.activo) {
    throw new ApiError(401, 'Sesion invalida')
  }
  const roles = await loadRoles(user.id_usuario)
  return toPublicUser(user, roles)
}

export async function ensureSeedAdmin() {
  const existing = await query('SELECT TOP 1 id_usuario FROM dbo.fleet_users')
  if (existing.recordset.length) return

  const passwordHash = hashPassword('123456')
  const insert = await query(
    `
    INSERT INTO dbo.fleet_users (username, nombre, email, password_hash, is_owner, activo)
    OUTPUT INSERTED.id_usuario
    VALUES (@username, @nombre, @email, @password_hash, 1, 1)
    `,
    {
      username: { type: sql.NVarChar(80), value: 'admin' },
      nombre: { type: sql.NVarChar(150), value: 'Administrador Fleet' },
      email: { type: sql.NVarChar(150), value: 'admin@ucmfleet.local' },
      password_hash: { type: sql.NVarChar(255), value: passwordHash },
    },
  )
  const userId = insert.recordset[0].id_usuario
  const role = await query(
    `
    INSERT INTO dbo.fleet_roles (nombre, descripcion)
    OUTPUT INSERTED.id_rol
    VALUES (N'Administrador', N'Acceso total a UCM Fleet')
    `,
  )
  const roleId = role.recordset[0].id_rol
  await query(
    `INSERT INTO dbo.fleet_user_roles (id_usuario, id_rol) VALUES (@userId, @roleId)`,
    {
      userId: { type: sql.BigInt, value: userId },
      roleId: { type: sql.BigInt, value: roleId },
    },
  )
  console.log('Seed admin creado: admin / 123456')
}
