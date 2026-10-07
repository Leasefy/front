'use client';

/**
 * La cáscara de los modales de Configuración (MFA, cuentas de recaudo, equipo,
 * contraseña, datos de la cuenta y baja).
 *
 * Desde el 02-10-2026 es el `Dialog` de la plataforma (DESIGN.md §17) y no un
 * `createPortal` a mano: la ✕, el Esc, el velo, el bloqueo del scroll y Lenis
 * los pone la primitiva. Cada uso dice su clase con `variant` (las bajas y los
 * borrados van en `destructive`) y pone sus botones en `footer`, que es el pie
 * fijo del modal: con los botones adentro del cuerpo se iban con el scroll.
 */

import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
  type DialogVariant,
} from '@/components/ui/dialog';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Subtítulo apagado bajo el título (en una destructiva: qué se pierde). */
  description?: ReactNode;
  /** Clase de modal: pone el medallón (`destructive` en bajas y borrados). */
  variant?: DialogVariant;
  /** Ícono propio del medallón (Phosphor con `weight="bold"`). */
  icon?: ReactNode;
  /** Ancho. `sm` (420) por defecto, el del modal de siempre. */
  size?: DialogSize;
  /** Las acciones: van al pie fijo, a la derecha (a todo el ancho en el celular). */
  footer?: ReactNode;
  children?: ReactNode;
}

export function SettingsModal({
  open,
  onClose,
  title,
  description,
  variant,
  icon,
  size = 'sm',
  footer,
  children,
}: SettingsModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent
        size={size}
        variant={variant}
        icon={icon}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
