'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { ArrowRight, Bathtub, Bed, Car, CaretLeft, CaretRight, Check, Images, Play, Ruler, ShieldCheck, Stack } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';

import { PropertyCard } from '@/components/property/PropertyCard';
import { ReproductorDelVideo } from '@/components/marketplace/ReproductorDelVideo';
import {
  LogoDeLaInmobiliaria,
  Recomienda,
  SelloVerificada,
} from '@/components/marketplace/inmobiliaria/piezas';
import { paginaDe, type TarjetaDeInmobiliaria } from '@/lib/api/marketplace.service';
import { formatCurrency } from '@/lib/format';
import { TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';
import { useProperties } from '@/lib/hooks/useProperties';
import { costoMensual, sinDeposito } from '@/lib/marketplace/busqueda';
import { caracteristicasPorGrupo } from '@/lib/inmuebles/caracteristicas';
import type { RedDelVideo } from '@/lib/marketplace/video';
import type { Property } from '@/lib/types/property';
import { cn } from '@/lib/utils';

/**
 * ══ LA FICHA DEL INMUEBLE (Nico, 09-10-2026: «quiero que sea perfecta») ═════
 *
 * El plano salió de Redfin, Zillow y Realtor (`ficha-del-inmueble-plano-09-10`):
 * el mosaico que se acomoda a cuántas fotos hay (nunca un hueco gris), el
 * total al mes, la inmobiliaria arriba sin bajar, «Lo especial», los costos y
 * «Más de la inmobiliaria». Nada de vistas, guardados ni «alta demanda»: no
 * hay datos de eso.
 */

/**
 * Ronda 30 (diseño nuevo, 23-10-2026): la ficha toma la cara de la página de
 * muestra (`marketplace/ficha`): títulos de sección livianos y grandes en vez
 * de 20 px en negrilla, cajas de 20–28 px de esquina, sin sombras ni vidrio.
 * Las cifras y el orden son los de siempre; sólo cambia cómo se ven.
 */
export const TITULO_DE_SECCION =
  'text-[clamp(24px,2.1vw,30px)] font-normal leading-[1.15] tracking-[-0.025em] text-fg text-balance';
/** El aire entre secciones de la columna izquierda (44 a 64 px). */
export const AIRE_DE_SECCION = 'mt-[clamp(44px,5vw,64px)]';

const DIA = 86_400_000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function publicadoHace(fecha: string | undefined, ahora = Date.now()): string | null {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (!Number.isFinite(t)) return null;
  const dias = Math.floor((ahora - t) / DIA);
  if (dias <= 0) return 'Publicado hoy';
  if (dias === 1) return 'Publicado ayer';
  if (dias < 60) return `Publicado hace ${dias} días`;
  const d = new Date(t);
  return `Publicado el ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/* ── El mosaico ──────────────────────────────────────────────────────────── */

function Foto({
  src,
  alt,
  onClick,
  className,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  onClick: () => void;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt}
      className={cn('group relative block cursor-zoom-in overflow-hidden rounded-[18px] bg-surface-muted md:rounded-lg', className)}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-reveal ease-enter group-hover:scale-[1.03]"
        />
      ) : null}
    </button>
  );
}

/** «Ver las N fotos» y «Ver el video»: blanco sólido, sin sombra ni vidrio (ronda 30). */
const BOTON_SOBRE_LA_FOTO =
  'inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-[14px] font-medium text-[#121110] transition-colors duration-fast hover:bg-[#E9EDFF] active:scale-[0.97] [@media(pointer:coarse)]:h-11';

/**
 * 1 foto: a lo ancho. 2: mitad y mitad. 3: una grande y dos. 4: una grande y
 * tres. 5 o más: una grande y cuatro (como Zillow). En el celular, la primera
 * a todo el ancho con «1/N».
 */
export function MosaicoDeFotos({
  fotos,
  titulo,
  video,
  etiquetas,
  onAbrir,
}: {
  fotos: string[];
  titulo: string;
  video: { url: string; red: RedDelVideo } | null;
  etiquetas: string[];
  onAbrir: (indice: number) => void;
}) {
  const n = fotos.length;
  const chicas = fotos.slice(1, n >= 5 ? 5 : n);
  // El video se ve aquí mismo, en el reproductor propio (Nico, 09-10-2026).
  const [verVideo, setVerVideo] = useState<number | null>(null);
  const rejilla =
    n === 2
      ? 'md:grid-cols-2'
      : n === 3
        ? 'md:grid-cols-3 md:grid-rows-2'
        : n === 4
          ? 'md:grid-cols-3 md:grid-rows-3'
          : 'md:grid-cols-4 md:grid-rows-2';
  const grande =
    n === 2 ? '' : n === 3 ? 'md:col-span-2 md:row-span-2' : n === 4 ? 'md:col-span-2 md:row-span-3' : 'md:col-span-2 md:row-span-2';

  // Ronda 30 (diseño nuevo): el alto de la muestra — en el celular la primera
  // foto hasta 420 px; desde 768, entre 380 y 600 px — y 10 px entre fotos.
  const alto = 'h-[min(46vh,420px)] md:h-[clamp(380px,58vh,600px)]';
  return (
    <div className="relative" data-testid="mosaico-de-fotos" data-fotos={n}>
      {n === 1 ? (
        <Foto src={fotos[0]} alt={`Ver las fotos de ${titulo}`} onClick={() => onAbrir(0)} className={cn(alto, 'w-full')} sizes="100vw" priority />
      ) : (
        <div className={cn('grid grid-cols-1 gap-2.5', alto, rejilla)}>
          <Foto
            src={fotos[0]}
            alt={`Ver las fotos de ${titulo}`}
            onClick={() => onAbrir(0)}
            className={cn('h-full', grande)}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          {chicas.map((f, k) => (
            <Foto
              key={`${k}-${f}`}
              src={f}
              alt={`Foto ${k + 2} de ${titulo}`}
              onClick={() => onAbrir(k + 1)}
              className="hidden h-full md:block"
              sizes="25vw"
            />
          ))}
        </div>
      )}

      {/* Etiquetas sobre la foto. Ronda 30 (diseño nuevo): papel blanco con
          letra de 13 px en mono —antes negro translúcido con vidrio y 11 px—
          y el cuadrito de voltaje en la primera. */}
      {etiquetas.length > 0 && (
        <div className="pointer-events-none absolute left-3.5 top-3.5 z-[2] flex flex-wrap gap-1.5">
          {etiquetas.map((e, k) => (
            <span
              key={e}
              className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-white px-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-[#121110]"
            >
              {k === 0 && <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" aria-hidden />}
              {e}
            </span>
          ))}
        </div>
      )}

      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-[2] flex items-end justify-between gap-2">
        {video ? (
          <button
            type="button"
            onClick={() => setVerVideo(0)}
            className={BOTON_SOBRE_LA_FOTO}
            data-testid="ver-el-video"
          >
            <Play className="h-4 w-4 text-primary" weight="fill" aria-hidden />
            Ver el video
          </button>
        ) : (
          <span />
        )}
        {video && (
          <ReproductorDelVideo
            videos={[{ id: titulo, enlace: video.url, red: video.red, foto: fotos[0] ?? null, titulo, lugar: '' }]}
            indice={verVideo}
            alCambiar={setVerVideo}
          />
        )}
        {n > 1 && (
          <button
            type="button"
            onClick={() => onAbrir(0)}
            className={BOTON_SOBRE_LA_FOTO}
            data-testid="ver-todas-las-fotos"
          >
            <Images className="h-4 w-4" aria-hidden />
            <span className="md:hidden font-mono tabular-nums">1/{n}</span>
            <span className="hidden md:inline">Ver las {n} fotos</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Lo de arriba: el total, los datos clave y quién lo ofrece ───────────── */

/** La cifra grande de arriba: mono liviana, como la muestra (antes 34–40 px en negrilla). */
const CIFRA_GRANDE = 'font-mono text-[clamp(32px,3vw,42px)] font-normal leading-[1.1] tabular-nums tracking-[-0.03em] text-fg';

export function TotalAlMes({ p }: { p: Property }) {
  if (p.listingType === 'sale') {
    return (
      <p className={cn('mt-[22px]', CIFRA_GRANDE)}>
        {p.salePrice != null ? formatCurrency(p.salePrice) : 'Precio por confirmar'}
      </p>
    );
  }
  const costo = costoMensual(p);
  return (
    <div className="mt-[22px]" data-testid="total-al-mes">
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className={CIFRA_GRANDE}>
          {p.monthlyRent != null ? formatCurrency(p.monthlyRent) : 'Canon por confirmar'}
        </span>
        {p.monthlyRent != null && <span className="text-[15px] text-fg-muted">al mes</span>}
      </p>
      {costo && costo.administracion > 0 && (
        <p className="mt-1 text-[14px] text-fg-muted">
          + <span className="font-mono tabular-nums">{formatCurrency(costo.administracion)}</span> de administración ={' '}
          <span className="font-mono font-medium tabular-nums text-fg">{formatCurrency(costo.total)}</span> al mes
        </p>
      )}
    </div>
  );
}

export function DatosClave({ p }: { p: Property }) {
  const datos = [
    p.bedrooms != null ? { icono: Bed, texto: `${p.bedrooms} ${p.bedrooms === 1 ? 'habitación' : 'habitaciones'}` } : null,
    p.bathrooms != null ? { icono: Bathtub, texto: `${p.bathrooms} ${p.bathrooms === 1 ? 'baño' : 'baños'}` } : null,
    p.area ? { icono: Ruler, texto: `${p.area} m²` } : null,
    p.parkingSpaces ? { icono: Car, texto: `${p.parkingSpaces} ${p.parkingSpaces === 1 ? 'parqueadero' : 'parqueaderos'}` } : null,
    p.stratum ? { icono: Stack, texto: `Estrato ${p.stratum}` } : null,
  ].filter((d): d is { icono: typeof Bed; texto: string } => d !== null);
  if (datos.length === 0) return null;
  return (
    <ul className="mt-3.5 flex flex-wrap gap-x-[18px] gap-y-2" data-testid="datos-clave">
      {datos.map(({ icono: Icono, texto }) => (
        <li key={texto} className="inline-flex items-center gap-2 text-[14px] text-fg">
          <Icono className="h-[18px] w-[18px] text-fg-subtle" aria-hidden />
          <span className="font-mono tabular-nums">{texto}</span>
        </li>
      ))}
    </ul>
  );
}

/** «Ofrecido por [logo] Nogal ✓ · 96 % la recomienda · Ver su página», sin bajar. */
export function OfrecidoPor({
  p,
  t,
}: {
  p: Property;
  t: TarjetaDeInmobiliaria | undefined;
}) {
  if (!p.agencyName) return null;
  const i = t ?? { nombre: p.agencyName, logoUrl: p.agencyLogoUrl ?? null, color: null };
  return (
    <div
      className="mt-[26px] flex flex-wrap items-center gap-x-[18px] gap-y-3 rounded-[20px] border border-border-faint bg-surface px-[18px] py-3.5"
      data-testid="ofrecido-por"
    >
      <LogoDeLaInmobiliaria i={i} tamano={40} />
      {/*
        El nombre entero, nunca «Portofino…» (Juan, 21-10-2026: en el celular
        «las palabras se nos quedan» cortadas). `min-w-[12rem]`: si no cabe con
        «% la recomienda» al lado, eso baja a la línea siguiente y el nombre se
        queda con el ancho; si aun así no cabe, parte en dos líneas.
      */}
      <div className="min-w-[12rem] flex-1">
        <p className="text-[13px] text-fg-subtle">Ofrecido por</p>
        <p className="flex items-start gap-1.5 text-[15.5px] font-medium leading-[1.3] text-fg">
          <span className="min-w-0 break-words">{p.agencyName}</span>
          {t?.verificada && <SelloVerificada className="mt-0.5 shrink-0" />}
        </p>
      </div>
      {t && <Recomienda r={t.recomendacion} conVotos className="text-[13px]" />}
      {t && (
        <Link
          href={paginaDe(t)}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline hover:underline-offset-4"
        >
          Ver su página
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** Para la tarjeta de la derecha: el sello, «% la recomienda» y «Ver sus N inmuebles». */
export function SobreLaInmobiliaria({ t }: { t: TarjetaDeInmobiliaria }) {
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {t.verificada && (
          <span className="inline-flex items-center gap-[5px] text-[13px] text-fg-muted">
            <SelloVerificada className="h-[15px] w-[15px]" />
            Registrada con NIT
          </span>
        )}
        <Recomienda r={t.recomendacion} className="text-[13px]" />
      </p>
      <Link href={paginaDe(t)} className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary hover:underline hover:underline-offset-4">
        Ver sus {t.inmuebles} {t.inmuebles === 1 ? 'inmueble' : 'inmuebles'}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/* ── Lo especial, la descripción y los costos ─────────────────────────────── */

/** Cuántas cosas caben en «Lo especial». */
const MAXIMO_DE_LO_ESPECIAL = 6;

/**
 * Lo que va en «Lo especial»: las características primero y, al final, el
 * parqueadero, el piso y «Sin depósito». Esos tres tienen su lugar guardado
 * (21-10-2026): con la lista ampliada a 41, seis características empujaban
 * «Sin depósito» fuera de la ficha.
 */
export function frasesDeLoEspecial(p: Property): { frases: string[]; caracteristicasMostradas: number } {
  const nombres = [...new Set((p.amenities ?? []).map((a) => a?.name).filter((n): n is string => !!n))];
  const extras: string[] = [];
  if (p.parkingSpaces && !nombres.some((x) => /parqueadero/i.test(x))) extras.push('Con parqueadero');
  if (p.floor) extras.push(`Piso ${p.floor}`);
  if (sinDeposito(p)) extras.push('Sin depósito');
  const caben = Math.max(0, MAXIMO_DE_LO_ESPECIAL - extras.length);
  const mostradas = nombres.slice(0, caben);
  return { frases: [...mostradas, ...extras], caracteristicasMostradas: mostradas.length };
}

export function LoEspecial({ p }: { p: Property }) {
  const frases = useMemo(() => frasesDeLoEspecial(p).frases, [p]);
  if (frases.length === 0) return null;
  return (
    <section className={AIRE_DE_SECCION} aria-labelledby="lo-especial">
      <h2 id="lo-especial" className={TITULO_DE_SECCION}>
        Lo especial
      </h2>
      <ul className="mt-4 grid gap-2 min-[561px]:grid-cols-2" data-testid="lo-especial">
        {frases.map((f, k) => (
          <motion.li
            key={f}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: motionDuration.base, ease: motionEase.enter, delay: k * 0.04 }}
            className="flex items-center gap-2.5 rounded-md bg-surface-muted px-3.5 py-3 text-[15px] text-fg"
          >
            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {f}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Todas las características, en sus tres grupos (Juan, 21-10-2026: la
 * competencia muestra «Características & comodidades» completas). Sólo sale
 * cuando hay más de las que caben en «Lo especial»: con pocas, repetirlas
 * sería ruido.
 */
export function CaracteristicasDelInmueble({ p }: { p: Property }) {
  const grupos = useMemo(() => {
    const ids = new Set((p.amenities ?? []).map((a) => a?.id).filter(Boolean));
    return caracteristicasPorGrupo()
      .map((g) => ({ ...g, items: g.items.filter((c) => ids.has(c.id)) }))
      .filter((g) => g.items.length > 0);
  }, [p]);
  const total = grupos.reduce((n, g) => n + g.items.length, 0);
  if (total === 0 || total <= frasesDeLoEspecial(p).caracteristicasMostradas) return null;
  return (
    <section className={AIRE_DE_SECCION} aria-labelledby="caracteristicas-del-inmueble" data-testid="caracteristicas-del-inmueble">
      <h2 id="caracteristicas-del-inmueble" className={TITULO_DE_SECCION}>
        Características <span className="font-mono text-[15px] font-normal tabular-nums text-fg-muted">{total}</span>
      </h2>
      <div className="mt-4 space-y-5">
        {grupos.map((g) => (
          <div key={g.grupo}>
            <h3 className="font-mono text-[13px] font-normal uppercase tracking-[0.08em] text-fg-subtle">{g.nombre}</h3>
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 min-[400px]:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-[15px] leading-snug text-fg">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 break-words">{c.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Descripcion({ texto }: { texto: string | null | undefined }) {
  const [abierta, setAbierta] = useState(false);
  const limpio = (texto ?? '').trim();
  if (!limpio) return null;
  const larga = limpio.length > 420;
  return (
    <section className={AIRE_DE_SECCION} aria-labelledby="descripcion">
      <h2 id="descripcion" className={TITULO_DE_SECCION}>
        Descripción
      </h2>
      <p className={cn('mt-4 whitespace-pre-line text-[15.5px] leading-[1.6] text-fg-muted', larga && !abierta && 'line-clamp-5')}>
        {limpio}
      </p>
      {larga && (
        <button type="button" onClick={() => setAbierta((v) => !v)} className="mt-2 text-[14px] font-medium text-primary hover:underline hover:underline-offset-4">
          {abierta ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </section>
  );
}

/** «Lo que pagas»: primero lo obligatorio; en vivienda, sin depósito (Ley 820, art. 16). */
export function CostosDelArriendo({ p }: { p: Property }) {
  const costo = costoMensual(p);
  if (!costo) return null;
  return (
    <section className={AIRE_DE_SECCION} aria-labelledby="costos" data-testid="costos-del-arriendo">
      <h2 id="costos" className={TITULO_DE_SECCION}>
        Lo que pagas al mes
      </h2>
      <dl className="mt-4 divide-y divide-border-faint overflow-hidden rounded-[20px] border border-border-faint bg-surface">
        <div className="flex items-baseline justify-between gap-4 px-[18px] py-3.5 text-[15px]">
          <dt className="text-fg-muted">Canon</dt>
          <dd className="text-right font-mono tabular-nums text-fg">{formatCurrency(costo.canon)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-[18px] py-3.5 text-[15px]">
          <dt className="text-fg-muted">Administración</dt>
          <dd className="text-right font-mono tabular-nums text-fg">
            {costo.administracion > 0 ? formatCurrency(costo.administracion) : 'Incluida o no aplica'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 px-[18px] py-3.5 text-[15px]">
          <dt className="font-medium text-fg">Total al mes</dt>
          <dd className="text-right font-mono font-medium tabular-nums text-fg">{formatCurrency(costo.total)}</dd>
        </div>
      </dl>
      {sinDeposito(p) && (
        <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-normal text-fg-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          Sin depósito: en un arriendo de vivienda la ley no permite pedirlo (Ley 820 de 2003, art. 16).
        </p>
      )}
    </section>
  );
}

/* ── Más de la inmobiliaria y similares ──────────────────────────────────── */

/**
 * La tira de tarjetas con sus dos flechas (ronda 30, diseño nuevo): en el
 * escritorio, «‹ ›» corren la tira lo que mide a la vista; con el dedo (o bajo
 * 720 px) no hay flechas, se desliza. Las tarjetas son las del marketplace
 * (`PropertyCard`), tal cual.
 */
function TiraConFlechas({
  titulo,
  tituloId,
  derecha,
  conFlechas = true,
  children,
}: {
  titulo: ReactNode;
  tituloId: string;
  derecha?: ReactNode;
  conFlechas?: boolean;
  children: ReactNode;
}) {
  const tira = useRef<HTMLDivElement>(null);
  const correr = (dir: -1 | 1) => {
    const el = tira.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth - 48, 288), behavior: 'smooth' });
  };
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <h2 id={tituloId} className={TITULO_DE_SECCION}>
          {titulo}
        </h2>
        {(conFlechas || derecha) && (
          <div className="flex items-center gap-3.5">
            {conFlechas && (
              <div className="hidden gap-2 min-[721px]:flex [@media(pointer:coarse)]:!hidden">
                <Button type="button" size="icon" variant="outline" className="h-10 w-10 text-fg-muted" onClick={() => correr(-1)} aria-label="Ver los anteriores">
                  <CaretLeft className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" size="icon" variant="outline" className="h-10 w-10 text-fg-muted" onClick={() => correr(1)} aria-label="Ver los siguientes">
                  <CaretRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            )}
            {derecha}
          </div>
        )}
      </div>
      <div
        ref={tira}
        className="-mx-1 mt-1 flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto px-1 pb-3 pt-[18px] [scrollbar-width:thin]"
      >
        {children}
      </div>
    </>
  );
}

const TARJETA_DE_LA_TIRA = 'w-[min(78vw,300px)] shrink-0 snap-start min-[561px]:w-[288px]';

export function MasDeLaInmobiliaria({ p, t }: { p: Property; t: TarjetaDeInmobiliaria | undefined }) {
  const { properties } = useProperties(useMemo(() => ({ agencyId: p.agencyId ?? undefined, limit: 100 }), [p.agencyId]));
  const otros = p.agencyId ? properties.filter((x) => x.id !== p.id).slice(0, 8) : [];
  if (!p.agencyId || otros.length === 0) return null;
  return (
    <section className="mt-[clamp(56px,6vw,88px)]" aria-labelledby="mas-de-la-inmobiliaria" data-testid="mas-de-la-inmobiliaria">
      <TiraConFlechas
        titulo={<>Más de {p.agencyName}</>}
        tituloId="mas-de-la-inmobiliaria"
        conFlechas={otros.length > 1}
        derecha={
          t ? (
            <Link href={paginaDe(t)} className="inline-flex items-center gap-1.5 text-[15px] font-medium text-primary hover:underline hover:underline-offset-4">
              Ver su página
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : undefined
        }
      >
        {otros.map((x) => (
          <div key={x.id} className={TARJETA_DE_LA_TIRA}>
            <PropertyCard property={x} />
          </div>
        ))}
      </TiraConFlechas>
    </section>
  );
}

export function SimilaresCerca({ p }: { p: Property }) {
  const { properties } = useProperties(
    useMemo(
      () => ({
        city: p.city || undefined,
        propertyType: TYPE_TO_BACKEND[p.type] as PropertyFiltersParams['propertyType'],
        limit: 100,
      }),
      [p.city, p.type],
    ),
  );
  const otros = properties.filter((x) => x.id !== p.id && x.agencyId !== p.agencyId).slice(0, 8);
  if (otros.length === 0) return null;
  return (
    <section className="mt-[clamp(56px,6vw,88px)]" aria-labelledby="similares" data-testid="similares-cerca">
      <TiraConFlechas titulo="Similares cerca" tituloId="similares" conFlechas={otros.length > 4}>
        {otros.map((x) => (
          <div key={x.id} className={TARJETA_DE_LA_TIRA}>
            <PropertyCard property={x} />
          </div>
        ))}
      </TiraConFlechas>
    </section>
  );
}
