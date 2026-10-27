import { DM_Mono, Host_Grotesk } from "next/font/google";

/**
 * Las fuentes de la landing nueva (`public/landing/index.html`: Host Grotesk y
 * DM Mono). Las páginas públicas en React las usan para verse como la home
 * (Nico, 27-10-2026: «hay muchas secciones que lo llevan a uno a la landing
 * vieja»). Se cargan con next/font (sin pedirle nada a Google desde el
 * navegador) y quedan como variables: `--font-host-grotesk` y `--font-dm-mono`.
 */
export const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-host-grotesk",
});

export const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
});
