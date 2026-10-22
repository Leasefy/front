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

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { ListaParaEmpezar } from '@/components/pantalla/ListaParaEmpezar';
import { ParaEntenderMas } from '@/components/ui/para-entender-mas';
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { DownloadSimple, User } from '@phosphor-icons/react';
import { AnimatedNumber, Appear, Collapse, CrossFade, Presence } from '@leasefy/cadence';

import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
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

/**
 * Revisora r22 (Comisiones #4): el asesor por su nombre y su avatar, nunca por su correo. Si el back sólo trae el
 * correo (la persona no puso su nombre), «Sin nombre» y el correo en gris debajo.
 */
function NombreDelAsesor({ nombre, fuerte = false }: { nombre: string; fuerte?: boolean }) {
  const esCorreo = nombre.includes('@');
  const visible = esCorreo ? 'Sin nombre' : nombre;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {/* Revisora r23 (Comisiones #3): sin nombre, la silueta punteada; antes salían «HO» de «hola+agente@…». */}
      {esCorreo ? (
        <Avatar name={nombre} kind="invitada" size="sm">
          <User className="size-4" aria-hidden="true" />
        </Avatar>
      ) : (
        <Avatar name={visible} size="sm" />
      )}
      <div className="min-w-0">
        <p className={cn('truncate', fuerte ? 'font-medium text-fg' : 'text-fg')}>{visible}</p>
        {esCorreo ? <p className="truncate text-caption text-fg-muted">{nombre}</p> : null}
      </div>
    </div>
  );
}

// ── Metas ────────────────────────────────────────────────────────────────────

