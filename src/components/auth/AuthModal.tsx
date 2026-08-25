'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AuthForm } from './AuthForm';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: 'tenant' | 'landlord' | 'agency';
  returnUrl?: string;
  onAuthSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  onOpenChange,
  defaultRole,
  returnUrl,
  onAuthSuccess,
}: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">Crea tu cuenta para continuar</DialogTitle>
          <DialogDescription className="sr-only">
            Guardamos tu publicacion. Crea una cuenta para gestionar tu propiedad.
          </DialogDescription>
        </DialogHeader>
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
