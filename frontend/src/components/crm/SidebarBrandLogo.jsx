import { cn } from '../../lib/utils'
import ucmLogo from '../../assets/brand/ucm-logo.png'
import iconUcm from '../../assets/brand/iconucm.png'

/**
 * Logo UCM en sidebar: completo expandido; icono centrado en circulo blanco al contraer.
 */
export function SidebarBrandLogo({ collapsed = false, className = '' }) {
  if (collapsed) {
    return (
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-white/50',
          className,
        )}
        title="UCM Unidad Coronaria Movil"
      >
        <img
          src={iconUcm}
          alt="UCM"
          className="h-[90%] w-[90%] object-contain object-center"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <img
      src={ucmLogo}
      alt="UCM Unidad Coronaria Movil"
      className={cn('h-10 max-w-[9rem] flex-1 shrink-0 object-contain object-left', className)}
      draggable={false}
    />
  )
}
