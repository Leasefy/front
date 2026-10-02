'use client';

/**
 * Anular un descuento, con motivo. No se borra: queda anulado y se ve en la
 * lista. Si estaba reservado en una liquidación sin pagar, el back le devuelve
 * el neto a esa liquidación; si ya se aplicó, responde 409 y se dice por qué.
 */

import { useEffect, useState } from 'react';
import { Prohibit } from '@phosphor-icons/react';

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
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { camposDelError } from '@/lib/errores/traductor-de-errores';

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
    } catch (e) {
      // Si el back rechazó el motivo (400 con `campos`), va bajo el motivo y
      // con el foco ahí; lo demás lo dice quien anuló, en un toast.
      const delMotivo = camposDelError(e).find((c) => c.campo === 'motivo');
      if (delMotivo) {
        setError(delMotivo.mensaje);
        document.getElementById('anular-motivo')?.focus();
      }
      setAnulando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      {/* Anular: el medallón rojo con el ícono de anular (no es borrar: el
          descuento queda en la lista, anulado). */}
      <DialogContent
        variant="destructive"
        icon={<Prohibit weight="bold" />}
        data-testid="anular-deduccion"
      >
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          <DialogDescription>{t(k('descripcion'))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {concepto && (
            <p className="rounded-md border border-border px-3 py-2 text-sm text-fg-muted">{concepto}</p>
          )}
          <div className="space-y-2">
            <label htmlFor="anular-motivo" className="block text-sm font-medium text-fg">
              {t(k('motivo'))} <span className="text-danger">*</span>
            </label>
            <Input
              id="anular-motivo"
              value={motivo}
              maxLength={500}
              onChange={(e) => {
                setMotivo(e.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby="anular-motivo-error"
            />
            <ErrorDelCampo id="anular-motivo-error" mensaje={error} className="mt-0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={anulando}>
            {t(k('cancelar'))}
          </Button>
          <Button
            variant="destructive"
            hideArrow
            onClick={() => void anular()}
            isLoading={anulando}
            disabled={anulando}
          >
            {anulando ? t(k('anulando')) : t(k('confirmar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
