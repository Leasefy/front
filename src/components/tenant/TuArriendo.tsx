'use client';

/**
 * «Tu arriendo»: lo primero del Inicio de quien ya arrienda.
 *
 * QA de agentes 17-10 (Nico, «Inicio de arrendatario»): con un contrato
 * vigente, el Inicio le decía «Todavía no te has postulado» y le ofrecía
 * «Propiedades para ti». Ahora arriba va su arriendo: lo vencido (si hay), el
 * próximo pago con «Pagar» y su estado de cuenta. La cuenta es la de
 * `vistaDeTuArriendo` (la misma de «Pagos» y «Mi arriendo»).
 *
 * Mientras carga no afirma nada; si la lectura falla lo dice con reintento.
 */

import Link from 'next/link';
import { Presence } from '@leasefy/cadence';
import { CheckCircle, House, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { useI18n } from '@/lib/i18n';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { contar } from '@/lib/texto/plural';
import { vistaDeTuArriendo } from '@/lib/inquilino/tu-arriendo';
import type { EstadoDeCuentaConEstado } from '@/lib/hooks/useResumenDelPortal';

export function TuArriendo({
  estado,
  hoy,
  titulos,
}: {
  estado: EstadoDeCuentaConEstado;
  /** `AAAA-MM-DD`, el día de hoy. */
  hoy: string;
  /** El título del inmueble de cada contrato (de su arriendo), si se sabe. */
  titulos: Readonly<Record<string, string>>;
}) {
  const { locale, formatCurrency } = useI18n();
  const es = locale === 'es';

  if (estado.cargando) {
    return (
      <section
        aria-busy="true"
        aria-label={es ? 'Tu arriendo' : 'Your rental'}
        className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-6"
        data-testid="tu-arriendo-cargando"
      >
        <div className="h-5 w-40 rounded-md bg-surface-muted dark:bg-border animate-pulse" />
        <div className="mt-4 h-8 w-56 rounded-md bg-surface-muted dark:bg-border animate-pulse" />
        <div className="mt-6 h-10 w-48 rounded-full bg-surface-muted dark:bg-border animate-pulse" />
      </section>
    );
  }

  if (!estado.doc) {
    return estado.fallo ? (
      <FalloDeCarga
        error={estado.fallo}
        queEs={es ? 'tu estado de cuenta' : 'your account statement'}
        onReintentar={estado.reintentar}
      />
    ) : null;
  }

  const v = vistaDeTuArriendo(estado.doc, hoy, titulos);
  const hayQuePagar = Boolean(v.vencido || v.proximo);

  return (
    <section
      className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-surface-muted p-6 space-y-5"
      data-testid="tu-arriendo"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
            <House className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-fg dark:text-white">
              {v.inmuebles.length > 1
                ? es
                  ? 'Tus arriendos'
                  : 'Your rentals'
                : es
                  ? 'Tu arriendo'
                  : 'Your rental'}
            </h2>
            <ul className="mt-0.5 space-y-0.5" data-testid="tu-arriendo-inmuebles">
              {v.inmuebles.map((i) => (
                <li key={i.contratoId} className="text-sm text-fg-muted dark:text-fg-subtle">
                  <span className="text-fg dark:text-white">{i.titulo}</span>
                  {i.direccion ? <span> · {i.direccion}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <Link
          href="/inquilino/arriendo"
          className="text-sm text-fg-muted dark:text-fg-subtle hover:text-fg dark:hover:text-white font-medium"
        >
          {es ? 'Ver mi arriendo' : 'View my rental'}
        </Link>
      </div>

      <Presence show={Boolean(v.vencido)} initial={false} distance="xs">
        {v.vencido ? (
          <div
            className={`rounded-md border border-border p-3 flex items-start gap-2 ${
              v.vencido.enMora ? 'bg-danger-soft' : 'bg-warning-soft'
            }`}
            data-testid="tu-arriendo-vencido"
            data-en-mora={v.vencido.enMora ? 'si' : 'no'}
          >
            <WarningCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${v.vencido.enMora ? 'text-danger' : 'text-warning'}`}
              aria-hidden="true"
            />
            <div>
              <p className={`text-sm font-medium ${v.vencido.enMora ? 'text-danger' : 'text-warning'}`}>
                {es ? 'Tienes ' : 'You have '}
                <span className="font-mono">{formatCurrency(v.vencido.valor)}</span>
                {es ? ' vencidos' : ' overdue'}
              </p>
              <p className="text-body-sm text-fg-muted mt-0.5">
                {es
                  ? `${contar(v.vencido.cuotas, 'cuota')}; la más vieja venció el ${fechaLarga(v.vencido.desde)}. ${
                      v.vencido.enMora
                        ? `Lleva ${contar(v.vencido.diasDeMora, 'día')} de mora.`
                        : 'Todavía estás dentro del plazo de pago.'
                    }`
                  : `${v.vencido.cuotas} overdue; the oldest was due on ${fechaLarga(v.vencido.desde)}.`}
              </p>
            </div>
          </div>
        ) : null}
      </Presence>

      {v.proximo ? (
        <div data-testid="tu-arriendo-proximo">
          <p className="text-label text-fg-muted dark:text-fg-subtle">{es ? 'Próximo pago' : 'Next payment'}</p>
          <p className="mt-1 text-3xl font-semibold font-mono text-fg dark:text-white">
            {formatCurrency(v.proximo.valor)}
          </p>
          <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
            {es ? `Vence el ${fechaLarga(v.proximo.fecha)}` : `Due ${fechaLarga(v.proximo.fecha)}`}
            {v.proximo.cuantas > 1 ? (es ? ` · ${contar(v.proximo.cuantas, 'cuota')} ese día` : ` · ${v.proximo.cuantas} that day`) : null}
          </p>
        </div>
      ) : null}

      {v.alDia ? (
        <div className="rounded-md border border-border bg-success-soft p-3 flex items-start gap-2" data-testid="tu-arriendo-al-dia">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm font-medium text-success">
            {es ? 'Estás al día: no tienes pagos pendientes.' : 'You are up to date: nothing pending.'}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {hayQuePagar ? (
          <Button asChild hideArrow data-testid="tu-arriendo-pagar">
            <Link href="/inquilino/pagos">{es ? 'Pagar' : 'Pay'}</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary" hideArrow>
          <Link href="/inquilino/estado-de-cuenta">{es ? 'Ver estado de cuenta' : 'View account statement'}</Link>
        </Button>
      </div>
    </section>
  );
}
