/**
 * atajo-de-la-barra — ⌘B en macOS, Ctrl+B en el resto: plegar y desplegar la
 * barra lateral de escritorio (Nico, 02-10-2026).
 *
 * Funciones puras para que `PlanSidebar` sólo cablee el `keydown` y para que
 * las reglas se prueben sin montar la barra:
 *
 *  - la tecla: B con el modificador de la plataforma, sin Alt ni Mayúscula
 *    (⌘⇧B es la barra de favoritos de Chrome y Safari: no se toca);
 *  - mientras se escribe, la tecla es del campo (en un editor, Ctrl+B es
 *    negrita): no se actúa con el foco en un `input`, `textarea`, `select` o
 *    `contenteditable`;
 *  - con un modal abierto, tampoco: la barra queda detrás y plegarla movería
 *    el panel debajo del modal.
 *
 * Choques revisados (02-10): ⌘K (el buscador, `panel/inmobiliaria/layout.tsx`;
 * en el chat, «conversación nueva» de `useBetaKeyboardShortcuts`) y los Escape
 * de cajones y modales. Ninguno usa B. El navegador: Firefox abre los
 * marcadores con ⌘B/Ctrl+B y se lo gana la página con `preventDefault`, que
 * sólo se llama cuando el atajo actúa.
 */

/** Lo que hace falta del `navigator` (en las pruebas se pasa uno a mano). */
export interface NavegadorParaElAtajo {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
}

/**
 * ¿macOS (o un iPad/iPhone con teclado)? Decide ⌘ o Ctrl. Sin `navigator`
 * (el servidor) dice que no: el primer pintado muestra «Ctrl B» y el
 * navegador lo corrige al hidratar.
 */
export function esMac(nav?: NavegadorParaElAtajo | null): boolean {
  const n: NavegadorParaElAtajo | undefined =
    nav ?? (typeof navigator === 'undefined' ? undefined : (navigator as NavegadorParaElAtajo));
  if (!n) return false;
  const plataforma = n.userAgentData?.platform || n.platform || n.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(plataforma);
}

type TeclaDelEvento = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>;

/** ⌘B en macOS, Ctrl+B en el resto. Nada más apretado. */
export function esElAtajoDeLaBarra(e: TeclaDelEvento, mac: boolean): boolean {
  if (typeof e.key !== 'string' || e.key.toLowerCase() !== 'b') return false;
  if (e.altKey || e.shiftKey) return false;
  return mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

const CAMPOS_DE_ESCRITURA = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** ¿El foco está donde se escribe? Ahí la tecla es del campo. */
export function seEstaEscribiendo(objetivo: EventTarget | null | undefined): boolean {
  if (!objetivo || typeof (objetivo as Element).closest !== 'function') return false;
  const el = objetivo as HTMLElement;
  if (el.isContentEditable) return true;
  return el.closest(CAMPOS_DE_ESCRITURA) !== null;
}

/**
 * Los modales abiertos: los diálogos de Radix (⌘K, cajones, confirmaciones;
 * el mismo criterio que `SmoothScroll` y el centro de procesos) y los hechos
 * a mano que se marcan `aria-modal` (el muro de migración, la bienvenida, el
 * recorrido). Un panel no modal con `role="dialog"` a secas (el dock del
 * piloto) no frena el atajo.
 */
const MODALES_ABIERTOS = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="dialog"][aria-modal="true"]',
  '[role="alertdialog"][aria-modal="true"]',
].join(', ');

export function hayUnModalAbierto(doc: Pick<Document, 'querySelector'> = document): boolean {
  return doc.querySelector(MODALES_ABIERTOS) !== null;
}

/** Lo que se le anuncia a la tecnología de asistencia (`aria-keyshortcuts`). */
export function atajoParaAria(mac: boolean): string {
  return mac ? 'Meta+B' : 'Control+B';
}
