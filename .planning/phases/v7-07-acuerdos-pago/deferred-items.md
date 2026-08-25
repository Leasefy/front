# Deferred Items — Phase v7-07

Out-of-scope discoveries logged during execution. NOT fixed here (unrelated to the plan's files).

## Pre-existing test failures (observed during v7-07-01 execution, 2026-07-20)

`pnpm test` on branch `plan/v7.0-portal-inquilino` reports **12 failing tests across 7 files**,
all in agency AI / cobranza / cotizador / risk / agent-hook subsystems — none touched by this
plan and none importing the new `tenant-acuerdos.*` modules. v7-07-01's two commits are purely
additive (516 insertions, 0 modifications/0 deletions to existing files), so it is impossible for
them to have introduced any of these failures. The plan's own spec `tenant-acuerdos.service.test.ts`
passes 28/28.

5 of the 7 files were already documented as pre-existing in
`v7-01-fundacion-limpieza/deferred-items.md`:
- `src/app/panel/inmobiliaria/ai/asegurabilidad/nueva/page.test.tsx`
- `src/components/inmobiliaria/ai/EquipoAgentes.test.tsx`
- `src/components/inmobiliaria/ai/WorkItemDetalle.test.tsx`
- `src/components/inmobiliaria/cotizador/CarrierRegistryTable.test.tsx`
- `src/lib/constants/__tests__/risk-levels.test.ts`

2 additional files have drifted to failing over later phases (v7-02..v7-06), also unrelated:
- `src/lib/hooks/cobranza/__tests__/use-payment-plan-approval.test.tsx`
- `src/lib/hooks/cobranza/use-cobranza-analytics.test.ts`
- `src/lib/hooks/cotizador/use-ask-why.test.tsx`
- `src/lib/hooks/use-agent.test.ts`

675 passed / 12 failed / 687 total. These belong to the inmobiliaria AI / cobranza / cotizador /
agent-hook subsystems and should be triaged by whoever owns those areas.
