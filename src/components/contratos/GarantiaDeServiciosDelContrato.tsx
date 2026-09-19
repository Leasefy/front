'use client';

/**
 * D10 · GARANTÍA DE SERVICIOS PÚBLICOS del contrato (Nico, 17-09; Portofino la
 * llama «anticipo de servicios públicos»).
 *
 *   · Es plata del INQUILINO: se guarda para pagar las facturas de servicios
 *     que lleguen después de la entrega y se le devuelve el resto; si no
 *     alcanza, la diferencia se le cobra como concepto.
 *   · 🔴 El valor sugerido es el promedio mensual de los ÚLTIMOS 6 MESES y el
 *     tope por defecto son 2 PERÍODOS de facturación (Nico, 17-09).
 *   · El valor es el promedio de las últimas facturas (digitadas o el promedio
 *     directo) y siempre con soporte.
 *   · Cuándo se exige lo dice la inmobiliaria: al INICIO (antes de activar) o a
 *     la ENTREGA (antes de recibir el inmueble).
 *
 * Todas las cuentas las hace el back (`/contracts/:id/garantia-de-servicios`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AunNoDisponible } from './AunNoDisponible';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import {
  cicloDeVidaApi,
  type FacturaDeServicio,
  type GarantiaDeServicios,
  type TipoDeMovimientoDeGarantia,
} from '@/lib/api/ciclo-de-vida.service';
import { mensajeDelFallo } from '@/lib/contratos/fallo-de-accion';

const PESOS = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const NOMBRE_DEL_TIPO: Record<TipoDeMovimientoDeGarantia, string> = {
  RECAUDO: 'Recaudo al inquilino',
  PAGO_DE_SERVICIO: 'Pago de una factura de servicios',
  DEVOLUCION: 'Devolución al inquilino',
  COBRO_DE_DIFERENCIA: 'Cobro de la diferencia',
};

const NOMBRE_DEL_ESTADO: Record<NonNullable<GarantiaDeServicios['cuenta']>['estado'], string> = {
  POR_RECAUDAR: 'Por recaudar',
  RECAUDADA: 'Recaudada',
  CON_DIFERENCIA_POR_COBRAR: 'Con diferencia por cobrar',
  LIQUIDADA: 'Liquidada',
};

const soloDigitos = (v: string) => Number(v.replace(/\D/g, '')) || 0;

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * El MISMO promedio del back (`promedioDeLasFacturas`): se suman las facturas
 * del mismo período y se promedian los `meses` períodos MÁS RECIENTES.
 *
 * 🔴 Que sean los más recientes es la corrección del 17-09: con dos años de
 * facturas digitadas el promedio arrastraba tarifas viejas y la garantía
 * quedaba corta. `meses` llega del back (`mesesDelPromedio`, hoy 6) para que
 * las dos cuentas no se puedan separar.
 */
export function promedioMensual(
  facturas: FacturaDeServicio[],
  meses = 6,
): number | null {
  const porPeriodo = new Map<string, number>();
  for (const f of facturas) {
    if (!/^\d{4}-\d{2}$/.test(f.periodo) || !(f.valorCop > 0)) continue;
    porPeriodo.set(f.periodo, (porPeriodo.get(f.periodo) ?? 0) + f.valorCop);
  }
  if (porPeriodo.size === 0) return null;
  const ultimos = [...porPeriodo.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, Math.max(1, meses))
    .map(([, v]) => v);
  return Math.round(ultimos.reduce((s, v) => s + v, 0) / ultimos.length);
}

