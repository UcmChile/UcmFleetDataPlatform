import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('CRM render error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', padding: 24, background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 22, marginBottom: 12 }}>No se pudo cargar la aplicacion</h1>
          <p style={{ marginBottom: 16, color: '#cbd5e1' }}>
            Se detecto un error al iniciar el CRM. Prueba limpiar la sesion local y recargar.
          </p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#1e293b', padding: 16, borderRadius: 12, fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{ marginTop: 20, padding: '10px 16px', borderRadius: 10, border: 0, background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => {
              localStorage.removeItem('comercial.crm.token')
              localStorage.removeItem('comercial.crm.user')
              window.location.href = '/crm/login'
            }}
          >
            Limpiar sesion y volver al login
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
