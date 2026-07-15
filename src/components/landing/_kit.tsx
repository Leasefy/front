"use client";

/**
 * Landing kit — shared primitives for the AgentLab-style landing (Leasefy brand).
 *
 * Visual reference: AgentLab landing (layout, spacing, treatments, grid rails, button shape).
 * Typography = Satoshi (Leasefy). Colors = Leasefy DS (indigo #1A40FF primary, black/white).
 * See `_LANDING-STYLE.md` for the full contract.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { MonoLabel, IconButton } from "@leasefy/cadence";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ── Auto-advancing tabs (NewsCatcher signature) ──────────────────────────────
   Webflow w-tabs auto-cycle: the active index advances on an interval; a manual
   select resets the timer; hovering pauses it. Used by the "problema" accordion
   and the comparison tabs, both of which carry a `ProgressLine` under the active
   item that fills over `interval` and restarts on each change. */

export function useAutoTabs(
  count: number,
  { interval = 7000, paused = false }: { interval?: number; paused?: boolean } = {}
) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (paused || count < 2) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % count), interval);
    return () => clearTimeout(id);
  }, [active, paused, count, interval]);
  return [active, setActive] as const;
}

/* A hairline that fills 0→100% over `duration` (CSS `lpProgress`, see globals).
   `cycleKey` remounts the fill so it replays on every tab change; `paused`
   freezes it via animation-play-state (used for hover-pause). */
