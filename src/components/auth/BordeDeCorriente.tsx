'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * La corriente de voltaje de la landing en el borde de abajo de la tarjeta de acceso: píxeles de voltaje que se
 * amontonan en el borde y se desvanecen hacia arriba (el cierre de la home).
 *
 * 24-10-2026: quieta, dibujada una vez. 28-10-2026 (Nico: «ese modal sigue sin gustarme… déjamelo wow wow»): VIVA.
 *   - En reposo fluye despacio hacia la derecha, como corriente de verdad.
 *   - Cada tecla que la persona escribe en la tarjeta manda una chispa que la cruza (`pulso`).
 *   - Al enviar el formulario se enciende entera un momento (`oleada`).
 * Lienzo 2D a ~24 cuadros por segundo con ~3.000 celdas: no compite con el video. Con `prefers-reduced-motion` (o
 * `vivo={false}`) se pinta UNA vez y queda quieta, como antes. Decorativa: `aria-hidden`.
 */
const VOLTAJE = [26, 64, 255];

/* ruido de valor suave y determinista (mismo dibujo en cada visita) */
function azar(x: number, y: number, semilla: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + semilla * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function suave(x: number, y: number, semilla: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = azar(xi, yi, semilla), b = azar(xi + 1, yi, semilla), c = azar(xi, yi + 1, semilla), d = azar(xi + 1, yi + 1, semilla);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export interface ManejoDeLaCorriente {
  /** Una chispa que cruza el borde de izquierda a derecha (cada tecla). */
  pulso: () => void;
  /** La corriente entera se enciende un momento (al enviar). */
  oleada: () => void;
}

/** Cuánto dura una chispa en cruzar, y la oleada. */
const CRUCE_MS = 900;
const OLEADA_MS = 1400;
/** Cuántas columnas por segundo avanza la corriente en reposo. */
const FLUJO = 2.2;

export const BordeDeCorriente = forwardRef<
  ManejoDeLaCorriente,
  { className?: string; celda?: number; semilla?: number; vivo?: boolean }
>(function BordeDeCorriente({ className, celda = 3, semilla = 41, vivo = true }, ref) {
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const chispas = useRef<number[]>([]);
  const oleadaDesde = useRef<number>(-Infinity);

  useImperativeHandle(ref, () => ({
    pulso: () => {
      const ahora = performance.now();
      // Escribir rápido no llena el borde de chispas: como mucho una cada 70 ms y cinco a la vez.
      const ultima = chispas.current[chispas.current.length - 1] ?? -Infinity;
      if (ahora - ultima < 70) return;
      chispas.current = [...chispas.current.filter((t) => ahora - t < CRUCE_MS * 1.3), ahora].slice(-5);
    },
    oleada: () => {
      oleadaDesde.current = performance.now();
    },
  }));

  useEffect(() => {
    const lienzo = lienzoRef.current;
    if (!lienzo) return;
    const quieta = !vivo || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    let ancho = 0, alto = 0, columnas = 0, filas = 0;
    let ctx: CanvasRenderingContext2D | null = null;
    const medir = () => {
      ancho = lienzo.clientWidth;
      alto = lienzo.clientHeight;
      if (!ancho || !alto) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
      ctx = lienzo.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      columnas = Math.ceil(ancho / celda);
      filas = Math.ceil(alto / celda);
      return Boolean(ctx);
    };

    const pintar = (ahora: number) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, ancho, alto);
      const corrimiento = quieta ? 0 : (ahora / 1000) * FLUJO;
      const oleada = Math.max(0, 1 - (ahora - oleadaDesde.current) / OLEADA_MS);
      const frentes = chispas.current.map((t) => (ahora - t) / CRUCE_MS).filter((f) => f >= 0 && f <= 1.2);
      for (let j = 0; j < filas; j++) {
        /* abajo, denso; arriba, nada (el horizonte de la home) */
        const altura = 1 - j / filas;
        const caida = Math.pow(1 - altura, 1.35);
        for (let i = 0; i < columnas; i++) {
          const x = i - corrimiento;
          const n = 0.6 * suave(x / 9, j / 6, semilla) + 0.4 * suave(x / 3.5, j / 2.5, semilla + 7);
          let energia = 0;
          for (const f of frentes) {
            const d = i / columnas - f;
            energia += Math.exp(-(d * d) / 0.004) * (1.2 - f);
          }
          energia = Math.min(1, energia + oleada * 0.9);
          const densidad = Math.min(1, Math.max(0, n * 1.7 - 0.32 + energia * 0.55) * Math.pow(caida, 1 - energia * 0.5));
          if (azar(i, j, semilla + 3) > densidad) continue;
          const alfa = Math.min(1, 0.22 + densidad * 0.95 + energia * 0.2);
          ctx.fillStyle = `rgba(${VOLTAJE[0]},${VOLTAJE[1]},${VOLTAJE[2]},${alfa.toFixed(3)})`;
          ctx.fillRect(i * celda, j * celda, celda - 0.6, celda - 0.6);
        }
      }
    };

    let cuadro = 0;
    let ultimo = 0;
    let parada = false;
    const vuelta = (ahora: number) => {
      if (parada) return;
      // ~24 cuadros por segundo alcanzan para que fluya; más sería gastar batería.
      if (ahora - ultimo >= 41) {
        ultimo = ahora;
        pintar(ahora);
      }
      cuadro = requestAnimationFrame(vuelta);
    };

    // Sin tamaño todavía, lo mide el ResizeObserver.
    if (medir() && quieta) pintar(0);
    if (!quieta) cuadro = requestAnimationFrame(vuelta);

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (medir() && quieta) pintar(0);
        })
      : null;
    ro?.observe(lienzo);
    return () => {
      parada = true;
      cancelAnimationFrame(cuadro);
      ro?.disconnect();
    };
  }, [celda, semilla, vivo]);

  return (
    <canvas
      ref={lienzoRef}
      aria-hidden="true"
      data-testid="borde-de-corriente"
      className={cn('pointer-events-none block w-full [image-rendering:pixelated]', className)}
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
    />
  );
});
