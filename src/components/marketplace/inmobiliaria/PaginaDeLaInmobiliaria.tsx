'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { motionDuration, motionEase, Stagger, StaggerItem } from '@leasefy/cadence';
import { ArrowLeft, Check, Copy, Globe, MagnifyingGlass, Sparkle } from '@phosphor-icons/react';

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { tieneCoordenadas } from '@/components/map/coordenadas';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { ApiError } from '@/lib/api/client';
import { marketplaceApi, type PaginaDeInmobiliaria as Pagina } from '@/lib/api/marketplace.service';
import { useAuth } from '@/lib/auth/use-auth';
import { useProperties } from '@/lib/hooks/useProperties';
import { escribirBusqueda } from '@/lib/marketplace/busqueda';
import { sugerenciasDelCatalogo } from '@/lib/marketplace/sugerencias';
import { ChatDeLaInmobiliaria } from './ChatDeLaInmobiliaria';
import { ReproductorDelVideo, type VideoParaVer } from '../ReproductorDelVideo';
import { formatCurrency } from '@/lib/format';
import {
  BotonSeguir,
  BotonWhatsapp,
  colorDe,
  LaRecomendarias,
  LogoDeLaInmobiliaria,
  numero,
  Recomienda,
  RedesDeLaInmobiliaria,
  SelloVerificada,
  TarjetaDelVideo,
  TarjetaDeOpinion,
  Tira,
} from './piezas';
import { portadaDe } from '@/lib/marketplace/portadas';
import { CorrienteDeVoltaje } from '@/components/landing-v2/CorrienteDeVoltaje';
import { cn } from '@/lib/utils';

// El mapa de MapLibre toca `window`: sólo en el navegador.
const PropertyMap = dynamic(() => import('@/components/map').then((m) => ({ default: m.PropertyMap })), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-surface-muted" />,
});

/**
 * ══ LA PÁGINA DE LA INMOBILIARIA · leasefy.co/i/<nombre> (Nico, 09-10-2026) ═
 *
 * «El perfil de la inmobiliaria reemplaza su página web»: la crea al
 * registrarse, publica sus inmuebles y ya tiene su página. Es SU chat
 * («Pregúntale a Nogal», opción 1 · Conversación primero), con lo que dicen de
 * ella quienes firmaron un contrato, sus videos y sus inmuebles. Lo que publica
 * aquí sale también en el buscador de Leasefy.
 */

function entrada(paso: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: motionDuration.slow, ease: motionEase.enter, delay: paso * 0.05 },
  };
}

function CopiarEnlace({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(`https://${texto}`)
          .then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1600);
          })
          .catch(() => undefined);
      }}
      className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 font-mono text-[12.5px] text-fg transition-colors duration-fast hover:bg-surface-muted/70"
      aria-label={`Copiar ${texto}`}
    >
      {texto}
      {copiado ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : <Copy className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />}
    </button>
  );
}

/**
 * «¿De aquí cómo me devuelvo a donde estaba?» (Nico, 09-10-2026). Con historia
 * en la pestaña, vuelve a donde estaba (el buscador, la conversación, la
 * ficha); si llegó directo por el enlace, lleva al buscador.
 */
function Volver() {
  const router = useRouter();
  const [conHistoria, setConHistoria] = useState(false);
  useEffect(() => setConHistoria(window.history.length > 1), []);
  return (
    <Link
      href="/propiedades"
      onClick={(e) => {
        if (!conHistoria) return;
        e.preventDefault();
        router.back();
      }}
      className="group inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface pl-3 pr-4 text-[14px] font-medium text-fg transition-colors duration-fast hover:bg-surface-muted active:scale-[0.98]"
      data-testid="volver"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-fast group-hover:-translate-x-0.5" aria-hidden />
      {conHistoria ? 'Volver' : 'Ir al buscador'}
    </Link>
  );
}

