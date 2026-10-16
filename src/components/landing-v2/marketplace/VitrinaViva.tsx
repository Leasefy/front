'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { primeraFoto } from '@/components/property/PortadaDelInmueble';
import type { Property } from '@/lib/types/property';
import { useEnlace, useIdioma, useTx } from '@/lib/idioma/use-idioma';
import { dondeQueda, pesos, tipoDe, useCatalogo, useQuieto, useTurno } from './catalogo';

/**
 * ══ EL MARKETPLACE EN LA LANDING · «VITRINA VIVA» ══════════════════════════
 *
 * La que eligió Nico (16-10-2026) entre tres opciones: el gancho es el
 * inventario mismo, fotos reales de lo publicado moviéndose por la página.
 * De la opción «El mapa» se sumaron la franja de arriba
 * (`FranjaDelMarketplace`, en el header) y el mapa chico del hero
 * (`MapaEnElHero`). Cuatro lugares de esta:
 *   · el boleto encima del título del hero (se ve sin bajar);
 *   · una franja que pasa con inmuebles de verdad, debajo de la de frases;
 *   · la sección «Publica gratis», justo después del hero;
 *   · un aviso chico que acompaña mientras se baja.
 */

type AlTocar = (e: MouseEvent<HTMLAnchorElement>) => void;

/** Lo del idioma que usa cada pieza: el texto en pares, los enlaces con /es o /en y las cifras. */
function useLengua() {
  const tx = useTx();
  const enlace = useEnlace();
  const en = useIdioma() === 'en';
  const num = (n: number) => n.toLocaleString(en ? 'en-US' : 'es-CO');
  return { tx, enlace, en, num };
}

function Foto({ p, sizes, prioridad, pronto }: { p: Property; sizes: string; prioridad?: boolean; pronto?: boolean }) {
  return (
    <Image
      src={primeraFoto(p)!}
      alt=""
      fill
      sizes={sizes}
      priority={prioridad}
      loading={prioridad ? undefined : pronto ? 'eager' : 'lazy'}
      style={{ objectFit: 'cover' }}
    />
  );
}

/* ── El boleto del hero ─────────────────────────────────────────────────── */

