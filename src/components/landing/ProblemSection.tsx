"use client";

import { Reveal, lpHeading, EyebrowPill } from "./_kit";

/* ── Minimalist line-art illustrations (Handle style) ─────────────────────── */

function Grid() {
  return (
    <g stroke="#E5E5E5" strokeWidth="1" strokeDasharray="2 3">
      <line x1="0" y1="23" x2="120" y2="23" />
      <line x1="0" y1="47" x2="120" y2="47" />
      <line x1="40" y1="0" x2="40" y2="70" />
      <line x1="80" y1="0" x2="80" y2="70" />
    </g>
  );
}

function LineArt({ variant }: { variant: "curve" | "bars" | "zigzag" | "fan" }) {
  return (
    <svg viewBox="0 0 120 70" className="h-[70px] w-[120px]" fill="none">
      <Grid />
      {variant === "curve" && (
        <>
          <path d="M8,14 C32,16 34,46 60,49 S96,58 112,56" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="14" r="2.5" fill="#171717" />
          <circle cx="112" cy="56" r="2.5" fill="#171717" />
        </>
      )}
      {variant === "bars" && (
        <g stroke="#171717" strokeWidth="1.5">
          {[18, 30, 22, 40, 34].map((h, i) => (
            <rect key={i} x={12 + i * 21} y={58 - h} width="12" height={h} fill="none" />
          ))}
        </g>
      )}
      {variant === "zigzag" && (
        <>
          <path d="M8,48 L26,28 L42,40 L58,20 L74,44 L90,16 L112,38" stroke="#171717" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          {[[8, 48], [42, 40], [74, 44], [112, 38]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="#171717" />
          ))}
        </>
      )}
      {variant === "fan" && (
        <>
          <g stroke="#171717" strokeWidth="1.5">
            {[14, 26, 38, 50, 62].map((y, i) => (
              <line key={i} x1="12" y1="35" x2="78" y2={y} />
            ))}
          </g>
          <circle cx="12" cy="35" r="3" fill="#171717" />
          {[14, 26, 38, 50, 62].map((y, i) => (
            <circle key={i} cx="78" cy={y} r="2" fill="#171717" />
          ))}
          <circle cx="104" cy="38" r="2" fill="#A3A3A3" />
        </>
      )}
    </svg>
  );
}

const COLS = [
  {
    art: "curve" as const,
    title: "Solicitudes que se enfrían",
    body: "Responder lento pierde clientes. Cuando contestas, el interesado ya cerró con otra inmobiliaria.",
  },
  {
    art: "bars" as const,
    title: "Cartera sin control",
    body: "La mora vive en Excel: pagos marcados que no entraron y sorpresas a fin de mes.",
  },
  {
    art: "zigzag" as const,
    title: "Evaluación lenta y manual",
    body: "Estudios de inquilino a mano, sin trazabilidad ni señales claras de riesgo.",
  },
  {
    art: "fan" as const,
    title: "Conciliación a mano",
    body: "Horas cruzando pagos, bancos y contratos. Los errores se descubren tarde.",
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container-platform">
        <Reveal>
          <EyebrowPill>Realidad actual</EyebrowPill>
          <h2 className={`${lpHeading} mt-6 max-w-4xl text-fg`}>
            La operación de arriendos todavía corre en WhatsApp, Excel, correos y llamadas.
          </h2>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-fg-muted md:text-lg">
            Herramientas fragmentadas y trabajo manual: crecer significa sumar más personas.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-16">
          <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-border">
            {COLS.map((c) => (
              <div key={c.title} className="md:px-7 md:first:pl-0 md:last:pr-0">
                <LineArt variant={c.art} />
                <h3 className="mt-7 font-heading text-lg font-medium tracking-tight text-fg">
                  {c.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-fg-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
