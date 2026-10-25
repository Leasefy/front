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
 *
 * Portofino 22-10-2026: «la reparación valió 2 millones y la vamos a diferir en
 * 5 meses». Cada lado que paga (el propietario, el inquilino o los dos en una
 * compartida) se cobra DE UNA VEZ, como siempre, o EN VARIOS MESES: el mismo
 * selector de los conceptos del contrato (partes iguales editables; un mes ya
 * pagado pasa a la próxima cuota sin pagar). Lo del propietario sigue
 * esperando su aprobación; los meses van con lo que se le pide.
 */

import { useEffect, useState } from 'react';
import { Presence } from '@leasefy/cadence';
import { Checkbox } from '@/components/ui/checkbox';
import { MesesDelConcepto, type MesElegido } from '@/components/contratos/MesesDelConcepto';
import { mantenimientoApi } from '@/lib/api/inmobiliaria.service';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';
import { AREAS_DE_LA_DEUDA } from '@/lib/plata/con-centavos';
import { sumanElTotal } from '@/lib/contratos/meses-del-concepto';

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
import type { MantenimientoPriority } from '@/lib/types/inmobiliaria';
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

type Lado = 'PROPIETARIO' | 'INQUILINO';

/**
 * Cuánto le toca a cada lado, con la MISMA regla del back
 * (`repartoDeLaReparacion`): el inquilino hacia abajo en la unidad del monto
 * (peso, o centavo si trae centavos) y el propietario se lleva el resto.
 */
export function partesDeLaReparacion(
  eleccion: ACargoDeLaReparacion | null,
  valorCop: number,
  inquilinoPct: number,
): { PROPIETARIO: number; INQUILINO: number } {
  if (!eleccion || !(valorCop > 0)) return { PROPIETARIO: 0, INQUILINO: 0 };
  if (eleccion === 'PROPIETARIO') return { PROPIETARIO: valorCop, INQUILINO: 0 };
  if (eleccion === 'INQUILINO') return { PROPIETARIO: 0, INQUILINO: valorCop };
  if (eleccion === 'INMOBILIARIA') return { PROPIETARIO: 0, INQUILINO: 0 };
  const conCentavos = !Number.isInteger(valorCop);
  const unidad = conCentavos ? 100 : 1;
  const total = conCentavos ? Math.round(valorCop * 100) : valorCop; // redondeo: no es plata (centavos enteros)
  const inquilino = Math.floor((total * inquilinoPct) / 100) / unidad; // redondeo: no es plata (la regla del back)
  return { PROPIETARIO: (total - inquilino * unidad) / unidad, INQUILINO: inquilino };
}

