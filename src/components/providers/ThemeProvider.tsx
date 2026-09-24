"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * `nonce`: `next-themes` mete un `<script>` en línea que pone la clase del tema
 * antes de pintar (sin él, parpadea claro→oscuro). Con la CSP por nonce
 * (`src/lib/seguridad/politica-de-contenido.ts`) ese script sin nonce se
 * bloquea; el layout raíz se lo pasa desde la cabecera que pone el middleware.
 */
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
      {children}
    </NextThemesProvider>
  );
}
