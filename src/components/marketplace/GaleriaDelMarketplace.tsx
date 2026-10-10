'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { ArrowsOut, CaretDown, Check, Heart, Info, MapTrifold, Play, Plus, Sparkle, X } from '@phosphor-icons/react';

import { LogoDelAdministrador } from '@/components/property/AdministradoPor';
import { PortadaDelInmueble, primeraFoto } from '@/components/property/PortadaDelInmueble';
import { propertiesApi } from '@/lib/api/properties.service';
import { formatCurrency } from '@/lib/format';
import { useProperties } from '@/lib/hooks/useProperties';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { afinarCon } from '@/lib/marketplace/afinar';
import {
  absorber,
  costoMensual,
  escribirBusqueda,
  filtrosDeLaApi,
  hayBusqueda,
  leerBusqueda,
  pastillas as pastillasDe,
  porQueTeLoMuestro,
  quitarPastilla,
  relajada,
  tituloDeLaBusqueda,
  type Busqueda,
  type FiltrosEntendidos,
  type TipoDeLaApi,
} from '@/lib/marketplace/busqueda';
import { conNombres } from '@/lib/marketplace/con-nombres';
import { IDEAS_PARA_AFINAR } from '@/lib/marketplace/ideas-para-afinar';
import { NOMBRE_DE_LA_RED, videoDelInmueble } from '@/lib/marketplace/video';
import type { Property } from '@/lib/types/property';
import { cn } from '@/lib/utils';
import { CajaDelMarketplace } from './CajaDelMarketplace';
import { InterruptorDeVista } from './InterruptorDeVista';

/**
 * ══ LA GALERÍA DEL MARKETPLACE (Nico, 09-10-2026) ══════════════════════════
 *
 * Lo que abre «Ver en una lista con mapa» desde la conversación, y «Ver todo
 * con mapa, sin escribir» desde la entrada. Nico, viendo la lista vieja: «el
 * mapa sí puede seguir pero más pequeño, lo otro un glow up». Eligió «Galería
 * + mapa flotante»: fotos grandes en columnas, «Cumplen todo» aparte de «Casi»
 * (lo que no cumple una cosa, dicho en la tarjeta), y el mapa en una tarjeta
 * pequeña que se agranda. Arriba, la caja del chat para seguir afinando.
 */

// El mapa de MapLibre toca `window`: sólo en el navegador.
const PropertyMap = dynamic(() => import('@/components/map').then((m) => ({ default: m.PropertyMap })), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-muted" />,
});

const ORDENES = [
  { valor: 'recomendado', nombre: 'Recomendado' },
  { valor: 'menor', nombre: 'Menor precio' },
  { valor: 'mayor', nombre: 'Mayor precio' },
  { valor: 'nuevo', nombre: 'Más reciente' },
] as const;
type Orden = (typeof ORDENES)[number]['valor'];

const TIPOS: { valor: TipoDeLaApi; nombre: string }[] = [
  { valor: 'APARTMENT', nombre: 'Apartamento' },
  { valor: 'HOUSE', nombre: 'Casa' },
  { valor: 'STUDIO', nombre: 'Apartaestudio' },
  { valor: 'COMMERCIAL', nombre: 'Local' },
  { valor: 'OFFICE', nombre: 'Oficina' },
];
const HASTA_ARRIENDO = [1_500_000, 2_500_000, 4_000_000, 6_000_000];

const ubicado = (p: Property) => p.latitude != null && p.longitude != null && (p.latitude !== 0 || p.longitude !== 0);
const precioDe = (p: Property) => (p.listingType === 'sale' ? p.salePrice : p.monthlyRent) ?? 0;

function millones(n: number): string {
  return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
}

function ordenar(lista: Property[], orden: Orden): Property[] {
  const copia = [...lista];
  if (orden === 'menor') copia.sort((a, b) => precioDe(a) - precioDe(b));
  if (orden === 'mayor') copia.sort((a, b) => precioDe(b) - precioDe(a));
  if (orden === 'nuevo')
    copia.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return copia;
}

/* ── La tarjeta ──────────────────────────────────────────────────────────── */

