'use client';

import { Presence } from '@leasefy/cadence';

import { useMonedaDeReferencia } from '@/components/precios/MonedaDeReferencia';
import { precioDelMes, type CotizacionDelPlan } from '@/lib/conversion/acceso';
import type { TarifasDeLeasefy } from '@/lib/api/tarifas.service';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import type { FormatoDePlata } from '@/lib/precios/moneda-de-referencia';
import { cn } from '@/lib/utils';

const numero = (n: number) => n.toLocaleString('es-CO');

export interface RenglonDeLaCuenta {
  id: 'plan' | 'usuarios' | 'piloto' | 'preguntas';
  que: string;
  /** De dónde sale el valor, en una línea. */
  detalle: string | null;
  /** COP al mes antes de IVA; 0 = incluido en el plan. */
  valor: number;
}

/**
 * Las líneas de la cuenta del mes (Nico, 30-10-2026: «cobramos por inmueble gestionado y con todas sus condiciones»).
 * Los valores salen de la cotización del back (la MISMA cuenta del cobro, `desglose`); las tarifas sólo ponen el precio
 * por unidad en las frases. Sin desglose (precio fijo de un plan) no hay líneas.
 */
export function renglonesDeLaCuenta(
  cotizacion: CotizacionDelPlan,
  tarifas: TarifasDeLeasefy['tarifas'] | null,
  plata: FormatoDePlata = precioDelMes,
): RenglonDeLaCuenta[] {
  const d = cotizacion.desglose;
  if (!d) return [];
  const plan = tarifas?.plan ?? null;
  const n = cotizacion.inmuebles;
  const renglones: RenglonDeLaCuenta[] = [];

  const pagaElMinimo = plan ? n * plan.porInmueble < plan.minimoMensual : false;
  if (plan && pagaElMinimo) {
    const hasta = Math.floor(plan.minimoMensual / plan.porInmueble);
    renglones.push({
      id: 'plan',
      que: 'El mínimo del plan',
      detalle:
        n > 0
          ? `${n === 1 ? 'Tu inmueble activo' : `Tus ${numero(n)} inmuebles activos`} × ${plata(plan.porInmueble)} no llegan al mínimo: hasta ${numero(hasta)} inmuebles pagas ${plata(plan.minimoMensual)}`
          : `Cada inmueble que gestiones suma ${plata(plan.porInmueble)}; hasta ${numero(hasta)} pagas el mínimo`,
      valor: d.plan,
    });
  } else {
    renglones.push({
      id: 'plan',
      que: `${numero(n)} ${n === 1 ? 'inmueble activo' : 'inmuebles activos'}`,
      detalle: plan ? `${plata(plan.porInmueble)} cada uno al mes` : null,
      valor: d.plan,
    });
  }

  const incluidos = plan?.usuariosIncluidos ?? null;
  if (d.usuariosDeMas > 0) {
    renglones.push({
      id: 'usuarios',
      que: `${numero(d.usuariosDeMas)} ${d.usuariosDeMas === 1 ? 'usuario de más' : 'usuarios de más'}`,
      detalle: [
        incluidos !== null ? `Tienes ${numero(cotizacion.usuarios)} y el plan trae ${numero(incluidos)}` : null,
        plan ? `${plata(plan.usuarioAdicional)} cada uno al mes` : null,
      ]
        .filter(Boolean)
        .join('; '),
      valor: d.usuariosAdicionales,
    });
  } else {
    renglones.push({
      id: 'usuarios',
      que: incluidos !== null ? `${numero(incluidos)} usuarios` : 'Tus usuarios',
      detalle: `${cotizacion.usuarios === 1 ? 'Tienes 1' : `Tienes ${numero(cotizacion.usuarios)}`}${plan ? `; cada uno de más, ${plata(plan.usuarioAdicional)} al mes` : ''}`,
      valor: 0,
    });
  }

  if (d.conPilotoAutomatico && d.piloto > 0) {
    renglones.push({
      id: 'piloto',
      que: 'Piloto automático',
      detalle: tarifas ? `${numero(n)} × ${plata(tarifas.pilotoAutomatico.porInmueble)} por inmueble al mes, con el director` : null,
      valor: d.piloto,
    });
  }

  if (plan) {
    renglones.push({
      id: 'preguntas',
      que: `${numero(plan.preguntasIncluidas)} preguntas al chat cada mes`,
      detalle: 'Para todo tu equipo; se reinician cada mes',
      valor: 0,
    });
  }
  return renglones;
}

