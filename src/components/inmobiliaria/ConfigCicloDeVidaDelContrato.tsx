'use client';

/**
 * Los ajustes de la inmobiliaria para el ciclo de vida del contrato (Nico,
 * 17-09). Cada inmobiliaria elige; lo de Portofino va como sugerencia:
 *
 *   · D6 · cuántos días antes del aniversario aparece la carta del incremento
 *     en la bandeja (30 por defecto).
 *   · D9 · si los contratos pactan gastos de cobranza cuando el contrato no lo
 *     dice. Sin elegir, como hoy. 🔴 Sugerido para una inmobiliaria que ya los
 *     pacta en todos sus contratos (Portofino): «sí, por defecto».
 *   · D10 · la garantía de servicios públicos del inquilino: si se exige al
 *     INICIO (al activar) o a la ENTREGA (antes de recibir el inmueble,
 *     Portofino), y sus dos topes: 🔴 el de PERÍODOS de facturación (2 por
 *     defecto, Nico 17-09) y el de pesos. Sin ninguno: aviso de validar con un
 *     abogado.
 *   · 🔴 Cuántos días vale el estudio aprobado del inquilino (60 por defecto).
 *   · 🔴 El seguro opcional como % del canon, por plan.
 */

import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@leasefy/cadence';

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
  const [periodos, setPeriodos] = useState(
    agency.garantiaServiciosTopePeriodos != null ? String(agency.garantiaServiciosTopePeriodos) : '',
  );
  const [vigencia, setVigencia] = useState(
    agency.vigenciaEstudioDias != null ? String(agency.vigenciaEstudioDias) : '',
  );
  const [pctBasico, setPctBasico] = useState(
    agency.seguroOpcionalPctPorPlan?.BASIC != null ? String(agency.seguroOpcionalPctPorPlan.BASIC) : '',
  );
  const [pctPremium, setPctPremium] = useState(
    agency.seguroOpcionalPctPorPlan?.PREMIUM != null ? String(agency.seguroOpcionalPctPorPlan.PREMIUM) : '',
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDias(agency.diasAntesCartaIncremento != null ? String(agency.diasAntesCartaIncremento) : '');
    setGastos(aTres(agency.pactaGastosDeCobranza));
    setMomento(agency.garantiaServiciosMomento ?? '');
    setTope(agency.garantiaServiciosTopeCop != null ? String(agency.garantiaServiciosTopeCop) : '');
    setPeriodos(
      agency.garantiaServiciosTopePeriodos != null ? String(agency.garantiaServiciosTopePeriodos) : '',
    );
    setVigencia(agency.vigenciaEstudioDias != null ? String(agency.vigenciaEstudioDias) : '');
    setPctBasico(
      agency.seguroOpcionalPctPorPlan?.BASIC != null ? String(agency.seguroOpcionalPctPorPlan.BASIC) : '',
    );
    setPctPremium(
      agency.seguroOpcionalPctPorPlan?.PREMIUM != null ? String(agency.seguroOpcionalPctPorPlan.PREMIUM) : '',
    );
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
    const periodosNum = periodos.trim() === '' ? null : Number(periodos);
    if (periodosNum !== null && (!Number.isInteger(periodosNum) || periodosNum < 1 || periodosNum > 12)) {
      setError('El tope en períodos va de 1 a 12.');
      return;
    }
    const vigenciaNum = vigencia.trim() === '' ? null : Number(vigencia);
    if (vigenciaNum !== null && (!Number.isInteger(vigenciaNum) || vigenciaNum < 1 || vigenciaNum > 730)) {
      setError('La vigencia del estudio va de 1 a 730 días.');
      return;
    }
    const pct = (texto: string): number | null => {
      const n = Number(texto.replace(',', '.'));
      return texto.trim() === '' || !Number.isFinite(n) ? null : n;
    };
    const pctB = pct(pctBasico);
    const pctP = pct(pctPremium);
    for (const p of [pctB, pctP]) {
      if (p !== null && !(p > 0 && p <= 100)) {
        setError('El porcentaje del seguro va entre 0 y 100.');
        return;
      }
    }
    const porPlan: Record<string, number> = {};
    if (pctB !== null) porPlan.BASIC = pctB;
    if (pctP !== null) porPlan.PREMIUM = pctP;
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
    if (periodosNum !== (agency.garantiaServiciosTopePeriodos ?? null)) {
      payload.garantiaServiciosTopePeriodos = periodosNum;
    }
    if (vigenciaNum !== (agency.vigenciaEstudioDias ?? null)) payload.vigenciaEstudioDias = vigenciaNum;
    const guardado = agency.seguroOpcionalPctPorPlan ?? {};
    if (JSON.stringify(porPlan) !== JSON.stringify(guardado)) {
      payload.seguroOpcionalPctPorPlan = porPlan;
    }
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
          Si el contrato no lo pacta, la regla de gastos de cobranza no se le cobra. Cada contrato lo puede decir.{' '}
          <strong>Sugerido: «sí, por defecto»</strong> si tus contratos ya los pactan — deja por escrito lo que hoy ya
          pasa («sin elegir» se comporta igual que «sí»), y a partir de ahí un contrato puede decir «no» y se respeta.
        </p>
        {/* Radios del sistema de diseño (21-09): el del navegador mide 13 px
            —«eso ni se ve»— y no trae los estados de foco de la casa. */}
        <RadioGroup
          className="flex flex-wrap gap-x-5 gap-y-2"
          value={gastos}
          onValueChange={(v) => setGastos(v as typeof gastos)}
        >
          {(
            [
              ['SI', 'Sí, por defecto'],
              ['NO', 'No, por defecto'],
              ['SIN_ELEGIR', 'Sin elegir (se cobran como hoy)'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <label
              key={valor}
              className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
            >
              <RadioGroupItem value={valor} data-testid={`gastos-${valor}`} />
              <span>{etiqueta}</span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-2 text-xs" disabled={deshabilitado}>
        <legend>Garantía de servicios públicos del inquilino</legend>
        <p className="text-muted-foreground">
          Es plata del inquilino para las facturas de servicios que llegan después de entregar: se pagan con ella y se
          le devuelve el resto. Su valor es el promedio de las últimas facturas del inmueble.
        </p>
        <RadioGroup
          className="flex flex-wrap gap-x-5 gap-y-2"
          value={momento}
          onValueChange={(v) => setMomento(v as typeof momento)}
        >
          {(
            [
              ['', 'No se exige'],
              ['INICIO', 'Al inicio (se exige al activar)'],
              ['ENTREGA', 'A la entrega (antes de recibir el inmueble)'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <label
              key={valor || 'no'}
              className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg"
            >
              <RadioGroupItem
                value={valor}
                data-testid={`garantia-momento-${valor || 'NO'}`}
              />
              <span>{etiqueta}</span>
            </label>
          ))}
        </RadioGroup>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block" htmlFor="garantia-tope-periodos">
            Tope, en períodos de facturación
            <Input
              id="garantia-tope-periodos"
              inputMode="numeric"
              value={periodos}
              onChange={(e) => setPeriodos(e.target.value)}
              placeholder="2"
              className="mt-1 w-24"
              data-testid="garantia-tope-periodos"
            />
          </label>
          <label className="block" htmlFor="garantia-tope">
            Tope en pesos (además del anterior)
            <Input
              id="garantia-tope"
              inputMode="numeric"
              value={tope}
              onChange={(e) => setTope(e.target.value)}
              placeholder="Sin tope en pesos"
              className="mt-1 w-40"
              data-testid="garantia-tope"
            />
          </label>
        </div>
        <p className="text-muted-foreground">
          El valor sugerido es el promedio mensual de los últimos 6 meses del inmueble. Con 2 períodos, la garantía no
          puede pasar de dos veces ese promedio. Manda el más bajo de los dos topes.
        </p>
        {momento !== '' && tope.trim() === '' && periodos.trim() === '' && (
          <p className="text-plan-status-yellow" data-testid="garantia-sin-tope">
            Sin tope en pesos y sin tope en períodos la garantía no tendría límite. Un abogado debe validar el tope
            legal (Ley 820 de 2003, art. 15, y Decreto 3130 de 2003).
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2 text-xs" disabled={deshabilitado}>
        <legend>Estudio del inquilino</legend>
        <p className="text-muted-foreground">
          Cuántos días le vale al solicitante el estudio aprobado para postularse a cualquier inmueble tuyo sin volver
          a pagarlo. Vacío = 60 días.
        </p>
        <label className="block" htmlFor="vigencia-estudio">
          Vigencia del estudio (días)
          <Input
            id="vigencia-estudio"
            inputMode="numeric"
            value={vigencia}
            onChange={(e) => setVigencia(e.target.value)}
            placeholder="60"
            className="mt-1 w-24"
            data-testid="vigencia-estudio"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-2 text-xs" disabled={deshabilitado}>
        <legend>Seguro opcional del inquilino</legend>
        <p className="text-muted-foreground">
          Es un porcentaje DEL CANON, no un valor fijo: así la prima sube con el canon. Lo paga el inquilino, sólo si
          lo acepta de forma expresa, y es plata de la aseguradora. Vacío = se cobra la prima fija del plan, como hasta
          hoy.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block" htmlFor="seguro-pct-basico">
            Plan básico (% del canon)
            <Input
              id="seguro-pct-basico"
              inputMode="decimal"
              value={pctBasico}
              onChange={(e) => setPctBasico(e.target.value)}
              placeholder="1.5"
              className="mt-1 w-24"
              data-testid="seguro-pct-BASIC"
            />
          </label>
          <label className="block" htmlFor="seguro-pct-premium">
            Plan premium (% del canon)
            <Input
              id="seguro-pct-premium"
              inputMode="decimal"
              value={pctPremium}
              onChange={(e) => setPctPremium(e.target.value)}
              placeholder="3"
              className="mt-1 w-24"
              data-testid="seguro-pct-PREMIUM"
            />
          </label>
        </div>
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
