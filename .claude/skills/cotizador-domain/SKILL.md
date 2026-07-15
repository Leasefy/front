---
name: cotizador-domain
description: cotizador seguros garantias aseguradoras carrier SSE streaming quote wizard re-quote counterfactual ask-why costos insights PDF — activar cuando se trabaje en el dominio de cotización de seguros/garantías del panel de agencia
license: MIT
metadata:
  author: leasify-front
  version: 1.0.0
---

## Activation Contract

Activar cuando la tarea toque: wizard de nueva cotización, streaming de resultados por carrier, registro/override de aseguradoras, cotizaciones históricas, re-quote, counterfactual ("pedir explicación"), costos de cotización, insights, o descarga de PDF de veredicto.

## Hard Rules

- **PII cédula**: `hashCedula` en `src/lib/cotizador/hash-cedula.ts` — 64-char hex SHA-256. Se llama SOLO en el submit del wizard (paso 3), nunca antes, nunca en URL ni logs. Lanza `CedulaValidationError` si el input tiene < 7 o > 10 dígitos.
- **SSE parsing**: usar SIEMPRE `parseSSEEvent` de `src/lib/cotizador/sse-schemas.ts`. Nunca parsear manualmente frames SSE. Eventos terminales: `agent.final_verdict` y `agent.session_expired`. Eventos desconocidos retornan `{ type: 'unknown', raw }` — no lanzar.
- **PDF download**: `usePdfDownload` (`src/lib/cotizador/use-pdf-download.ts`). Endpoint: `GET .../cotizador/quote/:quoteId/verdict.pdf`. PDF es server-side desde Phase 38 — NO usar `@react-pdf/renderer` para el veredicto.
- **Auth contra agent**: `agentAuthHeaders()` de `@/lib/api/agent-auth` en todos los hooks. El agent no lee cookies.
- **Tipos generados**: `src/lib/api/generated/cotizador.ts` es placeholder — cotizador routes no publicadas en OpenAPI v0.1.2. Tipos se declaran inline en cada hook. Agregar `// TODO: regenerate after cotizador publish`.
- **No hay service layer**: no existe `cotizador.service.ts`. Los hooks llaman `globalThis.fetch` directamente.
- **Draft del wizard**: `useWizardDraft` persiste en localStorage con clave `cotizador.draft.wizard` (TTL 24h). Re-quote: `cotizador.draft.wizard:<parentQuoteId>`. No cambiar estas claves — son legacy-safe.
- **Override de carrier**: PUT body incluye `priority`, `mode`, `maxCanon`, `enabled`. Reset: `DELETE .../aseguradoras/:name/override?route=<route>`. Optimistic en `useCarrierRegistry`.
- **Permiso de acceso**: layout gate-keepea con `canAccess('cotizador', 'view')`; página de aseguradoras requiere `canAccess('cotizador', 'configure-carrier')`. Ver `[[agency-permissions]]`.
- **Realtime en overview**: suscripción Supabase a `cotizador_quote_requests` desactivada (tabla no en publicación aún). No reactivar sin confirmar.
- **UI**: leer `docs/DESIGN.md` antes de tocar cualquier componente.

## Key Paths

| Artefacto | Path |
|---|---|
| Lib cotizador | `src/lib/cotizador/` (4 archivos) |
| Hooks | `src/lib/hooks/cotizador/` (12 hooks) |
| Componentes shared | `src/components/cotizador/` (`CounterfactualModal`, `ReQuoteOfBadge`) |
| Componentes panel | `src/components/inmobiliaria/cotizador/` (~30 archivos) |
| Rutas panel | `src/app/panel/inmobiliaria/ai/cotizador/` |
| Tipos generados (placeholder) | `src/lib/api/generated/cotizador.ts` |

**Rutas del panel:**
- `/` overview → `useCotizadorOverview`, `CotizadorKpiStrip`, `CotizadorRecentQuotesFeed`, `CotizadorCarriersStatus`
- `/nueva` → wizard 3 pasos (`WizardStep1Candidato` → `WizardStep2Propiedad` → `WizardStep3Review`). Re-quote vía `?from=<uuid>`. POST a `/api/agency/:id/cotizador/quote`. Manejar 451 (ARCO) y 429 (session cap).
- `/[quoteId]` → SSE streaming (`useQuoteStream` + `useQuoteMetadata`), `CarrierStreamGrid`, `StreamCompleteBanner` (con `usePdfDownload`), `CounterfactualModal`, `ReQuoteOfBadge`. ARIA live region para carrier verdicts.
- `/aseguradoras` → `CarrierRegistryTable` (8 columnas, `MergedCarrierRow[]`). Conflict alert cuando `tenantEnabled=true && globalEnabled=false`.
- `/aseguradoras/[carrier]` → deep-dive: `CarrierDeepDiveKpiStrip`, `CarrierErrorRateChart`, `CarrierLatencySparkline`, etc.
- `/aseguradoras/[carrier]/sla` → `CarrierSlaStateCard`, `CarrierSlaBreachWindows`
- `/costos` → `useCostos` (dual poll: 30s summary + 60s series), `CostKpiStrip`, `CostSourcePieChart`, `MonthlyCostTrendChart`
- `/insights` → `useInsights` (Promise.all 4 endpoints), approval rate, prima distribution, assumptions, monthly cost trend

**SSE reconnect**: backoff 1→2→4s, máx 3 reintentos — implementado en `useQuoteStream`.

## Decision Gates

| Situación | Acción |
|---|---|
| Nuevo tipo de SSE event | Agregar a `sse-schemas.ts`: schema Zod + discriminante en `ParsedSSEEvent` + caso en `parseSSEEvent` |
| Tipo de cotizador no en `agent.ts` | Declarar inline en el hook; agregar comentario TODO de regeneración |
| PDF de veredicto | Usar `usePdfDownload` — no reconstruir con `@react-pdf/renderer` |
| Override de aseguradora | PUT/DELETE via `useCarrierRegistry`; optimismo con rollback en error |
| Conflicto tenant vs global | Mostrar alerta rose en `CarrierRegistryTable`; la resolución es responsabilidad del usuario |
| Re-quote | Preservar `parentQuoteId` en draft key y en `ReQuoteOfBadge` |
| Test de hook | `vi.spyOn(globalThis, 'fetch')` + `createRoot/act`; SSE: static body string en E2E |
| Test E2E de streaming | `page.route('**/cotizador/quote/*/stream', route.fulfill({ body: sseFrames }))` |

## Execution Steps

1. Leer `docs/DESIGN.md` si la tarea toca UI.
2. Verificar si el hook necesario existe en `src/lib/hooks/cotizador/` antes de crear uno nuevo.
3. Para tipos: declararlos inline con comentario TODO (cotizador no está en OpenAPI todavía).
4. Para SSE: siempre pasar por `parseSSEEvent`; manejar el caso `unknown` en la UI.
5. Para PDF: delegar a `usePdfDownload` — no reintroducir client-side rendering.
6. Tests: unit con `vi.spyOn(fetch)` o `createRoot/act`; E2E SSE con static body string. Ver `[[tdd-workflow]]` y `[[testing-patterns]]`.
7. Confirmar permiso `canAccess` correspondiente antes de agregar ruta o acción.

## References

[[agency-permissions]] [[agent-api-contract]] [[testing-patterns]] [[tdd-workflow]] [[engineering-standards]] [[living-docs]]
