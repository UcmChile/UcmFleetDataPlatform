import { query, sql } from '../../database/db.js'
import { ApiError } from '../../utils/apiError.js'
import { hashPassword } from '../../utils/password.js'

const PROFILES = ['Administrador', 'Usuario']
const DEFAULT_PROFILE = 'Administrador'

function clean(value, max) {
  const text = String(value ?? '').trim()
  if (max && text.length > max) return text.slice(0, max)
  return text
}

function isActiveFlag(value) {
  if (value === false || value === 0 || value === '0' || value === 'false') return false
  return true
}

function resolveProfile(value) {
  const name = clean(value, 80)
  return PROFILES.includes(name) ? name : DEFAULT_PROFILE
}

async function ensureProfileRole(nombre) {
  const existing = await query(
    `SELECT TOP 1 id_rol FROM dbo.fleet_roles WHERE nombre = @nombre`,
    { nombre: { type: sql.NVarChar(80), value: nombre } },
  )
  if (existing.recordset[0]) return existing.recordset[0].id_rol

  const inserted = await query(
    `
    INSERT INTO dbo.fleet_roles (nombre, descripcion)
    OUTPUT INSERTED.id_rol
    VALUES (@nombre, N'Acceso total a UCM Fleet')
    `,
    { nombre: { type: sql.NVarChar(80), value: nombre } },
  )
  return inserted.recordset[0].id_rol
}

async function ensureProfiles() {
  const ids = {}
  for (const nombre of PROFILES) {
    ids[nombre] = await ensureProfileRole(nombre)
  }
  return ids
}

async function setUserProfile(userId, perfil) {
  const ids = await ensureProfiles()
  const roleId = ids[resolveProfile(perfil)]
  await query(
    `DELETE FROM dbo.fleet_user_roles WHERE id_usuario = @userId`,
    { userId: { type: sql.BigInt, value: userId } },
  )
  await query(
    `INSERT INTO dbo.fleet_user_roles (id_usuario, id_rol) VALUES (@userId, @roleId)`,
    {
      userId: { type: sql.BigInt, value: userId },
      roleId: { type: sql.BigInt, value: roleId },
    },
  )
}

function mapUser(row) {
  return {
    id_usuario: Number(row.id_usuario),
    username: row.username,
    nombre: row.nombre,
    email: row.email,
    activo: Boolean(row.activo),
    is_owner: Boolean(row.is_owner),
    perfil: PROFILES.includes(row.perfil) ? row.perfil : (row.is_owner ? DEFAULT_PROFILE : 'Usuario'),
    created_at: row.created_at,
  }
}

const PROFILE_SQL = `
  COALESCE(
    (
      SELECT TOP 1 r.nombre
      FROM dbo.fleet_user_roles ur
      INNER JOIN dbo.fleet_roles r ON r.id_rol = ur.id_rol
      WHERE ur.id_usuario = u.id_usuario
      ORDER BY CASE WHEN r.nombre = N'Administrador' THEN 0 ELSE 1 END, r.nombre
    ),
    CASE WHEN u.is_owner = 1 THEN N'Administrador' ELSE N'Usuario' END
  )
`

export async function listUsers() {
  const ids = await ensureProfiles()
  await query(
    `
    INSERT INTO dbo.fleet_user_roles (id_usuario, id_rol)
    SELECT u.id_usuario, @roleId
    FROM dbo.fleet_users u
    WHERE u.is_owner = 1
      AND NOT EXISTS (
        SELECT 1 FROM dbo.fleet_user_roles ur WHERE ur.id_usuario = u.id_usuario
      )
    `,
    { roleId: { type: sql.BigInt, value: ids.Administrador } },
  )
  const result = await query(`
    SELECT
      u.id_usuario,
      u.username,
      u.nombre,
      u.email,
      u.activo,
      u.is_owner,
      ${PROFILE_SQL} AS perfil,
      CONVERT(varchar(33), u.created_at, 127) AS created_at
    FROM dbo.fleet_users u
    ORDER BY u.nombre, u.username
  `)
  return result.recordset.map(mapUser)
}

