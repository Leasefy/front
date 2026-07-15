"use client";

/**
 * Sidebar preview — clean "Handle"-style navigation for the Leasefy backoffice.
 * NON-DESTRUCTIVE: standalone preview at /sidebar-preview. Does NOT touch the
 * real PlanSidebar. Once approved, port these styles into PlanSidebar.tsx.
 */

import { useState } from "react";
import {
  SquaresFour,
  Coins,
  Umbrella,
  IdentificationCard,
  Path,
  ArrowsClockwise,
  HouseLine,
  Wallet,
  UsersThree,
  Buildings,
  FileText,
  Receipt,
  ChatCircleDots,
  CaretDown,
  CaretUp,
  Sidebar as SidebarIcon,
  Lifebuoy,
  ChatCircle,
  GearSix,
  PlusCircle,
  Sun,
  Monitor,
  Moon,
  ClockCounterClockwise,
  MagnifyingGlass,
  PencilSimple,
  ArrowUp,
  ChartBar,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LeasefyLogo } from "@/components/brand";

type Item = { label: string; icon: Icon; badge?: number; active?: boolean };
type Group = { title: string; items: Item[] };

const TOP: Item[] = [{ label: "Inicio", icon: SquaresFour }];

const GROUPS: Group[] = [
  {
    title: "Agentes",
    items: [
      { label: "Cobranza", icon: Coins },
      { label: "Asegurabilidad", icon: Umbrella },
      { label: "Estudio de inquilino", icon: IdentificationCard },
      { label: "Matching", icon: Path },
      { label: "Conciliación", icon: ArrowsClockwise },
      { label: "Avalúos", icon: HouseLine },
      { label: "Pagos", icon: Wallet },
    ],
  },
  {
    title: "Sistema de registro",
    items: [
      { label: "Chat con tus registros", icon: ChatCircleDots, active: true },
      { label: "Clientes", icon: UsersThree },
      { label: "Propiedades", icon: Buildings },
      { label: "Contratos", icon: FileText },
      { label: "Recibos", icon: Receipt },
    ],
  },
];

function NavRow({ item }: { item: Item }) {
  const Ico = item.icon;
  return (
    <button
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition-colors",
        item.active
          ? "bg-foreground font-medium text-background"
          : "text-fg-muted hover:bg-surface-muted hover:text-foreground"
      )}
    >
      <Ico className="h-[18px] w-[18px] shrink-0" weight={item.active ? "fill" : "regular"} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-muted px-1.5 text-[11px] font-medium text-fg-muted">
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}

function Section({ group }: { group: Group }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 pb-1.5 pt-1"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          {group.title}
        </span>
        <CaretDown
          className={cn("h-3.5 w-3.5 text-fg-subtle transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map((it) => (
            <NavRow key={it.label} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const [theme, setTheme] = useState<"light" | "system" | "dark">("light");
  return (
    <aside className="flex h-full w-[276px] shrink-0 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <LeasefyLogo size={24} tone="brand" />
          <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            Agencia
          </span>
        </div>
        <button className="text-fg-subtle hover:text-fg-muted" aria-label="Colapsar">
          <SidebarIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <div className="space-y-0.5">
          {TOP.map((it) => (
            <NavRow key={it.label} item={it} />
          ))}
        </div>
        {GROUPS.map((g) => (
          <Section key={g.title} group={g} />
        ))}

        {/* Utility group */}
        <div className="mt-6 space-y-0.5 border-t border-border-faint pt-4">
          <NavRow item={{ label: "Centro de ayuda", icon: Lifebuoy }} />
          <NavRow item={{ label: "Mis preguntas", icon: ChatCircle, badge: 3 }} />
          <button className="mt-1 flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-[14px] text-fg-muted transition-colors hover:bg-surface-muted">
            <PlusCircle className="h-[18px] w-[18px]" />
            Obtener ayuda
          </button>
          <NavRow item={{ label: "Configuración", icon: GearSix }} />
        </div>

        {/* Theme toggle */}
        <div className="mt-3 flex justify-center">
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-0.5">
            {([
              ["light", Sun],
              ["system", Monitor],
              ["dark", Moon],
            ] as const).map(([key, Ico]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  theme === key ? "bg-foreground text-background" : "text-fg-subtle hover:text-fg-muted"
                )}
                aria-label={key}
              >
                <Ico className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="border-t border-border-faint p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-muted">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-[13px] font-semibold text-background">
            LF
          </span>
          <span className="flex-1 text-left">
            <span className="block text-[14px] font-medium leading-tight text-foreground">Leasefy Demo</span>
            <span className="block text-[12px] leading-tight text-fg-subtle">Inmobiliaria</span>
          </span>
          <CaretUp className="h-4 w-4 text-fg-subtle" />
        </button>
      </div>
    </aside>
  );
}

const SUGGESTIONS = [
  { label: "Cartera en mora y total", icon: ChartBar },
  { label: "Cotizaciones recientes", icon: FileText },
  { label: "Pagos por conciliar", icon: ArrowsClockwise },
  { label: "Inquilinos con más contratos", icon: UsersThree },
];

function ChatHome() {
  return (
    <main className="relative flex-1 bg-surface-muted">
      {/* History pill */}
      <div className="absolute right-6 top-6">
        <button className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] text-fg-muted shadow-sm hover:bg-surface-muted">
          <ClockCounterClockwise className="h-4 w-4" />
          Historial
          <span className="rounded-full bg-surface-muted px-1.5 text-[11px] text-fg-subtle">46</span>
        </button>
      </div>

      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground shadow-sm">
          <ChatCircleDots className="h-6 w-6 text-background" weight="fill" />
        </span>
        <h1 className="mt-6 text-[26px] font-semibold tracking-tight text-foreground">
          Pregunta a tus registros
        </h1>
        <p className="mt-3 max-w-md text-center text-[15px] leading-relaxed text-fg-subtle">
          Encuentra contratos, inquilinos, cartera y más. Respuestas con tablas, gráficas y
          métricas al instante.
        </p>

        {/* Input */}
        <div className="mt-7 w-full rounded-2xl border border-border bg-surface p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]">
          <p className="text-[15px] text-fg-subtle">Pregunta sobre tus registros…</p>
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] text-fg-muted">
                <MagnifyingGlass className="h-3.5 w-3.5" /> Consultar
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-fg-subtle">
                <PencilSimple className="h-3.5 w-3.5" /> Cargar
              </span>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-fg-subtle hover:bg-border">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] text-fg-muted transition-colors hover:bg-surface-muted"
            >
              <s.icon className="h-4 w-4 text-fg-subtle" />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function SidebarPreviewPage() {
  return (
    <div className="h-screen w-full bg-surface-muted p-3">
      <div className="flex h-full w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <Sidebar />
        <ChatHome />
      </div>
    </div>
  );
}
