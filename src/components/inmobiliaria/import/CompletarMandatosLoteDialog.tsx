'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth/use-auth';
import { ApiError } from '@/lib/api/client';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { InmuebleSinConsignacion, Propietario, Agente, PropietarioFormData } from '@/lib/types/inmobiliaria';
import { PropietarioSelector } from '@/components/inmobiliaria/PropietarioSelector';
import { AgenteSelector } from '@/components/inmobiliaria/AgenteSelector';
import { persistPropietarioIfNeeded } from '@/components/inmobiliaria/CompletarMandatoDialog';
import {
  submitMandatosLote,
  submitMandatosPorInmueble,
  type AsignacionDeMandato,
  type MandatoLoteResult,
} from './lib/submitMandatosLote';
import {
  MandatosPorInmueble,
  type AsignacionFila,
  type PropietarioNuevo,
} from './MandatosPorInmueble';

/**
 * The end-of-import mandate modal — T-0030 WU-3, Slice A (R1), extended by
 * WU-4 for auto-publish and, on 2026-09-02 (Nico), by a second mode.
 *
 * Two modes, one `SegmentedControl` (hidden when there is a single property):
 *
 *   - «Mismo propietario para todos»: one shared form (propietario,
 *     commission, contract date, agent) applies to EVERY property just
 *     imported — a 30-property import must not face 30 dialogs.
 *   - «Uno por uno»: a row per property, each with its own propietario and
 *     (optionally) its own commission; contract date and agent stay shared.
 *     Rows left without a propietario are NOT sent — they stay DRAFT with no
 *     mandate, already surfaced by WU-2's portfolio alert, and the footer
 *     says how many («M quedan para después»).
 *
 * Skippable: closing it creates nothing further (R2).
 *
 * Completing a mandate publishes the property (contract.md T-0030 §3.4,
 * amendment A-1.1) — mandate first, publish second, and only for
 * properties whose mandate actually succeeded. `submitMandatosLote` /
 * `submitMandatosPorInmueble` (via `completeMandatoAndPublish`) do the
 * mandate+publish call per property; this dialog only summarizes the
 * outcomes, identically for both modes.
 *
 * Límite del MODELO, no de esta pantalla: una consignación tiene UN
 * propietario (`Consignacion.propietarioId`). Nico pidió «el propietario o
 * los propietarios» — copropietarios no existen en el back hoy, así que
 * acá se elige uno por inmueble. Si el modelo crece a varios, este diálogo
 * cambia el Combobox por un multi-select y nada más.
 */
export interface CompletarMandatosLoteDialogProps {
  inmuebles: InmuebleSinConsignacion[];
  propietarios: Propietario[];
  agentes: Agente[];
  /** Skip — closes with no call made. */
  onClose: () => void;
  /** Fired after a submit attempt (any outcome) so the caller can advance. */
  onDone: (result: MandatoLoteResult) => void;
}

type Modo = 'todos' | 'unoPorUno';

const todayISO = () => new Date().toISOString().split('T')[0];

