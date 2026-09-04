import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/avaluos-ia — CONSOLIDATED into /panel/inmobiliaria/inmuebles/avaluos.
 *
 * This route was a mock prototype ("la sala de Gabriela"). The agency avalúo UI
 * is now a single canonical, back-connected page (the ai/avaluos workspace).
 * Kept only so existing links/bookmarks don't 404 — it permanently forwards there.
 */
export default function AvaluosIaLegacyRedirectPage() {
  redirect('/panel/inmobiliaria/inmuebles/avaluos');
}
