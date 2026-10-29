'use client';

/**
 * LA LIQUIDACIÓN DE ENTRADA como la hoja de Portofino (reunión del 29-10-2026): la factura cuyo CORTE cruza la
 * entrega del inmueble se parte por días entre el ANTERIOR (el propietario o el inquilino anterior) y el NUEVO.
 * Su ejemplo: factura de octubre = consumo del 15 ago al 15 sep (32 días) por $ 115.260; el anterior hasta el 7 sep
 * → $ 86.445, el nuevo desde el 8 sep → $ 28.815.
 *
 * Desde una factura registrada parte de sus datos (y de la entrega del contrato); sin factura es el SIMULADOR. Los
 * cuatro datos se ven y se cambian de una: cambiarlos no toca la factura (el back no escribe nada aquí).
 */

import { useEffect, useMemo, useState } from 'react';
import { Presence } from '@leasefy/cadence';

import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { formatCurrency } from '@/lib/format';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { diaCorto, diasEntre, nombreDelMesCorto } from '@/lib/servicios-publicos/corte-de-la-factura';
import {
  serviciosPublicosApi,
  type FacturaDeServicio,
  type LiquidacionDeEntradaEnHoja,
} from '@/lib/api/servicios-publicos.service';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface Props {
  /** La factura registrada que se parte (sin ella, el simulador). */
  factura?: Pick<FacturaDeServicio, 'id' | 'periodoDesde' | 'periodoHasta' | 'valorCop'> | null;
  /** El día en que el inquilino nuevo recibió el inmueble (por defecto, el inicio del contrato). */
  entrega?: string | null;
  'data-testid'?: string;
}

interface Datos {
  desde: string;
  hasta: string;
  valor: string;
  entrega: string;
}

/** Lo que falta para poder partirla, o `null`. */
function loQueFalta(d: Datos): string | null {
  if (!FECHA.test(d.desde) || !FECHA.test(d.hasta)) return 'Escribe el corte de la factura: desde y hasta.';
  if (d.hasta < d.desde) return 'El corte termina antes de empezar.';
  if (!(Number(d.valor) > 0)) return 'Escribe el valor de la factura.';
  if (!FECHA.test(d.entrega)) return 'Escribe el día en que el inquilino nuevo recibió el inmueble.';
  return null;
}

