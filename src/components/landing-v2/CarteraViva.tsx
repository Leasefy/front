"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";

/**
 * «Cartera · Octubre 2026», viva (Nico, 12-10-2026: «le falta glow up, algo
 * más hermoso»; eligió «Cartera viva»). Lo que le gustaba —cifras,
 * movimientos, conciliación y pago a propietarios— en movimiento:
 * - el anillo del recaudo se llena hasta 85,3 % y la curva del mes se dibuja
 *   día a día contra septiembre;
 * - los pagos van llegando y cada uno pasa de «Recibido» a «Conciliado»;
 * - la línea del banco y la cuota se juntan y encajan con un destello;
 * - el pago del viernes recorre a los 14 propietarios.
 * Las cifras son las de la demo de las capturas («Tu Inmobiliaria», octubre):
 * causado $142,4 M, abonado $121,4 M (85,3 %), pendiente $20,9 M, cartera
 * vencida $27,85 M, dispersión $47,1 M a 14 propietarios.
 * Con «reducir movimiento» todo queda en su estado final.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

// Recaudo acumulado (millones) día a día: octubre hasta el 12 y septiembre completo.
const OCTUBRE = [0, 31.2, 58.4, 74.9, 86.3, 92.1, 99.8, 104.6, 109.9, 113.7, 117.2, 119.6, 121.4];
const SEPTIEMBRE = [0, 28.1, 52.7, 70.2, 82.5, 90.4, 97.1, 102.3, 107.8, 111.2, 114.6, 118.9, 121.9, 124.3, 126.1, 127.4, 128.5, 129.3, 130.1, 130.8, 131.3, 131.9, 132.4, 132.8, 133.1, 133.3, 133.4, 133.45, 133.47, 133.48, 133.48];
// La proyección del cierre (la de la pantalla de Recaudo: $ 141,2 M), del 12 al 31.
const PROYECCION = [121.4, 123.9, 126.1, 128.0, 129.7, 131.2, 132.6, 133.8, 134.9, 135.9, 136.8, 137.6, 138.3, 138.9, 139.4, 139.9, 140.3, 140.6, 140.9, 141.1, 141.2];
const TOPE = 150;

const PAGOS = [
  { ini: "CV", tinte: "#e8edff", nombre: "Camila Villegas", donde: "Cra 76 # 34-21 · Laureles", valor: "$ 2.350.000" },
  { ini: "JP", tinte: "#e6f6ee", nombre: "Juan Pablo Arango", donde: "Cl 9 Sur # 29A-40 · El Poblado", valor: "$ 4.200.000" },
  { ini: "NC", tinte: "#fdf0e3", nombre: "Natalia Correa", donde: "Cl 45 # 84-30 · La América", valor: "$ 1.900.000" },
  { ini: "TU", tinte: "#f3ecff", nombre: "Tomás Uribe", donde: "Cra 70 # 44B-12 · Laureles", valor: "$ 1.650.000" },
  { ini: "DZ", tinte: "#e7f4f7", nombre: "Daniela Zuluaga", donde: "Cl 75 Sur # 43A-60 · Sabaneta", valor: "$ 2.150.000" },
];

// El pago del viernes: 14 propietarios, $ 47.133.500 en total (como la pantalla de Dispersiones).
const GIROS = [
  ["Gloria Patricia Arango", 3_524_000], ["Jorge Iván Restrepo", 3_780_000], ["Inversiones La Ceja S.A.S.", 7_314_000],
  ["Luz Marina Gaviria", 2_160_000], ["Hernán Darío Toro", 4_272_000], ["Beatriz Elena Sierra", 1_894_000],
  ["Rentas del Sur S.A.S.", 6_387_000], ["Carlos Alberto Mejía", 1_673_000], ["Marta Lucía Ospina", 2_850_000],
  ["Andrés Felipe Henao", 3_120_000], ["Claudia Patricia Ruiz", 2_236_500], ["Fernando Londoño", 2_541_000],
  ["Olga Lucía Vélez", 1_932_000], ["Ricardo Andrés Botero", 3_450_000],
] as const;
const PROPIETARIOS = GIROS.length;
const iniciales = (n: string) => n.replace(/ S\.A\.S\.$/, "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
const pesos = (v: number) => `$ ${v.toLocaleString("es-CO")}`;

/** Curva suave que no se pasa de los puntos (interpolación monótona, Fritsch–Carlson). */
function curvaSuave(pts: readonly (readonly [number, number])[]) {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  }
  t.push(m[n - 2]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = dx[i] / 3;
    d += ` C${(x0 + h).toFixed(1)},${(y0 + t[i] * h).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - t[i + 1] * h).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/** La curva del recaudo, dibujada a su tamaño real (sin estirarse). */
function CurvaDelRecaudo({ visto, reducido }: { visto: boolean; reducido: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(520);
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ALTO = 178;
  const IZQ = 56;
  const DER = 74;
  const ARR = 26;
  const ABA = 24;
  const x = (dia: number) => IZQ + (dia / 30) * (ancho - IZQ - DER);
  const y = (v: number) => ARR + (1 - v / TOPE) * (ALTO - ARR - ABA);
  const oct = OCTUBRE.map((v, i) => [x(i), y(v)] as const);
  const sep = SEPTIEMBRE.map((v, i) => [x(i), y(v)] as const);
  const pro = PROYECCION.map((v, i) => [x(12 + (i * 18) / (PROYECCION.length - 1)), y(v)] as const);
  const hoy = oct[oct.length - 1];
  const fin = pro[pro.length - 1];
  const base = y(0);
  const lineaOct = curvaSuave(oct);
  const anim = visto || reducido;
  const tipIzq = Math.min(Math.max(hoy[0], 90), ancho - 90);
  return (
    <div className="cv-curva" ref={caja} data-zona="cierre">
      <div className="cv-curva-hd">
        <span>Recaudo acumulado</span>
        <span className="cv-ley">
          <i className="cv-ley-oct" /> Octubre <i className="cv-ley-sep" /> Septiembre
        </span>
      </div>
      <svg width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} aria-hidden="true">
        <defs>
          <linearGradient id="cv-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a40ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1a40ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100, 150].map((v) => (
          <g key={v}>
            <line x1={IZQ} x2={ancho - DER} y1={y(v)} y2={y(v)} className={v === 0 ? "cv-eje" : "cv-rejilla"} />
            <text x={IZQ - 10} y={y(v) + 3.5} className="cv-txt" textAnchor="end">
              {v === 0 ? "$ 0" : `$ ${v} M`}
            </text>
          </g>
        ))}
        <text x={x(0)} y={ALTO - 4} className="cv-txt">1 oct</text>
        <text x={x(30)} y={ALTO - 4} className="cv-txt" textAnchor="end">31 oct</text>
        <motion.path d={curvaSuave(sep)} className="cv-sep" initial={{ opacity: reducido ? 1 : 0 }} animate={anim ? { opacity: 1 } : undefined} transition={{ duration: 0.8, delay: 0.1 }} />
        <motion.path
          d={`${lineaOct} L${hoy[0].toFixed(1)},${base} L${oct[0][0].toFixed(1)},${base} Z`}
          fill="url(#cv-area)"
          initial={{ opacity: reducido ? 1 : 0 }}
          animate={anim ? { opacity: 1 } : undefined}
          transition={{ duration: 1, delay: 1.3 }}
        />
        <motion.line x1={hoy[0]} x2={hoy[0]} y1={hoy[1]} y2={base} className="cv-marca" initial={{ opacity: reducido ? 1 : 0 }} animate={anim ? { opacity: 1 } : undefined} transition={{ duration: 0.6, delay: 1.9 }} />
        <motion.path d={curvaSuave(pro)} className="cv-pro" initial={{ pathLength: reducido ? 1 : 0 }} animate={anim ? { pathLength: 1 } : undefined} transition={{ duration: 1.2, ease: EASE, delay: 2.1 }} />
        <motion.path d={lineaOct} className="cv-oct" initial={{ pathLength: reducido ? 1 : 0 }} animate={anim ? { pathLength: 1 } : undefined} transition={{ duration: 1.8, ease: EASE, delay: 0.3 }} />
        <motion.g initial={{ opacity: reducido ? 1 : 0 }} animate={anim ? { opacity: 1 } : undefined} transition={{ duration: 0.4, delay: 2 }}>
          <circle cx={hoy[0]} cy={hoy[1]} r="11" className="cv-hoy-halo" />
          <circle cx={hoy[0]} cy={hoy[1]} r="5.5" className="cv-hoy" />
          <circle cx={fin[0]} cy={fin[1]} r="3.5" className="cv-fin" />
          <text x={fin[0] + 8} y={fin[1] - 6} className="cv-txt cv-txt--pro">$ 141,2 M</text>
          <text x={fin[0] + 8} y={fin[1] + 8} className="cv-txt">al cierre</text>
        </motion.g>
      </svg>
      <motion.span
        className="cv-tip"
        style={{ left: tipIzq, top: hoy[1] + 52, x: "-50%" }}
        initial={{ opacity: reducido ? 1 : 0, y: 6 }}
        animate={anim ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.5, delay: 2.1 }}
      >
        <b>$ 121,4 M</b> recaudado al 12 oct
      </motion.span>
    </div>
  );
}

/** Una cifra que cuenta hasta su valor al aparecer. */
function Cifra({ hasta, decimales = 1, prefijo = "$ ", sufijo = " M", correr }: { hasta: number; decimales?: number; prefijo?: string; sufijo?: string; correr: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const escribir = (v: number) => {
      el.textContent = `${prefijo}${v.toLocaleString("es-CO", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}${sufijo}`;
    };
    if (!correr) {
      escribir(hasta);
      return;
    }
    const c = animate(0, hasta, { duration: 1.6, ease: EASE, onUpdate: escribir });
    return () => c.stop();
  }, [hasta, decimales, prefijo, sufijo, correr]);
  return <span ref={ref} />;
}

const redondo = (n: number) => Math.round(n * 100) / 100;

/** Las partes de la Cartera que «Qué resuelve» ilumina (`CarteraConLoQueResuelve`). */
export type ZonaDeLaCartera = "cobros" | "mora" | "banco" | "pago" | "cierre";

export function CarteraViva({ foco = null }: { foco?: ZonaDeLaCartera | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion() ?? false;
  const visto = useInView(ref, { amount: 0.3, once: true });
  const vivo = visto && !reducido;

  // Los pagos que van llegando: el más nuevo arriba; cada uno se concilia al rato.
  const [llegados, setLlegados] = useState<{ k: number; i: number; ok: boolean }[]>([
    { k: 2, i: 2, ok: true },
    { k: 1, i: 1, ok: true },
    { k: 0, i: 0, ok: true },
  ]);
  useEffect(() => {
    if (!vivo) return;
    let k = 3;
    const reloj = window.setInterval(() => {
      const nuevo = { k, i: k % PAGOS.length, ok: false };
      k += 1;
      setLlegados((l) => [nuevo, ...l].slice(0, 3));
      window.setTimeout(() => setLlegados((l) => l.map((p) => (p.k === nuevo.k ? { ...p, ok: true } : p))), 1100);
    }, 2600);
    return () => window.clearInterval(reloj);
  }, [vivo]);

  // La conciliación: se juntan, encajan y vuelven a empezar.
  const [ronda, setRonda] = useState(0);
  useEffect(() => {
    if (!vivo) return;
    const reloj = window.setInterval(() => setRonda((r) => r + 1), 4200);
    return () => window.clearInterval(reloj);
  }, [vivo]);

  // El pago del viernes: se le gira a uno tras otro; al terminar se queda un rato y vuelve a empezar.
  const [girados, setGirados] = useState(reducido ? PROPIETARIOS : 0);
  useEffect(() => {
    if (!vivo) return;
    let n = 0;
    const reloj = window.setInterval(() => {
      n = n >= PROPIETARIOS + 5 ? 0 : n + 1;
      setGirados(Math.min(n, PROPIETARIOS));
    }, 650);
    return () => window.clearInterval(reloj);
  }, [vivo]);
  const giradoCop = GIROS.slice(0, girados).reduce((a, [, v]) => a + v, 0);
  const actual = girados > 0 && girados <= PROPIETARIOS ? GIROS[girados - 1] : null;

  const R = 60;
  const C = 2 * Math.PI * R;

  return (
    <div className="cv" ref={ref} data-foco={foco ?? undefined}>
      <div className="cv-hd">
        <span className="cv-k">
          <i className="cv-vivo" />
          Cartera · Octubre 2026
        </span>
        <span className="cv-pill">En vivo · 12 oct</span>
      </div>

      <div className="cv-top">
        <div className="cv-anillo">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <defs>
              <linearGradient id="cv-anillo-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7e97ff" />
                <stop offset="100%" stopColor="#1a40ff" />
              </linearGradient>
            </defs>
            {Array.from({ length: 60 }).map((_, i) => {
              const a = (i / 60) * 2 * Math.PI;
              const largo = i % 5 === 0 ? 5 : 3;
              return (
                // Redondeadas: el seno del servidor y el del navegador difieren en el último decimal
                // y React avisaba que la hidratación no cuadraba.
                <line
                  key={i}
                  x1={redondo(80 + Math.cos(a) * 75)}
                  y1={redondo(80 + Math.sin(a) * 75)}
                  x2={redondo(80 + Math.cos(a) * (75 - largo))}
                  y2={redondo(80 + Math.sin(a) * (75 - largo))}
                  className={i / 60 <= 0.853 ? "cv-marca-anillo cv-marca-anillo--on" : "cv-marca-anillo"}
                />
              );
            })}
            <circle cx="80" cy="80" r={R} className="cv-anillo-fondo" />
            <motion.circle
              cx="80"
              cy="80"
              r={R}
              className="cv-anillo-lleno"
              stroke="url(#cv-anillo-grad)"
              strokeDasharray={C}
              initial={{ strokeDashoffset: reducido ? C * (1 - 0.853) : C }}
              animate={visto || reducido ? { strokeDashoffset: C * (1 - 0.853) } : undefined}
              transition={{ duration: 1.8, ease: EASE, delay: 0.2 }}
            />
            <motion.g
              style={{ transformOrigin: "80px 80px", transformBox: "view-box" }}
              initial={{ rotate: reducido ? 0.853 * 360 : 0 }}
              animate={visto || reducido ? { rotate: 0.853 * 360 } : undefined}
              transition={{ duration: 1.8, ease: EASE, delay: 0.2 }}
            >
              <circle cx={80 + R} cy="80" r="9" className="cv-cabeza-halo" />
              <circle cx={80 + R} cy="80" r="4.5" className="cv-cabeza" />
            </motion.g>
          </svg>
          <div className="cv-anillo-txt">
            <b>
              <Cifra hasta={85.3} prefijo="" sufijo="" correr={vivo} />
              <small>%</small>
            </b>
            <span>recaudado</span>
          </div>
        </div>

        <dl className="cv-kpis">
          {(
            [
              { k: "Causado", v: 142.4, nota: "64 cuotas de octubre", barra: 1, tono: "" },
              { k: "Recaudado", v: 121.4, nota: "52 cuotas pagadas", barra: 0.853, tono: "azul", delta: "+3,4 % vs. sep" },
              { k: "Por cobrar", v: 20.9, nota: "12 cuotas sin pagar", barra: 0.147, tono: "" },
              { k: "En mora", v: 27.9, nota: "11 cuotas vencidas", barra: 0.196, tono: "mora" },
            ] as const
          ).map((m, i) => (
            <div key={m.k} className="cv-kpi" data-zona={m.tono === "mora" ? "mora" : undefined}>
              <dt>
                {m.tono === "mora" && <i className="cv-punto-mora" />}
                {m.k}
                {"delta" in m && <span className="cv-delta">{m.delta}</span>}
              </dt>
              <dd className={m.tono ? `cv-${m.tono}` : undefined}>
                <span className="cv-moneda">$</span>
                <Cifra hasta={m.v} prefijo="" sufijo="" correr={vivo} />
                <span className="cv-unidad">M</span>
              </dd>
              <span className="cv-barra" aria-hidden="true">
                <motion.i
                  className={m.tono ? `cv-barra-${m.tono}` : undefined}
                  initial={{ scaleX: reducido ? m.barra : 0 }}
                  animate={visto || reducido ? { scaleX: m.barra } : undefined}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.4 + i * 0.12 }}
                />
              </span>
              <span className="cv-nota-kpi">{m.nota}</span>
            </div>
          ))}
        </dl>

        <CurvaDelRecaudo visto={visto} reducido={reducido} />
      </div>

      <div className="cv-mid">
        <div className="cv-llegan" data-zona="cobros">
          <p className="cv-sub">Llegó hoy</p>
          <ul>
            <AnimatePresence initial={false} mode="popLayout">
              {llegados.map((p) => {
                const pago = PAGOS[p.i];
                return (
                  <motion.li
                    key={p.k}
                    layout
                    initial={{ opacity: 0, y: -16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.35 } }}
                    transition={{ layout: { duration: 0.6, ease: EASE }, duration: 0.6, ease: EASE }}
                  >
                    <span className="cv-av" style={{ background: pago.tinte }}>{pago.ini}</span>
                    <span className="cv-quien">
                      <b>{pago.nombre}</b>
                      <i>{pago.donde}</i>
                    </span>
                    <span className="cv-valor">{pago.valor}</span>
                    <span className={p.ok ? "cv-chip cv-chip--ok" : "cv-chip"}>{p.ok ? "Conciliado ✓" : "Recibido"}</span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        <div className="cv-conc" data-zona="banco">
          <p className="cv-sub">Conciliación bancaria · el agente</p>
          <div className="cv-pista" key={ronda}>
            <motion.div
              className="cv-ficha"
              initial={{ x: reducido ? "0%" : "-30%", opacity: reducido ? 1 : 0 }}
              animate={{ x: "0%", opacity: 1 }}
              transition={{ duration: 1.1, ease: EASE }}
            >
              <b>$ 2.350.000</b>
              <i>Banco · 12 oct</i>
            </motion.div>
            <motion.span
              className="cv-encaje"
              initial={{ scale: reducido ? 1 : 0, opacity: reducido ? 1 : 0 }}
              animate={{ scale: [0, 1.25, 1], opacity: 1 }}
              transition={{ duration: 0.7, delay: reducido ? 0 : 1.05, ease: EASE }}
            >
              ✓
            </motion.span>
            <motion.span
              className="cv-destello"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={reducido ? { opacity: 0 } : { scale: [0.4, 2.4], opacity: [0.6, 0] }}
              transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
            />
            <motion.div
              className="cv-ficha cv-ficha--der"
              initial={{ x: reducido ? "0%" : "30%", opacity: reducido ? 1 : 0 }}
              animate={{ x: "0%", opacity: 1 }}
              transition={{ duration: 1.1, ease: EASE }}
            >
              <b>Cuota CT-1042</b>
              <i>Camila Villegas · octubre</i>
            </motion.div>
          </div>
          <motion.p
            className="cv-nota"
            key={`n-${ronda}`}
            initial={{ opacity: reducido ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: reducido ? 0 : 1.4 }}
          >
            Conciliado solo, en 0,4 s · recibo N.º 1.284 emitido
          </motion.p>
        </div>
      </div>

      <div className="cv-pago" data-zona="pago">
        <div className="cv-pago-txt">
          <p className="cv-sub">Pago a propietarios · viernes 16 oct</p>
          <p className="cv-pago-h">
            <span className="cv-azul">{pesos(giradoCop)}</span> <span className="cv-pago-de">de $ 47.133.500</span>
          </p>
          <p className="cv-pago-cuenta">
            {girados} de {PROPIETARIOS} propietarios con su giro
          </p>
        </div>
        <div className="cv-duenos">
          <div className="cv-duenos-fila" aria-hidden="true">
            {GIROS.map(([nombre], i) => (
              <span key={nombre} className={i < girados ? "cv-dueno cv-dueno--ok" : i === girados ? "cv-dueno cv-dueno--va" : "cv-dueno"} title={nombre}>
                <span className="cv-dueno-ini">{iniciales(nombre)}</span>
                <span className="cv-dueno-ok">✓</span>
              </span>
            ))}
          </div>
          <div className="cv-girando">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={actual ? actual[0] : "listo"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {girados >= PROPIETARIOS ? (
                  <>Listo: los {PROPIETARIOS} giros salieron, cada uno con su liquidación</>
                ) : actual ? (
                  <>
                    Le giramos a <b>{actual[0]}</b> · {pesos(actual[1])}
                  </>
                ) : (
                  <>Arranca el pago del viernes…</>
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
