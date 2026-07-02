"use client";

import {
  Coins,
  Umbrella,
  IdentificationCard,
  Path,
  ArrowsClockwise,
  HouseLine,
  Wallet,
  CalendarCheck,
} from "@phosphor-icons/react";
import { Reveal, lpHeading, EyebrowPill } from "../_kit";

/* ── Dotted grid backdrop shared by every line-art tile ───────────────────── */

function ArtGrid() {
  return (
    <g stroke="#E5E5E5" strokeWidth="1" strokeDasharray="2 3">
      <line x1="0" y1="22" x2="120" y2="22" />
      <line x1="0" y1="44" x2="120" y2="44" />
      <line x1="40" y1="0" x2="40" y2="66" />
      <line x1="80" y1="0" x2="80" y2="66" />
    </g>
  );
}

/* ── 8 distinct fine-line illustrations (#171717 over the dotted grid) ─────── */

type ArtKind =
  | "cobranza"
  | "asegurabilidad"
  | "estudio"
  | "matching"
  | "conciliacion"
  | "avaluos"
  | "pagos"
  | "retencion";

const STROKE = "#171717";
const MUTED = "#A3A3A3";

function LineArt({ kind }: { kind: ArtKind }) {
  return (
    <svg viewBox="0 0 120 66" className="h-[66px] w-[120px]" fill="none">
      <ArtGrid />

      {/* Cobranza — rising recovery curve with coin nodes */}
      {kind === "cobranza" && (
        <g stroke={STROKE} strokeWidth="1.5">
          <path
            d="M8,52 C30,50 36,30 58,30 S92,16 112,12"
            strokeLinecap="round"
          />
          <circle cx="8" cy="52" r="2.5" fill={STROKE} stroke="none" />
          <circle cx="58" cy="30" r="6" fill="white" />
          <circle cx="112" cy="12" r="6" fill="white" />
          <line x1="55" y1="30" x2="61" y2="30" />
          <line x1="109" y1="12" x2="115" y2="12" />
        </g>
      )}

      {/* Asegurabilidad — umbrella canopy as a shield */}
      {kind === "asegurabilidad" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round">
          <path d="M22,38 C22,20 44,12 60,12 S98,20 98,38 Z" fill="white" />
          <line x1="38" y1="38" x2="38" y2="30" />
          <line x1="60" y1="38" x2="60" y2="28" />
          <line x1="82" y1="38" x2="82" y2="30" />
          <path d="M60,38 L60,54 C60,58 56,58 54,55" />
        </g>
      )}

      {/* Estudio de inquilino — document with checked rows */}
      {kind === "estudio" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round">
          <path d="M34,8 H78 L90,20 V58 H34 Z" fill="white" strokeLinejoin="round" />
          <path d="M78,8 V20 H90" />
          <path d="M42,30 l4,4 l7,-8" />
          <line x1="58" y1="32" x2="80" y2="32" stroke={MUTED} />
          <path d="M42,44 l4,4 l7,-8" />
          <line x1="58" y1="46" x2="80" y2="46" stroke={MUTED} />
        </g>
      )}

      {/* Matching — request branching to compatible properties */}
      {kind === "matching" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round">
          <path d="M14,33 H44" />
          <path d="M44,33 C58,33 60,16 76,16" />
          <path d="M44,33 H76" />
          <path d="M44,33 C58,33 60,50 76,50" />
          <circle cx="14" cy="33" r="3" fill={STROKE} stroke="none" />
          <rect x="76" y="11" width="12" height="10" fill="white" />
          <rect x="76" y="28" width="12" height="10" fill="white" />
          <rect x="76" y="45" width="12" height="10" fill="white" />
        </g>
      )}

      {/* Conciliación — two streams reconciling into one ledger row */}
      {kind === "conciliacion" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round">
          <path d="M12,18 H46 C58,18 58,33 70,33 H108" />
          <path d="M12,48 H46 C58,48 58,33 70,33" />
          <circle cx="12" cy="18" r="2.5" fill={STROKE} stroke="none" />
          <circle cx="12" cy="48" r="2.5" fill={STROKE} stroke="none" />
          <path d="M100,29 l5,4 l-5,4" />
        </g>
      )}

      {/* Avalúos — house with valuation comparables/bars */}
      {kind === "avaluos" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18,30 L36,16 L54,30 V54 H18 Z" fill="white" />
          <line x1="30" y1="54" x2="30" y2="42" />
          <line x1="42" y1="54" x2="42" y2="42" />
          <g stroke={MUTED}>
            <line x1="70" y1="54" x2="70" y2="40" />
            <line x1="84" y1="54" x2="84" y2="30" />
            <line x1="98" y1="54" x2="98" y2="22" />
          </g>
          <circle cx="70" cy="40" r="2" fill={STROKE} stroke="none" />
          <circle cx="84" cy="30" r="2" fill={STROKE} stroke="none" />
          <circle cx="98" cy="22" r="2" fill={STROKE} stroke="none" />
        </g>
      )}

      {/* Pagos — inbound to wallet, outbound to owner */}
      {kind === "pagos" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="46" y="22" width="28" height="22" rx="3" fill="white" />
          <circle cx="67" cy="33" r="2" fill={STROKE} stroke="none" />
          <path d="M16,33 H42" />
          <path d="M36,29 l5,4 l-5,4" />
          <path d="M78,33 H104" />
          <path d="M99,29 l5,4 l-5,4" />
        </g>
      )}

      {/* Retención — renewal cycle on a calendar tick */}
      {kind === "retencion" && (
        <g stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="40" y="16" width="40" height="36" rx="3" fill="white" />
          <line x1="40" y1="26" x2="80" y2="26" />
          <line x1="50" y1="12" x2="50" y2="20" />
          <line x1="70" y1="12" x2="70" y2="20" />
          <path d="M52,38 l5,5 l11,-12" />
          <path d="M84,30 a8,8 0 1 1 -3,-6" stroke={MUTED} />
          <path d="M81,18 l3,6 l-6,1" stroke={MUTED} />
        </g>
      )}
    </svg>
  );
}

