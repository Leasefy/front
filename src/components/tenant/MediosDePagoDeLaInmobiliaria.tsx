'use client';

/**
 * «Cómo pagar» — los medios que la inmobiliaria del inquilino decidió
 * mostrarle. El número de cuenta llega tapado desde el back (últimos cuatro);
 * acá no hay nada que destapar. Si no hay medios, no se pinta nada: un bloque
 * vacío que dice «no hay cómo pagar» es peor que ninguno.
 */

import { useState } from 'react';
import { ArrowSquareOut, Bank, Check, Copy, DeviceMobile, DotsThree, Link as LinkIcon, Money, Wallet } from '@phosphor-icons/react';
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
  if (cargando || conMedios.length === 0) return null;

  return (
    <section aria-labelledby="como-pagar" className="mb-8 space-y-4" data-testid="como-pagar">
      <div>
        <h2 id="como-pagar" className="text-xl font-semibold text-fg">
          Cómo pagar
        </h2>
        <p className="text-sm text-fg-muted">
          Los medios que acepta tu inmobiliaria. Guardá el comprobante: con él se emite tu recibo.
        </p>
      </div>
      {conMedios.map((bloque) => (
        <div key={bloque.agencyId} className="space-y-3">
          {conMedios.length > 1 && (
            <p className="font-mono text-xs uppercase tracking-wide text-fg-muted">{bloque.agencyName}</p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {bloque.medios.map((medio) => (
              <TarjetaDeMedio key={medio.id} medio={medio} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function TarjetaDeMedio({ medio }: { medio: MedioDePagoParaInquilino }) {
  const Icono = ICONO[medio.tipo] ?? DotsThree;
  const [copiado, setCopiado] = useState(false);
  const numero = medio.numeroDeCuentaEnmascarado;

  const copiar = async () => {
    // Se copia el resumen legible; el número completo no está en el cliente.
    const texto = [medio.nombre, medio.banco, tipoDeCuentaLegible(medio.tipoDeCuenta), numero, medio.titular]
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
