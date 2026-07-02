# Panel (src/app/panel/**) Cadence conversion progress

Gate script: `.cadence-migration/panel-gate.py`. tsc must stay 0 after every file.

## BASELINE (session start)
button 24 · input 7 · select 0 · textarea 0 · tabs 1 · table 0 · modal 0 ·
hand-card 6 · pill 18 · eyebrow 20 · spinner 0. tsc=0.

## ALLOWLISTED (verify-only, do NOT re-touch — per playbook §120, §134-140)
- `ai/cobranza/page.tsx` — role="tablist" 7-card stage grid (the only `tabs` hit). VERIFIED native ARIA, keep.
- avaluos-ia/** + conciliacion-ia/** ink-anchor eyebrows/buttons — brand-anchor surfaces (playbook §134-140).
  eyebrow allowlisted (12): avaluos-ia {[id],conexiones,enviar,monitoreo,nuevo,page,venta}=7,
  conciliacion-ia {conexiones,liquidaciones,page,procesar,resultado}=5.
  button allowlisted (9): avaluos-ia {[id],enviar,nuevo,page,venta}=5, conciliacion-ia {excepcion,liquidaciones,lote,page}=4.
  pill allowlisted (1): avaluos-ia/nuevo.

## CONVERTIBLE TARGETS
- eyebrow (8): landlord {contract/[candidateId], [propertyId], page}, cobranza {compliance/audit,
  deudores/[id]/DebtorDetailClient, escalaciones/[id]}, ai/page, dashboard.
- hand-card (6 landlord): contract/[candidateId], [propertyId], candidatos, propiedades, upgrade, visitas.
- button (15 convertible), input (7), pill (17 convertible — many may be allowlisted dots/circles per category rule).

## CONVENTIONS (reuse from inmobiliaria-PROGRESS)
font-mono uppercase page eyebrow -> Eyebrow (accent for brand); inline tech label -> MonoLabel (both @leasefy/cadence).
hand card bg-*/rounded/border/p -> Card/CardHeader/CardContent (@/components/ui/card, shim->cadence).
label status pill -> Badge variant (@/components/ui/badge: default|secondary|destructive|outline|success|warning).
icon-circle / legend-dot / dynamic-constant-color pill -> allowlist (category rule).