export async function createUser(input) {
  const username = clean(input.username, 80)
  const nombre = clean(input.nombre, 150)
  const email = clean(input.email, 150).toLowerCase()
  const password = String(input.password || '')

  if (!username) throw new ApiError(422, 'El usuario es requerido')
  if (!nombre) throw new ApiError(422, 'El nombre es requerido')
  if (!email || !email.includes('@')) throw new ApiError(422, 'El email es inválido')
  if (password.length < 6) throw new ApiError(422, 'La contraseña debe tener al menos 6 caracteres')

  const duplicate = await query(
    `
    SELECT TOP 1 username, email
    FROM dbo.fleet_users
    WHERE username = @username OR email = @email
    `,
    {
      username: { type: sql.NVarChar(80), value: username },
      email: { type: sql.NVarChar(150), value: email },
    },
  )
  if (duplicate.recordset[0]) {
    throw new ApiError(422, 'Ya existe un usuario con ese nombre de acceso o correo')
  }

  const perfil = resolveProfile(input.perfil)
  const inserted = await query(
    `
    INSERT INTO dbo.fleet_users (username, nombre, email, password_hash, is_owner, activo)
    OUTPUT INSERTED.id_usuario
    VALUES (@username, @nombre, @email, @password_hash, 0, 1)
    `,
    {
      username: { type: sql.NVarChar(80), value: username },
      nombre: { type: sql.NVarChar(150), value: nombre },
      email: { type: sql.NVarChar(150), value: email },
      password_hash: { type: sql.NVarChar(255), value: hashPassword(password) },
    },
  )
  const userId = inserted.recordset[0].id_usuario
  await setUserProfile(userId, perfil)
  const rows = await listUsers()
  return rows.find((row) => row.id_usuario === Number(userId))
}

export async function updateUser(userId, input) {
  const current = await query(
    `SELECT id_usuario, is_owner FROM dbo.fleet_users WHERE id_usuario = @id`,
    { id: { type: sql.BigInt, value: userId } },
  )
  const row = current.recordset[0]
  if (!row) throw new ApiError(404, 'Usuario no encontrado')

  const username = clean(input.username, 80)
  const nombre = clean(input.nombre, 150)
  const email = clean(input.email, 150).toLowerCase()
  const activo = isActiveFlag(input.activo)

  if (!username) throw new ApiError(422, 'El usuario es requerido')
  if (!nombre) throw new ApiError(422, 'El nombre es requerido')
  if (!email || !email.includes('@')) throw new ApiError(422, 'El email es inválido')
  if (row.is_owner && !activo) throw new ApiError(422, 'No se puede desactivar el usuario owner')

  const duplicate = await query(
    `
    SELECT TOP 1 id_usuario
    FROM dbo.fleet_users
    WHERE id_usuario <> @id AND (username = @username OR email = @email)
    `,
    {
      id: { type: sql.BigInt, value: userId },
      username: { type: sql.NVarChar(80), value: username },
      email: { type: sql.NVarChar(150), value: email },
    },
  )
  if (duplicate.recordset[0]) {
    throw new ApiError(422, 'Ya existe un usuario con ese nombre de acceso o correo')
  }

  await query(
    `
    UPDATE dbo.fleet_users
    SET username = @username,
        nombre = @nombre,
        email = @email,
        activo = @activo,
        updated_at = SYSUTCDATETIME()
    WHERE id_usuario = @id
    `,
    {
      id: { type: sql.BigInt, value: userId },
      username: { type: sql.NVarChar(80), value: username },
      nombre: { type: sql.NVarChar(150), value: nombre },
      email: { type: sql.NVarChar(150), value: email },
      activo: { type: sql.Bit, value: activo ? 1 : 0 },
    },
  )
  await setUserProfile(userId, row.is_owner ? DEFAULT_PROFILE : input.perfil)
  const rows = await listUsers()
  return rows.find((item) => item.id_usuario === Number(userId))
}

export async function resetUserPassword(userId, password) {
  const plain = String(password || '')
  if (plain.length < 6) throw new ApiError(422, 'La contraseña debe tener al menos 6 caracteres')
  const current = await query(
    `SELECT id_usuario FROM dbo.fleet_users WHERE id_usuario = @id`,
    { id: { type: sql.BigInt, value: userId } },
  )
  if (!current.recordset[0]) throw new ApiError(404, 'Usuario no encontrado')
  await query(
    `
    UPDATE dbo.fleet_users
    SET password_hash = @password_hash, updated_at = SYSUTCDATETIME()
    WHERE id_usuario = @id
    `,
    {
      id: { type: sql.BigInt, value: userId },
      password_hash: { type: sql.NVarChar(255), value: hashPassword(plain) },
    },
  )
  return { ok: true }
}

export async function deleteUser(userId, actorId) {
  if (Number(userId) === Number(actorId)) {
    throw new ApiError(422, 'No puedes eliminar tu propio usuario')
  }
  const current = await query(
    `SELECT id_usuario, is_owner FROM dbo.fleet_users WHERE id_usuario = @id`,
    { id: { type: sql.BigInt, value: userId } },
  )
  const row = current.recordset[0]
  if (!row) throw new ApiError(404, 'Usuario no encontrado')
  if (row.is_owner) throw new ApiError(422, 'No se puede eliminar el usuario owner')

  await query(
    `DELETE FROM dbo.fleet_user_roles WHERE id_usuario = @id`,
    { id: { type: sql.BigInt, value: userId } },
  )
  await query(
    `DELETE FROM dbo.fleet_users WHERE id_usuario = @id`,
    { id: { type: sql.BigInt, value: userId } },
  )
  return { ok: true }
}