function Cabecera({ p }: { p: Pagina }) {
  const [seguidores, setSeguidores] = useState(p.seguidores);
  const direccion = `leasefy.co/i/${p.slug ?? p.id}`;
  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6">
      <motion.div {...entrada(0)} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Volver />
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-fg-muted">
          <Globe className="h-4 w-4" aria-hidden />
          Esta es la página de {p.nombre} en Leasefy:
          <CopiarEnlace texto={direccion} />
        </p>
      </motion.div>
      <motion.div {...entrada(1)} className="relative mt-4 h-44 overflow-hidden rounded-xl bg-surface-muted md:h-56">
        {portadaDe(p.portadaUrl) ? (
          <Image src={portadaDe(p.portadaUrl)} alt="" fill priority sizes="1280px" className="object-cover" />
        ) : (
          <>
            {/* Sin portada (Nico, 23-10: «más dots»): la corriente de voltaje de Leasefy; en oscuro, el tono de la marca. */}
            <CorrienteDeVoltaje className="absolute inset-0 h-full w-full dark:hidden" fondo="arena" forma="corrientes" fuerza={0.55} semilla={(p.nombre?.length ?? 7) + 3} />
            <span
              className="absolute inset-0 hidden dark:block"
              aria-hidden
              style={{ background: `radial-gradient(120% 140% at 0% 0%, ${colorDe(p)}55, ${colorDe(p)}14 55%, transparent)` }}
            />
          </>
        )}
      </motion.div>
      <div className="flex flex-col items-start gap-4 px-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5 md:px-6">
        <LogoDeLaInmobiliaria i={p} tamano={104} className="relative z-10 -mt-12 ring-4 ring-background" />
        <motion.div {...entrada(2)} className="min-w-0 flex-1 pt-1 sm:pt-4">
          <h1
            className="flex items-center gap-2 font-heading text-[28px] font-[420] tracking-[-0.025em] text-fg md:text-[34px]"
            data-testid="nombre-de-la-inmobiliaria"
          >
            <span className="min-w-0 break-words">{p.nombre}</span>
            {p.verificada && <SelloVerificada className="h-6 w-6" />}
          </h1>
          {p.lema && <p className="text-[14.5px] text-fg-muted">{p.lema}</p>}
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-fg-muted">
            <span>
              <span className="font-mono tabular-nums text-fg">{numero(p.inmuebles)}</span>{' '}
              {p.inmuebles === 1 ? 'inmueble' : 'inmuebles'}
            </span>
            <span data-testid="seguidores">
              <span className="font-mono tabular-nums text-fg">{numero(seguidores)}</span>{' '}
              {seguidores === 1 ? 'seguidor' : 'seguidores'}
            </span>
            {p.zonas.length > 0 && <span>{p.zonas.join(' · ')}</span>}
            <Recomienda r={p.recomendacion} conVotos />
          </p>
        </motion.div>
        <motion.div {...entrada(3)} className="flex flex-wrap items-center gap-2 sm:pt-4">
          <RedesDeLaInmobiliaria redes={p.redes} />
          {p.whatsapp && <BotonWhatsapp numero={p.whatsapp} nombre={p.nombre} />}
          <BotonSeguir i={p} alCambiar={(r) => setSeguidores(r.seguidores)} />
        </motion.div>
      </div>
    </div>
  );
}

