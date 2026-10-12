'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { motionDuration, motionEase, motionStagger, Stagger, StaggerItem } from '@leasefy/cadence';
import { Buildings, House, MagnifyingGlass, MapTrifold } from '@phosphor-icons/react';

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PropertyCard } from '@/components/property/PropertyCard';
import { primeraFoto } from '@/components/property/PortadaDelInmueble';
import { useProperties } from '@/lib/hooks/useProperties';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { escribirBusqueda, type Operacion } from '@/lib/marketplace/busqueda';
import { busquedaDeLaSugerencia, sugerenciasDelCatalogo } from '@/lib/marketplace/sugerencias';
import { useInmobiliariasDelMarketplace, useTarjetasDeInmobiliarias } from '@/lib/marketplace/use-inmobiliarias';
import { videoDelInmueble } from '@/lib/marketplace/video';
import { cn } from '@/lib/utils';
import { paginaDe } from '@/lib/api/marketplace.service';
import { formatCurrency } from '@/lib/format';
import { CajaDelMarketplace } from './CajaDelMarketplace';
import { InterruptorDeVista } from './InterruptorDeVista';
import { LadoDelMarketplace } from './LadoDelMarketplace';
import { PublicarDesdeElMarketplace } from './PublicarDesdeElMarketplace';
import { ReproductorDelVideo, type VideoParaVer } from './ReproductorDelVideo';
import { Recomienda, TarjetaDeInmobiliaria, TarjetaDelVideo, Tira } from './inmobiliaria/piezas';

/**
 * ══ LA ENTRADA DEL MARKETPLACE · OPCIÓN 1 (Nico, 09-10-2026) ═══════════════
 *
 * «Conversación primero»: lo que ves al entrar a «Buscar inmueble» es el
 * inicio de un chat, con la MISMA caja del chat de la plataforma. Escribes
 * como se lo dirías a alguien y Ori te contesta en una conversación
 * (`ConversacionDelMarketplace`). Debajo, lo que hay publicado: lo más nuevo,
 * las inmobiliarias que publican y los videos que subieron a sus redes.
 *
 * Todo sale del catálogo real: si no hay videos, esa sección no se pinta; si
 * no hay inmobiliarias, tampoco. Nada de cifras inventadas.
 */

function entrada(paso: number) {
  return {
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: motionDuration.slow,
      ease: motionEase.enter,
      delay: Math.min(paso * motionStagger.step, motionStagger.max),
    },
  };
}

