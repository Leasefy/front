"use client";

import type { ReactNode } from "react";
import { usePrepararPaginas } from "./preparar-paginas";

import { ForceLightMode } from "@/components/providers/ForceLightMode";
import { BarraDeLaHome } from "./BarraDeLaHome";
import LogoDefs from "./LogoDefs";
import { EntradaAlMarketplace } from "./marketplace/EntradaAlMarketplace";
import "@/app/(landing)/landing-v2.css";

/**
 * LandingChrome — la barra de la landing en las páginas públicas en React
 * (Marketplace, la ficha, la inmobiliaria, Avalúos, Contacto, Blog, Términos,
 * Privacidad, Ayuda, Planes).
 *
 * 🔴 Nico, 27-10-2026: «solo debe haber una landing y es la nueva». La barra es
 * `BarraDeLaHome`: la MISMA de `public/landing/index.html` (marcado, reglas y
 * comportamiento, con su mega menú de «Producto»). Mide 68 px como en la home:
 * las pantallas reservan `pt-[68px]`.
 *
 * Trae además `<LogoDefs>`: la barra referencia `<use href="#lfLogo"/>`, y sin
 * el `<symbol>` el logo desaparece **en silencio** — el SVG renderiza vacío,
 * sin error en consola.
 *
 * `landing-v2.css` sigue cargando por la transición entre páginas
 * (`@view-transition`, la misma de la home estática).
 *
 * ## Siempre claro
 *
 * La landing no tiene modo oscuro. `ForceLightMode` quita `dark` del `<html>` y
 * lo repone al desmontar, así que el panel (`/inquilino`, `/panel`) sigue
 * respetando la preferencia.
 */
interface LandingChromeProps {
  /** Qué enlace del menú queda marcado como el lugar donde estás. */
  activo?: "producto" | "inmuebles" | "avaluo" | "blog" | "contacto";
  children: ReactNode;
}

export function LandingChrome({ activo, children }: LandingChromeProps) {
  usePrepararPaginas();
  return (
    <ForceLightMode>
      <div data-testid="landing-chrome">
        <LogoDefs />
        <BarraDeLaHome activo={activo} />
      </div>
      {/* 21-10-2026: la entrada animada al marketplace (sin el flash negro). */}
      <EntradaAlMarketplace />
      {children}
    </ForceLightMode>
  );
}
