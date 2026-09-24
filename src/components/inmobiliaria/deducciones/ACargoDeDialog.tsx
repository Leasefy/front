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
 * · 🔴 COMPARTIDA (H-03, 18-09-2026): las dos cosas a la vez, por el % pactado.
 *   Los dos porcentajes suman 100 y el peso que sobra va al propietario.
 * · 🔴 DE LA INMOBILIARIA (H-03): gasto propio — garantía de su proveedor o
 *   error suyo. No se le descuenta al propietario ni se le cobra al inquilino,
 *   y el MOTIVO es obligatorio: es plata propia y queda escrito por qué.
 *
 * Hasta el 18-09 esta pantalla sólo ofrecía las dos primeras, aunque la base
 * admitía las cuatro desde antes (`MantenimientoPaidBy` ya tenía `SPLIT` y
 * `AGENCY_PAYS`). Lo que faltaba era dónde guardar el % y el motivo.
 *
 * No hay opción preseleccionada: la decisión se toma a propósito. Si el agente
 * de mantenimiento dejó una sugerencia, se dice —«el agente propone, una
 * persona aprueba»—, pero tampoco se preselecciona.
 */

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

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
import type {
  ACargoDeLaReparacion,
  EmergenciaDeLaReparacion,
  LoQueSeAprueba,
} from '@/lib/types/deducciones';

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
  sugerencia?: ACargoDeLaReparacion | null;
  /**
   * Se espera: si el back rechaza, el diálogo queda abierto. Con
   * `emergencia`, la reparación del propietario se aprueba SIN esperarlo (D12).
   */
  onConfirmar: (
    lo: LoQueSeAprueba,
    emergencia?: EmergenciaDeLaReparacion,
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.aCargoDe.${s}`;
  const [eleccion, setEleccion] = useState<ACargoDeLaReparacion | null>(null);
  const [aprobando, setAprobando] = useState(false);
  const [esEmergencia, setEsEmergencia] = useState(false);
  const [motivoDeEmergencia, setMotivoDeEmergencia] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  /*
   * 🔴 H-03: el % del INQUILINO es el que se escribe, y el del propietario
   * sale de restar. Con dos campos editables la persona puede dejar 60/30 sin
   * darse cuenta, y el back lo rechaza después de que ya escribió todo. Con
   * uno solo, la suma es 100 por construcción.
   */
  const [inquilinoPct, setInquilinoPct] = useState(50);
  const [motivoInmobiliaria, setMotivoInmobiliaria] = useState('');

  useEffect(() => {
    if (abierto) {
      setEleccion(null);
      setAprobando(false);
      setEsEmergencia(false);
      setMotivoDeEmergencia('');
      setSoporte(null);
      setInquilinoPct(50);
      setMotivoInmobiliaria('');
    }
  }, [abierto]);

  const emergenciaIncompleta =
    eleccion === 'PROPIETARIO' && esEmergencia && (!motivoDeEmergencia.trim() || !soporte);
  // H-03: el % del inquilino tiene que dejar algo de los dos lados.
  const repartoInvalido =
    eleccion === 'COMPARTIDA' &&
    (!Number.isFinite(inquilinoPct) || inquilinoPct <= 0 || inquilinoPct >= 100);
  const faltaElMotivo =
    eleccion === 'INMOBILIARIA' && motivoInmobiliaria.trim().length === 0;
  const noSePuede =
    !eleccion || aprobando || emergenciaIncompleta || repartoInvalido || faltaElMotivo;

  const propietarioPct = Math.round((100 - inquilinoPct) * 100) / 100;

  const confirmar = async () => {
    if (noSePuede || !eleccion) return;
    setAprobando(true);
    try {
      const lo: LoQueSeAprueba = {
        aCargoDe: eleccion,
        ...(eleccion === 'COMPARTIDA'
          ? { porcentajes: { propietarioPct, inquilinoPct } }
          : {}),
        ...(eleccion === 'INMOBILIARIA'
          ? { motivoInmobiliaria: motivoInmobiliaria.trim() }
          : {}),
      };
      if (eleccion === 'PROPIETARIO' && esEmergencia && soporte) {
        await onConfirmar(lo, { motivo: motivoDeEmergencia.trim(), soporte });
      } else {
        await onConfirmar(lo);
      }
      onOpenChange(false);
    } catch {
      setAprobando(false);
    }
  };

  const opciones: {
    valor: ACargoDeLaReparacion;
    titulo: string;
    ayuda: string;
  }[] = [
    { valor: 'PROPIETARIO', titulo: t(k('propietario')), ayuda: t(k('propietarioAyuda')) },
    { valor: 'INQUILINO', titulo: t(k('inquilino')), ayuda: t(k('inquilinoAyuda')) },
    { valor: 'COMPARTIDA', titulo: t(k('compartida')), ayuda: t(k('compartidaAyuda')) },
    { valor: 'INMOBILIARIA', titulo: t(k('inmobiliaria')), ayuda: t(k('inmobiliariaAyuda')) },
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
              quien: t(
                k(
                  sugerencia === 'PROPIETARIO'
                    ? 'quienPropietario'
                    : sugerencia === 'INQUILINO'
                      ? 'quienInquilino'
                      : sugerencia === 'COMPARTIDA'
                        ? 'quienCompartida'
                        : 'quienInmobiliaria',
                ),
              ),
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
              <Checkbox className="mt-0.5" checked={esEmergencia} onCheckedChange={(marcada: boolean) => setEsEmergencia(marcada)} data-testid="emergencia-marcar" />
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

        {eleccion === 'COMPARTIDA' && (
          <div
            className="space-y-3 rounded-lg border border-border bg-surface-muted p-4"
            data-testid="reparto"
          >
            <label className="block text-xs font-medium text-fg" htmlFor="reparto-inquilino">
              {t(k('repartoInquilino'))}
            </label>
            <input
              id="reparto-inquilino"
              type="number"
              min={1}
              max={99}
              step={0.01}
              value={inquilinoPct}
              onChange={(e) => setInquilinoPct(Number(e.target.value))}
              className="w-28 rounded-md border border-border bg-surface p-2 text-sm text-fg"
              data-testid="reparto-inquilino"
            />
            <p className="text-xs text-fg-muted" data-testid="reparto-resumen">
              {t(k('repartoResumen'), {
                inquilino: `${inquilinoPct}`,
                propietario: `${propietarioPct}`,
                valorInquilino: cotizacion
                  ? formatCurrency(
                      Math.floor((cotizacion.valorCop * inquilinoPct) / 100),
                    )
                  : '',
                valorPropietario: cotizacion
                  ? formatCurrency(
                      cotizacion.valorCop -
                        Math.floor((cotizacion.valorCop * inquilinoPct) / 100),
                    )
                  : '',
              })}
            </p>
          </div>
        )}

        {eleccion === 'INMOBILIARIA' && (
          <div
            className="space-y-3 rounded-lg border border-border bg-surface-muted p-4"
            data-testid="motivo-inmobiliaria"
          >
            <label
              className="block text-xs font-medium text-fg"
              htmlFor="motivo-de-la-inmobiliaria"
            >
              {t(k('inmobiliariaMotivo'))}
            </label>
            <textarea
              id="motivo-de-la-inmobiliaria"
              className="w-full rounded-md border border-border bg-surface p-2 text-sm text-fg"
              rows={3}
              value={motivoInmobiliaria}
              onChange={(e) => setMotivoInmobiliaria(e.target.value)}
              data-testid="motivo-inmobiliaria-texto"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" hideArrow onClick={() => onOpenChange(false)} disabled={aprobando}>
            {t(k('cancelar'))}
          </Button>
          <Button
            hideArrow
            onClick={() => void confirmar()}
            disabled={noSePuede}
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