function TarjetaDeGaleria({
  p,
  explicacion,
  resaltada,
  onHover,
  refDeLaTarjeta,
}: {
  p: Property;
  explicacion: { cumple: string[]; sinDato: string[]; noCumple: string[] } | null;
  resaltada: boolean;
  onHover: (id: string | null) => void;
  refDeLaTarjeta: (el: HTMLElement | null) => void;
}) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const guardado = isWishlisted(p.id);
  const video = videoDelInmueble(p);
  const conFoto = primeraFoto(p) !== null;
  const costo = costoMensual(p);
  const venta = p.listingType === 'sale';
  const precio = venta ? p.salePrice : p.monthlyRent;

  return (
    <motion.article
      ref={refDeLaTarjeta}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      className="group"
      data-testid="tarjeta-de-galeria"
    >
      <Link href={`/propiedades/${p.id}`} className="block">
        <div
          className={cn(
            'relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted transition-shadow duration-base',
            resaltada ? 'shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background' : 'group-hover:shadow-md',
          )}
        >
          <PortadaDelInmueble
            property={p}
            conPrecioEncima
            alt={p.title}
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-reveal ease-enter group-hover:scale-[1.04]"
          />
          {/* El velo oscuro es para leer el precio sobre una foto; sin foto, el precio va en tinta. */}
          {conFoto && <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" aria-hidden />}
          {video && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
              <Play className="h-3 w-3" weight="fill" aria-hidden />
              {NOMBRE_DE_LA_RED[video.red]}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(p.id);
            }}
            aria-pressed={guardado}
            aria-label={guardado ? 'Quitar de guardados' : 'Guardar'}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-fg shadow-sm transition-transform duration-fast active:scale-[0.94]"
          >
            <Heart
              className={cn('h-4 w-4', guardado && 'text-primary')}
              weight={guardado ? 'fill' : 'regular'}
              aria-hidden
            />
          </button>
          <span className={cn('absolute inset-x-4 bottom-3', conFoto ? 'text-white' : 'text-fg')}>
            <span className="block font-mono text-[24px] font-semibold leading-none tabular-nums">
              {precio != null ? (venta ? millones(precio) : formatCurrency(precio)) : 'Por confirmar'}
              {!venta && precio != null && (
                <span className={cn('ml-1 text-[13px] font-normal', conFoto ? 'text-white/80' : 'text-fg-muted')}>al mes</span>
              )}
            </span>
            {costo && costo.administracion > 0 && (
              <span className={cn('mt-1 block text-[12.5px]', conFoto ? 'text-white/85' : 'text-fg-muted')}>
                Con administración: <span className="font-mono tabular-nums">{formatCurrency(costo.total)}</span>
              </span>
            )}
          </span>
        </div>
        <div className="space-y-2 px-1 pt-3">
          <div>
            <p className="truncate text-[15.5px] font-medium text-fg">{barrioYCiudad(p.neighborhood, p.city)}</p>
            <p className="font-mono text-[12.5px] tabular-nums text-fg-muted">
              {[
                p.bedrooms != null ? `${p.bedrooms} hab` : null,
                p.bathrooms != null ? `${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}` : null,
                p.area != null ? `${p.area} m²` : null,
              ]
                .filter(Boolean)
                .join(' · ') || p.title}
            </p>
          </div>
          {explicacion && explicacion.noCumple.length > 0 ? (
            <p className="flex items-start gap-1.5 text-[12.5px] text-fg-muted" data-testid="no-cumple">
              <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <span className="line-clamp-1">No cumple: {explicacion.noCumple.join(' · ')}</span>
            </p>
          ) : explicacion && explicacion.cumple.length > 0 ? (
            <p className="flex items-start gap-1.5 text-[12.5px] text-fg-muted" data-testid="por-que-sale">
              <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" weight="bold" aria-hidden />
              <span className="line-clamp-1">Cumple: {explicacion.cumple.join(' · ')}</span>
            </p>
          ) : null}
          {p.agencyName && (
            <p className="flex items-center gap-2 text-[13px] text-fg-muted">
              <LogoDelAdministrador
                administrador={{ agencyId: p.agencyId ?? null, nombre: p.agencyName, logoUrl: p.agencyLogoUrl ?? null }}
                tamano={20}
              />
              <span className="truncate">{p.agencyName}</span>
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  );
}

/* ── «+ Filtro» ──────────────────────────────────────────────────────────── */

function MasFiltros({ vigente, poner }: { vigente: Busqueda; poner: (c: Partial<Busqueda>) => void }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierto]);

  const opcion = (activa: boolean) =>
    cn(
      'rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-fast',
      activa
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-border bg-surface text-fg hover:border-border-strong',
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-border px-3 text-[13px] text-fg-muted transition-colors duration-fast hover:border-border-strong hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Filtro
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: motionDuration.fast } }}
            transition={{ duration: motionDuration.base, ease: motionEase.enter }}
            style={{ transformOrigin: 'top left' }}
            className="absolute left-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-2rem))] space-y-4 rounded-[20px] border border-border bg-surface p-4 shadow-[0_18px_48px_-12px_rgba(20,19,15,0.22)]"
            data-testid="mas-filtros"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Negocio</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(['arriendo', 'venta'] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    className={opcion(vigente.operacion === op)}
                    onClick={() =>
                      poner({
                        operacion: vigente.operacion === op ? undefined : op,
                        desde: undefined,
                        hasta: undefined,
                      })
                    }
                  >
                    {op === 'arriendo' ? 'Arriendo' : 'Venta'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Tipo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    className={opcion(vigente.tipo === t.valor)}
                    onClick={() => poner({ tipo: vigente.tipo === t.valor ? undefined : t.valor })}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Habitaciones</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={opcion(vigente.habitaciones === n)}
                    onClick={() => poner({ habitaciones: vigente.habitaciones === n ? undefined : n })}
                  >
                    <span className="font-mono tabular-nums">{n}</span>
                  </button>
                ))}
              </div>
            </div>
            {vigente.operacion !== 'venta' && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Canon hasta</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HASTA_ARRIENDO.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={opcion(vigente.hasta === n)}
                      onClick={() => poner({ hasta: vigente.hasta === n ? undefined : n })}
                    >
                      <span className="font-mono tabular-nums">{millones(n)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── La galería ──────────────────────────────────────────────────────────── */

export function GaleriaDelMarketplace() {
  const router = useRouter();
  const params = useSearchParams();
  const claveDeLaUrl = params.toString();
  const busqueda = useMemo(() => leerBusqueda(new URLSearchParams(claveDeLaUrl)), [claveDeLaUrl]);

  const { properties, meta, isLoading } = useProperties(useMemo(() => filtrosDeLaApi(busqueda, 100), [busqueda]));
  const entendidos: FiltrosEntendidos | null = busqueda.q ? (meta?.filtrosEntendidos ?? null) : null;
  const vigente = useMemo(() => absorber(busqueda, entendidos), [busqueda, entendidos]);
  const pastillas = useMemo(
    () => conNombres(pastillasDe(busqueda, entendidos), properties),
    [busqueda, entendidos, properties],
  );

  const [orden, setOrden] = useState<Orden>('recomendado');
  const [abiertoOrden, setAbiertoOrden] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [mapaGrande, setMapaGrande] = useState(false);
  const [afinando, setAfinando] = useState(false);
  const tarjetas = useRef<Record<string, HTMLElement | null>>({});

  const cambiar = useCallback(
    (b: Busqueda) => {
      const qs = escribirBusqueda(b);
      router.replace(`/propiedades?${qs}${qs ? '&' : ''}vista=lista`, { scroll: false });
    },
    [router],
  );
  const poner = useCallback((c: Partial<Busqueda>) => cambiar({ ...vigente, ...c }), [cambiar, vigente]);
  const afinar = useCallback(
    async (texto: string) => {
      const t = texto.trim();
      if (!t || afinando) return;
      setAfinando(true);
      try {
        cambiar(await afinarCon(busqueda, entendidos, t));
      } finally {
        setAfinando(false);
      }
    },
    [afinando, busqueda, cambiar, entendidos],
  );

  // «Casi»: si los que cumplen todo son pocos, los que no cumplen una cosa.
  const [casi, setCasi] = useState<Property[]>([]);
  const total = meta?.total ?? properties.length;
  useEffect(() => {
    setCasi([]);
    if (isLoading || total >= 6) return;
    const suelta = relajada(busqueda, entendidos);
    if (!suelta) return;
    let vigenteAun = true;
    const ya = new Set(properties.map((p) => p.id));
    propertiesApi
      .list(filtrosDeLaApi(suelta, 100))
      .then((r) => vigenteAun && setCasi(r.data.filter((p) => !ya.has(p.id)).slice(0, 9)))
      .catch(() => undefined);
    return () => {
      vigenteAun = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, claveDeLaUrl, total]);

  const cumplen = useMemo(() => ordenar(properties, orden), [properties, orden]);
  const enElMapa = useMemo(() => [...cumplen, ...casi].filter(ubicado), [cumplen, casi]);
  const explicar = (p: Property) => (hayBusqueda(busqueda) ? porQueTeLoMuestro(p, busqueda, entendidos) : null);

  const deLaInmobiliaria = busqueda.inmobiliaria ? properties.find((p) => p.agencyName)?.agencyName : null;
  const titulo = deLaInmobiliaria
    ? `${tituloDeLaBusqueda(vigente)} de ${deLaInmobiliaria}`
    : hayBusqueda(vigente)
      ? tituloDeLaBusqueda(vigente)
      : 'Todos los inmuebles';

  const alElegirEnElMapa = useCallback((id: string) => {
    setResaltado(id);
    setMapaGrande(false);
    tarjetas.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const mapa = (
    <PropertyMap
      properties={enElMapa}
      hoveredPropertyId={resaltado}
      selectedPropertyId={resaltado}
      onPropertySelect={alElegirEnElMapa}
      onPropertyHover={setResaltado}
      className="h-full w-full"
    />
  );

  const rejilla = (lista: Property[]) => (
    <div className="grid gap-x-5 gap-y-8 [grid-template-columns:repeat(auto-fill,minmax(min(270px,100%),1fr))]">
      {lista.map((p) => (
        <TarjetaDeGaleria
          key={p.id}
          p={p}
          explicacion={explicar(p)}
          resaltada={resaltado === p.id}
          onHover={setResaltado}
          refDeLaTarjeta={(el) => {
            tarjetas.current[p.id] = el;
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-[76px]" data-testid="galeria-del-marketplace">
      <InterruptorDeVista
        vista="galeria"
        hrefConversacion={hayBusqueda(vigente) ? `/propiedades?${escribirBusqueda(vigente)}` : '/propiedades'}
        hrefGaleria={`/propiedades?${claveDeLaUrl}`}
      />
      {/* ── Arriba: la misma familia que la llegada del chat (Nico, 09-10:
          «mejora eso del chat, quiero que sea más hermoso») ── */}
      {/* Sin `overflow-hidden`: recortaba el menú «Ideas para afinar» (Nico, 09-10). */}
      <header className="relative border-b border-border bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent"
        />
        <div className="llegada-grises relative mx-auto flex max-w-[980px] flex-col items-center px-4 pb-8 pt-9 text-center md:px-8 md:pt-12">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 font-mono text-[11.5px] uppercase tracking-[0.08em] text-fg-muted"
            data-testid="resumen-de-la-galeria"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {isLoading ? (
              'Buscando…'
            ) : (
              <>
                <span className="tabular-nums text-fg">{total}</span> {total === 1 ? 'cumple' : 'cumplen'} todo
                {casi.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums text-fg">{casi.length}</span> casi
                  </>
                )}
              </>
            )}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.04 }}
            className="mt-4 font-heading font-semibold leading-[1.04] tracking-[-0.04em] text-fg text-[clamp(2rem,4.6vw,3.25rem)] [text-wrap:balance]"
            data-testid="titulo-de-la-busqueda"
          >
            {titulo}
          </motion.h1>
          {busqueda.q && (
            <p className="mt-3 max-w-[60ch] text-[15.5px] text-fg-muted [text-wrap:balance]">
              Lo que Ori encontró para «{busqueda.q}». Afina escribiendo o quita lo que no quieras.
            </p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.08 }}
            className="relative z-10 mt-6 w-full max-w-[760px] text-left"
          >
            <CajaDelMarketplace
              compacta
              ocupado={isLoading || afinando}
              placeholder="Afina con Ori: «que tenga balcón», «hasta 3 millones», «en Belén»…"
              onEnviar={afinar}
              opciones={IDEAS_PARA_AFINAR}
            />
          </motion.div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2" data-testid="pastillas-de-la-busqueda">
            <AnimatePresence initial={false}>
              {pastillas.map((p) => (
                <motion.span
                  key={p.clave}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: motionDuration.fast } }}
                  className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface py-1 pl-3.5 pr-1.5 text-[13.5px] text-fg shadow-sm"
                  data-testid="pastilla"
                >
                  {p.entendida && <Sparkle className="h-3.5 w-3.5 text-primary" weight="fill" aria-hidden />}
                  {p.etiqueta}
                  <button
                    type="button"
                    onClick={() => cambiar(quitarPastilla(busqueda, entendidos, p.clave))}
                    aria-label={`Quitar ${p.etiqueta}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-muted transition-colors duration-fast hover:bg-surface-muted hover:text-fg"
                  >
                    <X className="h-3 w-3" weight="bold" aria-hidden />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <MasFiltros vigente={vigente} poner={poner} />
          </div>
        </div>
      </header>

      {/* ── La galería y el mapa flotante ── */}
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-12">
          <section aria-labelledby="cumplen-todo">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="cumplen-todo" className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Cumplen todo
              </h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAbiertoOrden((v) => !v)}
                  aria-expanded={abiertoOrden}
                  className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] text-fg hover:bg-surface-muted"
                >
                  {ORDENES.find((o) => o.valor === orden)?.nombre}
                  <CaretDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-fast', abiertoOrden && 'rotate-180')}
                    aria-hidden
                  />
                </button>
                {abiertoOrden && (
                  <div className="absolute right-0 top-full z-40 mt-1 min-w-[180px] rounded-md border border-border bg-surface p-1 shadow-md">
                    {ORDENES.map((o) => (
                      <button
                        key={o.valor}
                        type="button"
                        onClick={() => {
                          setOrden(o.valor);
                          setAbiertoOrden(false);
                        }}
                        className={cn(
                          'block w-full rounded-sm px-3 py-2 text-left text-[13.5px]',
                          orden === o.valor
                            ? 'bg-surface-muted font-medium text-fg'
                            : 'text-fg-muted hover:bg-surface-muted',
                        )}
                      >
                        {o.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isLoading ? (
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(270px,100%),1fr))]">
                {[0, 1, 2].map((k) => (
                  <div key={k} className="aspect-[4/3] animate-pulse rounded-lg bg-surface-muted" />
                ))}
              </div>
            ) : cumplen.length > 0 ? (
              rejilla(cumplen)
            ) : (
              <p className="rounded-lg border border-dashed border-border px-5 py-6 text-[14.5px] text-fg-muted">
                Ninguno cumple todo. Quita una pastilla o mira los que están cerca.
              </p>
            )}
          </section>

          {casi.length > 0 && (
            <section aria-labelledby="casi">
              <h2 id="casi" className="mb-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                Casi
              </h2>
              <p className="mb-4 text-[14px] text-fg-muted">
                Les falta una cosa de lo que pides, o no dicen si la tienen. Cada uno lo dice.
              </p>
              {rejilla(casi)}
            </section>
          )}
        </main>

        {/* El mapa, pequeño y fijo; se agranda al tocarlo. */}
        <aside className="hidden lg:block" aria-label="Mapa">
          <div className="sticky top-[150px] space-y-4">
            <div
              className="relative h-[300px] overflow-hidden rounded-lg border border-border shadow-sm"
              data-testid="mapa-flotante"
            >
              {!mapaGrande && mapa}
              <button
                type="button"
                onClick={() => setMapaGrande(true)}
                // Arriba: abajo lo tapaba el crédito del mapa al abrirse (QA, 10-10-2026).
                className="absolute left-3 top-3 z-10 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[13px] font-medium text-fg shadow-md active:scale-[0.97]"
              >
                <ArrowsOut className="h-4 w-4" aria-hidden />
                Agrandar
              </button>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-[14px] font-medium text-fg">¿Hasta cuánto puedes arrendar?</p>
              <p className="mt-1 text-[13px] text-fg-muted">
                Con tu aprobación te mostramos sólo lo que va contigo y te postulas sin codeudor.
              </p>
              <Link
                href="/aprobacion"
                className="mt-3 inline-flex text-[13.5px] font-medium text-primary hover:underline"
              >
                Conoce tu tope
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* En el celular el mapa se abre aparte. */}
      <button
        type="button"
        onClick={() => setMapaGrande(true)}
        className="fixed bottom-5 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-fg px-5 py-3 text-[14px] font-medium text-bg shadow-lg active:scale-[0.97] lg:hidden"
      >
        <MapTrifold className="h-4 w-4" aria-hidden />
        Ver en el mapa
      </button>

      <AnimatePresence>
        {mapaGrande && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionDuration.base }}
            className="fixed inset-0 z-50 bg-black/40 p-3 md:p-10"
            onClick={() => setMapaGrande(false)}
            data-testid="mapa-grande"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
              className="relative mx-auto h-full max-w-[1280px] overflow-hidden rounded-xl bg-surface shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {mapa}
              <button
                type="button"
                onClick={() => setMapaGrande(false)}
                aria-label="Cerrar el mapa"
                className="absolute left-3 top-3 z-10 inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-[14px] font-medium text-fg shadow-md"
              >
                <X className="h-4 w-4" aria-hidden />
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
