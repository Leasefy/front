'use client';

import { useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import {
  Check,
  ChatCircleDots,
  FacebookLogo,
  InstagramLogo,
  Play,
  SealCheck,
  ThumbsDown,
  ThumbsUp,
  TiktokLogo,
  UserPlus,
  WhatsappLogo,
  YoutubeLogo,
} from '@phosphor-icons/react';

import { iniciales } from '@/components/property/AdministradoPor';
import { usePortadaDelVideo } from '@/lib/marketplace/use-portada-del-video';
import {
  paginaDe,
  type OpinionPublica,
  type RedDeLaInmobiliaria,
  type ResumenDeLaRecomendacion,
  type TarjetaDeInmobiliaria,
} from '@/lib/api/marketplace.service';
import { useAqui, useSeguir } from '@/lib/marketplace/use-inmobiliarias';
import { useCuentaParaSeguir } from '../CuentaParaPublicar';
import { cn } from '@/lib/utils';

/**
 * ══ LAS PIEZAS DE LA INMOBILIARIA EN EL MARKETPLACE (Nico, 09-10-2026) ══════
 *
 * Las mismas que dibujó el prototipo de la opción 1 («Conversación primero»),
 * ahora con datos reales: su logo (o sus iniciales en el color de su marca),
 * el sello, «% la recomienda» (desde 5 votos), Seguir (sólo con cuenta), sus
 * redes, sus videos y lo que dicen de ella. Nada de cifras inventadas: sin
 * votos dice «Aún sin calificaciones»; sin videos, la tira no se pinta.
 */

export function numero(n: number): string {
  return n.toLocaleString('es-CO');
}

/** Sin color de marca: uno sobrio y fijo por nombre (la misma inmobiliaria, siempre el mismo). */
const RESPALDO = ['#1F3A8A', '#0F766E', '#6D28D9', '#9A3412', '#9F1239', '#075985', '#3F6212'];
export function colorDe(i: { nombre: string; color?: string | null }): string {
  if (i.color) return i.color;
  let h = 0;
  for (const c of i.nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return RESPALDO[h % RESPALDO.length];
}

/** Sus iniciales en el color de SU marca (no de Leasefy), o su logo. */
export function LogoDeLaInmobiliaria({
  i,
  tamano = 36,
  className,
}: {
  i: { nombre: string; logoUrl: string | null; color?: string | null };
  tamano?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-heading font-semibold',
        i.logoUrl ? 'bg-surface ring-1 ring-border' : 'text-white',
        className,
      )}
      style={{
        width: tamano,
        height: tamano,
        fontSize: Math.max(10, Math.round(tamano * 0.38)),
        ...(i.logoUrl ? {} : { backgroundColor: colorDe(i) }),
      }}
      aria-hidden
    >
      {i.logoUrl ? (
        <Image src={i.logoUrl} alt="" fill sizes={`${tamano}px`} className="object-contain p-[12%]" />
      ) : (
        iniciales(i.nombre)
      )}
    </span>
  );
}

export function SelloVerificada({ className }: { className?: string }) {
  return (
    <SealCheck
      className={cn('h-4 w-4 shrink-0 text-primary', className)}
      weight="fill"
      aria-label="Registrada en Leasefy con su NIT"
    >
      <title>Registrada en Leasefy con su NIT (no es una revisión contra la DIAN)</title>
    </SealCheck>
  );
}

/** «96 % la recomienda · 25 votos»; con menos de 5, «Aún pocas calificaciones» (o «Aún sin…» con 0). */
export function Recomienda({
  r,
  conVotos = false,
  className,
}: {
  r: ResumenDeLaRecomendacion;
  conVotos?: boolean;
  className?: string;
}) {
  if (r.porcentaje === null) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-[12.5px] text-fg-subtle', className)}
        data-testid="sin-calificaciones"
        title={r.votos > 0 ? 'El porcentaje se muestra desde 5 votos.' : undefined}
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
        {/* Con 1 a 4 votos ya no es «sin» (QA del marketplace, 10-10-2026). */}
        {r.votos > 0 ? 'Aún pocas calificaciones' : 'Aún sin calificaciones'}
      </span>
    );
  }
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap text-[12.5px] text-fg-muted', className)}
      data-testid="recomienda"
    >
      <ThumbsUp className="h-3.5 w-3.5 text-primary" weight="fill" aria-hidden />
      <span className="font-mono font-medium tabular-nums text-fg">
        {r.porcentaje}
        {' '}%
      </span>
      <span>la recomienda</span>
      {conVotos && (
        <span className="font-mono tabular-nums text-fg-subtle">
          · {numero(r.votos)} {r.votos === 1 ? 'voto' : 'votos'}
        </span>
      )}
    </span>
  );
}

