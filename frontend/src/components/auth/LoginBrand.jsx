import ucmLogo from '../../assets/brand/ucm-logo.png'

/** Ancho del bloque = ancho visual del logo; textos ocupan la misma línea de base. */
const BRAND_WIDTH = 'w-[390px] sm:w-[430px]'

/**
 * Bloque de marca en login: logo UCM + textos del módulo Fleet.
 * @param {'dark'|'light'} variant
 */
export function LoginBrand({ variant = 'dark', className = '' }) {
  const isDark = variant === 'dark'

  return (
    <header
      className={`mx-auto ${BRAND_WIDTH} max-w-full [container-type:inline-size] lg:mx-0 ${className}`}
    >
      <img
        src={ucmLogo}
        alt="UCM Unidad Coronaria Móvil"
        className="block h-auto w-full bg-transparent"
        width={220}
        height={56}
        decoding="async"
        draggable={false}
      />

      <div className={`mt-10 w-full max-w-full space-y-1.5 text-left ${isDark ? 'text-white' : 'text-gray-950 dark:text-white'}`}>
        <h1 className="w-full whitespace-nowrap text-left font-bold leading-none tracking-[0.002em] [font-size:clamp(1.56rem,9.45cqi,2.52rem)]">
          Fleet Data Platform
        </h1>
        <p
          className={`w-full whitespace-nowrap text-left font-medium leading-none tracking-[0.004em] ${
            isDark
              ? '[font-size:clamp(1.08rem,4.65cqi,1.34rem)] text-slate-300'
              : 'text-sm sm:text-base text-gray-600 dark:text-gray-300'
          }`}
        >
          Flota, kilometraje GPS y combustible
        </p>
      </div>
    </header>
  )
}
