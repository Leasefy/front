import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/avaluos-ia/enviar — RETIRADA. Redirige al módulo real.
 *
 * 🔴 Esta pantalla afirmaba un hecho que no ocurría. Su botón «Enviar por
 * WhatsApp / correo» hacía exactamente `setSent(true)`: nada salía a ningún
 * lado, ni un POST, ni una cola, ni un log. Y en el estado siguiente la
 * pantalla decía, con un check verde:
 *
 *     «Reporte enviado a Carlos»
 *     «Se lo enviamos por WhatsApp. Camila te avisa cuando lo abra y responda.»
 *
 * Un propietario que nunca recibió nada, un asesor convencido de que ya lo
 * mandó, y una espera de respuesta que no iba a llegar. Todo lo demás de la
 * pantalla era igual de inventado: el teléfono, el correo y el canon estaban
 * escritos a mano en el archivo.
 *
 * El índice de esta misma carpeta (`avaluos-ia/page.tsx`) ya redirige al
 * módulo de avalúos de verdad —el que sí está cableado al back— desde que se
 * consolidó. Estas subrutas quedaron vivas sólo por URL directa; se hace lo
 * mismo con ésta en vez de sostener la mentira un día más.
 */
export default function EnviarReporteRetiradoPage() {
  redirect('/panel/inmobiliaria/inmuebles/avaluos');
}
