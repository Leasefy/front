---
name: cobranza-domain
description: cobranza siniestro carta deudor cartera escalacion llamada pago analytics compliance ARCO — activar cuando se trabaje en el dominio de cobranza IA del panel de agencia
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

## Activation Contract

Activar cuando la tarea toque cualquiera de: deudores, siniestros, cartas/artefactos legales, escalaciones, llamadas, pagos/planes de pago, compliance/ARCO, plantillas, reporte diario, o analítica de cobranza.

## Hard Rules

- **PII**: `hashCedulaPrefix` en `src/lib/cobranza/hash-cedula-prefix.ts` debe ejecutarse en el browser antes de enviar búsquedas de cédula. El payload al agent va como `HEX:<8hex>`. NUNCA enviar dígitos crudos.
- **Transcripts PDF**: `TranscriptPdf` (`src/lib/cobranza/transcript-pdf-document.tsx`) recibe texto YA redactado del backend. No hacer PII masking client-side.
- **Auth contra agent**: todos los hooks llaman `agentAuthHeaders()` de `@/lib/api/agent-auth` (Bearer JWT en memoria). NO usar el cliente del back ni cookies.
- **Polling**: `useVisibilityPolling(fn, 30_000, Boolean(agencyId))` — nunca usar `setInterval` directamente en hooks nuevos.
- **Realtime**: suscripciones Supabase Realtime (`cartera_stage_transitions`, `debtor_calls`) NO reemplazan el polling; coexisten. El ARIA live region de transiciones NUNCA debe exponer PII del deudor.
- **Approval flows**: `useCartaApproval` envía solo `{ confirmation: 'yes' }` al backend; `physicalSendMethod`/`sentToAddress` son estado UI local. `useSiniestroApproval` envía `{ selectedInsurers }` en approve y `{ rejectReason, rejectComment? }` en reject. Respetar ese contrato exacto.
- **Permiso de acceso**: el layout en `src/app/panel/inmobiliaria/ai/cobranza/layout.tsx` gate-keepea con `canAccess('cobranza', 'view')`. Páginas de configuración usan módulos adicionales vía `[[agency-permissions]]`.
- **UI**: leer `docs/DESIGN.md` antes de tocar cualquier componente. Componentes en `src/components/inmobiliaria/cobranza/`.

## Key Paths

| Artefacto | Path |
|---|---|
| Lib cobranza | `src/lib/cobranza/` |
| Hooks | `src/lib/hooks/cobranza/` (38 hooks) |
| Stages util | `src/lib/cartera.ts` — `CARTERA_STAGES`, `stageColorClasses`, `stageChannelIcon`, `relativeTime` |
| Rutas panel | `src/app/panel/inmobiliaria/ai/cobranza/` |
| Componentes | `src/components/inmobiliaria/cobranza/` |
| Tipos generados | `src/lib/api/generated/cartera.ts` (re-export facade de `agent.ts`) |
| Tipos agent | `src/lib/api/generated/agent.ts` (auto-gen — NO editar) |

**Rutas principales del panel:**
- `/` overview → `useCarteraOverview`, `CobranzaStageCard` con roving-tabindex ARIA
- `/deudores` → `useDebtorList` (cursor-paginated, filtros, hash cédula)
- `/deudores/[id]` → tabs AccionesTab, CompromisosTab, LlamadasTab, MemosTab, TimelineTab
- `/siniestros/[id]` → `SiniestroApprovalClient`, `useSiniestroApproval`
- `/cartas/[id]` → `CartaApprovalClient`, `useCartaApproval` (`CartaPhysicalSendMethod`)
- `/pagos` → `usePaymentsFunnel`, `usePaymentsFunnelRealtime`
- `/pagos/planes/[planId]` → `PaymentPlanApprovalClient`, `usePaymentPlanApproval`
- `/llamadas/[callId]` → `CallDetailClient`, call sub-components en `call/`
- `/escalaciones/[id]` → `EscalationCard`, `EscalationResolveModal`
- `/analitica`, `/compliance`, `/arco`, `/reporte`, `/plantillas`, `/configuracion`

**Componentes con tests propios:** `Mask.tsx`, `HeatmapGrid24x7.tsx`, `RecoveryRateChart.tsx`, `CostPerPesoKpi.tsx`, `TopObjectionsTable.tsx`, `TopScriptsTable.tsx`, `CadenceChannelMixChart.tsx`.

## Decision Gates

| Situación | Acción |
|---|---|
| Nuevo hook de datos | Usar `useVisibilityPolling`; inferir tipos de `paths[...]` en `agent.ts` generado |
| Endpoint no existe en `agent.ts` | Declarar tipo inline en el hook; agregar comentario `// TODO: regenerate after agent publish` |
| Realtime en tabla nueva | Verificar si la tabla está en la publicación Supabase antes de suscribir |
| Approval nuevo | Respetar body mínimo documentado; UI state extra no viaja a la red |
| Componente de PII | Usar `Mask.tsx` + `PIIRevealModal` — no inventar patrón nuevo |
| Test de hook | `vi.spyOn(globalThis, 'fetch')` + `createRoot/act`; ver `[[testing-patterns]]` |
| E2E de approval flow | `page.route('**/cartera/**', route.fulfill(...))` — no requiere agent corriendo |

## Execution Steps

1. Leer `docs/DESIGN.md` si la tarea toca UI.
2. Identificar el hook relevante en `src/lib/hooks/cobranza/` antes de crear uno nuevo.
3. Para tipos: buscar primero en `src/lib/api/generated/agent.ts`; luego `cartera.ts`.
4. Para stages/labels: usar `CARTERA_STAGES` y `stageColorClasses` de `src/lib/cartera.ts`.
5. Tests: unit con `vi.spyOn(fetch)` o `vi.mock` del hook; E2E con `route.fulfill`. Ver `[[tdd-workflow]]` y `[[testing-patterns]]`.
6. Verificar permiso en layout si se agrega ruta nueva.

## References

[[agency-permissions]] [[agent-api-contract]] [[testing-patterns]] [[tdd-workflow]] [[engineering-standards]] [[living-docs]]
