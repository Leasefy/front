'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble, motionDuration, motionEase } from '@leasefy/cadence';
import { MapTrifold, ShieldCheck, Sparkle, X } from '@phosphor-icons/react';

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PensamientoDelTurno } from '@/components/beta/PensamientoDelTurno';
import { PropertyCard } from '@/components/property/PropertyCard';
import { useProperties } from '@/lib/hooks/useProperties';
import { propertiesApi } from '@/lib/api/properties.service';
import { cifraEnTexto, type PasoDelPensamiento } from '@/lib/chat/pensamiento';
import {
  absorber,
  escribirBusqueda,
  filtrosDeLaApi,
  leerBusqueda,
  pastillas as pastillasDe,
  porQueTeLoMuestro,
  quitarPastilla,
  relajada,
  tituloDeLaBusqueda,
  type Busqueda,
  type ClaveDePastilla,
  type FiltrosEntendidos,
} from '@/lib/marketplace/busqueda';
import { conNombres } from '@/lib/marketplace/con-nombres';
import { afinarCon } from '@/lib/marketplace/afinar';
import { guardarReciente, leerRecientes, type BusquedaReciente } from '@/lib/marketplace/busquedas-recientes';
import { IDEAS_PARA_AFINAR } from '@/lib/marketplace/ideas-para-afinar';
import { useTarjetasDeInmobiliarias } from '@/lib/marketplace/use-inmobiliarias';
import { videoDelInmueble } from '@/lib/marketplace/video';
import { paginaDe, type TarjetaDeInmobiliaria } from '@/lib/api/marketplace.service';
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { primeraFoto } from '@/components/property/PortadaDelInmueble';
import type { Property } from '@/lib/types/property';
import { CajaDelMarketplace } from './CajaDelMarketplace';
import { formatCurrency } from '@/lib/format';
import { InterruptorDeVista } from './InterruptorDeVista';
import { ReproductorDelVideo, type VideoParaVer } from './ReproductorDelVideo';
import { LadoDelMarketplace } from './LadoDelMarketplace';
import {
  BotonSeguir,
  colorDe,
  LogoDeLaInmobiliaria,
  numero,
  Recomienda,
  SelloVerificada,
  TarjetaDelVideo,
  Tira,
} from './inmobiliaria/piezas';

/**
 * ══ LA CONVERSACIÓN DEL MARKETPLACE · OPCIÓN 1 (Nico, 09-10-2026) ══════════
 *
 * «Conversación primero»: lo que escribes es un mensaje, y Ori contesta con
 * las líneas de cómo lo pensó (las MISMAS del chat del panel), lo que entendió
 * en pastillas que se quitan, y las tarjetas de lo que cumple. Lo que escribes
 * después AFINA la misma búsqueda («que tenga balcón»). La caja de abajo es la
 * del chat de la plataforma.
 *
 * Sin modelo todavía: lo entiende el entendedor por reglas del back
 * (`meta.filtrosEntendidos`), y las tarjetas salen de la base: Ori nunca
 * inventa un inmueble. La dirección guarda la búsqueda de la última respuesta,
 * así que «Ver en una lista con mapa» y compartir el enlace muestran lo mismo.
 */

interface FotoDelTurno {
  propiedades: Property[];
  total: number;
  entendidos: FiltrosEntendidos | null;
  ms: number;
  /** Si nada cumple todo: los más cercanos (`relajada`), cada uno con lo que le falta. */
  cercanos?: { propiedades: Property[]; total: number; busqueda: Busqueda };
}

interface Turno {
  id: string;
  /** Lo que dijo la persona (o el título, si llegó por un enlace o un atajo). */
  pregunta: string;
  /** La escribió (no llegó por un atajo ni por quitar una pastilla). */
  escrita?: boolean;
  busqueda: Busqueda;
  inicio: number;
  /** Lo que contestó, guardado al terminar (los turnos viejos no vuelven a pedir). */
  foto?: FotoDelTurno;
}


