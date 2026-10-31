'use client';

import { useEffect, useState } from 'react';
import { Cifra, FranjaDeCifras, Ilustracion, Presence } from '@leasefy/cadence';

import { calificacionLeasefyApi, type CalificacionParaLaInmobiliaria } from '@/lib/api/calificacion-leasefy.service';
import { formatCurrency } from '@/lib/format';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';
import { LetraDeLaCalificacion, TarjetaDeCalificacion } from './TarjetaDeCalificacion';

/**
 * El buró completo del postulante en el cajón (Nico, 31-10-2026: «todo lo del buró completo»). Arriba lo que decide
 * —la letra, el veredicto y si el canon de ESTE inmueble le cabe—; después cómo le ha ido arrendando en Leasefy (los
 * meses, las cuotas a tiempo, el peor atraso, los contratos y cómo terminaron), su estudio de documentos y el
 * desglose de la calificación. Todo sale de `GET /inmobiliaria/calificacion-leasefy/postulaciones/:id`.
 */
export function BuroDelCandidato({ applicationId, canonDelInmueble }: { applicationId: string; canonDelInmueble?: number | null }) {
  const tr = useTr();
  const [r, setR] = useState<CalificacionParaLaInmobiliaria | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'sin-dato'>('cargando');

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    setR(null);
    calificacionLeasefyApi
      .deLaPostulacion(applicationId)
      .then((x) => {
        if (!vivo) return;
        setR(x.disponible ? x.resultado : null);
        setEstado(x.disponible && x.resultado ? 'listo' : 'sin-dato');
      })
      .catch(() => {
        if (vivo) setEstado('sin-dato');
      });
    return () => {
      vivo = false;
    };
  }, [applicationId]);

  if (estado === 'cargando') {
    return (
      <div className="space-y-3" aria-busy="true" data-testid="buro-cargando">
        <div className="h-20 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    );
  }

  if (!r) {
    return (
      <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-5" data-testid="buro-sin-dato">
        <Ilustracion nombre="lupa_estudio" tamano={64} className="shrink-0" />
        <div className="space-y-1">
          <p className="text-body-sm font-medium text-fg">{tr('Sin calificación de Leasefy')}</p>
          <p className="text-body-sm text-fg-muted">
            {tr('No autorizó usar su historial en Leasefy o todavía no hay datos para calificarlo. Puedes pedirle el estudio de documentos.')}
          </p>
        </div>
      </div>
    );
  }

  const c = r.calificacion;
  const h = r.historial;
  const canonMax = c.canonMaximoCop;
  const cabe = canonMax !== null && canonDelInmueble ? canonDelInmueble <= canonMax : null;

  return (
    <Presence show>
      <div className="space-y-4" data-testid="buro-del-candidato">
        {/* Lo que decide: la letra, el veredicto y el canon de este inmueble contra su tope. */}
        <section className="flex items-start gap-4 rounded-lg border border-border bg-card p-5" aria-label={tr('La calificación')}>
          <LetraDeLaCalificacion letra={c.letra} grande />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-caption uppercase tracking-[0.06em] text-fg-subtle">{tr('Calificación Leasefy')}</p>
            <p className="font-mono text-h3 tabular-nums text-fg">
              {c.puntaje ?? '—'}
              <span className="ml-0.5 text-body-sm text-fg-muted">/100</span>
            </p>
            {canonMax !== null ? (
              <p className={cn('text-body-sm', cabe === false ? 'text-warning-ink' : 'text-fg-muted')} data-testid="buro-canon">
                {cabe === null
                  ? tr('Le arriendan hasta {tope} al mes.', { tope: formatCurrency(canonMax) })
                  : cabe
                    ? tr('Este inmueble ({canon}) le cabe: su tope es {tope} al mes.', { canon: formatCurrency(canonDelInmueble!), tope: formatCurrency(canonMax) })
                    : tr('Este inmueble ({canon}) pasa su tope de {tope} al mes.', { canon: formatCurrency(canonDelInmueble!), tope: formatCurrency(canonMax) })}
              </p>
            ) : (
              <p className="text-body-sm text-fg-muted">{tr('Sin ingreso verificado: no se sabe hasta qué canon.')}</p>
            )}
          </div>
        </section>

        {/* Cómo le ha ido arrendando en Leasefy. */}
        {h.mesesObservados > 0 ? (
          <div className="space-y-2">
            <FranjaDeCifras aria-label={tr('Su historial en Leasefy')} data-testid="buro-historial">
              <Cifra etiqueta={tr('Arrendando en Leasefy')} valor={h.mesesObservados === 1 ? tr('1 mes') : tr('{n} meses', { n: h.mesesObservados })} />
              {h.porcentajeATiempo !== null ? (
                <Cifra
                  etiqueta={tr('Cuotas a tiempo')}
                  valor={`${Math.round(h.porcentajeATiempo)} %`}
                  detalle={tr(h.cuotasContadas === 1 ? 'de 1 cuota' : 'de {n} cuotas', { n: h.cuotasContadas })}
                  tono={h.porcentajeATiempo >= 90 ? 'exito' : h.porcentajeATiempo >= 70 ? undefined : 'aviso'}
                />
              ) : null}
              <Cifra
                etiqueta={tr('Contratos')}
                valor={h.contratos}
                detalle={tr(h.inmobiliarias === 1 ? 'con 1 inmobiliaria' : 'con {n} inmobiliarias', { n: h.inmobiliarias })}
              />
              {h.contratosTerminados > 0 ? (
                <Cifra
                  etiqueta={tr('Terminaron sin deuda')}
                  valor={`${h.terminaronSinDeuda} / ${h.contratosTerminados}`}
                  tono={h.terminaronSinDeuda < h.contratosTerminados ? 'aviso' : 'exito'}
                />
              ) : null}
            </FranjaDeCifras>
            {h.peorAtrasoDias24m !== null && h.peorAtrasoDias24m > 0 ? (
              <p className="text-caption text-fg-muted" data-testid="buro-peor-atraso">
                {tr(h.peorAtrasoDias24m === 1 ? 'Su peor atraso en los últimos 24 meses: 1 día.' : 'Su peor atraso en los últimos 24 meses: {n} días.', { n: h.peorAtrasoDias24m })}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-body-sm text-fg-muted" data-testid="buro-sin-historial">
            {tr('Sin historial en Leasefy todavía: la calificación sale de sus documentos.')}
          </p>
        )}

        {/* El estudio de documentos (cédula, extracto, nómina). */}
        <p className="text-body-sm text-fg-muted" data-testid="buro-documentos">
          {r.documentos.tieneEstudioVigente && r.documentos.estudioDel
            ? tr('Estudio de documentos del {dia}.', { dia: diaLegible(r.documentos.estudioDel) })
            : tr('Sin estudio de documentos vigente (de los últimos 6 meses).')}
        </p>

        {/* El desglose: qué pesó, las condiciones y por qué. */}
        <TarjetaDeCalificacion calificacion={c} className="p-4" compacta />

        <p className="text-caption text-fg-subtle">
          {r.alcance === 'TODO_LEASEFY'
            ? tr('Con todo su historial en Leasefy.')
            : tr('Sólo lo que pasó con tu inmobiliaria: no autorizó compartir su calificación.')}
        </p>
      </div>
    </Presence>
  );
}

function diaLegible(dia: string): string {
  const d = new Date(`${dia.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dia;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
