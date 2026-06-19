// F10 (SPEC §4): the legacy movimientos/extractos UI moved to
// /panel/inmobiliaria/ai/conciliacion/movimientos (5th page of the
// Conciliación workspace). Old bookmarks land in the Sala.
import { redirect } from 'next/navigation'

export default function ConciliacionLegacyRedirect() {
  redirect('/panel/inmobiliaria/ai/conciliacion')
}