/* ── Roster ───────────────────────────────────────────────────────────────── */

const AGENTS: {
  name: string;
  desc: string;
  outcome: string;
  Icon: typeof Coins;
  art: ArtKind;
}[] = [
  {
    name: "Cobranza",
    desc: "Recordatorios, mora, acuerdos y cobros en todos los canales.",
    outcome: "+ recaudo",
    Icon: Coins,
    art: "cobranza",
  },
  {
    name: "Asegurabilidad",
    desc: "Cotiza pólizas y fianzas, compara aseguradoras y define si un candidato puede avanzar.",
    outcome: "+ aprobación",
    Icon: Umbrella,
    art: "asegurabilidad",
  },
  {
    name: "Estudio de inquilino",
    desc: "Evalúa documentos, capacidad de pago y señales de riesgo antes de firmar.",
    outcome: "− riesgo",
    Icon: IdentificationCard,
    art: "estudio",
  },
  {
    name: "Matching",
    desc: "Conecta cada solicitud con los inmuebles compatibles según presupuesto, zona y perfil.",
    outcome: "+ velocidad comercial",
    Icon: Path,
    art: "matching",
  },
  {
    name: "Conciliación",
    desc: "Cruza pagos, bancos y contratos para cerrar la cartera sin reprocesos.",
    outcome: "− reprocesos",
    Icon: ArrowsClockwise,
    art: "conciliacion",
  },
  {
    name: "Avalúos",
    desc: "Estima valor de arriendo o venta con comparables y racionales claros.",
    outcome: "+ precisión",
    Icon: HouseLine,
    art: "avaluos",
  },
  {
    name: "Pagos",
    desc: "Cobros a inquilinos y pagos a propietarios, con orden y trazabilidad.",
    outcome: "+ trazabilidad",
    Icon: Wallet,
    art: "pagos",
  },
  {
    name: "Retención",
    desc: "Anticipa renovaciones, detecta propietarios en riesgo y reduce la vacancia.",
    outcome: "− vacancia",
    Icon: CalendarCheck,
    art: "retencion",
  },
];

/* ── Section ──────────────────────────────────────────────────────────────── */

export default function AgentsShowcaseC() {
  return (
    <section className="bg-neutral-50 py-20 md:py-28">
      <div className="container-platform">
        {/* Centered header */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Agentes AI</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-6 text-neutral-950`}>
            Un agente especializado para cada etapa.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-neutral-500 md:text-lg">
            Ocho agentes que cubren la operación completa de arriendos —de la primera solicitud a la
            renovación—, trabajando juntos sin perder el hilo.
          </p>
        </Reveal>

        {/* Uniform 8-card grid */}
        <Reveal delay={0.1} className="mt-16">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map(({ name, desc, outcome, Icon, art }) => (
              <div
                key={name}
                className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.25)]"
              >
                {/* Line-art tile */}
                <div className="flex justify-center rounded-xl border border-neutral-100 bg-neutral-50/60 py-4">
                  <LineArt kind={art} />
                </div>

                {/* Icon + name */}
                <div className="mt-6 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-primary transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-[18px] w-[18px]" weight="bold" />
                  </span>
                  <h3 className="font-heading text-[17px] font-semibold tracking-tight text-neutral-950">
                    {name}
                  </h3>
                </div>

                {/* Description */}
                <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{desc}</p>

                {/* Outcome line */}
                <p className="mt-4 font-mono text-[13px] tabular-nums text-primary">{outcome}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
