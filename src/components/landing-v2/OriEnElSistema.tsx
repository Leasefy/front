"use client";

import { useEffect, useRef, useState } from "react";
import { AgentOrb, type AgentOrbPaletteName, type AgentOrbState } from "@leasefy/cadence";
import { ORBE_DEL_ORQUESTADOR } from "@/lib/agentes/nombre-del-orquestador";
import { useIdioma } from "@/lib/idioma/use-idioma";

/**
 * «Un solo sistema»: Ori a la derecha de «La operación de hoy» (Nico,
 * 12-10-2026: «cuando aparezca "Un solo sistema" a la derecha que salga algo
 * wow, puede ser lo del piloto, Ori ahí moviéndose»; eligió «Ori absorbe y
 * reparte»).
 *
 * Cada herramienta que se tacha (WhatsApp, Excel…) sale de su palabra como una
 * etiqueta y vuela hacia Ori, que la absorbe. Cuando llega «Un solo sistema»,
 * Ori reparte: alrededor aparecen cuatro agentes del equipo con lo que hacen
 * (sacado de lo que cada uno hace en el producto, `agentes.<id>.hace`).
 *
 * El orbe es el MISMO del producto (`AgentOrb` de Cadence con la paleta y la
 * semilla de Ori). El avance sale del mismo scroll que tacha las palabras
 * (`#ocTall`, igual que `initLandingFx`), y se pinta tocando estilos por ref:
 * nada se vuelve a renderizar por cuadro. Con «reducir movimiento» queda el
 * final: Ori con su equipo, sin vuelos.
 */

interface AgenteAlrededor {
  nombre: string;
  paleta: AgentOrbPaletteName;
  semilla: string;
  /** Lo que acaba de hacer (el renglón de abajo los va contando uno a uno). */
  hace: string;
  /** Lo mismo en /en; el nombre sólo cambia cuando no es propio («Conciliación» → «Reconciliation»). */
  haceEn: string;
  nombreEn?: string;
}

/*
 * Nico, 12-10-2026: «sabes que son muchos más que esos 4… quizás alrededor de Ori
 * hay muchísimos agentes y explicamos algo breve». Los 20 del registro
 * (`src/lib/agentes/equipo.ts`, con sus paletas y semillas) en dos órbitas: los
 * que tienen nombre propio adentro y los demás afuera.
 */
const ORBITA_DE_ADENTRO: readonly AgenteAlrededor[] = [
  { nombre: "Mori", paleta: "coral", semilla: "cobranza", hace: "Le escribió por WhatsApp a 4 en mora", haceEn: "Messaged 4 late payers on WhatsApp" },
  { nombre: "Cobri", paleta: "jade", semilla: "pagos", hace: "Envió 12 links de pago de octubre", haceEn: "Sent 12 October payment links" },
  { nombre: "Vinci", paleta: "amethyst", semilla: "retencion", hace: "Vio a 2 propietarios con ganas de irse", haceEn: "Spotted 2 owners thinking of leaving" },
  { nombre: "Niti", paleta: "marigold", semilla: "calidad", hace: "Arregló 3 fichas para publicar", haceEn: "Fixed 3 listings before publishing" },
  { nombre: "Imana", paleta: "orchid", semilla: "prospectos", hace: "Le respondió a 6 interesados nuevos", haceEn: "Replied to 6 new prospects" },
  { nombre: "Fixi", paleta: "tangerine", semilla: "mantenimiento", hace: "Pidió 2 cotizaciones de plomería", haceEn: "Asked for 2 plumbing quotes" },
  { nombre: "Avali", paleta: "peach", semilla: "aprobaciones", hace: "Le pidió el visto bueno a un propietario", haceEn: "Asked an owner for sign-off" },
  { nombre: "Vidi", paleta: "glacier", semilla: "inspeccion", hace: "Revisó las fotos de un inventario", haceEn: "Checked the photos of an inventory" },
];
const ORBITA_DE_AFUERA: readonly AgenteAlrededor[] = [
  { nombre: "Conciliación", paleta: "lagoon", semilla: "conciliacion", hace: "Cruzó 118 movimientos del banco", haceEn: "Matched 118 bank transactions", nombreEn: "Reconciliation" },
  { nombre: "Contratos", paleta: "indigo", semilla: "contratos", hace: "Avisó 3 contratos que vencen este mes", haceEn: "Flagged 3 leases ending this month", nombreEn: "Leases" },
  { nombre: "Propietarios", paleta: "terracotta", semilla: "propietarios", hace: "Dejó listo el pago del viernes", haceEn: "Got Friday's payout ready", nombreEn: "Owners" },
  { nombre: "Facturación", paleta: "mint", semilla: "facturacion", hace: "Emitió las facturas de octubre", haceEn: "Issued the October invoices", nombreEn: "Invoicing" },
  { nombre: "Contabilidad", paleta: "slate", semilla: "contabilidad", hace: "Causó los asientos del día", haceEn: "Posted the day's journal entries", nombreEn: "Accounting" },
  { nombre: "Matching", paleta: "lime", semilla: "matching", hace: "Le encontró 3 opciones a un interesado", haceEn: "Found 3 options for a prospect" },
  { nombre: "Estudio", paleta: "rose", semilla: "estudio", hace: "Estudió a 2 candidatos", haceEn: "Screened 2 applicants", nombreEn: "Screening" },
  { nombre: "Asegurabilidad", paleta: "sky", semilla: "cotizador", hace: "Cotizó con 3 aseguradoras a la vez", haceEn: "Got quotes from 3 insurers at once", nombreEn: "Insurability" },
  { nombre: "Avalúos", paleta: "copper", semilla: "avaluos", hace: "Recomendó el canon de un apartamento", haceEn: "Recommended the rent for an apartment", nombreEn: "Appraisals" },
  { nombre: "Documentos", paleta: "sand", semilla: "documentos", hace: "Ordenó los soportes de un contrato", haceEn: "Filed the paperwork for a lease", nombreEn: "Documents" },
  { nombre: "Reportes", paleta: "plum", semilla: "reportes", hace: "Armó el informe de la semana", haceEn: "Put together the weekly report", nombreEn: "Reports" },
  { nombre: "Comunicación", paleta: "ocean", semilla: "comunicacion", hace: "Avisó un corte de agua al edificio", haceEn: "Told a building about a water outage", nombreEn: "Communications" },
];
const EQUIPO = [...ORBITA_DE_ADENTRO, ...ORBITA_DE_AFUERA];
/** Lo que se revela al bajar, en orden: la órbita de adentro, la de afuera y la explicación. */
const PIEZAS = 3;

