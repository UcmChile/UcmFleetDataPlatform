import { apiRequest, setSession } from '../../services/api'

const AUTH_PATH = '/auth'

export function buildAuthIdentifierPayload(loginId) {
  const login = String(loginId || '').trim()
  return {
    login,
    usuario: login,
    identifier: login,
    ...(login.includes('@') ? { email: login } : {}),
  }
}

export async function fetchAuthCapabilities() {
  try {
    return await apiRequest(`${AUTH_PATH}/capabilities`)
  } catch {
    return { version: 1, loginByUsername: false }
  }
}

/** Intercambia el JWT del portal UCM SSO (`#sso_token`) por la sesión local. */
export async function exchangeSsoToken(ssoToken) {
  const payload = await apiRequest(`${AUTH_PATH}/sso`, {
    method: 'POST',
    body: JSON.stringify({ ssoToken }),
  })
  if (payload?.token && payload?.user) setSession(payload)
  return payload
}

export async function loginWithCredentials(loginId, password) {
  const payload = await apiRequest(`${AUTH_PATH}/login`, {
    method: 'POST',
    body: JSON.stringify({
      ...buildAuthIdentifierPayload(loginId),
      password,
    }),
  })

  if (payload?.requires2fa) return payload

  setSession(payload)
  return payload
}

export async function verifyTwoFactorCode(challengeId, code) {
  const payload = await apiRequest(`${AUTH_PATH}/verify-2fa`, {
    method: 'POST',
    body: JSON.stringify({ challengeId, code }),
  })
  setSession(payload)
  return payload
}

export async function requestPasswordResetCode(loginId) {
  return apiRequest(`${AUTH_PATH}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify(buildAuthIdentifierPayload(loginId)),
  })
}

export async function resetPasswordWithCode({ loginId, challengeId, code, newPassword }) {
  return apiRequest(`${AUTH_PATH}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({
      ...buildAuthIdentifierPayload(loginId),
      challengeId,
      code,
      new_password: newPassword,
    }),
  })
}

export async function updateUserProfile({ nombre, email }) {
  return apiRequest(`${AUTH_PATH}/profile`, {
    method: 'PATCH',
    body: JSON.stringify({ nombre, email }),
  })
}
