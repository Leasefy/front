'use client';

/**
 * LOS WIDGETS DEL INICIO DE SESIÓN, sobre el video, como la pantalla de inicio de un teléfono.
 *
 * - Nico (29-10-2026): «algo pequeño, como si fuera un home con widgets», debajo del logo → la HORA de Colombia.
 * - 🔴 Nico (29-10, al verlos): «deben de ser widgets de cosas que no muestren información que está dentro de la
 *   inmobiliaria». Esta pantalla es pública: nada de recaudo, inquilinos, contratos ni visitas, ni «de ejemplo».
 * - Nico (29-10, después): «no dice nada ninguno […] uno que sea widget de blogs que vaya pasando entre blogs, otro de
 *   noticias sobre proptech, otro sobre novedades de nosotros y que tengan vida, si doy clic que me lleven a algún
 *   lado» y «los widgets los puedes dejar abajo a la izquierda» (el video va anclado a la izquierda para que se vea el
 *   cuadro con el símbolo de Leasefy: la hora arriba, el cuadro libre en el medio y los tres widgets abajo).
 *
 * Los tres pasan solos de una entrada a la siguiente, cada uno a su ritmo y desfasados (no cambian a la vez), con una
 * línea que se llena hasta el próximo; se detienen mientras el cursor o el foco están encima, y con movimiento
 * reducido no pasan solos. Cada uno es un enlace que se abre en otra pestaña (no se pierde el login):
 *   · Blog: los artículos del blog de Leasefy (`/blog/…`).
 *   · Proptech: titulares reales de Google Noticias, con su medio y hace cuánto (sin noticias, lleva a la búsqueda).
 *   · Novedades: lo que Leasefy estrenó en octubre, con su objeto 3D, hacia la página del producto.
 * Blog y noticias llegan de `GET /api/inicio` (armado una vez por hora); mientras tanto, su esqueleto en el vidrio.
 */

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion, type MotionProps } from 'framer-motion';
import { ArrowUpRight } from '@phosphor-icons/react';
import { Ilustracion, motionDuration, motionEase, type NombreIlustracion } from '@leasefy/cadence';
import type { LoDelInicio } from '@/lib/inicio/lo-del-inicio';
import { haceCuanto } from '@/lib/inicio/noticias-proptech';

/**
 * El vidrio de los widgets: brillo arriba (el material del vidrio) y filo de luz. Oscurece un poco lo de atrás para
 * que el texto se lea igual cuando la cortina clara del video pasa por detrás.
 */
const VIDRIO =
  'relative isolate overflow-hidden rounded-[22px] bg-black/35 text-white ring-1 ring-inset ring-white/15 ' +
  'shadow-[0_22px_50px_-26px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-brightness-[0.8] backdrop-saturate-150 ' +
  "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-b before:from-white/[0.16] before:to-transparent before:content-['']";

const ROTULO = 'font-mono text-label uppercase text-white/60';

/** Sin titulares (Google no respondió), el widget de noticias lleva a la búsqueda: nunca se inventa uno. */
const BUSQUEDA_DE_NOTICIAS = 'https://news.google.com/search?q=proptech&hl=es-419&gl=CO&ceid=CO:es-419';

/** Cada cuánto pasa cada widget y con qué desfase arranca (para que no cambien los tres a la vez). */
const RITMO = {
  blog: { cadaMs: 8000, desfaseMs: 0 },
  noticias: { cadaMs: 7000, desfaseMs: 2300 },
  novedades: { cadaMs: 9000, desfaseMs: 4600 },
} as const;

type Entrada = Pick<MotionProps, 'initial' | 'animate' | 'transition' | 'whileHover'>;
type CualWidget = keyof typeof RITMO;

function horaDeColombia(ahora: Date): { hora: string; periodo: string; dia: string } {
  const partes = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).formatToParts(ahora);
  const periodo = partes.find((p) => p.type === 'dayPeriod')?.value ?? '';
  const hora = partes
    .filter((p) => p.type !== 'dayPeriod')
    .map((p) => p.value)
    .join('')
    .trim();
  const dia = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(ahora);
  return { hora, periodo, dia: dia.charAt(0).toUpperCase() + dia.slice(1) };
}

/** Pasa a la siguiente entrada cada `cadaMs` (la primera vez, más el desfase); quieto mientras `quieto`. */
function useRotacion(total: number, { cadaMs, desfaseMs }: { cadaMs: number; desfaseMs: number }, quieto: boolean) {
  const [indice, setIndice] = useState(0);
  const [vueltas, setVueltas] = useState(0);
  const duracionMs = vueltas === 0 ? cadaMs + desfaseMs : cadaMs;
  useEffect(() => {
    if (quieto || total < 2) return;
    const t = setTimeout(() => {
      setIndice((i) => (i + 1) % total);
      setVueltas((v) => v + 1);
    }, duracionMs);
    return () => clearTimeout(t);
  }, [indice, quieto, total, duracionMs]);
  return { indice: total > 0 ? indice % total : 0, duracionMs };
}

