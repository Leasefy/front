'use client';

import * as React from 'react';
import { Toaster as DSToaster, toast, type ToasterProps } from '@leasefy/cadence';

/**
 * SHIM sobre el Toast del DS (@leasefy/cadence): sonner re-skineado con la piel ink
 * (superficie de marca, shadow-overlay, Satoshi medium).
 *
 * - `toast` es la API imperativa de sonner re-exportada por el DS:
 *   toast("…") / toast.success / error / warning / info / loading / promise /
 *   dismiss / custom.
 * - `Toaster` conserva el default histórico del mvp (position="top-right");
 *   el resto de la piel (duración, closeButton, classNames) vive en el DS.
 *   Montar UNO por layout raíz.
 *
 * ── Por qué `unstyled` ─────────────────────────────────────────────────────
 *
 * El DS ya le pasaba a sonner una piel completa —`bg-ink`, `border-ink-border`,
 * `text-ink-fg`, `rounded-[12px]`, sombra de overlay— y esas clases SÍ llegaban
 * al elemento y SÍ generaban CSS. Igual no se veían.
 *
 * Medido en el DOM: la clase decía `rounded-[12px]` y el radio calculado era
 * 8px; decía `bg-ink` (#14130f) y el fondo calculado era blanco. El motivo es
 * de cascada: sonner inyecta su hoja en runtime y su selector
 * `[data-sonner-toast]` pesa lo mismo que una clase (0,1,0). Empate ⇒ gana
 * quien va después, y quien va después es sonner.
 *
 * `unstyled: true` hace que sonner no ponga su propia piel; entonces la del DS
 * queda sola y manda. Sin esto, todos los toasts del panel salían con el look
 * por defecto de la librería mientras cargaban clases Leasefy que no hacían
 * nada — el mismo patrón de «la clase está pero no pinta» de DESIGN.md §2.
 *
 * ⚠️ Esto corresponde arriba, en `@leasefy/cadence`: su `<Toaster>` debería
 * nacer con `unstyled`. Va acá porque el shim es el punto de adaptación del
 * front y el arreglo no puede esperar a publicar el DS.
 */
export function Toaster({ position = 'top-right', toastOptions, ...props }: ToasterProps) {
  return (
    <DSToaster
      position={position}
      // El DS mergea `{ ...toastOptions, classNames: { ...suyas, ...las tuyas } }`,
      // así que `unstyled` pasa sin pisarle la piel.
      toastOptions={{ unstyled: true, ...toastOptions }}
      {...props}
    />
  );
}

export { toast };
export type { ToasterProps };
