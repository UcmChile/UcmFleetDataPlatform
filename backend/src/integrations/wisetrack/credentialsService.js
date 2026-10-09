import { query, sql } from '../../database/db.js'
import { ApiError } from '../../utils/apiError.js'
import { decryptSecret, encryptSecret, maskPassword, maskToken } from './cryptoSecrets.js'

const DEFAULT_BASE_URL = 'https://api-gateway.wisetrack.cl/prod'
/** Contrato Postman WT-UCM: POST {{baseUrl}}/ucm/v1/auth/getToken → { token } */
const DEFAULT_AUTH_PATH = '/ucm/v1/auth/getToken'

function normalizeAuthPath(path) {
  const value = String(path || DEFAULT_AUTH_PATH).trim() || DEFAULT_AUTH_PATH
  return value.startsWith('/') ? value : `/${value}`
}

function extractTokenPayload(body) {
  // Postman WT-UCM guarda pm.response.json().token
  const data = body && typeof body === 'object' ? body : {}
  const nested = data.data && typeof data.data === 'object' ? data.data : null
  const accessToken =
    data.token
    || data.access_token
    || data.accessToken
    || nested?.token
    || nested?.access_token
    || data.jwt
    || data.IdToken
    || data.id_token
    || data.AuthenticationResult?.AccessToken
    || null

  const tokenType = data.token_type || data.tokenType || nested?.token_type || 'Bearer'
  const expiresIn = Number(
    data.expires_in
    || data.expiresIn
    || nested?.expires_in
    || data.AuthenticationResult?.ExpiresIn
    || 0,
  )
  const expiresAtRaw = data.expires_at || data.expiresAt || nested?.expires_at || null

  let expiresAt = null
  if (expiresAtRaw) {
    const parsed = new Date(expiresAtRaw)
    if (!Number.isNaN(parsed.getTime())) expiresAt = parsed
  } else if (expiresIn > 0) {
    expiresAt = new Date(Date.now() + expiresIn * 1000)
  } else {
    // Token JWT sin expires_in explícito: 1 hora por defecto (renovable)
    expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  }

  return { accessToken, tokenType, expiresAt }
}

export async function getActiveConfig() {
  const result = await query(`
    SELECT TOP 1 *
    FROM dbo.wisetrack_api_config
    WHERE is_active = 1
    ORDER BY id DESC
  `)
  return result.recordset[0] || null
}

export async function getConfigPublic() {
  const row = await getActiveConfig()
  if (!row) {
    return {
      configured: false,
      base_url: DEFAULT_BASE_URL,
      auth_path: DEFAULT_AUTH_PATH,
      username: '',
      has_password: false,
      last_auth_at: null,
      last_auth_status: null,
      last_auth_error: null,
    }
  }
  return {
    configured: true,
    id: row.id,
    name: row.name,
    base_url: row.base_url,
    auth_path: row.auth_path,
    username: row.username,
    has_password: Boolean(row.password_enc),
    password: maskPassword(),
    is_active: Boolean(row.is_active),
    last_auth_at: row.last_auth_at,
    last_auth_status: row.last_auth_status,
    last_auth_error: row.last_auth_error,
    updated_at: row.updated_at,
  }
}

