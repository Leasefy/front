import { PageGuard } from '@/components/auth/PageGuard'
import { CalidadDeLasPublicaciones } from '@/components/inmobiliaria/calidad/CalidadDeLasPublicaciones'

/**
 * /panel/inmobiliaria/inmuebles/calidad-de-publicaciones — Niti · calidad de
 * las publicaciones, con su propia fila en «Agentes IA» (Nico, 29-09-2026: «no
 * los veo en la sección de agentes para poder probarlos»).
 *
 * Es el mismo componente de la pestaña «Calidad» de Portales, que salió del
 * menú el 22-09; esa pestaña sigue viva. Cuelga de `portafolio`, igual que
 * Portales: la fila no le abre la pantalla a nadie que no la tuviera.
 *
 * `variante="pagina"` le da el margen y el encabezado de las demás pantallas
 * del panel (30-09-2026: antes la tarjeta quedaba pegada a los bordes).
 */
export default function CalidadDePublicacionesPage() {
  return (
    <PageGuard module="portafolio">
      <CalidadDeLasPublicaciones variante="pagina" />
    </PageGuard>
  )
}
