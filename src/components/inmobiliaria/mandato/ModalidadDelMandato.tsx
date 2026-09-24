'use client';

/**
 * 🔴 D1 y D2 en la ficha del inmueble (17-09): con qué modalidad se le gira al
 * propietario y de quién son los intereses de mora y gastos de cobranza que el
 * inquilino paga.
 *
 * Lo que se muestra es lo que RIGE (resuelto contra la inmobiliaria), no sólo
 * lo guardado: un mandato sin modalidad propia dice «Garantizado (la de la
 * inmobiliaria)», y uno sin nada dice que se liquida como siempre. Cambiarlo
 * rige desde hoy: el back lo escribe y la tarjeta lo dice.
 *
 * Editar pide `dispersiones:edit` (mueve a quién se le gira qué); verlo, lo
 * mismo que ver la ficha.
 */

import { useCallback, useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@leasefy/cadence';
import { enCristiano } from '@/lib/errores/en-cristiano';
import { HandCoins, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import {
  mandatoApi,
  type DestinoDeLosIntereses,
  type MandatoDeLaConsignacion,
  type Modalidad,
} from '@/lib/api/mandato.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  QUE_ES_LA_MODALIDAD,
  diaLegible,
  interesesEnPalabras,
  modalidadEnPalabras,
  SIN_MODALIDAD_PACTADA,
} from '@/lib/mandato/textos';

type OpcionDeModalidad = Modalidad | 'INMOBILIARIA';
type OpcionDeDestino = DestinoDeLosIntereses | 'MODALIDAD';

export function ModalidadDelMandato({
  consignacionId,
  esVenta,
  terminada,
}: {
  consignacionId: string;
  esVenta: boolean;
  terminada: boolean;
}) {
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('dispersiones', 'edit') && !terminada;
  const [mandato, setMandato] = useState<MandatoDeLaConsignacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setMandato(await mandatoApi.delMandato(consignacionId));
      setError(null);
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo leer la modalidad del mandato.'));
    }
  }, [consignacionId]);

  useEffect(() => {
    if (!esVenta) void cargar();
  }, [cargar, esVenta]);

  if (esVenta) return null;

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-4"
      data-testid="modalidad-del-mandato"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">Giro al propietario</h3>
        </div>
        {puedeEditar && mandato?.disponible ? (
          <Button variant="ghost" size="sm" hideArrow onClick={() => setAbierto(true)}>
            Cambiar
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : !mandato ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {/* 🔴 Acá salía «Falta aplicar la migración 20260917120000_…», que no
              le dice nada a quien administra inmuebles. El original queda en
              `title` para soporte. */}
          {!mandato.disponible && enCristiano(mandato.motivo).texto ? (
            <div
              className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning flex gap-2"
              title={enCristiano(mandato.motivo).tecnico ?? undefined}
            >
              <WarningCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{enCristiano(mandato.motivo).texto}</span>
            </div>
          ) : null}
          {/* 🔴 Los rótulos eran los del modelo —«Modalidad», «Destino de los
              intereses»— y las respuestas también («Sin modalidad: la
              liquidación de siempre»). Nico, 18-09-2026: «nada de lo que dice
              aquí lo entienden los usuarios». Ahora cada fila es una PREGUNTA
              sobre la plata del propietario, y debajo qué significa. */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-fg-muted">¿Cuánto se le gira cada mes?</dt>
              <dd className="text-foreground font-medium mt-0.5" data-testid="modalidad-efectiva">
                {modalidadEnPalabras(mandato.efectivo.modalidad)}
              </dd>
              <dd className="text-xs text-muted-foreground mt-1">
                {mandato.efectivo.modalidad.modalidad
                  ? QUE_ES_LA_MODALIDAD[mandato.efectivo.modalidad.modalidad]
                  : SIN_MODALIDAD_PACTADA}
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">
                Si el inquilino paga tarde, ¿de quién son los intereses?
              </dt>
              <dd className="text-foreground font-medium mt-0.5" data-testid="intereses-efectivos">
                {interesesEnPalabras(mandato.efectivo.intereses)}
              </dd>
              <dd className="text-xs text-muted-foreground mt-1">
                {mandato.efectivo.intereses.porcentajeAlPropietario > 0
                  ? 'Lo que el inquilino pague de intereses de mora entra en la liquidación del propietario, sin comisión.'
                  : mandato.efectivo.intereses.destino === 'PROPIETARIO'
                    ? 'Los intereses de mora y los gastos de cobranza se le giran al propietario.'
                    : 'Los intereses de mora y los gastos de cobranza se los queda la inmobiliaria: no entran en el giro del propietario.'}
              </dd>
            </div>
          </dl>
          {mandato.modalidadDesde ? (
            <p className="text-xs text-muted-foreground">
              Rige desde el {diaLegible(mandato.modalidadDesde)}: no cambia lo liquidado antes.
            </p>
          ) : null}
        </div>
      )}

      {mandato && abierto ? (
        <EditarModalidad
          mandato={mandato}
          onCerrar={() => setAbierto(false)}
          onGuardado={(m) => {
            setMandato(m);
            setAbierto(false);
          }}
        />
      ) : null}
    </section>
  );
}

