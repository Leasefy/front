'use client';

/**
 * Anular un cobro, con motivo (Nico, 2026-09-16). No se borra: queda anulado y
 * deja de salir en «Cobros emitidos». Lo que debe el inquilino no cambia. Si
 * el cobro tenía factura, el back genera su nota crédito sin número.
 *
 * El error se dice DENTRO del diálogo y con la causa real (recibos vigentes,
 * ya anulado, falta la migración): un toast genérico escondería qué hacer.
 *
 * Tanda 2 del sistema de errores (02-10-2026): lo del MOTIVO (vacío, el
 * `MOTIVO_REQUERIDO` del back o un 400 con `campos`) va bajo el campo, con la
 * ayuda cruzándose; lo demás va al aviso del diálogo. Un código que no
 * conocemos ya no cae a la frase genérica: pasa por el traductor (un 5xx dice
 * que fue nuestro con la referencia; «conexión» sólo sin respuesta).
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
import { Banner } from '@leasefy/cadence';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
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

/**
 * Qué decir y dónde (02-10-2026): `campo` = bajo el motivo, `general` = el
 * aviso del diálogo. Los códigos del módulo conservan su frase; el resto pasa
 * por el traductor.
 */
export function errorAlAnularUnCobro(
  error: unknown,
  t: (clave: string) => string,
): { campo: string | null; general: string | null } {
  const code = error instanceof ApiError ? error.code : undefined;
  if (code === 'MOTIVO_REQUERIDO') return { campo: t(claveDelErrorAlAnular(error)), general: null };
  if ((CODIGOS_AL_ANULAR_UN_COBRO as readonly string[]).includes(code ?? '')) {
    return { campo: null, general: t(claveDelErrorAlAnular(error)) };
  }
  const { porCampo, sueltos } = repartirErroresDelServidor(error, {
    campos: ['motivo'] as const,
    porDefecto: t('inmobiliaria.cobros.anular.errores.generico'),
    accion: 'anular el cobro',
  });
  return {
    campo: porCampo.motivo ?? null,
    general: sueltos.length > 0 ? sueltos.join(' · ') : null,
  };
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
  /** El error del motivo (bajo el campo). */
  const [error, setError] = useState<string | null>(null);
  /** El error que no es del motivo (el aviso del diálogo). */
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const abierto = cobro !== null;

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setError(null);
      setErrorGeneral(null);
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
    setErrorGeneral(null);
    try {
      const resultado = await cobrosApi.anular(cobro.id, motivo.trim());
      const detalle = resultado.factura
        ? t(k(resultado.factura.notaCreditoGenerada ? 'conNotaGenerada' : 'conNotaPrevia'))
        : undefined;
      toast.success(t(k('anulado')), detalle ? { description: detalle } : undefined);
      onAnulado(resultado);
      onOpenChange(false);
    } catch (e) {
      const { campo, general } = errorAlAnularUnCobro(e, t);
      setError(campo);
      setErrorGeneral(general);
      if (campo) document.getElementById('anular-cobro-motivo')?.focus();
      setAnulando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !anulando && onOpenChange(o)}>
      <DialogContent
        variant="destructive"
        icon={<Prohibit weight="bold" />}
        size="sm"
        data-testid="anular-cobro"
      >
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          <DialogDescription>{t(k('descripcion'))}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {cobro && (
            <p className="rounded-[14px] border border-border px-3 py-2 text-sm text-fg-muted">
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
              onChange={(e) => {
                setMotivo(e.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby="anular-cobro-motivo-error"
            />
            {/* La ayuda y el error del motivo se cruzan: nunca se ven los dos. */}
            <ErrorDelCampo
              id="anular-cobro-motivo-error"
              mensaje={error}
              pista={t(k('motivoAyuda'))}
              className="mt-0"
            />
          </div>
          {errorGeneral && (
            <Banner variant="danger" role="alert" data-testid="anular-cobro-error">
              {errorGeneral}
            </Banner>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={anulando}>
            {t(k('cancelar'))}
          </Button>
          <Button variant="destructive" hideArrow onClick={() => void anular()} isLoading={anulando}>
            {anulando ? t(k('anulando')) : t(k('confirmar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
