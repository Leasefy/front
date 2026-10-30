import { DM_Mono, Host_Grotesk } from "next/font/google";

/**
 * Las fuentes de la landing nueva (`public/landing/index.html`: Host Grotesk y
 * DM Mono). Las páginas públicas en React las usan para verse como la home
 * (Nico, 27-10-2026: «hay muchas secciones que lo llevan a uno a la landing
 * vieja»). Se cargan con next/font (sin pedirle nada a Google desde el
 * navegador) y quedan como variables: `--font-host-grotesk` y `--font-dm-mono`.
 */
// Variable (300 a 800), como la home: allá se usan pesos intermedios (340, 360, 420).
export const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-host-grotesk",
  // Sin la «Host Grotesk Fallback» (Arial ajustada) de Next: lo que la fuente no trae (la «→») sale de
  // ui-sans-serif, como en la home; con la de Next la flecha salía distinta.
  adjustFontFallback: false,
});

export const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});
