'use client';

/**
 * «Comisiones y metas» — COMERCIAL (Nico, 04-10-2026, TAL CUAL).
 *
 *   · El ASESOR ve «Mi comisión del mes» (total y detalle por contrato:
 *     inmueble, qué hizo, base, regla y valor) y su meta con el avance.
 *   · El GERENTE (administrador) ve la de todos, la exporta para nómina y
 *     pone las metas del mes.
 *
 * La comisión es sobre lo que de verdad ganó la inmobiliaria ese mes: lo que
 * todavía no se le facturó al propietario sale «por causar», nunca como
 * ganado. Sin regla configurada no se inventa ninguna.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DownloadSimple, Flag, Handshake, Target, Wallet, WarningCircle } from '@phosphor-icons/react';
import { AnimatedNumber, Appear, Collapse, CrossFade, Presence } from '@leasefy/cadence';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/format';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { cn } from '@/lib/utils';
import {
  ACCION,
  ESTADO_DE_LA_LINEA,
  comercialApi,
  csvDeLasComisiones,
  descargarCsv,
  mesDeHoy,
  nombreDelMes,
  textoDeLaRegla,
  type ComisionDelAsesor,
  type ComisionesDelMes,
  type EstadoDeLaLinea,
  type LineaDeComision,
  type MetaDelAsesor,
  type MetasDelMes,
} from '@/lib/comercial/comercial';

const RUTA_DE_LA_REGLA = '/panel/inmobiliaria/configuracion/comercial';

/** Los últimos 12 meses, el de hoy primero. */
export function ultimosMeses(hoy: string, cuantos = 12): string[] {
  const [a, m] = hoy.split('-').map(Number);
  return Array.from({ length: cuantos }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

const TONO_DEL_ESTADO: Record<EstadoDeLaLinea, string> = {
  GANADA: 'bg-success-soft text-success',
  POR_CAUSAR: 'bg-warning-soft text-warning',
  PARCIAL: 'bg-warning-soft text-warning',
  SIN_REGLA: 'bg-surface-muted text-fg-muted',
};

function EstadoDeLaLinea({ estado }: { estado: EstadoDeLaLinea }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap', TONO_DEL_ESTADO[estado])}
      data-testid={`estado-${estado}`}
    >
      {ESTADO_DE_LA_LINEA[estado]}
    </span>
  );
}

function BarraDeAvance({ hecho, meta }: { hecho: number; meta: number }) {
  const pct = meta > 0 ? Math.min(100, (hecho / meta) * 100) : 0;
  const color = pct >= 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warning';
  return (
    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden" aria-hidden="true">
      <div className={cn('h-full rounded-full transition-all duration-slow ease-enter', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Avance({ etiqueta, hecho, meta }: { etiqueta: string; hecho: number; meta: number | null }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption text-fg-muted">{etiqueta}</span>
        <span className="font-mono tabular-nums text-sm">
          {hecho}
          {meta !== null ? <span className="text-fg-muted"> de {meta}</span> : null}
        </span>
      </div>
      {meta !== null ? <BarraDeAvance hecho={hecho} meta={meta} /> : <p className="text-caption text-fg-muted">Sin meta este mes</p>}
    </div>
  );
}

// ── Metas ────────────────────────────────────────────────────────────────────

function FilaDeMeta({
  asesor,
  mes,
  puedeEditar,
  alGuardar,
}: {
  asesor: MetaDelAsesor;
  mes: string;
  puedeEditar: boolean;
  alGuardar: (m: MetaDelAsesor) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [cierres, setCierres] = useState(String(asesor.meta?.cierres ?? ''));
  const [captaciones, setCaptaciones] = useState(String(asesor.meta?.captaciones ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const c = Number(cierres || '0');
    const k = Number(captaciones || '0');
    if (![c, k].every((n) => Number.isInteger(n) && n >= 0 && n <= 1000)) {
      setError('Las metas son números enteros entre 0 y 1.000.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const nueva = await comercialApi.guardarMeta({ asesorUserId: asesor.userId, mes, cierres: c, captaciones: k });
      alGuardar(nueva);
      setEditando(false);
      toast.success(`Meta de ${asesor.nombre} guardada.`);
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No se pudo guardar la meta.', accion: 'guardar la meta' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <li className="rounded-lg border border-border bg-surface p-4 space-y-3" data-testid={`meta-${asesor.userId}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium truncate">{asesor.nombre}</p>
        {puedeEditar && !editando ? (
          <Button size="sm" variant="secondary" hideArrow onClick={() => setEditando(true)} data-testid="poner-meta">
            {asesor.meta ? 'Cambiar meta' : 'Poner meta'}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Avance etiqueta="Cierres" hecho={asesor.avance.cierres} meta={asesor.meta?.cierres ?? null} />
        <Avance etiqueta="Captaciones" hecho={asesor.avance.captaciones} meta={asesor.meta?.captaciones ?? null} />
      </div>
      <Collapse open={editando}>
        <div className="flex flex-wrap items-end gap-3 pt-1">
          <label className="space-y-1">
            <span className="block text-caption text-fg-muted">Meta de cierres</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              className="w-28 text-right tabular-nums"
              value={cierres}
              onChange={(e) => setCierres(e.target.value)}
              aria-label={`Meta de cierres de ${asesor.nombre}`}
              data-testid="meta-cierres"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-caption text-fg-muted">Meta de captaciones</span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              className="w-28 text-right tabular-nums"
              value={captaciones}
              onChange={(e) => setCaptaciones(e.target.value)}
              aria-label={`Meta de captaciones de ${asesor.nombre}`}
              data-testid="meta-captaciones"
            />
          </label>
          <div className="flex gap-2">
            <Button size="sm" hideArrow isLoading={guardando} onClick={() => void guardar()} data-testid="guardar-meta">
              Guardar
            </Button>
            <Button size="sm" variant="ghost" hideArrow onClick={() => { setEditando(false); setError(null); }}>
              Cancelar
            </Button>
          </div>
        </div>
        <Presence show={Boolean(error)}>
          <p role="alert" className="pt-2 text-caption text-danger">{error}</p>
        </Presence>
      </Collapse>
    </li>
  );
}

function SeccionDeMetas({ datos, puedeEditar, alCambiar }: { datos: MetasDelMes; puedeEditar: boolean; alCambiar: (m: MetaDelAsesor) => void }) {
  return (
    <section className="space-y-3" aria-labelledby="titulo-metas">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 id="titulo-metas" className="text-base font-semibold">
            {datos.soloLaMia ? 'Mi meta del mes' : 'Metas del mes'}
          </h2>
          <p className="text-caption text-fg-muted">
            Cierres = procesos del embudo cerrados en el mes; captaciones = mandatos consignados en el mes.
          </p>
        </div>
      </div>
      {datos.asesores.length === 0 ? (
        <p className="text-sm text-fg-muted">Todavía no hay asesores en el equipo.</p>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {datos.asesores.map((a) => (
            <FilaDeMeta key={`${a.userId}-${datos.mes}`} asesor={a} mes={datos.mes} puedeEditar={puedeEditar} alGuardar={alCambiar} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Comisión ─────────────────────────────────────────────────────────────────

function DetalleEnTabla({ lineas }: { lineas: LineaDeComision[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm" data-testid="detalle-tabla">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-3 font-mono text-caption uppercase tracking-wider text-fg-muted whitespace-nowrap">Inmueble</th>
            <th className="py-2 pr-3 font-mono text-caption uppercase tracking-wider text-fg-muted whitespace-nowrap">Qué hizo</th>
            <th className="py-2 pr-3 font-mono text-caption uppercase tracking-wider text-fg-muted whitespace-nowrap text-right">Base</th>
            <th className="py-2 pr-3 font-mono text-caption uppercase tracking-wider text-fg-muted whitespace-nowrap">Regla</th>
            <th className="py-2 pr-3 font-mono text-caption uppercase tracking-wider text-fg-muted whitespace-nowrap text-right">Valor</th>
            <th className="py-2 font-mono text-caption uppercase tracking-wider text-fg-muted">Estado</th>
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) => (
            <tr key={`${l.contractId}-${l.accion}`} className="border-b border-border/60 last:border-0 align-top">
              <td className="py-2.5 pr-3">
                <p className="font-medium">{l.inmueble}</p>
                {l.codigo != null ? <p className="text-caption text-fg-muted font-mono">Contrato #{l.codigo}</p> : null}
              </td>
              <td className="py-2.5 pr-3">{ACCION[l.accion]}</td>
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                {formatCurrency(l.baseCop)}
                {l.baseCausadaCop !== l.baseCop ? (
                  <p className="text-caption text-fg-muted">causada {formatCurrency(l.baseCausadaCop)}</p>
                ) : null}
              </td>
              <td className="py-2.5 pr-3 text-fg-muted">{l.regla?.texto ?? 'Sin regla'}</td>
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                {l.valorCop === null ? '—' : formatCurrency(l.valorCop)}
                {l.estado === 'PARCIAL' ? (
                  <p className="text-caption text-fg-muted">{formatCurrency(l.porCausarCop)} por causar</p>
                ) : null}
              </td>
              <td className="py-2.5"><EstadoDeLaLinea estado={l.estado} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleEnTarjetas({ lineas }: { lineas: LineaDeComision[] }) {
  return (
    <ul className="space-y-2" data-testid="detalle-tarjetas">
      {lineas.map((l) => (
        <li key={`${l.contractId}-${l.accion}`} className="rounded-md border border-border p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{l.inmueble}</p>
              <p className="text-caption text-fg-muted">
                {ACCION[l.accion]}
                {l.codigo != null ? ` · contrato #${l.codigo}` : ''}
              </p>
            </div>
            <EstadoDeLaLinea estado={l.estado} />
          </div>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-fg-muted">Base {formatCurrency(l.baseCop)}</span>
            <span className="font-mono tabular-nums font-medium">{l.valorCop === null ? '—' : formatCurrency(l.valorCop)}</span>
          </div>
          <p className="text-caption text-fg-muted">{l.regla?.texto ?? 'Sin regla'}</p>
        </li>
      ))}
    </ul>
  );
}

function TarjetaDelAsesor({ asesor, abiertaAlInicio }: { asesor: ComisionDelAsesor; abiertaAlInicio: boolean }) {
  const [abierta, setAbierta] = useState(abiertaAlInicio);
  const esCelular = useIsMobile();
  return (
    <li className="rounded-lg border border-border bg-surface p-4 md:p-5 space-y-3 shadow-sm" data-testid={`comision-${asesor.userId}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold truncate">{asesor.nombre}</p>
          <p className="text-caption text-fg-muted">
            {asesor.regla ? textoDeLaRegla(asesor.regla) : 'Sin regla de comisión'}
          </p>
        </div>
        <div className="flex gap-6 sm:text-right">
          <div>
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Ganado</p>
            <AnimatedNumber value={asesor.ganadoCop} format={formatCurrency} className="font-mono tabular-nums text-lg font-semibold" />
          </div>
          <div>
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Por causar</p>
            <AnimatedNumber value={asesor.porCausarCop} format={formatCurrency} className="font-mono tabular-nums text-lg text-fg-muted" />
          </div>
        </div>
      </div>
      {asesor.detalle.length === 0 ? (
        <p className="text-sm text-fg-muted">Sin comisión este mes: ningún contrato que captó o cerró generó comisión para la inmobiliaria.</p>
      ) : (
        <>
          <Button size="sm" variant="ghost" hideArrow onClick={() => setAbierta((x) => !x)} data-testid="ver-detalle" aria-expanded={abierta}>
            {abierta ? 'Ocultar el detalle' : `Ver el detalle (${asesor.detalle.length})`}
          </Button>
          <Collapse open={abierta}>
            {esCelular ? <DetalleEnTarjetas lineas={asesor.detalle} /> : <DetalleEnTabla lineas={asesor.detalle} />}
          </Collapse>
        </>
      )}
    </li>
  );
}

function SeccionDeComision({ datos, esGerente }: { datos: ComisionesDelMes; esGerente: boolean }) {
  const exportar = () => {
    descargarCsv(`comisiones-asesores-${datos.mes}.csv`, csvDeLasComisiones(datos));
    toast.success('Listo: el archivo para nómina quedó en tus descargas.');
  };
  return (
    <section className="space-y-3" aria-labelledby="titulo-comision">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 id="titulo-comision" className="text-base font-semibold">
              {datos.soloLaMia ? 'Mi comisión del mes' : 'Comisión de los asesores'}
            </h2>
            <p className="text-caption text-fg-muted">
              Sobre la comisión que la inmobiliaria ya le facturó al propietario. Lo que falta por facturar sale «por causar».
            </p>
          </div>
        </div>
        {esGerente && datos.hayReglas ? (
          <Button variant="secondary" hideArrow onClick={exportar} data-testid="exportar-nomina" disabled={datos.totales.lineas === 0}>
            <DownloadSimple className="w-4 h-4" aria-hidden="true" />
            Exportar para nómina (CSV)
          </Button>
        ) : null}
      </div>

      {!datos.hayReglas ? (
        <div className="rounded-md bg-warning-soft border border-border p-4 flex items-start gap-3" data-testid="sin-regla">
          <WarningCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Configura la comisión de tus asesores</p>
            <p className="text-sm text-fg-muted">
              {esGerente
                ? 'Todavía no hay regla: Leasefy no calcula ninguna comisión hasta que la pongas (un porcentaje por captar y por cerrar, o un valor fijo por cierre).'
                : 'Tu inmobiliaria todavía no configuró la comisión de los asesores. Pídele al administrador que la ponga en Configuración → Comercial.'}
            </p>
            {esGerente ? (
              <Button asChild size="sm" hideArrow>
                <Link href={RUTA_DE_LA_REGLA} data-testid="ir-a-configurar">Configurar la comisión</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {datos.hayReglas && esGerente ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-md border border-border p-3">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Ganado del equipo</p>
            <AnimatedNumber value={datos.totales.ganadoCop} format={formatCurrency} className="font-mono tabular-nums font-semibold" />
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Por causar</p>
            <AnimatedNumber value={datos.totales.porCausarCop} format={formatCurrency} className="font-mono tabular-nums text-fg-muted" />
          </div>
        </div>
      ) : null}

      {datos.hayReglas ? (
        <ul className="space-y-3">
          {datos.asesores.map((a, i) => (
            <TarjetaDelAsesor key={`${a.userId}-${datos.mes}`} asesor={a} abiertaAlInicio={datos.soloLaMia || i === 0} />
          ))}
        </ul>
      ) : null}

      {esGerente && datos.sinAsesor > 0 ? (
        <p className="text-caption text-fg-muted" data-testid="sin-asesor">
          {datos.sinAsesor === 1
            ? '1 contrato con comisión este mes no tiene asesor que lo captó ni lo cerró.'
            : `${datos.sinAsesor} contratos con comisión este mes no tienen asesor que los captó ni los cerró.`}{' '}
          Asígnale el agente al inmueble desde su ficha.
        </p>
      ) : null}
    </section>
  );
}

export function ComisionesYMetas() {
  const { isAdmin } = usePermissions();
  const hoy = useMemo(() => mesDeHoy(), []);
  const meses = useMemo(() => ultimosMeses(hoy), [hoy]);
  const [mes, setMes] = useState(hoy);
  const [comision, setComision] = useState<ComisionesDelMes | null>(null);
  const [metas, setMetas] = useState<MetasDelMes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [c, m] = await Promise.all([comercialApi.comisiones(mes), comercialApi.metas(mes)]);
      setComision(c);
      setMetas(m);
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Comisiones y metas</h1>
          <p className="text-sm text-fg-muted">
            {isAdmin
              ? 'Lo que gana cada asesor en el mes y cómo va contra su meta.'
              : 'Lo que llevas ganado en el mes y cómo vas contra tu meta.'}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger aria-label="Mes" data-testid="elegir-mes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {nombreDelMes(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <EstadoDeDatos cargando={cargando && !comision} error={error} queEs="la comisión y las metas" onReintentar={cargar}>
        <CrossFade swapKey={comision && metas ? `${comision.mes}` : 'vacio'}>
          {comision && metas ? (
            <div className="space-y-8">
              <Appear>
                <SeccionDeComision datos={comision} esGerente={isAdmin} />
              </Appear>
              <Appear delay={0.05}>
                <SeccionDeMetas
                  datos={metas}
                  puedeEditar={isAdmin}
                  alCambiar={(nueva) =>
                    setMetas((prev) =>
                      prev ? { ...prev, asesores: prev.asesores.map((a) => (a.userId === nueva.userId ? nueva : a)) } : prev,
                    )
                  }
                />
              </Appear>
              <p className="flex items-center gap-1.5 text-caption text-fg-muted">
                <Handshake className="w-4 h-4" aria-hidden="true" />
                Captó = el asesor asignado al inmueble. Cerró = el asesor del proceso del embudo que terminó en el contrato.
                <Flag className="w-4 h-4 ml-2" aria-hidden="true" />
                {nombreDelMes(mes)}
              </p>
            </div>
          ) : (
            <div />
          )}
        </CrossFade>
      </EstadoDeDatos>
    </div>
  );
}
