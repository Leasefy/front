/**
 * La ruta vieja del pago. Se mudó a `/inquilino/aprobacion/pago`.
 *
 * Dos razones, y ninguna es cosmética:
 *
 *  1. El sidebar marca lo activo con `pathname.startsWith(href)`. Acá no había
 *     ningún ítem que fuera prefijo, así que el panel quedaba entero apagado y
 *     la persona no estaba en ninguna sección.
 *  2. `docs/VOCABULARIO.md` prohíbe "estudio" del lado del inquilino —colisiona
 *     con apartaestudio—: se dice "aprobación". La URL también lo decía.
 *
 * Se conserva la redirección porque la ruta pudo quedar en un correo o en una
 * pestaña abierta, y un 404 no explica a dónde se fue.
 */

import { redirect } from 'next/navigation'

export default function PagoDelEstudioRedirect() {
  redirect('/inquilino/aprobacion/pago')
}
