import { IconBadge } from './Icon'

export function HeaderLabel({ label, icon, size = 'sm', className = '', truncate = true }) {
  const iconName = icon || getHeaderIcon('', label)
  const large = size === 'lg'

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <IconBadge
        name={iconName}
        className={large ? 'h-10 w-10 rounded-2xl' : 'h-7 w-7 rounded-lg'}
        iconClassName={large ? 'h-5 w-5' : 'h-3.5 w-3.5'}
      />
      <span className={truncate ? 'min-w-0 truncate' : 'min-w-0'}>{label}</span>
    </span>
  )
}

export function getHeaderIcon(key = '', label = '') {
  const token = normalize(`${key} ${label}`)

  if (hasAny(token, ['dashboard', 'resumen', 'kpi', 'indicador'])) return 'dashboard'
  if (hasAny(token, ['pipeline', 'oportunidad', 'etapa', 'kanban'])) return 'kanban'
  if (hasAny(token, ['empresa', 'razon social', 'cliente', 'proveedor'])) return 'building'
  if (hasAny(token, ['contacto', 'nombre completo', 'solicitante'])) return 'users'
  if (hasAny(token, ['usuario', 'propietario', 'ejecutivo', 'owner'])) return 'user'
  if (hasAny(token, ['contrato', 'documento', 'archivo'])) return 'file'
  if (hasAny(token, ['archivar', 'archivado', 'archivo cerrado'])) return 'archive'
  if (hasAny(token, ['caso', 'post venta', 'ticket', 'requerimiento'])) return 'case'
  if (hasAny(token, ['fecha', 'cierre', 'inicio', 'termino', 'firma', 'ingreso', 'created'])) return 'calendar'
  if (hasAny(token, ['gestion', 'tiempo sin gestion', 'reloj', 'hora'])) return 'clock'
  if (hasAny(token, ['valor', 'monto', 'tarifa', 'uf', 'moneda', 'facturacion'])) return 'money'
  if (hasAny(token, ['rut', 'codigo', 'id entidad', 'entidad id'])) return 'idCard'
  if (hasAny(token, ['email', 'correo'])) return 'mail'
  if (hasAny(token, ['telefono', 'fono'])) return 'phone'
  if (hasAny(token, ['region', 'comuna', 'ubicacion'])) return 'mapPin'
  if (hasAny(token, ['cargo', 'rol', 'area'])) return 'briefcase'
  if (hasAny(token, ['estado', 'activo', 'prioridad', 'resultado'])) return 'status'
  if (hasAny(token, ['accion', 'acciones', 'editar', 'administracion', 'mantenedor'])) return 'settings'
  if (hasAny(token, ['auditoria', 'log', 'anterior', 'nuevo', 'historial'])) return 'history'
  if (hasAny(token, ['rubro', 'categoria', 'tipo', 'linea', 'servicio', 'origen', 'modalidad'])) return 'tag'

  return 'file'
}

function hasAny(token, values) {
  return values.some((value) => token.includes(value))
}

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
