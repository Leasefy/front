'use client';

import type { ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * La tarjeta de la puesta en marcha: «¿Migramos tu inmobiliaria?» y, si toca,
 * «Protege tu cuenta». Dos pasos de lo mismo, en la MISMA tarjeta
 * (Nico, 30-09-2026: «no se ve que es como un paso que continúa, no se siente
 * que esto del 2FA es obligatorio realmente»). Antes cada uno era su modal:
 * otro ancho, otro velo, otra entrada, y entre los dos el panel se destapaba
 * un instante.
 *
 * La cáscara es la de la bienvenida del recorrido (`TourDelPanel`): dos
 * columnas, la foto de marca a la izquierda y el contenido a la derecha; en
 * teléfono, una columna con la foto como franja baja arriba.
 *
 * Dos maneras de aparecer:
 *  - `aparece`: llega sola (la primera vez, o al recargar con el segundo
 *    factor pendiente). Sube 12 px y se aclara, y la foto se acerca despacio.
 *  - `ya-estaba`: toma el relevo de la tarjeta anterior. El velo y la tarjeta
 *    no se mueven: la foto nueva se funde sobre la anterior y el contenido
 *    entra suave (eso lo pone quien la usa).
 * Con «reducir movimiento» no se mueve ni se funde nada.
 */

/** La curva de las capas de la casa (la del recorrido). */
export const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * El velo con la tinta de la casa, como el recorrido: en oscuro `--ink` ya es
 * casi negro, así que no aclara ni ensucia el tema. El MISMO en los dos pasos:
 * si cambiara, el fondo parpadearía en el relevo.
 */
export const VELO_DE_LA_PUESTA_EN_MARCHA = 'color-mix(in srgb, var(--ink) 62%, transparent)';

/** La columna de la foto en escritorio; todo el ancho en teléfono. */
const TAMANOS_DE_LA_FOTO = '(min-width: 768px) 360px, 100vw';

export interface TarjetaDePuestaEnMarchaProps {
  /** La foto de marca de este paso (`/images/features/leasefy-brand-*.jpg`). */
  foto: string;
  /** Dónde se apoya el recorte de la foto (`object-position`). */
  encuadre?: string;
  /** Ver arriba. */
  entrada: 'aparece' | 'ya-estaba';
  /** En el relevo, la foto del paso anterior: queda debajo mientras la nueva se funde. */
  fotoAnterior?: string | null;
  /** Se va sin relevo: el velo y la tarjeta se desvanecen juntos. */
  saliendo?: boolean;
  /** El z-index del velo, el de quien la usa. */
  capa: string;
  cajaRef?: Ref<HTMLDivElement>;
  /** El diálogo se nombra por el título (`aria-labelledby`) y se describe por la entrada. */
  tituloId: string;
  descripcionId?: string;
  testids: { velo: string; tarjeta: string; foto: string };
  children: ReactNode;
}

/** Va en un portal a `document.body`: quien la usa se asegura de estar en el navegador. */
export function TarjetaDePuestaEnMarcha({
  foto,
  encuadre = 'object-[50%_58%]',
  entrada,
  fotoAnterior = null,
  saliendo = false,
  capa,
  cajaRef,
  tituloId,
  descripcionId,
  testids,
  children,
}: TarjetaDePuestaEnMarchaProps) {
  const animar = !useReducedMotion();
  const aparece = entrada === 'aparece';

  return createPortal(
    <motion.div
      className={cn('fixed inset-0 flex items-center justify-center p-4', capa)}
      style={{ backgroundColor: VELO_DE_LA_PUESTA_EN_MARCHA }}
      initial={false}
      animate={{ opacity: saliendo ? 0 : 1 }}
      transition={{ duration: animar ? 0.28 : 0, ease: SUAVE }}
      data-testid={testids.velo}
      data-saliendo={saliendo || undefined}
    >
      <motion.div
        ref={cajaRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
        initial={animar && aparece ? { opacity: 0, y: 12, scale: 0.98 } : false}
        animate={saliendo ? { opacity: 0, y: 6, scale: 0.99 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: animar ? (saliendo ? 0.24 : 0.36) : 0, ease: SUAVE }}
        // La cáscara de los modales hechos a mano (`rounded-[20px]`, DESIGN
        // §17), la de la bienvenida del recorrido. `minmax(0,1fr)` también en
        // teléfono: con `auto`, lo que no podía partirse la estiraba.
        // En escritorio, el MISMO alto para los dos pasos: en el relevo la
        // tarjeta no crece ni se corre; lo que no cabe scrollea en la columna
        // del contenido, con la foto quieta. En teléfono scrollea la tarjeta.
        className="grid max-h-[calc(100dvh-32px)] w-full max-w-[880px] grid-cols-[minmax(0,1fr)] overflow-y-auto overscroll-contain rounded-[20px] border border-border bg-surface shadow-lg outline-none md:h-[min(880px,calc(100dvh-32px))] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden"
        style={{ overscrollBehavior: 'contain' }}
        data-lenis-prevent
        data-entrada={entrada}
        data-testid={testids.tarjeta}
      >
        <FotoDeLaTarjeta
          foto={foto}
          encuadre={encuadre}
          fotoAnterior={aparece ? null : fotoAnterior}
          animar={animar}
          testid={testids.foto}
        />
        <div
          className="flex min-w-0 flex-col p-6 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-10"
          style={{ overscrollBehavior: 'contain' }}
          data-lenis-prevent
        >
          {children}
          {/* Si el contenido no cabe (laptops bajas), el borde de abajo se
              desvanece: se nota que hay más sin poner una barra. Vive en el
              relleno de abajo (`-bottom-10`: el sticky se mide desde el borde
              del contenido, no desde el de la caja), así que cuando todo cabe
              no tapa nada. */}
          <div
            aria-hidden
            className="pointer-events-none sticky -bottom-10 -mb-10 hidden h-10 shrink-0 bg-gradient-to-t from-surface to-transparent md:block"
          />
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/**
 * La foto, limpia: sin píldora ni texto encima. En escritorio es la columna
 * izquierda a todo el alto; en teléfono, una franja baja arriba. Al aparecer,
 * un acercamiento lento, como quien entra; en el relevo, la nueva se funde
 * sobre la anterior.
 */
function FotoDeLaTarjeta({
  foto,
  encuadre,
  fotoAnterior,
  animar,
  testid,
}: {
  foto: string;
  encuadre: string;
  fotoAnterior: string | null;
  animar: boolean;
  testid: string;
}) {
  const fundir = fotoAnterior !== null && fotoAnterior !== foto;
  return (
    <div
      aria-hidden
      className="relative h-32 overflow-hidden bg-surface-muted sm:h-40 md:h-auto"
      data-foto={foto}
      data-testid={testid}
    >
      {fundir ? (
        <Image
          src={fotoAnterior}
          alt=""
          fill
          sizes={TAMANOS_DE_LA_FOTO}
          className={cn('object-cover', encuadre)}
          priority
        />
      ) : null}
      <motion.div
        className="absolute inset-0"
        initial={animar ? (fundir ? { opacity: 0 } : { scale: 1.06 }) : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: animar ? (fundir ? 0.7 : 1.4) : 0, ease: SUAVE }}
      >
        <Image
          src={foto}
          alt=""
          fill
          sizes={TAMANOS_DE_LA_FOTO}
          className={cn('object-cover', encuadre)}
          priority
        />
      </motion.div>
    </div>
  );
}
