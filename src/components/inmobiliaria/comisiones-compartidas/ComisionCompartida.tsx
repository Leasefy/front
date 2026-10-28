'use client';

/**
 * Comisión compartida, en Arrendamientos (28-10-2026). Nico: «el que capta propone el reparto (50/50 de entrada) y el
 * otro lo acepta antes de mostrar el inmueble; Leasefy no cobra, sólo deja constancia».
 *
 * Dos lados: «Te propusieron» (traes al cliente: aceptas o no) y «Propusiste» (captaste: cambias el reparto mientras no
 * te respondan, o la retiras). Cada comisión abre su constancia: quién propuso, qué reparto, quién aceptó y cuándo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Handshake, MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react';
import { Alert, Ilustracion, Pagination, SearchInput, SegmentedControl, StatusBadge, enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { confirmar } from '@/components/ui/confirmar';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';
import { comisionesCompartidasApi, type Colega, type ComisionCompartida as Comision } from '@/lib/api/comisiones-compartidas.service';
import {
  POR_PAGINA,
  REPARTOS_RAPIDOS,
  estadoDeLaComision,
  filtrarComisiones,
  porResponder,
  precioDelInmueble,
  type FiltroDeEstado,
} from '@/lib/comisiones-compartidas/comision';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { useConsignaciones, useInmueblesSinConsignacion } from '@/lib/hooks/useInmobiliaria';
import { cn } from '@/lib/utils';

const fecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(new Date(iso));
const fechaCorta = (iso: string) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' }).format(new Date(iso));
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Lado = Comision['lado'];

export function ComisionCompartida() {
  const [datos, setDatos] = useState<{ disponible: boolean; comisiones: Comision[] } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [lado, setLado] = useState<Lado | null>(null);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState<FiltroDeEstado>('todas');
  const [pagina, setPagina] = useState(1);
  const [proponer, setProponer] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);

  const leer = useCallback(async () => {
    setError(null);
    try {
      const r = await comisionesCompartidasApi.listar();
      setDatos(r);
      // Primero lo que te toca responder; si no hay nada recibido, lo que propusiste.
      setLado((l) => l ?? (r.comisiones.some((c) => c.lado === 'trae') ? 'trae' : 'capta'));
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    void leer();
  }, [leer]);

  const todas = useMemo(() => datos?.comisiones ?? [], [datos]);
  const ladoActual: Lado = lado ?? 'trae';
  const visibles = useMemo(() => filtrarComisiones(todas, { lado: ladoActual, buscar, estado: filtro }), [todas, ladoActual, buscar, filtro]);
  const deEstaPagina = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const cuantasRecibidas = todas.filter((c) => c.lado === 'trae').length;
  const cuantasEnviadas = todas.filter((c) => c.lado === 'capta').length;
  const pendientes = porResponder(todas);
  const comisionAbierta = todas.find((c) => c.id === abierta) ?? null;

  useEffect(() => setPagina(1), [ladoActual, buscar, filtro]);

  const aceptarDeUna = async (c: Comision) => {
    try {
      await comisionesCompartidasApi.responder(c.id, { acepta: true });
      toast.success(`Aceptaste compartir la comisión con ${c.otra.nombre}`, { description: 'Ya puedes mostrarle el inmueble a tus clientes.' });
      await leer();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { accion: 'aceptar la comisión', porDefecto: 'No pudimos guardar tu respuesta.' }));
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="comision-compartida">
      <EncabezadoDePantalla
        seccion="Arrendamientos"
        titulo="Comisión compartida"
        descripcion="Tú captaste el inmueble y otra inmobiliaria trae al cliente: se reparten la comisión. Leasefy no cobra nada; sólo deja constancia."
        accionPrincipal={
          datos?.disponible ? (
            <Button size="sm" hideArrow onClick={() => setProponer(true)} data-testid="proponer-comision">
              Proponer
            </Button>
          ) : undefined
        }
      />
      {error ? <FalloDeCarga error={error} onReintentar={leer} queEs="tus comisiones compartidas" /> : null}
      {datos && !datos.disponible ? <Alert variant="warning">La comisión compartida todavía no está activa en esta base de Leasefy.</Alert> : null}

      {datos?.disponible && todas.length === 0 ? <ComoFunciona alProponer={() => setProponer(true)} /> : null}

      {datos?.disponible && todas.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:w-auto">
              <SegmentedControl<Lado>
                aria-label="Qué comisiones ver"
                value={ladoActual}
                onChange={setLado}
                fullWidth
                options={[
                  { value: 'trae', ariaLabel: `Te propusieron, ${pendientes} por responder`, label: <ConNumero texto="Te propusieron" numero={pendientes || cuantasRecibidas} aviso={pendientes > 0} /> },
                  { value: 'capta', ariaLabel: 'Propusiste', label: <ConNumero texto="Propusiste" numero={cuantasEnviadas} /> },
                ]}
              />
            </div>
            <SearchInput
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onClear={() => setBuscar('')}
              placeholder="Buscar inmueble o inmobiliaria"
              aria-label="Buscar comisiones"
              className="md:w-72"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
            {(
              [
                ['todas', 'Todas'],
                ['por-responder', ladoActual === 'trae' ? 'Por responder' : 'Esperando respuesta'],
                ['aceptadas', 'Aceptadas'],
                ['cerradas', 'No aceptadas o retiradas'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setFiltro(valor)}
                aria-pressed={filtro === valor}
                className={cn(
                  'rounded-full border px-3 py-1 text-caption transition-colors duration-base',
                  filtro === valor ? 'border-primary bg-primary-soft font-medium text-primary' : 'border-border text-fg-muted hover:bg-surface-muted',
                )}
              >
                {texto}
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <SinResultados lado={ladoActual} hayAlgo={(ladoActual === 'trae' ? cuantasRecibidas : cuantasEnviadas) > 0} alProponer={() => setProponer(true)} />
          ) : (
            <>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="lista-de-comisiones">
                {deEstaPagina.map((c) => (
                  <TarjetaDeLaComision key={c.id} comision={c} alAbrir={() => setAbierta(c.id)} alAceptar={() => void aceptarDeUna(c)} />
                ))}
              </ul>
              {visibles.length > POR_PAGINA ? <Pagination total={visibles.length} page={pagina} pageSize={POR_PAGINA} onPageChange={setPagina} /> : null}
            </>
          )}
        </section>
      ) : null}

      <ProponerComision abierta={proponer} alCerrar={() => setProponer(false)} alProponer={async () => {
        setLado('capta');
        await leer();
      }} />
      <ConstanciaDeLaComision comision={comisionAbierta} alCerrar={() => setAbierta(null)} alCambiar={leer} />
    </div>
  );
}

function ConNumero({ texto, numero, aviso = false }: { texto: string; numero: number; aviso?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {texto}
      {numero > 0 ? (
        <span className={cn('rounded-full px-1.5 font-mono text-[11px] leading-[18px]', aviso ? 'bg-warning-soft text-warning-ink' : 'bg-surface-muted text-fg-muted')}>{numero}</span>
      ) : null}
    </span>
  );
}

/** Sin ninguna comisión todavía: qué es, en tres pasos con su 3D. */
function ComoFunciona({ alProponer }: { alProponer: () => void }) {
  const reducido = usePrefersReducedMotion();
  const pasos = [
    { ilustracion: 'firma' as const, titulo: 'Propones el reparto', texto: 'Eliges uno de tus inmuebles y con quién lo compartes. Arranca en 50 / 50 y lo cambias.' },
    { ilustracion: 'sello' as const, titulo: 'La otra lo acepta', texto: 'Le llega el aviso en Leasefy. Mientras no responda, puedes cambiar el reparto.' },
    { ilustracion: 'llaves' as const, titulo: 'Le muestra el inmueble a su cliente', texto: 'Con la comisión aceptada lo manda en sus colecciones. Queda la constancia en las dos cuentas.' },
  ];
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface" data-testid="comision-como-funciona">
      <div className="grid gap-px bg-border md:grid-cols-3">
        {pasos.map((p, i) => (
          <motion.div
            key={p.titulo}
            className="flex flex-col items-center bg-surface px-6 py-8 text-center"
            initial={reducido ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...enterTransition(reducido), delay: reducido ? 0 : i * 0.08 }}
          >
            <Ilustracion nombre={p.ilustracion} tamano={96} tono="auto" alt="" />
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-primary">Paso {i + 1}</p>
            <p className="mt-1 text-body font-medium text-fg">{p.titulo}</p>
            <p className="mt-1 max-w-[30ch] text-body-sm text-fg-muted">{p.texto}</p>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-surface-muted/60 px-6 py-4 sm:flex-row">
        <p className="inline-flex items-center gap-2 text-body-sm text-fg-muted">
          <ShieldCheck size={18} weight="duotone" className="shrink-0 text-primary" aria-hidden="true" />
          Leasefy no cobra nada por esto: sólo deja constancia de lo que acordaron.
        </p>
        <Button hideArrow onClick={alProponer}>
          Proponer la primera
        </Button>
      </div>
    </section>
  );
}

function SinResultados({ lado, hayAlgo, alProponer }: { lado: Lado; hayAlgo: boolean; alProponer: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-surface px-6 py-12 text-center" data-testid="comisiones-vacio">
      <Ilustracion nombre={hayAlgo ? 'lupa' : lado === 'trae' ? 'buzon' : 'llaves'} tamano={104} tono="auto" alt="" />
      <p className="mt-4 text-body font-medium text-fg">
        {hayAlgo ? 'Ninguna coincide con lo que buscas' : lado === 'trae' ? 'Nadie te ha propuesto compartir todavía' : 'Todavía no le has propuesto a nadie'}
      </p>
      <p className="mt-1 max-w-sm text-body-sm text-fg-muted">
        {hayAlgo
          ? 'Prueba con otro nombre o cambia el estado.'
          : lado === 'trae'
            ? 'Cuando otra inmobiliaria te proponga compartir la comisión de un inmueble, aparece aquí para que la aceptes.'
            : '¿Captaste un inmueble y otra inmobiliaria tiene el cliente? Propónle compartir la comisión.'}
      </p>
      {!hayAlgo && lado === 'capta' ? (
        <Button className="mt-5" hideArrow onClick={alProponer}>
          Proponer
        </Button>
      ) : null}
    </div>
  );
}

function Miniatura({ foto, titulo, grande = false }: { foto: string | null; titulo: string; grande?: boolean }) {
  const tam = grande ? 'size-16' : 'size-14';
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element -- foto del inmueble (URL firmada del marketplace)
    <img src={foto} alt={titulo} className={cn(tam, 'shrink-0 rounded-xl object-cover')} loading="lazy" />
  ) : (
    <span className={cn(tam, 'flex shrink-0 items-center justify-center rounded-xl bg-surface-muted')}>
      <Ilustracion nombre="casa" tamano={grande ? 52 : 44} tono="auto" alt="" />
    </span>
  );
}

