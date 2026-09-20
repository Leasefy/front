'use client';

/**
 * 🔴 D11 (17-09-2026): «¿Quién paga?» en el recibo de caja.
 *
 * Normalmente paga el cliente. Cuando una ASEGURADORA paga un siniestro, el
 * recibo lleva a la aseguradora como pagador: se imputa igual a las cuotas del
 * inquilino (quedan pagadas para la inmobiliaria y el propietario), pero en su
 * estado de cuenta la deuda sale «subrogada a la aseguradora», y en
 * contabilidad el tercero de la plata que entró es la aseguradora.
 *
 * La plata de la aseguradora no queda como anticipo ni como saldo a favor del
 * inquilino: eso lo dice el back (400) y lo dice esta ayuda.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { aseguradorasApi, type Aseguradora } from '@/lib/api/aseguradoras.service';

export type QuienPagaValor =
  | { tipo: 'CLIENTE' }
  | { tipo: 'ASEGURADORA'; aseguradoraId: string | null; siniestroReferencia: string };

export const PAGA_EL_CLIENTE: QuienPagaValor = { tipo: 'CLIENTE' };

/** El `pagador` del cuerpo del recibo, o nada si paga el cliente. */
export function pagadorParaElBack(
  valor: QuienPagaValor,
): { tipo: 'ASEGURADORA'; aseguradoraId: string; siniestroReferencia?: string } | undefined {
  if (valor.tipo !== 'ASEGURADORA' || !valor.aseguradoraId) return undefined;
  const siniestro = valor.siniestroReferencia.trim();
  return {
    tipo: 'ASEGURADORA',
    aseguradoraId: valor.aseguradoraId,
    ...(siniestro ? { siniestroReferencia: siniestro } : {}),
  };
}

/** ¿Falta algo para poder emitir? Con aseguradora, hay que elegir cuál. */
export function faltaElPagador(valor: QuienPagaValor): boolean {
  return valor.tipo === 'ASEGURADORA' && !valor.aseguradoraId;
}

interface Props {
  valor: QuienPagaValor;
  onChange: (valor: QuienPagaValor) => void;
}

export function QuienPaga({ valor, onChange }: Props) {
  const [aseguradoras, setAseguradoras] = useState<Aseguradora[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conAseguradora = valor.tipo === 'ASEGURADORA';

  useEffect(() => {
    if (!conAseguradora || aseguradoras !== null) return;
    let vivo = true;
    aseguradorasApi
      .listar()
      .then((lista) => {
        if (vivo) setAseguradoras(lista.filter((a) => a.activa));
      })
      .catch((e: unknown) => {
        if (vivo) setError(e instanceof Error ? e.message : 'No se pudieron leer las aseguradoras.');
      });
    return () => {
      vivo = false;
    };
  }, [conAseguradora, aseguradoras]);

  return (
    <div className="space-y-2" data-testid="quien-paga">
      <span className="text-sm font-medium text-foreground">¿Quién paga?</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(PAGA_EL_CLIENTE)}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            !conAseguradora ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
          }`}
          data-testid="paga-cliente"
        >
          El cliente
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ tipo: 'ASEGURADORA', aseguradoraId: null, siniestroReferencia: '' })
          }
          className={`rounded-md border px-3 py-1.5 text-sm ${
            conAseguradora ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
          }`}
          data-testid="paga-aseguradora"
        >
          Una aseguradora (siniestro)
        </button>
      </div>

      {valor.tipo === 'ASEGURADORA' && (
        <div className="space-y-2 rounded-md border border-border bg-surface-muted p-3">
          <p className="text-xs text-fg-muted">
            Se abona a las cuotas del inquilino y quedan pagadas para la inmobiliaria y el propietario. En su
            estado de cuenta esa deuda sale «subrogada a la aseguradora». No queda saldo a favor ni anticipo.
          </p>
          {error ? (
            <p className="text-xs text-destructive" data-testid="aseguradoras-error">
              {error}
            </p>
          ) : aseguradoras === null ? (
            <p className="text-xs text-fg-muted">Cargando aseguradoras…</p>
          ) : aseguradoras.length === 0 ? (
            <p className="text-xs text-fg-muted" data-testid="sin-aseguradoras">
              No hay aseguradoras registradas.{' '}
              <Link className="underline" href="/panel/inmobiliaria/pagos/recaudo/aseguradoras">
                Registrar una
              </Link>
            </p>
          ) : (
            <select
              className="w-full rounded-md border border-border bg-surface p-2 text-sm"
              value={valor.aseguradoraId ?? ''}
              onChange={(e) => onChange({ ...valor, aseguradoraId: e.target.value || null })}
              data-testid="elegir-aseguradora"
              aria-label="Aseguradora que paga"
            >
              <option value="">Elige la aseguradora</option>
              {aseguradoras.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} · NIT {a.nit}
                </option>
              ))}
            </select>
          )}
          <input
            className="w-full rounded-md border border-border bg-surface p-2 text-sm"
            placeholder="Número del siniestro (opcional)"
            value={valor.siniestroReferencia}
            maxLength={120}
            onChange={(e) => onChange({ ...valor, siniestroReferencia: e.target.value })}
            data-testid="siniestro-referencia"
          />
        </div>
      )}
    </div>
  );
}