export function ProgressLine({
  active,
  duration = 7,
  paused = false,
  cycleKey,
  className,
}: {
  active: boolean;
  duration?: number;
  paused?: boolean;
  cycleKey?: string | number;
  className?: string;
}) {
  return (
    <span className={cn("block h-px w-full overflow-hidden bg-border-faint", className)}>
      {active && (
        <span
          key={cycleKey}
          className="block h-full bg-primary"
          style={{
            animation: `lpProgress ${duration}s linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </span>
  );
}

/* ── Heading / body recipes — NewsCatcher: Satoshi MEDIUM (500), near-normal
   tracking, black. Centered headers. NOT bold. ───────────────────────────── */

export const lpDisplay =
  "font-heading font-medium tracking-[-0.015em] leading-[1.0] text-[clamp(2.6rem,6vw,4.5rem)]";

export const lpHeading =
  "font-heading font-medium tracking-[-0.01em] leading-[1.05] text-[clamp(2rem,4.4vw,3.25rem)]";

export const lpBody = "text-base md:text-lg leading-relaxed text-muted-foreground";

/* ── Page rails — the dashed left/right guide lines + corner ticks ─────────── */

export function PageRails() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] hidden md:block">
      <div className="absolute inset-y-0 left-[52px] border-l border-dashed border-border-faint/30" />
      <div className="absolute inset-y-0 right-[52px] border-r border-dashed border-border-faint/30" />
    </div>
  );
}

/* ── Eyebrow — small pixel mark + uppercase mono label (AgentLab style) ────── */

function PixelMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-grid grid-cols-3 gap-[1.5px]", className)} aria-hidden>
      {[1, 0, 1, 1, 1, 0, 0, 1, 1].map((on, i) => (
        <span
          key={i}
          className={cn(
            "h-[3px] w-[3px] rounded-[0.5px]",
            on ? "bg-primary" : "bg-primary/30"
          )}
        />
      ))}
    </span>
  );
}

export function Eyebrow({
  children,
  dark = false,
  className,
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <PixelMark />
      <MonoLabel
        className={cn(
          "text-[12px] tracking-[0.18em]",
          dark ? "text-white/90" : "text-foreground/90"
        )}
      >
        {children}
      </MonoLabel>
    </div>
  );
}

/* ── Eyebrow — NewsCatcher: small square bullet + mono UPPERCASE slate label ── */

export function EyebrowPill({
  children,
  dark = false,
  className,
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn("h-[5px] w-[5px] shrink-0", dark ? "bg-white/70" : "bg-primary")}
      />
      <MonoLabel
        className={cn(
          "tracking-[0.14em]",
          dark ? "text-white/70" : "text-fg-subtle"
        )}
      >
        {children}
      </MonoLabel>
    </span>
  );
}

/* ── Buttons — use the SAME Button as inside the product (@/components/ui/button,
   adapter over @leasefy/cadence). Primary/white get the product's automatic
   ArrowUpRight. LpButton just maps the landing's variant names + wraps a Link. ── */

type LpButtonVariant = "primary" | "light" | "white" | "outline-light" | "ghost";
type LpButtonSize = "default" | "sm" | "lg";

const LP_VARIANT_MAP: Record<
  LpButtonVariant,
  NonNullable<React.ComponentProps<typeof Button>["variant"]>
> = {
  primary: "default", // product primary (indigo) — auto arrow
  light: "secondary", // product secondary (surface + border)
  white: "white",
  "outline-light": "outline",
  ghost: "ghost",
};

export function LpButton({
  href,
  children,
  variant = "primary",
  size = "lg",
  arrow,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: LpButtonVariant;
  size?: LpButtonSize;
  /** Force-hide the product's automatic arrow with `arrow={false}`. */
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Button asChild variant={LP_VARIANT_MAP[variant]} size={size} hideArrow={arrow === false} className={className}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

/* ── Reveal — consistent scroll-in ────────────────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  className,
  y = 20,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Infinite marquee ─────────────────────────────────────────────────────── */

export function Marquee({
  children,
  reverse = false,
  duration = 32,
  className,
  gap = "gap-12",
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
  gap?: string;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn("group/marquee relative overflow-hidden", className)}>
      <div
        className={cn(
          "flex w-max",
          gap,
          pauseOnHover && "group-hover/marquee:[animation-play-state:paused]"
        )}
        style={{
          animation: `${reverse ? "lpMarqueeReverse" : "lpMarquee"} ${duration}s linear infinite`,
        }}
      >
        <div className={cn("flex shrink-0", gap)}>{children}</div>
        <div className={cn("flex shrink-0", gap)} aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Ambient gradient field — NewsCatcher's slow-moving blobs (moveInCircle /
   moveVertical / moveHorizontal). Very subtle, behind hero/CTA content. ─────── */

export function AmbientField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute left-[12%] top-[8%] h-[42vh] w-[42vh] rounded-full opacity-[0.18] blur-[70px]"
        style={{
          background: "radial-gradient(circle at center, #1A40FF, transparent 62%)",
          animation: "lpMoveCircle 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute right-[10%] top-[2%] h-[36vh] w-[36vh] rounded-full opacity-[0.14] blur-[64px]"
        style={{
          background: "radial-gradient(circle at center, #6f86ff, transparent 60%)",
          animation: "lpMoveVertical 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute left-[38%] top-[20%] h-[30vh] w-[30vh] rounded-full opacity-[0.12] blur-[60px]"
        style={{
          background: "radial-gradient(circle at center, #aeb9f7, transparent 60%)",
          animation: "lpMoveHorizontal 38s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ── Code-rain panel — recreates AgentLab's vivid blue abstract panels ─────── */

const RAIN_CHARS =
  "0 1 # ^ _ f C a . < | Y d B l v m W & : ] x 0 * t C h X p % I { u Z W ? j L o ~ / U b @ i ) z q 8";

export function CodeRainPanel({
  className,
  tone = "indigo",
  rounded = "rounded-2xl",
  children,
}: {
  className?: string;
  tone?: "indigo" | "soft";
  rounded?: string;
  children?: React.ReactNode;
}) {
  const lines = Array.from({ length: 16 });
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        rounded,
        tone === "indigo" ? "bg-[hsl(230_100%_55%)]" : "bg-[hsl(228_100%_70%)]",
        className
      )}
    >
      {/* depth + sheen */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,rgba(255,255,255,0.35),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.22),transparent_38%,rgba(0,0,30,0.18))]" />
      {/* mono code-rain */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden opacity-[0.16]">
        <div className="flex h-full flex-col justify-between py-3">
          {lines.map((_, i) => (
            <div
              key={i}
              className="whitespace-nowrap font-mono text-[11px] leading-none text-white"
              style={{ transform: `translateX(${(i % 4) * -22}px)` }}
            >
              {RAIN_CHARS} {RAIN_CHARS}
            </div>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Mock device frame ────────────────────────────────────────────────────── */

export function MockFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/60 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Announcement bar — NewsCatcher blue top strip (mono, dismissible) ─────── */

export function AnnouncementBar({
  children,
  ctaLabel,
  ctaHref = "#",
}: {
  children: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="relative z-50 bg-primary text-white">
      <div className="container-platform flex items-center justify-center gap-3 py-2.5">
        <MonoLabel className="text-center text-white">
          {children}
        </MonoLabel>
        {ctaLabel && (
          <Link
            href={ctaHref}
            className="hidden shrink-0 items-center rounded-[4px] bg-white/15 px-2.5 py-1 text-white transition-colors hover:bg-white/25 sm:inline-flex"
          >
            <MonoLabel className="tracking-[0.08em] text-white">{ctaLabel}</MonoLabel>
          </Link>
        )}
        <IconButton
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          aria-label="Cerrar aviso"
          className="absolute right-4 h-5 w-5 text-white/70 hover:text-white"
          icon={<X className="h-3.5 w-3.5" weight="bold" />}
        />
      </div>
    </div>
  );
}

/* ── Hero grid — faint diagonal crosshatch texture (NewsCatcher hero) ──────── */

export function HeroGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "linear-gradient(45deg, rgba(28,40,76,0.10) 1px, transparent 1px), linear-gradient(-45deg, rgba(28,40,76,0.10) 1px, transparent 1px)",
        backgroundSize: "58px 58px",
        maskImage: "linear-gradient(to bottom, #000 0%, #000 58%, transparent 96%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 58%, transparent 96%)",
      }}
    />
  );
}
