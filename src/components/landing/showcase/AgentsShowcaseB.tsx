"use client";

import { motion } from "framer-motion";
import {
  Coins,
  Umbrella,
  IdentificationCard,
  Path,
  ArrowsClockwise,
  HouseLine,
  Wallet,
  CalendarCheck,
  ArrowUpRight,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { Reveal, EyebrowPill, LpButton, lpHeading } from "../_kit";
import { MonoLabel } from "@leasefy/cadence";

/* ── Mini SVG illustrations for the two hero tiles (Handle line-art style) ─── */

function MiniGrid() {
  return (
    <g stroke="#E5E5E5" strokeWidth="1" strokeDasharray="2 3">
      <line x1="0" y1="26" x2="160" y2="26" />
      <line x1="0" y1="52" x2="160" y2="52" />
      <line x1="53" y1="0" x2="53" y2="78" />
      <line x1="107" y1="0" x2="107" y2="78" />
    </g>
  );
}

/** Cobranza: a recovering curve climbing toward a goal node. */
function CollectionsArt() {
  return (
    <svg viewBox="0 0 160 78" className="h-[78px] w-[160px]" fill="none" aria-hidden>
      <MiniGrid />
      <path
        d="M8,64 C34,62 40,40 66,42 S112,22 134,18"
        stroke="#171717"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="8" cy="64" r="2.75" fill="#171717" />
      <circle cx="66" cy="42" r="2.5" fill="#A3A3A3" />
      <circle cx="134" cy="18" r="4" fill="#1A40FF" />
      <circle cx="134" cy="18" r="8" stroke="#1A40FF" strokeWidth="1.25" opacity="0.4" />
    </svg>
  );
}

/** Matching: one source fanning out to compatible nodes, one highlighted. */
function MatchingArt() {
  return (
    <svg viewBox="0 0 160 78" className="h-[78px] w-[160px]" fill="none" aria-hidden>
      <MiniGrid />
      <g stroke="#171717" strokeWidth="1.5">
        <line x1="20" y1="39" x2="120" y2="16" />
        <line x1="20" y1="39" x2="120" y2="39" />
        <line x1="20" y1="39" x2="120" y2="62" />
      </g>
      <circle cx="20" cy="39" r="3.5" fill="#171717" />
      <rect x="116" y="12" width="8" height="8" rx="1.5" fill="#1A40FF" />
      <rect x="116" y="35" width="8" height="8" rx="1.5" fill="none" stroke="#A3A3A3" strokeWidth="1.5" />
      <rect x="116" y="58" width="8" height="8" rx="1.5" fill="none" stroke="#A3A3A3" strokeWidth="1.5" />
    </svg>
  );
}

/* ── Tile data ────────────────────────────────────────────────────────────── */

type Feature = {
  name: string;
  desc: string;
  icon: PhosphorIcon;
};

type HeroTile = Feature & {
  Art: () => JSX.Element;
  metricValue: string;
  metricLabel: string;
};

const HERO_TILES: HeroTile[] = [
  {
    name: "Cobranza",
    desc: "Recordatorios, mora, acuerdos y cobros en todos los canales —voz, WhatsApp y correo.",
    icon: Coins,
    Art: CollectionsArt,
    metricValue: "86",
    metricLabel: "promesas de pago gestionadas",
  },
  {
    name: "Matching",
    desc: "Conecta cada solicitud con los inmuebles compatibles según presupuesto, zona y perfil.",
    icon: Path,
    Art: MatchingArt,
    metricValue: "80",
    metricLabel: "solicitudes emparejadas",
  },
];

const SMALL_TILES: (Feature & { soft?: boolean })[] = [
  {
    name: "Asegurabilidad",
    desc: "Cotiza pólizas y fianzas, compara aseguradoras y define si un candidato puede avanzar.",
    icon: Umbrella,
    soft: true,
  },
  {
    name: "Estudio de inquilino",
    desc: "Evalúa documentos, capacidad de pago y señales de riesgo antes de firmar.",
    icon: IdentificationCard,
  },
  {
    name: "Conciliación",
    desc: "Cruza pagos, bancos y contratos para cerrar la cartera sin reprocesos.",
    icon: ArrowsClockwise,
  },
  {
    name: "Avalúos",
    desc: "Estima valor de arriendo o venta con comparables y racionales claros.",
    icon: HouseLine,
    soft: true,
  },
  {
    name: "Pagos",
    desc: "Cobros a inquilinos y pagos a propietarios, con orden y trazabilidad.",
    icon: Wallet,
  },
  {
    name: "Retención",
    desc: "Anticipa renovaciones, detecta propietarios en riesgo y reduce la vacancia.",
    icon: CalendarCheck,
    soft: true,
  },
];

/* ── Tiles ────────────────────────────────────────────────────────────────── */

function IconChip({ Icon }: { Icon: PhosphorIcon }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-primary">
      <Icon className="h-[22px] w-[22px]" weight="duotone" />
    </span>
  );
}

