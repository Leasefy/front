import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/avaluos-ia/monitoreo — RETIRADA. Redirige al módulo real.
 *
 * 🔴 Mismo defecto que `enviar`: el botón «Aplicar y avisar al propietario»
 * sólo hacía `setAplicado(true)`, y la pantalla contestaba
 *
 *     «Propuesta enviada a Carlos»
 *     «Le pedimos aprobar el nuevo canon de $X. Camila republica apenas confirme.»
 *
 * No se le pidió nada a nadie: no hay POST, no hay propietario, no hay canon.
 * «Carlos», los 28 días publicado, las cero visitas y el 12 % por encima de la
 * recomendación estaban escritos a mano en el archivo.
 *
 * Se retira como el resto de la carpeta: el índice ya redirige al módulo de
 * avalúos cableado al back.
 */
export default function MonitoreoRetiradoPage() {
  redirect('/panel/inmobiliaria/inmuebles/avaluos');
}