## DONE (this session)
GATE NOTE: panel-gate.py uses re.search on full file → `font-mono[^"]*uppercase` matches ACROSS
lines (single-quoted cn() strings don't stop `[^"]*`). So eyebrow false-positives can come from
cn() step/style strings, not just literal eyebrows. Fix = break font-mono→uppercase adjacency.

### eyebrow (font-mono uppercase -> MonoLabel) — 8 convertible files done, tsc=0:
- dashboard/page (2 KPI/header eyebrows, kept white/55 + primary color via className)
- ai/page (header eyebrow)
- ai/cobranza/deudores/[id]/DebtorDetailClient (zone eyebrow span)
- ai/cobranza/escalaciones/[id]/page (3 h2 section labels + 1 details>summary -> MonoLabel)
- ai/cobranza/compliance/audit/page (4 form <label> -> kept <label htmlFor> wrapping MonoLabel)
- (landlord)/page (3 eyebrows -> MonoLabel; L441 on-media dynamic status pill ALLOWLISTED-PropertyCard precedent -> file still counts)
- (landlord)/[propertyId]/page (12 eyebrows -> MonoLabel + 4 stat cards -> Card)
- (landlord)/[propertyId]/contract/[candidateId]/page (1 eyebrow + step-circle cn() un-mono'd)
EYEBROW REMAINING 13 = 12 avaluos-ia/conciliacion-ia (ALLOWLISTED ink-anchor, verify-only) + (landlord)/page (L441 on-media pill).

### hand-card (bg-*/rounded/border/p -> Card @/components/ui) — 6 files done -> 0:
- (landlord)/upgrade (4), candidatos (2 + pill->Badge), propiedades (1), visitas (1 + pill->Badge),
  [propertyId] (4 stat cards, de-hardcoded hex->DS tokens), contract/[candidateId] (5 cards + inner contract-info).
  Card owns bg/border/radius/shadow via tokens; kept only p-*/mb-* in className.

### buttons ALLOWLISTED this session (precedent: disclosure-toggle / list-row-clickable / selectable-tile / success-GAP):
- (landlord)/page: 1 disclosure toggle + 2 list-row clickables.
- (landlord)/[propertyId]/page: 2 doc-row clickables (list-row) + 3 decision CTAs (Cadence GAP: no success
  variant + no soft-semantic-fill; token-cleaned text hex->text-primary/success/danger).
- (landlord)/[propertyId]/contract/[candidateId]/page: 1 selectable aria-pressed template tile.

### inputs (7) ALL ALLOWLISTED-floor: 6 hidden type=file behind dropzones
((landlord)/perfil, inmobiliaria/perfil, contratos/[id]/editar, contratos/nuevo, contract/[candidateId],
ai/conciliacion/movimientos) + 1 test-stub file (ai/asegurabilidad/nueva/page.test.tsx).

### buttons (24) ALL ALLOWLISTED-floor: 9 avaluos-ia/conciliacion-ia (verify-only) + 1 test-stub +
3 landlord (disclosure/list-row/decision-GAP/selectable) + 5 cobranza/deudores (list-row/rail/CTA-card) +
PostSeleccionSheet (disclosure) + reportes-propietarios (selectable) + ai/conciliacion/movimientos (dropzone) +
estudio/estudios (list-row) + estudio/solicitud (wizard-step nav) + contratos/nuevo (selectable tile).
Each verified individually; every file has exactly its allowlisted button. See playbook §"landlord ... sweep".

### tabs (1) ALLOWLISTED: ai/cobranza/page role="tablist" 7-card stage grid (playbook §120).

### pills (18 -> 8 floor). CONVERTED to Badge/StatusBadge/Progress (tsc=0 each):
- plantillas/page + plantillas/[id]/page: StatusPill/WaPill/WaStatusPill helpers -> Badge (success/warning/destructive/outline).
- acuerdos/page: 3x "Pendiente aprobación" warning pill -> Badge warning.
- DebtorDetailClient: paused warning pill -> Badge warning (days pill uses dynamic helper, untouched).
- ai/cobranza/arco: tab-count badge (conditional overdue) -> Badge variant={overdue?destructive:secondary}.
- ai/pagos: FeedActorChip 3 branches -> Badge (default/secondary).
- operaciones: renovaciones tab-count -> Badge warning.
- ai/page: live "Activo" pill+ping-dot -> StatusBadge tone=success pulse (heading dot L346 stays = allowlisted).
- analytics: trend pill -> Badge (success/destructive/secondary); KPI target progress bar -> Progress(xs, variant by accentColor).
- propiedades/page (2) + propiedades/[id]/candidatos (1): avatar `rounded-full bg-primary-soft` -> bg-surface-brand.
PILL REMAINING 8 = ALL allowlisted CATEGORY (status dots/dot-bullets/tab-count-with-group-data-state/IA-progress):
hoy, documentos(tab group-data), avaluos-ia/nuevo(IA), ai/page(dot), ai/cobranza/page(dot), ai/estudio/page(actor dot),
ai/estudio/[id]/tabs/ReporteTab(dot), ai/asegurabilidad/page(dot).

## FINAL GATE (this session end): button 24 · input 7 · select 0 · textarea 0 · tabs 1 · table 0 ·
## modal 0 · hand-card 0 · pill 8 · eyebrow 13 · spinner 0.  EVERY family at allowlist floor. tsc=0 (cold build).

## tsc NOTE: panel work is clean. Pre-existing prior-session git-modified inmobiliaria files
(ConfigPerfilAgencia/MantenimientoForm/AgencySetupWizard) intermittently surfaced stale `SpinnerGap`
errors via tsconfig.tsbuildinfo incremental cache — a COLD build (rm tsconfig.tsbuildinfo) reports 0.
Those files are out of panel scope and already fixed in the working tree.
