'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble, motionDuration, motionEase } from '@leasefy/cadence';
import { MapTrifold } from '@phosphor-icons/react';

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { PensamientoDelTurno } from '@/components/beta/PensamientoDelTurno';
import { PropertyCard } from '@/components/property/PropertyCard';
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
 * «Pregúntale a Nogal» (opción 1, Nico 09-10-2026): la página de la
 * inmobiliaria ES su chat. Conoce sólo SUS inmuebles publicados y nunca se
 * inventa uno: lo entiende el mismo entendedor del buscador y las tarjetas
 * salen de la base. Lo que escribes después afina la misma búsqueda.
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
  busqueda: Busqueda;
  inicio: number;
  respuesta?: Respuesta;
}

let contador = 0;

function pasos(t: Turno, nombre: string): PasoDelPensamiento[] {
  const r = t.respuesta;
  const etiquetas = r
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

export function ChatDeLaInmobiliaria({
  inmobiliaria,
  sugerencias,
}: {
  inmobiliaria: { id: string; nombre: string };
  sugerencias: string[];
}) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const ultimo = turnos[turnos.length - 1];

  const responder = useCallback(async (turno: Turno) => {
    try {
      const r = await propertiesApi.list(filtrosDeLaApi(turno.busqueda, 100));
      const total = r.meta.total ?? r.data.length;
      const entendidos = turno.busqueda.q ? (r.meta.filtrosEntendidos ?? null) : null;
      let respuesta: Respuesta = { propiedades: r.data.slice(0, 8), total, entendidos, ms: Date.now() - turno.inicio };
      const suelta = total === 0 ? relajada(turno.busqueda, entendidos) : null;
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
      setTurnos((ts) => ts.map((t) => (t.id === turno.id ? { ...t, respuesta } : t)));
    } catch {
      setTurnos((ts) =>
        ts.map((t) =>
          t.id === turno.id ? { ...t, respuesta: { propiedades: [], total: 0, entendidos: null, ms: Date.now() - t.inicio } } : t,
        ),
      );
    }
  }, []);

  const preguntar = useCallback(
    async (texto: string) => {
      const q = texto.trim();
      if (!q || ocupado) return;
      setOcupado(true);
      try {
        const busqueda = ultimo?.respuesta
          ? await afinarCon(ultimo.busqueda, ultimo.respuesta.entendidos, q)
          : { q, inmobiliaria: inmobiliaria.id };
        const turno: Turno = { id: `c${Date.now().toString(36)}${(contador++).toString(36)}`, pregunta: q, busqueda, inicio: Date.now() };
        setTurnos((ts) => [...ts, turno]);
        await responder(turno);
      } finally {
        setOcupado(false);
      }
    },
    [inmobiliaria.id, ocupado, responder, ultimo],
  );

  const finRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (turnos.length > 0) finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turnos]);

  const ejemplos = useMemo(() => sugerencias.slice(0, 3), [sugerencias]);

  return (
    <div data-testid="chat-de-la-inmobiliaria">
      <div className="mt-6 space-y-6">
        {turnos.length === 0 && (
          <div className="flex gap-3">
            <OrbeDeAgente agente="orquestador" tamano={30} decorativo className="mt-0.5 shrink-0" />
            <p className="text-[15px] leading-relaxed text-fg">
              Hola. Cuéntame qué buscas y te muestro lo que {inmobiliaria.nombre} tiene publicado: barrio, presupuesto,
              cuántas habitaciones, si aceptan mascotas…
            </p>
          </div>
        )}
        {turnos.map((t) => {
          const r = t.respuesta;
          const sonCercanos = !!r && r.total === 0 && !!r.cercanos;
          const mostrados = !r ? [] : sonCercanos ? r.cercanos!.propiedades : r.propiedades;
          const total = !r ? 0 : sonCercanos ? r.cercanos!.total : r.total;
          const lista = r
            ? `/propiedades?${escribirBusqueda(sonCercanos ? r.cercanos!.busqueda : absorber(t.busqueda, r.entendidos))}&vista=lista`
            : null;
          return (
            <div key={t.id} className="space-y-5">
              <MessageBubble role="user">
                <span className="block whitespace-pre-wrap break-words">{t.pregunta}</span>
              </MessageBubble>
              <div className="flex gap-3" data-testid="respuesta-de-la-inmobiliaria">
                <OrbeDeAgente agente="orquestador" tamano={30} estado={r ? 'quieto' : 'pensando'} decorativo className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1 space-y-3">
                  <PensamientoDelTurno pasos={pasos(t, inmobiliaria.nombre)} vivo={!r} duracionMs={r?.ms ?? null} anunciar={t === ultimo} />
                  <AnimatePresence initial={false}>
                    {r && (
                      <motion.div
                        key="r"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
                        className="space-y-4"
                      >
                        <p className="text-[15px] leading-relaxed text-fg">
                          {sonCercanos ? (
                            <>
                              Ninguno cumple todo lo que pides. Estos{' '}
                              <strong className="font-mono font-semibold tabular-nums">{total}</strong> son los más cercanos
                              de {inmobiliaria.nombre}: en cada uno te digo qué no cumple.
                            </>
                          ) : r.total === 0 ? (
                            <>
                              {inmobiliaria.nombre} no tiene publicado nada así ahora.{' '}
                              <Link
                                href={`/propiedades?${escribirBusqueda({ q: t.pregunta })}`}
                                className="font-medium text-primary hover:underline"
                              >
                                Búscalo en todo Leasefy
                              </Link>
                              .
                            </>
                          ) : (
                            <>
                              Tiene{' '}
                              <strong className="font-mono font-semibold tabular-nums">{r.total}</strong>{' '}
                              {r.total === 1 ? 'que cumple' : 'que cumplen'} lo que pides.
                            </>
                          )}
                        </p>
                        {mostrados.length > 0 && (
                          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
                            {mostrados.map((p) => (
                              <div key={p.id} className="w-[270px] shrink-0">
                                <PropertyCard property={p} explicacion={porQueTeLoMuestro(p, t.busqueda, r.entendidos)} />
                              </div>
                            ))}
                          </div>
                        )}
                        {lista && total > 1 && (
                          <Link href={lista} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-primary hover:underline">
                            <MapTrifold className="h-4 w-4" aria-hidden />
                            Ver los {total} en una lista con mapa
                          </Link>
                        )}
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
        {turnos.length === 0 && ejemplos.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {ejemplos.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => preguntar(e)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] text-fg transition-colors duration-base hover:border-border-strong active:scale-[0.97]"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <CajaDelMarketplace
          compacta
          ocupado={ocupado}
          placeholder="¿Qué buscas? Escríbelo como se lo dirías a un asesor"
          onEnviar={preguntar}
          opciones={IDEAS_PARA_AFINAR}
        />
      </div>
    </div>
  );
}
