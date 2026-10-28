"use client";

import { useEffect } from "react";

/** Las rutas que nunca se preparan: cuenta, panel, publicar, API. */
const NO_SE_PREPARAN = /^\/(?:(?:es|en)\/)?(?:auth|panel|publica|ir-al-panel|onboarding|api|inquilino|admin)(?:\/|$)/;

/**
 * Nico, 27-10-2026: «NO QUIERO INTERACCIONES TOSCAS ENTRE SECCIONES EN LA LANDING».
 * Al pasar el mouse (o tocar) un enlace de la landing, el navegador va trayendo esa
 * página (`<link rel="prefetch">`); al hacer clic llega al instante y entra con la
 * transición común (`@view-transition` en `landing-v2.css` y en la home estática).
 * Es lo mismo que hace `public/landing/js/preparar-paginas.js` en las páginas
 * estáticas. Una vez por dirección; nunca las de cuenta, panel ni API.
 */
export function usePrepararPaginas() {
  useEffect(() => {
    const hechas = new Set<string>();
    const preparar = (a: HTMLAnchorElement) => {
      if (!a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      let u: URL;
      try {
        u = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (u.origin !== window.location.origin || NO_SE_PREPARAN.test(u.pathname)) return;
      const clave = u.pathname + u.search;
      if (hechas.has(clave) || clave === window.location.pathname + window.location.search) return;
      hechas.add(clave);
      const l = document.createElement("link");
      l.rel = "prefetch";
      l.href = clave;
      l.setAttribute("as", "document");
      document.head.appendChild(l);
    };
    const alPasar = (ev: Event) => {
      const a = (ev.target as Element | null)?.closest?.("a[href]");
      if (a instanceof HTMLAnchorElement) preparar(a);
    };
    document.addEventListener("pointerover", alPasar, { passive: true });
    document.addEventListener("touchstart", alPasar, { passive: true });
    document.addEventListener("focusin", alPasar);
    return () => {
      document.removeEventListener("pointerover", alPasar);
      document.removeEventListener("touchstart", alPasar);
      document.removeEventListener("focusin", alPasar);
    };
  }, []);
}