function HeroTileCard({ tile }: { tile: HeroTile }) {
  const { Art } = tile;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="group flex h-full flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-7 transition-colors hover:border-neutral-300 md:p-8"
    >
      <div>
        <div className="flex items-start justify-between">
          <IconChip Icon={tile.icon} />
          <div className="opacity-80 transition-opacity group-hover:opacity-100">
            <Art />
          </div>
        </div>
        <h3 className="mt-6 font-heading text-xl font-semibold tracking-tight text-neutral-950">
          {tile.name}
        </h3>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-neutral-500">{tile.desc}</p>
      </div>

      <div className="mt-7 flex items-baseline gap-3 border-t border-neutral-100 pt-5">
        <span className="font-mono text-3xl tabular-nums tracking-tight text-neutral-950">
          {tile.metricValue}
        </span>
        <MonoLabel className="text-[12px] tracking-[0.12em] text-neutral-400">
          {tile.metricLabel}
        </MonoLabel>
      </div>
    </motion.div>
  );
}

function SmallTileCard({ tile }: { tile: Feature & { soft?: boolean } }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={`group flex h-full flex-col rounded-2xl border border-neutral-200 p-6 transition-colors hover:border-neutral-300 ${
        tile.soft ? "bg-neutral-50" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <IconChip Icon={tile.icon} />
        <ArrowUpRight className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-primary" />
      </div>
      <h3 className="mt-5 font-heading text-lg font-semibold tracking-tight text-neutral-950">
        {tile.name}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{tile.desc}</p>
    </motion.div>
  );
}

/* ── Section ──────────────────────────────────────────────────────────────── */

export default function AgentsShowcaseB() {
  return (
    <section className="bg-white py-20 md:py-28">
      <div className="container-platform">
        <Reveal>
          <EyebrowPill>Agentes AI</EyebrowPill>
          <h2 className={`${lpHeading} mt-6 max-w-3xl text-neutral-950`}>
            Tu equipo de agentes AI.
          </h2>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-neutral-500 md:text-lg">
            Ocho agentes especializados que operan tu inmobiliaria de punta a punta. Cada uno domina
            una parte del ciclo —del primer contacto al cierre de cartera— y trabajan juntos, en
            todos los canales.
          </p>
        </Reveal>

        {/* Bento grid */}
        <Reveal delay={0.1} className="mt-14">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Hero tile 1 — Cobranza: 2 cols, tall */}
            <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
              <HeroTileCard tile={HERO_TILES[0]} />
            </div>

            {/* Two small tiles top-right */}
            <SmallTileCard tile={SMALL_TILES[0]} />
            <SmallTileCard tile={SMALL_TILES[1]} />

            {/* Hero tile 2 — Matching: 2 cols, tall */}
            <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
              <HeroTileCard tile={HERO_TILES[1]} />
            </div>

            {/* Two small tiles mid-right */}
            <SmallTileCard tile={SMALL_TILES[2]} />
            <SmallTileCard tile={SMALL_TILES[3]} />

            {/* Two small tiles bottom-left */}
            <SmallTileCard tile={SMALL_TILES[4]} />
            <SmallTileCard tile={SMALL_TILES[5]} />
          </div>
        </Reveal>

        {/* Footer CTA */}
        <Reveal delay={0.15} className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[15px] leading-relaxed text-neutral-500">
            Empiezan a trabajar el día uno. Tú supervisas; ellos ejecutan.
          </p>
          <LpButton href="/auth?mode=register" variant="primary" arrow>
            Conoce a tu equipo
          </LpButton>
        </Reveal>
      </div>
    </section>
  );
}
