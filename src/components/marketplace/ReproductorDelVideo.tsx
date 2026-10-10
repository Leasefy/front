'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import { ArrowSquareOut, CaretLeft, CaretRight, X } from '@phosphor-icons/react';

import { useLenis } from '@/components/providers/SmoothScroll';
import { usePortadaDelVideo } from '@/lib/marketplace/use-portada-del-video';
import { insercionDelVideo, NOMBRE_DE_LA_RED, type RedDelVideo } from '@/lib/marketplace/video';
import { cn } from '@/lib/utils';
import { ICONO_DE_LA_RED, LogoDeLaInmobiliaria } from './inmobiliaria/piezas';

/**
 * ══ EL REPRODUCTOR PROPIO (Nico, 09-10-2026) ═══════════════════════════════
 *
 * «¿Podríamos tener reproductor propio? Traer el video de esa propiedad de esa
 * red social y mostrarlo en un reproductor propio, tipo modal.» Eligió la
 * recomendada: la ventana es NUESTRA (el inmueble, la inmobiliaria, pasar al
 * siguiente video, ver el inmueble) y adentro va el reproductor OFICIAL de la
 * red, que es lo único que Instagram, TikTok, YouTube y Facebook permiten:
 * bajar su archivo está prohibido en sus términos. Así el video se ve sin
 * salir de Leasefy. Si el enlace no dice qué video es, se ofrece abrirlo allá.
 *
 * Contrato de modal + Lenis (DESIGN.md): `data-lenis-prevent` y
 * `useLenis().stop()` mientras está abierto. Va en un portal: una tira con
 * transformaciones no puede encerrar al `fixed`.
 */

export interface VideoParaVer {
  /** El id del inmueble (su llave en la lista). */
  id: string;
  enlace: string;
  red: RedDelVideo;
  /** La foto del inmueble: la portada cuando la red no da la suya. */
  foto: string | null;
  titulo: string;
  lugar: string;
  /** La ficha del inmueble. */
  href?: string | null;
  /** El precio ya escrito («$ 3.200.000 al mes»). */
  precio?: string | null;
  inmobiliaria?: { nombre: string; logoUrl: string | null; color?: string | null; href?: string | null } | null;
}