/**
 * Qué cuenta como activo (Nico, 31-10-2026): mandato vigente, sin borradores; y cada inmueble se cobra por cada mes en
 * que estuvo activo aunque sea un día. La frase va debajo de la cuenta para que nadie se sorprenda en la renovación.
 */
export const REGLA_DE_LOS_ACTIVOS =
  'Se cobra cada inmueble con mandato vigente (los borradores no), por cada mes en que estuvo activo aunque sea un día.';

/** Lo que el periodo en curso suma para la próxima renovación, en una frase. `null` si no hay nada. */
export function fraseDeLoPorSumar(cotizacion: CotizacionDelPlan, plata: FormatoDePlata = precioDelMes): string | null {
  const p = cotizacion.porSumarEnLaRenovacion;
  if (!p || p.inmuebles <= 0) return null;
  const uno = p.inmuebles === 1;
  const cuantos = uno ? '1 inmueble que estuvo activo' : `${numero(p.inmuebles)} inmuebles que estuvieron activos`;
  const valor = p.valor > 0 ? `: ${plata(p.valor)} más` : ': con ellos sigues en el mínimo, así que no suman nada';
  return `En tu próxima renovación se suma${uno ? '' : 'n'} ${cuantos} después del ${fechaLarga(p.desde)} sin estarlo ese día${valor}.`;
}

/** La cuenta del mes, línea por línea, con el total (antes de IVA), la regla de los activos y lo que va sumando. */
export function CuentaDelPlan({
  cotizacion,
  tarifas,
  className,
}: {
  cotizacion: CotizacionDelPlan;
  tarifas: TarifasDeLeasefy['tarifas'] | null;
  className?: string;
}) {
  const { formato } = useMonedaDeReferencia();
  const renglones = renglonesDeLaCuenta(cotizacion, tarifas, formato);
  if (renglones.length === 0) return null;
  const porSumar = fraseDeLoPorSumar(cotizacion, formato);
  return (
    <div className={className}>
      <dl className="divide-y divide-border-faint rounded-lg border border-border-faint bg-bg/60" data-testid="cuenta-del-plan">
        {renglones.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-4 px-4 py-3" data-testid={`cuenta-${r.id}`}>
            <dt className="min-w-0">
              <span className="block text-body-sm text-fg">{r.que}</span>
              {r.detalle ? <span className="mt-0.5 block text-caption text-fg-muted">{r.detalle}</span> : null}
            </dt>
            <dd className={cn('shrink-0 font-mono text-body-sm tabular-nums', r.valor > 0 ? 'text-fg' : 'text-fg-subtle')}>
              {r.valor > 0 ? formato(r.valor) : 'Incluido'}
            </dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 px-4 py-3" data-testid="cuenta-total">
          <dt className="text-body-sm text-fg-muted">Total al mes, antes de IVA</dt>
          <dd className="shrink-0 font-mono text-body-sm tabular-nums text-fg">{formato(cotizacion.monto)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-caption text-fg-muted" data-testid="cuenta-regla-de-los-activos">
        {REGLA_DE_LOS_ACTIVOS}
      </p>
      <Presence show={porSumar !== null}>
        <p className="mt-1 text-caption text-fg" data-testid="cuenta-por-sumar">
          {porSumar}
        </p>
      </Presence>
    </div>
  );
}
