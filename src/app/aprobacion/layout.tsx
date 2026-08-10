import { Metadata } from 'next'
import { ForceLightMode } from '@/components/providers/ForceLightMode'
import { I18nProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Aprobación de arriendo | Leasefy',
  description:
    'Descubre en segundos hasta cuánto te podemos arrendar. Consultamos varias aseguradoras a la vez.',
}

/**
 * `I18nProvider` hace falta acá porque esta ruta vive **fuera** de los grupos
 * que ya lo montan (`/inquilino`, `/panel/*`) — mismo caso que `panel/beta`.
 * Sin él, quien puso la app en inglés desde su configuración vería esta
 * pantalla en español y nada más.
 */
export default function AprobacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ForceLightMode>{children}</ForceLightMode>
    </I18nProvider>
  )
}