function LogoDeLaOtra({ nombre, logo }: { nombre: string; logo: string | null }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- logo de la otra inmobiliaria (URL de su perfil)
    <img src={logo} alt="" className="size-7 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-caption font-medium text-primary">{nombre.charAt(0).toUpperCase()}</span>
  );
}

/** La barra del reparto: tu parte en el color de la marca, la de la otra en gris. */
export function BarraDelReparto({ tuParte, otra, grande = false }: { tuParte: number; otra: string; grande?: boolean }) {
  const reducido = usePrefersReducedMotion();
  return (
    <div className={grande ? 'space-y-2' : 'space-y-1.5'} data-testid="barra-del-reparto">
      <div className={cn('flex overflow-hidden rounded-full bg-surface-muted', grande ? 'h-3' : 'h-2')} role="img" aria-label={`Tú ${tuParte} %, ${otra} ${100 - tuParte} %`}>
        <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${tuParte}%` }} transition={enterTransition(reducido)} />
      </div>
      <div className="flex items-baseline justify-between gap-3 text-caption">
        <span className="font-medium text-fg">Tú {tuParte} %</span>
        <span className="min-w-0 truncate text-right text-fg-muted">
          {otra} {100 - tuParte} %
        </span>
      </div>
    </div>
  );
}

function TarjetaDeLaComision({ comision: c, alAbrir, alAceptar }: { comision: Comision; alAbrir: () => void; alAceptar: () => void }) {
  const estado = estadoDeLaComision(c);
  const precio = precioDelInmueble(c.inmueble);
  const responder = c.acciones.includes('aceptar');
  return (
    <li className={cn('flex min-w-0 flex-col rounded-2xl border bg-surface transition-shadow duration-base hover:shadow-md', responder ? 'border-warning/40' : 'border-border')} data-testid={`comision-${c.id}`}>
      <button type="button" onClick={alAbrir} className="flex-1 rounded-t-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        <div className="flex gap-3">
          <Miniatura foto={c.inmueble.foto} titulo={c.inmueble.titulo} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-fg">{c.inmueble.titulo}</p>
            <p className="truncate text-caption text-fg-subtle">{[c.inmueble.barrio, c.inmueble.ciudad].filter(Boolean).join(', ') || 'Sin barrio'}</p>
            {precio ? <p className="mt-0.5 font-mono text-caption text-fg-muted">{precio}</p> : null}
          </div>
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <LogoDeLaOtra nombre={c.otra.nombre} logo={c.otra.logo} />
          <span className="min-w-0 truncate text-body-sm text-fg-muted">
            {c.lado === 'trae' ? 'Te la propone ' : 'Con '}
            <span className="font-medium text-fg">{c.otra.nombre}</span>
          </span>
        </div>
        <div className="mt-3">
          <BarraDelReparto tuParte={c.tuParte} otra={c.otra.nombre} />
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <StatusBadge tone={estado.tono} className="whitespace-nowrap">
            {estado.texto}
          </StatusBadge>
          <span className="truncate text-caption text-fg-subtle">{fechaCorta(c.creadaEn)}</span>
        </span>
        {responder ? (
          <span className="flex gap-1.5">
            <Button size="sm" variant="ghost" hideArrow onClick={alAbrir}>
              Revisar
            </Button>
            <Button size="sm" hideArrow onClick={alAceptar} data-testid={`aceptar-${c.id}`}>
              Aceptar
            </Button>
          </span>
        ) : (
          <Button size="sm" variant="ghost" hideArrow onClick={alAbrir}>
            Ver constancia
          </Button>
        )}
      </div>
    </li>
  );
}

/** El reparto con sus atajos: lo de quien captó (1–99). */
function ElReparto({ valor, alCambiar, otra }: { valor: number; alCambiar: (v: number) => void; otra: string }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border p-4" data-testid="el-reparto">
      <div className="flex flex-wrap gap-1.5">
        {REPARTOS_RAPIDOS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => alCambiar(r)}
            aria-pressed={valor === r}
            className={cn(
              'rounded-full border px-3 py-1 font-mono text-caption transition-colors duration-base',
              valor === r ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-muted hover:bg-surface-muted',
            )}
          >
            {r} / {100 - r}
          </button>
        ))}
      </div>
      <Slider value={[valor]} min={1} max={99} step={1} onValueChange={(v) => alCambiar(v[0] ?? valor)} aria-label="Tu parte de la comisión" />
      <div className="flex items-baseline justify-between gap-3 text-body-sm">
        <span className="font-medium text-fg">Tú {valor} %</span>
        <span className="min-w-0 truncate text-right text-fg-muted">
          {otra} {100 - valor} %
        </span>
      </div>
    </div>
  );
}

interface Elegible {
  id: string;
  titulo: string;
  donde: string;
}

function ProponerComision({ abierta, alCerrar, alProponer }: { abierta: boolean; alCerrar: () => void; alProponer: () => Promise<void> }) {
  const { consignaciones } = useConsignaciones(undefined, { skip: !abierta });
  const { inmuebles: sinMandato } = useInmueblesSinConsignacion();
  const [inmueble, setInmueble] = useState<Elegible | null>(null);
  const [buscarInmueble, setBuscarInmueble] = useState('');
  const [colega, setColega] = useState<Colega | null>(null);
  const [buscarColega, setBuscarColega] = useState('');
  const [colegas, setColegas] = useState<Colega[] | null>(null);
  const [reparto, setReparto] = useState(50);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [lista, setLista] = useState<{ colega: string } | null>(null);

  const todos: Elegible[] = useMemo(() => {
    const vistos = new Set<string>();
    const out: Elegible[] = [];
    for (const c of consignaciones) {
      if (!c.propertyId || vistos.has(c.propertyId)) continue;
      vistos.add(c.propertyId);
      out.push({ id: c.propertyId, titulo: c.propertyTitle, donde: [c.propertyAddress !== c.propertyTitle ? c.propertyAddress : null, c.propertyCity].filter(Boolean).join(', ') });
    }
    for (const i of sinMandato) {
      if (vistos.has(i.propertyId)) continue;
      vistos.add(i.propertyId);
      out.push({ id: i.propertyId, titulo: i.propertyTitle, donde: [i.propertyZone !== i.propertyTitle ? i.propertyZone : null, i.propertyCity].filter(Boolean).join(', ') });
    }
    return out;
  }, [consignaciones, sinMandato]);
  const inmueblesVisibles = useMemo(() => {
    const q = sinTildes(buscarInmueble.trim());
    return (q ? todos.filter((i) => sinTildes(`${i.titulo} ${i.donde}`).includes(q)) : todos).slice(0, 50);
  }, [todos, buscarInmueble]);

  // Busca colegas por nombre con una pausa (no una consulta por letra).
  useEffect(() => {
    const q = buscarColega.trim();
    if (q.length < 2) return setColegas(null);
    let vivo = true;
    const t = setTimeout(() => {
      comisionesCompartidasApi
        .colegas(q)
        .then((r) => vivo && setColegas(r.colegas))
        .catch(() => vivo && setColegas([]));
    }, 300);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [buscarColega]);

  const cerrar = () => {
    setInmueble(null);
    setBuscarInmueble('');
    setColega(null);
    setBuscarColega('');
    setColegas(null);
    setReparto(50);
    setNota('');
    setFallo(null);
    setLista(null);
    alCerrar();
  };
  const enviar = async () => {
    if (!inmueble) return setFallo('Elige el inmueble que captaste.');
    if (!colega) return setFallo('Elige con quién compartes la comisión.');
    setGuardando(true);
    setFallo(null);
    try {
      await comisionesCompartidasApi.proponer({ propertyId: inmueble.id, agencyId: colega.id, porcentajeTuyo: reparto, ...(nota.trim() ? { nota: nota.trim() } : {}) });
      setLista({ colega: colega.nombre });
      await alProponer();
    } catch (e) {
      setFallo(mensajeParaLaPersona(e, { accion: 'proponer la comisión', porDefecto: 'No pudimos mandar la propuesta.' }));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Cajon abierto={abierta} onOpenChange={(a) => (a ? null : cerrar())}>
      <CajonCabecera
        titulo={lista ? 'Propuesta enviada' : 'Proponer comisión compartida'}
        descripcion={lista ? `Le avisamos a ${lista.colega} en Leasefy.` : 'Tú captaste el inmueble; la otra inmobiliaria trae al cliente.'}
      />
      <CajonCuerpo>
        {lista ? (
          <div className="flex flex-col items-center py-6 text-center" data-testid="comision-propuesta">
            <Ilustracion nombre="correo_enviado" tamano={112} tono="auto" alt="" />
            <p className="mt-4 text-body font-medium text-fg">Cuando {lista.colega} la acepte, te avisamos</p>
            <p className="mt-1 max-w-sm text-body-sm text-fg-muted">Mientras no te responda, puedes cambiar el reparto desde «Propusiste».</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-2">
              <p className="text-body-sm font-medium text-fg">1. El inmueble que captaste</p>
              {inmueble ? (
                <ElegidoConCambiar titulo={inmueble.titulo} detalle={inmueble.donde} alCambiar={() => setInmueble(null)} />
              ) : (
                <>
                  <SearchInput value={buscarInmueble} onChange={(e) => setBuscarInmueble(e.target.value)} onClear={() => setBuscarInmueble('')} placeholder="Buscar por título o barrio" aria-label="Buscar tus inmuebles" />
                  <ul className="max-h-60 space-y-1.5 overflow-y-auto pr-1" data-lenis-prevent>
                    {inmueblesVisibles.map((i) => (
                      <li key={i.id}>
                        <button type="button" onClick={() => setInmueble(i)} className="w-full rounded-xl border border-border px-3 py-2.5 text-left hover:bg-surface-muted" data-testid={`elegir-inmueble-${i.id}`}>
                          <span className="block truncate text-body-sm font-medium text-fg">{i.titulo}</span>
                          <span className="block truncate text-caption text-fg-subtle">{i.donde || 'Sin dirección'}</span>
                        </button>
                      </li>
                    ))}
                    {inmueblesVisibles.length === 0 ? (
                      <li className="py-6 text-center text-body-sm text-fg-muted">{todos.length === 0 ? 'Todavía no tienes inmuebles en tu portafolio.' : 'Ninguno coincide.'}</li>
                    ) : null}
                  </ul>
                </>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-body-sm font-medium text-fg">2. Con quién la compartes</p>
              {colega ? (
                <ElegidoConCambiar titulo={colega.nombre} detalle={colega.ciudad ?? 'Inmobiliaria en Leasefy'} logo={colega.logo} alCambiar={() => setColega(null)} />
              ) : (
                <>
                  <SearchInput value={buscarColega} onChange={(e) => setBuscarColega(e.target.value)} onClear={() => setBuscarColega('')} placeholder="Nombre de la inmobiliaria o del agente" aria-label="Buscar inmobiliarias" />
                  {colegas === null ? (
                    <p className="flex items-center gap-2 text-caption text-fg-subtle">
                      <MagnifyingGlass size={14} aria-hidden="true" /> Escribe al menos dos letras de su nombre.
                    </p>
                  ) : colegas.length === 0 ? (
                    <p className="text-caption text-fg-muted">No encontramos una inmobiliaria con ese nombre en Leasefy.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {colegas.map((o) => (
                        <li key={o.id}>
                          <button type="button" onClick={() => setColega(o)} className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left hover:bg-surface-muted" data-testid={`elegir-colega-${o.id}`}>
                            <LogoDeLaOtra nombre={o.nombre} logo={o.logo} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-body-sm font-medium text-fg">{o.nombre}</span>
                              {o.ciudad ? <span className="block truncate text-caption text-fg-subtle">{o.ciudad}</span> : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>

            <section className="space-y-2">
              <p className="text-body-sm font-medium text-fg">3. Cómo se reparten la comisión</p>
              <ElReparto valor={reparto} alCambiar={setReparto} otra={colega?.nombre ?? 'La otra'} />
            </section>

            <section className="space-y-1.5">
              <label htmlFor="comision-nota" className="text-body-sm font-medium text-fg">
                Una nota (opcional)
              </label>
              <Input id="comision-nota" value={nota} maxLength={500} onChange={(e) => setNota(e.target.value)} placeholder="La comisión es un canon; se paga al firmar el contrato" />
            </section>
            {fallo ? <Alert variant="danger">{fallo}</Alert> : null}
          </div>
        )}
      </CajonCuerpo>
      <CajonPie ayuda={lista ? undefined : 'Leasefy no cobra nada por esto: sólo deja constancia.'}>
        {lista ? (
          <Button hideArrow variant="outline" onClick={cerrar}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant="outline" hideArrow onClick={cerrar}>
              Cancelar
            </Button>
            <Button hideArrow isLoading={guardando} onClick={() => void enviar()} data-testid="enviar-propuesta">
              Proponer
            </Button>
          </>
        )}
      </CajonPie>
    </Cajon>
  );
}

function ElegidoConCambiar({ titulo, detalle, logo, alCambiar }: { titulo: string; detalle: string; logo?: string | null; alCambiar: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary-soft/40 px-3 py-2.5">
      {logo !== undefined ? <LogoDeLaOtra nombre={titulo} logo={logo} /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-fg">{titulo}</span>
        <span className="block truncate text-caption text-fg-subtle">{detalle || 'Sin dirección'}</span>
      </span>
      <Button size="sm" variant="ghost" hideArrow onClick={alCambiar}>
        Cambiar
      </Button>
    </div>
  );
}

/** Lo que quedó, en orden: la constancia que ven las dos partes. */
function hitosDeLaComision(c: Comision): Array<{ id: string; texto: string; cuando: string; detalle?: string }> {
  const hitos: Array<{ id: string; texto: string; cuando: string; detalle?: string }> = [
    { id: 'propuesta', texto: `${c.lado === 'capta' ? 'Propusiste' : `${c.otra.nombre} propuso`} ${c.porcentajeCapta} / ${100 - c.porcentajeCapta}`, cuando: c.creadaEn, detalle: c.quienPropone ?? undefined },
  ];
  if (c.editadaEn) hitos.push({ id: 'editada', texto: `Reparto cambiado a ${c.porcentajeCapta} / ${100 - c.porcentajeCapta}`, cuando: c.editadaEn });
  if (c.respondidaEn && c.estado === 'aceptada') hitos.push({ id: 'aceptada', texto: c.lado === 'trae' ? 'La aceptaste' : `${c.otra.nombre} la aceptó`, cuando: c.respondidaEn, detalle: c.quienResponde ?? undefined });
  if (c.respondidaEn && c.estado === 'rechazada') hitos.push({ id: 'rechazada', texto: c.lado === 'trae' ? 'No la aceptaste' : `${c.otra.nombre} no la aceptó`, cuando: c.respondidaEn, detalle: c.motivo ? `«${c.motivo}»` : undefined });
  if (c.retiradaEn) {
    if (c.respondidaEn && c.estado === 'retirada') hitos.push({ id: 'aceptada', texto: c.lado === 'trae' ? 'La aceptaste' : `${c.otra.nombre} la aceptó`, cuando: c.respondidaEn, detalle: c.quienResponde ?? undefined });
    hitos.push({ id: 'retirada', texto: c.lado === 'capta' ? 'La retiraste' : `${c.otra.nombre} la retiró`, cuando: c.retiradaEn });
  }
  return hitos;
}

function ConstanciaDeLaComision({ comision: c, alCerrar, alCambiar }: { comision: Comision | null; alCerrar: () => void; alCambiar: () => Promise<void> }) {
  const [reparto, setReparto] = useState(50);
  const [diciendoQueNo, setDiciendoQueNo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState<null | 'aceptar' | 'rechazar' | 'editar'>(null);

  useEffect(() => {
    if (!c) return;
    setReparto(c.porcentajeCapta);
    setDiciendoQueNo(false);
    setMotivo('');
  }, [c?.id, c?.porcentajeCapta]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return null;

  const estado = estadoDeLaComision(c);
  const precio = precioDelInmueble(c.inmueble);
  const puedeEditar = c.acciones.includes('editar');
  const puedeResponder = c.acciones.includes('aceptar');
  const puedeRetirar = c.acciones.includes('retirar');
  const repartoCambio = puedeEditar && reparto !== c.porcentajeCapta;

  const hacer = async (que: 'aceptar' | 'rechazar' | 'editar', trabajo: () => Promise<unknown>, exito: string) => {
    setOcupado(que);
    try {
      await trabajo();
      toast.success(exito);
      await alCambiar();
      if (que !== 'editar') alCerrar();
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { accion: 'guardar la comisión', porDefecto: 'No pudimos guardar el cambio.' }));
    } finally {
      setOcupado(null);
    }
  };
  const retirar = () =>
    confirmar({
      titulo: `¿Retirar la comisión compartida con ${c.otra.nombre}?`,
      descripcion:
        c.estado === 'aceptada'
          ? `${c.otra.nombre} ya no podrá mandar este inmueble en sus colecciones. Queda la constancia de lo que acordaron.`
          : `${c.otra.nombre} ya no la podrá aceptar. Queda la constancia.`,
      tipo: 'advertencia',
      accion: 'Retirar',
      alConfirmar: async () => {
        await comisionesCompartidasApi.retirar(c.id);
        toast.success('Retiraste la comisión compartida');
        await alCambiar();
        alCerrar();
      },
    });

  return (
    <Cajon abierto onOpenChange={(a) => (a ? null : alCerrar())}>
      <CajonCabecera titulo="Comisión compartida" descripcion={`${c.lado === 'capta' ? 'Con' : 'De'} ${c.otra.nombre}`} />
      <CajonCuerpo>
        <div className="space-y-5" data-testid="constancia-de-la-comision">
          <div className="flex items-center gap-3">
            <Miniatura foto={c.inmueble.foto} titulo={c.inmueble.titulo} grande />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-fg">{c.inmueble.titulo}</p>
              <p className="truncate text-caption text-fg-subtle">
                {[c.inmueble.codigo ? `Código ${c.inmueble.codigo}` : null, c.inmueble.barrio, c.inmueble.ciudad].filter(Boolean).join(' · ')}
              </p>
              {precio ? <p className="font-mono text-caption text-fg-muted">{precio}</p> : null}
            </div>
            <StatusBadge tone={estado.tono}>{estado.texto}</StatusBadge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-primary-soft/60 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-primary">Tú</p>
              <p className="mt-1 text-[32px] font-[420] leading-none tracking-[-0.03em] text-fg">{c.lado === 'capta' ? reparto : 100 - reparto} %</p>
              <p className="mt-1.5 text-caption text-fg-muted">{c.lado === 'capta' ? 'Captaste el inmueble' : 'Traes al cliente'}</p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="truncate font-mono text-[11px] uppercase tracking-wider text-fg-subtle">{c.otra.nombre}</p>
              <p className="mt-1 text-[32px] font-[420] leading-none tracking-[-0.03em] text-fg">{c.lado === 'capta' ? 100 - reparto : reparto} %</p>
              <p className="mt-1.5 text-caption text-fg-muted">{c.lado === 'capta' ? 'Trae al cliente' : 'Captó el inmueble'}</p>
            </div>
          </div>

          {puedeEditar ? (
            <div className="space-y-2">
              <p className="text-body-sm font-medium text-fg">Cambiar el reparto</p>
              <ElReparto valor={reparto} alCambiar={setReparto} otra={c.otra.nombre} />
            </div>
          ) : null}

          {c.nota ? <p className="rounded-2xl bg-surface-muted px-4 py-3 text-body-sm text-fg">«{c.nota}»</p> : null}

          {c.lado === 'trae' && c.estado === 'aceptada' ? (
            <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success-soft p-4" data-testid="ya-la-puedes-mostrar">
              <Ilustracion nombre="llaves" tamano={56} tono="auto" alt="" />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-fg">Ya puedes mostrárselo a tus clientes</p>
                <p className="text-caption text-fg-muted">Mándalo en una colección por WhatsApp.</p>
              </div>
              <Button asChild size="sm" hideArrow>
                <Link href={`/panel/inmobiliaria/pipeline/colecciones?nueva=1&inmueble=${encodeURIComponent(c.inmueble.id)}`}>
                  Mandar <ArrowRight size={14} className="ml-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          ) : null}

          <section className="space-y-2">
            <p className="text-body-sm font-medium text-fg">Constancia</p>
            <ol className="relative space-y-3 border-l border-border pl-5" data-testid="hitos-de-la-comision">
              {hitosDeLaComision(c).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-primary" aria-hidden="true" />
                  <p className="text-body-sm text-fg">{h.texto}</p>
                  <p className="text-caption text-fg-subtle">
                    {fecha(h.cuando)}
                    {h.detalle ? ` · ${h.detalle}` : ''}
                  </p>
                </li>
              ))}
            </ol>
            <p className="inline-flex items-center gap-1.5 pt-1 text-caption text-fg-subtle">
              <Handshake size={14} aria-hidden="true" /> Leasefy no cobra nada por esta comisión. Las dos partes ven esta constancia.
            </p>
          </section>

          {puedeResponder && diciendoQueNo ? (
            <div className="space-y-1.5">
              <label htmlFor="comision-motivo" className="text-body-sm font-medium text-fg">
                ¿Por qué no? (opcional, lo ve {c.otra.nombre})
              </label>
              <Textarea id="comision-motivo" rows={2} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ya no tengo el cliente para este inmueble" />
            </div>
          ) : null}
        </div>
      </CajonCuerpo>
      <CajonPie
        izquierda={
          puedeRetirar ? (
            <Button variant="ghost" hideArrow onClick={() => void retirar()} data-testid="retirar-comision">
              Retirar
            </Button>
          ) : undefined
        }
      >
        {puedeResponder ? (
          diciendoQueNo ? (
            <>
              <Button variant="outline" hideArrow onClick={() => setDiciendoQueNo(false)}>
                Volver
              </Button>
              <Button
                variant="destructive"
                hideArrow
                isLoading={ocupado === 'rechazar'}
                onClick={() => void hacer('rechazar', () => comisionesCompartidasApi.responder(c.id, { acepta: false, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) }), `Le dijimos a ${c.otra.nombre} que no`)}
                data-testid="confirmar-no"
              >
                No aceptar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" hideArrow onClick={() => setDiciendoQueNo(true)} data-testid="no-aceptar">
                No aceptar
              </Button>
              <Button hideArrow isLoading={ocupado === 'aceptar'} onClick={() => void hacer('aceptar', () => comisionesCompartidasApi.responder(c.id, { acepta: true }), `Aceptaste compartir la comisión con ${c.otra.nombre}`)} data-testid="aceptar-comision">
                Aceptar
              </Button>
            </>
          )
        ) : puedeEditar ? (
          <>
            <Button variant="outline" hideArrow onClick={alCerrar}>
              Cerrar
            </Button>
            <Button hideArrow disabled={!repartoCambio} isLoading={ocupado === 'editar'} onClick={() => void hacer('editar', () => comisionesCompartidasApi.editar(c.id, { porcentajeTuyo: reparto, ...(c.nota ? { nota: c.nota } : {}) }), 'Cambiaste el reparto')} data-testid="guardar-reparto">
              Guardar el reparto
            </Button>
          </>
        ) : (
          <Button variant="outline" hideArrow onClick={alCerrar}>
            Cerrar
          </Button>
        )}
      </CajonPie>
    </Cajon>
  );
}