export function WidgetsDeInicio() {
  const sinMovimiento = Boolean(useReducedMotion());
  // La hora se pinta en el navegador (en el servidor sería otra y la hidratación no coincide).
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => {
    setAhora(new Date());
    const reloj = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(reloj);
  }, []);

  const [datos, setDatos] = useState<LoDelInicio | null>(null);
  const [sinDatos, setSinDatos] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch('/api/inicio')
      .then((r) => (r.ok ? (r.json() as Promise<LoDelInicio>) : null))
      .then((d) => {
        if (!vivo) return;
        if (d) setDatos(d);
        else setSinDatos(true);
      })
      .catch(() => {
        if (vivo) setSinDatos(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const [encima, setEncima] = useState<CualWidget | null>(null);
  const blog = datos?.blog ?? [];
  const noticias = datos?.noticias ?? [];
  const rBlog = useRotacion(blog.length, RITMO.blog, sinMovimiento || encima === 'blog');
  const rNoticias = useRotacion(noticias.length, RITMO.noticias, sinMovimiento || encima === 'noticias');
  const rNovedades = useRotacion(NOVEDADES.length, RITMO.novedades, sinMovimiento || encima === 'novedades');
  const alPasarEncima = (cual: CualWidget) => (si: boolean) => setEncima(si ? cual : null);

  const entrada = (i: number): Entrada =>
    sinMovimiento
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: motionDuration.slow, ease: motionEase.enter, delay: 0.25 + i * 0.08 },
          whileHover: { y: -2 },
        };
  const { hora, periodo, dia } = ahora ? horaDeColombia(ahora) : { hora: '', periodo: '', dia: '' };
  const articulo = blog[rBlog.indice];
  const noticia = noticias[rNoticias.indice];
  const novedad = NOVEDADES[rNovedades.indice];
  const noticiasListas = Boolean(noticia) || sinDatos || datos !== null;

  return (
    <div className="contents" data-testid="widgets-de-inicio">
      <motion.div {...entrada(0)} className={`${VIDRIO} absolute left-8 top-[88px] w-[296px] px-5 pb-4 pt-5`}>
        <p className="flex items-baseline gap-1.5 font-heading tabular-nums" aria-live="off">
          <span className="text-[44px] font-[360] leading-[0.95] tracking-[-0.045em]">{hora || ' '}</span>
          <span className="text-[17px] font-[380] tracking-[-0.01em] text-white/75">{periodo}</span>
        </p>
        <p className="mt-2 text-[13px] text-white/70">{dia ? `${dia} · Colombia` : ' '}</p>
      </motion.div>

      <div className="absolute bottom-8 left-8 grid w-[296px] grid-cols-2 gap-2.5">
        {/* Blog: ancho, con la foto del artículo. */}
        {articulo ? (
          <Widget
            className="col-span-2"
            entrada={entrada(1)}
            href={articulo.href}
            etiqueta={`Blog de Leasefy: ${articulo.titulo}`}
            clave={articulo.href}
            duracionMs={rBlog.duracionMs}
            rota={blog.length > 1 && !sinMovimiento}
            pausado={encima === 'blog'}
            onEncima={alPasarEncima('blog')}
            testId="widget-blog"
          >
            <div className="flex items-center gap-3.5 pr-4">
              <Image
                src={articulo.imagen}
                alt=""
                width={64}
                height={64}
                sizes="64px"
                className="size-16 shrink-0 rounded-[14px] object-cover ring-1 ring-white/15"
              />
              <div className="min-w-0">
                <p className={`${ROTULO} truncate`}>Blog · {articulo.categoria}</p>
                <p className="mt-1 line-clamp-2 text-[14.5px] leading-snug text-white">{articulo.titulo}</p>
              </div>
            </div>
          </Widget>
        ) : sinDatos ? null : (
          <Esqueleto className="col-span-2" entrada={entrada(1)} conFoto />
        )}

        {/* Proptech: titulares reales; sin ellos, la búsqueda. */}
        {noticiasListas ? (
          <Widget
            entrada={entrada(2)}
            href={noticia?.url ?? BUSQUEDA_DE_NOTICIAS}
            etiqueta={noticia ? `Noticia de proptech: ${noticia.titulo}` : 'Noticias de proptech en Google Noticias'}
            clave={noticia?.url ?? 'busqueda'}
            duracionMs={rNoticias.duracionMs}
            rota={noticias.length > 1 && !sinMovimiento}
            pausado={encima === 'noticias'}
            onEncima={alPasarEncima('noticias')}
            testId="widget-noticias"
          >
            <div className="flex min-h-[136px] flex-col">
              <p className={`${ROTULO} pr-5`}>Proptech</p>
              <p className="mt-1.5 line-clamp-4 text-[13.5px] leading-snug text-white">
                {noticia?.titulo ?? 'Lo último del mundo proptech, en Google Noticias'}
              </p>
              {/* El medio y hace cuánto, al pie (en el rótulo, el medio se cortaba en «Proptech · …»). */}
              {noticia ? (
                <p className="mt-auto truncate pt-2 text-[12.5px] text-white/60" title={noticia.medio ?? undefined}>
                  {[noticia.medio, ahora ? haceCuanto(noticia.fecha, ahora) : null].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
          </Widget>
        ) : (
          <Esqueleto entrada={entrada(2)} />
        )}

        {/* Novedades de Leasefy: con su objeto 3D, hacia la página del producto. */}
        <Widget
          entrada={entrada(3)}
          href={novedad.href}
          etiqueta={`Novedad de Leasefy: ${novedad.titulo}`}
          clave={novedad.titulo}
          duracionMs={rNovedades.duracionMs}
          rota={!sinMovimiento}
          pausado={encima === 'novedades'}
          onEncima={alPasarEncima('novedades')}
          testId="widget-novedades"
        >
          <div className="flex min-h-[136px] flex-col gap-2.5">
            <Ilustracion
              nombre={novedad.ilustracion}
              tamano={44}
              loading="eager"
              className="pointer-events-none -ml-1 -mt-1 drop-shadow-[0_8px_12px_rgba(0,0,0,0.3)]"
            />
            <div>
              <p className={ROTULO}>Novedad</p>
              <p className="mt-1 text-[13.5px] leading-snug text-white">{novedad.titulo}</p>
            </div>
          </div>
        </Widget>
      </div>
    </div>
  );
}

/**
 * Un widget que es un enlace: su contenido cambia con un fundido corto y una línea abajo se llena hasta el próximo.
 * Con el cursor o el foco encima se detiene (la línea se vacía) y retoma al salir.
 */
function Widget({
  className = '',
  entrada,
  href,
  etiqueta,
  clave,
  duracionMs,
  rota,
  pausado,
  onEncima,
  testId,
  children,
}: {
  className?: string;
  entrada: Entrada;
  href: string;
  etiqueta: string;
  clave: string;
  duracionMs: number;
  rota: boolean;
  pausado: boolean;
  onEncima: (si: boolean) => void;
  testId: string;
  children: ReactNode;
}) {
  const sinMovimiento = useReducedMotion();
  return (
    <motion.a
      {...entrada}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${etiqueta} (se abre en otra pestaña)`}
      onMouseEnter={() => onEncima(true)}
      onMouseLeave={() => onEncima(false)}
      onFocus={() => onEncima(true)}
      onBlur={() => onEncima(false)}
      className={`${VIDRIO} group block p-4 pb-5 outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
      data-testid={testId}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={clave}
          initial={sinMovimiento ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={sinMovimiento ? undefined : { opacity: 0, y: -6, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
          transition={{ duration: motionDuration.base, ease: motionEase.standard }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <ArrowUpRight className="absolute right-3 top-3 size-4 text-white/45 transition-colors group-hover:text-white" aria-hidden="true" />
      {rota ? (
        <span className="absolute inset-x-4 bottom-2 h-0.5 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
          <motion.span
            key={`${clave}-${pausado}`}
            className="block h-full origin-left rounded-full bg-white/70"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: pausado ? 0 : 1 }}
            transition={{ duration: pausado ? motionDuration.fast : duracionMs / 1000, ease: 'linear' }}
          />
        </span>
      ) : null}
    </motion.a>
  );
}

/** Mientras llegan el blog y las noticias: el mismo vidrio con su esqueleto. */
function Esqueleto({ className = '', entrada, conFoto = false }: { className?: string; entrada: Entrada; conFoto?: boolean }) {
  return (
    <motion.div {...entrada} className={`${VIDRIO} p-4 pb-5 ${className}`} aria-hidden="true">
      <div className={conFoto ? 'flex items-center gap-3.5' : 'min-h-[136px]'}>
        {conFoto ? <span className="size-16 shrink-0 rounded-[14px] bg-white/10" /> : null}
        <span className="block flex-1 space-y-2">
          <span className="block h-2.5 w-20 rounded-full bg-white/15" />
          <span className="block h-3 w-full rounded-full bg-white/15" />
          <span className="block h-3 w-2/3 rounded-full bg-white/15" />
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Lo que Leasefy estrenó en octubre de 2026. Cada una es una función que existe (no se anuncia nada que no esté) y
 * lleva a la página del producto donde vive: crear el inmueble desde el enlace del aviso (27-10, CRM), Servi, que
 * revisa las facturas de servicios públicos (29-10, ERP), y renovar la vivienda con el IPC y sus avisos (29-10, ERP).
 */
const NOVEDADES: { titulo: string; ilustracion: NombreIlustracion; href: string }[] = [
  { titulo: 'Crea el inmueble con el enlace del aviso', ilustracion: 'casa', href: '/productos/crm' },
  { titulo: 'Servi revisa tus facturas de servicios', ilustracion: 'factura', href: '/productos/erp' },
  { titulo: 'Renueva la vivienda con el IPC', ilustracion: 'ipc', href: '/productos/erp' },
];
