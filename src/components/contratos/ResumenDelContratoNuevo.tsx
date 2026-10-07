'use client';

/**
 * El resumen de «Crear contrato» (QA-CONT C-22, Nico 03-10-2026: «¿por qué no
 * utilizas mejor el ancho de la página? … y mucha información en scroll»).
 *
 * En escritorio va a la derecha, debajo de los términos, y se queda fijo al
 * hacer scroll: mientras se elige el inmueble, se sube el PDF o se arma la
 * plantilla a la izquierda, el canon, las fechas, el primer canon y lo que
 * falta para poder crear están siempre a la vista, con el botón. A 390 px va al
 * final, en la misma columna.
 *
 * No calcula nada de negocio: recibe lo que la pantalla ya sabe. El primer
 * canon sale de `lib/contratos/primer-canon` (espejo de la regla del back, sólo
 * el canon) y la frase de cómo se cobra de `ritmoDePago`, la misma de la ficha.
 */

import type { ReactNode } from 'react';
import { AnimatedNumber, Presence } from '@leasefy/cadence';
import { WarningCircle } from '@phosphor-icons/react';
import { formatCurrency, formatDate } from '@/lib/format';
import type { PrimerCanon } from '@/lib/contratos/primer-canon';
import { cn } from '@/lib/utils';

export interface ResumenDelContratoNuevoProps {
  /** Título o dirección del inmueble; `null` = todavía no se eligió. */
  inmueble: string | null;
  /** Nombre del inquilino; `null` = todavía no se eligió. */
  inquilino: string | null;
  /** Cómo llega el documento: «PDF propio · contrato.pdf», «Plantilla de ley · armado»… */
  documento: string | null;
  canon: number | null;
  deposito: number | null;
  /** `YYYY-MM-DD`. */
  inicio: string;
  /** `YYYY-MM-DD`. */
  fin: string;
  /** Períodos mensuales entre inicio y fin (`0` = fechas incompletas). */
  meses: number;
  primerCanon: PrimerCanon | null;
  /** «Se genera el 1 de cada mes, sin días de plazo.» */
  comoSeCobra: string | null;
  /**
   * Lo que impide crear y no es un campo vacío (inventario, canon por
   * confirmar, inmueble ocupado), en una línea cada uno.
   */
  bloqueos: string[];
  /** «Para crearlo falta…», el error del envío y los botones. */
  children?: ReactNode;
  className?: string;
}

const SIN_ELEGIR = 'Sin elegir';

function Fila({ etiqueta, children, testId }: { etiqueta: string; children: ReactNode; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2" data-testid={testId}>
      <dt className="shrink-0 text-caption text-fg-muted">{etiqueta}</dt>
      <dd className="min-w-0 text-right text-body-sm text-fg">{children}</dd>
    </div>
  );
}

function Vacio() {
  return <span className="text-fg-subtle">{SIN_ELEGIR}</span>;
}

/** «12 meses», «1 mes». */
function meses(n: number): string {
  return `${n} ${n === 1 ? 'mes' : 'meses'}`;
}

export function ResumenDelContratoNuevo({
  inmueble,
  inquilino,
  documento,
  canon,
  deposito,
  inicio,
  fin,
  meses: cuantosMeses,
  primerCanon,
  comoSeCobra,
  bloqueos,
  children,
  className,
}: ResumenDelContratoNuevoProps) {
  return (
    <section
      aria-labelledby="resumen-del-contrato-titulo"
      className={cn('rounded-lg border border-border bg-card p-5 shadow-sm', className)}
      data-testid="resumen-del-contrato"
    >
      <h2 id="resumen-del-contrato-titulo" className="text-base font-semibold text-fg">
        Resumen
      </h2>

      <dl className="mt-2 divide-y divide-border-faint">
        <Fila etiqueta="Inmueble" testId="resumen-inmueble">
          {inmueble ? <span className="block truncate" title={inmueble}>{inmueble}</span> : <Vacio />}
        </Fila>
        <Fila etiqueta="Inquilino" testId="resumen-inquilino">
          {inquilino ? <span className="block truncate" title={inquilino}>{inquilino}</span> : <Vacio />}
        </Fila>
        <Fila etiqueta="Contrato" testId="resumen-documento">
          {documento ? <span className="block truncate" title={documento}>{documento}</span> : <Vacio />}
        </Fila>
        <Fila etiqueta="Canon" testId="resumen-canon">
          {canon && canon > 0 ? (
            <AnimatedNumber value={canon} format={(n) => formatCurrency(Math.round(n))} className="font-mono tabular-nums" />
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </Fila>
        {deposito && deposito > 0 ? (
          <Fila etiqueta="Depósito" testId="resumen-deposito">
            <span className="font-mono tabular-nums">{formatCurrency(deposito)}</span>
          </Fila>
        ) : null}
        <Fila etiqueta="Vigencia" testId="resumen-vigencia">
          {inicio && fin ? (
            <>
              <span className="whitespace-nowrap">{formatDate(inicio)}</span>
              <span className="text-fg-subtle"> → </span>
              <span className="whitespace-nowrap">{formatDate(fin)}</span>
              {cuantosMeses > 0 ? <span className="block text-caption text-fg-muted">{meses(cuantosMeses)}</span> : null}
            </>
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </Fila>
        <Fila etiqueta="Primer canon" testId="resumen-primer-canon">
          {primerCanon ? (
            <>
              <AnimatedNumber
                value={primerCanon.valor}
                format={(n) => formatCurrency(Math.round(n))}
                className="font-mono tabular-nums"
              />
              <span className="block text-caption text-fg-muted">
                {primerCanon.prorrateado
                  ? `Del ${formatDate(primerCanon.desde)} al ${formatDate(primerCanon.hasta)} · ${primerCanon.dias} de 30 días`
                  : `Vence el ${formatDate(primerCanon.desde)}`}
              </span>
            </>
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </Fila>
      </dl>

      {comoSeCobra ? (
        <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-caption text-fg-muted" data-testid="resumen-como-se-cobra">
          {comoSeCobra} El IVA, los conceptos y las retenciones se suman al generar cada cuota.
        </p>
      ) : null}

      {/* Lo que no deja crear, aunque el formulario esté completo. Entra y sale. */}
      <Presence show={bloqueos.length > 0} initial={false} distance="xs" className="mt-3" data-testid="resumen-bloqueos">
        <ul className="space-y-1.5">
          {bloqueos.map((b) => (
            <li key={b} className="flex items-start gap-2 text-caption text-warning">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-fg">{b}</span>
            </li>
          ))}
        </ul>
      </Presence>

      {children ? <div className="mt-4 space-y-3">{children}</div> : null}
    </section>
  );
}
