'use client';

/**
 * Los ajustes de la inmobiliaria para el ciclo de vida del contrato (Nico,
 * 17-09). Cada inmobiliaria elige; lo de Portofino va como sugerencia:
 *
 *   · D6 · cuántos días antes del aniversario aparece la carta del incremento
 *     en la bandeja (30 por defecto).
 *   · D9 · si los contratos pactan gastos de cobranza cuando el contrato no lo
 *     dice. Sin elegir, como hoy.
 *   · D10 · la garantía de servicios públicos del inquilino: si se exige al
 *     INICIO (al activar) o a la ENTREGA (antes de recibir el inmueble,
 *     Portofino), y su tope. Sin tope: aviso de validar con un abogado.
 */

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AgencyProfile, UpdateAgencyPayload } from '@/lib/types/inmobiliaria';

type TresEstados = 'SI' | 'NO' | 'SIN_ELEGIR';

function aTres(v: boolean | null | undefined): TresEstados {
  return v === true ? 'SI' : v === false ? 'NO' : 'SIN_ELEGIR';
}

export function ConfigCicloDeVidaDelContrato({
  agency,
  onSave,
  canEdit = true,
}: {
  agency: AgencyProfile;
  onSave?: (payload: UpdateAgencyPayload) => Promise<void> | void;
  canEdit?: boolean;
}) {
  const [dias, setDias] = useState(agency.diasAntesCartaIncremento != null ? String(agency.diasAntesCartaIncremento) : '');
  const [gastos, setGastos] = useState<TresEstados>(aTres(agency.pactaGastosDeCobranza));
  const [momento, setMomento] = useState<'INICIO' | 'ENTREGA' | ''>(agency.garantiaServiciosMomento ?? '');
  const [tope, setTope] = useState(agency.garantiaServiciosTopeCop != null ? String(agency.garantiaServiciosTopeCop) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDias(agency.diasAntesCartaIncremento != null ? String(agency.diasAntesCartaIncremento) : '');
    setGastos(aTres(agency.pactaGastosDeCobranza));
    setMomento(agency.garantiaServiciosMomento ?? '');
    setTope(agency.garantiaServiciosTopeCop != null ? String(agency.garantiaServiciosTopeCop) : '');
  }, [agency]);

  const guardar = async () => {
    const diasNum = dias.trim() === '' ? null : Number(dias);
    if (diasNum !== null && (!Number.isInteger(diasNum) || diasNum < 1 || diasNum > 120)) {
      setError('Los días antes de la carta van de 1 a 120.');
      return;
    }
    const topeNum = tope.trim() === '' ? null : Number(tope.replace(/\D/g, ''));
    if (topeNum !== null && (!Number.isInteger(topeNum) || topeNum <= 0)) {
      setError('El tope va en pesos, mayor que cero.');
      return;
    }
    setError(null);
    // Sólo lo que cambió: sin la migración aplicada, el back responde 503 a
    // estos campos, y no se le puede pedir que guarde lo que nadie tocó.
    const payload: UpdateAgencyPayload = {};
    const gastosNuevo = gastos === 'SIN_ELEGIR' ? null : gastos === 'SI';
    const momentoNuevo = momento === '' ? null : momento;
    if (diasNum !== (agency.diasAntesCartaIncremento ?? null)) payload.diasAntesCartaIncremento = diasNum;
    if (gastosNuevo !== (agency.pactaGastosDeCobranza ?? null)) payload.pactaGastosDeCobranza = gastosNuevo;
    if (momentoNuevo !== (agency.garantiaServiciosMomento ?? null)) payload.garantiaServiciosMomento = momentoNuevo;
    if (topeNum !== (agency.garantiaServiciosTopeCop ?? null)) payload.garantiaServiciosTopeCop = topeNum;
    if (Object.keys(payload).length === 0) return;
    setGuardando(true);
    try {
      await onSave?.(payload);
    } catch {
      // El padre ya avisó con el mensaje del back (p. ej. 503 sin migración).
    } finally {
      setGuardando(false);
    }
  };

  const deshabilitado = !canEdit || guardando;
  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-5"
      data-testid="config-ciclo-de-vida-del-contrato"
    >
      <div>
        <h3 className="text-sm font-medium">Ciclo de vida del contrato</h3>
        <p className="text-xs text-muted-foreground">
          Cómo trabaja tu inmobiliaria la carta del incremento, los gastos de cobranza y la garantía de servicios
          públicos. Cada contrato puede cambiar lo suyo.
        </p>
      </div>

      <label className="block text-xs" htmlFor="dias-antes-carta">
        Días antes del aniversario en que sale la carta del incremento
        <Input
          id="dias-antes-carta"
          inputMode="numeric"
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          placeholder="30"
          disabled={deshabilitado}
          className="mt-1 w-28"
          data-testid="dias-antes-carta"
        />
      </label>

      <fieldset className="space-y-1 text-xs" disabled={deshabilitado}>
        <legend>¿Tus contratos pactan gastos de cobranza?</legend>
        <p className="text-muted-foreground">
          Si el contrato no lo pacta, la regla de gastos de cobranza no se le cobra. Cada contrato lo puede decir.
        </p>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ['SI', 'Sí, por defecto'],
              ['NO', 'No, por defecto'],
              ['SIN_ELEGIR', 'Sin elegir (se cobran como hoy)'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <label key={valor} className="flex items-center gap-1">
              <input
                type="radio"
                name="gastos-pactados"
                checked={gastos === valor}
                onChange={() => setGastos(valor)}
                data-testid={`gastos-${valor}`}
              />
              {etiqueta}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2 text-xs" disabled={deshabilitado}>
        <legend>Garantía de servicios públicos del inquilino</legend>
        <p className="text-muted-foreground">
          Es plata del inquilino para las facturas de servicios que llegan después de entregar: se pagan con ella y se
          le devuelve el resto. Su valor es el promedio de las últimas facturas del inmueble.
        </p>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ['', 'No se exige'],
              ['INICIO', 'Al inicio (se exige al activar)'],
              ['ENTREGA', 'A la entrega (antes de recibir el inmueble)'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <label key={valor || 'no'} className="flex items-center gap-1">
              <input
                type="radio"
                name="garantia-momento"
                checked={momento === valor}
                onChange={() => setMomento(valor)}
                data-testid={`garantia-momento-${valor || 'NO'}`}
              />
              {etiqueta}
            </label>
          ))}
        </div>
        <label className="block" htmlFor="garantia-tope">
          Tope de la garantía (pesos)
          <Input
            id="garantia-tope"
            inputMode="numeric"
            value={tope}
            onChange={(e) => setTope(e.target.value)}
            placeholder="Sin tope"
            className="mt-1 w-40"
            data-testid="garantia-tope"
          />
        </label>
        {momento !== '' && tope.trim() === '' && (
          <p className="text-plan-status-yellow" data-testid="garantia-sin-tope">
            Sin tope, la garantía no tiene límite. Un abogado debe validar el tope legal (Ley 820 de 2003, art. 15, y
            Decreto 3130 de 2003).
          </p>
        )}
      </fieldset>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={deshabilitado} onClick={() => void guardar()}>
          Guardar
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </section>
  );
}
