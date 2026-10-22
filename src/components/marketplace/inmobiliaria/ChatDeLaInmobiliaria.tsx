'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble, motionDuration, motionEase } from '@leasefy/cadence';
import { MapTrifold, WhatsappLogo } from '@phosphor-icons/react';

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PensamientoDelTurno } from '@/components/beta/PensamientoDelTurno';
import { PropertyCard } from '@/components/property/PropertyCard';
import { ApiError } from '@/lib/api/client';
import {
  CODIGO_CHAT_SIN_IA,
  CODIGO_CHAT_SIN_PREGUNTAS,
  marketplaceApi,
  type RespuestaDelChat,
  type TurnoDelChat,
} from '@/lib/api/marketplace.service';
import { propertiesApi } from '@/lib/api/properties.service';
import { cifraEnTexto, type PasoDelPensamiento } from '@/lib/chat/pensamiento';
import { afinarCon } from '@/lib/marketplace/afinar';
import {
  absorber,
  escribirBusqueda,
  filtrosDeLaApi,
  pastillas as pastillasDe,
  porQueTeLoMuestro,
  relajada,
  type Busqueda,
  type FiltrosEntendidos,
} from '@/lib/marketplace/busqueda';
import { conNombres } from '@/lib/marketplace/con-nombres';
import { IDEAS_PARA_AFINAR } from '@/lib/marketplace/ideas-para-afinar';
import type { Property } from '@/lib/types/property';
import { CajaDelMarketplace } from '../CajaDelMarketplace';

/**
 * «Pregúntale a la inmobiliaria» (opción 1, Nico 09-10-2026): la página de la
 * inmobiliaria ES su chat.
 *
 * Desde el 21-10-2026 («necesito que en el marketplace responda pero todo»)
 * cada pregunta va primero a la IA del back, que responde con el perfil
 * público y los inmuebles publicados de ESA inmobiliaria (nunca se inventa
 * uno: las tarjetas salen de la base). Si la IA no responde, el turno usa el
 * buscador de siempre: el chat nunca se queda callado.
 */

interface Respuesta {
  propiedades: Property[];
  total: number;
  entendidos: FiltrosEntendidos | null;
  ms: number;
  cercanos?: { propiedades: Property[]; total: number; busqueda: Busqueda };
}

interface Turno {
  id: string;
  pregunta: string;
  inicio: number;
  /** Lo que respondió la IA. */
  ia?: RespuestaDelChat & { ms: number };
  /** El buscador (cuando la IA no respondió). */
  busqueda?: Busqueda;
  /** Se acabó el cupo con IA en este turno: la frase del back, una vez. */
  sinPreguntas?: string;
  respuesta?: Respuesta;
}

let contador = 0;
/** Tras estas fallas seguidas de la IA, la pestaña deja de preguntarle. */
const FALLAS_PARA_APAGAR_LA_IA = 2;

function pasosDeLaBusqueda(t: Turno, nombre: string): PasoDelPensamiento[] {
  const r = t.respuesta;
  const etiquetas =
    r && t.busqueda
      ? conNombres(pastillasDe(t.busqueda, r.entendidos), r.propiedades)
          .filter((p) => p.clave !== 'inmobiliaria')
          .map((p) => p.etiqueta)
      : [];
  const lista: PasoDelPensamiento[] = [
    { id: 'leer', fase: 'pregunta', texto: 'Leí lo que escribiste', estado: 'listo' },
    {
      id: 'entender',
      fase: 'clasificacion',
      texto: !r ? 'Entendiendo qué buscas' : etiquetas.length > 0 ? 'Esto es lo que buscas' : 'Lo busco tal cual lo escribiste',
      estado: r ? 'listo' : 'en_curso',
      ...(r && etiquetas.length > 0 ? { resultado: { texto: etiquetas.join(' · ') } } : {}),
    },
  ];
  if (r) {
    lista.push({
      id: 'buscar',
      fase: 'busqueda',
      texto: `Busqué en los inmuebles de ${nombre}`,
      estado: 'listo',
      resultado:
        r.total === 0
          ? { texto: 'ninguno cumple todo' }
          : { texto: `${cifraEnTexto(r.total)} ${r.total === 1 ? 'cumple' : 'cumplen'}`, cifra: r.total, formato: 'numero' },
    });
  }
  return lista;
}