export function LiquidacionDeEntrada({ factura, entrega, 'data-testid': testId }: Props) {
  const inicial: Datos = useMemo(
    () => ({
      desde: factura?.periodoDesde.slice(0, 10) ?? '',
      hasta: factura?.periodoHasta.slice(0, 10) ?? '',
      valor: factura ? String(factura.valorCop) : '',
      entrega: entrega?.slice(0, 10) ?? '',
    }),
    [factura, entrega],
  );
  const [d, setD] = useState<Datos>(inicial);
  const [hoja, setHoja] = useState<LiquidacionDeEntradaEnHoja | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);
  const cambiar = <K extends keyof Datos>(k: K, v: Datos[K]) => setD((x) => ({ ...x, [k]: v }));
  const falta = loQueFalta(d);
  // Con los datos de la factura tal cual se pide la de la factura (el back pone la entrega del contrato si falta).
  const esLaDeLaFactura = !!factura && d.desde === inicial.desde && d.hasta === inicial.hasta && d.valor === inicial.valor;

  useEffect(() => {
    setProblema(null);
    // Desde la factura se puede pedir sin la entrega: el back usa el inicio del contrato.
    if (!esLaDeLaFactura && falta) {
      setHoja(null);
      setCalculando(false);
      return;
    }
    let vigente = true;
    setCalculando(true);
    const t = setTimeout(() => {
      const pedir = esLaDeLaFactura
        ? serviciosPublicosApi.entradaDeLaFactura(factura!.id, FECHA.test(d.entrega) ? d.entrega : undefined)
        : serviciosPublicosApi.simularEntrada({ periodoDesde: d.desde, periodoHasta: d.hasta, valorCop: Number(d.valor), entrega: d.entrega });
      pedir
        .then((r) => vigente && setHoja(r))
        .catch((e) => {
          if (!vigente) return;
          setHoja(null);
          setProblema(mensajeParaLaPersona(e, { accion: 'partir la factura por días' }));
        })
        .finally(() => vigente && setCalculando(false));
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [d, esLaDeLaFactura, falta, factura]);

  // La entrega que usó el back (el inicio del contrato) se ve en el campo hasta que la persona la cambie.
  const entregaQueSeVe = d.entrega || (esLaDeLaFactura ? (hoja?.fechaEntrega ?? '') : '');
  const dias = FECHA.test(d.desde) && FECHA.test(d.hasta) && d.hasta >= d.desde ? diasEntre(d.desde, d.hasta) : null;

  return (
    <div className="space-y-5" data-testid={testId}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="entrada-desde">Corte desde (período de consumo)</Label>
          <CampoDeFecha id="entrada-desde" value={d.desde} onChange={(v) => cambiar('desde', v)} testid="entrada-desde" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entrada-hasta">Corte hasta</Label>
          <CampoDeFecha id="entrada-hasta" value={d.hasta} onChange={(v) => cambiar('hasta', v)} testid="entrada-hasta" />
          {dias !== null && (
            <p className="text-caption text-fg-muted">
              <span className="font-mono tabular-nums">{dias}</span> {dias === 1 ? 'día' : 'días'} de consumo
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entrada-valor">Valor de la factura</Label>
          <MoneyInput id="entrada-valor" value={d.valor} onChange={(v) => cambiar('valor', v)} data-testid="entrada-valor" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="entrada-entrega">El inquilino nuevo recibió el inmueble el</Label>
          <CampoDeFecha id="entrada-entrega" value={entregaQueSeVe} onChange={(v) => cambiar('entrega', v)} testid="entrada-entrega" />
          <ErrorDelCampo id="entrada-entrega-error" pista={factura ? 'Por defecto, el inicio del contrato.' : undefined} />
        </div>
      </div>
      {factura && !esLaDeLaFactura && (
        <p className="text-caption text-fg-muted" data-testid="entrada-es-simulacion">
          Estás simulando con otros datos: la factura registrada no cambia.
        </p>
      )}

      <div aria-live="polite" aria-busy={calculando}>
        {hoja ? (
          <HojaDeLaEntrada hoja={hoja} />
        ) : problema ? (
          <p className="rounded-md bg-danger-soft px-3 py-2 text-body-sm text-fg" data-testid="entrada-problema">
            {problema}
          </p>
        ) : (
          <p className="text-body-sm text-fg-muted">{calculando ? 'Partiendo la factura por días…' : (falta ?? '')}</p>
        )}
      </div>
    </div>
  );
}

/** La hoja: anterior vs nuevo, con días y valores, como el Excel de Portofino. */
export function HojaDeLaEntrada({ hoja }: { hoja: LiquidacionDeEntradaEnHoja }) {
  const filas = [
    { clave: 'anterior', quien: 'Anterior', detalle: 'El propietario o el inquilino anterior', ...hoja.anterior },
    { clave: 'nuevo', quien: 'Nuevo', detalle: 'El inquilino que llega', ...hoja.nuevo },
  ];
  const cruzaDeAnio = hoja.corteDesde.slice(0, 4) !== hoja.corteHasta.slice(0, 4);
  return (
    <Presence show initial={false} distance="xs">
      <section className="overflow-hidden rounded-lg border border-border" data-testid="hoja-de-la-entrada">
        <header className="space-y-1 border-b border-border bg-surface-muted px-4 py-3">
          <p className="text-label text-fg-subtle">Factura de {nombreDelMesCorto(hoja.mesFacturado, true)}</p>
          <p className="text-body-sm text-fg">
            Consumo del {diaCorto(hoja.corteDesde, cruzaDeAnio)} al {diaCorto(hoja.corteHasta, cruzaDeAnio)} ·{' '}
            <span className="font-mono tabular-nums">{hoja.diasDelCorte}</span> días ·{' '}
            <span className="font-mono tabular-nums">{formatCurrency(hoja.totalCop)}</span>
          </p>
        </header>
        <table className="w-full text-body-sm">
          <thead>
            <tr className="text-left">
              <th scope="col" className="px-4 py-2 text-label font-normal text-fg-subtle">Quién</th>
              <th scope="col" className="px-2 py-2 text-label font-normal text-fg-subtle">Del – al</th>
              <th scope="col" className="px-2 py-2 text-right text-label font-normal text-fg-subtle">Días</th>
              <th scope="col" className="px-4 py-2 text-right text-label font-normal text-fg-subtle">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-faint">
            {filas.map((f) => (
              <tr key={f.clave} data-testid={`entrada-${f.clave}`}>
                <td className="px-4 py-3 align-top">
                  <p className="text-fg">{f.quien}</p>
                  <p className="text-caption text-fg-muted">{f.detalle}</p>
                </td>
                <td className="px-2 py-3 align-top font-mono tabular-nums text-fg">
                  {f.dias > 0 ? `${diaCorto(f.desde)} – ${diaCorto(f.hasta)}` : '—'}
                </td>
                <td className="px-2 py-3 text-right align-top font-mono tabular-nums text-fg">{f.dias}</td>
                <td className="px-4 py-3 text-right align-top font-mono tabular-nums text-fg">{formatCurrency(f.valorCop)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <th scope="row" className="px-4 py-3 text-left font-normal text-fg-muted">
                Total
              </th>
              <td />
              <td className="px-2 py-3 text-right font-mono tabular-nums text-fg">{hoja.diasDelCorte}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-fg">{formatCurrency(hoja.totalCop)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="border-t border-border px-4 py-3 text-caption text-fg-muted">{hoja.frase}</p>
      </section>
    </Presence>
  );
}
