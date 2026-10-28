'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRinging, ChatCircleDots, FileArrowUp, Plus, Trash } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import {
  alCambiarLasRecientes,
  escribirRecientes,
  leerRecientes,
  sinLaBusqueda,
  type BusquedaReciente,
} from '@/lib/marketplace/busquedas-recientes';
import { toast } from '@/components/ui/toast';
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
  // Si se borran (aquí mismo o al deshacer), la lista que quedó.
  useEffect(() => alCambiarLasRecientes(setPropias), []);
  const recientes = desdeAfuera ?? propias;

  // Borrar (Nico, 27-10-2026: «las personas deberían de tener la posibilidad de poder eliminar sus
  // búsquedas»): una o todas, sin preguntar antes; el aviso trae «Deshacer» por si fue sin querer.
  const borrar = (r: BusquedaReciente) => {
    const antes = recientes;
    escribirRecientes(sinLaBusqueda(antes, r.qs));
    toast.success('Búsqueda borrada', {
      description: r.titulo,
      action: { label: 'Deshacer', onClick: () => escribirRecientes(antes) },
    });
  };
  const borrarTodas = () => {
    const antes = recientes;
    escribirRecientes([]);
    toast.success(antes.length === 1 ? 'Borraste tu búsqueda' : `Borraste tus ${antes.length} búsquedas`, {
      description: 'Sólo estaban guardadas en este navegador.',
      action: { label: 'Deshacer', onClick: () => escribirRecientes(antes) },
    });
  };
  const { lista: sigues } = useInmobiliariasQueSigues();
  const { abrir: abrirCuenta, ventana: ventanaDeCuenta } = useCuentaParaSeguir(useAqui());

  return (
    <aside
      className="hidden border-r border-border-faint bg-surface lg:block lg:min-h-[calc(100vh-68px)]"
      aria-label="Tus búsquedas"
      data-testid="lado-del-marketplace"
    >
      {/* Queda a la vista al bajar (QA del marketplace, 10-10-2026: al desplazar,
          la columna se iba con la página y quedaba en blanco). */}
      <div
        className="px-4 pb-7 pt-5 lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-68px)] lg:overflow-y-auto"
        data-lenis-prevent
      >
        <Link
          href="/propiedades"
          className="flex h-[38px] w-full items-center gap-[7px] rounded-[13px] border border-border bg-surface px-[15px] text-[14px] font-medium text-fg transition-colors duration-fast hover:border-fg-subtle active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nueva búsqueda
        </Link>
        <LadoPublicar />
        <div className="mt-[26px] flex items-center justify-between gap-2 px-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">Tus búsquedas</p>
          {recientes.length > 1 && (
            <button
              type="button"
              onClick={borrarTodas}
              className="-my-1 rounded-[8px] px-1.5 py-1 text-[12px] text-fg-subtle transition-colors duration-fast hover:bg-surface-muted hover:text-fg"
              data-testid="borrar-todas-las-busquedas"
            >
              Borrar todas
            </button>
          )}
        </div>
        {recientes.length === 0 ? (
          <p className="mt-2 px-1 text-[13px] leading-[1.55] text-fg-muted">
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
                  <div className="group relative">
                    <Link
                      href={`/propiedades?${r.qs}`}
                      className={cn(
                        'flex items-center gap-[9px] rounded-[11px] py-2 pl-2.5 pr-9 text-[14px] transition-colors duration-fast',
                        r.qs === activa
                          ? 'bg-surface-muted text-fg'
                          : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                      )}
                      aria-current={r.qs === activa ? 'page' : undefined}
                    >
                      <ChatCircleDots className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{r.titulo}</span>
                    </Link>
                    {/* Se ve al pasar el mouse o con el teclado; el lado sólo existe en pantallas anchas. */}
                    <button
                      type="button"
                      onClick={() => borrar(r)}
                      aria-label={`Borrar la búsqueda «${r.titulo}»`}
                      title="Borrar"
                      className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-fg-subtle opacity-0 transition-[opacity,color,background-color] duration-fast hover:bg-surface hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                      data-testid="borrar-busqueda"
                    >
                      <Trash className="h-[15px] w-[15px]" aria-hidden />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <p className="mt-[26px] px-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          Inmobiliarias que sigues
        </p>
        {sigues === null ? (
          <p className="mt-2 px-1 text-[13px] leading-[1.55] text-fg-muted">
            Síguelas para ver aquí lo que publican.{' '}
            <button type="button" onClick={abrirCuenta} className="font-medium text-primary hover:underline">
              Crea tu cuenta
            </button>{' '}
            (es gratis).
          </p>
        ) : sigues.length === 0 ? (
          <p className="mt-2 px-1 text-[13px] leading-[1.55] text-fg-muted">
            Todavía no sigues a ninguna. En su página, toca «Seguir».
          </p>
        ) : (
          <ul className="mt-2 space-y-0.5" data-testid="inmobiliarias-que-sigues">
            {sigues.map((i) => (
              <li key={i.id}>
                <Link
                  href={paginaDe(i)}
                  className="flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 transition-colors duration-fast hover:bg-surface-muted"
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

        <div className="mt-[26px] rounded-[16px] bg-surface-muted p-3.5 text-[13px] text-fg-muted">
          <p className="flex items-center gap-[7px] font-medium text-fg">
            <BellRinging className="h-4 w-4 text-primary" aria-hidden />
            Te aviso lo nuevo
          </p>
          <p className="mt-1 leading-[1.5]">
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
        className="flex h-9 w-full items-center gap-2 rounded-[11px] px-2.5 text-[13.5px] text-fg-muted transition-colors duration-fast hover:bg-surface-muted hover:text-fg"
      >
        <FileArrowUp className="h-4 w-4" aria-hidden />
        Cargar muchos desde un archivo
      </Link>
    </div>
  );
}
