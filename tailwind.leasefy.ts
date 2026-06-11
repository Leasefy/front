/**
 * Bridge preset — exposes the @leasefy/ui design-system theme inside mvp.
 *
 * The DS preset is consumed ALMOST whole: where keys collide (primary, ring,
 * border, success, warning, blue, shadcn aliases…) mvp's own config wins by
 * Tailwind's merge order, and the values are the same brand anyway.
 *
 * borderRadius: the DS scale (sm=6/md=8/lg=12/xl=16) now flows through —
 * the radius sweep (Etapa 2) renamed every rounded-* class one step to
 * preserve pixels, and tailwind.config.ts pins the same literal scale
 * (BRAND-CONTRACT §3), so both resolve to identical values.
 *
 * EXCLUDED:
 *  - darkMode: mvp manages its own strategy.
 *
 * The CSS vars the DS classes resolve to live in src/app/globals.css
 * ("@leasefy/ui bridge" block).
 */
// @ts-ignore — the preset ships as .ts; Tailwind loads it via jiti at build
// time, TS has no declarations for it and doesn't need them here.
import dsPreset from "@leasefy/ui/tailwind-preset";

const preset = JSON.parse(JSON.stringify(dsPreset)) as Record<string, any>;
delete preset.darkMode;

export default preset;