export function CompletarMandatosLoteDialog({
  inmuebles,
  propietarios,
  agentes,
  onClose,
  onDone,
}: CompletarMandatosLoteDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();

  const [modo, setModo] = useState<Modo>('todos');

  // Compartido por los dos modos: cambiar de modo no lo pierde.
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [contractDate, setContractDate] = useState(todayISO());
  const [agenteId, setAgenteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modo «todos».
  const [propietarioId, setPropietarioId] = useState<string | null>(null);
  const [newPropietarioData, setNewPropietarioData] = useState<PropietarioFormData | undefined>();

  // Modo «uno por uno».
  const [asignaciones, setAsignaciones] = useState<Record<string, AsignacionFila>>({});
  const [nuevos, setNuevos] = useState<PropietarioNuevo[]>([]);

  if (inmuebles.length === 0) return null;

  const filasListas = inmuebles.filter((i) => asignaciones[i.propertyId]?.propietarioId);
  const filasParaDespues = inmuebles.length - filasListas.length;

  const terminosValidos = commissionPercent >= 0 && Boolean(contractDate);
  const isValid =
    modo === 'todos'
      ? Boolean(propietarioId) && terminosValidos
      : filasListas.length > 0 &&
        terminosValidos &&
        filasListas.every((i) => (asignaciones[i.propertyId].commissionPercent ?? commissionPercent) >= 0);

  const agenteUserId = () => {
    const selectedAgente = agentes.find((a) => a.id === agenteId);
    return selectedAgente?.userId ?? (agenteId ? undefined : user?.id);
  };

  const notificarResultado = (result: MandatoLoteResult) => {
    if (result.failedCount === 0 && result.publishFailedCount === 0) {
      toast.success(t('inmobiliaria.import.confirm.mandateBatch.toasts.allSucceededTitle'), {
        description: t('inmobiliaria.import.confirm.mandateBatch.toasts.allSucceededDesc', {
          count: result.succeededCount,
        }),
      });
    } else if (result.succeededCount === 0) {
      // El motivo real del back («Alcanzaste el límite de propiedades de tu
      // plan…») vale más que el texto genérico: sin él, la persona reintenta
      // sin saber qué cambiar.
      const motivo = result.outcomes.find((o) => o.status === 'failed')?.mandateErrorMessage;
      toast.error(t('inmobiliaria.import.confirm.mandateBatch.toasts.allFailedTitle'), {
        description: motivo ?? t('inmobiliaria.import.confirm.mandateBatch.toasts.allFailedDesc'),
      });
    } else if (result.failedCount === 0) {
      // contract.md §3.4, amendment A-1.1 — every mandate is kept; only
      // the publish step failed for some. Report honestly, don't imply a
      // full failure — the mandate is the durable outcome.
      toast.warning(t('inmobiliaria.import.confirm.mandateBatch.toasts.publishPartialTitle'), {
        description: t('inmobiliaria.import.confirm.mandateBatch.toasts.publishPartialDesc', {
          count: result.publishFailedCount,
        }),
      });
    } else {
      toast.warning(t('inmobiliaria.import.confirm.mandateBatch.toasts.partialTitle'), {
        description: t('inmobiliaria.import.confirm.mandateBatch.toasts.partialDesc', {
          succeeded: result.succeededCount,
          failed: result.failedCount,
        }),
      });
    }
  };

  const enviarTodos = async (): Promise<MandatoLoteResult> => {
    const finalPropietarioId = await persistPropietarioIfNeeded(propietarioId!, newPropietarioData);
    return submitMandatosLote(inmuebles, {
      propietarioId: finalPropietarioId,
      commissionPercent,
      contractDate,
      agenteUserId: agenteUserId(),
    });
  };

  const enviarUnoPorUno = async (): Promise<MandatoLoteResult> => {
    // Un propietario nuevo se crea UNA vez aunque esté elegido en varias
    // filas; si ya se creó en un intento anterior que falló después, se
    // reusa el id real en vez de crear un duplicado.
    const idsReales = new Map<string, string>();
    for (const fila of filasListas) {
      const id = asignaciones[fila.propertyId].propietarioId!;
      if (!id.startsWith('new-') || idsReales.has(id)) continue;
      const nuevo = nuevos.find((n) => n.tempId === id);
      if (nuevo?.persistedId) {
        idsReales.set(id, nuevo.persistedId);
        continue;
      }
      const real = await persistPropietarioIfNeeded(id, nuevo?.data);
      idsReales.set(id, real);
      setNuevos((prev) => prev.map((n) => (n.tempId === id ? { ...n, persistedId: real } : n)));
    }

    const agente = agenteUserId();
    const envio: AsignacionDeMandato[] = filasListas.map((inmueble) => {
      const asignacion = asignaciones[inmueble.propertyId];
      const id = asignacion.propietarioId!;
      return {
        inmueble,
        values: {
          propietarioId: idsReales.get(id) ?? id,
          commissionPercent: asignacion.commissionPercent ?? commissionPercent,
          contractDate,
          agenteUserId: agente,
        },
      };
    });
    return submitMandatosPorInmueble(envio);
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = modo === 'todos' ? await enviarTodos() : await enviarUnoPorUno();
      notificarResultado(result);
      onDone(result);
    } catch (error) {
      // The propietario create/update step itself failed — nothing was
      // submitted yet, so the user can fix the owner and retry.
      const description =
        error instanceof ApiError && error.messages
          ? error.messages.join(' · ')
          : error instanceof Error && error.message
            ? error.message
            : t('inmobiliaria.import.confirm.mandateBatch.toasts.errorDesc');
      setFormError(description);
    } finally {
      setIsSubmitting(false);
    }
  };

  const asignar = (propertyId: string, cambio: Partial<AsignacionFila>) => {
    setAsignaciones((prev) => {
      const actual: AsignacionFila = prev[propertyId] ?? { propietarioId: null };
      return { ...prev, [propertyId]: { ...actual, ...cambio } };
    });
  };

  const agregarNuevoPropietario = (propertyId: string, data: PropietarioFormData) => {
    const tempId = `new-${Date.now()}-${nuevos.length}`;
    setNuevos((prev) => [...prev, { tempId, data }]);
    asignar(propertyId, { propietarioId: tempId });
  };

  const campoLabel = 'block text-sm font-medium text-fg-muted mb-2';

  const camposCompartidos = (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className={campoLabel} htmlFor="mandatos-lote-comision">
          {modo === 'todos'
            ? t('inmobiliaria.import.confirm.mandateBatch.commissionLabel')
            : t('inmobiliaria.import.confirm.mandateBatch.porInmueble.comisionGeneralLabel')}
        </label>
        <div className="relative">
          <Input
            id="mandatos-lote-comision"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={commissionPercent}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0 && value <= 100) setCommissionPercent(value);
            }}
            className="pr-10"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted">%</span>
        </div>
        {modo === 'unoPorUno' && (
          <p className="mt-1 text-xs text-fg-muted">
            {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.comisionGeneralHint')}
          </p>
        )}
      </div>

      <div>
        <label className={campoLabel} htmlFor="mandatos-lote-fecha">
          {modo === 'todos'
            ? t('inmobiliaria.import.confirm.mandateBatch.contractDateLabel')
            : t('inmobiliaria.import.confirm.mandateBatch.porInmueble.fechaLabel')}
        </label>
        <Input
          id="mandatos-lote-fecha"
          type="date"
          value={contractDate}
          onChange={(e) => setContractDate(e.target.value)}
        />
        {modo === 'unoPorUno' && (
          <p className="mt-1 text-xs text-fg-muted">
            {t('inmobiliaria.import.confirm.mandateBatch.porInmueble.fechaHint')}
          </p>
        )}
      </div>

      <div>
        <label className={campoLabel}>{t('inmobiliaria.import.confirm.mandateBatch.agenteLabel')}</label>
        <AgenteSelector agentes={agentes} value={agenteId} onChange={setAgenteId} allowNoAgent />
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      {/* Ancho: la lista de propietarios a 3 columnas y la tabla «uno por
          uno» necesitan sitio. Alto: el cuerpo scrollea y el pie queda fijo
          (lo reparte el shim de `DialogContent`). */}
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('inmobiliaria.import.confirm.mandateBatch.title')}</DialogTitle>
          <DialogDescription>
            {inmuebles.length === 1
              ? t('inmobiliaria.import.confirm.mandateBatch.subtitleUno')
              : t('inmobiliaria.import.confirm.mandateBatch.subtitle', { count: inmuebles.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {inmuebles.length > 1 && (
            <SegmentedControl<Modo>
              aria-label={t('inmobiliaria.import.confirm.mandateBatch.modo.ariaLabel')}
              value={modo}
              onChange={setModo}
              disabled={isSubmitting}
              options={[
                { value: 'todos', label: t('inmobiliaria.import.confirm.mandateBatch.modo.todos') },
                { value: 'unoPorUno', label: t('inmobiliaria.import.confirm.mandateBatch.modo.unoPorUno') },
              ]}
            />
          )}

          {modo === 'todos' ? (
            <>
              <div>
                <label className={campoLabel}>
                  {t('inmobiliaria.import.confirm.mandateBatch.propertiesListLabel')}
                </label>
                <div
                  className="grid max-h-40 gap-x-6 gap-y-2 overflow-y-auto rounded-lg border border-border bg-surface-muted p-3 md:grid-cols-2"
                  data-lenis-prevent
                  style={{ overscrollBehavior: 'contain' }}
                >
                  {inmuebles.map((row) => (
                    <div key={row.propertyId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-fg truncate">{row.propertyTitle}</span>
                      <span className="text-fg-muted font-mono tabular-nums whitespace-nowrap">
                        {/* T-0038: this batch dialog is rent-mandate-only — the
                            caller (StepConfirmImport) excludes SALE rows before
                            opening it (contract.md §3.2.4). `—` here is a
                            type-safety fallback, not an expected display. */}
                        {row.monthlyRent != null ? formatCurrency(row.monthlyRent) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className={campoLabel}>
                  {t('inmobiliaria.import.confirm.mandateBatch.propietarioLabel')}
                </label>
                <PropietarioSelector
                  propietarios={propietarios}
                  value={propietarioId}
                  onChange={(id, data) => {
                    setPropietarioId(id);
                    setNewPropietarioData(data);
                  }}
                  newPropietarioData={newPropietarioData}
                  columnas={3}
                />
              </div>

              {camposCompartidos}
            </>
          ) : (
            <>
              {camposCompartidos}
              <MandatosPorInmueble
                inmuebles={inmuebles}
                propietarios={propietarios}
                nuevos={nuevos}
                asignaciones={asignaciones}
                comisionGeneral={commissionPercent}
                onAsignar={asignar}
                onNuevoPropietario={agregarNuevoPropietario}
                disabled={isSubmitting}
              />
            </>
          )}

          {formError && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter className="sm:items-center">
          {modo === 'unoPorUno' && (
            <p
              className="text-sm text-fg-muted sm:mr-auto"
              data-testid="pie-para-despues"
              data-listas={filasListas.length}
              data-para-despues={filasParaDespues}
            >
              {filasListas.length === 0
                ? t('inmobiliaria.import.confirm.mandateBatch.porInmueble.ningunaLista')
                : filasParaDespues > 0
                  ? t('inmobiliaria.import.confirm.mandateBatch.porInmueble.paraDespues', {
                      count: filasParaDespues,
                    })
                  : null}
            </p>
          )}
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('inmobiliaria.import.confirm.mandateBatch.skip')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            isLoading={isSubmitting}
            data-testid="confirmar-mandatos"
          >
            {modo === 'todos'
              ? t('inmobiliaria.import.confirm.mandateBatch.confirm')
              : t('inmobiliaria.import.confirm.mandateBatch.porInmueble.confirm', {
                  count: filasListas.length,
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompletarMandatosLoteDialog;
