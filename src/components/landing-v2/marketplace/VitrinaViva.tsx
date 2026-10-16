'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { primeraFoto } from '@/components/property/PortadaDelInmueble';
import type { Property } from '@/lib/types/property';
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
  const turno = useTurno(inmuebles.length, 2600);
  if (fallo || cargando || !inmuebles.length) return <div className="mk-boleto-hueco" aria-hidden="true" />;
  const tres = [0, 1, 2].map((k) => inmuebles[(turno + k) % inmuebles.length]);
  return (
    <div className="mk-boleto">
      <a href="/propiedades" className="mk-boleto-ver">
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
        <span className="mk-boleto-k">Marketplace</span>
        <span className="mk-boleto-t">
          <b>{total.toLocaleString('es-CO')}</b> inmuebles para arrendar
        </span>
      </a>
      <a href={hrefPublicar} onClick={alTocarPublicar} className="mk-boleto-pub">
        Publica gratis <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}

/* ── La franja que pasa ─────────────────────────────────────────────────── */

export function VitrinaQuePasa() {
  const { inmuebles, total, fallo } = useCatalogo();
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
    <section className="mk-vitrina" aria-label="Inmuebles publicados en el marketplace de Leasefy">
      <p className="mk-vitrina-rotulo">
        <i className="mk-cuadro" aria-hidden="true" />
        <span>
          En el <br />
          marketplace
        </span>
      </p>
      <div className="mk-vitrina-pista">
        <div className="mk-vitrina-track" ref={pista}>
          {vuelta.map((p, k) => (
            <a key={`${p.id}-${k}`} href={`/propiedades/${p.id}`} className="mk-vi" tabIndex={k >= inmuebles.length ? -1 : undefined} aria-hidden={k >= inmuebles.length || undefined}>
              <span className="mk-vi-foto">
                <Foto p={p} sizes="88px" pronto />
              </span>
              <span className="mk-vi-txt">
                <small>{dondeQueda(p)}</small>
                <b>
                  {pesos(p.monthlyRent)}
                  <em>/mes</em>
                </b>
                <span>
                  {tipoDe(p)}
                  {p.bedrooms ? ` · ${p.bedrooms} hab` : ''} · {p.agencyName}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
      <a className="mk-vitrina-fin" href="/propiedades">
        Ver los {total.toLocaleString('es-CO')} <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

/* ── La sección «Publica gratis» ────────────────────────────────────────── */

const RAZONES = [
  ['Publicar no cuesta', 'Todos tus inmuebles, sin límite y sin pagar por aviso.'],
  ['Tu página en Leasefy', 'Tu perfil reemplaza tu sitio web: tus inmuebles, tus videos y lo que dicen de ti.'],
  ['Inquilinos que llegan listos', 'Quien busca se postula una sola vez; esa aprobación le sirve para tus inmuebles.'],
  ['Te encuentran escribiendo', 'Quien busca le escribe a Ori como le hablaría a alguien, y Ori le muestra los tuyos.'],
] as const;

/** Las 6 casillas del mosaico: la grande se queda, las chicas rotan de a una. */
const CASILLAS = 6;

export function MosaicoDelMarketplace({ hrefPublicar, alTocarPublicar }: { hrefPublicar: string; alTocarPublicar: AlTocar }) {
  const { inmuebles, total, inmobiliarias, fallo, cargando } = useCatalogo();
  const quieto = useQuieto();
  const [enVista, setEnVista] = useState<number[]>([]);
  const [recien, setRecien] = useState<number | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setEnVista(inmuebles.slice(0, CASILLAS).map((_, k) => k));
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
    if (quieto || !visible || inmuebles.length <= CASILLAS) return;
    let casilla = 1;
    const t = window.setInterval(() => {
      setEnVista((actual) => {
        const fuera = inmuebles.map((_, k) => k).filter((k) => !actual.includes(k));
        if (!fuera.length) return actual;
        const nuevo = [...actual];
        nuevo[casilla] = fuera[Math.floor(Math.random() * fuera.length)];
        setRecien(casilla);
        casilla = casilla >= CASILLAS - 1 ? 1 : casilla + 1;
        return nuevo;
      });
    }, 3400);
    return () => window.clearInterval(t);
  }, [quieto, visible, inmuebles]);

  if (fallo || (!cargando && !inmuebles.length)) return null;

  return (
    <section className="sec mk-mosaico" id="marketplace" data-testid="landing-marketplace-opcion">
      <div className="container mk-mosaico-grid">
        <div className="mk-mosaico-txt">
          <p className="mk-ceja">
            <i className="mk-cuadro" aria-hidden="true" />
            Marketplace Leasefy · gratis para inmobiliarias
          </p>
          <h2 className="h-big mk-h">
            Publica <span className="mk-hl">gratis</span>. Que te encuentre toda la ciudad.
          </h2>
          <p className="mk-lead">
            Sube tus inmuebles al marketplace de Leasefy sin pagar nada. Aparecen con tu marca, tus fotos y tus videos, frente a
            quien está buscando dónde vivir.
          </p>
          <ol className="mk-razones">
            {RAZONES.map(([t, d], k) => (
              <li key={t}>
                <span className="mk-razon-n">{String(k + 1).padStart(2, '0')}</span>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ol>
          <div className="mk-ctas">
            <a className="btn primary lg" href={hrefPublicar} onClick={alTocarPublicar}>
              Publicar mis inmuebles gratis <span className="ar">→</span>
            </a>
            <a className="btn outline lg" href="/propiedades">
              Ver el marketplace
            </a>
          </div>
        </div>

        <div className="mk-mosaico-fotos" ref={caja}>
          <div className="mk-bento">
            {enVista.map((idx, casilla) => {
              const p = inmuebles[idx];
              if (!p) return null;
              return (
                <a key={casilla} href={`/propiedades/${p.id}`} className={`mk-tile mk-tile-${casilla}`}>
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={p.id}
                      className="mk-tile-capa"
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: motionDuration.reveal * 1.4, ease: motionEase.enter }}
                    >
                      <Foto p={p} sizes={casilla === 0 ? '(max-width: 1024px) 100vw, 560px' : '280px'} prioridad={casilla === 0} />
                      {(casilla === recien || (recien === null && casilla === 0)) && (
                        <motion.span
                          className="mk-tile-tag"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: motionDuration.slow, ease: motionEase.enter, delay: 0.25 }}
                        >
                          Recién publicado
                        </motion.span>
                      )}
                      <span className="mk-tile-pie">
                        <small>{dondeQueda(p)}</small>
                        <b>
                          {pesos(p.monthlyRent)}
                          <em>/mes</em>
                        </b>
                        {casilla === 0 && (
                          <span>
                            {tipoDe(p)}
                            {p.bedrooms ? ` · ${p.bedrooms} hab` : ''}
                            {p.area ? ` · ${p.area} m²` : ''} · {p.agencyName}
                          </span>
                        )}
                      </span>
                    </motion.span>
                  </AnimatePresence>
                </a>
              );
            })}
          </div>
          {inmobiliarias.length > 0 && (
            <div className="mk-publican">
              <p className="mk-publican-k">
                {total.toLocaleString('es-CO')} inmuebles de {inmobiliarias.length}{' '}
                {inmobiliarias.length === 1 ? 'inmobiliaria' : 'inmobiliarias'}
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
          <a href="/propiedades" className="mk-aviso-ir">
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
              <b>{total.toLocaleString('es-CO')} inmuebles para arrendar</b>
              <span>
                {dondeQueda(p)} · {pesos(p.monthlyRent)}
              </span>
            </span>
            <span className="mk-aviso-flecha" aria-hidden="true">
              →
            </span>
          </a>
          <button type="button" className="mk-aviso-x" aria-label="Cerrar el aviso del marketplace" onClick={() => setCerrado(true)}>
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