export function InicioDelMarketplace() {
  const router = useRouter();
  const { properties, meta, isLoading } = useProperties({ limit: 100 });
  const [operacion, setOperacion] = useState<Operacion>('arriendo');

  const sugerencias = useMemo(() => sugerenciasDelCatalogo(properties, 6), [properties]);
  const recientes = properties.slice(0, 6);
  const conVideo = useMemo(() => properties.filter((p) => videoDelInmueble(p)).slice(0, 10), [properties]);
  // «Inmobiliarias en Leasefy» (Nico, 09-10: el perfil reemplaza su página web).
  const inmobiliarias = useInmobiliariasDelMarketplace(8) ?? [];
  const cuantasPublican = useMemo(() => new Set(properties.map((p) => p.agencyId).filter(Boolean)).size, [properties]);
  const deLosVideos = useTarjetasDeInmobiliarias(useMemo(() => conVideo.map((p) => p.agencyId), [conVideo]));
  // El reproductor propio (Nico, 09-10): los videos de la tira, para pasar de uno al otro.
  const [videoAbierto, setVideoAbierto] = useState<number | null>(null);
  const paraVer: VideoParaVer[] = useMemo(
    () =>
      conVideo.map((p) => {
        const video = videoDelInmueble(p)!;
        const quien = p.agencyId ? deLosVideos.get(p.agencyId) : undefined;
        const venta = p.listingType === 'sale';
        const precio = venta ? p.salePrice : p.monthlyRent;
        return {
          id: p.id,
          enlace: video.url,
          red: video.red,
          foto: primeraFoto(p) ?? null,
          titulo: p.title,
          lugar: barrioYCiudad(p.neighborhood, p.city),
          href: `/propiedades/${p.id}`,
          precio: precio != null ? `${formatCurrency(precio)}${venta ? '' : ' al mes'}` : null,
          inmobiliaria: quien
            ? { nombre: quien.nombre, logoUrl: quien.logoUrl, color: quien.color, href: paginaDe(quien) }
            : p.agencyName
              ? { nombre: p.agencyName, logoUrl: p.agencyLogoUrl ?? null }
              : null,
        };
      }),
    [conVideo, deLosVideos],
  );
  const deLosRecientes = useTarjetasDeInmobiliarias(useMemo(() => recientes.map((p) => p.agencyId), [recientes]));

  const total = meta?.total ?? properties.length;

  const conversar = (texto: string) => {
    const q = texto.trim();
    if (!q) return;
    router.push(`/propiedades?${escribirBusqueda({ q, operacion })}`);
  };

  const opciones = sugerencias.map((s, k) => ({
    id: `s${k}`,
    titulo: s.texto,
    texto: s.texto,
    icono: s.type === 'house' ? House : s.type === 'studio' ? Buildings : MagnifyingGlass,
  }));

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-[76px]" data-testid="inicio-del-marketplace">
      {/* El lado va pegado al borde (como el chat): en pantallas anchas no queda una franja vacía a su izquierda. */}
      <div className="grid grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)]">
        <LadoDelMarketplace />

        <main className="min-w-0 pb-20">
          {/* «Conversación · Galería» también en la entrada (Nico, 09-10: «¿dónde está lo de galería y chat?»). */}
          <InterruptorDeVista vista="conversacion" hrefConversacion="/propiedades" hrefGaleria="/propiedades?vista=lista" />
          <div className="mx-auto w-full max-w-[1280px]">
            {/* ── La caja, como la llegada del chat ── */}
            <section className="llegada-grises mx-auto flex max-w-[820px] flex-col items-center px-4 pb-14 pt-12 text-center sm:px-6 md:pt-20">
              <motion.div {...entrada(0)}>
                <OrbeDeAgente agente="orquestador" tamano={72} decorativo />
              </motion.div>
              <motion.h1
                {...entrada(1)}
                className="mt-6 font-heading font-semibold leading-[1.02] tracking-[-0.04em] text-fg text-[clamp(2.1rem,6vw,3.5rem)] [text-wrap:balance]"
              >
                ¿Qué estás buscando?
              </motion.h1>
              <motion.p
                {...entrada(2)}
                className="mt-4 max-w-[560px] text-[16px] leading-[1.5] text-fg-muted sm:text-[17px] [text-wrap:balance]"
              >
                Cuéntalo como se lo dirías a alguien. Ori busca entre{' '}
                <span className="font-mono tabular-nums text-fg">{isLoading ? '…' : total}</span> inmuebles
                {cuantasPublican > 0 && (
                  <>
                    {' '}
                    de <span className="font-mono tabular-nums text-fg">{cuantasPublican}</span>{' '}
                    {cuantasPublican === 1 ? 'inmobiliaria' : 'inmobiliarias'}
                  </>
                )}{' '}
                y sólo te muestra lo que de verdad existe.
              </motion.p>

              <motion.div {...entrada(3)} className="mt-7">
                <div role="tablist" aria-label="Arrendar o comprar" className="inline-flex rounded-full bg-surface-muted p-1">
                  {(['arriendo', 'venta'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      role="tab"
                      aria-selected={operacion === op}
                      onClick={() => setOperacion(op)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-[14px] transition-colors duration-fast',
                        operacion === op ? 'bg-surface font-medium text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                      )}
                    >
                      {op === 'arriendo' ? 'Arrendar' : 'Comprar'}
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div {...entrada(4)} className="relative z-10 mt-5 w-full text-left">
                <CajaDelMarketplace
                  onEnviar={conversar}
                  ejemplos={sugerencias.map((s) => s.texto)}
                  placeholder="Apartamento en Laureles, 2 habitaciones, que acepte mascotas"
                  opciones={opciones}
                />
              </motion.div>

              {sugerencias.length > 0 && (
                <motion.ul
                  aria-label="Para empezar"
                  initial="oculto"
                  animate="visible"
                  variants={{ visible: { transition: { delayChildren: 0.2, staggerChildren: 0.05 } } }}
                  className="mt-6 flex flex-wrap justify-center gap-2.5"
                >
                  {sugerencias.slice(0, 4).map((s) => (
                    <motion.li
                      key={s.texto}
                      variants={{
                        oculto: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0, transition: { duration: motionDuration.reveal, ease: motionEase.enter } },
                      }}
                    >
                      <Link
                        href={`/propiedades?${escribirBusqueda(busquedaDeLaSugerencia(s))}`}
                        className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1.5 pr-4 text-[14px] font-medium text-fg transition-[transform,border-color,box-shadow] duration-base ease-enter hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md active:scale-[0.98] motion-reduce:hover:translate-y-0"
                      >
                        <span
                          aria-hidden
                          className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-fg-muted transition-colors duration-base group-hover:bg-primary-soft group-hover:text-primary"
                        >
                          {s.type === 'house' ? <House size={15} /> : <MagnifyingGlass size={15} />}
                        </span>
                        {s.texto}
                      </Link>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </section>

            {/* ── Lo más nuevo ── */}
            {recientes.length > 0 && (
              <section className="px-4 md:px-8" aria-labelledby="recien-publicados">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id="recien-publicados" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
                    Recién publicados
                  </h2>
                  <Link
                    href="/propiedades?vista=lista"
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                  >
                    <MapTrifold className="h-4 w-4" aria-hidden />
                    Ver todo con mapa, sin escribir
                  </Link>
                </div>
                <Stagger className="mt-4 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
                  {recientes.map((p) => {
                    const quien = p.agencyId ? deLosRecientes.get(p.agencyId) : undefined;
                    return (
                      <StaggerItem key={p.id}>
                        <PropertyCard
                          property={p}
                          debajoDeQuienLoOfrece={quien ? <Recomienda r={quien.recomendacion} /> : null}
                        />
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </section>
            )}

            {/* ── Quién publica: su página es su perfil en Leasefy ── */}
            {inmobiliarias.length > 0 && (
              <section className="mt-14 px-4 md:px-8" aria-labelledby="inmobiliarias-en-leasefy">
                <h2 id="inmobiliarias-en-leasefy" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
                  Inmobiliarias en Leasefy
                </h2>
                <p className="mt-1 text-[14px] text-fg-muted">
                  Síguelas para ver lo que publican, o pregúntale directamente a cada una.
                </p>
                <Stagger className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr))]">
                  {inmobiliarias.map((t) => (
                    <StaggerItem key={t.id}>
                      <TarjetaDeInmobiliaria t={t} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {/* ── Los videos que subieron a sus redes ── */}
            {conVideo.length > 0 && (
              <section className="mt-14 px-4 md:px-8" aria-labelledby="en-video">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id="en-video" className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-fg">
                    Recórrelos en video
                  </h2>
                  <span className="text-[13px] text-fg-muted">Se ven aquí mismo, sin salir de Leasefy</span>
                </div>
                <Tira className="mt-4">
                  {conVideo.map((p, k) => {
                    const video = videoDelInmueble(p)!;
                    const quien = p.agencyId ? deLosVideos.get(p.agencyId) : undefined;
                    return (
                      <span key={p.id} data-testid="video-del-marketplace">
                        <TarjetaDelVideo
                          v={{
                            enlace: video.url,
                            red: video.red,
                            foto: primeraFoto(p) ?? null,
                            titulo: p.title,
                            lugar: barrioYCiudad(p.neighborhood, p.city),
                          }}
                          i={
                            quien ??
                            (p.agencyName ? { nombre: p.agencyName, logoUrl: p.agencyLogoUrl ?? null } : undefined)
                          }
                          ancho={164}
                          alAbrir={() => setVideoAbierto(k)}
                        />
                      </span>
                    );
                  })}
                </Tira>
              </section>
            )}

            <ReproductorDelVideo videos={paraVer} indice={videoAbierto} alCambiar={setVideoAbierto} />

            {/* ── Publicar: uno, muchos o la página, según quién mira ── */}
            <PublicarDesdeElMarketplace />
          </div>
        </main>
      </div>
    </div>
  );
}