/** La búsqueda sin lo que no es búsqueda (`vista`). */
function busquedaDeLaDireccion(params: URLSearchParams): Busqueda {
  return leerBusqueda(params);
}

function preguntaDe(b: Busqueda): string {
  return b.q ?? tituloDeLaBusqueda(b);
}

let contador = 0;
const nuevoId = () => `t${Date.now().toString(36)}${(contador++).toString(36)}`;

function turnoDe(pregunta: string, busqueda: Busqueda): Turno {
  return { id: nuevoId(), pregunta, busqueda, inicio: Date.now() };
}


function pasosDelTurno(turno: Turno, cargando: boolean, foto: FotoDelTurno | undefined): PasoDelPensamiento[] {
  const etiquetas = foto ? conNombres(pastillasDe(turno.busqueda, foto.entendidos), foto.propiedades).map((p) => p.etiqueta) : [];
  const pasos: PasoDelPensamiento[] = [
    {
      id: 'leer',
      fase: 'pregunta',
      texto: turno.busqueda.q || turno.escrita ? 'Leí lo que escribiste' : 'Leí lo que pediste',
      estado: 'listo',
    },
    {
      id: 'entender',
      fase: 'clasificacion',
      texto: cargando ? 'Entendiendo qué buscas' : etiquetas.length > 0 ? 'Esto es lo que buscas' : 'Lo busco tal cual lo escribiste',
      estado: cargando ? 'en_curso' : 'listo',
      ...(!cargando && etiquetas.length > 0 ? { resultado: { texto: etiquetas.join(' · ') } } : {}),
    },
  ];
  if (!cargando && foto) {
    pasos.push({
      id: 'buscar',
      fase: 'busqueda',
      texto: 'Busqué en los inmuebles disponibles',
      estado: 'listo',
      resultado:
        foto.total === 0
          ? { texto: 'ninguno cumple todo' }
          : { texto: `${cifraEnTexto(foto.total)} ${foto.total === 1 ? 'cumple' : 'cumplen'}`, cifra: foto.total, formato: 'numero' },
    });
    if (foto.total === 0 && foto.cercanos) {
      pasos.push({
        id: 'cercanos',
        fase: 'busqueda',
        texto: 'Busqué los más cercanos',
        estado: 'listo',
        resultado:
          foto.cercanos.total === 0
            ? { texto: 'tampoco hay cercanos' }
            : {
                texto: `${cifraEnTexto(foto.cercanos.total)} ${foto.cercanos.total === 1 ? 'cumple' : 'cumplen'} casi todo`,
                cifra: foto.cercanos.total,
                formato: 'numero',
              },
      });
    }
    const mostrados = foto.total > 0 ? foto.propiedades : (foto.cercanos?.propiedades ?? []);
    const nombres = [...new Set(mostrados.map((p) => p.agencyName).filter((n): n is string => !!n))];
    if (nombres.length > 0) {
      pasos.push({
        id: 'quien',
        fase: 'verificacion',
        texto: 'Revisé quién ofrece cada uno',
        estado: 'listo',
        resultado: {
          texto:
            nombres.length === 1
              ? `los ofrece ${nombres[0]}`
              : `los ofrecen ${cifraEnTexto(nombres.length)} inmobiliarias`,
        },
      });
    }
  }
  return pasos;
}

/**
 * Ori presenta a la inmobiliaria que más ofrece de lo encontrado (prototipo de
 * la opción 1, Nico 09-10-2026): cuántos son suyos, cuánto la recomiendan y
 * sus videos, con «Ver su página» y «Seguir». Sólo con datos reales.
 */