/** «Seguir» — sólo con cuenta: sin sesión, lleva a crearla y vuelve aquí. */
export function BotonSeguir({
  i,
  tamano = 'md',
  className,
  alCambiar,
}: {
  i: { id: string; nombre: string; seguidores?: number };
  tamano?: 'sm' | 'md';
  className?: string;
  alCambiar?: (r: { siguiendo: boolean; seguidores: number }) => void;
}) {
  const { siguiendo, cambiar, ocupado, conCuenta, pideCuenta, setPideCuenta } = useSeguir(i.id, i.seguidores ?? 0);
  const { abrir, ventana } = useCuentaParaSeguir(useAqui(), i.nombre);
  useEffect(() => {
    if (!pideCuenta) return;
    abrir();
    setPideCuenta(false);
  }, [abrir, pideCuenta, setPideCuenta]);
  return (
    <>
      <motion.button
        type="button"
        onClick={async () => {
          const r = await cambiar();
          if (r) alCambiar?.(r);
        }}
        whileTap={{ scale: 0.97 }}
        disabled={ocupado}
        aria-pressed={conCuenta ? siguiendo : undefined}
        aria-label={
          !conCuenta
            ? `Crea tu cuenta para seguir a ${i.nombre}`
            : siguiendo
              ? `Dejar de seguir a ${i.nombre}`
              : `Seguir a ${i.nombre}`
        }
        title={conCuenta ? undefined : 'Para seguirla necesitas una cuenta (es gratis)'}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-base disabled:opacity-70',
          tamano === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14px]',
          siguiendo
            ? 'border border-border bg-surface text-fg hover:bg-surface-muted'
            : 'bg-primary text-primary-fg hover:bg-primary-600',
          className,
        )}
        data-testid="boton-seguir"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={siguiendo ? 'si' : 'no'}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: motionDuration.fast, ease: motionEase.enter }}
            className="inline-flex items-center gap-1.5"
          >
            {siguiendo ? <Check className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
            {siguiendo ? 'Siguiendo' : 'Seguir'}
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {ventana}
    </>
  );
}

export const ICONO_DE_LA_RED: Record<RedDeLaInmobiliaria, typeof InstagramLogo> = {
  instagram: InstagramLogo,
  tiktok: TiktokLogo,
  youtube: YoutubeLogo,
  facebook: FacebookLogo,
};
const NOMBRE_DE_LA_RED: Record<RedDeLaInmobiliaria, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

