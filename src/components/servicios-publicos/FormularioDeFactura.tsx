'use client';

/**
 * La factura de un servicio público (Portofino, 22-10-2026). Lo usan la
 * inmobiliaria (cuatro tipos: del mes, de entrada, de salida y ajuste) y el
 * inquilino en su portal (la del mes y el ajuste de la empresa de servicios).
 *
 * Reglas de Nico: la de ENTRADA se parte por días según quién la pagó (se ve
 * la cuenta antes de guardar); la de SALIDA se paga con la garantía; el
 * AJUSTE («ajustes de conceptos facturados» de EPM) se le descuenta al
 * propietario.
 */

import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Presence, RadioCard, RadioCardGroup } from '@leasefy/cadence';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ZonaDeArchivo } from '@/components/migracion/ZonaDeArchivo';
import { TarjetaDeArchivo } from '@/components/migracion/TarjetaDeArchivo';
import { formatCurrency } from '@/lib/format';
import {
  SERVICIOS,
  type FacturaQueSeRegistra,
  type LiquidacionDeEntrada,
  type QuienPago,
  type Servicio,
  type TipoDeFactura,
} from '@/lib/api/servicios-publicos.service';

const TIPOS: Record<'inmobiliaria' | 'inquilino', ReadonlyArray<{ valor: TipoDeFactura; titulo: string; detalle: string }>> = {
  inmobiliaria: [
    { valor: 'MENSUAL', titulo: 'Factura del mes', detalle: 'Ya pagada: queda al día.' },
    { valor: 'ENTRADA', titulo: 'Primera factura (entrada)', detalle: 'Trae días del propietario y del inquilino: se parte por días.' },
    { valor: 'SALIDA', titulo: 'Última factura (salida)', detalle: 'La parte del inquilino se paga con su garantía.' },
    { valor: 'AJUSTE', titulo: 'Ajuste de la empresa', detalle: 'Conceptos facturados de antes: se le descuentan al propietario.' },
  ],
  inquilino: [
    { valor: 'MENSUAL', titulo: 'Factura del mes', detalle: 'La que ya pagaste.' },
    { valor: 'AJUSTE', titulo: 'Ajuste de la empresa', detalle: 'Conceptos de antes de tu llegada que te cobraron.' },
  ],
};

export interface ErroresDeLaFactura {
  [campo: string]: string | undefined;
}

interface Props {
  modo: 'inmobiliaria' | 'inquilino';
  /** El día de la entrega y de la devolución que propone el contrato. */
  entrega?: string | null;
  devolucion?: string | null;
  /** Lo que el servidor dijo de cada campo. */
  errores?: ErroresDeLaFactura;
  /** Sólo la inmobiliaria: la cuenta por días de la factura de entrada, antes de guardar. */
  revisarEntrada?: (d: Omit<FacturaQueSeRegistra, 'tipo' | 'soporte'>) => Promise<LiquidacionDeEntrada>;
  onCambio: (d: FacturaQueSeRegistra | null) => void;
}

/** `null` = le falta algo para poder mandarla. */
function armar(e: Estado): FacturaQueSeRegistra | null {
  const valor = Number(e.valor);
  if (!e.servicio || !e.desde || !e.hasta || !(valor > 0)) return null;
  if (e.tipo === 'ENTRADA' && !e.pagadaPor) return null;
  return {
    tipo: e.tipo,
    servicio: e.servicio,
    empresa: e.empresa,
    periodoDesde: e.desde,
    periodoHasta: e.hasta,
    valorCop: valor,
    pagadaPor: e.tipo === 'ENTRADA' ? (e.pagadaPor ?? undefined) : undefined,
    entrega: e.tipo === 'ENTRADA' ? e.entrega || undefined : undefined,
    devolucion: e.tipo === 'SALIDA' ? e.devolucion || undefined : undefined,
    pagarConLaGarantia: e.tipo === 'SALIDA' ? e.conLaGarantia : undefined,
    nota: e.nota,
    soporte: e.archivo,
  };
}

interface Estado {
  tipo: TipoDeFactura;
  servicio: Servicio | '';
  empresa: string;
  desde: string;
  hasta: string;
  valor: string;
  pagadaPor: QuienPago | null;
  entrega: string;
  devolucion: string;
  conLaGarantia: boolean;
  nota: string;
  archivo: File | null;
}