export function PaginaDeLaInmobiliaria({ nombre }: { nombre: string }) {
  const { isAuthenticated } = useAuth();
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [falla, setFalla] = useState<'no-existe' | 'error' | null>(null);

  useEffect(() => {
    let vigente = true;
    setPagina(null);
    setFalla(null);
    marketplaceApi
      .pagina(nombre)
      .then((p) => vigente && setPagina(p))
      .catch((e) => vigente && setFalla(e instanceof ApiError && e.status === 404 ? 'no-existe' : 'error'));
    return () => {
      vigente = false;
    };
  }, [nombre]);

  // Abrió su página: lo nuevo deja de contar en «Inmobiliarias que sigues».
  useEffect(() => {
    if (pagina && isAuthenticated) marketplaceApi.visto(pagina.id).catch(() => undefined);
  }, [isAuthenticated, pagina]);

  if (falla) {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-24 text-center" data-testid="inmobiliaria-no-existe">
        <h1 className="font-heading text-[28px] font-semibold text-fg">
          {falla === 'no-existe' ? 'No encontramos esa inmobiliaria' : 'No pudimos abrir esta página'}
        </h1>
        <p className="mt-2 text-[15px] text-fg-muted">
          {falla === 'no-existe'
            ? 'Puede que haya cambiado su nombre corto. Búscala entre las inmobiliarias de Leasefy.'
            : 'Algo falló de nuestro lado. Intenta otra vez en un momento.'}
        </p>
        <Link
          href="/propiedades"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-fg hover:bg-primary-600"
        >
          Ir al buscador
        </Link>
      </div>
    );
  }

  if (!pagina) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 pt-6 md:px-6" aria-busy="true">
        <div className="mt-8 h-44 animate-pulse rounded-xl bg-surface-muted md:h-56" />
        <div className="mt-6 h-8 w-64 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  return <Contenido pagina={pagina} />;
}

/**
 * Las dos opiniones que se ven sin abrir nada: la primera que la recomienda y
 * la primera que no, en el orden en que llegan (las más nuevas primero). Sin
 * ninguna en contra, las dos primeras.
 */
export function muestrasDeLasOpiniones<T extends { recomienda: boolean }>(todas: readonly T[]): T[] {
  const si = todas.find((o) => o.recomienda);
  const no = todas.find((o) => !o.recomienda);
  if (si && no) return todas.filter((o) => o === si || o === no);
  return todas.slice(0, 2);
}

/** Las tarjetas de «Sus inmuebles» que caben en la página; el resto, en el buscador. */
const SE_VEN_AQUI = 9;