export function ReproductorDelVideo({
  videos,
  indice,
  alCambiar,
}: {
  videos: VideoParaVer[];
  /** El que se ve; `null` = cerrado. */
  indice: number | null;
  alCambiar: (indice: number | null) => void;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const lenis = useLenis();
  const total = videos.length;
  const abierto = indice !== null && indice >= 0 && indice < total;

  const cerrar = useCallback(() => alCambiar(null), [alCambiar]);
  const ir = useCallback(
    (paso: number) => {
      if (indice === null || total < 2) return;
      alCambiar((indice + paso + total) % total);
    },
    [alCambiar, indice, total],
  );

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowLeft') ir(-1);
      else if (e.key === 'ArrowRight') ir(1);
    };
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    lenis.stop();
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
      lenis.start();
    };
  }, [abierto, cerrar, ir, lenis]);

  if (!montado) return null;
  const v = abierto ? videos[indice] : null;

  return createPortal(
    <AnimatePresence>
      {v && (
        <motion.div
          key="reproductor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
          transition={{ duration: motionDuration.base, ease: motionEase.enter }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-label={`Video de ${v.titulo}`}
          onClick={cerrar}
          data-testid="reproductor-del-video"
        >
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar el video"
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-fast hover:bg-white/20 active:scale-[0.95]"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {total > 1 && (
            <span className="absolute left-4 top-6 z-10 rounded-full bg-white/10 px-3 py-1 font-mono text-[13px] tabular-nums text-white">
              {indice! + 1} / {total}
            </span>
          )}
          {total > 1 && (
            <>
              <Flecha lado="izquierda" alTocar={() => ir(-1)} />
              <Flecha lado="derecha" alTocar={() => ir(1)} />
            </>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <Escena key={v.id + v.enlace} v={v} alCerrar={cerrar} />
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Flecha({ lado, alTocar }: { lado: 'izquierda' | 'derecha'; alTocar: () => void }) {
  const Icono = lado === 'izquierda' ? CaretLeft : CaretRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        alTocar();
      }}
      aria-label={lado === 'izquierda' ? 'Video anterior' : 'Video siguiente'}
      className={cn(
        'absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-fast hover:bg-white/20 active:scale-[0.95] md:inline-flex',
        lado === 'izquierda' ? 'left-5' : 'right-5',
      )}
    >
      <Icono className="h-6 w-6" aria-hidden />
    </button>
  );
}

function Escena({ v, alCerrar }: { v: VideoParaVer; alCerrar: () => void }) {
  const insercion = insercionDelVideo(v.enlace);
  const portada = usePortadaDelVideo(v.enlace) ?? v.foto;
  const [cargo, setCargo] = useState(false);
  const vertical = insercion?.vertical ?? true;
  const Icono = ICONO_DE_LA_RED[v.red];
  const red = NOMBRE_DE_LA_RED[v.red];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
      transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex max-h-full w-full items-center gap-5 overflow-y-auto px-4 py-16 md:gap-8',
        vertical ? 'flex-col md:flex-row md:justify-center' : 'flex-col justify-center',
      )}
    >
      {/* El reproductor de la red, en nuestro marco. */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10',
          vertical ? 'aspect-[9/16] h-[min(72vh,760px)] max-w-[92vw]' : 'aspect-video w-[min(92vw,1040px)]',
        )}
      >
        {portada && !cargo && (
          <Image src={portada} alt="" fill unoptimized sizes="560px" className="object-cover opacity-60 blur-[2px]" />
        )}
        {insercion ? (
          <>
            {!cargo && (
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </span>
            )}
            <iframe
              src={insercion.src}
              title={`Video de ${v.titulo} en ${red}`}
              onLoad={() => setCargo(true)}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
              className={cn(
                'absolute inset-0 h-full w-full border-0 transition-opacity duration-base',
                cargo ? 'opacity-100' : 'opacity-0',
              )}
              data-testid="reproductor-de-la-red"
            />
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <Icono className="h-8 w-8" weight="fill" aria-hidden />
            <span className="text-[15px] font-medium">Este video sólo se puede ver en {red}</span>
            <a
              href={v.enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-ink"
            >
              Abrir en {red}
              <ArrowSquareOut className="h-4 w-4" aria-hidden />
            </a>
          </span>
        )}
      </div>

      {/* Lo nuestro: qué inmueble es, de quién, y qué hacer. */}
      <div className={cn('w-full text-white', vertical ? 'max-w-[340px]' : 'max-w-[1040px] md:flex md:items-end md:justify-between md:gap-8')}>
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12.5px]">
            <Icono className="h-3.5 w-3.5" weight="fill" aria-hidden />
            Video en {red}
          </span>
          <h2 className="mt-3 font-heading text-[22px] font-semibold leading-tight tracking-[-0.01em]">{v.titulo}</h2>
          {v.lugar && <p className="mt-1 text-[14px] text-white/70">{v.lugar}</p>}
          {v.precio && <p className="mt-3 font-mono text-[20px] font-semibold tabular-nums">{v.precio}</p>}
          {v.inmobiliaria && (
            <Wrapper href={v.inmobiliaria.href} alCerrar={alCerrar}>
              <LogoDeLaInmobiliaria i={v.inmobiliaria} tamano={28} />
              <span className="truncate text-[14px] text-white/85">{v.inmobiliaria.nombre}</span>
            </Wrapper>
          )}
        </div>
        <div className={cn('mt-5 flex flex-wrap gap-2', !vertical && 'md:mt-0 md:shrink-0')}>
          {v.href && (
            <Link
              href={v.href}
              onClick={alCerrar}
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[14px] font-medium text-ink transition-colors duration-fast hover:bg-white/90 active:scale-[0.97]"
              data-testid="ver-el-inmueble"
            >
              Ver el inmueble
            </Link>
          )}
          <a
            href={v.enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 px-4 text-[14px] font-medium text-white transition-colors duration-fast hover:bg-white/10 active:scale-[0.97]"
          >
            Abrir en {red}
            <ArrowSquareOut className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <p className="mt-4 text-[12.5px] text-white/50">Lo reproduce {red}, sin salir de Leasefy.</p>
      </div>
    </motion.div>
  );
}

function Wrapper({ href, alCerrar, children }: { href?: string | null; alCerrar: () => void; children: ReactNode }) {
  const clases = 'mt-4 flex items-center gap-2';
  return href ? (
    <Link href={href} onClick={alCerrar} className={cn(clases, 'hover:underline')}>
      {children}
    </Link>
  ) : (
    <span className={clases}>{children}</span>
  );
}