function PresentacionDeLaInmobiliaria({ t, suyos }: { t: TarjetaDeInmobiliaria; suyos: Property[] }) {
  const conVideo = useMemo(() => suyos.filter((p) => videoDelInmueble(p)).slice(0, 6), [suyos]);
  const r = t.recomendacion;
  // Sus videos se ven aquí mismo, en el reproductor propio (Nico, 09-10-2026: «que se reproduzca dentro»).
  const [videoAbierto, setVideoAbierto] = useState<number | null>(null);
  const paraVer = useMemo<VideoParaVer[]>(
    () =>
      conVideo.map((p) => {
        const v = videoDelInmueble(p)!;
        const venta = p.listingType === 'sale';
        const precio = venta ? p.salePrice : p.monthlyRent;
        return {
          id: p.id,
          enlace: v.url,
          red: v.red,
          foto: primeraFoto(p) ?? null,
          titulo: p.title,
          lugar: barrioYCiudad(p.neighborhood, p.city),
          href: `/propiedades/${p.id}`,
          precio: precio != null ? `${formatCurrency(precio)}${venta ? '' : ' al mes'}` : null,
          inmobiliaria: { nombre: t.nombre, logoUrl: t.logoUrl, color: t.color, href: paginaDe(t) },
        };
      }),
    [conVideo, t],
  );
  return (
    <div className="flex gap-3" data-testid="presentacion-de-la-inmobiliaria">
      <OrbeDeAgente agente="orquestador" tamano={30} decorativo className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-[16px] leading-relaxed text-fg">
          {suyos.length === 1 ? 'Uno' : <span className="font-mono tabular-nums">{suyos.length}</span>} de estos{' '}
          {suyos.length === 1 ? 'lo ofrece' : 'los ofrece'} <strong className="font-semibold">{t.nombre}</strong>.{' '}
          {r.porcentaje !== null ? (
            <>
              La recomienda el <span className="font-mono tabular-nums">{r.porcentaje}{'\u202f'}%</span> de quienes arrendaron
              con ella
            </>
          ) : (
            <>Todavía no tiene calificaciones de quienes arrendaron con ella</>
          )}
          {conVideo.length > 0 && (
            <>
              , y tiene video de{' '}
              {conVideo.length === suyos.length ? (suyos.length === 1 ? 'él' : 'cada uno') : <span className="font-mono tabular-nums">{conVideo.length}</span>}
            </>
          )}
          .
        </p>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Link href={paginaDe(t)} className="relative block h-24 bg-surface-muted" aria-label={`Ver la página de ${t.nombre}`}>
            {t.portadaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.portadaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colorDe(t)}40, ${colorDe(t)}12)` }} aria-hidden />
            )}
          </Link>
          <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
            <LogoDeLaInmobiliaria i={t} tamano={64} className="relative z-10 -mt-8 ring-4 ring-surface" />
            <div className="min-w-0 flex-1 pt-3">
              <p className="flex items-center gap-1.5 font-heading text-[18px] font-semibold text-fg">
                <span className="truncate">{t.nombre}</span>
                {t.verificada && <SelloVerificada />}
              </p>
              <p className="text-[13px] text-fg-muted">
                <span className="font-mono tabular-nums">{numero(t.inmuebles)}</span> {t.inmuebles === 1 ? 'inmueble' : 'inmuebles'} ·{' '}
                <span className="font-mono tabular-nums">{numero(t.seguidores)}</span> {t.seguidores === 1 ? 'seguidor' : 'seguidores'}
              </p>
              <Recomienda r={r} conVotos className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Link
                href={paginaDe(t)}
                className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[13px] font-medium text-fg transition-colors duration-base hover:border-border-strong"
              >
                Ver su página
              </Link>
              <BotonSeguir i={t} tamano="sm" />
            </div>
          </div>
          {conVideo.length > 0 && (
            <div className="border-t border-border px-5 py-4">
              <Tira>
                {conVideo.map((p, k) => {
                  const v = videoDelInmueble(p)!;
                  return (
                    <TarjetaDelVideo
                      key={p.id}
                      v={{ enlace: v.url, red: v.red, foto: primeraFoto(p) ?? null, titulo: p.title, lugar: barrioYCiudad(p.neighborhood, p.city) }}
                      ancho={132}
                      alAbrir={() => setVideoAbierto(k)}
                    />
                  );
                })}
              </Tira>
              <ReproductorDelVideo videos={paraVer} indice={videoAbierto} alCambiar={setVideoAbierto} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** «Antes de visitar, haz tu estudio una sola vez» (prototipo de la opción 1). */
function AntesDeVisitar({ primero, cuantos }: { primero: Property; cuantos: number }) {
  const lugar = primero.neighborhood ? `al de ${barrioYCiudad(primero.neighborhood, null)}` : 'al primero';
  return (
    <div className="flex gap-3" data-testid="antes-de-visitar">
      <OrbeDeAgente agente="orquestador" tamano={30} decorativo className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-[15px] font-medium text-fg">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Antes de visitar, haz tu estudio una sola vez
          </p>
          <p className="mt-1 text-[14px] text-fg-muted">
            Te dice hasta cuánto puedes arrendar y te sirve para postularte {cuantos > 1 ? `a los ${cuantos}` : 'a este'}, sin
            codeudor.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/aprobacion"
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-fg transition-colors duration-fast hover:bg-primary-600 active:scale-[0.97]"
            >
              Hacer mi estudio
            </Link>
            <Link
              href={`/propiedades/${primero.id}?visita=1`}
              className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-[13.5px] font-medium text-fg transition-colors duration-fast hover:border-border-strong active:scale-[0.97]"
            >
              Agendar visita {lugar}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RespuestaDeOri({
  turno,
  foto,
  cargando,
  ultimo,
  onQuitar,
}: {
  turno: Turno;
  foto: FotoDelTurno | undefined;
  cargando: boolean;
  ultimo: boolean;
  onQuitar: (clave: ClaveDePastilla, etiqueta: string) => void;
}) {
  const pasos = pasosDelTurno(turno, cargando, foto);
  // Lo que se muestra: lo que cumple todo o, si no hay, los más cercanos.
  const sonCercanos = !!foto && foto.total === 0 && !!foto.cercanos && foto.cercanos.total > 0;
  const mostrados = useMemo(
    () => (!foto ? [] : sonCercanos ? foto.cercanos!.propiedades : foto.propiedades),
    [foto, sonCercanos],
  );
  const totalMostrado = !foto ? 0 : sonCercanos ? foto.cercanos!.total : foto.total;
  const pastillas = foto ? conNombres(pastillasDe(turno.busqueda, foto.entendidos), mostrados) : [];
  const nombres = [...new Set(mostrados.map((p) => p.agencyName).filter((n): n is string => !!n))];
  const lista = !foto
    ? null
    : `/propiedades?${escribirBusqueda(sonCercanos ? foto.cercanos!.busqueda : absorber(turno.busqueda, foto.entendidos))}&vista=lista`;
  const quienes = useTarjetasDeInmobiliarias(useMemo(() => mostrados.map((p) => p.agencyId), [mostrados]));

  return (
    <div className="flex gap-3" data-testid="respuesta-de-ori">
      <OrbeDeAgente agente="orquestador" tamano={30} estado={cargando ? 'pensando' : 'quieto'} decorativo className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-[14px] font-medium text-fg">Ori</p>
        <PensamientoDelTurno pasos={pasos} vivo={cargando} duracionMs={foto?.ms ?? null} anunciar={ultimo} />

        <AnimatePresence initial={false}>
          {foto && (
            <motion.div
              key="respuesta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
              className="space-y-4"
            >
              <p className="text-[16px] leading-relaxed text-fg" data-testid="lo-que-dijo-ori">
                {sonCercanos ? (
                  <>
                    Ninguno cumple todo lo que pides. Estos{' '}
                    <strong className="font-mono font-semibold tabular-nums">{totalMostrado}</strong> son los más
                    cercanos: en cada uno te digo qué no cumple o qué no dice.
                  </>
                ) : foto.total === 0 ? (
                  <>No encontré ninguno que cumpla todo. Quita una de las pastillas y vuelvo a buscar.</>
                ) : (
                  <>
                    Encontré <strong className="font-mono font-semibold tabular-nums">{foto.total}</strong>{' '}
                    {foto.total === 1 ? 'que cumple' : 'que cumplen'} lo que pides
                    {nombres.length === 1 ? <>, de {nombres[0]}</> : nombres.length > 1 ? <>, de {nombres.length} inmobiliarias</> : null}.
                    {foto.total > foto.propiedades.length && <> Te muestro los primeros {foto.propiedades.length}.</>}
                  </>
                )}
              </p>

              {pastillas.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" data-testid="pastillas-de-la-busqueda">
                  <span className="text-[12.5px] text-fg-subtle">Entendí:</span>
                  {pastillas.map((p) => (
                    <span
                      key={p.clave}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 py-1 pl-3 pr-1 text-[13px] text-fg"
                      data-testid="pastilla"
                    >
                      {p.entendida && <Sparkle className="h-3.5 w-3.5 text-primary" weight="fill" aria-hidden />}
                      {p.etiqueta}
                      {ultimo ? (
                        <button
                          type="button"
                          onClick={() => onQuitar(p.clave, p.etiqueta)}
                          aria-label={`Quitar ${p.etiqueta}`}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-muted transition-colors duration-fast hover:bg-primary/15 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="h-3 w-3" weight="bold" aria-hidden />
                        </button>
                      ) : (
                        <span className="w-2" aria-hidden />
                      )}
                    </span>
                  ))}
                </div>
              )}

              {mostrados.length > 0 && (
                <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" data-testid="tarjetas-de-la-respuesta">
                  {mostrados.map((p, k) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: Math.min(k * 0.04, 0.32) }}
                      className="w-[290px] shrink-0"
                    >
                      <PropertyCard
                        property={p}
                        explicacion={porQueTeLoMuestro(p, turno.busqueda, foto.entendidos)}
                        debajoDeQuienLoOfrece={
                          p.agencyId && quienes.get(p.agencyId) ? (
                            <Recomienda r={quienes.get(p.agencyId)!.recomendacion} />
                          ) : null
                        }
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {lista && totalMostrado > 0 && (
                <Link
                  href={lista}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                  data-testid="ver-en-lista"
                >
                  <MapTrifold className="h-4 w-4" aria-hidden />
                  {totalMostrado === 1
                    ? 'Verlo en el mapa'
                    : sonCercanos
                      ? `Ver los ${totalMostrado} más cercanos en una lista con mapa`
                      : `Ver los ${totalMostrado} en una lista con mapa`}
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** La respuesta y, en la última, lo que Ori agrega: quién ofrece y el estudio. */
function RespuestaCompleta(props: Parameters<typeof RespuestaDeOri>[0]) {
  const { foto, ultimo, turno } = props;
  const sonCercanos = !!foto && foto.total === 0 && !!foto.cercanos && foto.cercanos.total > 0;
  const mostrados = useMemo(
    () => (!foto ? [] : sonCercanos ? foto.cercanos!.propiedades : foto.propiedades),
    [foto, sonCercanos],
  );
  const total = !foto ? 0 : sonCercanos ? foto.cercanos!.total : foto.total;
  const quienes = useTarjetasDeInmobiliarias(useMemo(() => mostrados.map((p) => p.agencyId), [mostrados]));
  const destacada = useMemo(() => {
    if (!ultimo || turno.busqueda.inmobiliaria) return null;
    const cuenta = new Map<string, Property[]>();
    for (const p of mostrados) {
      if (!p.agencyId) continue;
      cuenta.set(p.agencyId, [...(cuenta.get(p.agencyId) ?? []), p]);
    }
    const [id, suyos] = [...cuenta.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
    const t = id ? quienes.get(id) : undefined;
    return t && suyos ? { t, suyos } : null;
  }, [mostrados, quienes, turno.busqueda.inmobiliaria, ultimo]);

  return (
    <>
      <RespuestaDeOri {...props} />
      {ultimo && foto && destacada && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.15 }}
        >
          <PresentacionDeLaInmobiliaria t={destacada.t} suyos={destacada.suyos} />
        </motion.div>
      )}
      {ultimo && foto && mostrados.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.25 }}
        >
          <AntesDeVisitar primero={mostrados[0]} cuantos={total} />
        </motion.div>
      )}
    </>
  );
}

export function ConversacionDelMarketplace() {
  const router = useRouter();
  const params = useSearchParams();
  const claveDeLaUrl = params.toString();
  const deLaUrl = useMemo(() => busquedaDeLaDireccion(new URLSearchParams(claveDeLaUrl)), [claveDeLaUrl]);

  const [turnos, setTurnos] = useState<Turno[]>(() => [turnoDe(preguntaDe(deLaUrl), deLaUrl)]);
  const ultimo = turnos[turnos.length - 1];
  const [recientes, setRecientes] = useState<BusquedaReciente[]>([]);
  useEffect(() => setRecientes(leerRecientes()), []);

  // Si la dirección cambia por fuera (una búsqueda del lado, el botón atrás),
  // es otra conversación.
  const escritaPorMi = useRef<string | null>(null);
  useEffect(() => {
    const qs = escribirBusqueda(deLaUrl);
    if (qs === escritaPorMi.current) return;
    if (qs === escribirBusqueda(ultimo.busqueda)) return;
    setTurnos([turnoDe(preguntaDe(deLaUrl), deLaUrl)]);
    // Sólo cuando cambia la dirección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDeLaUrl]);

  // Una página de 100 (el hook trae TODAS las páginas: con 12 serían muchas
  // vueltas); en la respuesta se muestran las primeras.
  const filtros = useMemo(() => filtrosDeLaApi(ultimo.busqueda, 100), [ultimo.busqueda]);
  const { properties, meta, isLoading } = useProperties(filtros);
  // Mientras el último turno no tenga su respuesta, Ori está pensando.
  const cargando = !ultimo.foto;

  // El hook arranca a cargar un render DESPUÉS de cambiar los filtros: lo que
  // hay en ese render es la respuesta anterior. Sólo vale lo que llega después
  // de haberlo visto cargar para ESTE turno.
  const cargoPara = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) cargoPara.current = ultimo.id;
  }, [isLoading, ultimo.id]);

  // Cuando llega la respuesta del último turno, queda guardada en él.
  useEffect(() => {
    if (ultimo.foto || isLoading || !meta || cargoPara.current !== ultimo.id) return;
    const foto: FotoDelTurno = {
      propiedades: properties.slice(0, 12),
      total: meta.total ?? properties.length,
      entendidos: ultimo.busqueda.q ? meta.filtrosEntendidos ?? null : null,
      ms: Date.now() - ultimo.inicio,
    };
    const id = ultimo.id;
    const guardar = (f: FotoDelTurno) => setTurnos((ts) => ts.map((t) => (t.id === id ? { ...t, foto: f } : t)));
    setRecientes(guardarReciente(escribirBusqueda(ultimo.busqueda), turnos[0].pregunta));

    // Nada cumple todo: Ori busca los más cercanos antes de contestar.
    const suelta = foto.total === 0 ? relajada(ultimo.busqueda, foto.entendidos) : null;
    if (!suelta) {
      guardar(foto);
      return;
    }
    let vigente = true;
    propertiesApi
      .list(filtrosDeLaApi(suelta, 100))
      .then((r) => {
        if (!vigente) return;
        guardar({
          ...foto,
          ms: Date.now() - ultimo.inicio,
          cercanos: { propiedades: r.data.slice(0, 12), total: r.meta.total ?? r.data.length, busqueda: suelta },
        });
      })
      // Sin los cercanos, la respuesta honesta de siempre: ninguno cumple.
      .catch(() => vigente && guardar(foto));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, meta, properties, ultimo.id]);

  const seguir = useCallback(
    (pregunta: string, busqueda: Busqueda, escrita = false) => {
      const qs = escribirBusqueda(busqueda);
      // La misma búsqueda no vuelve a pedir nada (el hook no recargaría): la
      // respuesta es la misma.
      const igual = qs === escribirBusqueda(ultimo.busqueda) && ultimo.foto;
      const nuevo = { ...turnoDe(pregunta, busqueda), escrita };
      setTurnos((ts) => [...ts, igual ? { ...nuevo, foto: { ...ultimo.foto!, ms: 0 } } : nuevo]);
      escritaPorMi.current = qs;
      router.replace(`/propiedades?${qs}`, { scroll: false });
    },
    [router, ultimo],
  );

  // Lo último que se dice gana (`afinarCon`): una consulta corta al back para
  // saber qué entiende del texto nuevo, y después el turno.
  const [afinando, setAfinando] = useState(false);
  const afinar = useCallback(
    async (texto: string) => {
      const t = texto.trim();
      if (!t || cargando || afinando) return;
      setAfinando(true);
      try {
        seguir(t, await afinarCon(ultimo.busqueda, ultimo.foto?.entendidos, t), true);
      } finally {
        setAfinando(false);
      }
    },
    [afinando, cargando, seguir, ultimo],
  );

  const quitar = useCallback(
    (clave: ClaveDePastilla, etiqueta: string) => {
      if (cargando) return;
      seguir(`Sin «${etiqueta}»`, quitarPastilla(ultimo.busqueda, ultimo.foto?.entendidos, clave));
    },
    [cargando, seguir, ultimo],
  );

  // La respuesta nueva entra a la vista.
  const finRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turnos.length > 1) finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turnos.length]);

  return (
    <div className="min-h-screen bg-background pt-16 lg:pt-[76px]" data-testid="conversacion-del-marketplace">
      <div className="grid grid-cols-1 lg:grid-cols-[272px_minmax(0,1fr)]">
        <LadoDelMarketplace recientes={recientes} activa={escribirBusqueda(ultimo.busqueda)} />

        <main className="flex min-h-[calc(100vh-64px)] min-w-0 flex-col lg:min-h-[calc(100vh-76px)]">
          <InterruptorDeVista
            vista="conversacion"
            hrefConversacion={`/propiedades?${escribirBusqueda(ultimo.busqueda)}`}
            hrefGaleria={`/propiedades?${escribirBusqueda(absorber(ultimo.busqueda, ultimo.foto?.entendidos))}&vista=lista`}
          />
          <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6">
            {turnos.map((t, k) => {
              const esElUltimo = k === turnos.length - 1;
              return (
                <div key={t.id} className="space-y-6">
                  <MessageBubble role="user">
                    <span className="block whitespace-pre-wrap break-words">{t.pregunta}</span>
                  </MessageBubble>
                  <RespuestaCompleta
                    turno={t}
                    foto={t.foto}
                    cargando={esElUltimo && cargando}
                    ultimo={esElUltimo}
                    onQuitar={quitar}
                  />
                </div>
              );
            })}
            <div ref={finRef} />
          </div>

          <div className="sticky bottom-0 z-20 bg-background pt-3">
            <div className="mx-auto max-w-3xl px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-4">
              <CajaDelMarketplace
                compacta
                ocupado={cargando || afinando}
                placeholder="Afina: «que tenga balcón», «hasta 3 millones», «en Belén»…"
                onEnviar={afinar}
                opciones={IDEAS_PARA_AFINAR}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