const PASO = 0.13; // como `initLandingFx`: cada palabra se tacha en 0,13 del recorrido
const FIN_DESDE = 0.7;
const FIN_HASTA = 0.9;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const suave = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function OriEnElSistema() {
  const raiz = useRef<HTMLDivElement>(null);
  const orbe = useRef<HTMLDivElement>(null);
  const agentes = useRef<Array<HTMLDivElement | null>>([]);
  const [palabras, setPalabras] = useState<string[]>([]);
  const [estado, setEstado] = useState<AgentOrbState>("idle");
  const [quieto, setQuieto] = useState(false);
  const en = useIdioma() === "en";
  const nombreDe = (a: AgenteAlrededor) => (en ? (a.nombreEn ?? a.nombre) : a.nombre);
  // El renglón de abajo: un agente a la vez y lo que acaba de hacer.
  const [turno, setTurno] = useState(0);
  useEffect(() => {
    if (quieto) return;
    const reloj = window.setInterval(() => setTurno((n) => (n + 1) % EQUIPO.length), 2600);
    return () => window.clearInterval(reloj);
  }, [quieto]);

  useEffect(() => {
    const spans = Array.from(document.querySelectorAll<HTMLElement>("#problema .oc-line span"));
    setPalabras(spans.map((s) => (s.textContent ?? "").replace(/\.$/, "")));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setQuieto(true);
  }, []);

  useEffect(() => {
    if (quieto || palabras.length === 0) return;
    const alto = document.getElementById("ocTall");
    const shell = document.getElementById("ocShell");
    const spans = Array.from(document.querySelectorAll<HTMLElement>("#problema .oc-line span"));
    if (!alto || !shell || !raiz.current || !orbe.current) return;
    let raf = 0;
    let estadoActual: AgentOrbState = "idle";
    const disparadas: boolean[] = [];
    const capa = raiz.current;
    const NS = "http://www.w3.org/2000/svg";
    const curva = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

    /** La palabra se deshace, una chispa con estela sigue una curva y Ori la absorbe. */
    const volar = (palabra: HTMLElement, i: number) => {
      // Sin Web Animations (navegadores muy viejos, el entorno de pruebas) no hay vuelo.
      if (typeof palabra.animate !== "function") return;
      const caja = capa.getBoundingClientRect();
      const w = palabra.getBoundingClientRect();
      const o = orbe.current!.querySelector<HTMLElement>(".oc-ori-latido")!.getBoundingClientRect();
      const sx = w.right - caja.left - 6;
      const sy = w.top + w.height * 0.52 - caja.top;
      const ox = o.left + o.width / 2 - caja.left;
      const oy = o.top + o.height / 2 - caja.top;

      // 1. El fantasma de la palabra: se levanta, se encoge y se desenfoca hacia Ori.
      const fantasma = document.createElement("span");
      fantasma.className = "oc-ori-fantasma";
      fantasma.textContent = palabra.textContent;
      const cs = getComputedStyle(palabra);
      Object.assign(fantasma.style, { left: `${w.left - caja.left}px`, top: `${w.top - caja.top}px`, fontSize: cs.fontSize, lineHeight: cs.lineHeight });
      capa.appendChild(fantasma);
      fantasma.animate(
        [
          { opacity: 0, transform: "translate(0,0) scale(1)", filter: "blur(0px)" },
          { opacity: 0.85, transform: "translate(18px,-10px) scale(.92)", filter: "blur(0px)", offset: 0.3 },
          { opacity: 0, transform: `translate(${Math.min(120, (ox - sx) * 0.18)}px,-26px) scale(.5)`, filter: "blur(10px)" },
        ],
        { duration: 760, easing: "cubic-bezier(.22,1,.36,1)" },
      ).onfinish = () => fantasma.remove();

      // 2. La curva (un arco que sube y cae en Ori) y su estela.
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "oc-ori-estela");
      const ruta = document.createElementNS(NS, "path");
      const c1x = sx + (ox - sx) * 0.3, c1y = sy - 150 - i * 8;
      const c2x = ox - 170, c2y = oy - 120;
      ruta.setAttribute("d", `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${ox},${oy}`);
      svg.appendChild(ruta);
      capa.appendChild(svg);
      const largo = ruta.getTotalLength();
      const cola = Math.min(170, largo * 0.4);
      ruta.style.strokeDasharray = `${cola} ${largo + cola}`;

      // 3. La chispa: un punto de luz que recorre la curva.
      const chispa = document.createElement("span");
      chispa.className = "oc-ori-chispa";
      capa.appendChild(chispa);
      const N = 36;
      const pasos = Array.from({ length: N + 1 }, (_, k) => curva(k / N));
      const DURA = 1050, ESPERA = 260;
      chispa.animate(
        pasos.map((u, k) => {
          const pt = ruta.getPointAtLength(u * largo);
          const op = k === 0 ? 0 : k > N - 2 ? 0.2 : 1;
          return { transform: `translate(${pt.x}px,${pt.y}px) scale(${(1.25 - 0.55 * u).toFixed(3)})`, opacity: op };
        }),
        { duration: DURA, delay: ESPERA, easing: "linear", fill: "both" },
      ).onfinish = () => chispa.remove();
      ruta.animate(
        pasos.map((u) => ({ strokeDashoffset: String(cola - u * largo) })),
        { duration: DURA, delay: ESPERA, easing: "linear", fill: "both" },
      );
      svg.animate([{ opacity: 1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: DURA + 260, delay: ESPERA, fill: "both" }).onfinish = () => svg.remove();

      // 4. Ori la absorbe: un latido y una onda.
      const llegada = ESPERA + DURA - 40;
      orbe.current!.querySelector<HTMLElement>(".oc-ori-latido")!.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.13)", offset: 0.35 }, { transform: "scale(.97)", offset: 0.7 }, { transform: "scale(1)" }],
        { duration: 720, delay: llegada, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      for (const [retraso, tope] of [[0, 2.3], [140, 1.7]] as const) {
        const onda = document.createElement("span");
        onda.className = "oc-ori-onda";
        Object.assign(onda.style, { left: `${ox}px`, top: `${oy}px`, width: `${o.width}px`, height: `${o.height}px` });
        capa.appendChild(onda);
        onda.animate(
          [{ transform: "translate(-50%,-50%) scale(.7)", opacity: 0.55 }, { transform: `translate(-50%,-50%) scale(${tope})`, opacity: 0 }],
          { duration: 900, delay: llegada + retraso, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" },
        ).onfinish = () => onda.remove();
      }
    };

    const pintar = () => {
      raf = 0;
      const vh = window.innerHeight;
      const r = alto.getBoundingClientRect();
      const total = r.height - vh;
      const p = total > 0 ? clamp01(-r.top / total) : 1;
      const fin = suave(clamp01((p - FIN_DESDE) / (FIN_HASTA - FIN_DESDE)));
      const ancho = window.innerWidth >= 1024;

      const caja = raiz.current!.getBoundingClientRect();
      const o = orbe.current!.getBoundingClientRect();
      const ox = o.left + o.width / 2 - caja.left;
      const oy = o.top + o.height / 2 - caja.top;

      // Los vuelos: cada palabra, al quedar tachada, se deshace en una chispa que vuela a Ori.
      if (ancho) {
        spans.forEach((sp, i) => {
          const t = clamp01((p - i * PASO) / PASO);
          if (t >= 0.96 && !disparadas[i]) {
            disparadas[i] = true;
            volar(sp, i);
          } else if (t < 0.3) disparadas[i] = false;
        });
      }

      // Ori: crece al aparecer, «traga» cada etiqueta y queda grande al final.
      // En el celular no hay vuelos ni equipo: Ori aparece chico en la esquina con «Un solo sistema».
      const entra = clamp01(p / 0.12);
      const escalaOri = ancho
        ? 0.72 + 0.18 * entra + 0.18 * fin
        : 0.5 * (0.8 + 0.2 * fin);
      orbe.current!.style.transform = `translate(-50%, -50%) scale(${escalaOri.toFixed(3)})`;
      orbe.current!.style.opacity = (ancho ? entra : fin).toFixed(3);

      // El equipo alrededor, uno tras otro.
      for (let i = 0; i < PIEZAS; i++) {
        const a = agentes.current[i];
        const t = suave(clamp01(fin * 1.6 - i * 0.25));
        if (a) {
          a.style.opacity = t.toFixed(3);
          a.style.setProperty("--crece", (0.9 + 0.1 * t).toFixed(3));
        }
      }

      const siguiente: AgentOrbState = fin > 0.4 ? "working" : p > 0.05 ? "thinking" : "idle";
      if (siguiente !== estadoActual) {
        estadoActual = siguiente;
        setEstado(siguiente);
      }
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(pintar);
    };
    pintar();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => {
      window.removeEventListener("scroll", pedir);
      window.removeEventListener("resize", pedir);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [quieto, palabras.length]);

  const orbita = (lista: readonly AgenteAlrededor[], radio: number, desfase: number) =>
    lista.map((a, k) => (
      <span
        key={a.nombre}
        className={EQUIPO[turno] === a ? "oc-ori-sat oc-ori-sat--activo" : "oc-ori-sat"}
        style={{ "--a": `${desfase + (360 / lista.length) * k}deg`, "--r": radio } as React.CSSProperties}
      >
        <span className="oc-ori-erguido">
          <AgentOrb palette={a.paleta} seed={a.semilla} variant="agent" state="working" size={26} label={null} still />
          <b>{nombreDe(a)}</b>
        </span>
      </span>
    ));
  const actual = EQUIPO[turno];

  return (
    <div className={quieto ? "oc-ori oc-ori--quieto" : "oc-ori"} ref={raiz} aria-hidden="true">
      <svg className="oc-ori-orbitas" viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid meet">
        <circle r={56} />
        <circle r={82} />
      </svg>
      <div
        className="oc-ori-anillo"
        ref={(el) => {
          agentes.current[0] = el;
        }}
      >
        {orbita(ORBITA_DE_ADENTRO, 28, -90)}
      </div>
      <div
        className="oc-ori-anillo oc-ori-anillo--afuera"
        ref={(el) => {
          agentes.current[1] = el;
        }}
      >
        {orbita(ORBITA_DE_AFUERA, 41, -75)}
      </div>
      <div className="oc-ori-orbe" ref={orbe}>
        <span className="oc-ori-latido">
          <AgentOrb
            palette={ORBE_DEL_ORQUESTADOR.paleta}
            seed={ORBE_DEL_ORQUESTADOR.semilla}
            variant="orchestrator"
            state={quieto ? "working" : estado}
            size={168}
            label={null}
          />
        </span>
        <span className="oc-ori-nombre">Ori</span>
      </div>
      <div
        className="oc-ori-cuenta"
        ref={(el) => {
          agentes.current[2] = el;
        }}
      >
        <p>
          {en ? (
            <>
              <b>Ori</b> coordinates {EQUIPO.length} agents: each one handles part of your operation and Ori gets them working
              together.
            </>
          ) : (
            <>
              <b>Ori</b> coordina a {EQUIPO.length} agentes: cada uno lleva una parte de tu operación y Ori los pone a
              trabajar juntos.
            </>
          )}
        </p>
        <p className="oc-ori-ahora" key={actual.nombre}>
          <AgentOrb palette={actual.paleta} seed={actual.semilla} variant="agent" state="working" size={16} label={null} still />
          <b>{nombreDe(actual)}</b> · {en ? actual.haceEn : actual.hace}
        </p>
      </div>
    </div>
  );
}
