'use client';

/**
 * Anular un descuento, con motivo. No se borra: queda anulado y se ve en la
 * lista. Si estaba reservado en una liquidación sin pagar, el back le devuelve
 * el neto a esa liquidación; si ya se aplicó, responde 409 y se dice por qué.
 */

import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export interface AnularDeduccionDialogProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Qué se está anulando, para que no quede duda en el diálogo. */
  concepto: string | null;
  onAnular: (motivo: string) => Promise<void>;
}

export function AnularDeduccionDialog({
  abierto,
  onOpenChange,
  concepto,
  onAnular,
}: AnularDeduccionDialogProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.anularDialogo.${s}`;
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setError(null);
      setAnulando(false);
    }
  }, [abierto]);

  const anular = async () => {
    if (anulando) return;
    if (motivo.trim().length < 3) {
      setError(t(k('faltaMotivo')));
      return;
    }
    setAnulando(true);
    try {
      await onAnular(motivo.trim());
      onOpenChange(false);
    } catch {
      setAnulando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="anular-deduccion">
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          <DialogDescription>{t(k('descripcion'))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {concepto && (
            <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">{concepto}</p>
          )}
          <div className="space-y-2">
            <label htmlFor="anular-motivo" className="block text-sm font-medium text-fg">
              {t(k('motivo'))} <span className="text-danger">*</span>
            </label>
            <Input
              id="anular-motivo"
              value={motivo}
              maxLength={500}
              onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={anulando}>
            {t(k('cancelar'))}
          </Button>
          <Button variant="destructive" hideArrow onClick={() => void anular()} disabled={anulando}>
            {anulando ? t(k('anulando')) : t(k('confirmar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
