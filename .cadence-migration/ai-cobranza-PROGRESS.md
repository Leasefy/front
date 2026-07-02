# AI + Cobranza Cadence conversion progress

Area: `src/components/inmobiliaria/ai/**` (25 files) + `src/components/inmobiliaria/cobranza/**` (49 files) = 74 tsx.
(Panel pages under `src/app/panel/inmobiliaria/ai/**` are done by the panel sweep — NOT touched here.)
tsc baseline: 0.

## START GATE (file counts, 2026-06-29)
button 24 · input 4 · select 4 · textarea 3 · table 4 · modal 10 · hand-card 1 · pill 8 · eyebrow 16 · spinner 2. tsc=0.

## IDIOMS (reused from inmobiliaria-PROGRESS)
- bespoke `role="dialog"` centered modal (manual `<button>` overlay + card) → `Dialog`/`DialogContent`/`DialogHeader`/
  `DialogTitle`/`DialogDescription`/`DialogFooter` from `@/components/ui/dialog` (Radix react-remove-scroll handles
  scroll-lock per adapter — DESIGN §17 "use the primitive"). Removes BOTH the modal hit and the overlay `<button>` hit.
  `open` → `<Dialog open onOpenChange={(o)=>!o&&onClose()}>`; drop `if(!open) return null`; conditional description →
  `aria-describedby={undefined}` on content to silence Radix.
- `<select>` → Select/SelectTrigger/SelectValue/SelectContent/SelectItem (value/onValueChange).
- `<input>`/`<textarea>` → Cadence Input/Textarea. font-mono uppercase eyebrow → MonoLabel/Eyebrow.
- icon-only btn → IconButton + aria-label. spinner (animate-spin) → Spinner / Button isLoading.
- pill: label status pill → Badge variant; cobalt `rounded-full bg-primary-soft` icon tile → `bg-surface-brand`;
  semantic icon-circles + legend/status dots → allowlisted (no edit).
- <table> → Table family (@/components/ui/table).

## CONVERTED (gate-clean per file, tsc=0 after each)
- intervention/PauseModal: bespoke role=dialog modal + overlay `<button>` → Dialog/DialogContent/Header/Title/
  Description/Footer. Removed `if(!open) return null`. Cleared modal + overlay-button hit.
- intervention/ManualCallModal: same; conditional description rendered in BOTH allowed/denied branches (Radix always has one).
- intervention/ManualWAModal: same modal→Dialog; `<select>` template picker → Select/SelectTrigger/SelectValue/Content/Item.
- intervention/ForceStageModal: same modal→Dialog; stage `<select>` → Select; conditional description both branches.
GATE after 4: button 20, input 4, select 2, textarea 3, table 4, modal 6, hand-card 1, pill 8, eyebrow 16, spinner 2. tsc=0.
- cobranza/PIIRevealModal: modal→Dialog; 2 raw footer `<button>` (ink confirm + outline cancel)→Button (default/outline).
- cobranza/EscalationResolveModal: bespoke createPortal responsive drawer/modal (Lenis stop/start KEPT) → ResponsiveDialog
  (desktop Dialog + mobile bottom Sheet, both Cadence). `<select>`→Select (placeholder for '' sentinel); ack `<input
  type=checkbox>`→Cadence Checkbox (onCheckedChange); 2 mono-uppercase form labels→MonoLabel (kept `<label htmlFor>` +
  asterisk). Removed createPortal/mounted/manual-Escape/manual backdrop/X-close (built-in). data-lenis-prevent kept on content.
- cobranza/EscalationAssignDropdown: same createPortal responsive → ResponsiveDialog (Lenis kept); X-close→built-in;
  member rows = ALLOWLIST list-row (multiline two-line member selector); ✓ glyph mono span→MonoLabel.
- ai/AIAgentCard: 5 `<button>`→Button/IconButton (run trigger + popover submit→Button isLoading; error-dismiss + clear→
  IconButton; ver-trace→Button link); inline running spinner→Spinner; "Activo" eyebrow→MonoLabel.
  ALLOWLIST: inline anchored run-form popover (`role=dialog` under card relative wrapper — portaled Dialog/Popover would
  detach anchor + break inline-DOM test). 2 live ping/status dots = allowlisted dots.
- ai/AIAgentCard.test.tsx — ALLOWLIST: `role="dialog"` strings are TEST ASSERTIONS (querySelector), not UI.
GATE after 8 files: button 17, input 3, select 1, textarea 3, table 4, modal 3, hand-card 1, pill 8, eyebrow 13, spinner 1. tsc=0.
- cobranza/ThresholdVersionsTable: rollback-confirm modal→AlertDialog (Action onClick preventDefault to keep "Restaurando…"
  loading state); `<table>`→Table family (TableHead auto mono-upper clears 5 th eyebrows); Restaurar `<button>`→Button outline;
  heading/warning/vigente/edit eyebrows→MonoLabel; "Rollback de vN" badge→Badge warning. CLEARED table for file.
- cobranza/TopObjectionsTable: `<table>`→Table family (4 th eyebrows cleared).
- cobranza/TopScriptsTable: `<table>`→Table family (header-row eyebrow cleared).
- cobranza/CobranzaFunnelChart: legend stage eyebrow→MonoLabel. ALLOWLIST: sr-only a11y-fallback `<table>` w/ <caption>
  (chart aria-describedby) — Cadence Table adds visible scroll-div + drops caption; degrades sr-only with no visual gain.