function pasosDeLaIa(t: Turno, nombre: string): PasoDelPensamiento[] {
  const ia = t.ia;
  const lista: PasoDelPensamiento[] = [
    { id: 'leer', fase: 'pregunta', texto: 'Leí lo que escribiste', estado: 'listo' },
    {
      id: 'revisar',
      fase: 'busqueda',
      texto: ia ? `Revisé los inmuebles y el perfil de ${nombre}` : `Revisando lo que tiene ${nombre}`,
      estado: ia ? 'listo' : 'en_curso',
    },
  ];
  if (ia && ia.inmuebles.length > 0) {
    const n = ia.inmuebles.length;
    lista.push({
      id: 'elegir',
      fase: 'clasificacion',
      texto: 'Elegí los que vienen al caso',
      estado: 'listo',
      resultado: { texto: `${cifraEnTexto(n)} ${n === 1 ? 'inmueble' : 'inmuebles'}`, cifra: n, formato: 'numero' },
    });
  }
  return lista;
}

/** La conversación hasta ahora, como la lee el back (lo que mostró cada turno va con sus ids). */
function historialDe(turnos: Turno[]): TurnoDelChat[] {
  const h: TurnoDelChat[] = [];
  for (const t of turnos) {
    if (t.ia) {
      h.push({ rol: 'persona', texto: t.pregunta });
      h.push({ rol: 'asistente', texto: t.ia.respuesta, inmuebles: t.ia.inmuebles.map((p) => p.id) });
    } else if (t.respuesta) {
      const r = t.respuesta;
      const mostrados = r.total === 0 && r.cercanos ? r.cercanos.propiedades : r.propiedades;
      h.push({ rol: 'persona', texto: t.pregunta });
      h.push({
        rol: 'asistente',
        texto:
          r.total > 0
            ? `Te mostré ${r.total} ${r.total === 1 ? 'inmueble que cumple' : 'inmuebles que cumplen'} lo que pediste.`
            : mostrados.length > 0
              ? 'Ninguno cumplía todo; te mostré los más cercanos.'
              : 'No encontré nada así publicado.',
        inmuebles: mostrados.slice(0, 8).map((p) => p.id),
      });
    }
  }
  return h;
}

function esFallaDeLaIa(e: unknown): boolean {
  return e instanceof ApiError && (e.code === CODIGO_CHAT_SIN_IA || e.status === 404 || e.status === 503);
}