function EditarModalidad({
  mandato,
  onCerrar,
  onGuardado,
}: {
  mandato: MandatoDeLaConsignacion;
  onCerrar: () => void;
  onGuardado: (m: MandatoDeLaConsignacion) => void;
}) {
  const [modalidad, setModalidad] = useState<OpcionDeModalidad>(mandato.modalidad ?? 'INMOBILIARIA');
  const [destino, setDestino] = useState<OpcionDeDestino>(mandato.destinoDeLosIntereses ?? 'MODALIDAD');
  const [pct, setPct] = useState(
    mandato.interesesAlPropietarioPct != null ? String(mandato.interesesAlPropietarioPct) : '',
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deLaCasa = mandato.inmobiliaria.modalidadDeMandato;

  async function guardar() {
    setError(null);
    const porcentaje = destino === 'REPARTO' ? Number(pct.replace(',', '.')) : null;
    if (destino === 'REPARTO' && (!Number.isFinite(porcentaje) || (porcentaje ?? 0) <= 0 || (porcentaje ?? 0) >= 100)) {
      setError('El reparto necesita el porcentaje del propietario, mayor que 0 y menor que 100.');
      return;
    }
    setGuardando(true);
    try {
      const m = await mandatoApi.guardarMandato(mandato.consignacionId, {
        modalidad: modalidad === 'INMOBILIARIA' ? null : modalidad,
        destinoDeLosIntereses: destino === 'MODALIDAD' ? null : destino,
        interesesAlPropietarioPct: porcentaje,
      });
      toast.success('Modalidad del mandato guardada.', {
        description: 'Rige desde hoy: lo ya liquidado no cambia.',
      });
      onGuardado(m);
    } catch (e) {
      setError(mensajeDelFallo(e, 'No se pudo guardar la modalidad.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onCerrar()}>
      <DialogContent className="sm:max-w-lg" data-testid="editar-modalidad">
        <DialogHeader>
          <DialogTitle>Cómo se le gira al propietario</DialogTitle>
          <DialogDescription>
            La modalidad decide sobre qué base se liquida este mandato. El cambio rige desde hoy.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Modalidad</legend>
          {/* Radios del sistema de diseño (21-09): el del navegador mide 13 px. */}
          <RadioGroup
            className="space-y-2"
            value={modalidad ?? ''}
            onValueChange={(v) => setModalidad(v as typeof modalidad)}
          >
          {(
            [
              [
                'INMOBILIARIA',
                deLaCasa
                  ? `La de la inmobiliaria (${deLaCasa === 'GARANTIZADO' ? 'garantizado' : 'sobre recaudo'})`
                  : 'La de la inmobiliaria (sin modalidad: la liquidación de siempre)',
                null,
              ],
              ['GARANTIZADO', 'Garantizado', QUE_ES_LA_MODALIDAD.GARANTIZADO],
              ['SOBRE_RECAUDO', 'Sobre recaudo', QUE_ES_LA_MODALIDAD.SOBRE_RECAUDO],
            ] as const
          ).map(([valor, nombre, ayuda]) => (
            <label
              key={valor}
              className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-surface-hover"
            >
              <RadioGroupItem value={valor} className="mt-1" />
              <span>
                <span className="block text-sm text-foreground">{nombre}</span>
                {ayuda ? <span className="block text-xs text-muted-foreground">{ayuda}</span> : null}
              </span>
            </label>
          ))}
        </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Intereses de mora y gastos de cobranza pagados
          </legend>
          <select
            className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
            value={destino}
            onChange={(e) => setDestino(e.target.value as OpcionDeDestino)}
            data-testid="destino-de-los-intereses"
          >
            <option value="MODALIDAD">
              Seguir a la modalidad (garantizado → inmobiliaria; sobre recaudo → propietario)
            </option>
            <option value="INMOBILIARIA">De la inmobiliaria</option>
            <option value="PROPIETARIO">Del propietario</option>
            <option value="REPARTO">Reparto con un porcentaje</option>
          </select>
          {destino === 'REPARTO' ? (
            <div className="space-y-1.5">
              <Label htmlFor="pct-propietario">Porcentaje para el propietario</Label>
              <Input
                id="pct-propietario"
                inputMode="decimal"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                placeholder="50"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Lo que le toque al propietario entra en su liquidación sin comisión, y contablemente es
            ingreso para terceros.
          </p>
        </fieldset>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} isLoading={guardando} data-testid="guardar-modalidad">
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
