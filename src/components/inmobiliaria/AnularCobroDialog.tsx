'use client';

/**
 * Anular un cobro, con motivo (Nico, 2026-09-16). No se borra: queda anulado y
 * deja de salir en «Cobros emitidos». Lo que debe el inquilino no cambia. Si
 * el cobro tenía factura, el back genera su nota crédito sin número.
 *
 * El error se dice DENTRO del diálogo y con la causa real (recibos vigentes,
 * ya anulado, falta la migración): un toast genérico escondería qué hacer.
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
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { cobrosApi, type CobroAnulado } from '@/lib/api/inmobiliaria.service';
import { useI18n } from '@/lib/i18n';
import type { Cobro } from '@/lib/types/inmobiliaria';

export const CODIGOS_AL_ANULAR_UN_COBRO = [
  'COBRO_CON_RECIBOS',
  'COBRO_YA_ANULADO',
  'COBRO_NO_ENCONTRADO',
  'MOTIVO_REQUERIDO',
  'ANULAR_COBRO_NO_DISPONIBLE',
] as const;

/** La clave i18n del error: la del código si la conocemos, si no la genérica. */
export function claveDelErrorAlAnular(error: unknown): string {
  const code = error instanceof ApiError ? error.code : undefined;
  const conocido = (CODIGOS_AL_ANULAR_UN_COBRO as readonly string[]).includes(code ?? '');
  return `inmobiliaria.cobros.anular.errores.${conocido ? code : 'generico'}`;
}

export interface AnularCobroDialogProps {
  cobro: Cobro | null;
  onOpenChange: (abierto: boolean) => void;
  onAnulado: (resultado: CobroAnulado) => void;
}

export function AnularCobroDialog({ cobro, onOpenChange, onAnulado }: AnularCobroDialogProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.cobros.anular.${s}`;
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const abierto = cobro !== null;

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setError(null);
      setAnulando(false);
    }
  }, [abierto, cobro?.id]);

  const anular = async () => {
    if (anulando || !cobro) return;
    if (motivo.trim().length < 3) {
      setError(t(k('faltaMotivo')));
      return;
    }
    setAnulando(true);
    setError(null);
    try {
      const resultado = await cobrosApi.anular(cobro.id, motivo.trim());
      const detalle = resultado.factura
        ? t(k(resultado.factura.notaCreditoGenerada ? 'conNotaGenerada' : 'conNotaPrevia'))
        : undefined;
      toast.success(t(k('anulado')), detalle ? { description: detalle } : undefined);
      onAnulado(resultado);
      onOpenChange(false);
    } catch (e) {
      setError(t(claveDelErrorAlAnular(e)));
      setAnulando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="anular-cobro">
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          <DialogDescription>{t(k('descripcion'))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {cobro && (
            <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
              {cobro.propertyTitle} · {cobro.tenantName} · {cobro.month}
            </p>
          )}
          <div className="space-y-2">
            <label htmlFor="anular-cobro-motivo" className="block text-sm font-medium text-fg">
              {t(k('motivo'))} <span className="text-danger">*</span>
            </label>
            <Input
              id="anular-cobro-motivo"
              value={motivo}
              maxLength={500}
              onChange={(e) => setMotivo(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby="anular-cobro-ayuda"
            />
            <p id="anular-cobro-ayuda" className="text-xs text-fg-muted">
              {t(k('motivoAyuda'))}
            </p>
            {error && (
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
            )}
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
