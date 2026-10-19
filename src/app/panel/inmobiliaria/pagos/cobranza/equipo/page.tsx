import { redirect } from 'next/navigation'

/**
 * MORI-37 (QA de los agentes; Nico 19-10-2026: quitarla). «Equipo IA de
 * cobranza» presentaba a seis personas inventadas (Gabriela, Nicolás,
 * Valentina, Samuel, Sofía…) con un lote de ejemplo escrito en el código. Sólo
 * se llegaba por la URL. Quien la tenga guardada aterriza en Cobranza, donde
 * está lo que Mori hace de verdad.
 */
export default function EquipoDeCobranzaRetirado(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza')
}
