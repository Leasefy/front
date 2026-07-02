# Landing "nueva" — style contract (read before editing any section)

Visual reference = **Handle (usehandle.ai)** — clean, all-light, lots of air, product mockups.
Typography = **Satoshi** (Leasefy brand; Nico chose to keep Satoshi, NOT swap to Handle's Inter).
Colors = Leasefy DS (indigo `#1A40FF`). Content = Spanish (es-CO), Leasefy brand.
Mounted at preview route `src/app/landing-nueva/page.tsx` (does NOT touch `/`).

## Measured Handle tokens (extracted live from usehandle.ai — match these)
- **Heading weight = `font-medium` (500). NEVER `font-bold`.** This is the #1 fidelity rule —
  Handle headings AND big numbers are all weight 500.
- **Heading color = `text-neutral-950`** (= `#0a0a0a`, near-black). NOT `text-neutral-900`.
- **Heading tracking ≈ `-0.04em`** for section h2 (Handle h2 = 52px / 500 / −2.08px / lh ~1.1).
  Hero/display ≈ `-0.03em`, lh ~0.97, size up to ~80px.
- **Body text** = `text-neutral-500` (= `#6B6B6B`), 16px, `leading-relaxed`. (Handle uses Inter here;
  we keep Satoshi — the only intentional divergence.)
- **Big numbers (stats)** = `font-heading font-medium tracking-[-0.04em] text-neutral-950`, OPEN on the
  background (NO cards, NO mono). Caption in `text-neutral-500` BELOW the number.
- **Eyebrow** = `<EyebrowPill>` → rounded-`[4px]` chip, `border-neutral-200`, `text-neutral-950`,
  10px / 500 / `tracking-[0.1em]` uppercase, transparent bg. (NOT a round gray pill.)
- **Buttons** = `<LpButton>` → pill (`rounded-full`), primary = `bg-neutral-950` white, 15px / 500.
- **Sections** alternate `bg-white` / `bg-neutral-50`. Vertical rhythm `py-20 md:py-28 lg:py-32`.
- **NO dark/black sections** — Handle is all-light. (A dark stats panel was tried and rejected.)

## Hard color rules
Only `primary`/`indigo`/`neutral`/`success`/`warning`/`error` tokens. `bg-success`/`bg-warning` have
NO default shade → always `-500`. NO raw `blue-*`/`purple-*`/`sky-*`/serif. Indigo hex for inline
gradients/SVG = `#1A40FF` (rgb 26,64,255). Mono (Ubuntu Mono via `font-mono`) only for tiny
labels/refs inside product mockups — NOT for headings or the big stat numbers.

## Shared kit (`_kit.tsx`) — REUSE, don't reinvent
- `lpDisplay` / `lpHeading` — heading className strings (already Satoshi medium + Handle metrics).
- `lpBody` — body paragraph className.
- `<EyebrowPill dark?>` — Handle rounded-[4px] eyebrow chip (use this, not the legacy `<Eyebrow>`).
- `<Reveal delay? y?>` — scroll-in wrapper (framer-motion whileInView). Wrap blocks with it.
- `<LpButton variant="primary|light|white|outline-light|ghost" arrow?>` — pill button.
- `<Marquee>` · `<MockFrame>` · `<CodeRainPanel>` — available but indigo panels are off-Handle; prefer
  light product mockups in a neutral-100 frame (see `Hero.tsx` `DashboardMock`).

## Section conventions
- `<section>` (bg-white or bg-neutral-50) → `container-platform` (= `px-4 md:px-[72px]`) inside.
- Header: `<EyebrowPill>` → heading via `lpHeading` (medium, neutral-950). Subhead optional, short,
  `text-neutral-500`. De-emphasize a trailing clause with `<span className="text-neutral-400">…</span>`.
- Each component is **self-contained, default-exported, `"use client"`, takes no props**.
- Product mockups: light, in a `rounded-[24px] bg-neutral-100 p-3` frame, hairline borders, no heavy
  shadow. Hover lifts on cards (`hover:-translate-y-0.5 hover:shadow-…`).

## Canonical examples
- `StatsSection.tsx` = the Handle "THE IMPACT" pattern (open numbers, eyebrow chip).
- `ArchitectureSection.tsx` / `InitialProductsSection.tsx` = Handle capability cards (numbered, chips).
- `Hero.tsx` = Handle hero (badge → big medium headline → 1 pill CTA → light dashboard mock).