export function ChatDeLaInmobiliaria({
  inmobiliaria,
  sugerencias,
  whatsapp = null,
}: {
  inmobiliaria: { id: string; nombre: string };
  sugerencias: string[];
  /** Dígitos con indicativo (para `wa.me`), si la inmobiliaria lo publicó. */
  whatsapp?: string | null;
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const ultimo = turnos[turnos.length - 1];
  const fallasDeLaIa = useRef(0);

  const buscar = useCallback(async (turno: Turno, busqueda: Busqueda): Promise<Respuesta> => {
    try {
      const r = await propertiesApi.list(filtrosDeLaApi(busqueda, 100));
      const total = r.meta.total ?? r.data.length;
      const entendidos = busqueda.q ? (r.meta.filtrosEntendidos ?? null) : null;
      let respuesta: Respuesta = { propiedades: r.data.slice(0, 8), total, entendidos, ms: Date.now() - turno.inicio };
      const suelta = total === 0 ? relajada(busqueda, entendidos) : null;
      if (suelta) {
        const c = await propertiesApi.list(filtrosDeLaApi(suelta, 100)).catch(() => null);
        if (c && c.data.length > 0) {
          respuesta = {
            ...respuesta,
            ms: Date.now() - turno.inicio,
            cercanos: { propiedades: c.data.slice(0, 8), total: c.meta.total ?? c.data.length, busqueda: suelta },
          };
        }
      }
      return respuesta;
    } catch {
      return { propiedades: [], total: 0, entendidos: null, ms: Date.now() - turno.inicio };
    }
  }, []);

  const preguntar = useCallback(
    async (texto: string) => {
      const q = texto.trim();
      if (!q || ocupado) return;
      setOcupado(true);
      const turno: Turno = { id: `c${Date.now().toString(36)}${(contador++).toString(36)}`, pregunta: q, inicio: Date.now() };
      const anteriores = turnos;
      setTurnos((ts) => [...ts, turno]);
      const poner = (cambio: Partial<Turno>) => setTurnos((ts) => ts.map((t) => (t.id === turno.id ? { ...t, ...cambio } : t)));
      try {
        if (fallasDeLaIa.current < FALLAS_PARA_APAGAR_LA_IA) {
          try {
            const ia = await marketplaceApi.preguntarAlChat(inmobiliaria.id, { pregunta: q, historial: historialDe(anteriores) });
            fallasDeLaIa.current = 0;
            poner({ ia: { ...ia, ms: Date.now() - turno.inicio } });
            return;
          } catch (e) {
            if (e instanceof ApiError && e.code === CODIGO_CHAT_SIN_PREGUNTAS) {
              // Se acabó el cupo con IA: desde aquí, buscador (Nico, 21-10-2026).
              fallasDeLaIa.current = FALLAS_PARA_APAGAR_LA_IA;
              poner({ sinPreguntas: e.message });
            } else if (esFallaDeLaIa(e)) fallasDeLaIa.current += 1;
          }
        }
        // El buscador de siempre: afina la última búsqueda, o empieza una.
        const previa = [...anteriores].reverse().find((t) => t.respuesta && t.busqueda);
        const busqueda =
          previa?.respuesta && previa.busqueda
            ? await afinarCon(previa.busqueda, previa.respuesta.entendidos, q)
            : { q, inmobiliaria: inmobiliaria.id };
        poner({ busqueda });
        poner({ busqueda, respuesta: await buscar(turno, busqueda) });
      } finally {
        setOcupado(false);
      }
    },
    [buscar, inmobiliaria.id, ocupado, turnos],
  );

  const finRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turnos.length > 0) finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turnos]);

  const ejemplos = useMemo(() => sugerencias.slice(0, 3), [sugerencias]);
  // Debajo de la última respuesta de la IA, lo que podría preguntar después.
  const siguientes = !ocupado && ultimo?.ia ? ultimo.ia.sugerencias : [];
  const chips = turnos.length === 0 ? ejemplos : siguientes;

  return (
    <div data-testid="chat-de-la-inmobiliaria">
      <div className="mt-6 space-y-6">
        {turnos.length === 0 && (
          <div className="flex gap-3">
            <OrbeDeAgente agente="orquestador" tamano={30} decorativo className="mt-0.5 shrink-0" />
            <p className="text-[15px] leading-relaxed text-fg">
              Hola. Pregúntame lo que quieras de {inmobiliaria.nombre} y sus inmuebles: barrio, presupuesto, si aceptan
              mascotas, cuál te conviene, cómo agendar una visita…
            </p>
          </div>
        )}
        {turnos.map((t) => {
          const listo = Boolean(t.ia || t.respuesta);
          return (
            <div key={t.id} className="space-y-5">
              <MessageBubble role="user">
                <span className="block whitespace-pre-wrap break-words">{t.pregunta}</span>
              </MessageBubble>
              <div className="flex gap-3" data-testid="respuesta-de-la-inmobiliaria">
                <OrbeDeAgente
                  agente="orquestador"
                  tamano={30}
                  estado={listo ? 'quieto' : 'pensando'}
                  decorativo
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <PensamientoDelTurno
                    pasos={t.busqueda ? pasosDeLaBusqueda(t, inmobiliaria.nombre) : pasosDeLaIa(t, inmobiliaria.nombre)}
                    vivo={!listo}
                    duracionMs={t.ia?.ms ?? t.respuesta?.ms ?? null}
                    anunciar={t === ultimo}
                  />
                  <AnimatePresence initial={false}>
                    {t.ia && (
                      <motion.div
                        key="ia"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
                        className="space-y-4"
                        data-testid="respuesta-con-ia"
                      >
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">{t.ia.respuesta}</p>
                        {t.ia.inmuebles.length > 0 && <Tarjetas propiedades={t.ia.inmuebles} />}
                        {t.ia.contactar && whatsapp && (
                          <a
                            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hola ${inmobiliaria.nombre}, los vi en Leasefy. ${t.pregunta}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline"
                            data-testid="chat-escribir-por-whatsapp"
                          >
                            <WhatsappLogo className="h-4 w-4 text-[#25D366]" weight="fill" aria-hidden />
                            Escríbele a {inmobiliaria.nombre} por WhatsApp
                          </a>
                        )}
                      </motion.div>
                    )}
                    {t.respuesta && t.busqueda && (
                      <motion.div
                        key="r"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
                        className="space-y-4"
                      >
                        {t.sinPreguntas && (
                          <p className="text-[13.5px] text-fg-muted" data-testid="chat-sin-preguntas">
                            {t.sinPreguntas}
                          </p>
                        )}
                        <RespuestaDelBuscador turno={t} nombre={inmobiliaria.nombre} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <div className="mt-6">
        <AnimatePresence initial={false} mode="popLayout">
          {chips.length > 0 && (
            <motion.div
              key={turnos.length === 0 ? 'ejemplos' : `siguientes-${ultimo?.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration.base, ease: motionEase.enter }}
              className="mb-3 flex flex-wrap gap-2"
              data-testid="chat-sugerencias"
            >
              {chips.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => preguntar(e)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-[13px] text-fg transition-colors duration-base hover:border-border-strong active:scale-[0.97]"
                >
                  {e}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <CajaDelMarketplace
          compacta
          ocupado={ocupado}
          placeholder="Pregúntale lo que quieras, como se lo dirías a un asesor"
          onEnviar={preguntar}
          opciones={IDEAS_PARA_AFINAR}
        />
      </div>
    </div>
  );
}

function Tarjetas({ propiedades, busqueda, entendidos }: { propiedades: Property[]; busqueda?: Busqueda; entendidos?: FiltrosEntendidos | null }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {propiedades.map((p) => (
        <div key={p.id} className="w-[270px] shrink-0">
          <PropertyCard property={p} explicacion={busqueda ? porQueTeLoMuestro(p, busqueda, entendidos ?? null) : undefined} />
        </div>
      ))}
    </div>
  );
}

/** La respuesta del buscador (cuando la IA no respondió): lo de siempre. */
function RespuestaDelBuscador({ turno: t, nombre }: { turno: Turno; nombre: string }) {
  const r = t.respuesta!;
  const busqueda = t.busqueda!;
  const sonCercanos = r.total === 0 && !!r.cercanos;
  const mostrados = sonCercanos ? r.cercanos!.propiedades : r.propiedades;
  const total = sonCercanos ? r.cercanos!.total : r.total;
  const lista = `/propiedades?${escribirBusqueda(sonCercanos ? r.cercanos!.busqueda : absorber(busqueda, r.entendidos))}&vista=lista`;
  return (
    <>
      <p className="text-[15px] leading-relaxed text-fg">
        {sonCercanos ? (
          <>
            Ninguno cumple todo lo que pides. Estos{' '}
            <strong className="font-mono font-semibold tabular-nums">{total}</strong> son los más cercanos de {nombre}: en
            cada uno te digo qué no cumple.
          </>
        ) : r.total === 0 ? (
          <>
            {nombre} no tiene publicado nada así ahora.{' '}
            <Link href={`/propiedades?${escribirBusqueda({ q: t.pregunta })}`} className="font-medium text-primary hover:underline">
              Búscalo en todo Leasefy
            </Link>
            .
          </>
        ) : (
          <>
            Tiene <strong className="font-mono font-semibold tabular-nums">{r.total}</strong>{' '}
            {r.total === 1 ? 'que cumple' : 'que cumplen'} lo que pides.
          </>
        )}
      </p>
      {mostrados.length > 0 && (
        // Contra la búsqueda ORIGINAL: en los cercanos, cada tarjeta dice qué no cumple.
        <Tarjetas propiedades={mostrados} busqueda={busqueda} entendidos={r.entendidos} />
      )}
      {total > 1 && (
        <Link href={lista} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">
          <MapTrifold className="h-4 w-4" aria-hidden />
          Ver los {total} en una lista con mapa
        </Link>
      )}
    </>
  );
}