/** Ya cargada: su cabecera, su chat, lo que dicen de ella, sus videos y sus inmuebles. */
function Contenido({ pagina }: { pagina: Pagina }) {
  const [opinionesAbiertas, setOpinionesAbiertas] = useState(false);
  const { properties: suyos, meta } = useProperties(useMemo(() => ({ agencyId: pagina.id, limit: 100 }), [pagina.id]));
  const sugerencias = useMemo(() => sugerenciasDelCatalogo(suyos, 4).map((s) => s.texto), [suyos]);
  const muestras = useMemo(() => muestrasDeLasOpiniones(pagina.opiniones), [pagina.opiniones]);
  // Debajo de su chat, dónde están sus inmuebles (Nico, 16-10-2026: «sigue
  // quedando mucho espacio ahí en la izquierda… sumar algo»). Sólo los que
  // tienen ubicación; sin ninguno, no hay mapa.
  const ubicados = useMemo(() => suyos.filter((p) => tieneCoordenadas(p.latitude, p.longitude)), [suyos]);
  const barrios = useMemo(
    () => [...new Set(ubicados.map((p) => p.neighborhood?.trim() || p.city?.trim()).filter((b): b is string => !!b))].slice(0, 4),
    [ubicados],
  );
  // Tocar un precio lleva a su tarjeta en «Sus inmuebles» y la marca.
  // Si su tarjeta no está entre las que se ven aquí, abre su ficha.
  const router = useRouter();
  const [resaltado, setResaltado] = useState<string | null>(null);
  const alElegirEnElMapa = useCallback(
    (id: string) => {
      const tarjeta = document.getElementById(`inmueble-${id}`);
      if (!tarjeta) {
        router.push(`/propiedades/${id}`);
        return;
      }
      setResaltado(id);
      tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [router],
  );
  const totalSuyos = meta?.total ?? pagina.inmuebles;
  // Sus videos en el reproductor propio (Nico, 09-10-2026), con su inmueble y su precio.
  const [videoAbierto, setVideoAbierto] = useState<number | null>(null);
  const paraVer = useMemo<VideoParaVer[]>(
    () =>
      pagina.videos.map((v) => ({
        id: v.inmuebleId,
        enlace: v.enlace,
        red: v.red,
        foto: v.foto,
        titulo: v.titulo,
        lugar: v.lugar,
        href: `/propiedades/${v.inmuebleId}`,
        precio: v.canon != null ? `${formatCurrency(v.canon)} al mes` : null,
        inmobiliaria: { nombre: pagina.nombre, logoUrl: pagina.logoUrl, color: pagina.color },
      })),
    [pagina],
  );

  return (
    <div className="pb-16" data-testid="pagina-de-la-inmobiliaria">
      <Cabecera p={pagina} />

      <div className="mx-auto mt-10 grid max-w-[1280px] grid-cols-1 gap-8 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Su chat (la página ES su chat) y, debajo, el mapa de sus inmuebles,
            que crece hasta el alto de la columna de la derecha. El chat no se
            estira: estirado quedaba un hueco blanco adentro de la caja (QA del
            marketplace, 10-10-2026). */}
        <div className="flex min-w-0 flex-col gap-6">
          <section
            className="rounded-xl border border-border bg-surface p-5 shadow-sm md:p-7"
            aria-label={`Pregúntale a ${pagina.nombre}`}
          >
            <div className="flex items-center gap-3">
              <OrbeDeAgente agente="orquestador" tamano={44} decorativo />
              <div>
                <h2 className="font-heading text-[20px] font-semibold text-fg">Pregúntale a {pagina.nombre}</h2>
                <p className="text-[13.5px] text-fg-muted">
                  Conoce sus <span className="font-mono tabular-nums">{numero(pagina.inmuebles)}</span>{' '}
                  {pagina.inmuebles === 1 ? 'inmueble' : 'inmuebles'} y responde a cualquier hora. Nunca se inventa uno.
                </p>
              </div>
            </div>
            <ChatDeLaInmobiliaria inmobiliaria={{ id: pagina.id, nombre: pagina.nombre }} sugerencias={sugerencias} />
          </section>
          {ubicados.length > 0 && (
            <section
              className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
              aria-labelledby="donde-estan"
              data-testid="mapa-de-sus-inmuebles"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4 md:px-7">
                <div className="min-w-0">
                  <h2 id="donde-estan" className="font-heading text-[17px] font-semibold text-fg">
                    Dónde están sus inmuebles
                  </h2>
                  {barrios.length > 0 && <p className="truncate text-[13px] text-fg-muted">{barrios.join(' · ')}</p>}
                </div>
                <span className="text-[12.5px] text-fg-subtle">Toca un precio para verlo</span>
              </div>
              <div className="relative min-h-[220px] flex-1 border-t border-border">
                <PropertyMap
                  properties={ubicados}
                  selectedPropertyId={resaltado}
                  onPropertySelect={alElegirEnElMapa}
                  className="absolute inset-0"
                />
              </div>
            </section>
          )}
        </div>

        {/* Lo que dicen de ella: el resumen y DOS muestras, una que la
            recomienda y una que no si la hay (Nico, 16-10-2026). Todas, en un
            cajón: abrirlas aquí empujaba la página entera. */}
        <div className="space-y-4">
          <LaRecomendarias r={pagina.recomendacion} />
          {muestras.length > 0 && (
            <div className="space-y-3" data-testid="opiniones">
              {muestras.map((o) => (
                <TarjetaDeOpinion key={o.id} o={o} />
              ))}
              {pagina.opiniones.length > muestras.length && (
                <button
                  type="button"
                  onClick={() => setOpinionesAbiertas(true)}
                  aria-haspopup="dialog"
                  className="text-[13.5px] font-medium text-primary hover:underline"
                >
                  Ver las {numero(pagina.opiniones.length)} opiniones
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {pagina.videos.length > 0 && (
        <section className="mx-auto mt-12 max-w-[1280px] px-4 md:px-6" aria-labelledby="sus-videos">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="sus-videos" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
              Sus videos
            </h2>
            <span className="text-[13px] text-fg-muted">Se ven aquí mismo, sin salir de Leasefy</span>
          </div>
          <Tira className="mt-4">
            {pagina.videos.map((v, k) => (
              <TarjetaDelVideo key={v.inmuebleId} v={v} ancho={176} alAbrir={() => setVideoAbierto(k)} />
            ))}
          </Tira>
          <ReproductorDelVideo videos={paraVer} indice={videoAbierto} alCambiar={setVideoAbierto} />
        </section>
      )}

      <section className="mx-auto mt-12 max-w-[1280px] px-4 md:px-6" aria-labelledby="sus-inmuebles">
        {/* Sin «Ver los N con mapa» arriba: el mapa ya está debajo de su chat
            (Nico, 16-10-2026: «saca esto si ya metiste lo del mapa»). */}
        <h2 id="sus-inmuebles" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
          Sus inmuebles
        </h2>
        {suyos.length > 0 ? (
          <Stagger className="mt-4 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr))]">
            {suyos.slice(0, SE_VEN_AQUI).map((p) => (
              <StaggerItem key={p.id}>
                <div
                  id={`inmueble-${p.id}`}
                  className={cn(
                    'rounded-xl transition-shadow duration-base',
                    resaltado === p.id && 'ring-2 ring-primary ring-offset-4 ring-offset-background',
                  )}
                >
                  <PropertyCard property={p} />
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border px-5 py-6 text-[14.5px] text-fg-muted">
            {pagina.nombre} no tiene inmuebles publicados ahora. Síguela y te aviso cuando publique.
          </p>
        )}
        {totalSuyos > SE_VEN_AQUI && (
          <Link
            href={`/propiedades?${escribirBusqueda({ inmobiliaria: pagina.id })}&vista=lista`}
            className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
          >
            <MagnifyingGlass className="h-4 w-4" aria-hidden />
            Ver los {numero(totalSuyos)} inmuebles de {pagina.nombre}
          </Link>
        )}
        <p className="mt-6 flex items-center gap-1.5 text-[13px] text-fg-muted">
          <Sparkle className="h-4 w-4 text-primary" weight="fill" aria-hidden />
          Lo que {pagina.nombre} publica aquí sale también en el buscador de Leasefy.
        </p>
      </section>

      {/* ARCO-1 (Nico 19-10-2026): su formulario de Habeas Data. Cada
          inmobiliaria responde por los datos que tiene de cada persona. */}
      <p className="mx-auto mt-10 max-w-[1280px] px-4 text-[13px] text-fg-muted md:px-6">
        <Link
          href={`/arco/${encodeURIComponent(pagina.slug ?? pagina.id)}`}
          className="font-medium text-primary hover:underline"
          data-testid="enlace-habeas-data"
        >
          Tus datos personales
        </Link>{' '}
        en {pagina.nombre}: pide verlos, corregirlos o borrarlos (Habeas Data, Ley 1581 de 2012).
      </p>

      <Sheet open={opinionesAbiertas} onOpenChange={setOpinionesAbiertas}>
        <SheetContent side="right" size="md">
          <SheetHeader
            title={`Lo que dicen de ${pagina.nombre}`}
            description={`${numero(pagina.opiniones.length)} ${pagina.opiniones.length === 1 ? 'opinión' : 'opiniones'} de quienes firmaron un contrato con ella en Leasefy`}
          />
          <SheetBody className="space-y-3" data-testid="todas-las-opiniones">
            {pagina.opiniones.map((o) => (
              <TarjetaDeOpinion key={o.id} o={o} />
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
