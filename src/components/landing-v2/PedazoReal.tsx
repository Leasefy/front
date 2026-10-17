"use client";

import { useIdioma } from "@/lib/idioma/use-idioma";

/** Las capturas que también existen con el panel en inglés (`<nombre>-en.webp`). */
export const CAPTURAS_EN_INGLES = new Set<string>([
  "/landing-v2/producto/crm-pipeline.webp",
  "/landing-v2/producto/erp-recaudo.webp",
  "/landing-v2/producto/home-chat.webp",
]);

/**
 * Un pedazo de una pantalla REAL del panel (Nico, 12-10-2026: «¿por qué a nada
 * de esto le colocaste las imágenes reales del producto?»). Las capturas son
 * las de la landing (`public/landing-v2/producto/*.webp`, 1440 × 900 a 2x,
 * tomadas en el laboratorio con «Tu Inmobiliaria»); `foco` dice qué parte se
 * muestra, en % de la captura, y el marco toma esa proporción.
 *
 * Es un `<img>` perezoso dentro de un marco que recorta (no un fondo de CSS):
 * así no se baja hasta que se acerca. Entra destapándose de arriba abajo
 * cuando su tarjeta aparece (`.in`, de `initLandingFx`).
 */
export interface FocoDeLaCaptura {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PedazoRealProps {
  src: string;
  alt: string;
  foco: FocoDeLaCaptura;
  oscuro?: boolean;
  className?: string;
}

export function PedazoReal({ src, alt, foco, oscuro = false, className }: PedazoRealProps) {
  const { x, y, w, h } = foco;
  // En /en, la captura del panel en inglés si existe (16-10-2026).
  const idioma = useIdioma();
  const archivo = idioma === "en" && CAPTURAS_EN_INGLES.has(src) ? src.replace(/\.webp$/, "-en.webp") : src;
  return (
    <figure
      className={["preal", oscuro ? "preal--oscuro" : "", className ?? ""].join(" ").trim()}
      style={{ aspectRatio: `${(w * 16) / (h * 10)}` }}
    >
      <img
        src={archivo}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={2400}
        height={1500}
        style={{ width: `${10000 / w}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}
      />
    </figure>
  );
}
