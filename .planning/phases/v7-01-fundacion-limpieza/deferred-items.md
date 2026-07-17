# Deferred Items — Phase v7-01

Out-of-scope discoveries logged during execution. NOT fixed here (unrelated to the plans' files).

## Pre-existing test failures (discovered during v7-01-02 execution, 2026-07-17)

`pnpm test` on branch `plan/v7.0-portal-inquilino` has **7 failing tests across 5 files**, all
unrelated to `src/app/inquilino/perfil/page.tsx` (the only file v7-01-02 touched). They are
pre-existing on the branch — none import the tenant profile page.

- `src/app/panel/inmobiliaria/ai/asegurabilidad/nueva/page.test.tsx` — (g) re-quote POST body cedulaHash; (h) 429 sessionCapHit block → `Cannot read properties of null (reading 'click')` on `[data-testid="step3-submit"]`
- `src/components/inmobiliaria/ai/EquipoAgentes.test.tsx` — links Sala/Cola per agent
- `src/components/inmobiliaria/ai/WorkItemDetalle.test.tsx` — estado=fallo status block
- `src/components/inmobiliaria/cotizador/CarrierRegistryTable.test.tsx` — Test 6 "Restablecer al global" AlertDialog
- `src/lib/constants/__tests__/risk-levels.test.ts` — getSeverityIndicator high/medium severity

582 passed / 7 failed / 589 total. These belong to the inmobiliaria AI / cotizador / risk-levels
subsystems and should be triaged by whoever owns those areas.
