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
 *
 * Portofino 29-10-2026 («esas facturas llegan con un corte atrasado»): las fechas son el CORTE (el período de
 * consumo), no el mes de la factura; el mes en que se facturó va aparte y es opcional (sin él se estima el siguiente
 * al corte). El mes facturado no puede ser anterior al corte: la misma regla y la misma frase del back.
 */

import { useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Check } from '@phosphor-icons/react';
import { Presence, RadioCard, RadioCardGroup } from '@leasefy/cadence';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import { CampoDeFecha } from '@/components/facturacion/CampoDeFecha';
import { CampoDeMes } from '@/components/ui/campo-de-mes';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { ZonaDeArchivo } from '@/components/migracion/ZonaDeArchivo';
import { TarjetaDeArchivo } from '@/components/migracion/TarjetaDeArchivo';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { diasEntre, mesSiguiente, nombreDelMesCorto } from '@/lib/servicios-publicos/corte-de-la-factura';
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

/** La frase del back cuando el mes facturado es anterior al corte. */
export const MES_ANTES_DEL_CORTE = 'La factura no se cobra antes de que termine el consumo: revisa el mes o el corte.';

/** Por qué no sirve el mes facturado, o `null` (vacío sirve: es opcional). */
export function problemaDelMesFacturado(mes: string, hasta: string): string | null {
  if (!mes) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return 'Escribe el mes de la factura como AAAA-MM.';
  if (hasta && mes < hasta.slice(0, 7)) return MES_ANTES_DEL_CORTE;
  return null;
}

/** `null` = le falta algo para poder mandarla. */
function armar(e: Estado): FacturaQueSeRegistra | null {
  const valor = Number(e.valor);
  if (e.servicios.length === 0 || !e.desde || !e.hasta || !(valor > 0)) return null;
  if (problemaDelMesFacturado(e.mesFacturado, e.hasta)) return null;
  if (e.tipo === 'ENTRADA' && !e.pagadaPor) return null;
  return {
    tipo: e.tipo,
    // Varios en una factura (Portofino 28-10): el primero va como `servicio` (así lo lee un back anterior).
    servicio: e.servicios[0],
    servicios: e.servicios.length > 1 ? e.servicios : undefined,
    empresa: e.empresa,
    periodoDesde: e.desde,
    periodoHasta: e.hasta,
    mesFacturado: e.mesFacturado || undefined,
    valorCop: valor,
    pagadaPor: e.tipo === 'ENTRADA' ? (e.pagadaPor ?? undefined) : undefined,
    entrega: e.tipo === 'ENTRADA' ? e.entrega || undefined : undefined,
    devolucion: e.tipo === 'SALIDA' ? e.devolucion || undefined : undefined,
    pagarConLaGarantia: e.tipo === 'SALIDA' ? e.conLaGarantia : undefined,
    nota: e.nota,
    soporte: e.archivo,
  };
}

const conMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

interface Estado {
  tipo: TipoDeFactura;
  /** Los que trae la factura, en el orden en que se marcaron (una de EPM trae energía, agua, gas y aseo). */
  servicios: Servicio[];
  empresa: string;
  /** El CORTE: primer y último día del consumo. */
  desde: string;
  hasta: string;
  /** `AAAA-MM`, opcional. */
  mesFacturado: string;
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
    servicios: [],
    empresa: '',
    desde: '',
    hasta: '',
    mesFacturado: '',
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
  const alternarServicio = (s: Servicio) =>
    setE((x) => ({ ...x, servicios: x.servicios.includes(s) ? x.servicios.filter((y) => y !== s) : [...x.servicios, s] }));

  const [mesTocado, setMesTocado] = useState(false);
  const datos = useMemo(() => armar(e), [e]);
  // El error del mes sale cuando la persona lo eligió (o lo dice el back), no mientras escribe el corte.
  const errorDelMes = errores.mesFacturado ?? (mesTocado ? (problemaDelMesFacturado(e.mesFacturado, e.hasta) ?? undefined) : undefined);
  const dias = e.desde && e.hasta && e.hasta >= e.desde ? diasEntre(e.desde, e.hasta) : null;
  const corte =
    dias !== null
      ? `${dias === 1 ? '1 día' : `${dias} días`} de consumo: cuenta para ${nombreDelMesCorto(e.hasta.slice(0, 7), true)}.`
      : null;
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
        <fieldset className="space-y-2 sm:col-span-2" aria-describedby={errores.servicio ? 'factura-servicio-error' : 'factura-servicio-pista'}>
          <legend className="text-body-sm text-fg">
            Servicios que trae la factura <span className="text-danger" aria-hidden="true">*</span>
          </legend>
          <div className="flex flex-wrap gap-2" data-testid="factura-servicio">
            {SERVICIOS.map((s) => {
              const marcado = e.servicios.includes(s.valor);
              return (
                <button
                  key={s.valor}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => alternarServicio(s.valor)}
                  data-testid={`factura-servicio-${s.valor}`}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    marcado ? 'border-primary bg-primary-soft text-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
                  )}
                >
                  {marcado ? <Check className="h-3.5 w-3.5 text-primary" weight="bold" aria-hidden="true" /> : null}
                  {s.rotulo}
                </button>
              );
            })}
          </div>
          <ErrorDelCampo
            id="factura-servicio-error"
            mensaje={errores.servicio}
            pista="Marca todos los que vienen en la misma factura (en una de EPM: energía, acueducto, gas y aseo) y escribe el valor total."
          />
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="factura-desde" required>
            Corte desde (período de consumo)
          </Label>
          <CampoDeFecha id="factura-desde" value={e.desde} onChange={(v) => cambiar('desde', v)} invalido={!!errores.periodoDesde} testid="factura-desde" />
          <ErrorDelCampo id="factura-desde-error" mensaje={errores.periodoDesde} pista="El primer día del consumo que cobra la factura." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-hasta" required>
            Corte hasta (período de consumo)
          </Label>
          <CampoDeFecha id="factura-hasta" value={e.hasta} onChange={(v) => cambiar('hasta', v)} invalido={!!errores.periodoHasta} testid="factura-hasta" />
          <ErrorDelCampo id="factura-hasta-error" mensaje={errores.periodoHasta} pista={corte ?? 'El último día del consumo.'} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-mes-facturado">Mes en que se facturó</Label>
          <div className="flex items-center gap-2">
            <CampoDeMes
              id="factura-mes-facturado"
              value={e.mesFacturado}
              onChange={(v) => {
                setMesTocado(true);
                cambiar('mesFacturado', v);
              }}
              invalido={!!errorDelMes}
              describedBy="factura-mes-facturado-error"
              placeholder={e.hasta ? `${conMayuscula(nombreDelMesCorto(mesSiguiente(e.hasta.slice(0, 7)), true))} (estimado)` : 'Opcional'}
              testid="factura-mes-facturado"
            />
            {e.mesFacturado && (
              <button
                type="button"
                onClick={() => cambiar('mesFacturado', '')}
                className="shrink-0 rounded-sm px-1 text-body-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="quitar-mes-facturado"
              >
                Quitar
              </button>
            )}
          </div>
          <ErrorDelCampo
            id="factura-mes-facturado-error"
            mensaje={errorDelMes}
            pista="Opcional: el que dice la factura. Sin él, el siguiente al corte."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="factura-valor" required>
            Valor total de la factura
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