export function GarantiaDeServiciosDelContrato({
  contractId,
  puedeEditar,
}: {
  contractId: string;
  puedeEditar: boolean;
}) {
  const [datos, setDatos] = useState<GarantiaDeServicios | null>(null);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setDatos(await cicloDeVidaApi.garantiaDeServicios(contractId));
    } catch (e) {
      setError(e);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-card p-5" data-testid="garantia-de-servicios">
        <FalloDeCarga error={error} queEs="la garantía de servicios públicos" onReintentar={cargar} enmarcado={false} />
      </section>
    );
  }
  if (!datos) return null;
  // Sin momento configurado y sin garantía registrada, la inmobiliaria no la usa: no se muestra.
  if (datos.disponible && !datos.momento && !datos.garantia) return null;

  const abrirSoporte = async (movimientoId?: string) => {
    try {
      const { url } = await cicloDeVidaApi.soporteDeLaGarantia(contractId, movimientoId);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error('No se pudo abrir el soporte.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5" data-testid="garantia-de-servicios">
      <div>
        <h3 className="text-base font-semibold">Garantía de servicios públicos</h3>
        <p className="text-xs text-muted-foreground">
          Plata del inquilino para las facturas de servicios que lleguen después de la entrega. Se exige{' '}
          {datos.momento === 'INICIO'
            ? 'antes de activar el contrato'
            : datos.momento === 'ENTREGA'
              ? 'antes de recibir el inmueble'
              : 'según lo configure la inmobiliaria'}
          .
        </p>
      </div>

      {!datos.disponible && (
        <AunNoDisponible
          testId="garantia-sin-migracion"
          queNoSePuede="exigir ni registrar esta garantía"
          mientrasTanto="Al inquilino no se le pide, que es como está hoy."
        />
      )}

      {datos.pendiente && (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          data-testid="garantia-pendiente"
        >
          {datos.pendiente}
        </p>
      )}

      {datos.avisoDelTope && (
        <p className="text-xs text-plan-status-yellow" data-testid="garantia-aviso-del-tope">
          {datos.avisoDelTope}
        </p>
      )}

      {datos.garantia && datos.cuenta ? (
        <Cuenta datos={datos} onSoporte={abrirSoporte} />
      ) : (
        datos.disponible &&
        puedeEditar && (
          <RegistrarGarantia
            topeCop={datos.topeEfectivoCop ?? datos.topeCop}
            topePeriodos={datos.topePeriodos}
            mesesDelPromedio={datos.mesesDelPromedio}
            onRegistrar={async (body) => {
              try {
                setDatos(await cicloDeVidaApi.registrarGarantia(contractId, body));
                toast.success('Garantía registrada.');
                return true;
              } catch (e) {
                toast.error('No se pudo registrar la garantía.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
                return false;
              }
            }}
          />
        )
      )}

      {datos.garantia && datos.cuenta && datos.disponible && puedeEditar && (
        <NuevoMovimiento
          cuenta={datos.cuenta}
          onRegistrar={async (body) => {
            try {
              setDatos(await cicloDeVidaApi.movimientoDeGarantia(contractId, body));
              toast.success(
                body.tipo === 'COBRO_DE_DIFERENCIA'
                  ? 'Diferencia cargada al estado de cuenta del inquilino.'
                  : 'Movimiento registrado.',
              );
              return true;
            } catch (e) {
              toast.error('No se pudo registrar el movimiento.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
              return false;
            }
          }}
        />
      )}

      {datos.movimientos.length > 0 && (
        <Movimientos
          datos={datos}
          puedeEditar={puedeEditar && datos.disponible}
          onSoporte={abrirSoporte}
          onAnular={async (movimientoId, motivo) => {
            try {
              setDatos(await cicloDeVidaApi.anularMovimientoDeGarantia(contractId, movimientoId, motivo));
              toast.success('Movimiento anulado.');
            } catch (e) {
              toast.error('No se pudo anular.', { description: mensajeDelFallo(e, 'Intenta de nuevo.') });
            }
          }}
        />
      )}
    </section>
  );
}

function Cuenta({ datos, onSoporte }: { datos: GarantiaDeServicios; onSoporte: (id?: string) => void }) {
  const g = datos.garantia!;
  const c = datos.cuenta!;
  const filas: [string, number][] = [
    ['Valor de la garantía', c.valorCop],
    ['Recaudado', c.recaudadoCop],
    ['Pagado en servicios', c.pagadoCop],
    ['Devuelto', c.devueltoCop],
    ['Diferencia cobrada', c.cobradoCop],
  ];
  return (
    <div className="space-y-2 text-sm" data-testid="garantia-cuenta">
      <p>
        Estado: <strong data-testid="garantia-estado">{NOMBRE_DEL_ESTADO[c.estado]}</strong> · momento{' '}
        {g.momento === 'INICIO' ? 'al inicio' : 'a la entrega'}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium">{PESOS.format(v)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-muted-foreground">Saldo del inquilino</dt>
          <dd className="font-semibold" data-testid="garantia-saldo">
            {PESOS.format(c.saldoCop)}
          </dd>
        </div>
      </dl>
      {c.faltaPorRecaudarCop > 0 && (
        <p className="text-xs text-plan-status-yellow">Falta por recaudar {PESOS.format(c.faltaPorRecaudarCop)}.</p>
      )}
      {c.diferenciaPorCobrarCop > 0 && (
        <p className="text-xs text-destructive" data-testid="garantia-diferencia">
          Las facturas pagadas pasaron la garantía: falta cobrarle {PESOS.format(c.diferenciaPorCobrarCop)} al inquilino.
        </p>
      )}
      {g.facturas && g.facturas.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Calculada con {g.facturas.length} factura{g.facturas.length === 1 ? '' : 's'} digitada
          {g.facturas.length === 1 ? '' : 's'}.
        </p>
      )}
      {g.nota && <p className="text-xs text-muted-foreground">Nota: {g.nota}</p>}
      <Button size="sm" variant="ghost" onClick={() => onSoporte()}>
        Ver soporte ({g.soporteNombre})
      </Button>
    </div>
  );
}

function RegistrarGarantia({
  topeCop,
  topePeriodos,
  mesesDelPromedio,
  onRegistrar,
}: {
  topeCop: number | null;
  /** 🔴 El tope en períodos de facturación (por defecto 2). */
  topePeriodos: number;
  /** Cuántos meses entran al promedio sugerido (6). */
  mesesDelPromedio: number;
  onRegistrar: (body: { valorCop?: number | null; facturas?: FacturaDeServicio[]; nota?: string; soporte: File }) => Promise<boolean>;
}) {
  const [forma, setForma] = useState<'FACTURAS' | 'PROMEDIO'>('FACTURAS');
  const [facturas, setFacturas] = useState<{ servicio: string; periodo: string; valor: string }[]>([
    { servicio: '', periodo: '', valor: '' },
  ]);
  const [promedio, setPromedio] = useState('');
  const [nota, setNota] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const validas: FacturaDeServicio[] = useMemo(
    () =>
      facturas
        .map((f) => ({ servicio: f.servicio.trim(), periodo: f.periodo, valorCop: soloDigitos(f.valor) }))
        .filter((f) => f.servicio && /^\d{4}-\d{2}$/.test(f.periodo) && f.valorCop > 0),
    [facturas],
  );
  const sugerido = promedioMensual(validas, mesesDelPromedio);
  const valor = forma === 'FACTURAS' ? sugerido : soloDigitos(promedio) || null;
  /*
   * 🔴 El tope que aplica: el más bajo entre el de pesos de la inmobiliaria y
   * `topePeriodos × promedio`. Con el valor digitado a mano no hay promedio, y
   * entonces sólo aplica el de pesos — la misma regla que `topeEfectivoCop`.
   */
  const topeQueAplica =
    forma === 'FACTURAS' && sugerido != null
      ? Math.min(topeCop ?? Number.MAX_SAFE_INTEGER, sugerido * topePeriodos)
      : topeCop;
  const pasaElTope =
    valor != null && topeQueAplica != null && topeQueAplica < Number.MAX_SAFE_INTEGER && valor > topeQueAplica;
  const listo = valor != null && valor > 0 && soporte != null && !pasaElTope && !enviando;

  return (
    <div className="space-y-3 border-t border-border pt-3 text-sm" data-testid="registrar-garantia">
      <p className="font-medium">Registrar la garantía</p>
      <div className="flex gap-4 text-xs">
        <label className="flex items-center gap-1">
          <input type="radio" checked={forma === 'FACTURAS'} onChange={() => setForma('FACTURAS')} data-testid="forma-facturas" />
          Digitar las últimas facturas
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={forma === 'PROMEDIO'} onChange={() => setForma('PROMEDIO')} data-testid="forma-promedio" />
          Digitar el promedio
        </label>
      </div>

      {forma === 'FACTURAS' ? (
        <div className="space-y-2">
          {facturas.map((f, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="text-xs">
                Servicio
                <Input
                  value={f.servicio}
                  placeholder="Energía"
                  onChange={(e) => setFacturas((xs) => xs.map((x, j) => (j === i ? { ...x, servicio: e.target.value } : x)))}
                  className="mt-1 w-36"
                  data-testid={`factura-servicio-${i}`}
                />
              </label>
              <label className="text-xs">
                Mes
                <Input
                  type="month"
                  value={f.periodo}
                  onChange={(e) => setFacturas((xs) => xs.map((x, j) => (j === i ? { ...x, periodo: e.target.value } : x)))}
                  className="mt-1"
                  data-testid={`factura-periodo-${i}`}
                />
              </label>
              <label className="text-xs">
                Valor
                <Input
                  inputMode="numeric"
                  value={f.valor}
                  onChange={(e) => setFacturas((xs) => xs.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))}
                  className="mt-1 w-32"
                  data-testid={`factura-valor-${i}`}
                />
              </label>
              {facturas.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => setFacturas((xs) => xs.filter((_, j) => j !== i))}>
                  Quitar
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFacturas((xs) => [...xs, { servicio: '', periodo: '', valor: '' }])}
            data-testid="agregar-factura"
          >
            Agregar factura
          </Button>
          <p className="text-xs text-muted-foreground">
            Se suman las facturas del mismo mes y se promedian los{' '}
            <strong>últimos {mesesDelPromedio} meses</strong>. Digita más si quieres, que sólo entran esos.
          </p>
        </div>
      ) : (
        <label className="block text-xs">
          Promedio mensual de los servicios
          <Input inputMode="numeric" value={promedio} onChange={(e) => setPromedio(e.target.value)} className="mt-1 w-40" data-testid="garantia-promedio" />
        </label>
      )}

      <p className="text-xs">
        Valor de la garantía: <strong data-testid="garantia-valor-calculado">{valor ? PESOS.format(valor) : '—'}</strong>
        {sugerido != null && (
          <span className="text-muted-foreground" data-testid="garantia-sugerido">
            {' '}
            · sugerido {PESOS.format(sugerido)} (promedio de los últimos {mesesDelPromedio} meses)
          </span>
        )}
        {topeQueAplica != null && topeQueAplica < Number.MAX_SAFE_INTEGER && (
          <span className="text-muted-foreground" data-testid="garantia-tope">
            {' '}
            · tope {PESOS.format(topeQueAplica)}
            {forma === 'FACTURAS' && sugerido != null && topeQueAplica === sugerido * topePeriodos
              ? ` (${topePeriodos} ${topePeriodos === 1 ? 'período' : 'períodos'} de facturación)`
              : ''}
          </span>
        )}
      </p>
      {pasaElTope && (
        <p className="text-xs text-destructive" data-testid="garantia-sobre-el-tope">
          Pasa el tope: no se puede registrar por ese valor.
        </p>
      )}

      <label className="block text-xs">
        Soporte (facturas o certificado)
        <Input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setSoporte(e.target.files?.[0] ?? null)}
          className="mt-1"
          data-testid="garantia-soporte"
        />
      </label>
      <label className="block text-xs">
        Nota (opcional)
        <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className="mt-1" />
      </label>
      <Button
        size="sm"
        disabled={!listo}
        onClick={async () => {
          if (!soporte || !valor) return;
          setEnviando(true);
          await onRegistrar({
            ...(forma === 'FACTURAS' ? { facturas: validas } : { valorCop: valor }),
            ...(nota.trim() ? { nota: nota.trim() } : {}),
            soporte,
          });
          setEnviando(false);
        }}
        data-testid="guardar-garantia"
      >
        Registrar la garantía
      </Button>
    </div>
  );
}

function NuevoMovimiento({
  cuenta,
  onRegistrar,
}: {
  cuenta: NonNullable<GarantiaDeServicios['cuenta']>;
  onRegistrar: (body: {
    tipo: TipoDeMovimientoDeGarantia;
    valorCop: number;
    fecha: string;
    descripcion: string;
    medio?: string;
    soporte?: File | null;
  }) => Promise<boolean>;
}) {
  const [tipo, setTipo] = useState<TipoDeMovimientoDeGarantia>(cuenta.faltaPorRecaudarCop > 0 ? 'RECAUDO' : 'PAGO_DE_SERVICIO');
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState(hoy());
  const [descripcion, setDescripcion] = useState('');
  const [medio, setMedio] = useState('');
  const [soporte, setSoporte] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tope =
    tipo === 'RECAUDO'
      ? cuenta.faltaPorRecaudarCop
      : tipo === 'DEVOLUCION'
        ? cuenta.saldoCop
        : tipo === 'COBRO_DE_DIFERENCIA'
          ? cuenta.diferenciaPorCobrarCop
          : null;
  const v = soloDigitos(valor);
  const pideSoporte = tipo === 'PAGO_DE_SERVICIO';
  const listo =
    v > 0 &&
    (tope == null || v <= tope) &&
    descripcion.trim().length >= 3 &&
    (!pideSoporte || soporte != null) &&
    !enviando;

  const tipos: TipoDeMovimientoDeGarantia[] = ['RECAUDO', 'PAGO_DE_SERVICIO', 'DEVOLUCION', 'COBRO_DE_DIFERENCIA'];

  return (
    <div className="space-y-2 border-t border-border pt-3 text-sm" data-testid="nuevo-movimiento-de-garantia">
      <p className="font-medium">Registrar un movimiento</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDeMovimientoDeGarantia)}
            className="mt-1 block h-9 rounded-md border border-input bg-background px-2 text-sm"
            data-testid="movimiento-tipo"
          >
            {tipos.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_DEL_TIPO[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Valor
          <Input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1 w-32" data-testid="movimiento-valor" />
        </label>
        <label className="text-xs">
          Fecha
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1" />
        </label>
        <label className="text-xs">
          Medio
          <Input value={medio} onChange={(e) => setMedio(e.target.value)} placeholder="transferencia" className="mt-1 w-32" />
        </label>
      </div>
      {tope != null && (
        <p className="text-xs text-muted-foreground" data-testid="movimiento-tope">
          Máximo {PESOS.format(tope)}.
        </p>
      )}
      {tipo === 'COBRO_DE_DIFERENCIA' && (
        <p className="text-xs text-muted-foreground">
          Se carga como concepto a la próxima cuota sin pagar del inquilino.
        </p>
      )}
      <label className="block text-xs">
        Descripción
        <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="mt-1" data-testid="movimiento-descripcion" />
      </label>
      <label className="block text-xs">
        {pideSoporte ? 'Factura pagada (obligatoria)' : 'Soporte (opcional)'}
        <Input type="file" accept="application/pdf,image/*" onChange={(e) => setSoporte(e.target.files?.[0] ?? null)} className="mt-1" />
      </label>
      <Button
        size="sm"
        variant="outline"
        disabled={!listo}
        onClick={async () => {
          setEnviando(true);
          const ok = await onRegistrar({
            tipo,
            valorCop: v,
            fecha,
            descripcion: descripcion.trim(),
            ...(medio.trim() ? { medio: medio.trim() } : {}),
            soporte,
          });
          setEnviando(false);
          if (ok) {
            setValor('');
            setDescripcion('');
            setSoporte(null);
          }
        }}
        data-testid="guardar-movimiento"
      >
        Registrar movimiento
      </Button>
    </div>
  );
}

function Movimientos({
  datos,
  puedeEditar,
  onSoporte,
  onAnular,
}: {
  datos: GarantiaDeServicios;
  puedeEditar: boolean;
  onSoporte: (id?: string) => void;
  onAnular: (movimientoId: string, motivo: string) => Promise<void>;
}) {
  const [anulando, setAnulando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  return (
    <div className="border-t border-border pt-3" data-testid="movimientos-de-garantia">
      <p className="mb-2 text-sm font-medium">Movimientos</p>
      <ul className="space-y-2 text-xs">
        {datos.movimientos.map((m) => (
          <li key={m.id} className={m.anulado ? 'text-muted-foreground line-through' : ''} data-testid={`movimiento-${m.id}`}>
            <span className="font-medium">{m.fecha}</span> · {NOMBRE_DEL_TIPO[m.tipo]} · {PESOS.format(m.valorCop)} ·{' '}
            {m.descripcion}
            {m.medio ? ` (${m.medio})` : ''}
            {m.soporteNombre && (
              <button type="button" className="ml-2 underline" onClick={() => onSoporte(m.id)}>
                soporte
              </button>
            )}
            {m.anulado && m.motivoDeAnulacion && <span className="ml-2 no-underline">Anulado: {m.motivoDeAnulacion}</span>}
            {!m.anulado && puedeEditar && anulando !== m.id && (
              <button type="button" className="ml-2 text-destructive underline" onClick={() => setAnulando(m.id)}>
                anular
              </button>
            )}
            {anulando === m.id && (
              <span className="ml-2 inline-flex items-center gap-2">
                <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué?" className="h-7 w-48" />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={motivo.trim().length < 3}
                  onClick={async () => {
                    await onAnular(m.id, motivo.trim());
                    setAnulando(null);
                    setMotivo('');
                  }}
                >
                  Anular
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAnulando(null)}>
                  Cancelar
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
