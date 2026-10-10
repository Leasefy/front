'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRinging, ChatCircleDots, FileArrowUp, Plus } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { leerRecientes, type BusquedaReciente } from '@/lib/marketplace/busquedas-recientes';
import { paginaDe } from '@/lib/api/marketplace.service';
import { useAqui, useInmobiliariasQueSigues } from '@/lib/marketplace/use-inmobiliarias';
import { useCuentaParaSeguir } from './CuentaParaPublicar';
import { LogoDeLaInmobiliaria } from './inmobiliaria/piezas';
import { useDondePublicar } from './PublicarDesdeElMarketplace';

/**
 * El lado del marketplace, como en ChatGPT (opción 1, Nico 09-10-2026): una
 * búsqueda nueva, las que ya hiciste en este navegador y las inmobiliarias que
 * sigues (con cuenta), con el número de lo que publicaron desde la última vez
 * que abriste su página. Sólo en pantallas anchas; en el celular la
 * conversación ocupa todo.
 */
export function LadoDelMarketplace({
  recientes: desdeAfuera,
  activa,
}: {
  /** La lista ya leída (la conversación la actualiza al guardar). Sin ella, se lee al montar. */
  recientes?: BusquedaReciente[];
  /** La dirección de la búsqueda abierta, para marcarla. */
  activa?: string | null;
}) {
  // Se lee después de montar: el servidor no sabe qué hay en este navegador.
  const [propias, setPropias] = useState<BusquedaReciente[]>([]);
  useEffect(() => {
    if (!desdeAfuera) setPropias(leerRecientes());
  }, [desdeAfuera]);
  const recientes = desdeAfuera ?? propias;
  const { lista: sigues } = useInmobiliariasQueSigues();
  const { abrir: abrirCuenta, ventana: ventanaDeCuenta } = useCuentaParaSeguir(useAqui());

  return (
    <aside
      className="hidden border-r border-border bg-surface lg:block lg:min-h-[calc(100vh-76px)]"
      aria-label="Tus búsquedas"
      data-testid="lado-del-marketplace"
    >
      {/* Queda a la vista al bajar (QA del marketplace, 10-10-2026: al desplazar,
          la columna se iba con la página y quedaba en blanco). */}
      <div
        className="px-4 py-5 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-76px)] lg:overflow-y-auto"
        data-lenis-prevent
      >
        <Link
          href="/propiedades"
          className="flex h-10 w-full items-center gap-2 rounded-full border border-border bg-surface px-4 text-[14px] font-medium text-fg transition-colors duration-fast hover:border-border-strong hover:bg-bg active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nueva búsqueda
        </Link>
        <LadoPublicar />
        <p className="mt-6 px-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Tus búsquedas</p>
        {recientes.length === 0 ? (
          <p className="mt-2 px-1 text-[13px] leading-relaxed text-fg-muted">
            Aquí van quedando lo que buscas, para volver con un clic. Se guardan sólo en este navegador.
          </p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            <AnimatePresence initial={false}>
              {recientes.map((r) => (
                <motion.li
                  key={r.qs}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: motionDuration.base, ease: motionEase.enter }}
                >
                  <Link
                    href={`/propiedades?${r.qs}`}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-[14px] transition-colors duration-fast',
                      r.qs === activa
                        ? 'bg-surface-muted text-fg'
                        : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                    )}
                    aria-current={r.qs === activa ? 'page' : undefined}
                  >
                    <ChatCircleDots className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{r.titulo}</span>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <p className="mt-6 px-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          Inmobiliarias que sigues
        </p>
        {sigues === null ? (
          <p className="mt-2 px-1 text-[13px] leading-relaxed text-fg-muted">
            Síguelas para ver aquí lo que publican.{' '}
            <button type="button" onClick={abrirCuenta} className="font-medium text-primary hover:underline">
              Crea tu cuenta
            </button>{' '}
            (es gratis).
          </p>
        ) : sigues.length === 0 ? (
          <p className="mt-2 px-1 text-[13px] leading-relaxed text-fg-muted">
            Todavía no sigues a ninguna. En su página, toca «Seguir».
          </p>
        ) : (
          <ul className="mt-2 space-y-0.5" data-testid="inmobiliarias-que-sigues">
            {sigues.map((i) => (
              <li key={i.id}>
                <Link
                  href={paginaDe(i)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors duration-fast hover:bg-surface-muted"
                >
                  <LogoDeLaInmobiliaria i={i} tamano={26} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-fg">{i.nombre}</span>
                  {i.nuevos > 0 && (
                    <span
                      className="rounded-full bg-primary px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-primary-fg"
                      aria-label={`${i.nuevos} ${i.nuevos === 1 ? 'nuevo' : 'nuevos'}`}
                    >
                      {i.nuevos}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 rounded-md bg-surface-muted p-3 text-[13px] text-fg-muted">
          <p className="flex items-center gap-1.5 font-medium text-fg">
            <BellRinging className="h-4 w-4 text-primary" aria-hidden />
            Te aviso lo nuevo
          </p>
          <p className="mt-1 leading-relaxed">
            Cuando una de las que sigues publique algo, te aviso aquí en Leasefy y por correo.
          </p>
        </div>
      </div>
      {ventanaDeCuenta}
    </aside>
  );
}

/**
 * Lo de publicar en el lado: SÓLO la carga masiva de la inmobiliaria. «Publicar
 * inmueble» salía tres veces en escritorio (menú, barra y lado); Nico, 10-10-2026:
 * «menú y barra, sin el lateral».
 */
function LadoPublicar() {
  const donde = useDondePublicar();
  if (!donde?.muchos) return null;
  return (
    <div className="mt-1" data-testid="lado-publicar">
      <Link
        href={donde.muchos}
        className="flex h-9 w-full items-center gap-2 rounded-full px-4 text-[13.5px] text-fg-muted transition-colors duration-fast hover:bg-surface-muted hover:text-fg"
      >
        <FileArrowUp className="h-4 w-4" aria-hidden />
        Cargar muchos desde un archivo
      </Link>
    </div>
  );
}