GATE after 12: button 16, input 3, select 1, textarea 3, table 1(allowlist sr-only), modal 2(both allowlist), hand-card 1,
pill 8, eyebrow 9, spinner 1. tsc=0. **MODAL + TABLE families now at allowlist floor.**
Remaining eyebrow (9): AIAgentDetailSidebar(4), ColaHumana, WorkItemDetalle(2), EquipoAgentes, MigaDePan, AccionSugerida,
ThresholdEditor, SubscriptionToggles, HabeasDataSlaCard.
NOTE: a CONCURRENT migration process is also editing this repo (touched inquilino/, EquipoAgentes, WorkItemDetalle,
HabeasDataSlaCard — those became clean without my edits). I re-read before every edit + re-run tsc; transient out-of-scope
tsc errors (e.g. SpinnerGap in app/inquilino) appear+resolve from that process, NOT from my changes.

- ai/AIAgentDetailSidebar (bespoke drawer, NO role=dialog → not modal-gated; custom-drawer-shell precedent): close X→
  IconButton; 3 section labels + "Agente AI" pill text→MonoLabel. (drawer shell deferred per precedent.)
- ai/MigaDePan: breadcrumb crumbs (mono-uppercase `<ol>`)→MonoLabel per crumb (text-current keeps link/active color).
- ai/ColaHumana + ai/AccionSugerida (shared ACTION_KIND_CLS): replaced ACTION_KIND_CLS→ACTION_KIND_VARIANT (kind→Button
  variant: primary=default/danger=destructive/neutral=outline); action+reason confirm/cancel `<button>`→Button; severidad
  chip→StatusBadge (tone via new SEVERIDAD_TONE map, pulse on critica) [clears eyebrow]; `<textarea>`→Textarea; eyebrow→
  MonoLabel (AccionSugerida). ColaHumana whole-card "open" body button = ALLOWLIST (multiline list-row). SEVERIDAD_TOKEN
  kept (still used by out-of-scope EstudiosListClient/CotizadorPriorityInbox/PagoCasoDetalle/WorkItemDetalle).
GATE: button 14, input 3, select 1, textarea 1, table 1(allowlist), modal 2(allowlist), hand-card 1, pill 8, eyebrow 2, spinner 1. tsc=0.
- cobranza/SubscriptionToggles: hand `role=switch` button (+bg-success track pill)→Cadence Switch (checked/onCheckedChange);
  "Guardando" eyebrow→MonoLabel. Cleared button+pill+eyebrow for file.
- cobranza/ThresholdEditor: 6 `<input>`→Input (font-mono tabular-nums kept); 6 mono labels (labelClass)→MonoLabel;
  submit `<button>`→Button isLoading. Cleared input+button+eyebrow.
GATE: button 12, input 2, select 1, textarea 1, table 1(AL), modal 2(AL), hand-card 1, pill 7, eyebrow 0, spinner 1. tsc=0.
**EYEBROW family COMPLETE (0).**

## ✅ AREA DONE — 2026-06-29 eve (opus, SOLE DRIVER after the background autonomous-loop session was killed)
Context: a daemon-respawned background `claude` session (`b542048f`) was still editing this area concurrently. Nico OK'd killing it; I killed the loop session + its pty-host + the **daemon (98641)** that resurrected it (no supervisor → stays dead), then finished as the only editor.
Conversions this pass: `EquipoAgentes`/`WorkItemDetalle`/`HabeasDataSlaCard` eyebrows→`MonoLabel`; `AIActivityDetailPanel` close-X→`IconButton`; `CallTranscript` retry+seek→`Button`; `CobranzaInboxGroups` "Nuevo"+group pills→`Badge` (GRUPO_BADGE_VARIANT); `CallAudioPlayer` play/pause→`IconButton` + speed→`SegmentedControl` (string-coerced, control is string-only); `AIAgentExecutionPanel` top-bar Back→`Button`.
FINAL GATE: button 8 · input 2 · select 0 · textarea 0 · tabs 0 · table 1 · modal 2 · hand-card 1 · pill 5 · eyebrow 0 · spinner 1. **tsc=0.** Every remaining hit is an ALLOWLIST case (traced in CADENCE-ADOPTION-PLAYBOOK.md "### inmobiliaria ai/ + cobranza/"):
- buttons: list-rows (NextActionsPanel, EscalationCard, ColaHumana, AIAgentExecutionPanel TimelineStep), CobranzaStageCard (roving-tabindex grid cell), HeatmapGrid24x7 (gridcell), PromesaCard (disclosure), EscalationAssignDropdown (member-rows), AIAgentExecutionPanel video-chrome.
- input: CobranzaImportCard (compact file picker), CallAudioPlayer (type=range scrubber).
- table: CobranzaFunnelChart (sr-only a11y table). modal: AIAgentCard (inline popover) + .test (assertions). hand-card/pill/spinner: AIAgentExecutionPanel computer-view simulation (dark screen cards, status circles, window dots, status spinners) + AIAgentCard status dots.
