"use client";

import type { CSSProperties, ReactNode } from "react";
import { Inter, Inter_Tight, IBM_Plex_Mono } from "next/font/google";

import { LandingHeaderV2 } from "./LandingHeaderV2";
import LogoDefs from "./LogoDefs";
import "@/app/(landing)/landing-v2.css";

/**
 * LandingChrome — el header de la landing, utilizable fuera de la landing.
 *
 * `landing-v2.css` cuelga entero de `.lv2` y las tipografias (Inter Tight
 * display + IBM Plex Mono) se cargan en el layout del grupo `(landing)`.
 * `/propiedades` vive fuera de ese grupo, asi que sin esto el mismo markup
 * saldria con otra fuente y sin la mitad de los estilos — pareceria el mismo
 * header y no lo seria.
 *
 * Trae ademas `<LogoDefs>`: el header referencia `<use href="#lfLogo"/>`, y sin
 * el `<symbol>` el logo desaparece **en silencio** — el SVG renderiza vacio,
 * sin error en consola. Ya paso una vez en la preview de /landing-v2.
 *
 * Solo el header: el pie de la landing no aplica a una pantalla de busqueda
 * que ocupa el alto completo.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter-tight",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

interface LandingChromeProps {
  /** Que enlace del nav queda marcado como el lugar donde estas. */
  activo?: "producto" | "inmuebles" | "avaluo" | "blog" | "contacto";
  children: ReactNode;
}

export function LandingChrome({ activo, children }: LandingChromeProps) {
  return (
    <>
      {/*
       * ⚠️ El scope `.lv2` envuelve SOLO el header — nunca el contenido.
       *
       * `landing-v2.css` abre con un reset universal:
       *     .lv2 *{box-sizing:border-box;margin:0;padding:0}
       * Misma especificidad que las utilidades de Tailwind (0,1,0), y la hoja
       * de la landing carga después: gana por orden de fuente. Al envolver la
       * pantalla entera, TODO el espaciado de Tailwind adentro se volvía cero.
       * Se veía casi bien —el `p-4 md:p-6` del catálogo computaba `0px` y las
       * tarjetas quedaban pegadas al borde— sin un solo error en consola.
       *
       * El header es `position:fixed`, así que no necesita ser ancestro del
       * contenido para colocarse. Este div queda de alto cero.
       */}
      <div
        data-testid="landing-chrome"
        className={`lv2 ${interTight.variable} ${ibmPlexMono.variable} ${inter.variable}`}
        style={
          {
            // Mismo puente de tokens que usa el layout de (landing): la hoja
            // portada referencia --fd/--fb/--fm por todos lados.
            "--fd": "var(--font-inter-tight)",
            "--fb": "var(--font-inter)",
            "--fm": "var(--font-ibm-plex-mono)",
          } as CSSProperties
        }
      >
        <LogoDefs />
        <LandingHeaderV2 activo={activo} />
      </div>
      {children}
    </>
  );
}
