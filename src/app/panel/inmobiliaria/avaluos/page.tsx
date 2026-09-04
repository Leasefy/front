import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/avaluos — CONSOLIDATED into /panel/inmobiliaria/inmuebles/avaluos.
 *
 * The agency avalúo UI lives in a single canonical page now (the ai/avaluos
 * workspace). This route is kept only so existing links/bookmarks don't 404 —
 * it permanently forwards there. The real wiring it used to host
 * (`avaluosApi`, `useAgencyAvaluos`) stays in lib and is consumed by the
 * canonical page.
 */
export default function AvaluosLegacyRedirectPage() {
  redirect('/panel/inmobiliaria/inmuebles/avaluos');
}
