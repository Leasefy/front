# Clases Tailwind con opacidad que NO generan CSS

Verificado 2026-08-09 contra **los 7 archivos** de `.next/**/*.css` tras `pnpm build`.

## Cómo se mide (3 intentos hasta acertar)

```bash
pnpm build && cat $(find .next -name "*.css") > /tmp/all.css
# la clase existe si aparece como  .bg-surface\/50  (barra escapada)
```

⚠️ Tres formas de equivocarse, las tres me pasaron:
1. Grepear **un solo** archivo CSS — Next parte el CSS en 7.
2. Escapar mal la barra en `sed` (dos backslashes) → todo da "muerta".
3. Sondear en el navegador contra **dev**: su CSS difiere del de producción.

## Las 166 muertas, por cantidad de usos

- `border-danger/30` — 200 uso(s) · app/inquilino/aplicaciones/[applicationId]/completar/page.tsx +124
- `border-warning/30` — 118 uso(s) · app/ayuda/propietarios/page.tsx +86
- `border-success/30` — 100 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx +63
- `bg-surface-muted/50` — 20 uso(s) · app/inquilino/guardados/page.tsx +16
- `border-danger/40` — 20 uso(s) · components/beta/DecisionCard.tsx +8
- `bg-primary-soft/50` — 14 uso(s) · app/inquilino/guardados/page.tsx +9
- `ring-danger/30` — 14 uso(s) · app/panel/inmobiliaria/ai/cobranza/acuerdos/page.tsx +10
- `bg-neutral-500/10` — 14 uso(s) · components/beta/DecisionCard.tsx +1
- `ring-danger/20` — 13 uso(s) · app/inquilino/configuracion/page.tsx +7
- `bg-neutral-800/50` — 13 uso(s) · app/panel/inmobiliaria/ai/cobranza/cartas/page.tsx +9
- `bg-danger-soft/40` — 10 uso(s) · app/panel/inmobiliaria/contratos/[id]/editar/page.tsx +6
- `bg-surface-muted/60` — 10 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/costos/page.tsx +9
- `ring-success/30` — 9 uso(s) · app/panel/inmobiliaria/ai/cobranza/deudores/[id]/DebtorDetailClient.tsx +8
- `ring-warning/30` — 9 uso(s) · app/panel/inmobiliaria/ai/cobranza/deudores/[id]/DebtorDetailClient.tsx +6
- `bg-surface-muted/40` — 9 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/insights/page.tsx +7
- `bg-neutral-900/30` — 9 uso(s) · components/inmobiliaria/cobranza/TopScriptsTable.tsx +1
- `bg-amber-900/15` — 8 uso(s) · app/panel/inmobiliaria/contratos/[id]/editar/page.tsx +3
- `border-danger/20` — 7 uso(s) · app/inquilino/documentos/page.tsx +5
- `bg-primary-soft/40` — 7 uso(s) · app/inquilino/arriendo/[leaseId]/page.tsx +4
- `border-amber-500/40` — 7 uso(s) · app/panel/inmobiliaria/contratos/[id]/editar/page.tsx +3
- `border-success/40` — 7 uso(s) · app/panel/(landlord)/[propertyId]/page.tsx +4
- `bg-rose-950/30` — 7 uso(s) · components/inmobiliaria/CreditCheckBlock.tsx +4
- `bg-primary-soft/30` — 7 uso(s) · components/onboarding/steps/StepFirstProperty.tsx +2
- `bg-foreground/90` — 6 uso(s) · app/ayuda/page.tsx +4
- `bg-neutral-950/50` — 6 uso(s) · app/panel/inmobiliaria/ai/cobranza/cartas/page.tsx +5
- `border-strong/50` — 6 uso(s) · components/inmobiliaria/ActaEntregaViewer.tsx +5
- `bg-surface/50` — 5 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx +3
- `border-fg/20` — 5 uso(s) · app/panel/inmobiliaria/documentos/page.tsx +3
- `bg-warning/10` — 5 uso(s) · app/panel/inmobiliaria/ai/conciliacion/liquidaciones/page.tsx +4
- `ring-primary/40` — 5 uso(s) · app/panel/inmobiliaria/ai/cobranza/reportes-propietarios/page.tsx +2
- `bg-surface/95` — 5 uso(s) · app/onboarding/inmobiliaria/OnboardingInmobiliariaClient.tsx +4
- `border-border/30` — 5 uso(s) · components/beta/DecisionCard.tsx +1
- `border-warning/40` — 5 uso(s) · components/inmobiliaria/ActaEntregaSteps.tsx +4
- `border-foreground/15` — 5 uso(s) · components/inmobiliaria/AnalyticsDashboard.tsx +2
- `bg-warning-soft/50` — 5 uso(s) · components/inmobiliaria/AgenteLeaderboard.tsx +4
- `bg-surface/80` — 4 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx +3
- `bg-primary/90` — 4 uso(s) · app/inquilino/arriendo/page.tsx +3
- `bg-warning/20` — 4 uso(s) · app/inquilino/para-ti/page.tsx +3
- `bg-surface/10` — 4 uso(s) · app/inquilino/para-ti/page.tsx
- `text-fg-muted/50` — 4 uso(s) · app/panel/inmobiliaria/ai/cobranza/equipo/page.tsx +2
- `border-emerald-500/40` — 4 uso(s) · app/panel/inmobiliaria/contratos/[id]/firmar/page.tsx +2
- `border-warning/25` — 4 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/ejecucion/page.tsx +3
- `divide-neutral-700/50` — 4 uso(s) · app/panel/(landlord)/configuracion/page.tsx
- `bg-success/20` — 4 uso(s) · app/pricing/empresas/page.tsx +3
- `bg-card/80` — 4 uso(s) · components/beta/DecisionCard.tsx +3
- `bg-primary/20` — 4 uso(s) · components/inmobiliaria/AgencyPricingModal.tsx +3
- `bg-warning/12` — 4 uso(s) · components/inmobiliaria/ComisionesTable.tsx
- `bg-success/30` — 4 uso(s) · components/inmobiliaria/CobroDetail.tsx +3
- `bg-surface/20` — 3 uso(s) · app/inquilino/guardados/page.tsx +2
- `bg-surface/5` — 3 uso(s) · app/inquilino/notificaciones/page.tsx +1
- `bg-danger-soft/60` — 3 uso(s) · app/inquilino/documentos/page.tsx +2
- `border-current/10` — 3 uso(s) · app/inquilino/contratos/[contractId]/firmar/page.tsx +1
- `bg-danger-soft/80` — 3 uso(s) · app/panel/inmobiliaria/propiedades/[id]/candidatos/page.tsx +1
- `bg-neutral-800/60` — 3 uso(s) · app/panel/inmobiliaria/cobros/page.tsx +2
- `bg-emerald-900/15` — 3 uso(s) · app/panel/inmobiliaria/contratos/[id]/firmar/page.tsx +2
- `bg-emerald-900/20` — 3 uso(s) · app/panel/inmobiliaria/contratos/[id]/editar/page.tsx +2
- `bg-neutral-800/30` — 3 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/comparar/page.tsx +2
- `bg-surface/90` — 3 uso(s) · app/panel/(landlord)/propiedades/page.tsx +2
- `bg-success-soft/60` — 3 uso(s) · app/panel/(landlord)/[propertyId]/page.tsx +1
- `bg-primary-soft/60` — 3 uso(s) · app/panel/(landlord)/[propertyId]/page.tsx +1
- `bg-muted/80` — 3 uso(s) · app/panel/(landlord)/[propertyId]/page.tsx +2
- `ring-foreground/10` — 3 uso(s) · app/pricing/empresas/page.tsx +1
- `text-fg-subtle/60` — 3 uso(s) · components/beta/ConversationList.tsx +1
- `bg-surface-muted/80` — 3 uso(s) · components/beta/ConversationList.tsx +1
- `bg-surface-muted/30` — 3 uso(s) · components/contract/AuthenticityCertificate.tsx +2
- `bg-white/25` — 3 uso(s) · components/landing/_kit.tsx +1
- `text-fg/70` — 3 uso(s) · components/avaluo/AvaluoWizardShell.tsx +2
- `text-warning/80` — 3 uso(s) · components/inmobiliaria/cotizador/RecoveryAsegurabilidad.tsx +2
- `bg-success/90` — 3 uso(s) · components/inmobiliaria/CandidateDrawer.tsx +1
- `bg-surface-muted/70` — 3 uso(s) · components/inmobiliaria/PropertyIACapture.tsx +1
- `bg-danger-soft/50` — 3 uso(s) · components/inmobiliaria/ActaEntregaSteps.tsx +1
- `divide-white/5` — 2 uso(s) · app/inquilino/notificaciones/page.tsx
- `bg-surface/30` — 2 uso(s) · app/inquilino/page.tsx +1
- `bg-danger-soft/30` — 2 uso(s) · app/inquilino/configuracion/page.tsx +1
- `bg-danger/20` — 2 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx +1
- `bg-warning-soft/80` — 2 uso(s) · app/panel/inmobiliaria/propiedades/[id]/candidatos/page.tsx +1
- `bg-error-500/15` — 2 uso(s) · app/panel/inmobiliaria/ai/conciliacion/movimientos/page.tsx
- `border-primary/50` — 2 uso(s) · app/panel/inmobiliaria/ai/cobranza/deudores/[id]/tabs/AccionesTab.tsx +1
- `text-danger/80` — 2 uso(s) · app/panel/inmobiliaria/ai/cobranza/llamadas/[callId]/CallDetailClient.tsx +1
- `border-success/25` — 2 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/ejecucion/page.tsx +1
- `bg-fg-muted/50` — 2 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/ejecucion/page.tsx +1
- `bg-white/30` — 2 uso(s) · app/panel/(landlord)/perfil/page.tsx +1
- `text-warning/70` — 2 uso(s) · app/panel/(landlord)/contratos/page.tsx +1
- `text-success/70` — 2 uso(s) · app/panel/(landlord)/[propertyId]/page.tsx
- `from-warning/10` — 2 uso(s) · app/pricing/page.tsx +1
- `bg-card/30` — 2 uso(s) · components/beta/WorkspaceView.tsx
- `bg-card/20` — 2 uso(s) · components/beta/WorkspaceView.tsx
- `bg-neutral-50/80` — 2 uso(s) · components/beta/AgentResultCard.tsx +1
- `bg-neutral-800/15` — 2 uso(s) · components/beta/DecisionHistory.tsx
- `bg-neutral-800/40` — 2 uso(s) · components/beta/ResponseCard.tsx +1
- `bg-plan-primary/90` — 2 uso(s) · components/tenant/PropertyMatchCard.tsx
- `border-border-faint/30` — 2 uso(s) · components/landing/_kit.tsx
- `bg-danger/90` — 2 uso(s) · components/contract/RejectContractModal.tsx +1
- `bg-warning/90` — 2 uso(s) · components/contract/RejectContractModal.tsx +1
- `ring-ring/20` — 2 uso(s) · components/property/FilterSidebar.tsx
- `border-foreground/20` — 2 uso(s) · components/inmobiliaria/MantenimientoList.tsx +1
- `bg-warning-soft/40` — 2 uso(s) · components/inmobiliaria/ActaEntregaSteps.tsx +1
- `text-warning/90` — 2 uso(s) · components/inmobiliaria/PropertyIACapture.tsx +1
- `bg-success/50` — 2 uso(s) · components/inmobiliaria/CobroDetail.tsx +1
- `border-risk-c/30` — 2 uso(s) · lib/constants/__tests__/risk-levels.test.ts +1
- `bg-risk-a/10` — 2 uso(s) · lib/constants/risk-levels.ts
- `bg-risk-b/10` — 2 uso(s) · lib/constants/risk-levels.ts
- `bg-risk-c/10` — 2 uso(s) · lib/constants/risk-levels.ts
- `bg-risk-d/10` — 2 uso(s) · lib/constants/risk-levels.ts
- `to-surface-muted/80` — 1 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx
- `from-surface-muted/80` — 1 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx
- `bg-destructive/85` — 1 uso(s) · app/inquilino/aplicaciones/[applicationId]/page.tsx
- `bg-warning-soft/90` — 1 uso(s) · app/inquilino/arriendo/[leaseId]/page.tsx
- `bg-success-soft/90` — 1 uso(s) · app/inquilino/arriendo/[leaseId]/page.tsx
- `bg-primary-soft/80` — 1 uso(s) · app/panel/inmobiliaria/propiedades/[id]/candidatos/page.tsx
- `bg-success-soft/80` — 1 uso(s) · app/panel/inmobiliaria/propiedades/[id]/candidatos/page.tsx
- `bg-emerald-900/40` — 1 uso(s) · app/panel/inmobiliaria/contratos/[id]/firmar/page.tsx
- `bg-amber-900/20` — 1 uso(s) · app/panel/inmobiliaria/contratos/[id]/page.tsx
- `text-danger/90` — 1 uso(s) · app/panel/inmobiliaria/contratos/page.tsx
- `bg-success/10` — 1 uso(s) · app/panel/inmobiliaria/ai/conciliacion/liquidaciones/page.tsx
- `bg-info/10` — 1 uso(s) · app/panel/inmobiliaria/ai/conciliacion/liquidaciones/page.tsx
- `bg-success-500/15` — 1 uso(s) · app/panel/inmobiliaria/ai/conciliacion/movimientos/page.tsx
- `border-error-500/40` — 1 uso(s) · app/panel/inmobiliaria/ai/conciliacion/movimientos/page.tsx
- `text-error-500/90` — 1 uso(s) · app/panel/inmobiliaria/ai/conciliacion/movimientos/page.tsx
- `divide-success/20` — 1 uso(s) · app/panel/inmobiliaria/ai/cobranza/siniestros/[id]/SiniestroApprovalClient.tsx
- `bg-accent/30` — 1 uso(s) · app/panel/inmobiliaria/ai/cobranza/compliance/page.tsx
- `border-warning/50` — 1 uso(s) · app/panel/inmobiliaria/ai/cobranza/deudores/[id]/tabs/AccionesTab.tsx
- `border-danger/25` — 1 uso(s) · app/panel/inmobiliaria/ai/asegurabilidad/ejecucion/page.tsx
- `bg-neutral-800/20` — 1 uso(s) · app/panel/(landlord)/upgrade/page.tsx
- `bg-bg/90` — 1 uso(s) · app/admin/(panel)/agents/[id]/page.tsx
- `bg-surface/85` — 1 uso(s) · app/avaluo-ia/reporte/page.tsx
- `border-neutral-700/20` — 1 uso(s) · app/para/agentes/page.tsx
- `ring-primary/25` — 1 uso(s) · app/pricing/page.tsx
- `border-neutral-500/30` — 1 uso(s) · components/beta/DecisionCard.tsx
- `ring-success/20` — 1 uso(s) · components/beta/DecisionCard.tsx
- `to-fg-muted/10` — 1 uso(s) · components/ui/plan/SubscriptionBadge.tsx
- `to-warning/10` — 1 uso(s) · components/ui/plan/SubscriptionBadge.tsx
- `border-plan-border/60` — 1 uso(s) · components/ui/plan/PlanSidebar.tsx
- `ring-plan-accent/50` — 1 uso(s) · components/ui/plan/PlanDetailSheet.tsx
- `bg-accent/50` — 1 uso(s) · components/ui/collapsible.tsx
- `bg-surface/70` — 1 uso(s) · components/landing/showcase/AgentsShowcaseA.tsx
- `bg-warning-soft/60` — 1 uso(s) · components/contract/RejectionsHistory.tsx
- `ring-neutral-600/50` — 1 uso(s) · components/contract/InsuranceSelector.tsx
- `border-border-strong/50` — 1 uso(s) · components/contract/InsuranceSelector.tsx
- `border-success/20` — 1 uso(s) · components/panel/SetupDashboard.tsx
- `bg-surface/60` — 1 uso(s) · components/wizard/WizardShell.tsx
- `text-fg-muted/60` — 1 uso(s) · components/inmobiliaria/CandidateDrawer.tsx
- `bg-emerald-950/30` — 1 uso(s) · components/inmobiliaria/CreditCheckBlock.tsx
- `bg-amber-950/30` — 1 uso(s) · components/inmobiliaria/CreditCheckBlock.tsx
- `bg-amber-900/50` — 1 uso(s) · components/inmobiliaria/CreditCheckBlock.tsx
- `bg-danger/12` — 1 uso(s) · components/inmobiliaria/VencimientosTable.tsx
- `bg-muted/60` — 1 uso(s) · components/inmobiliaria/CommandPalette.tsx
- `bg-warning/60` — 1 uso(s) · components/inmobiliaria/cotizador/CarrierCardExpandible.tsx
- `bg-warning/70` — 1 uso(s) · components/inmobiliaria/cotizador/RecoveryAsegurabilidad.tsx
- `bg-success/12` — 1 uso(s) · components/inmobiliaria/ComisionesTable.tsx
- `bg-primary/12` — 1 uso(s) · components/inmobiliaria/ComisionesTable.tsx
- `bg-success/15` — 1 uso(s) · components/inmobiliaria/ComisionDesglose.tsx
- `from-primary/30` — 1 uso(s) · components/inmobiliaria/ExtractoPropietario.tsx
- `to-primary/30` — 1 uso(s) · components/inmobiliaria/ExtractoPropietario.tsx
- `border-foreground/30` — 1 uso(s) · components/inmobiliaria/RegistrarPagoModal.tsx
- `bg-success-soft/50` — 1 uso(s) · components/inmobiliaria/CotizacionComparator.tsx
- `bg-bg/85` — 1 uso(s) · components/inmobiliaria/ai/WorkspaceNav.tsx
- `bg-fg-muted/30` — 1 uso(s) · components/inmobiliaria/MantenimientoForm.tsx
- `border-fg-muted/40` — 1 uso(s) · components/inmobiliaria/RenovacionWorkflowSteps.tsx
- `text-success/80` — 1 uso(s) · components/inmobiliaria/ActaEntregaViewer.tsx
- `ring-warning/20` — 1 uso(s) · components/inmobiliaria/pagos/SecuenciaRecordatorios.tsx
- `bg-danger/60` — 1 uso(s) · components/inmobiliaria/reports/CollectionsReport.tsx
- `border-foreground/90` — 1 uso(s) · components/pricing/ManagementTierCard.tsx
- `border-risk-a/30` — 1 uso(s) · lib/constants/risk-levels.ts
- `border-risk-b/30` — 1 uso(s) · lib/constants/risk-levels.ts
- `border-risk-d/30` — 1 uso(s) · lib/constants/risk-levels.ts

## Cuidado al reemplazar

No es un `sed` masivo. `bg-danger/20` hoy pinta **nada**; cambiarlo por `bg-danger`
da un bloque ROJO SÓLIDO. Lo que se quería era el tinte: `bg-danger-soft`.

Mapa sugerido:

| Muerta | Reemplazo | Por qué |
|---|---|---|
| `bg-{danger,success,warning,info}/1x–3x` | `bg-{x}-soft` | era un tinte |
| `bg-{x}-soft/NN` | `bg-{x}-soft` | ya es el tinte |
| `bg-surface/NN`, `bg-surface-muted/NN` | base sin opacidad | superficie opaca |
| `bg-fg-muted/NN` | `bg-surface-muted` | token de TEXTO usado como fondo |
| `text-fg/70` | `text-fg-muted` | jerarquía, no opacidad |
| `text-fg-muted/5x` | `text-fg-subtle` | idem |
| `border-*/NN` | `border-border` salvo intención de color | |

**Verificar cada bloque en pantalla**: los que hoy no pintan nada pueden estar
apoyados en el fondo del padre y verse bien; darles color sería una regresión.

