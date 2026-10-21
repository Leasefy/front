'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowSquareOut, CaretDown, Check, CheckCircle, Copy, SpinnerGap, WhatsappLogo } from '@phosphor-icons/react';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { tituloDe, type InmuebleRapido } from '@/lib/publica/borrador';
import type { FotoGuardada } from '@/lib/publica/fotos-guardadas';
import { cn } from '@/lib/utils';

/** Hasta cuántos se listan enteros; con más, mosaico + lista plegada. */
const POCOS = 3;
/** Cuántas portadas lleva el mosaico. */
const EN_EL_MOSAICO = 8;
/** De a cuántos se abre la lista. */
const DE_A = 20;

/**
 * «Ya están en el marketplace» (Nico, 20-10-2026: con muchos, una lista de
 * 120 no la lee nadie). Con pocos, la lista. Con muchos: el número, un
 * mosaico de portadas con «y N más», UN enlace para compartirlos todos (la
 * página de la inmobiliaria en el marketplace) y la lista plegada.
 */
export function TodoPublicado({
  inmuebles,
  idDe,
  fotosDe,
  paginaPublica,
  porUbicar = 0,
  alTerminar,
  alPublicarMas,
}: {
  inmuebles: InmuebleRapido[];
  idDe: (clave: string) => string | null;
  fotosDe: (clave: string) => FotoGuardada[];
  /** La página de la inmobiliaria (`/i/<id>`); el propietario no tiene. */
  paginaPublica: string | null;
  /** Los que todavía se están ubicando en el mapa (ya publicados). */
  porUbicar?: number;
  alTerminar: { href: string; texto: string };
  alPublicarMas: () => void;
}) {
  const muchos = inmuebles.length > POCOS;
  // Las portadas, en un efecto (ver `useVistas`): una vez, al llegar a esta pantalla.
  const [portadas, setPortadas] = useState<Map<string, string | null>>(() => new Map());
  const claves = inmuebles.map((i) => i.clave).join('|');
  useEffect(() => {
    const nuevas = new Map(
      inmuebles.map((i) => {
        const f = fotosDe(i.clave)[0];
        return [i.clave, f ? URL.createObjectURL(f.miniatura ?? f.archivo) : null] as const;
      }),
    );
    setPortadas(nuevas);
    return () => nuevas.forEach((u) => u && URL.revokeObjectURL(u));
    // Sólo cuando cambian los inmuebles (por su clave): el padre arma la lista y
    // `fotosDe` de nuevo en cada render, y las fotos ya no cambian en esta pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claves]);

  const [abierta, setAbierta] = useState(!muchos);
  const [cuantos, setCuantos] = useState(DE_A);

  const enMosaico = inmuebles.slice(0, EN_EL_MOSAICO);
  const restantes = inmuebles.length - enMosaico.length;

  return (
    <div className="mx-auto w-full max-w-[680px] text-center" data-testid="todo-publicado">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="mx-auto inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success"
      >
        <CheckCircle size={34} weight="fill" aria-hidden="true" />
      </motion.span>
      <h1 className="mt-6 text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-fg sm:text-[36px]" data-testid="cuantos-publicados">
        {inmuebles.length === 1 ? 'Ya está en el marketplace' : `Ya están en el marketplace: ${inmuebles.length.toLocaleString('es-CO')}`}
      </h1>
      <p className="mt-3 text-[15px] text-fg-subtle">
        {inmuebles.length === 1 ? 'Compártelo' : 'Compártelos'} y te llegan los interesados a tu WhatsApp y a tu cuenta.
      </p>
      {porUbicar > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-fg-subtle" role="status" data-testid="ubicando-en-el-mapa">
          <SpinnerGap className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Poniendo {porUbicar === 1 ? '1 en el mapa' : `${porUbicar.toLocaleString('es-CO')} en el mapa`}: deja esta página abierta un momento.
        </p>
      )}

      {muchos && (
        <div className="mt-8 grid grid-cols-4 gap-2" data-testid="mosaico-publicados">
          {enMosaico.map((i, n) => {
            const ultimo = n === enMosaico.length - 1 && restantes > 0;
            const url = portadas.get(i.clave);
            return (
              <motion.div
                key={i.clave}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: n * 0.04 }}
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface-muted"
              >
                {url && <Image src={url} alt="" fill sizes="160px" className="object-cover" unoptimized />}
                {ultimo && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-mono text-[18px] font-medium text-white">
                    +{(restantes + 1).toLocaleString('es-CO')}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {paginaPublica && <CompartirLaPagina url={paginaPublica} cuantos={inmuebles.length} />}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="h-12 rounded-full px-7 text-[15px]" data-testid="entrar-a-mi-cuenta">
          <Link href={alTerminar.href}>{alTerminar.texto}</Link>
        </Button>
        <Button type="button" variant="secondary" className="h-12 rounded-full px-6 text-[15px]" onClick={alPublicarMas} data-testid="publicar-mas">
          Publicar más
        </Button>
      </div>

      {muchos && (
        <button
          type="button"
          onClick={() => setAbierta((a) => !a)}
          aria-expanded={abierta}
          className="mx-auto mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium text-fg-muted hover:text-fg"
          data-testid="ver-la-lista"
        >
          {abierta ? 'Ocultar la lista' : `Ver la lista (${inmuebles.length.toLocaleString('es-CO')})`}
          <CaretDown size={14} className={cn('transition-transform duration-fast', abierta && 'rotate-180')} aria-hidden="true" />
        </button>
      )}
      {abierta && (
        <ul className="mt-4 space-y-2.5 text-left">
          {inmuebles.slice(0, muchos ? cuantos : inmuebles.length).map((i) => {
            const id = idDe(i.clave);
            const url = portadas.get(i.clave);
            return (
              <li key={i.clave} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                  {url && <Image src={url} alt="" fill sizes="56px" className="object-cover" unoptimized />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-fg">{tituloDe(i)}</span>
                  <span className="block font-mono text-[12.5px] text-fg-subtle">
                    $ {(i.precio ?? 0).toLocaleString('es-CO')}
                    {i.operacion === 'rent' ? ' / mes' : ''}
                  </span>
                </span>
                {id && (
                  <Link href={`/propiedades/${id}`} target="_blank" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-primary hover:underline">
                    Ver
                    <ArrowSquareOut size={14} aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
          {muchos && cuantos < inmuebles.length && (
            <li className="text-center">
              <button type="button" onClick={() => setCuantos((c) => c + DE_A)} className="text-[13.5px] font-medium text-primary hover:underline">
                Ver {Math.min(DE_A, inmuebles.length - cuantos)} más
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function CompartirLaPagina({ url, cuantos }: { url: string; cuantos: number }) {
  const [copiado, setCopiado] = useState(false);
  const visible = url.replace(/^https?:\/\//, '');
  const mensaje = `Mira ${cuantos === 1 ? 'el inmueble que tenemos' : `los ${cuantos} inmuebles que tenemos`} en Leasefy: ${url}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso para el portapapeles: el enlace se ve y se puede seleccionar.
    }
  };
  return (
    <div className="mx-auto mt-8 max-w-[520px] rounded-lg border border-border bg-surface p-4 text-left" data-testid="compartir-pagina">
      <p className="text-[13px] font-medium text-fg-muted">
        {cuantos === 1 ? 'Tu página en Leasefy' : `Tu página en Leasefy, con los ${cuantos.toLocaleString('es-CO')}`}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1 truncate rounded-md bg-surface-muted px-3 py-2.5 font-mono text-[13px] text-fg" title={url}>
          {visible}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void copiar()} className="h-10 flex-1 rounded-full px-4 text-[13.5px] sm:flex-none" data-testid="copiar-pagina">
            {copiado ? <Check size={16} className="mr-1.5" aria-hidden="true" /> : <Copy size={16} className="mr-1.5" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
          <Button asChild variant="secondary" className="h-10 flex-1 rounded-full px-4 text-[13.5px] sm:flex-none">
            <a href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noreferrer noopener">
              <WhatsappLogo size={16} className="mr-1.5" aria-hidden="true" />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
