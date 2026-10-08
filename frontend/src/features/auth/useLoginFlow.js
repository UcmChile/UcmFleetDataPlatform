import { useEffect, useState } from 'react'
import {
  fetchAuthCapabilities,
  loginWithCredentials,
  requestPasswordResetCode,
  resetPasswordWithCode,
  verifyTwoFactorCode,
} from './authApi'

export const LOGIN_STEPS = {
  LOGIN: 'login',
  TWO_FA: '2fa',
  FORGOT: 'forgot',
  RESET: 'reset',
}

export function useLoginFlow({ onLogin }) {
  const [step, setStep] = useState(LOGIN_STEPS.LOGIN)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [emailHint, setEmailHint] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [backendWarning, setBackendWarning] = useState('')

  useEffect(() => {
    fetchAuthCapabilities().then((capabilities) => {
      if (!capabilities?.loginByUsername) {
        setBackendWarning(
          'El backend no esta actualizado. Reinicia el servicio API (npm run dev en /backend) para habilitar login por usuario.',
        )
        return
      }
      setBackendWarning('')
    })
  }, [])

  function resetMessages() {
    setError('')
    setInfo('')
  }

  function goToLogin() {
    resetMessages()
    setStep(LOGIN_STEPS.LOGIN)
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setChallengeId('')
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      const payload = await loginWithCredentials(loginId.trim(), password)
      if (payload?.requires2fa) {
        setChallengeId(payload.challengeId)
        setEmailHint(payload.emailHint || '')
        let infoMessage = payload.message || 'Revisa tu correo e ingresa el codigo de verificacion.'
        if (payload.devCode) {
          infoMessage = `${infoMessage} Codigo (desarrollo): ${payload.devCode}`
        }
        setInfo(infoMessage)
        setStep(LOGIN_STEPS.TWO_FA)
        return
      }
      onLogin(payload)
    } catch (err) {
      setError(normalizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handle2faSubmit(event) {
    event.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      const payload = await verifyTwoFactorCode(challengeId, code.trim())
      onLogin(payload)
    } catch (err) {
      setError(normalizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault()
    resetMessages()
    setLoading(true)

    try {
      const payload = await requestPasswordResetCode(loginId.trim())
      if (payload.challengeId) setChallengeId(payload.challengeId)
      setInfo(payload.message || 'Si la cuenta existe, recibiras un codigo de recuperacion.')
      if (payload.devCode) {
        setInfo(`${payload.message} Codigo de desarrollo: ${payload.devCode}`)
      }
      setStep(LOGIN_STEPS.RESET)
    } catch (err) {
      setError(normalizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleResetSubmit(event) {
    event.preventDefault()
    resetMessages()

    if (newPassword.length < 6) {
      setError('La nueva contrasena debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('La confirmacion no coincide con la nueva contrasena.')
      return
    }

    setLoading(true)

    try {
      const payload = await resetPasswordWithCode({
        loginId: loginId.trim(),
        challengeId,
        code: code.trim(),
        newPassword,
      })
      setInfo(payload.message || 'Contrasena actualizada. Ya puedes iniciar sesion.')
      setPassword('')
      setCode('')
      setNewPassword('')
      setConfirmPassword('')
      setChallengeId('')
      setStep(LOGIN_STEPS.LOGIN)
    } catch (err) {
      setError(normalizeAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    [LOGIN_STEPS.LOGIN]: { eyebrow: 'Acceso seguro', title: 'Iniciar sesion' },
    [LOGIN_STEPS.TWO_FA]: { eyebrow: 'Verificacion 2FA', title: 'Ingresa tu codigo' },
    [LOGIN_STEPS.FORGOT]: { eyebrow: 'Recuperacion', title: 'Olvidaste tu contrasena?' },
    [LOGIN_STEPS.RESET]: { eyebrow: 'Nueva contrasena', title: 'Restablecer acceso' },
  }

  return {
    step,
    titles,
    current: titles[step],
    loginId,
    setLoginId,
    password,
    setPassword,
    code,
    setCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    emailHint,
    info,
    error,
    loading,
    backendWarning,
    resetMessages,
    goToLogin,
    setStep,
    handleLoginSubmit,
    handle2faSubmit,
    handleForgotSubmit,
    handleResetSubmit,
  }
}

function normalizeAuthError(error) {
  const message = error?.message || 'No se pudo completar la operacion'

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'No se pudo conectar con la API. En la raiz del proyecto ejecuta: npm run dev:stop y luego npm run dev. Abre http://localhost:5173/crm/login'
  }

  if (message.includes('Email y contrasena son obligatorios')) {
    return 'El servidor API esta desactualizado. Reinicia el backend (carpeta backend: npm run dev) e intenta con usuario o email.'
  }

  return message
}
