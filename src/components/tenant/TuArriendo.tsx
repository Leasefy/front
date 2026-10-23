'use client';

/**
 * «Tu arriendo»: lo primero del Inicio de quien ya arrienda.
 *
 * QA de agentes 17-10 (Nico, «Inicio de arrendatario»): con un contrato
 * vigente, el Inicio le decía «Todavía no te has postulado» y le ofrecía
 * «Propiedades para ti». Ahora arriba va su arriendo. La cuenta es la de
 * `vistaDeTuArriendo` (la misma de «Pagos» y «Mi arriendo»).
 *
 * GLOW UP (22-10, revisora r24 #1 y #5): LA RESPUESTA en una cifra
 * (`CifraHeroe`) con el botón que la paga al lado —antes un «Pagar» sin cifra
 * debajo de dos bloques—, sin la caja de ícono en voltaje ni la negrilla. El
 * botón dice qué paga («Pagar lo vencido» / «Pagar la próxima cuota») y no el
 * monto: la cuota en línea puede sumar intereses de mora y no calzar con el
 * vencido del estado de cuenta.
 *
 * Mientras carga no afirma nada; si la lectura falla lo dice con reintento.
 */

import Link from 'next/link';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
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
        className="rounded-lg border border-border bg-surface p-5 sm:p-6"
        data-testid="tu-arriendo-cargando"
      >
        <div className="h-4 w-48 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-6 h-3 w-28 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-3 h-10 w-56 animate-pulse rounded-md bg-surface-muted" />
        <div className="mt-6 h-9 w-44 animate-pulse rounded-full bg-surface-muted" />
      </section>
    );
  }

  if (!estado.doc) {
    if (estado.fallo) {
      return (
        <FalloDeCarga
          error={estado.fallo}
          queEs={es ? 'tu estado de cuenta' : 'your account statement'}
          onReintentar={estado.reintentar}
        />
      );
    }
    // Defensivo: sin documento todavía, la salida a sus pagos (nunca un Inicio en blanco).
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-5 sm:p-6" data-testid="tu-arriendo-sin-documento">
        <p className="text-body-sm text-fg-muted">
          {es ? 'Lo que debes y cómo pagarlo está en Pagos.' : 'What you owe and how to pay it is in Payments.'}
        </p>
        <Button asChild size="sm" variant="secondary" hideArrow>
          <Link href="/inquilino/pagos">{es ? 'Ver mis pagos' : 'View my payments'}</Link>
        </Button>
      </section>
    );
  }

  const v = vistaDeTuArriendo(estado.doc, hoy, titulos);
  const cuandoVence = (fecha: string, cuantas: number) =>
    es
      ? `Vence el ${fechaLarga(fecha)}${cuantas > 1 ? ` · ${contar(cuantas, 'cuota')} ese día` : ''}`
      : `Due ${fechaLarga(fecha)}${cuantas > 1 ? ` · ${cuantas} that day` : ''}`;

  const pagar =
    v.vencido || v.proximo ? (
      <Button asChild size="sm" hideArrow data-testid="tu-arriendo-pagar">
        <Link href="/inquilino/pagos">
          {/* Revisora r24: el botón dice cuánto paga (el monto y el botón juntos). */}
          {v.vencido
            ? es ? `Pagar lo vencido · ${formatCurrency(v.vencido.valor)}` : `Pay what is overdue · ${formatCurrency(v.vencido.valor)}`
            : v.proximo
              ? es ? `Pagar la próxima cuota · ${formatCurrency(v.proximo.valor)}` : `Pay the next installment · ${formatCurrency(v.proximo.valor)}`
              : null}
        </Link>
      </Button>
    ) : null;

  return (
    <section className="rounded-lg border border-border bg-surface" data-testid="tu-arriendo">
      {/* De qué arriendo se habla, en un renglón; el detalle en «Mi arriendo». */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-faint px-5 py-3 sm:px-6">
        <ul className="min-w-0 space-y-0.5" data-testid="tu-arriendo-inmuebles" aria-label={es ? 'Tu arriendo' : 'Your rental'}>
          {v.inmuebles.map((i) => (
            <li key={i.contratoId} className="text-body-sm text-fg-muted">
              <span className="text-fg">{i.titulo}</span>
              {i.direccion ? <span> · {i.direccion}</span> : null}
            </li>
          ))}
        </ul>
        <Link href="/inquilino/arriendo" className="text-body-sm font-medium text-fg underline underline-offset-4 hover:text-primary">
          {es ? 'Ver mi arriendo' : 'View my rental'}
        </Link>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <Presence show={Boolean(v.vencido)} initial={false} distance="xs">
            {v.vencido ? (
              <div data-testid="tu-arriendo-vencido" data-en-mora={v.vencido.enMora ? 'si' : 'no'}>
                <CifraHeroe
                  rotulo={
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${v.vencido.enMora ? 'bg-error-500' : 'bg-warning-500'}`}
                        aria-hidden="true"
                      />
                      {v.vencido.enMora ? (es ? 'Vencido, en mora' : 'Overdue, in arrears') : es ? 'Vencido, en plazo' : 'Overdue, within the grace period'}
                    </span>
                  }
                  cifra={formatCurrency(v.vencido.valor)}
                  contexto={
                    es
                      ? `${contar(v.vencido.cuotas, 'cuota')}; la más vieja venció el ${fechaLarga(v.vencido.desde)}. ${
                          v.vencido.enMora
                            ? `Lleva ${contar(v.vencido.diasDeMora, 'día')} de mora.`
                            : 'Todavía estás dentro del plazo de pago.'
                        }`
                      : `${v.vencido.cuotas} overdue; the oldest was due on ${fechaLarga(v.vencido.desde)}.`
                  }
                  pie={
                    v.proximo ? (
                      <span data-testid="tu-arriendo-proximo">
                        {es ? 'Próxima cuota, ' : 'Next installment, '}
                        <span className="font-mono tabular-nums text-fg">{formatCurrency(v.proximo.valor)}</span>
                        {'. '}
                        {cuandoVence(v.proximo.fecha, v.proximo.cuantas)}.
                      </span>
                    ) : null
                  }
                />
              </div>
            ) : null}
          </Presence>

          {!v.vencido && v.proximo ? (
            <div data-testid="tu-arriendo-proximo">
              <CifraHeroe
                rotulo={es ? 'Próximo pago' : 'Next payment'}
                cifra={formatCurrency(v.proximo.valor)}
                contexto={cuandoVence(v.proximo.fecha, v.proximo.cuantas)}
              />
            </div>
          ) : null}

          {v.alDia ? (
            <div className="flex flex-wrap items-center gap-3" data-testid="tu-arriendo-al-dia">
              <StatusBadge tone="success">{es ? 'Al día' : 'Up to date'}</StatusBadge>
              <p className="text-body text-fg">
                {es ? 'Estás al día: no tienes pagos pendientes.' : 'You are up to date: nothing pending.'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 [&>*]:max-sm:flex-1">
          <Button asChild size="sm" variant="secondary" hideArrow>
            <Link href="/inquilino/estado-de-cuenta">{es ? 'Ver estado de cuenta' : 'View account statement'}</Link>
          </Button>
          {pagar}
        </div>
      </div>
    </section>
  );
}
