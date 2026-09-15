'use client';

/**
 * «¿Te podemos arrendar este inmueble?» — la tarjeta de la ficha pública.
 *
 * Nico, 2026-09-14: como la calculadora de hipoteca de los portales, pero para
 * arrendar. Con dos datos (su ingreso y, si tiene, el de su codeudor) la persona
 * sabe al instante si le alcanza para ESTE canon; lo importante para ella es
 * «¿lo puedo arrendar o no?». Después, «Verificar con Fianly» lanza el estudio
 * real ya prellenado con el canon, la ciudad y el tipo del inmueble.
 *
 * Es un estimado (ver `estimado-de-arriendo.ts`): no consulta centrales ni
 * aseguradoras, y lo dice.
 */

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { formatCurrency } from '@/lib/format';
import type { PropertyType } from '@/lib/types/property';
import {
  MULTIPLO_INGRESO_CANON,
  enlaceAlEstudio,
  estimarArriendo,
} from '@/lib/aprobacion/estimado-de-arriendo';

interface TePodemosArrendarProps {
  canon: number;
  ciudad?: string | null;
  tipo?: PropertyType | null;
  className?: string;
}

const multiplo = MULTIPLO_INGRESO_CANON.toLocaleString('es-CO');

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-fg-muted">{etiqueta}</span>
      <span className={`font-mono tabular-nums ${fuerte ? 'font-semibold text-fg' : 'text-fg'}`}>{valor}</span>
    </div>
  );
}

export function TePodemosArrendar({ canon, ciudad, tipo, className }: TePodemosArrendarProps) {
  const [ingreso, setIngreso] = useState('');
  const [ingresoCodeudor, setIngresoCodeudor] = useState('');

  const estimado = estimarArriendo({
    canon,
    ingreso: Number(ingreso) || 0,
    ingresoCodeudor: Number(ingresoCodeudor) || 0,
  });

  return (
    <section
      aria-labelledby="te-podemos-arrendar-titulo"
      data-testid="te-podemos-arrendar"
      className={`rounded-lg border border-border bg-surface p-6 shadow-sm ${className ?? ''}`}
    >
      <h2 id="te-podemos-arrendar-titulo" className="text-xl font-heading font-semibold text-fg text-balance">
        ¿Te podemos arrendar este inmueble?
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Con tu ingreso te decimos al instante si te alcanza para este canon.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpa-ingreso" className="text-sm font-medium text-fg">
              Tu ingreso mensual
            </label>
            <MoneyInput id="tpa-ingreso" value={ingreso} onChange={setIngreso} placeholder="4.500.000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tpa-codeudor" className="text-sm font-medium text-fg">
              Ingreso de tu codeudor <span className="font-normal text-fg-muted">(opcional)</span>
            </label>
            <MoneyInput
              id="tpa-codeudor"
              value={ingresoCodeudor}
              onChange={setIngresoCodeudor}
              placeholder="0"
            />
          </div>
        </div>

        <div role="status" aria-live="polite" className="flex flex-col gap-4 rounded-lg bg-surface-muted p-5">
          {estimado === null ? (
            <div data-testid="estimado-vacio" className="flex flex-col gap-1">
              <p className="text-sm font-medium text-fg">Escribe tu ingreso</p>
              <p className="text-sm text-fg-muted">
                Te mostramos si alcanza para el canon de{' '}
                <span className="font-mono tabular-nums">{formatCurrency(canon)}</span>.
              </p>
            </div>
          ) : estimado.alcanza ? (
            <div data-testid="estimado-alcanza" className="flex items-start gap-2 rounded-md bg-success-soft p-3">
              <CheckCircle weight="fill" className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
              <div>
                <p className="text-sm font-semibold text-success">Te alcanza para este inmueble</p>
                <p className="mt-0.5 text-sm text-fg-muted">El siguiente paso es el estudio con Fianly.</p>
              </div>
            </div>
          ) : (
            <div data-testid="estimado-no-alcanza" className="flex items-start gap-2 rounded-md bg-warning-soft p-3">
              <WarningCircle weight="fill" className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-warning">Con ese ingreso no te alcanza</p>
                <p data-testid="estimado-faltante" className="mt-0.5 text-sm text-fg-muted">
                  Te faltan <span className="font-mono tabular-nums">{formatCurrency(estimado.faltante)}</span> de
                  ingreso al mes. Un codeudor puede sumar el suyo.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Fila etiqueta="Canon del inmueble" valor={formatCurrency(canon)} />
            {estimado && (
              <>
                <Fila etiqueta="Ingreso que cuenta" valor={formatCurrency(estimado.ingresoTotal)} />
                <Fila etiqueta="Canon que podrías pagar" valor={formatCurrency(estimado.canonMaximo)} fuerte />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5 md:flex-row md:items-center md:justify-between">
        <p className="text-caption text-fg-muted md:max-w-[46ch]">
          Es un estimado: las aseguradoras piden un ingreso de al menos {multiplo} veces el canon. La aprobación
          real sale del estudio con Fianly, que revisa tu historial.
        </p>
        <Button asChild className="md:flex-shrink-0">
          <Link href={enlaceAlEstudio({ canon, ciudad, tipo })} data-testid="verificar-con-fianly">
            Verificar con Fianly
          </Link>
        </Button>
      </div>
    </section>
  );
}