export function BoletoDelMarketplace({ hrefPublicar, alTocarPublicar }: { hrefPublicar: string; alTocarPublicar: AlTocar }) {
  const { inmuebles, total, fallo, cargando } = useCatalogo();
  const { tx, enlace, num } = useLengua();
  const turno = useTurno(inmuebles.length, 2600);
  // Mientras carga, el hueco (que no salte el título). Sin catálogo (el back
  // no contestó o nadie ha publicado) el boleto se queda, sin fotos ni número:
  // «Publica gratis» es para cuando hay poco (Nico, 16-10-2026: «¿por qué le
  // quitaste… en el hero el widget de marketplace?»).
  if (cargando) return <div className="mk-boleto-hueco" aria-hidden="true" />;
  const conFotos = !fallo && inmuebles.length > 0;
  const tres = conFotos ? [0, 1, 2].map((k) => inmuebles[(turno + k) % inmuebles.length]) : [];
  return (
    <div className="mk-boleto" data-sin-fotos={!conFotos || undefined}>
      <a href={enlace('/propiedades')} className="mk-boleto-ver">
        {conFotos && (
          <span className="mk-boleto-fotos" aria-hidden="true">
            {tres.map((p, k) => (
              <span key={k} className="mk-boleto-foto">
                <AnimatePresence initial={false}>
                  <motion.span
                    key={p.id}
                    className="mk-boleto-capa"
                    initial={{ opacity: 0, scale: 1.15 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: motionDuration.reveal, ease: motionEase.enter, delay: k * 0.08 }}
                  >
                    <Foto p={p} sizes="40px" />
                  </motion.span>
                </AnimatePresence>
              </span>
            ))}
          </span>
        )}
        <span className="mk-boleto-k">Marketplace</span>
        <span className="mk-boleto-t">
          {conFotos ? (
            <>
              <b>{num(total)}</b> {tx('inmuebles para arrendar', 'properties for rent')}
            </>
          ) : (
            tx('Arriendos de las inmobiliarias de Leasefy', 'Rentals from the agencies on Leasefy')
          )}
        </span>
      </a>
      <a href={hrefPublicar} onClick={alTocarPublicar} className="mk-boleto-pub">
        {tx('Publica gratis', 'List for free')} <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

/* ── La franja que pasa ─────────────────────────────────────────────────── */

export function VitrinaQuePasa() {
  const { inmuebles, total, fallo } = useCatalogo();
  const { tx, enlace, en, num } = useLengua();
  const quieto = useQuieto();
  const pista = useRef<HTMLDivElement>(null);

  // Corre sola; con el scroll se acelera y va en el sentido en que se baja,
  // como la franja de siempre. Al pasar el mouse se detiene.
  useEffect(() => {
    const track = pista.current;
    if (!track || quieto || !inmuebles.length) return;
    let x = 0,
      vel = 0,
      dir = 1,
      ultimoY = window.scrollY,
      prev = performance.now(),
      raf = 0,
      pausa = false;
    const enPausa = () => (pausa = true);
    const sigue = () => (pausa = false);
    track.addEventListener('mouseenter', enPausa);
    track.addEventListener('mouseleave', sigue);
    const paso = (t: number) => {
      const dt = Math.min(64, t - prev);
      prev = t;
      const dy = window.scrollY - ultimoY;
      ultimoY = window.scrollY;
      vel += (dy - vel) * 0.12;
      if (Math.abs(vel) > 0.6) dir = vel > 0 ? 1 : -1;
      const mitad = track.scrollWidth / 2;
      if (!pausa) x -= dir * (0.04 * dt + Math.min(40, Math.abs(vel)) * 0.45);
      if (x <= -mitad) x += mitad;
      if (x > 0) x -= mitad;
      track.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener('mouseenter', enPausa);
      track.removeEventListener('mouseleave', sigue);
    };
  }, [quieto, inmuebles.length]);

  if (fallo || !inmuebles.length) return <div className="mk-vitrina mk-vitrina-vacia" aria-hidden="true" />;
  const vuelta = [...inmuebles, ...inmuebles];
  return (
    <section className="mk-vitrina" aria-label={tx('Inmuebles publicados en el marketplace de Leasefy', 'Properties listed on the Leasefy marketplace')}>
      <p className="mk-vitrina-rotulo">
        <i className="mk-cuadro" aria-hidden="true" />
        <span>
          {tx('En el', 'On the')} <br />
          marketplace
        </span>
      </p>
      <div className="mk-vitrina-pista">
        <div className="mk-vitrina-track" ref={pista}>
          {vuelta.map((p, k) => (
            <a key={`${p.id}-${k}`} href={enlace(`/propiedades/${p.id}`)} className="mk-vi" tabIndex={k >= inmuebles.length ? -1 : undefined} aria-hidden={k >= inmuebles.length || undefined}>
              <span className="mk-vi-foto">
                <Foto p={p} sizes="88px" pronto />
              </span>
              <span className="mk-vi-txt">
                <small>{dondeQueda(p)}</small>
                <b>
                  {pesos(p.monthlyRent, en)}
                  <em>{tx('/mes', '/mo')}</em>
                </b>
                <span>
                  {tipoDe(p, en)}
                  {p.bedrooms ? ` · ${p.bedrooms} ${tx('hab', 'bd')}` : ''} · {p.agencyName}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
      <a className="mk-vitrina-fin" href={enlace('/propiedades')}>
        {tx('Ver los', 'See all')} {num(total)} <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

/* ── La sección «Publica gratis» ────────────────────────────────────────── */

const RAZONES = [
  {
    es: ['Publicar no cuesta', 'Todos tus inmuebles, sin límite y sin pagar por aviso.'],
    en: ['Listing costs nothing', 'All your properties, with no limit and no fee per listing.'],
  },
  {
    es: ['Tu página en Leasefy', 'Tu perfil reemplaza tu sitio web: tus inmuebles, tus videos y lo que dicen de ti.'],
    en: ['Your page on Leasefy', 'Your profile replaces your website: your properties, your videos and what people say about you.'],
  },
  {
    es: ['Inquilinos que llegan listos', 'Quien busca se postula una sola vez; esa aprobación le sirve para tus inmuebles.'],
    en: ['Tenants who arrive ready', 'Renters apply once, and that approval counts for your properties.'],
  },
  {
    es: ['Te encuentran escribiendo', 'Quien busca le escribe a Ori como le hablaría a alguien, y Ori le muestra los tuyos.'],
    en: ['Found by asking', 'Renters write to Ori the way they would talk to a person, and Ori shows them yours.'],
  },
] as const;

/**
 * Las 6 casillas del mosaico. La grande es SIEMPRE «Tu inmueble aquí» (Nico,
 * 16-10-2026: «por más que hayan inmuebles deja esa card así»); las 5 chicas
 * muestran lo publicado y rotan de a una; la que no tiene inmueble sale
 * armándose.
 */
const CASILLAS = 6;
const CHICAS = CASILLAS - 1;

/**
 * Las razones de a una, con 01 02 03 04 como pestañas y la barrita que avanza
 * (Nico, 16-10-2026: «que quede como una sola cosa que se vaya pasando, para
 * que lo de la izquierda quede de la misma altura que lo de la derecha»). Pasa
 * sola al terminar la barrita (fin de la animación CSS: con «reducir
 * movimiento» no hay animación y no pasa sola); se pausa con el mouse o el
 * foco encima, y mientras no se ve.
 */
function RazonesQuePasan({ activa }: { activa: boolean }) {
  const [elegida, setElegida] = useState(0);
  const [encima, setEncima] = useState(false);
  const idioma = useIdioma();
  const tx = useTx();
  const [titulo, detalle] = RAZONES[elegida][idioma];
  return (
    <div
      className="mk-razones"
      data-pausa={encima || !activa || undefined}
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)}
      onBlur={() => setEncima(false)}
    >
      <div
        className="mk-razones-tabs"
        role="tablist"
        aria-label={tx('Por qué publicar en el marketplace', 'Why list on the marketplace')}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          const n = RAZONES.length;
          const sig = (elegida + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
          setElegida(sig);
          document.getElementById(`mk-razon-${sig}`)?.focus();
        }}
      >
        {RAZONES.map((_, k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`mk-razon-${k}`}
            aria-selected={k === elegida}
            aria-controls="mk-razon-panel"
            tabIndex={k === elegida ? 0 : -1}
            data-vista={k < elegida || undefined}
            className="mk-razon-tab"
            onClick={() => setElegida(k)}
          >
            {String(k + 1).padStart(2, '0')}
            <span className="mk-razon-barra" aria-hidden="true">
              <i
                onAnimationEnd={(e) => {
                  if (e.animationName === 'mk-razon-avanza') setElegida((x) => (x + 1) % RAZONES.length);
                }}
              />
            </span>
          </button>
        ))}
      </div>
      <div className="mk-razon-panel" id="mk-razon-panel" role="tabpanel" aria-labelledby={`mk-razon-${elegida}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={elegida}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
            transition={{ duration: motionDuration.base, ease: motionEase.enter }}
          >
            <b>{titulo}</b>
            <span>{detalle}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/*
 * Una casilla sin inmueble: uno armándose (Nico, 16-10-2026: «que en unas se
 * vean imágenes cargadas, en otras cargando… algo más interactivo»). Cada una
 * da su vuelta —vacía → la foto sube borrosa → se enfoca y se llenan sus datos
 * → lista ✓— y vuelve a empezar con otra foto; cada una arranca en otra fase,
 * así siempre hay de todo. Las fotos son las portadas de Leasefy y no hay nada
 * escrito: no se inventa un inmueble ni quién lo sube. Quieta con «reducir
 * movimiento» y mientras la sección no se ve.
 */
const FOTOS_DE_MUESTRA = [1, 2, 3, 4, 5, 6].map((n) => `/marketplace/portadas/leasefy-${n}.webp`);
type Fase = 'vacia' | 'subiendo' | 'enfocando' | 'lista';
const DURA: Record<Fase, number> = { vacia: 1800, subiendo: 1700, enfocando: 1100, lista: 4200 };
const SIGUIENTE: Record<Fase, Fase> = { vacia: 'subiendo', subiendo: 'enfocando', enfocando: 'lista', lista: 'vacia' };
const ARRANQUE: Fase[] = ['lista', 'subiendo', 'vacia', 'enfocando', 'lista'];
const AVANCE: Record<Fase, number> = { vacia: 0.12, subiendo: 0.85, enfocando: 1, lista: 1 };

function InmuebleArmandose({ casilla, activa }: { casilla: number; activa: boolean }) {
  const quieto = useQuieto();
  const [fase, setFase] = useState<Fase>(ARRANQUE[(casilla - 1) % ARRANQUE.length]);
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    if (quieto || !activa) return;
    const t = window.setTimeout(() => {
      if (fase === 'lista') setVuelta((v) => v + 1);
      setFase(SIGUIENTE[fase]);
    }, DURA[fase] + casilla * 137);
    return () => window.clearTimeout(t);
  }, [fase, quieto, activa, casilla]);
  const foto = FOTOS_DE_MUESTRA[(casilla - 1 + vuelta * CHICAS) % FOTOS_DE_MUESTRA.length];
  const borrosa = fase === 'subiendo';
  const conDatos = fase === 'enfocando' || fase === 'lista';
  return (
    <span className={`mk-tile mk-tile-${casilla} mk-tile-armandose`} data-fase={fase} aria-hidden="true">
      <AnimatePresence initial={false}>
        {fase !== 'vacia' && (
          <motion.span
            key={foto}
            className="mk-tile-capa"
            initial={{ opacity: 0, scale: 1.08, filter: 'blur(16px)' }}
            animate={{ opacity: 1, scale: borrosa ? 1.05 : 1, filter: borrosa ? 'blur(14px)' : 'blur(0px)' }}
            exit={{ opacity: 0, transition: { duration: motionDuration.slow, ease: motionEase.exit } }}
            transition={{ duration: motionDuration.reveal * 2, ease: motionEase.enter }}
          >
            <Image src={foto} alt="" fill sizes="280px" style={{ objectFit: 'cover' }} />
          </motion.span>
        )}
      </AnimatePresence>
      {fase !== 'lista' && <span className="mk-arma-brillo" />}
      <span className="mk-arma-avance" data-oculta={fase === 'lista' || undefined}>
        <motion.i
          initial={false}
          animate={{ scaleX: AVANCE[fase] }}
          transition={{ duration: DURA[fase] / 1000, ease: motionEase.standard }}
        />
      </span>
      <AnimatePresence>
        {fase === 'lista' && (
          <motion.span
            className="mk-arma-listo"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
            transition={{ duration: motionDuration.slow, ease: motionEase.emphasis }}
          >
            ✓
          </motion.span>
        )}
      </AnimatePresence>
      <span className="mk-arma-pie">
        {[0, 1, 2].map((k) => (
          <motion.i
            key={k}
            initial={false}
            animate={{ scaleX: conDatos ? 1 : 0.06 }}
            transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: conDatos ? 0.15 + k * 0.12 : 0 }}
          />
        ))}
      </span>
    </span>
  );
}

/** La casilla grande: la invitación. «Todavía no hay…» SÓLO si el catálogo contestó vacío. */
function TuInmuebleAqui({ vacia, hrefPublicar, alTocarPublicar }: { vacia: boolean; hrefPublicar: string; alTocarPublicar: AlTocar }) {
  const tx = useTx();
  return (
    <div className="mk-tile mk-tile-0 mk-tile-libre">
      <p className="mk-ceja">
        <i className="mk-cuadro" aria-hidden="true" />
        {tx('La vitrina del marketplace', 'The marketplace showcase')}
      </p>
      <b>{tx('Tu inmueble aquí', 'Your property here')}</b>
      <span>
        {vacia
          ? tx(
              'Todavía no hay inmuebles publicados. Los primeros que publiques salen aquí, con tus fotos, tu precio y tu marca.',
              'No properties listed yet. The first ones you list show up here, with your photos, your price and your brand.',
            )
          : tx(
              'Aquí salen, con foto y precio, los inmuebles que publican las inmobiliarias en Leasefy.',
              'This is where the properties listed by agencies on Leasefy show up, with photo and price.',
            )}
      </span>
      <a className="btn primary" href={hrefPublicar} onClick={alTocarPublicar}>
        {tx('Publicar gratis', 'List for free')} <span className="ar">→</span>
      </a>
    </div>
  );
}

export function MosaicoDelMarketplace({ hrefPublicar, alTocarPublicar }: { hrefPublicar: string; alTocarPublicar: AlTocar }) {
  const { inmuebles, total, inmobiliarias, fallo, cargando } = useCatalogo();
  const { tx, enlace, en, num } = useLengua();
  const quieto = useQuieto();
  const [enVista, setEnVista] = useState<number[]>([]);
  const [recien, setRecien] = useState<number | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setEnVista(inmuebles.slice(0, CHICAS).map((_, k) => k));
  }, [inmuebles]);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [cargando]);

  // Cada 3,4 s una casilla chica cambia por un inmueble que no está a la vista.
  useEffect(() => {
    if (quieto || !visible || inmuebles.length <= CHICAS) return;
    let casilla = 0;
    const t = window.setInterval(() => {
      setEnVista((actual) => {
        const fuera = inmuebles.map((_, k) => k).filter((k) => !actual.includes(k));
        if (!fuera.length) return actual;
        const nuevo = [...actual];
        nuevo[casilla] = fuera[Math.floor(Math.random() * fuera.length)];
        setRecien(casilla + 1);
        casilla = (casilla + 1) % CHICAS;
        return nuevo;
      });
    }, 3400);
    return () => window.clearInterval(t);
  }, [quieto, visible, inmuebles]);

  // La sección va SIEMPRE: su texto y sus botones son para que publiquen, y
  // eso hace más falta cuando hay poco publicado. Lo que sale del catálogo
  // (las casillas chicas y quiénes publican) sólo con inmuebles.
  const hayVitrina = !fallo && inmuebles.length > 0;

  return (
    <section className="sec mk-mosaico" id="marketplace" data-testid="landing-marketplace-opcion">
      <div className="container mk-mosaico-grid">
        <div className="mk-mosaico-txt">
          <p className="mk-ceja">
            <i className="mk-cuadro" aria-hidden="true" />
            {tx('Marketplace Leasefy · gratis para inmobiliarias', 'Leasefy Marketplace · free for agencies')}
          </p>
          <h2 className="h-big mk-h">
            {en ? (
              <>
                List for <span className="mk-hl">free</span>. Let the whole city find you.
              </>
            ) : (
              <>
                Publica <span className="mk-hl">gratis</span>. Que te encuentre toda la ciudad.
              </>
            )}
          </h2>
          <p className="mk-lead">
            {tx(
              'Sube tus inmuebles al marketplace de Leasefy sin pagar nada. Aparecen con tu marca, tus fotos y tus videos, frente a quien está buscando dónde vivir.',
              'Put your properties on the Leasefy marketplace without paying a thing. They show up with your brand, your photos and your videos, in front of people looking for a place to live.',
            )}
          </p>
          <RazonesQuePasan activa={visible} />
          <div className="mk-ctas">
            <a className="btn primary lg" href={hrefPublicar} onClick={alTocarPublicar}>
              {tx('Publicar mis inmuebles gratis', 'List my properties for free')} <span className="ar">→</span>
            </a>
            <a className="btn outline lg" href={enlace('/propiedades')}>
              {tx('Ver el marketplace', 'See the marketplace')}
            </a>
          </div>
        </div>

        <div className="mk-mosaico-fotos" ref={caja}>
          <div className="mk-bento">
            <TuInmuebleAqui vacia={!cargando && !fallo && !inmuebles.length} hrefPublicar={hrefPublicar} alTocarPublicar={alTocarPublicar} />
            {Array.from({ length: CHICAS }, (_, k) => {
              const casilla = k + 1;
              const p = hayVitrina && enVista[k] != null ? inmuebles[enVista[k]] : undefined;
              if (!p) return <InmuebleArmandose key={casilla} casilla={casilla} activa={visible} />;
              return (
                <a key={casilla} href={enlace(`/propiedades/${p.id}`)} className={`mk-tile mk-tile-${casilla}`}>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={p.id}
                      className="mk-tile-capa"
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: motionDuration.reveal * 1.4, ease: motionEase.enter }}
                    >
                      <Foto p={p} sizes="280px" />
                      {(casilla === recien || (recien === null && casilla === 1)) && (
                        <motion.span
                          className="mk-tile-tag"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.25 }}
                        >
                          {tx('Recién publicado', 'Just listed')}
                        </motion.span>
                      )}
                      <span className="mk-tile-pie">
                        <small>{dondeQueda(p)}</small>
                        <b>
                          {pesos(p.monthlyRent, en)}
                          <em>{tx('/mes', '/mo')}</em>
                        </b>
                      </span>
                    </motion.span>
                  </AnimatePresence>
                </a>
              );
            })}
          </div>
          {hayVitrina && inmobiliarias.length > 0 && (
            <div className="mk-publican">
              <p className="mk-publican-k">
                {tx(
                  `${num(total)} inmuebles de ${inmobiliarias.length} ${inmobiliarias.length === 1 ? 'inmobiliaria' : 'inmobiliarias'}`,
                  `${num(total)} properties from ${inmobiliarias.length} ${inmobiliarias.length === 1 ? 'agency' : 'agencies'}`,
                )}
              </p>
              <ul>
                {inmobiliarias.slice(0, 6).map((i) => (
                  <li key={i.nombre}>
                    <span className="mk-ini" aria-hidden="true">
                      {iniciales(i.nombre)}
                    </span>
                    {i.nombre}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/* ── El aviso que acompaña ──────────────────────────────────────────────── */

export function AvisoDelMarketplace() {
  const { inmuebles, total, fallo } = useCatalogo();
  const { tx, enlace, en, num } = useLengua();
  const [mostrar, setMostrar] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  const turno = useTurno(inmuebles.length, 3000, !mostrar);

  useEffect(() => {
    const mirar = () => {
      const mosaico = document.getElementById('marketplace')?.getBoundingClientRect();
      const vitrina = document.getElementById('inmuebles')?.getBoundingClientRect();
      const pie = document.getElementById('contacto')?.getBoundingClientRect();
      const tapado = (r?: DOMRect) => !!r && r.top < innerHeight && r.bottom > 0;
      setMostrar(scrollY > innerHeight * 0.9 && !tapado(mosaico) && !tapado(vitrina) && !tapado(pie));
    };
    mirar();
    addEventListener('scroll', mirar, { passive: true });
    return () => removeEventListener('scroll', mirar);
  }, []);

  const p = inmuebles[turno];
  const ver = useMemo(() => mostrar && !cerrado && !fallo && !!p, [mostrar, cerrado, fallo, p]);

  return (
    <AnimatePresence>
      {ver && p && (
        <motion.div
          className="mk-aviso"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
          transition={{ duration: motionDuration.slow, ease: motionEase.enter }}
        >
          <a href={enlace('/propiedades')} className="mk-aviso-ir">
            <span className="mk-aviso-foto">
              <AnimatePresence initial={false}>
                <motion.span
                  key={p.id}
                  className="mk-boleto-capa"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: motionDuration.reveal, ease: motionEase.standard }}
                >
                  <Foto p={p} sizes="56px" />
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="mk-aviso-txt">
              <small>
                <i className="mk-cuadro" aria-hidden="true" />
                Marketplace
              </small>
              <b>{tx(`${num(total)} inmuebles para arrendar`, `${num(total)} properties for rent`)}</b>
              <span>
                {dondeQueda(p)} · {pesos(p.monthlyRent, en)}
              </span>
            </span>
            <span className="mk-aviso-flecha" aria-hidden="true">
              →
            </span>
          </a>
          <button type="button" className="mk-aviso-x" aria-label={tx('Cerrar el aviso del marketplace', 'Close the marketplace notice')} onClick={() => setCerrado(true)}>
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
