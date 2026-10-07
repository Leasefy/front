'use client';

/**
 * «Cómo pagar» — los medios que la inmobiliaria del inquilino decidió
 * mostrarle. El número de cuenta llega tapado desde el back (últimos cuatro);
 * acá no hay nada que destapar. Si no hay medios, no se pinta nada: un bloque
 * vacío que dice «no hay cómo pagar» es peor que ninguno.
 */

import { useState } from 'react';
import { ArrowSquareOut, Bank, Check, Copy, DeviceMobile, DotsThree, Link as LinkIcon, Money, Wallet } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { useMediosDePagoParaInquilino } from '@/lib/hooks/use-medios-de-pago';
import type { MedioDePagoParaInquilino, TipoDeMedioDePago } from '@/lib/api/medios-de-pago.types';

const ICONO: Record<TipoDeMedioDePago, typeof Bank> = {
  TRANSFERENCIA: Bank,
  EFECTIVO: Money,
  PSE: Wallet,
  NEQUI: DeviceMobile,
  DAVIPLATA: DeviceMobile,
  ENLACE_DE_PAGO: LinkIcon,
  OTRO: DotsThree,
};

function tipoDeCuentaLegible(t: string | null): string | null {
  if (!t) return null;
  if (t === 'AHORROS') return 'Ahorros';
  if (t === 'CORRIENTE') return 'Corriente';
  return t;
}

export function MediosDePagoDeLaInmobiliaria() {
  const { bloques, cargando } = useMediosDePagoParaInquilino();
  const conMedios = bloques.filter((b) => b.medios.length > 0);

  // Llega después que el resto de «Pagos» (su propia consulta): se abre con su
  // altura en vez de empujar de golpe lo de abajo. Si ya estaba, se pinta quieto.
  return (
    <Collapse open={!cargando && conMedios.length > 0}>
    <section aria-labelledby="como-pagar" className="mb-8 space-y-4" data-testid="como-pagar">
      <div>
        <h2 id="como-pagar" className="text-xl font-semibold text-fg">
          Cómo pagar
        </h2>
        <p className="text-sm text-fg-muted">
          Los medios que acepta tu inmobiliaria. Paga con TU REFERENCIA DE RECAUDO: el banco nos avisa y tu recibo sale solo.
        </p>
      </div>
      {conMedios.map((bloque) => (
        <div key={bloque.agencyId} className="space-y-3">
          {conMedios.length > 1 && (
            <p className="font-mono text-xs uppercase tracking-wide text-fg-muted">{bloque.agencyName}</p>
          )}
          {(bloque.referencias ?? []).length > 0 && (
            <dl className="flex flex-wrap gap-x-6 gap-y-2" data-testid="referencias-de-recaudo">
              {(bloque.referencias ?? []).map((r) => (
                <div key={r.contractId} className="flex items-baseline gap-2">
                  <dt className="text-sm text-fg-muted">
                    Tu referencia de recaudo{(bloque.referencias ?? []).length > 1 && r.inmueble ? ` · ${r.inmueble}` : ''}
                  </dt>
                  <dd className="font-mono text-base font-semibold tabular-nums text-fg">{r.referencia}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {bloque.medios.map((medio) => (
              <TarjetaDeMedio key={medio.id} medio={medio} referencias={bloque.referencias ?? []} />
            ))}
          </ul>
        </div>
      ))}
    </section>
    </Collapse>
  );
}

function TarjetaDeMedio({
  medio,
  referencias = [],
}: {
  medio: MedioDePagoParaInquilino;
  referencias?: { referencia: string }[];
}) {
  const Icono = ICONO[medio.tipo] ?? DotsThree;
  const [copiado, setCopiado] = useState(false);
  const numero = medio.numeroDeCuentaEnmascarado;

  const copiar = async () => {
    // Se copia el resumen legible; el número completo no está en el cliente.
    // QA-INQ-95 (PI-11): con la referencia de recaudo, que es con lo que el banco reconoce el pago.
    const conReferencia = referencias.length ? `Referencia: ${referencias.map((r) => r.referencia).join(' / ')}` : null;
    const texto = [medio.nombre, medio.banco, tipoDeCuentaLegible(medio.tipoDeCuenta), numero, medio.titular, conReferencia]
      .filter(Boolean)
      .join(' · ');
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: no hay nada que hacer, el texto está a la vista.
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4" data-testid={`medio-inquilino-${medio.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
          <Icono className="h-5 w-5 text-fg-muted" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-fg">{medio.nombre}</p>
          <p className="text-xs font-mono uppercase tracking-wide text-fg-muted">{medio.tipoLegible}</p>
          {(medio.banco || medio.tipoDeCuenta || numero || medio.titular) && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {medio.banco && (
                <>
                  <dt className="text-fg-muted">Banco</dt>
                  <dd className="text-fg">{medio.banco}</dd>
                </>
              )}
              {medio.tipoDeCuenta && (
                <>
                  <dt className="text-fg-muted">Cuenta</dt>
                  <dd className="text-fg">{tipoDeCuentaLegible(medio.tipoDeCuenta)}</dd>
                </>
              )}
              {numero && (
                <>
                  <dt className="text-fg-muted">{medio.tipo === 'NEQUI' || medio.tipo === 'DAVIPLATA' ? 'Celular' : 'Número'}</dt>
                  <dd className="font-mono tabular-nums text-fg">{numero}</dd>
                </>
              )}
              {medio.titular && (
                <>
                  <dt className="text-fg-muted">Titular</dt>
                  <dd className="text-fg">{medio.titular}</dd>
                </>
              )}
            </dl>
          )}
          {medio.instrucciones && <p className="text-sm text-fg-muted">{medio.instrucciones}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {medio.enlace && (
          <Button asChild size="sm" hideArrow>
            <a href={medio.enlace} target="_blank" rel="noopener noreferrer">
              Pagar por el enlace
              <ArrowSquareOut className="ml-1 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        )}
        {(numero || medio.banco) && (
          <Button variant="secondary" size="sm" hideArrow onClick={() => void copiar()}>
            {copiado ? <Check className="mr-1 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-1 h-4 w-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar datos'}
          </Button>
        )}
      </div>
    </li>
  );
}