export async function upsertCredentials(input = {}) {
  const baseUrl = String(input.base_url || DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
  const authPath = normalizeAuthPath(input.auth_path)
  const username = String(input.username || '').trim()
  const passwordPlain = input.password != null ? String(input.password) : ''

  if (!baseUrl) throw new ApiError(422, 'base_url es requerido')
  if (!username) throw new ApiError(422, 'username es requerido')

  const existing = await getActiveConfig()
  if (!passwordPlain && !existing) {
    throw new ApiError(422, 'password es requerido')
  }

  const passwordEnc = passwordPlain && passwordPlain !== maskPassword()
    ? encryptSecret(passwordPlain)
    : existing?.password_enc

  if (!passwordEnc) throw new ApiError(422, 'password es requerido')

  if (existing) {
    await query(
      `
      UPDATE dbo.wisetrack_api_config
      SET base_url = @base_url,
          auth_path = @auth_path,
          username = @username,
          password_enc = @password_enc,
          is_active = 1,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: existing.id },
        base_url: { type: sql.NVarChar(255), value: baseUrl },
        auth_path: { type: sql.NVarChar(120), value: authPath },
        username: { type: sql.NVarChar(150), value: username },
        password_enc: { type: sql.NVarChar(sql.MAX), value: passwordEnc },
      },
    )
    return getConfigPublic()
  }

  await query(
    `
    INSERT INTO dbo.wisetrack_api_config
      (name, base_url, auth_path, username, password_enc, is_active)
    VALUES (N'default', @base_url, @auth_path, @username, @password_enc, 1)
    `,
    {
      base_url: { type: sql.NVarChar(255), value: baseUrl },
      auth_path: { type: sql.NVarChar(120), value: authPath },
      username: { type: sql.NVarChar(150), value: username },
      password_enc: { type: sql.NVarChar(sql.MAX), value: passwordEnc },
    },
  )
  return getConfigPublic()
}

async function deactivateActiveTokens(configId) {
  await query(
    `
    UPDATE dbo.wisetrack_api_tokens
    SET is_active = 0, status = 'replaced'
    WHERE config_id = @config_id AND is_active = 1
    `,
    { config_id: { type: sql.BigInt, value: configId } },
  )
}

export async function getActiveTokenRecord(configId) {
  const result = await query(
    `
    SELECT TOP 1 *
    FROM dbo.wisetrack_api_tokens
    WHERE config_id = @config_id AND is_active = 1 AND status = 'active'
    ORDER BY obtained_at DESC, id DESC
    `,
    { config_id: { type: sql.BigInt, value: configId } },
  )
  return result.recordset[0] || null
}

export async function getActiveTokenPublic() {
  const config = await getActiveConfig()
  if (!config) return { has_token: false, token: null }
  const token = await getActiveTokenRecord(config.id)
  if (!token) return { has_token: false, token: null, config_id: config.id }

  const expired = token.expires_at && new Date(token.expires_at).getTime() < Date.now()
  return {
    has_token: true,
    config_id: config.id,
    token_id: token.id,
    access_token_masked: maskToken(token.access_token),
    token_type: token.token_type || 'Bearer',
    expires_at: token.expires_at,
    obtained_at: token.obtained_at,
    is_expired: Boolean(expired),
    status: expired ? 'expired' : token.status,
  }
}

/** Token en claro solo para uso interno del cliente HTTP. */
export async function getBearerToken() {
  const config = await getActiveConfig()
  if (!config) return null
  const token = await getActiveTokenRecord(config.id)
  if (!token) return null
  if (token.expires_at && new Date(token.expires_at).getTime() < Date.now() - 30_000) {
    return null
  }
  return {
    token: token.access_token,
    tokenType: token.token_type || 'Bearer',
    expiresAt: token.expires_at,
    config,
  }
}

export async function obtainTokenFromApi() {
  const config = await getActiveConfig()
  if (!config) {
    throw new ApiError(422, 'Guarde primero las credenciales Wisetrack')
  }

  let password
  try {
    password = decryptSecret(config.password_enc)
  } catch (error) {
    const hint =
      'No se pudo descifrar password_enc (AES-GCM). Si migró la BD desde desarrollo, '
      + 'JWT_SECRET en backend/.env debe ser el mismo con el que se guardaron las credenciales, '
      + 'o vuelva a guardar usuario/password en Integraciones Wisetrack en este entorno.'
    throw new ApiError(422, hint, { crypto: String(error?.message || error) })
  }
  const url = `${String(config.base_url).replace(/\/+$/, '')}${normalizeAuthPath(config.auth_path)}`

  let response
  let bodyText = ''
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: config.username,
        password,
      }),
    })
    bodyText = await response.text()
  } catch (error) {
    await query(
      `
      UPDATE dbo.wisetrack_api_config
      SET last_auth_at = SYSDATETIMEOFFSET(),
          last_auth_status = 'failed',
          last_auth_error = @error,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: config.id },
        error: { type: sql.NVarChar(sql.MAX), value: String(error.message || error) },
      },
    )
    throw new ApiError(502, `No se pudo contactar Wisetrack: ${error.message}`)
  }

  let parsed = null
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null
  } catch {
    parsed = { raw: bodyText }
  }

  if (!response.ok) {
    const message = parsed?.message || parsed?.error || parsed?.Message || bodyText || `HTTP ${response.status}`
    await query(
      `
      UPDATE dbo.wisetrack_api_config
      SET last_auth_at = SYSDATETIMEOFFSET(),
          last_auth_status = 'failed',
          last_auth_error = @error,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: config.id },
        error: { type: sql.NVarChar(sql.MAX), value: String(message).slice(0, 4000) },
      },
    )
    throw new ApiError(response.status === 401 || response.status === 403 ? 401 : 502, `Auth Wisetrack falló: ${message}`)
  }

  const { accessToken, tokenType, expiresAt } = extractTokenPayload(parsed)
  if (!accessToken) {
    await query(
      `
      UPDATE dbo.wisetrack_api_config
      SET last_auth_at = SYSDATETIMEOFFSET(),
          last_auth_status = 'failed',
          last_auth_error = @error,
          updated_at = SYSUTCDATETIME()
      WHERE id = @id
      `,
      {
        id: { type: sql.BigInt, value: config.id },
        error: {
          type: sql.NVarChar(sql.MAX),
          value: 'Respuesta OK pero sin access_token/token reconocible. Ajuste auth_path o revise el contrato de la API.',
        },
      },
    )
    throw new ApiError(502, 'Wisetrack respondió OK pero no se encontró el token en la respuesta')
  }

  await deactivateActiveTokens(config.id)

  const inserted = await query(
    `
    INSERT INTO dbo.wisetrack_api_tokens
      (config_id, access_token, token_type, expires_at, is_active, status, source, notes)
    OUTPUT INSERTED.id, INSERTED.obtained_at, INSERTED.expires_at, INSERTED.token_type
    VALUES (@config_id, @access_token, @token_type, @expires_at, 1, 'active', 'login', N'Obtenido desde API')
    `,
    {
      config_id: { type: sql.BigInt, value: config.id },
      access_token: { type: sql.NVarChar(sql.MAX), value: accessToken },
      token_type: { type: sql.NVarChar(40), value: tokenType },
      expires_at: { type: sql.DateTimeOffset, value: expiresAt },
    },
  )

  await query(
    `
    UPDATE dbo.wisetrack_api_config
    SET last_auth_at = SYSDATETIMEOFFSET(),
        last_auth_status = 'success',
        last_auth_error = NULL,
        updated_at = SYSUTCDATETIME()
    WHERE id = @id
    `,
    { id: { type: sql.BigInt, value: config.id } },
  )

  const row = inserted.recordset[0]
  return {
    token_id: row.id,
    access_token_masked: maskToken(accessToken),
    token_type: row.token_type,
    expires_at: row.expires_at,
    obtained_at: row.obtained_at,
    auth_url: url,
  }
}

export async function listTokens({ page = 1, pageSize = 25 } = {}) {
  const offset = (Math.max(1, page) - 1) * pageSize
  const count = await query('SELECT COUNT(1) AS total FROM dbo.wisetrack_api_tokens')
  const result = await query(
    `
    SELECT t.id, t.config_id, t.token_type, t.expires_at, t.obtained_at, t.is_active, t.status, t.source, t.notes,
           t.access_token
    FROM dbo.wisetrack_api_tokens t
    ORDER BY t.obtained_at DESC, t.id DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `,
    {
      offset: { type: sql.Int, value: offset },
      pageSize: { type: sql.Int, value: pageSize },
    },
  )

  return {
    data: result.recordset.map((row) => ({
      id: row.id,
      config_id: row.config_id,
      access_token_masked: maskToken(row.access_token),
      token_type: row.token_type,
      expires_at: row.expires_at,
      obtained_at: row.obtained_at,
      is_active: Boolean(row.is_active),
      is_disabled: !row.is_active,
      status: row.status,
      source: row.source,
      notes: row.notes,
      name: maskToken(row.access_token),
    })),
    total: count.recordset[0]?.total || 0,
    page,
    pageSize,
  }
}
