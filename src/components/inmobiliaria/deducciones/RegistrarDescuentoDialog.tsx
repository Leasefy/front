'use client';

/**
 * Registrar un descuento manual al propietario: servicios, predial, un gasto que
 * la inmobiliaria pagó por él.
 *
 * Nico y Juan Camilo (2026-09-16): **motivo Y soporte obligatorios**. El
 * propietario lo ve en su extracto con el soporte adjunto; sin soporte no tiene
 * con qué revisarlo y la inmobiliaria no tiene con qué defenderlo. El back
 * rechaza igual (400) — acá se dice antes de mandar, para no perder lo escrito.
 *
 * El descuento entra en la PRIMERA liquidación sin pagar del propietario desde
 * este mes. Eso lo decide el back con su regla; la pantalla no lo calcula.
 */

import { useEffect, useState } from 'react';
import { Paperclip } from '@phosphor-icons/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input } from '@/components/ui';
import { MoneyInput } from '@/components/ui/money-input';
import { useI18n } from '@/lib/i18n';
import type { NuevoDescuento } from '@/lib/types/deducciones';

/** Lo que el back acepta como soporte. */
export const TIPOS_DE_SOPORTE = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES_DEL_SOPORTE = 10 * 1024 * 1024;

export interface InmuebleParaElDescuento {
  consignacionId: string;
  titulo: string;
}

export interface RegistrarDescuentoDialogProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Los inmuebles del propietario, para asociar el descuento (opcional). */
  inmuebles: InmuebleParaElDescuento[];
  /**
   * Guardar. Se espera la promesa: si el back rechaza, el diálogo NO se cierra
   * y lo escrito se conserva.
   */
  onGuardar: (descuento: NuevoDescuento) => Promise<void>;
}

export function RegistrarDescuentoDialog({
  abierto,
  onOpenChange,
  inmuebles,
  onGuardar,
}: RegistrarDescuentoDialogProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.nuevo.${s}`;
  const [motivo, setMotivo] = useState('');
  const [valor, setValor] = useState('');
  const [consignacionId, setConsignacionId] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setValor('');
      setConsignacionId('');
      setSoporte(null);
      setErrores({});
      setGuardando(false);
    }
  }, [abierto]);

  const validar = () => {
    const nuevos: Record<string, string> = {};
    if (motivo.trim().length < 3) nuevos.motivo = t(k('faltaMotivo'));
    if (!valor || Number(valor) <= 0) nuevos.valor = t(k('faltaValor'));
    if (!soporte) nuevos.soporte = t(k('faltaSoporte'));
    else if (!TIPOS_DE_SOPORTE.includes(soporte.type)) nuevos.soporte = t(k('soporteTipo'));
    else if (soporte.size > MAX_BYTES_DEL_SOPORTE) nuevos.soporte = t(k('soporteMuyPesado'));
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  };

  const guardar = async () => {
    if (guardando || !validar() || !soporte) return;
    setGuardando(true);
    try {
      await onGuardar({
        motivo: motivo.trim(),
        valorCop: Number(valor),
        consignacionId: consignacionId || null,
        soporte,
      });
      onOpenChange(false);
    } catch {
      // El motivo lo dice quien guardó. Acá sólo se devuelve el control.
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="registrar-descuento">
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          <DialogDescription>{t(k('descripcion'))}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="descuento-motivo" className="block text-sm font-medium text-fg">
              {t(k('motivo'))} <span className="text-danger">*</span>
            </label>
            <Input
              id="descuento-motivo"
              value={motivo}
              maxLength={500}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t(k('motivoPlaceholder'))}
              aria-invalid={Boolean(errores.motivo)}
            />
            <p className="text-xs text-fg-muted">{t(k('motivoAyuda'))}</p>
            {errores.motivo && <p className="text-xs text-danger">{errores.motivo}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="descuento-valor" className="block text-sm font-medium text-fg">
              {t(k('valor'))} <span className="text-danger">*</span>
            </label>
            <MoneyInput
              id="descuento-valor"
              value={valor}
              onChange={(crudo) => setValor(crudo)}
              aria-invalid={Boolean(errores.valor)}
            />
            {errores.valor && <p className="text-xs text-danger">{errores.valor}</p>}
          </div>

          {inmuebles.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="descuento-inmueble" className="block text-sm font-medium text-fg">
                {t(k('inmueble'))}
              </label>
              <select
                id="descuento-inmueble"
                value={consignacionId}
                onChange={(e) => setConsignacionId(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
              >
                <option value="">{t(k('inmuebleNinguno'))}</option>
                {inmuebles.map((i) => (
                  <option key={i.consignacionId} value={i.consignacionId}>
                    {i.titulo}
                  </option>
                ))}
              </select>
              <p className="text-xs text-fg-muted">{t(k('inmuebleAyuda'))}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="descuento-soporte" className="block text-sm font-medium text-fg">
              {t(k('soporte'))} <span className="text-danger">*</span>
            </label>
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-surface-muted px-3 py-2">
              <Paperclip className="h-4 w-4 flex-shrink-0 text-fg-muted" />
              <input
                id="descuento-soporte"
                type="file"
                accept={TIPOS_DE_SOPORTE.join(',')}
                onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                className="min-w-0 flex-1 text-sm text-fg file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1 file:text-sm file:text-fg"
                aria-invalid={Boolean(errores.soporte)}
                data-testid="descuento-soporte"
              />
            </div>
            <p className="text-xs text-fg-muted">{t(k('soporteAyuda'))}</p>
            {errores.soporte && <p className="text-xs text-danger">{errores.soporte}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
            {t(k('cancelar'))}
          </Button>
          <Button hideArrow onClick={() => void guardar()} disabled={guardando} data-testid="descuento-guardar">
            {guardando ? t(k('guardando')) : t(k('guardar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
