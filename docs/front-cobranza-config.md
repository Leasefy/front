# Front — Config de cobranza cableada a los endpoints reales del agente

> Spec entregada por el equipo del micro (agents-worker). Migrar la pantalla
> `/panel/inmobiliaria/cobros/cobranza/configuracion` de `/policies` (decorativo) a los
> TRES endpoints que el runtime del agente realmente lee.

## Contexto (bug de raíz)
La pantalla usa hoy `GET/PUT /api/agency/{agencyId}/policies` (PLURAL, `usePoliciesConfig`).
Persiste en `AgencyPolicyVersion.policy_json` = **journal DECORATIVO**: NADA en el runtime del
agente lo lee. Los valores visibles ("3 llamadas, 08:00–18:00") son **defaults hardcodeados del
front**, no config real. El agente lee de la tabla `AgencyPolicy`, expuesta por 3 endpoints.
Trampa de nombres: **`/policies` (plural, decorativo) ≠ `/policy` (singular, real)**.

## Auth (todos)
- `Authorization: Bearer <JWT>`; el `agencyId` del path DEBE coincidir con el del token (403 si no).
- GET cadence/autonomy: cualquier rol (`cobranza:view`).
- PATCH `/policy` y PUT cadence/autonomy: solo OWNER/ADMIN.

## Endpoint 1 — Negociación / descuentos: `GET` + `PATCH /api/agency/{agencyId}/policy` (SINGULAR)
> Corrección (verificado en `agent.ts`): además del PATCH, existe un **`GET /policy`** real
> que devuelve `AgencyPolicyResponse` — se usa para leer la config actual y renderizar la pantalla.
> (La spec original decía "PATCH-only"; el codegen confirma que el GET existe.)

Partial update (PATCH): todos los campos opcionales; body vacío = no-op 200.
- `maxDiscountPct` number [0..0.5] (def 0)
- `maxPlanMonths` int [1..24] (def 0)
- `minPaymentCop` int [0..1_000_000_000] (def 0)
- `autoEscalateAfterDays` int [1..365] (def 60)
- `allowHardshipPath` boolean (def true)
- `allowedPaymentPlans` int[] únicos [1..36], largo 0..12 (def [3,6,12])
- `negotiationMaxAttempts` int [1..10] (def 3)
- `billingModel` 'performance'|'subscription'|'hybrid' (def 'performance')
- `successFeePct` number [0..0.5] (def 0.08); `hybridPct` number [0..0.5]
- `monthlyMinCop` | `perDeudorCop` | `baseFeeCop` int
- `crmProvider` 'wasi'|'domus'|'webprop'|'sinco' (def 'wasi')
- `erpProvider` 'alegra'|'alegra_full'|'siigo_full'|'world_office' (def 'alegra')
- `siniestroCanonesThreshold` int [1..12] | null
- `dailyReportWhatsappEnabled` boolean (def false)
- `dailyReportThresholds` {pkrPctAlertBelow?, indiceMorosidadPctAlertAbove?, complianceViolationsCriticalAtLeast?, callsOutsideWindowCriticalAtLeast?} | null
- credenciales `*AccountId` string(1..120)|null (normalmente NO en esta pantalla)

Response 200: `AgencyPolicyResponse` (todos + `tenantId` + `*CredentialsConfigured` booleans + `createdAt` + `updatedAt`). NO incluye `autonomyLevel` ni `cadenceConfig`.
Errores: 400 (fuera de rango) · 401 · 403 · 404 (onboarding incompleto) · 503.

## Endpoint 2 — Cadencia: `GET/PUT /api/agency/{agencyId}/cobranza/cadence`
`CadenceConfig` = 7 claves de stage OBLIGATORIAS `{ S0:[], S1:[], S2:[], S3:[], S4:[], S5:[], SX:[] }`.
`CadenceEntry` = `{ dayOffset: int, channel: 'voice'|'whatsapp'|'email', reason: string(1..120), retryUntilConnect?: boolean }`.
- GET 200: `{ cadenceConfig: CadenceConfig|null, source: 'agency'|'default', effectiveConfig: CadenceConfig (NUNCA null), generatedAt }` → renderizar SIEMPRE `effectiveConfig`.
- PUT body: `{ cadenceConfig: CadenceConfig|null }` (null = limpiar override → default). PUT 200: `{ cadenceConfig, source, updatedAt }`.
- Errores: 400 (shape) · 403 · 404 · 503.

## Endpoint 3 — Autonomía: `GET/PUT /api/agency/{agencyId}/cobranza/autonomy`
`autonomyLevel` ∈ `'sugerir' | 'aprobar' | 'automatico_controlado' | 'automatico_completo'`
('sugerir'/'aprobar' requieren aprobación humana; los otros auto-despachan. Default `'automatico_completo'`).
- GET/PUT 200: `{ agencyId, autonomyLevel, requiresHumanApproval: boolean, isDefault: boolean }`. PUT body: `{ autonomyLevel }`.
- Errores: 400 · 401 · 403 · 404 · 503.

## NO editable — hard-caps Ley 2300 (informativos fijos, NO inputs)
- Ventana: L-V 07:00–19:00, Sáb 08:00–15:00, sin domingos ni festivos.
- Frecuencia: 1 contacto/día total, 1/canal/semana.
Hardcodeados por ley, sin override. Mostrar como "Definido por Ley 2300". **Quitar los inputs falsos
de `maxCallsPerWeek` y de horario que la pantalla muestra hoy.**

## Comportamiento / edge cases
- `404` en /policy, /cadence o /autonomy = **onboarding incompleto** de esa agencia (no auto-crea la fila). Estado "config no disponible", no error genérico.
- Toda agencia nueva YA arranca con `autonomyLevel` y `cadenceConfig` sembrados con defaults visibles/editables (fix backend aplicado) → GET trae valores desde el día 1.
- Dejar de usar `/policies` (plural), `/policies/versions`, `/policies/impact`, `/policies/rollback` en esta pantalla (el plural puede quedar como "historial de cambios" si algún día se conecta; HOY es decorativo).
- Regenerar tipos: agents-worker `npm run openapi:dump` → front `pnpm api:gen`.

## Checklist
- [ ] Reemplazar `usePoliciesConfig` → hooks: `useAgencyPolicy` (GET/PATCH `/policy`), `useCadence` (GET/PUT `/cobranza/cadence`), `useAutonomy` (GET/PUT `/cobranza/autonomy`).
- [ ] Form de negociación → PATCH `/policy` (partial; enviar solo campos cambiados).
- [ ] Editor de cadencia por stage → PUT `/cadence` (renderizar `effectiveConfig`).
- [ ] Selector de autonomía (4 opciones) → PUT `/autonomy`.
- [ ] Horario + frecuencia → sección informativa fija (Ley 2300), sin inputs.
- [ ] Gate de edición a OWNER/ADMIN (PATCH/PUT); VIEWER/OPERATOR solo lectura.
- [ ] Manejo de 404 = "onboarding incompleto".
