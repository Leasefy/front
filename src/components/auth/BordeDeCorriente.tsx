'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * La corriente de voltaje de la landing, quieta, en el borde de abajo de la tarjeta de acceso (Nico 24-10-2026:
 * «el login no vi que le hayas hecho glow up, manteniendo el video»). Es el mismo motivo del cierre de la home
 * —píxeles de voltaje que se amontonan en el borde y se desvanecen hacia arriba—, dibujado UNA vez en un lienzo
 * 2D (sin WebGL ni animación: no compite con el video ni con el formulario). Decorativo: `aria-hidden`.
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

export function BordeDeCorriente({ className, celda = 3, semilla = 41 }: { className?: string; celda?: number; semilla?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    if (!lienzo) return;
    const pintar = () => {
      const ancho = lienzo.clientWidth, alto = lienzo.clientHeight;
      if (!ancho || !alto) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lienzo.width = Math.round(ancho * dpr);
      lienzo.height = Math.round(alto * dpr);
      const ctx = lienzo.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      const columnas = Math.ceil(ancho / celda), filas = Math.ceil(alto / celda);
      for (let j = 0; j < filas; j++) {
        /* abajo, denso; arriba, nada (el horizonte de la home) */
        const altura = 1 - j / filas;
        const caida = Math.pow(1 - altura, 1.35);
        for (let i = 0; i < columnas; i++) {
          const n = 0.6 * suave(i / 9, j / 6, semilla) + 0.4 * suave(i / 3.5, j / 2.5, semilla + 7);
          const densidad = Math.min(1, Math.max(0, n * 1.7 - 0.32) * caida);
          if (azar(i, j, semilla + 3) > densidad) continue;
          const alfa = Math.min(1, 0.22 + densidad * 0.95);
          ctx.fillStyle = `rgba(${VOLTAJE[0]},${VOLTAJE[1]},${VOLTAJE[2]},${alfa.toFixed(3)})`;
          ctx.fillRect(i * celda, j * celda, celda - 0.6, celda - 0.6);
        }
      }
    };
    pintar();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(pintar) : null;
    ro?.observe(lienzo);
    return () => ro?.disconnect();
  }, [celda, semilla]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid="borde-de-corriente"
      className={cn('pointer-events-none block w-full [image-rendering:pixelated]', className)}
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
    />
  );
}
