'use client';

/**
 * «¿A cargo de quién queda la reparación?», al aprobar una cotización.
 *
 * Nico y Juan Camilo (2026-09-16): al aprobar la cotización, la inmobiliaria
 * marca a cargo de quién es.
 *
 * · Del PROPIETARIO: 🔴 D12 (17-09-2026) «siempre las aprueba el propietario».
 *   No se descuenta todavía: se le PIDE la aprobación y la deducción nace
 *   cuando él la acepta desde su portal. La EXCEPCIÓN es la emergencia: con
 *   motivo y soporte se descuenta de una y se genera el aviso ese mismo día.
 * · Del INQUILINO: no se le descuenta nada al propietario y la reparación
 *   entra a su estado de cuenta como un cargo de una sola vez, en la cuota del
 *   mes de la aprobación o en la siguiente sin pagar.
 *
 * No hay opción preseleccionada: la decisión se toma a propósito. Si el agente
 * de mantenimiento dejó una sugerencia, se dice —«el agente propone, una
 * persona aprueba»—, pero tampoco se preselecciona.
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useI18n } from '@/lib/i18n';
import type { ACargoDe, EmergenciaDeLaReparacion } from '@/lib/types/deducciones';

export interface CotizacionPorAprobar {
  proveedor: string;
  valorCop: number;
}

export function ACargoDeDialog({
  abierto,
  onOpenChange,
  cotizacion,
  sugerencia = null,
  onConfirmar,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  cotizacion: CotizacionPorAprobar | null;
  /** A cargo de quién sugiere el agente. Sólo se dice; decide la persona. */
  sugerencia?: ACargoDe | null;
  /**
   * Se espera: si el back rechaza, el diálogo queda abierto. Con
   * `emergencia`, la reparación del propietario se aprueba SIN esperarlo (D12).
   */
  onConfirmar: (aCargoDe: ACargoDe, emergencia?: EmergenciaDeLaReparacion) => Promise<void>;
}) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.aCargoDe.${s}`;
  const [eleccion, setEleccion] = useState<ACargoDe | null>(null);
  const [aprobando, setAprobando] = useState(false);
  const [esEmergencia, setEsEmergencia] = useState(false);
  const [motivoDeEmergencia, setMotivoDeEmergencia] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);

  useEffect(() => {
    if (abierto) {
      setEleccion(null);
      setAprobando(false);
      setEsEmergencia(false);
      setMotivoDeEmergencia('');
      setSoporte(null);
    }
  }, [abierto]);

  const emergenciaIncompleta =
    eleccion === 'PROPIETARIO' && esEmergencia && (!motivoDeEmergencia.trim() || !soporte);

  const confirmar = async () => {
    if (!eleccion || aprobando || emergenciaIncompleta) return;
    setAprobando(true);
    try {
      if (eleccion === 'PROPIETARIO' && esEmergencia && soporte) {
        await onConfirmar(eleccion, { motivo: motivoDeEmergencia.trim(), soporte });
      } else {
        await onConfirmar(eleccion);
      }
      onOpenChange(false);
    } catch {
      setAprobando(false);
    }
  };

  const opciones: { valor: ACargoDe; titulo: string; ayuda: string }[] = [
    { valor: 'PROPIETARIO', titulo: t(k('propietario')), ayuda: t(k('propietarioAyuda')) },
    { valor: 'INQUILINO', titulo: t(k('inquilino')), ayuda: t(k('inquilinoAyuda')) },
  ];

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent data-testid="a-cargo-de">
        <DialogHeader>
          <DialogTitle>{t(k('titulo'))}</DialogTitle>
          {cotizacion && (
            <DialogDescription>
              {t(k('descripcion'), {
                proveedor: cotizacion.proveedor,
                valor: formatCurrency(cotizacion.valorCop),
              })}
            </DialogDescription>
          )}
        </DialogHeader>

        {sugerencia && (
          <p
            className="rounded-md border border-border bg-info-soft px-3 py-2 text-xs text-fg"
            data-testid="a-cargo-de-sugerencia"
          >
            {t(k('sugiereElAgente'), {
              quien: t(k(sugerencia === 'PROPIETARIO' ? 'quienPropietario' : 'quienInquilino')),
            })}
          </p>
        )}

        <div role="radiogroup" aria-label={t(k('titulo'))} className="space-y-3">
          {opciones.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={eleccion === o.valor}
              onClick={() => setEleccion(o.valor)}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-colors',
                eleccion === o.valor
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-surface hover:bg-surface-muted',
              )}
              data-testid={`a-cargo-de-${o.valor}`}
            >
              <p className="text-sm font-medium text-fg">{o.titulo}</p>
              <p className="mt-1 text-xs text-fg-muted">{o.ayuda}</p>
            </button>
          ))}
        </div>

        {eleccion === 'PROPIETARIO' && (
          <div className="space-y-3 rounded-lg border border-border bg-surface-muted p-4" data-testid="emergencia">
            <label className="flex items-start gap-2 text-sm text-fg">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={esEmergencia}
                onChange={(e) => setEsEmergencia(e.target.checked)}
                data-testid="emergencia-marcar"
              />
              <span>
                <span className="font-medium">{t(k('emergencia'))}</span>
                <span className="block text-xs text-fg-muted">{t(k('emergenciaAyuda'))}</span>
              </span>
            </label>
            {esEmergencia && (
              <>
                <label className="block text-xs font-medium text-fg" htmlFor="emergencia-motivo">
                  {t(k('emergenciaMotivo'))}
                </label>
                <textarea
                  id="emergencia-motivo"
                  className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
                  rows={3}
                  value={motivoDeEmergencia}
                  onChange={(e) => setMotivoDeEmergencia(e.target.value)}
                  data-testid="emergencia-motivo"
                />
                <label className="block text-xs font-medium text-fg" htmlFor="emergencia-soporte">
                  {t(k('emergenciaSoporte'))}
                </label>
                <input
                  id="emergencia-soporte"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-fg-muted"
                  data-testid="emergencia-soporte"
                />
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={aprobando}>
            {t(k('cancelar'))}
          </Button>
          <Button
            hideArrow
            onClick={() => void confirmar()}
            disabled={!eleccion || aprobando || emergenciaIncompleta}
            data-testid="a-cargo-de-confirmar"
          >
            {aprobando
              ? t(k('aprobando'))
              : eleccion === 'PROPIETARIO'
                ? t(k(esEmergencia ? 'confirmarEmergencia' : 'pedirAprobacion'))
                : t(k('confirmar'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