/** Sus redes: un clic abre su Instagram (Nico). Sólo las que puso en Configuración. */
export function RedesDeLaInmobiliaria({
  redes,
  conNombre = false,
}: {
  redes: Partial<Record<RedDeLaInmobiliaria, string | null>>;
  conNombre?: boolean;
}) {
  const lista = (Object.keys(ICONO_DE_LA_RED) as RedDeLaInmobiliaria[]).filter((r) => redes[r]);
  if (lista.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2" data-testid="redes-de-la-inmobiliaria">
      {lista.map((r) => {
        const Icono = ICONO_DE_LA_RED[r];
        return (
          <li key={r}>
            <a
              href={redes[r]!}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir su ${NOMBRE_DE_LA_RED[r]}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface text-fg transition-colors duration-base hover:border-border-strong',
                conNombre ? 'h-9 px-3 text-[13px]' : 'h-9 w-9 justify-center',
              )}
            >
              <Icono className="h-4 w-4" weight="fill" aria-hidden />
              {conNombre ? <span>{NOMBRE_DE_LA_RED[r]}</span> : <span className="sr-only">{NOMBRE_DE_LA_RED[r]}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function BotonWhatsapp({ numero: n, nombre }: { numero: string; nombre: string }) {
  const texto = encodeURIComponent(`Hola ${nombre}, los vi en Leasefy.`);
  return (
    <a
      href={`https://wa.me/${n}?text=${texto}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[14px] font-medium text-fg transition-colors duration-base hover:border-border-strong active:scale-[0.97]"
      data-testid="whatsapp-de-la-inmobiliaria"
    >
      <WhatsappLogo className="h-4 w-4 text-[#25D366]" weight="fill" aria-hidden />
      Escribir
    </a>
  );
}

/** Un video enlazado (el reel vive en la red; se abre allá). */
export function TarjetaDelVideo({
  v,
  i,
  ancho = 168,
  alAbrir,
}: {
  v: { enlace: string; red: keyof typeof ICONO_DE_LA_RED; foto: string | null; titulo: string; lugar: string };
  i?: { nombre: string; logoUrl: string | null; color?: string | null };
  ancho?: number;
  /** Con esto se abre en el reproductor propio (`ReproductorDelVideo`); sin esto, en la red. */
  alAbrir?: () => void;
}) {
  const Icono = ICONO_DE_LA_RED[v.red];
  // La portada que muestra la red (YouTube, TikTok); si no la da, la foto del inmueble.
  const portada = usePortadaDelVideo(v.enlace) ?? v.foto;
  const Raiz = alAbrir ? motion.button : motion.a;
  return (
    <Raiz
      {...(alAbrir
        ? { type: 'button' as const, onClick: alAbrir, 'aria-label': `Ver el video de ${v.titulo}` }
        : { href: v.enlace, target: '_blank', rel: 'noopener noreferrer' })}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: motionDuration.fast, ease: motionEase.enter }}
      className="block shrink-0 text-left"
      style={{ width: ancho }}
      data-testid="tarjeta-del-video"
    >
      <span className="relative block aspect-[9/16] overflow-hidden rounded-md bg-surface-muted">
        {portada ? (
          <Image
            src={portada}
            alt=""
            fill
            unoptimized={portada !== v.foto}
            sizes={`${ancho}px`}
            className="object-cover"
          />
        ) : null}
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" aria-hidden />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] text-white backdrop-blur-sm">
          <Icono className="h-3.5 w-3.5" weight="fill" aria-hidden />
          {NOMBRE_DE_LA_RED[v.red]}
        </span>
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-fg shadow-md">
            <Play className="h-5 w-5" weight="fill" />
          </span>
        </span>
        <span className="absolute inset-x-2.5 bottom-2.5 text-white">
          <span className="line-clamp-2 block text-[12.5px] font-medium leading-snug">{v.titulo}</span>
          {v.lugar && <span className="mt-0.5 block truncate text-[11.5px] text-white/80">{v.lugar}</span>}
        </span>
      </span>
      {i && (
        <span className="mt-2 flex items-center gap-1.5 text-[12px] text-fg-muted">
          <LogoDeLaInmobiliaria i={i} tamano={18} />
          <span className="truncate">{i.nombre}</span>
        </span>
      )}
    </Raiz>
  );
}

/** Tira horizontal que se desplaza (videos, tarjetas). */
export function Tira({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0 [scrollbar-width:thin]', className)}>
      {children}
    </div>
  );
}

function Barra({ etiqueta, si, no }: { etiqueta: string; si: number; no: number }) {
  const total = si + no;
  const pct = total > 0 ? Math.round((si / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-fg">{etiqueta}</span>
        <span className="font-mono tabular-nums text-fg-muted">
          {total > 0 ? (
            <>
              <span className="text-fg">
                {pct}
                {' '}%
              </span>{' '}
              sí · {numero(total)} {total === 1 ? 'voto' : 'votos'}
            </>
          ) : (
            'sin votos'
          )}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: pct / 100 }}
          viewport={{ once: true }}
          transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
          style={{ transformOrigin: 'left' }}
        />
      </div>
    </div>
  );
}

/** «¿La recomendarías para arrendar?»: el número grande y las dos barras. */
export function LaRecomendarias({ r, className }: { r: ResumenDeLaRecomendacion; className?: string }) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-surface p-5', className)}
      aria-label="¿La recomendarías para arrendar?"
      data-testid="la-recomendarias"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
        ¿La recomendarías para arrendar?
      </p>
      {r.porcentaje === null ? (
        <div className="mt-3">
          <p className="font-heading text-[22px] font-semibold text-fg">
            {r.votos > 0 ? 'Aún pocas calificaciones' : 'Aún sin calificaciones'}
          </p>
          <p className="mt-1 text-[14px] text-fg-muted">
            {r.votos > 0
              ? `Lleva ${r.votos} ${r.votos === 1 ? 'voto' : 'votos'}: el porcentaje se muestra desde 5.`
              : 'Cuando quienes firmaron con ella cumplan 3 meses de contrato, aquí estará lo que dicen.'}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-mono text-[44px] font-semibold leading-none tabular-nums text-fg">
              {r.porcentaje}
              {' '}%
            </span>
            <span className="pb-1 text-[14px] text-fg-muted">
              dice que sí · <span className="font-mono tabular-nums">{numero(r.votos)}</span> votos
            </span>
          </div>
          <div className="mt-5 space-y-3">
            <Barra etiqueta="Inquilinos" si={r.inquilinos.si} no={r.inquilinos.no} />
            <Barra etiqueta="Propietarios" si={r.propietarios.si} no={r.propietarios.no} />
          </div>
        </>
      )}
      <p className="mt-4 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-fg-muted">
        <SealCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" weight="fill" aria-hidden />
        Sólo votan quienes firmaron un contrato con ella en Leasefy. Nadie más puede calificarla.
      </p>
    </section>
  );
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function TarjetaDeOpinion({ o }: { o: OpinionPublica }) {
  const [anio, mes] = o.fecha.split('-').map(Number);
  return (
    <article className="rounded-lg border border-border bg-surface p-4" data-testid="opinion">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
            o.recomienda ? 'bg-primary/10 text-primary' : 'bg-surface-muted text-fg-muted',
          )}
        >
          {o.recomienda ? (
            <ThumbsUp className="h-3.5 w-3.5" weight="fill" aria-hidden />
          ) : (
            <ThumbsDown className="h-3.5 w-3.5" weight="fill" aria-hidden />
          )}
          {o.recomienda ? 'La recomienda' : 'No la recomienda'}
        </span>
        <span className="text-[12px] text-fg-subtle">
          {MESES[(mes ?? 1) - 1]} {anio}
        </span>
      </div>
      <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-fg">«{o.comentario}»</p>
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-fg-muted">
        <SealCheck className="h-3.5 w-3.5 text-primary" weight="fill" aria-hidden />
        {o.nombre} · {o.rol === 'PROPIETARIO' ? 'Propietario' : 'Inquilino'} · contrato verificado
      </p>
    </article>
  );
}

/** La tarjeta de «Inmobiliarias en Leasefy»: portada, logo, sello, zonas, Pregúntale y Seguir. */
export function TarjetaDeInmobiliaria({ t }: { t: TarjetaDeInmobiliaria }) {
  return (
    <article
      className="overflow-hidden rounded-lg border border-border bg-surface transition-shadow duration-base hover:shadow-md"
      data-testid="inmobiliaria-del-marketplace"
    >
      <Link
        href={paginaDe(t)}
        className="relative block h-24 bg-surface-muted"
        aria-label={`Ver la página de ${t.nombre}`}
      >
        {t.portadaUrl ? (
          <Image src={t.portadaUrl} alt="" fill sizes="320px" className="object-cover" />
        ) : (
          <span
            className="absolute inset-0"
            aria-hidden
            style={{ background: `linear-gradient(135deg, ${colorDe(t)}40, ${colorDe(t)}12)` }}
          />
        )}
      </Link>
      <div className="p-4 pt-0">
        <LogoDeLaInmobiliaria i={t} tamano={52} className="relative z-10 -mt-6 ring-4 ring-surface" />
        <Link
          href={paginaDe(t)}
          className="mt-2 flex items-center gap-1 text-[15px] font-medium text-fg hover:underline"
        >
          <span className="truncate">{t.nombre}</span>
          {t.verificada && <SelloVerificada />}
        </Link>
        <p className="truncate text-[13px] text-fg-muted">
          {t.zonas.length > 0 ? t.zonas.join(' · ') : (t.ciudad ?? '')}
          {' · '}
          <span className="font-mono tabular-nums">{t.inmuebles}</span> {t.inmuebles === 1 ? 'inmueble' : 'inmuebles'}
        </p>
        <Recomienda r={t.recomendacion} conVotos className="mt-1.5" />
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={paginaDe(t)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[13px] text-fg transition-colors duration-base hover:border-border-strong"
          >
            <ChatCircleDots className="h-4 w-4" aria-hidden />
            Pregúntale
          </Link>
          <BotonSeguir i={t} tamano="sm" />
        </div>
      </div>
    </article>
  );
}
