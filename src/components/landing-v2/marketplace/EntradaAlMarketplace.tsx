'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';
import { useTx } from '@/lib/idioma/use-idioma';

/**
 * La entrada al marketplace desde la landing (Nico, 21-10-2026: «cuando uno le
 * da clic a marketplace en la landing hace un flash negro super raro y feo…
 * haz alguna animación ahí bien top, una carga bien chimba»).
 *
 * El negro era el tema oscuro del sistema pintando el marketplace antes de
 * forzarlo a claro (arreglado en `ThemeProvider` + `rutas-siempre-claras.ts`).
 * Esto es la entrada: al tocar cualquier enlace al marketplace, sube una hoja
 * clara con el logo animado y una línea azul que avanza mientras llega la
 * página; el navegador la funde con el marketplace (`@view-transition` en
 * `landing-v2.css`). Los enlaces son `<a>` de verdad: con Cmd/Ctrl, el botón
 * del medio o «abrir en otra pestaña» no se toca nada.
 *
 * Con movimiento reducido: sin hoja que sube, sólo el logo con un fundido.
 */
const DESTINO = /^\/(?:(?:es|en)\/)?propiedades\/?$/;

export function EntradaAlMarketplace() {
  const [abriendo, setAbriendo] = useState(false);
  const [montado, setMontado] = useState(false);
  const reducido = useReducedMotion();
  const tx = useTx();

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || !DESTINO.test(url.pathname)) return;
      // Ya en el marketplace: es la misma pantalla, no hay entrada que mostrar.
      if (DESTINO.test(window.location.pathname)) return;
      e.preventDefault();
      setAbriendo(true);
      // Dos cuadros para que la hoja alcance a pintarse antes de soltar la página.
      requestAnimationFrame(() => requestAnimationFrame(() => window.location.assign(url.href)));
    };
    // Volver con «atrás» (bfcache) trae la página tal cual: sin la hoja encima.
    const alVolver = (e: PageTransitionEvent) => {
      if (e.persisted) setAbriendo(false);
    };
    document.addEventListener('click', alTocar, true);
    window.addEventListener('pageshow', alVolver);
    return () => {
      document.removeEventListener('click', alTocar, true);
      window.removeEventListener('pageshow', alVolver);
    };
  }, []);

  // Si la navegación no llega (red caída), la hoja no se queda para siempre.
  useEffect(() => {
    if (!abriendo) return;
    const t = window.setTimeout(() => setAbriendo(false), 15000);
    return () => window.clearTimeout(t);
  }, [abriendo]);

  // En un portal y en la capa más alta: la franja del marketplace y el header
  // fijo viven en otras capas de la página y quedaban por encima de la hoja.
  if (!montado) return null;
  return createPortal(
    <AnimatePresence>
      {abriendo && (
        <motion.div
          key="entrada-al-marketplace"
          data-testid="entrada-al-marketplace"
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[2147483646] flex items-center justify-center overflow-hidden"
          initial={{ opacity: reducido ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          {/* La landing se aleja un poco: profundidad sin oscurecer. */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[#0b0b0f]/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          />
          {/* La hoja del marketplace: sube desde abajo con esquinas que se abren a pantalla completa. */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[#f8f7f5]"
            initial={reducido ? { opacity: 0 } : { y: '100%', borderTopLeftRadius: 48, borderTopRightRadius: 48 }}
            animate={reducido ? { opacity: 1 } : { y: '0%', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
            transition={reducido ? { duration: 0.15 } : { duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          />
          {/* La línea azul que avanza mientras llega la página (sin brillo: Cadence 2). */}
          <motion.div
            aria-hidden="true"
            className="absolute left-0 top-0 h-[3px] bg-[#1A40FF]"
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '45%', '78%', '92%'] }}
            transition={{ duration: 3.2, times: [0, 0.2, 0.55, 1], ease: 'easeOut', delay: reducido ? 0 : 0.25 }}
          />
          <motion.div
            className="relative flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: reducido ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reducido ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <CargaDeMarca tono="sobre-blanco" tamano="lg" etiqueta={tx('Abriendo el marketplace', 'Opening the marketplace')} />
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#1A40FF]">
              {tx('Abriendo el marketplace', 'Opening the marketplace')}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
