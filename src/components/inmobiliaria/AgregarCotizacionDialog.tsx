'use client';

import { useEffect, useState } from 'react';
import { CurrencyCircleDollar } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button, Input, Textarea } from '@/components/ui';
import { MoneyInput } from '@/components/ui/money-input';
import { useI18n } from '@/lib/i18n';
import type { NuevaCotizacion, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';

export interface AgregarCotizacionDialogProps {
  /** La solicitud que se está cotizando. `null` = el diálogo no tiene sujeto. */
  solicitud: SolicitudMantenimiento | null;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /**
   * Guardar. Se espera la promesa: mientras viaja, el botón queda ocupado y el
   * diálogo abierto. Si el back rechaza, el diálogo NO se cierra — cerrarlo
   * borraría lo que la persona acaba de escribir.
   */
  onGuardar: (solicitudId: string, cotizacion: NuevaCotizacion) => Promise<void>;
}

/** Los cinco campos, tal como los guarda `MantenimientoQuote`. */
const VACIO = {
  providerName: '',
  providerPhone: '',
  amount: '',
  description: '',
  estimatedDays: '1',
};

/**
 * Agregarle una cotización a una solicitud de mantenimiento YA creada.
 *
 * 🔴 POR QUÉ EXISTE: el back tenía `POST /inmobiliaria/mantenimiento/:id/quote`
 * desde el principio, y ninguna pantalla lo llamaba. «Nueva cotización» en el
 * detalle disparaba `toast.info('función en desarrollo')` (Nico, 2026-09-12:
 * «no deja agregar la cotización a un mantenimiento ya creado. Crea toda esa
 * funcionalidad»).
 *
 * Los campos son EXACTAMENTE las cinco columnas del modelo: proveedor,
 * teléfono, monto, qué incluye y días estimados. No hay adjunto ni vigencia
 * porque `MantenimientoQuote` no los guarda, y un campo que la pantalla pide y
 * la base tira es una promesa rota escrita a mano.
 */
export function AgregarCotizacionDialog({
  solicitud,
  abierto,
  onOpenChange,
  onGuardar,
}: AgregarCotizacionDialogProps) {
  const { t } = useI18n();
  const [campos, setCampos] = useState(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  // Cada apertura arranca en blanco: si no, la segunda cotización sale con los
  // datos del proveedor de la primera ya escritos y es facilísimo mandarla así.
  useEffect(() => {
    if (abierto) {
      setCampos(VACIO);
      setErrores({});
      setGuardando(false);
    }
  }, [abierto]);

  if (!solicitud) return null;

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (!campos.providerName.trim()) {
      nuevos.providerName = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorProveedor');
    }
    if (!campos.amount || Number(campos.amount) <= 0) {
      nuevos.amount = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorMonto');
    }
    if (!campos.description.trim()) {
      nuevos.description = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorAlcance');
    }
    if (!campos.estimatedDays || Number(campos.estimatedDays) < 1) {
      nuevos.estimatedDays = t('inmobiliaria.mantenimiento.nuevaCotizacion.errorDias');
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async () => {
    if (guardando || !validar()) return;

    setGuardando(true);
    try {
      await onGuardar(solicitud.id, {
        providerName: campos.providerName.trim(),
        // El teléfono es opcional en la columna: vacío se omite, no viaja `''`.
        providerPhone: campos.providerPhone.trim() || undefined,
        amount: Number(campos.amount),
        description: campos.description.trim(),
        estimatedDays: Number(campos.estimatedDays),
      });
      onOpenChange(false);
    } catch {
      // El motivo lo dice quien guardó; acá sólo se devuelve el control para
      // que se pueda corregir y reintentar sin volver a teclear todo.
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="cotizacion-dialogo">
        <DialogHeader>
          <DialogTitle>
            {t('inmobiliaria.mantenimiento.nuevaCotizacion.titulo')}
          </DialogTitle>
          <DialogDescription>
            {t('inmobiliaria.mantenimiento.nuevaCotizacion.descripcion')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* De qué solicitud estamos hablando: el diálogo se abre desde el
              tablero, desde la lista y desde el detalle, y sin esto no hay
              forma de saber sobre cuál se está cotizando. */}
          <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm text-fg-muted">
            <CurrencyCircleDollar className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">
              {solicitud.title} · {solicitud.propertyTitle}
            </span>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cotizacion-proveedor"
              className="block text-sm font-medium text-fg dark:text-fg-subtle"
            >
              {t('inmobiliaria.mantenimiento.nuevaCotizacion.proveedor')}{' '}
              <span className="text-danger">*</span>
            </label>
            <Input
              id="cotizacion-proveedor"
              value={campos.providerName}
              maxLength={200}
              onChange={(e) => setCampos((c) => ({ ...c, providerName: e.target.value }))}
              placeholder={t('inmobiliaria.mantenimiento.nuevaCotizacion.proveedorPlaceholder')}
              aria-invalid={Boolean(errores.providerName)}
            />
            {errores.providerName && (
              <p className="text-xs text-danger">{errores.providerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cotizacion-telefono"
              className="block text-sm font-medium text-fg dark:text-fg-subtle"
            >
              {t('inmobiliaria.mantenimiento.nuevaCotizacion.telefono')}{' '}
              <span className="text-fg-subtle font-normal">
                ({t('inmobiliaria.mantenimiento.nuevaCotizacion.opcional')})
              </span>
            </label>
            {/* 20 caracteres es el tope de la columna `provider_phone`: sin
                esto, un número más largo vuelve como 400 después de haber
                escrito todo lo demás. */}
            <Input
              id="cotizacion-telefono"
              inputMode="tel"
              maxLength={20}
              value={campos.providerPhone}
              onChange={(e) => setCampos((c) => ({ ...c, providerPhone: e.target.value }))}
              placeholder={t('inmobiliaria.mantenimiento.nuevaCotizacion.telefonoPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="cotizacion-monto"
                className="block text-sm font-medium text-fg dark:text-fg-subtle"
              >
                {t('inmobiliaria.mantenimiento.nuevaCotizacion.monto')}{' '}
                <span className="text-danger">*</span>
              </label>
              <MoneyInput
                id="cotizacion-monto"
                value={campos.amount}
                onChange={(crudo) => setCampos((c) => ({ ...c, amount: crudo }))}
                aria-invalid={Boolean(errores.amount)}
              />
              {errores.amount && <p className="text-xs text-danger">{errores.amount}</p>}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="cotizacion-dias"
                className="block text-sm font-medium text-fg dark:text-fg-subtle"
              >
                {t('inmobiliaria.mantenimiento.nuevaCotizacion.dias')}{' '}
                <span className="text-danger">*</span>
              </label>
              <Input
                id="cotizacion-dias"
                type="number"
                min={1}
                value={campos.estimatedDays}
                onChange={(e) => setCampos((c) => ({ ...c, estimatedDays: e.target.value }))}
                aria-invalid={Boolean(errores.estimatedDays)}
              />
              {errores.estimatedDays && (
                <p className="text-xs text-danger">{errores.estimatedDays}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cotizacion-alcance"
              className="block text-sm font-medium text-fg dark:text-fg-subtle"
            >
              {t('inmobiliaria.mantenimiento.nuevaCotizacion.alcance')}{' '}
              <span className="text-danger">*</span>
            </label>
            <Textarea
              id="cotizacion-alcance"
              value={campos.description}
              onChange={(e) => setCampos((c) => ({ ...c, description: e.target.value }))}
              placeholder={t('inmobiliaria.mantenimiento.nuevaCotizacion.alcancePlaceholder')}
              className="w-full min-h-[90px] resize-none"
              aria-invalid={Boolean(errores.description)}
            />
            {errores.description && (
              <p className="text-xs text-danger">{errores.description}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)}>
            {t('inmobiliaria.mantenimiento.cancel')}
          </Button>
          <Button
            hideArrow
            onClick={guardar}
            disabled={guardando}
            data-testid="cotizacion-guardar"
          >
            {guardando
              ? t('inmobiliaria.mantenimiento.nuevaCotizacion.guardando')
              : t('inmobiliaria.mantenimiento.nuevaCotizacion.guardar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AgregarCotizacionDialog;
