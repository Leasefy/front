"use client";

import { useEffect, useRef, createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";

interface LenisContextValue {
  stop: () => void;
  start: () => void;
}

const LenisContext = createContext<LenisContextValue | null>(null);

/**
 * Hook to control Lenis smooth scroll
 * Call stop() when opening modals, start() when closing
 */
export function useLenis() {
  const context = useContext(LenisContext);
  if (!context) {
    // Return no-op functions if not wrapped in provider
    return { stop: () => {}, start: () => {} };
  }
  return context;
}

/**
 * SmoothScroll Provider - Lenis smooth scrolling like Luxterra
 * Creates buttery smooth scrolling experience
 * Exposes stop/start methods for modal control
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 2,
    });

    lenisRef.current = lenis;

    // Animation frame loop
    let frameId = 0;
    function raf(time: number) {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  /**
   * Cuántos consumidores piden ahora mismo que la página no scrollee.
   *
   * Antes `stop()` y `start()` iban directo a Lenis, y eso es inseguro por
   * construcción: cada modal hace `stop()` al montarse y `start()` al
   * desmontarse, así que con DOS abiertos el que cierre primero devolvía el
   * scroll con el otro todavía en pantalla — y si a alguno no le corría la
   * limpieza, la página quedaba congelada para siempre.
   *
   * Congelada es exactamente como estaba: `<html>` con `lenis-stopped` y
   * `overflow: hidden` en el Resumen, sin ningún modal abierto.
   *
   * Con un contador, Lenis sólo se detiene cuando el primero lo pide y sólo se
   * reanuda cuando se va el último.
   */
  const bloqueos = useRef(0);

  const stop = useCallback(() => {
    bloqueos.current += 1;
    if (bloqueos.current === 1) lenisRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    bloqueos.current = Math.max(0, bloqueos.current - 1);
    if (bloqueos.current === 0) lenisRef.current?.start();
  }, []);

  /**
   * Cambiar de pantalla siempre devuelve el scroll.
   *
   * Un `start()` de más no rompe nada; una página que no scrollea sí, y no
   * tiene salida salvo recargar. Los modales de este panel no sobreviven a una
   * navegación, así que al cambiar de ruta no puede quedar nadie legítimamente
   * pidiendo el bloqueo.
   */
  useEffect(() => {
    bloqueos.current = 0
    lenisRef.current?.start()
  }, [pathname])

  /**
   * El bloqueo de los modales se decide MIRANDO EL DOM, no montándose.
   *
   * `dialog.tsx` y `sheet.tsx` frenaban Lenis en el efecto de montaje, con un
   * comentario que decía «el Content sólo está montado mientras está abierto».
   * En este panel eso es falso: al cargar el Resumen se montan un diálogo y un
   * cajón CERRADOS, cada uno llama `stop()`, nadie llama `start()`, y la página
   * queda con `overflow: hidden` para siempre. Sin modal a la vista y sin
   * ningún error — sólo no scrollea.
   *
   * Radix marca el estado real en `data-state`. Contarlo acá arregla los dos
   * primitivos a la vez y hace imposible la clase entera del defecto: no
   * depende de que cada modal cumpla un contrato, sino de lo que se ve.
   */
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return
    const ABIERTOS =
      '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
    let frenadoPorModal = false

    const sincronizar = () => {
      const hayAbierto = document.querySelector(ABIERTOS) !== null
      if (hayAbierto === frenadoPorModal) return
      frenadoPorModal = hayAbierto
      if (hayAbierto) stop()
      else start()
    }

    sincronizar()
    const mo = new MutationObserver(sincronizar)
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'role'],
    })
    return () => {
      mo.disconnect()
      if (frenadoPorModal) start()
    }
  }, [stop, start])

  const value = useMemo(() => ({ stop, start }), [stop, start]);

  return (
    <LenisContext.Provider value={value}>
      {children}
    </LenisContext.Provider>
  );
}
