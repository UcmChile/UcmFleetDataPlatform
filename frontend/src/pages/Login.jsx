import { Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, UserRound } from 'lucide-react'
import { LoginBrand } from '../components/auth/LoginBrand'
import { FormLabel } from '../components/crm/FormField'
import { useLoginParallax } from '../hooks/use-login-parallax'
import { LOGIN_STEPS, useLoginFlow } from '../features/auth/useLoginFlow'
import { loginCardClassName, loginForgotLinkClassName, loginPrimaryButtonClassName } from '../lib/login-shell'
import { resolveAppReturnTo } from '../lib/routes'
import { isValidSession } from '../services/api'

function Login({ session, onLogin, ssoError = null }) {
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'
  const returnTo = resolveAppReturnTo(searchParams.get('returnTo'))
  const parallax = useLoginParallax()
  const flow = useLoginFlow({ onLogin })

  if (isValidSession(session)) return <Navigate to={returnTo} replace />

  const inputClass =
    'h-11 w-full rounded-xl border border-gray-200/80 bg-white/90 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-white/5 dark:text-gray-100'

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4"
      onMouseMove={parallax.onMouseMove}
      onMouseLeave={parallax.onMouseLeave}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.20),transparent_55%)]" style={parallax.layerStyle(8, 6)} />
      <div className="ag-orb-a pointer-events-none absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-violet-500/30 blur-[100px]" style={parallax.layerStyle(20, -16)} />
      <div className="ag-orb-b pointer-events-none absolute -right-1/4 bottom-0 h-[30rem] w-[30rem] rounded-full bg-cyan-400/25 blur-[110px]" style={parallax.layerStyle(-18, 14)} />
      <div className="ag-aurora pointer-events-none absolute inset-0 opacity-80" style={parallax.layerStyle(6, -4)} />
      <div className="ag-login-grid pointer-events-none absolute inset-0 opacity-[0.35]" style={parallax.layerStyle(-8, 6)} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80" />

      <div className="relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:gap-10">
        <section className="hidden lg:block lg:order-2 lg:self-start">
          <LoginBrand variant="dark" />
        </section>

        <section className="mx-auto w-full max-w-md lg:order-1">
          <div className={loginCardClassName}>
            <LoginBrand variant="light" className="mb-6 lg:hidden" />

            <div className="mb-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">{flow.current.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">{flow.current.title}</h2>
              {flow.step === LOGIN_STEPS.TWO_FA && flow.emailHint && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Codigo enviado a {flow.emailHint}</p>
              )}
            </div>

            {ssoError && (
              <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-900 ring-1 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:ring-rose-900/50">
                {ssoError}
              </p>
            )}

            {sessionExpired && (
              <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/50">
                Tu sesion expiro. Ingresa nuevamente para continuar.
              </p>
            )}

            {flow.backendWarning && (
              <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
                {flow.backendWarning}
              </p>
            )}

            {flow.step === LOGIN_STEPS.LOGIN && (
              <form onSubmit={flow.handleLoginSubmit} className="space-y-4" noValidate>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Usuario o email
                  </FormLabel>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={flow.loginId}
                      onChange={(event) => flow.setLoginId(event.target.value)}
                      type="text"
                      name="login"
                      autoFocus
                      autoComplete="username"
                      placeholder="ej. admin o usuario@ucmchile.com"
                      className={`${inputClass} pl-10 pr-3`}
                      required
                    />
                  </span>
                </label>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Contrasena
                  </FormLabel>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={flow.password}
                      onChange={(event) => flow.setPassword(event.target.value)}
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      className={`${inputClass} pl-10 pr-3`}
                      required
                    />
                  </span>
                </label>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className={loginForgotLinkClassName}
                    onClick={() => {
                      flow.resetMessages()
                      flow.setStep(LOGIN_STEPS.FORGOT)
                    }}
                  >
                    Olvidaste tu contrasena?
                  </button>
                </div>
                {flow.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">{flow.error}</p>}
                {flow.info && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-100">{flow.info}</p>}
                <button type="submit" disabled={flow.loading} className={loginPrimaryButtonClassName}>
                  {flow.loading ? 'Validando...' : 'Entrar'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {flow.step === LOGIN_STEPS.TWO_FA && (
              <form onSubmit={flow.handle2faSubmit} className="space-y-4" noValidate>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Codigo de verificacion
                  </FormLabel>
                  <span className="relative block">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={flow.code}
                      onChange={(event) => flow.setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className={`${inputClass} pl-10 pr-3 text-center text-lg tracking-[0.35em]`}
                      required
                    />
                  </span>
                </label>
                {flow.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">{flow.error}</p>}
                {flow.info && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-100">{flow.info}</p>}
                <button type="submit" disabled={flow.loading || flow.code.length < 6} className={loginPrimaryButtonClassName}>
                  {flow.loading ? 'Verificando...' : 'Confirmar codigo'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={flow.goToLogin} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesion
                </button>
              </form>
            )}

            {flow.step === LOGIN_STEPS.FORGOT && (
              <form onSubmit={flow.handleForgotSubmit} className="space-y-4" noValidate>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ingresa tu usuario o correo registrado. Te enviaremos un codigo para restablecer la contrasena.
                </p>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Usuario o email
                  </FormLabel>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={flow.loginId}
                      onChange={(event) => flow.setLoginId(event.target.value)}
                      type="text"
                      name="login"
                      autoComplete="username"
                      placeholder="ej. admin o usuario@ucmchile.com"
                      className={`${inputClass} pl-10 pr-3`}
                      required
                    />
                  </span>
                </label>
                {flow.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">{flow.error}</p>}
                {flow.info && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-100">{flow.info}</p>}
                <button type="submit" disabled={flow.loading} className={loginPrimaryButtonClassName}>
                  {flow.loading ? 'Enviando...' : 'Enviar codigo'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={flow.goToLogin} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesion
                </button>
              </form>
            )}

            {flow.step === LOGIN_STEPS.RESET && (
              <form onSubmit={flow.handleResetSubmit} className="space-y-4" noValidate>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Codigo recibido por correo
                  </FormLabel>
                  <input
                    value={flow.code}
                    onChange={(event) => flow.setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    className={`${inputClass} px-3 text-center text-lg tracking-[0.35em]`}
                    required
                  />
                </label>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Nueva contrasena
                  </FormLabel>
                  <input
                    value={flow.newPassword}
                    onChange={(event) => flow.setNewPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={`${inputClass} px-3`}
                    required
                  />
                </label>
                <label className="block">
                  <FormLabel className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200" required>
                    Confirmar contrasena
                  </FormLabel>
                  <input
                    value={flow.confirmPassword}
                    onChange={(event) => flow.setConfirmPassword(event.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={`${inputClass} px-3`}
                    required
                  />
                </label>
                {flow.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">{flow.error}</p>}
                {flow.info && <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800 ring-1 ring-sky-100">{flow.info}</p>}
                <button type="submit" disabled={flow.loading} className={loginPrimaryButtonClassName}>
                  {flow.loading ? 'Guardando...' : 'Restablecer contrasena'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => flow.setStep(LOGIN_STEPS.FORGOT)}
                  className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Solicitar otro codigo
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-slate-500">UCM · Gestión de Empresas</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
