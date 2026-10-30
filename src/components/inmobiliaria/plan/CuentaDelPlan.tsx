'use client';

import { precioDelMes, type CotizacionDelPlan } from '@/lib/conversion/acceso';
import type { TarifasDeLeasefy } from '@/lib/api/tarifas.service';
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
export function renglonesDeLaCuenta(cotizacion: CotizacionDelPlan, tarifas: TarifasDeLeasefy['tarifas'] | null): RenglonDeLaCuenta[] {
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
          ? `${n === 1 ? 'Tu inmueble gestionado' : `Tus ${numero(n)} inmuebles gestionados`} × ${precioDelMes(plan.porInmueble)} no llegan al mínimo: hasta ${numero(hasta)} inmuebles pagas ${precioDelMes(plan.minimoMensual)}`
          : `Cada inmueble que gestiones suma ${precioDelMes(plan.porInmueble)}; hasta ${numero(hasta)} pagas el mínimo`,
      valor: d.plan,
    });
  } else {
    renglones.push({
      id: 'plan',
      que: `${numero(n)} ${n === 1 ? 'inmueble gestionado' : 'inmuebles gestionados'}`,
      detalle: plan ? `${precioDelMes(plan.porInmueble)} cada uno al mes` : null,
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
        plan ? `${precioDelMes(plan.usuarioAdicional)} cada uno al mes` : null,
      ]
        .filter(Boolean)
        .join('; '),
      valor: d.usuariosAdicionales,
    });
  } else {
    renglones.push({
      id: 'usuarios',
      que: incluidos !== null ? `${numero(incluidos)} usuarios` : 'Tus usuarios',
      detalle: `${cotizacion.usuarios === 1 ? 'Tienes 1' : `Tienes ${numero(cotizacion.usuarios)}`}${plan ? `; cada uno de más, ${precioDelMes(plan.usuarioAdicional)} al mes` : ''}`,
      valor: 0,
    });
  }

  if (d.conPilotoAutomatico && d.piloto > 0) {
    renglones.push({
      id: 'piloto',
      que: 'Piloto automático',
      detalle: tarifas ? `${numero(n)} × ${precioDelMes(tarifas.pilotoAutomatico.porInmueble)} por inmueble al mes, con el director` : null,
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

/** La cuenta del mes, línea por línea, con el total (antes de IVA). */
export function CuentaDelPlan({
  cotizacion,
  tarifas,
  className,
}: {
  cotizacion: CotizacionDelPlan;
  tarifas: TarifasDeLeasefy['tarifas'] | null;
  className?: string;
}) {
  const renglones = renglonesDeLaCuenta(cotizacion, tarifas);
  if (renglones.length === 0) return null;
  return (
    <dl className={cn('divide-y divide-border-faint rounded-lg border border-border-faint bg-bg/60', className)} data-testid="cuenta-del-plan">
      {renglones.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-4 px-4 py-3" data-testid={`cuenta-${r.id}`}>
          <dt className="min-w-0">
            <span className="block text-body-sm text-fg">{r.que}</span>
            {r.detalle ? <span className="mt-0.5 block text-caption text-fg-muted">{r.detalle}</span> : null}
          </dt>
          <dd className={cn('shrink-0 font-mono text-body-sm tabular-nums', r.valor > 0 ? 'text-fg' : 'text-fg-subtle')}>
            {r.valor > 0 ? precioDelMes(r.valor) : 'Incluido'}
          </dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 px-4 py-3" data-testid="cuenta-total">
        <dt className="text-body-sm text-fg-muted">Total al mes, antes de IVA</dt>
        <dd className="shrink-0 font-mono text-body-sm tabular-nums text-fg">{precioDelMes(cotizacion.monto)}</dd>
      </div>
    </dl>
  );
}