export function FormularioDeFactura({ modo, entrega, devolucion, errores = {}, revisarEntrada, onCambio }: Props) {
  const [e, setE] = useState<Estado>({
    tipo: 'MENSUAL',
    servicio: '',
    empresa: '',
    desde: '',
    hasta: '',
    valor: '',
    pagadaPor: null,
    entrega: entrega ?? '',
    devolucion: devolucion ?? '',
    conLaGarantia: true,
    nota: '',
    archivo: null,
  });
  const [cuenta, setCuenta] = useState<LiquidacionDeEntrada | null>(null);
  const [problemaDeLaCuenta, setProblemaDeLaCuenta] = useState<string | null>(null);
  const cambiar = <K extends keyof Estado>(k: K, v: Estado[K]) => setE((x) => ({ ...x, [k]: v }));

  const datos = useMemo(() => armar(e), [e]);
  useEffect(() => onCambio(datos), [datos, onCambio]);

  // La cuenta por días de la entrada se pide cuando el formulario la tiene completa.
  useEffect(() => {
    setCuenta(null);
    setProblemaDeLaCuenta(null);
    if (!revisarEntrada || !datos || datos.tipo !== 'ENTRADA') return;
    let vigente = true;
    const t = setTimeout(() => {
      const { soporte: _s, tipo: _t, ...resto } = datos;
      revisarEntrada(resto)
        .then((r) => vigente && setCuenta(r))
        .catch((err: { message?: string }) => vigente && setProblemaDeLaCuenta(err?.message ?? 'No se pudo partir la factura.'));
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [datos, revisarEntrada]);

  const zona = useDropzone({
    multiple: false,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxSize: 10 * 1024 * 1024,
    onDropAccepted: (a) => cambiar('archivo', a[0] ?? null),
  });

  const soporteObligatorio = modo === 'inquilino' || e.tipo === 'SALIDA';

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-body-sm text-fg">¿Qué factura es?</legend>
        <RadioCardGroup
          value={e.tipo}
          onValueChange={(v) => cambiar('tipo', v as TipoDeFactura)}
          className="grid gap-2 sm:grid-cols-2"
        >
          {TIPOS[modo].map((t) => (
            <RadioCard key={t.valor} value={t.valor} label={t.titulo} description={t.detalle} data-testid={`tipo-${t.valor}`} />
          ))}
        </RadioCardGroup>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="factura-servicio" required>
            Servicio
          </Label>
          <Select value={e.servicio} onValueChange={(v) => cambiar('servicio', v as Servicio)}>
            <SelectTrigger id="factura-servicio" aria-required="true" aria-invalid={!!errores.servicio} data-testid="factura-servicio">
              <SelectValue placeholder="Escoge el servicio" />
            </SelectTrigger>
            <SelectContent>
              {SERVICIOS.map((s) => (
                <SelectItem key={s.valor} value={s.valor}>
                  {s.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ErrorDelCampo id="factura-servicio-error" mensaje={errores.servicio} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-empresa">Empresa</Label>
          <Input
            id="factura-empresa"
            placeholder="EPM, Aguas de…"
            value={e.empresa}
            maxLength={120}
            onChange={(x) => cambiar('empresa', x.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-desde" required>
            Cobra desde
          </Label>
          <CampoDeFecha id="factura-desde" value={e.desde} onChange={(v) => cambiar('desde', v)} invalido={!!errores.periodoDesde} testid="factura-desde" />
          <ErrorDelCampo id="factura-desde-error" mensaje={errores.periodoDesde} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-hasta" required>
            Hasta
          </Label>
          <CampoDeFecha id="factura-hasta" value={e.hasta} onChange={(v) => cambiar('hasta', v)} invalido={!!errores.periodoHasta} testid="factura-hasta" />
          <ErrorDelCampo id="factura-hasta-error" mensaje={errores.periodoHasta} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-valor" required>
            Valor de la factura
          </Label>
          <MoneyInput
            id="factura-valor"
            value={e.valor}
            onChange={(v) => cambiar('valor', v)}
            aria-required="true"
            aria-invalid={!!errores.valorCop}
            data-testid="factura-valor"
          />
          <ErrorDelCampo id="factura-valor-error" mensaje={errores.valorCop} />
        </div>
      </div>

      <Presence show={e.tipo === 'ENTRADA'} distance="xs">
        {/* Glow up 23-10: lo de la entrada en arena, sin borde (el formulario vive en un cajón). */}
        <div className="space-y-4 rounded-xl bg-surface-muted p-4">
          <fieldset className="space-y-2">
            <legend className="text-body-sm text-fg">¿Quién la pagó?</legend>
            <RadioCardGroup
              value={e.pagadaPor ?? ''}
              onValueChange={(v) => cambiar('pagadaPor', v as QuienPago)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <RadioCard value="PROPIETARIO" label="El propietario" description="Al inquilino se le cobran sus días en la cuota." data-testid="pagada-por-PROPIETARIO" />
              <RadioCard value="INQUILINO" label="El inquilino" description="Al propietario se le descuentan sus días y quedan a favor del inquilino." data-testid="pagada-por-INQUILINO" />
            </RadioCardGroup>
          </fieldset>
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="factura-entrega">El inquilino recibió el inmueble el</Label>
            <CampoDeFecha id="factura-entrega" value={e.entrega} onChange={(v) => cambiar('entrega', v)} testid="factura-entrega" />
          </div>
          <Presence show={!!cuenta || !!problemaDeLaCuenta} distance="xs">
            {cuenta ? (
              <div className="space-y-1 text-body-sm" data-testid="cuenta-de-la-entrada">
                <p className="text-fg">{cuenta.frase}</p>
                <p className="text-fg-muted">
                  Propietario: <span className="font-mono tabular-nums">{cuenta.diasDelPropietario}</span> días ·{' '}
                  <span className="font-mono tabular-nums">{formatCurrency(cuenta.partePropietarioCop)}</span> — Inquilino:{' '}
                  <span className="font-mono tabular-nums">{cuenta.diasDelInquilino}</span> días ·{' '}
                  <span className="font-mono tabular-nums">{formatCurrency(cuenta.parteInquilinoCop)}</span>
                </p>
                <p className="text-fg">
                  Se mueven <span className="font-mono tabular-nums">{formatCurrency(cuenta.valorAMoverCop)}</span>{' '}
                  {cuenta.cobrarA === 'INQUILINO' ? 'en la próxima cuota del inquilino.' : 'del giro del propietario al inquilino.'}
                </p>
              </div>
            ) : (
              <p className="text-body-sm text-danger" data-testid="problema-de-la-entrada">
                {problemaDeLaCuenta}
              </p>
            )}
          </Presence>
        </div>
      </Presence>

      <Presence show={e.tipo === 'SALIDA'} distance="xs">
        <div className="space-y-3 rounded-xl bg-surface-muted p-4">
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="factura-devolucion">El inquilino devolvió el inmueble el</Label>
            <CampoDeFecha id="factura-devolucion" value={e.devolucion} onChange={(v) => cambiar('devolucion', v)} testid="factura-devolucion" />
          </div>
          <label className="flex items-start gap-3 text-body-sm text-fg">
            {/* La casilla de la casa (Cadence), no la del navegador. */}
            <Checkbox
              className="mt-0.5"
              checked={e.conLaGarantia}
              onCheckedChange={(v) => cambiar('conLaGarantia', v === true)}
              data-testid="pagar-con-la-garantia"
            />
            <span>
              Pagar ya la parte del inquilino con su garantía de servicios. Lo que sobre se le devuelve; lo que falte se le cobra
              al cierre.
            </span>
          </label>
        </div>
      </Presence>

      <div className="space-y-1.5">
        <Label required={soporteObligatorio}>{modo === 'inquilino' ? 'Foto o PDF de la factura pagada' : 'Soporte (foto o PDF)'}</Label>
        {e.archivo ? (
          <TarjetaDeArchivo
            nombre={e.archivo.name}
            peso={e.archivo.size}
            inputProps={zona.getInputProps()}
            onSubirOtro={zona.open}
            onDescartar={() => cambiar('archivo', null)}
            testid="factura-archivo"
          />
        ) : (
          <ZonaDeArchivo
            rootProps={zona.getRootProps()}
            inputProps={zona.getInputProps()}
            activo={zona.isDragActive}
            titulo="Suelta aquí la factura o haz clic para buscarla"
            detalle="PDF o foto, hasta 10 MB."
            testid="zona-de-la-factura"
          />
        )}
        <ErrorDelCampo id="factura-soporte-error" mensaje={errores.soporte} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="factura-nota">Nota</Label>
        <Input id="factura-nota" value={e.nota} maxLength={1000} onChange={(x) => cambiar('nota', x.target.value)} />
      </div>
    </div>
  );
}
