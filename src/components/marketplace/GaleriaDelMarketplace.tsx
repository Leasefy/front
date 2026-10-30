'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase, Ilustracion } from '@leasefy/cadence';
import { ArrowsOut, CaretDown, Check, Heart, Info, MapTrifold, Play, Plus, X } from '@phosphor-icons/react';

import { LogoDelAdministrador } from '@/components/property/AdministradoPor';
import { PortadaDelInmueble } from '@/components/property/PortadaDelInmueble';
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
import { OlaEnPapel } from '@/components/landing-v2/CamposDeLaMarca';

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
  const costo = costoMensual(p);
  const venta = p.listingType === 'sale';
  const precio = venta ? p.salePrice : p.monthlyRent;

  // Ronda 30 (diseño nuevo del marketplace): la foto sin velo; el precio en una marca de papel blanco abajo a
  // la izquierda (antes, letra blanca sobre un degradado oscuro); guardar en un círculo blanco que se pinta de
  // voltaje; debajo, el lugar, lo que se sabe en mono, por qué sale y quién lo administra.
  return (
    <motion.article
      ref={refDeLaTarjeta}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      onMouseEnter={() => onHover(p.id)}
      onMouseLeave={() => onHover(null)}
      className="group min-w-0"
      data-testid="tarjeta-de-galeria"
    >
      <Link
        href={`/propiedades/${p.id}`}
        className="block transition-transform duration-base ease-enter hover:-translate-y-0.5 active:scale-[0.99] motion-reduce:hover:translate-y-0"
      >
        <div
          className={cn(
            'relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted',
            resaltada && 'outline outline-2 outline-offset-[3px] outline-primary',
          )}
        >
          <PortadaDelInmueble
            property={p}
            conPrecioEncima
            alt={p.title}
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="object-cover transition-transform duration-[700ms] ease-enter group-hover:scale-[1.04]"
          />
          {video && (
            <span className="absolute left-3 top-3 z-[2] inline-flex h-6 items-center gap-1.5 rounded-sm bg-white px-[9px] font-mono text-[11px] uppercase tracking-[0.08em] text-[#121110]">
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
            className={cn(
              'absolute right-3 top-3 z-[3] inline-flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white transition-[color,transform] duration-fast active:scale-[0.94]',
              guardado ? 'text-primary' : 'text-[#121110]',
            )}
          >
            <Heart className="h-[18px] w-[18px]" weight={guardado ? 'fill' : 'regular'} aria-hidden />
          </button>
          <span className="pointer-events-none absolute bottom-3 left-3 z-[2] inline-flex h-9 items-center gap-[5px] rounded-[12px] bg-white px-3 font-mono text-[17px] leading-none tracking-[-0.01em] tabular-nums text-[#121110]">
            {precio != null ? (venta ? millones(precio) : formatCurrency(precio)) : 'Por confirmar'}
            {!venta && precio != null && (
              <span className="font-sans text-[13px] tracking-normal text-[#706B64]">al mes</span>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-[5px] px-0.5 pt-3">
          <p className="truncate text-[15.5px] font-[450] tracking-[-0.01em] text-fg transition-colors duration-base group-hover:text-primary">
            {barrioYCiudad(p.neighborhood, p.city)}
          </p>
          <p className="truncate font-mono text-[13px] tabular-nums text-fg-muted">
            {[
              p.bedrooms != null ? `${p.bedrooms} hab` : null,
              p.bathrooms != null ? `${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}` : null,
              p.area != null ? `${p.area} m²` : null,
            ]
              .filter(Boolean)
              .join(' · ') || p.title}
          </p>
          {costo && costo.administracion > 0 && (
            <p className="text-[13px] text-fg-muted">
              Con administración: <span className="font-mono tabular-nums text-fg">{formatCurrency(costo.total)}</span>
            </p>
          )}
          {explicacion && explicacion.noCumple.length > 0 ? (
            <p className="flex items-start gap-1.5 text-[13px] text-fg-muted" data-testid="no-cumple">
              <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <span className="line-clamp-1">No cumple: {explicacion.noCumple.join(' · ')}</span>
            </p>
          ) : explicacion && explicacion.cumple.length > 0 ? (
            <p className="flex items-start gap-1.5 text-[13px] text-fg-muted" data-testid="por-que-sale">
              <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" weight="bold" aria-hidden />
              <span className="line-clamp-1">Cumple: {explicacion.cumple.join(' · ')}</span>
            </p>
          ) : null}
          {p.agencyName && (
            <p className="flex min-w-0 items-center gap-2 text-[13px] text-fg-muted">
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
      // Ronda 30 (diseño nuevo): pastillas de 34 px con esquina de 12 px; la elegida en voltaje suave.
      'inline-flex h-[34px] items-center rounded-[12px] border px-[13px] text-[13.5px] transition-colors duration-fast active:scale-[0.97]',
      activa
        ? 'border-primary bg-primary-soft text-primary'
        : 'border-border bg-surface text-fg hover:border-fg-subtle',
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex h-8 items-center gap-[5px] rounded-[11px] border border-dashed border-fg-subtle bg-surface px-3 text-[13px] text-fg-muted transition-colors duration-fast hover:text-fg"
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
            className="absolute left-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-2rem))] space-y-4 rounded-[20px] border border-border-faint bg-surface p-4 text-left shadow-[0_50px_90px_-40px_rgba(18,17,16,0.35),0_22px_40px_-22px_rgba(18,17,16,0.18)]"
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
    <div className="min-h-screen bg-background pt-[68px]" data-testid="galeria-del-marketplace">
      <InterruptorDeVista
        vista="galeria"
        hrefConversacion={hayBusqueda(vigente) ? `/propiedades?${escribirBusqueda(vigente)}` : '/propiedades'}
        hrefGaleria={`/propiedades?${claveDeLaUrl}`}
      />
      {/* ── Arriba: la misma familia que la llegada del chat (Nico, 09-10:
          «mejora eso del chat, quiero que sea más hermoso») ── */}
      {/* Sin `overflow-hidden`: recortaba el menú «Ideas para afinar» (Nico, 09-10). */}
      <header className="relative border-b border-border-faint bg-surface">
        {/* La ola en papel del home abajo del encabezado (Nico 30-10: sin los puntos de antes); se apaga antes de la línea
            de abajo para no cortarse contra ella. Sólo en claro. */}
        <OlaEnPapel
          className="absolute inset-x-0 bottom-0 h-[72%] w-full [mask-image:linear-gradient(to_top,transparent_0%,#000_28%,rgba(0,0,0,.55)_58%,transparent_95%)] dark:hidden"
          fondo="superficie"
        />
        <div className="llegada-grises relative z-[1] mx-auto flex max-w-[980px] flex-col items-center px-4 pb-8 pt-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
            className="inline-flex h-[30px] items-center gap-2 rounded-[10px] border border-border-faint bg-surface px-3 font-mono text-[11.5px] uppercase tracking-[0.08em] text-fg-subtle"
            data-testid="resumen-de-la-galeria"
          >
            <span className="h-[7px] w-[7px] rounded-[2px] bg-primary" aria-hidden />
            {isLoading ? (
              'Buscando…'
            ) : (
              <>
                <span className="font-medium tabular-nums text-fg">{total}</span> {total === 1 ? 'cumple' : 'cumplen'} todo
                {casi.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-medium tabular-nums text-fg">{casi.length}</span> casi
                  </>
                )}
              </>
            )}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.04 }}
            className="mt-4 font-heading text-[clamp(32px,4.4vw,56px)] font-[360] leading-[1.04] tracking-[-0.04em] text-fg [text-wrap:balance]"
            data-testid="titulo-de-la-busqueda"
          >
            {titulo}
          </motion.h1>
          {busqueda.q && (
            <p className="mt-2.5 max-w-[60ch] text-[15.5px] text-fg-muted [text-wrap:balance]">
              Lo que Ori encontró para «{busqueda.q}». Afina escribiendo o quita lo que no quieras.
            </p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.08 }}
            className="relative z-10 mt-[22px] w-full max-w-[760px] text-left"
          >
            <CajaDelMarketplace
              compacta
              ocupado={isLoading || afinando}
              placeholder="Afina con Ori: «que tenga balcón», «hasta 3 millones», «en Belén»…"
              onEnviar={afinar}
              opciones={IDEAS_PARA_AFINAR}
            />
          </motion.div>
          <div className="mt-[18px] flex flex-wrap items-center justify-center gap-2" data-testid="pastillas-de-la-busqueda">
            <AnimatePresence initial={false}>
              {pastillas.map((p) => (
                <motion.span
                  key={p.clave}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: motionDuration.fast } }}
                  className="inline-flex h-8 items-center gap-[7px] whitespace-nowrap rounded-[11px] border border-border bg-surface py-1 pl-3 pr-1 text-[13px] text-fg"
                  data-testid="pastilla"
                >
                  {/* Lo que Ori entendió lleva el cuadrito de voltaje (Ronda 30, diseño nuevo; antes una chispa). */}
                  {p.entendida && <i className="h-1.5 w-1.5 flex-none rounded-[2px] bg-primary" aria-hidden />}
                  {p.etiqueta}
                  <button
                    type="button"
                    onClick={() => cambiar(quitarPastilla(busqueda, entendidos, p.clave))}
                    aria-label={`Quitar ${p.etiqueta}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-muted transition-colors duration-fast hover:bg-primary-soft hover:text-fg"
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
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-[clamp(16px,2.6vw,32px)] pb-10 pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-12">
          <section aria-labelledby="cumplen-todo">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="cumplen-todo" className="font-mono text-[11.5px] font-normal uppercase tracking-[0.08em] text-fg-subtle">
                Cumplen todo
              </h2>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAbiertoOrden((v) => !v)}
                  aria-expanded={abiertoOrden}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-[11px] px-3 text-[13.5px] text-fg transition-colors duration-fast hover:bg-surface-muted"
                >
                  {ORDENES.find((o) => o.valor === orden)?.nombre}
                  <CaretDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-fast', abiertoOrden && 'rotate-180')}
                    aria-hidden
                  />
                </button>
                {abiertoOrden && (
                  <div className="absolute right-0 top-full z-40 mt-1.5 min-w-[190px] rounded-[16px] border border-border-faint bg-surface p-1.5 shadow-[0_50px_90px_-40px_rgba(18,17,16,0.35),0_22px_40px_-22px_rgba(18,17,16,0.18)]">
                    {ORDENES.map((o) => (
                      <button
                        key={o.valor}
                        type="button"
                        onClick={() => {
                          setOrden(o.valor);
                          setAbiertoOrden(false);
                        }}
                        className={cn(
                          'block w-full rounded-[10px] px-3 py-[9px] text-left text-[13.5px] transition-colors duration-fast',
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
              <p className="rounded-[20px] border border-dashed border-border p-[22px] text-[14.5px] text-fg-muted">
                <Ilustracion nombre="lupa" tamano={56} className="mb-2 block" />
                Ninguno cumple todo. Quita una pastilla o mira los que están cerca.
              </p>
            )}
          </section>

          {casi.length > 0 && (
            <section aria-labelledby="casi">
              <h2 id="casi" className="mb-4 font-mono text-[11.5px] font-normal uppercase tracking-[0.08em] text-fg-subtle">
                Casi
              </h2>
              <p className="-mt-2 mb-4 text-[14px] text-fg-muted">
                Les falta una cosa de lo que pides, o no dicen si la tienen. Cada uno lo dice.
              </p>
              {rejilla(casi)}
            </section>
          )}
        </main>

        {/* El mapa, pequeño y fijo; se agranda al tocarlo. */}
        <aside className="hidden lg:block" aria-label="Mapa">
          <div className="sticky top-[152px] space-y-3.5">
            <div
              className="relative h-[300px] overflow-hidden rounded-lg border border-border-faint bg-surface-muted"
              data-testid="mapa-flotante"
            >
              {!mapaGrande && mapa}
              <button
                type="button"
                onClick={() => setMapaGrande(true)}
                // Arriba: abajo lo tapaba el crédito del mapa al abrirse (QA, 10-10-2026).
                className="absolute left-3 top-3 z-10 inline-flex h-[38px] items-center gap-[7px] rounded-[13px] border border-border bg-surface px-[15px] text-[14px] font-medium text-fg transition-colors duration-fast hover:border-fg-subtle active:scale-[0.97]"
              >
                <ArrowsOut className="h-4 w-4" aria-hidden />
                Agrandar
              </button>
            </div>
            <div className="rounded-[20px] border border-border-faint bg-surface p-4">
              <p className="text-[14.5px] font-medium text-fg">¿Hasta cuánto puedes arrendar?</p>
              <p className="mt-1 text-[13px] text-fg-muted">
                Con tu aprobación te mostramos sólo lo que va contigo y te postulas sin codeudor.
              </p>
              <Link
                href="/aprobacion"
                className="mt-2.5 inline-flex text-[13.5px] font-medium text-primary underline-offset-4 hover:underline"
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
        className="fixed bottom-[calc(18px+env(safe-area-inset-bottom,0px))] left-1/2 z-[35] inline-flex h-[46px] -translate-x-1/2 items-center gap-2 rounded-[16px] bg-fg px-5 text-[14.5px] font-medium text-bg outline outline-[3px] outline-background active:scale-[0.97] lg:hidden"
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
            className="fixed inset-0 z-50 bg-[rgba(10,12,20,0.46)] p-4 md:p-10"
            onClick={() => setMapaGrande(false)}
            data-testid="mapa-grande"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
              className="relative mx-auto h-full max-w-[1280px] overflow-hidden rounded-[28px] bg-surface-muted"
              onClick={(e) => e.stopPropagation()}
            >
              {mapa}
              <button
                type="button"
                onClick={() => setMapaGrande(false)}
                aria-label="Cerrar el mapa"
                className="absolute left-3.5 top-3.5 z-10 inline-flex h-[38px] items-center gap-[7px] rounded-[13px] border border-border bg-surface px-[15px] text-[14px] font-medium text-fg transition-colors duration-fast hover:border-fg-subtle"
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