function FilaDeMeta({
  asesor,
  mes,
  puedeEditar,
  alGuardar,
  editandoAlInicio = false,
  alCerrar,
  sinCabecera = false,
}: {
  asesor: MetaDelAsesor;
  mes: string;
  puedeEditar: boolean;
  alGuardar: (m: MetaDelAsesor) => void;
  /** En la tabla del equipo la fila se abre ya editando. */
  editandoAlInicio?: boolean;
  /** Al guardar o cancelar (la tabla cierra la fila). */
  alCerrar?: () => void;
  /** Sin el nombre ni el avance (la tabla ya los muestra). */
  sinCabecera?: boolean;
}) {
  const [editando, setEditandoPropio] = useState(editandoAlInicio);
  const setEditando = (v: boolean) => {
    setEditandoPropio(v);
    if (!v) alCerrar?.();
  };
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
    <li className={cn(!sinCabecera && 'rounded-lg border border-border bg-surface p-4', 'space-y-3')} data-testid={`meta-${asesor.userId}`}>
      {sinCabecera ? null : (
      <>
      <div className="flex items-center justify-between gap-3">
        <NombreDelAsesor nombre={asesor.nombre} fuerte />
        {puedeEditar && !editando ? (
          <Button size="sm" variant="secondary" hideArrow onClick={() => setEditando(true)} data-testid="poner-meta">
            {asesor.meta ? 'Cambiar meta' : 'Poner meta'}
          </Button>
        ) : null}
      </div>
      {asesor.meta ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Avance etiqueta="Cierres" hecho={asesor.avance.cierres} meta={asesor.meta.cierres} />
          <Avance etiqueta="Captaciones" hecho={asesor.avance.captaciones} meta={asesor.meta.captaciones} />
        </div>
      ) : (
        // Revisora r22 (#7): sin meta, UN renglón (antes «Sin meta este mes» dos veces), con los ceros en «—».
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-body-sm text-fg-muted" data-testid="sin-meta">
          <span>
            Cierres <span className="font-mono tabular-nums text-fg">{asesor.avance.cierres || '—'}</span>
          </span>
          <span>
            Captaciones <span className="font-mono tabular-nums text-fg">{asesor.avance.captaciones || '—'}</span>
          </span>
          <span>Sin meta este mes</span>
        </p>
      )}
      </>
      )}
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
      {/* Revisora r22 (#5): el título sin el ícono en un cuadro de voltaje (el azul es para la acción). */}
      <div>
        <div>
          <h2 id="titulo-metas" className="text-lg font-normal text-fg">
            {datos.soloLaMia ? 'Mi meta del mes' : 'Metas del mes'}
          </h2>
          <p className="text-caption text-fg-muted">
            Captó: firmó el mandato este mes · Cerró: firmó el contrato este mes.
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
    <li className="rounded-lg border border-border bg-surface p-4 md:p-5 space-y-3" data-testid={`comision-${asesor.userId}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <NombreDelAsesor nombre={asesor.nombre} fuerte />
          <p className="mt-1 text-caption text-fg-muted">
            {asesor.regla ? textoDeLaRegla(asesor.regla) : 'Sin regla de comisión'}
          </p>
        </div>
        <div className="flex gap-6 sm:text-right">
          <div>
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Ganado</p>
            <AnimatedNumber value={asesor.ganadoCop} format={formatCurrency} className="font-mono tabular-nums text-lg text-fg" />
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

function SeccionDeComision({
  datos,
  esGerente,
  tablaDelEquipo,
}: {
  datos: ComisionesDelMes;
  esGerente: boolean;
  /** La tabla del equipo (gerente, escritorio): reemplaza las tarjetas de cada asesor. */
  tablaDelEquipo?: ReactNode;
}) {
  const exportar = () => {
    descargarCsv(`comisiones-asesores-${datos.mes}.csv`, csvDeLasComisiones(datos));
    toast.success('Listo: el archivo para nómina quedó en tus descargas.');
  };
  return (
    <section className="space-y-3" aria-labelledby="titulo-comision">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div>
            <h2 id="titulo-comision" className="text-lg font-normal text-fg">
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
        // Revisora r23 (Comisiones #1): es una configuración de una vez, no algo que anda mal: la lista de lo
        // que falta para empezar (neutra), no un aviso ámbar con el botón azul adentro.
        <ListaParaEmpezar
          paraQue="calcular las comisiones"
          requisitos={[
            {
              id: 'regla',
              titulo: 'Configura la comisión de tus asesores',
              detalle: esGerente
                ? 'Leasefy no calcula ninguna comisión hasta que la pongas: un porcentaje por captar y por cerrar, o un valor fijo por cierre.'
                : 'Tu inmobiliaria todavía no configuró la comisión de los asesores. Pídele al administrador que la ponga en Configuración → Comercial.',
              estado: 'falta',
              accion: esGerente ? (
                <Button asChild size="sm" variant="outline" hideArrow>
                  <Link href={RUTA_DE_LA_REGLA} data-testid="ir-a-configurar">Configurar la comisión</Link>
                </Button>
              ) : undefined,
            },
          ]}
          data-testid="sin-regla"
        />
      ) : null}

      {datos.hayReglas && esGerente ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-md border border-border p-3">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Ganado del equipo</p>
            <AnimatedNumber value={datos.totales.ganadoCop} format={formatCurrency} className="font-mono tabular-nums text-fg" />
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="font-mono text-caption uppercase tracking-wider text-fg-muted">Por causar</p>
            <AnimatedNumber value={datos.totales.porCausarCop} format={formatCurrency} className="font-mono tabular-nums text-fg-muted" />
          </div>
        </div>
      ) : null}

      {datos.hayReglas && tablaDelEquipo ? tablaDelEquipo : null}

      {datos.hayReglas && !tablaDelEquipo ? (
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
          Asígnale el asesor al inmueble desde su ficha.
        </p>
      ) : null}
    </section>
  );
}

// ── El equipo en una tabla (revisora r22, Comisiones #6) ─────────────────────

/** «1 de 4» con su meta; sin meta, el número solo (o «—» si es 0). */
function AvanceCorto({ hecho, meta }: { hecho: number; meta: number | null }) {
  if (meta === null) {
    return <span className="font-mono tabular-nums text-fg-muted">{hecho || '—'}</span>;
  }
  return (
    <span className="font-mono tabular-nums text-fg">
      {hecho}
      <span className="text-fg-muted"> de {meta}</span>
    </span>
  );
}

/**
 * Con 20 asesores eran 20 tarjetas con sombra, cada una con su tabla de 760 px y, aparte, 20 tarjetas de metas.
 * Ahora: un asesor por fila (Ganado · Por causar · Cierres · Captaciones) y el detalle y su meta en el cajón.
 */
function TablaDelEquipo({
  comision,
  metas,
  puedeEditar,
  alCambiarMeta,
}: {
  comision: ComisionesDelMes;
  metas: MetasDelMes;
  puedeEditar: boolean;
  alCambiarMeta: (m: MetaDelAsesor) => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const ids = Array.from(new Set([...comision.asesores.map((a) => a.userId), ...metas.asesores.map((a) => a.userId)]));
  const filas = ids.map((id) => ({
    id,
    c: comision.asesores.find((a) => a.userId === id) ?? null,
    m: metas.asesores.find((a) => a.userId === id) ?? null,
  }));
  const delCajon = filas.find((f) => f.id === abierto) ?? null;
  const nombre = (f: (typeof filas)[number]) => f.c?.nombre ?? f.m?.nombre ?? '';
  const TH = 'py-2.5 px-4 font-mono text-caption uppercase tracking-wider text-fg-muted whitespace-nowrap font-normal';
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm" data-testid="tabla-del-equipo">
          <thead>
            <tr className="border-b border-border-faint text-left">
              <th className={TH}>Asesor</th>
              <th className={cn(TH, 'text-right')}>Ganado</th>
              <th className={cn(TH, 'text-right')}>Por causar</th>
              <th className={TH}>Cierres</th>
              <th className={TH}>Captaciones</th>
              <th className={TH}><span className="sr-only">Detalle</span></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <Fragment key={f.id}>
              <tr className="border-b border-border-faint last:border-0" data-testid={`fila-del-asesor-${f.id}`}>
                <td className="py-3 px-4">
                  <NombreDelAsesor nombre={nombre(f)} />
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-fg whitespace-nowrap">
                  {f.c ? formatCurrency(f.c.ganadoCop) : '—'}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-fg-muted whitespace-nowrap">
                  {f.c ? formatCurrency(f.c.porCausarCop) : '—'}
                </td>
                <td className="py-3 px-4">
                  <AvanceCorto hecho={f.m?.avance.cierres ?? 0} meta={f.m?.meta?.cierres ?? null} />
                </td>
                <td className="py-3 px-4">
                  <AvanceCorto hecho={f.m?.avance.captaciones ?? 0} meta={f.m?.meta?.captaciones ?? null} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    {f.m && puedeEditar && editando !== f.id ? (
                      <Button size="sm" variant="ghost" hideArrow onClick={() => setEditando(f.id)} data-testid="poner-meta">
                        {f.m.meta ? 'Cambiar meta' : 'Poner meta'}
                      </Button>
                    ) : null}
                    {f.c && f.c.detalle.length > 0 ? (
                      <Button size="sm" variant="ghost" hideArrow onClick={() => setAbierto(f.id)} data-testid={`abrir-asesor-${f.id}`}>
                        Ver detalle
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
              {f.m && editando === f.id ? (
                <tr className="border-b border-border-faint bg-surface-muted/40">
                  <td colSpan={6} className="px-4 py-3">
                    <ul>
                      <FilaDeMeta
                        asesor={f.m}
                        mes={metas.mes}
                        puedeEditar={puedeEditar}
                        alGuardar={alCambiarMeta}
                        editandoAlInicio
                        sinCabecera
                        alCerrar={() => setEditando(null)}
                      />
                    </ul>
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Cajon abierto={delCajon !== null} onOpenChange={(a) => !a && setAbierto(null)}>
        {delCajon ? (
          <>
            <CajonCabecera
              titulo={nombre(delCajon).includes('@') ? 'Sin nombre' : nombre(delCajon)}
              descripcion={delCajon.c?.regla ? textoDeLaRegla(delCajon.c.regla) : 'Sin regla de comisión'}
            />
            <CajonCuerpo className="space-y-5">
              {delCajon.c && delCajon.c.detalle.length > 0 ? (
                <DetalleEnTarjetas lineas={delCajon.c.detalle} />
              ) : (
                <p className="text-sm text-fg-muted">Sin comisión este mes: ningún contrato que captó o cerró generó comisión para la inmobiliaria.</p>
              )}
            </CajonCuerpo>
          </>
        ) : null}
      </Cajon>
    </>
  );
}

export function ComisionesYMetas() {
  const { isAdmin } = usePermissions();
  const esCelular = useIsMobile();
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
    <div className="space-y-6 p-6 lg:p-8">
      <EncabezadoDePantalla
        seccion="Captación y arriendo"
        titulo="Comisiones y metas"
        descripcion={
          isAdmin
            ? 'Lo que gana cada asesor en el mes y cómo va contra su meta.'
            : 'Lo que llevas ganado en el mes y cómo vas contra tu meta.'
        }
        acciones={
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
        }
        ayuda={
          <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: comisiones y metas" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Captó es el asesor asignado al inmueble. Cerró es el asesor del proceso del embudo que terminó en el contrato.</p>
              <p>La comisión sale de los contratos del mes; un contrato sin asesor no le suma a nadie hasta que le asignes el asesor al inmueble desde su ficha.</p>
              {isAdmin ? <p>Las metas se ponen por asesor y por mes: cierres y captaciones.</p> : null}
            </div>
          </ParaEntenderMas>
        }
      />

      <EstadoDeDatos cargando={cargando && !comision} error={error} queEs="la comisión y las metas" onReintentar={cargar}>
        <CrossFade swapKey={comision && metas ? `${comision.mes}` : 'vacio'}>
          {comision && metas ? (
            <div className="space-y-8">
              <Appear>
                <SeccionDeComision
                  datos={comision}
                  esGerente={isAdmin}
                  tablaDelEquipo={
                    isAdmin && !comision.soloLaMia && comision.hayReglas && !esCelular ? (
                      <TablaDelEquipo
                        comision={comision}
                        metas={metas}
                        puedeEditar={isAdmin}
                        alCambiarMeta={(nueva) =>
                          setMetas((prev) =>
                            prev ? { ...prev, asesores: prev.asesores.map((a) => (a.userId === nueva.userId ? nueva : a)) } : prev,
                          )
                        }
                      />
                    ) : null
                  }
                />
              </Appear>
              {/* Con la tabla del equipo, las metas viven en ella (columna y cajón); sin ella, su sección. */}
              {isAdmin && !comision.soloLaMia && comision.hayReglas && !esCelular ? null : (
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
              )}
              {/* Revisora r22 (#1): sin el pie de definiciones (repetía el mes y lo que dice «¿Cómo funciona?»). */}
            </div>
          ) : (
            <div />
          )}
        </CrossFade>
      </EstadoDeDatos>
    </div>
  );
}
