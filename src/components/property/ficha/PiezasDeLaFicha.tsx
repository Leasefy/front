'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { ArrowRight, Bathtub, Bed, Car, Check, Images, Play, Ruler, ShieldCheck, Stack } from '@phosphor-icons/react';

import { PropertyCard } from '@/components/property/PropertyCard';
import { ReproductorDelVideo } from '@/components/marketplace/ReproductorDelVideo';
import {
  LogoDeLaInmobiliaria,
  Recomienda,
  SelloVerificada,
  Tira,
} from '@/components/marketplace/inmobiliaria/piezas';
import { paginaDe, type TarjetaDeInmobiliaria } from '@/lib/api/marketplace.service';
import { formatCurrency } from '@/lib/format';
import { TYPE_TO_BACKEND } from '@/lib/api/properties.mapper';
import type { PropertyFiltersParams } from '@/lib/api/properties.types';
import { useProperties } from '@/lib/hooks/useProperties';
import { costoMensual, sinDeposito } from '@/lib/marketplace/busqueda';
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
      className={cn('group relative block overflow-hidden rounded-xl bg-surface-muted', className)}
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

  return (
    <div className="relative" data-testid="mosaico-de-fotos" data-fotos={n}>
      {n === 1 ? (
        <Foto src={fotos[0]} alt={`Ver las fotos de ${titulo}`} onClick={() => onAbrir(0)} className="h-[45vh] w-full md:h-[58vh]" sizes="100vw" priority />
      ) : (
        <div className={cn('grid h-[45vh] grid-cols-1 gap-2 md:h-[58vh] md:gap-3', rejilla)}>
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

      {/* Etiquetas sobre la foto */}
      {etiquetas.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {etiquetas.map((e) => (
            <span
              key={e}
              className="rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.06em] text-white backdrop-blur-sm"
            >
              {e}
            </span>
          ))}
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
        {video ? (
          <button
            type="button"
            onClick={() => setVerVideo(0)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[14px] font-medium text-fg shadow-md backdrop-blur-sm transition-transform duration-fast hover:scale-[1.02] active:scale-[0.97]"
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
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-[14px] font-medium text-fg shadow-md backdrop-blur-sm transition-transform duration-fast hover:scale-[1.02] active:scale-[0.97]"
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

export function TotalAlMes({ p }: { p: Property }) {
  if (p.listingType === 'sale') {
    return (
      <p className="mt-4 font-mono text-[34px] font-bold tabular-nums tracking-[-0.03em] text-fg md:text-[40px]">
        {p.salePrice != null ? formatCurrency(p.salePrice) : 'Precio por confirmar'}
      </p>
    );
  }
  const costo = costoMensual(p);
  return (
    <div className="mt-4" data-testid="total-al-mes">
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-[34px] font-bold tabular-nums tracking-[-0.03em] text-fg md:text-[40px]">
          {p.monthlyRent != null ? formatCurrency(p.monthlyRent) : 'Canon por confirmar'}
        </span>
        {p.monthlyRent != null && <span className="text-[15px] text-fg-muted">al mes</span>}
      </p>
      {costo && costo.administracion > 0 && (
        <p className="mt-1 text-[14px] text-fg-muted">
          + <span className="font-mono tabular-nums">{formatCurrency(costo.administracion)}</span> de administración ={' '}
          <span className="font-mono font-semibold tabular-nums text-fg">{formatCurrency(costo.total)}</span> al mes
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
    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" data-testid="datos-clave">
      {datos.map(({ icono: Icono, texto }) => (
        <li key={texto} className="inline-flex items-center gap-1.5 text-[14.5px] text-fg">
          <Icono className="h-[18px] w-[18px] text-fg-muted" aria-hidden />
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
      className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3"
      data-testid="ofrecido-por"
    >
      <LogoDeLaInmobiliaria i={i} tamano={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-fg-muted">Ofrecido por</p>
        <p className="flex items-center gap-1 text-[15px] font-semibold text-fg">
          <span className="truncate">{p.agencyName}</span>
          {t?.verificada && <SelloVerificada />}
        </p>
      </div>
      {t && <Recomienda r={t.recomendacion} conVotos />}
      {t && (
        <Link
          href={paginaDe(t)}
          className="inline-flex items-center gap-1 text-[13.5px] font-medium text-primary hover:underline"
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
    <div className="space-y-1.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {t.verificada && (
          <span className="inline-flex items-center gap-1 text-[12px] text-fg-muted">
            <SelloVerificada className="h-3.5 w-3.5" />
            Registrada con NIT
          </span>
        )}
        <Recomienda r={t.recomendacion} />
      </p>
      <Link href={paginaDe(t)} className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
        Ver sus {t.inmuebles} {t.inmuebles === 1 ? 'inmueble' : 'inmuebles'}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/* ── Lo especial, la descripción y los costos ─────────────────────────────── */

export function LoEspecial({ p }: { p: Property }) {
  const frases = useMemo(() => {
    const r: string[] = [];
    for (const a of p.amenities ?? []) if (a?.name) r.push(a.name);
    if (p.parkingSpaces && !r.some((x) => /parqueadero/i.test(x))) r.push('Con parqueadero');
    if (p.floor) r.push(`Piso ${p.floor}`);
    if (sinDeposito(p)) r.push('Sin depósito');
    return [...new Set(r)].slice(0, 6);
  }, [p]);
  if (frases.length === 0) return null;
  return (
    <section className="mt-10" aria-labelledby="lo-especial">
      <h2 id="lo-especial" className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-fg">
        Lo especial
      </h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="lo-especial">
        {frases.map((f, k) => (
          <motion.li
            key={f}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: motionDuration.base, ease: motionEase.enter, delay: k * 0.04 }}
            className="flex items-center gap-2.5 rounded-md bg-surface-muted px-3 py-2.5 text-[14.5px] text-fg"
          >
            <Check className="h-4 w-4 shrink-0 text-primary" weight="bold" aria-hidden />
            {f}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export function Descripcion({ texto }: { texto: string | null | undefined }) {
  const [abierta, setAbierta] = useState(false);
  const limpio = (texto ?? '').trim();
  if (!limpio) return null;
  const larga = limpio.length > 420;
  return (
    <section className="mt-10" aria-labelledby="descripcion">
      <h2 id="descripcion" className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-fg">
        Descripción
      </h2>
      <p className={cn('mt-3 whitespace-pre-line text-[15.5px] leading-relaxed text-fg/80', larga && !abierta && 'line-clamp-5')}>
        {limpio}
      </p>
      {larga && (
        <button type="button" onClick={() => setAbierta((v) => !v)} className="mt-2 text-[14px] font-medium text-primary hover:underline">
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
    <section className="mt-10" aria-labelledby="costos" data-testid="costos-del-arriendo">
      <h2 id="costos" className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-fg">
        Lo que pagas al mes
      </h2>
      <dl className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-3 text-[14.5px]">
          <dt className="text-fg-muted">Canon</dt>
          <dd className="font-mono tabular-nums text-fg">{formatCurrency(costo.canon)}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-[14.5px]">
          <dt className="text-fg-muted">Administración</dt>
          <dd className="font-mono tabular-nums text-fg">
            {costo.administracion > 0 ? formatCurrency(costo.administracion) : 'Incluida o no aplica'}
          </dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
          <dt className="font-medium text-fg">Total al mes</dt>
          <dd className="font-mono font-semibold tabular-nums text-fg">{formatCurrency(costo.total)}</dd>
        </div>
      </dl>
      {sinDeposito(p) && (
        <p className="mt-3 flex items-start gap-2 text-[13.5px] leading-relaxed text-fg-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          Sin depósito: en un arriendo de vivienda la ley no permite pedirlo (Ley 820 de 2003, art. 16).
        </p>
      )}
    </section>
  );
}

/* ── Más de la inmobiliaria y similares ──────────────────────────────────── */

export function MasDeLaInmobiliaria({ p, t }: { p: Property; t: TarjetaDeInmobiliaria | undefined }) {
  const { properties } = useProperties(useMemo(() => ({ agencyId: p.agencyId ?? undefined, limit: 100 }), [p.agencyId]));
  const otros = p.agencyId ? properties.filter((x) => x.id !== p.id).slice(0, 8) : [];
  if (!p.agencyId || otros.length === 0) return null;
  return (
    <section className="mt-14" aria-labelledby="mas-de-la-inmobiliaria" data-testid="mas-de-la-inmobiliaria">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="mas-de-la-inmobiliaria" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
          Más de {p.agencyName}
        </h2>
        {t && (
          <Link href={paginaDe(t)} className="inline-flex items-center gap-1 text-[14px] font-medium text-primary hover:underline">
            Ver su página
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <Tira className="mt-4 gap-4">
        {otros.map((x) => (
          <div key={x.id} className="w-[280px] shrink-0">
            <PropertyCard property={x} />
          </div>
        ))}
      </Tira>
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
    <section className="mt-14" aria-labelledby="similares" data-testid="similares-cerca">
      <h2 id="similares" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
        Similares cerca
      </h2>
      <Tira className="mt-4 gap-4">
        {otros.map((x) => (
          <div key={x.id} className="w-[280px] shrink-0">
            <PropertyCard property={x} />
          </div>
        ))}
      </Tira>
    </section>
  );
}
