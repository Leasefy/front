import { redirect } from 'next/navigation'

/**
 * MORI-37 / COBRI-6 (QA de los agentes, 19-10-2026). «Equipo IA de pagos»
 * presentaba a Gabriela, Nicolás, Valentina, Samuel y Sofía, que nunca
 * corrieron y ya no existen: el equipo que corre (Pagui, Cuenti, Cobri, Reti,
 * Giri y Noti) se presenta en «Agente de pagos», con lo que hace cada uno de
 * verdad. Sólo se llegaba por la URL; quien la tenga guardada aterriza allá.
 */
export default function EquipoDePagosRetirado(): never {
  redirect('/panel/inmobiliaria/pagos/agente')
}
