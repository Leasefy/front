'use client';

import * as React from 'react';
import { Toaster as DSToaster, toast, type ToasterProps } from '@leasefy/ui';

/**
 * SHIM sobre el Toast del DS (@leasefy/ui): sonner re-skineado con la piel ink
 * (superficie de marca, shadow-overlay, Satoshi medium).
 *
 * - `toast` es la API imperativa de sonner re-exportada por el DS:
 *   toast("…") / toast.success / error / warning / info / loading / promise /
 *   dismiss / custom.
 * - `Toaster` conserva el default histórico del mvp (position="top-right");
 *   el resto de la piel (duración, closeButton, classNames) vive en el DS.
 *   Montar UNO por layout raíz.
 */
export function Toaster({ position = 'top-right', ...props }: ToasterProps) {
  return <DSToaster position={position} {...props} />;
}

export { toast };
export type { ToasterProps };
