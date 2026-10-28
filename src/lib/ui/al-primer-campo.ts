/**
 * Al abrir una ventana de pasos, el foco va al primer campo del paso (no al primer botón de la lista de pasos: el anillo
 * del foco lo hacía ver como si fuera el paso elegido, QA de Nico 28-10-2026). Para `onOpenAutoFocus` del diálogo.
 */
export function alPrimerCampo(e: Event) {
  e.preventDefault();
  const caja = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
  window.requestAnimationFrame(() => {
    caja
      ?.querySelector<HTMLElement>('form input:not([type="hidden"]):not([disabled]), form button[role="combobox"]')
      ?.focus({ preventScroll: true });
  });
}