export function ACargoDeDialog({
  abierto,
  onOpenChange,
  cotizacion,
  sugerencia = null,
  preseleccion = null,
  prioridad = null,
  solicitudId = null,
  onConfirmar,
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  cotizacion: CotizacionPorAprobar | null;
  /** A cargo de quién sugiere el agente. Sólo se dice; decide la persona. */
  sugerencia?: ACargoDeLaReparacion | null;
  /**
   * 🔴 SO-11 (QA 04-10): el «Responsable del pago» que se escogió al crear la
   * solicitud llega ya marcado (la persona lo puede cambiar). Antes se volvía
   * a preguntar desde cero.
   */
  preseleccion?: ACargoDeLaReparacion | null;
  /**
   * La prioridad de la reparación (Portofino, 22-10-2026). Con «Emergencia» la
   * excepción de emergencia viene MARCADA: se arregla sin esperar al
   * propietario («es mejor pelear después con el propietario que dejar al
   * inquilino tirado»). Se puede desmarcar; igual pide motivo y soporte.
   */
  prioridad?: MantenimientoPriority | null;
  /**
   * Portofino 22-10: la solicitud, para traer los meses donde se puede diferir
   * (los del contrato vigente del inmueble). Sin ella no se ofrece diferir.
   */
  solicitudId?: string | null;
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
  // Portofino 22-10: diferir en meses, por lado.
  const conCentavos = usePlataConCentavos(AREAS_DE_LA_DEUDA);
  const [enMeses, setEnMeses] = useState<Record<Lado, boolean>>({ PROPIETARIO: false, INQUILINO: false });
  const [meses, setMeses] = useState<Record<Lado, MesElegido[]>>({ PROPIETARIO: [], INQUILINO: [] });

  useEffect(() => {
    if (abierto) {
      setEleccion(preseleccion);
      setAprobando(false);
      setEsEmergencia(prioridad === 'emergency');
      setMotivoDeEmergencia('');
      setSoporte(null);
      setInquilinoPct(50);
      setMotivoInmobiliaria('');
      setEnMeses({ PROPIETARIO: false, INQUILINO: false });
      setMeses({ PROPIETARIO: [], INQUILINO: [] });
    }
  }, [abierto, preseleccion, prioridad]);

  const partes = partesDeLaReparacion(eleccion, cotizacion?.valorCop ?? 0, inquilinoPct);
  /** Los lados que pagan algo (los que se pueden diferir). */
  const ladosQuePagan = (['PROPIETARIO', 'INQUILINO'] as const).filter((l) => partes[l] > 0);
  const seDifiere = (lado: Lado) => Boolean(solicitudId) && enMeses[lado] && partes[lado] > 0;
  // Un lado en meses tiene que tener meses y sumar lo suyo.
  const mesesIncompletos = ladosQuePagan.some(
    (l) => seDifiere(l) && (meses[l].length === 0 || !sumanElTotal(partes[l], meses[l])),
  );

  const emergenciaIncompleta =
    eleccion === 'PROPIETARIO' && esEmergencia && (!motivoDeEmergencia.trim() || !soporte);
  // H-03: el % del inquilino tiene que dejar algo de los dos lados.
  const repartoInvalido =
    eleccion === 'COMPARTIDA' &&
    (!Number.isFinite(inquilinoPct) || inquilinoPct <= 0 || inquilinoPct >= 100);
  const faltaElMotivo =
    eleccion === 'INMOBILIARIA' && motivoInmobiliaria.trim().length === 0;
  const noSePuede =
    !eleccion || aprobando || emergenciaIncompleta || repartoInvalido || faltaElMotivo || mesesIncompletos;

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
        ...(seDifiere('PROPIETARIO') || seDifiere('INQUILINO')
          ? {
              diferir: {
                ...(seDifiere('PROPIETARIO') ? { propietario: meses.PROPIETARIO } : {}),
                ...(seDifiere('INQUILINO') ? { inquilino: meses.INQUILINO } : {}),
              },
            }
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
            className="rounded-md border border-border bg-info-soft px-3 py-2 text-caption text-fg"
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
                  : 'border-border bg-surface hover:bg-surface-hover',
              )}
              data-testid={`a-cargo-de-${o.valor}`}
            >
              <p className="text-sm font-medium text-fg">{o.titulo}</p>
              <p className="mt-1 text-caption text-fg-muted">{o.ayuda}</p>
            </button>
          ))}
        </div>

        {eleccion === 'PROPIETARIO' && (
          <div className="space-y-3 rounded-lg border border-border bg-surface-hover p-4" data-testid="emergencia">
            <label className="flex items-start gap-2 text-sm text-fg">
              <Checkbox className="mt-0.5" checked={esEmergencia} onCheckedChange={(marcada: boolean) => setEsEmergencia(marcada)} data-testid="emergencia-marcar" />
              <span>
                <span className="font-medium">{t(k('emergencia'))}</span>
                <span className="block text-caption text-fg-muted">{t(k('emergenciaAyuda'))}</span>
              </span>
            </label>
            {prioridad === 'emergency' && (
              <p className="text-xs text-fg-muted" data-testid="emergencia-por-la-prioridad">
                Viene marcada porque la reparación es de prioridad Emergencia: se arregla sin esperar al propietario.
              </p>
            )}
            {esEmergencia && (
              <>
                <label className="block text-caption font-medium text-fg" htmlFor="emergencia-motivo">
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
                <label className="block text-caption font-medium text-fg" htmlFor="emergencia-soporte">
                  {t(k('emergenciaSoporte'))}
                </label>
                <input
                  id="emergencia-soporte"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
                  className="block w-full text-caption text-fg-muted"
                  data-testid="emergencia-soporte"
                />
              </>
            )}
          </div>
        )}

        {eleccion === 'COMPARTIDA' && (
          <div
            className="space-y-3 rounded-lg border border-border bg-surface-hover p-4"
            data-testid="reparto"
          >
            <label className="block text-caption font-medium text-fg" htmlFor="reparto-inquilino">
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
            <p className="text-caption text-fg-muted" data-testid="reparto-resumen">
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

        {solicitudId && ladosQuePagan.length > 0 && (
          <div className="space-y-3" data-testid="cuando-se-cobra">
            {ladosQuePagan.map((lado) => (
              <div key={lado} className="space-y-3 rounded-lg border border-border bg-surface-hover p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-fg">
                    {lado === 'PROPIETARIO'
                      ? 'Lo del propietario'
                      : 'Lo del inquilino'}{' '}
                    <span className="font-normal text-fg-muted">· {formatCurrency(partes[lado])}</span>
                  </p>
                  <div
                    role="radiogroup"
                    aria-label={lado === 'PROPIETARIO' ? '¿Cuándo se le descuenta al propietario?' : '¿Cuándo se le cobra al inquilino?'}
                    className="inline-flex rounded-md border border-border bg-surface p-0.5"
                  >
                    {([false, true] as const).map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        role="radio"
                        aria-checked={enMeses[lado] === v}
                        onClick={() => setEnMeses((x) => ({ ...x, [lado]: v }))}
                        className={cn(
                          'rounded px-2.5 py-1 text-xs transition-colors',
                          enMeses[lado] === v ? 'bg-primary-soft font-medium text-fg' : 'text-fg-muted hover:text-fg',
                        )}
                        data-testid={`cuando-${lado}-${v ? 'meses' : 'una-vez'}`}
                      >
                        {v ? 'En varios meses' : 'De una vez'}
                      </button>
                    ))}
                  </div>
                </div>
                <Presence show={enMeses[lado]} direction="down">
                  <div className="space-y-2">
                    <p className="text-xs text-fg-muted">
                      {lado === 'PROPIETARIO'
                        ? eleccion === 'PROPIETARIO' && esEmergencia
                          ? 'Se le descuenta de su giro en los meses que elijas, en lugar de una sola vez.'
                          : 'Se le descuenta de su giro en los meses que elijas, cuando apruebe la reparación.'
                        : 'Entra a su cuota de cada mes que elijas, en lugar de una sola vez.'}
                    </p>
                    {enMeses[lado] ? (
                      <MesesDelConcepto
                        cargar={() => mantenimientoApi.mesesParaDiferir(solicitudId, lado)}
                        sinMigracion="Todavía no se puede diferir una reparación en meses: Leasefy tiene pendiente una actualización. Cóbrala de una vez."
                        paga={lado}
                        total={partes[lado]}
                        conCentavos={conCentavos}
                        valor={meses[lado]}
                        onCambiar={(m) => setMeses((x) => ({ ...x, [lado]: m }))}
                      />
                    ) : null}
                  </div>
                </Presence>
              </div>
            ))}
          </div>
        )}

        {eleccion === 'INMOBILIARIA' && (
          <div
            className="space-y-3 rounded-lg border border-border bg-surface-hover p-4"
            data-testid="motivo-inmobiliaria"
          >
            <label
              className="block text-caption font-medium text-fg"
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
            isLoading={aprobando}
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
