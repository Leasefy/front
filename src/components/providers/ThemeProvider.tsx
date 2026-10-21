"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { esRutaSiempreClara } from "@/lib/tema/rutas-siempre-claras";

/**
 * `nonce`: `next-themes` mete un `<script>` en línea que pone la clase del tema
 * antes de pintar (sin él, parpadea claro→oscuro). Con la CSP por nonce
 * (`src/lib/seguridad/politica-de-contenido.ts`) ese script sin nonce se
 * bloquea; el layout raíz se lo pasa desde la cabecera que pone el middleware.
 */
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  // 21-10-2026: las páginas públicas van en claro DESDE la primera pintada
  // (antes, con el sistema en oscuro, el marketplace salía negro y luego claro).
  const forzado = esRutaSiempreClara(usePathname()) ? "light" : undefined;
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce} forcedTheme={forzado}>
      {children}
    </NextThemesProvider>
  );
}
