'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ReactNode } from 'react';
import { AuthForm } from './AuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: 'tenant' | 'landlord' | 'agency';
  returnUrl?: string;
  onAuthSuccess?: () => void;
  /** Para qué se pide la cuenta, visible arriba del formulario (p. ej. publicar). */
  aviso?: ReactNode;
  /** El título para el lector de pantalla. */
  titulo?: string;
  /** La descripción para el lector de pantalla (por defecto, la de publicar). */
  descripcion?: string;
}

export function AuthModal({
  isOpen,
  onOpenChange,
  defaultRole,
  returnUrl,
  onAuthSuccess,
  aviso,
  titulo = 'Crea tu cuenta para continuar',
  descripcion = 'Guardamos tu publicación. Crea una cuenta para gestionar tu propiedad.',
}: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">{titulo}</DialogTitle>
          <DialogDescription className="sr-only">{descripcion}</DialogDescription>
        </DialogHeader>
        {aviso}
        <AuthForm
          defaultMode="register"
          defaultRole={defaultRole}
          returnUrl={returnUrl}
          onSuccess={() => {
            onOpenChange(false);
            onAuthSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
