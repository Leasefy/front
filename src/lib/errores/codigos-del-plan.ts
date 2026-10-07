/**
 * Los `code` de los 402 (02-10-2026). Espejo de
 * `back/src/inmobiliaria/subscription/codigos-del-plan.ts`: si cambias uno,
 * cambia el otro.
 *
 *  · `PLAN_REQUERIDO` — la inmobiliaria no tiene un plan activo
 *    (`AgencyActiveSubscriptionGuard`). Al CARGAR una pantalla del panel, el
 *    cliente lleva a la página del plan (`el402LlevaAlPlan`, `client.ts`).
 *  · `LIMITE_DEL_PLAN` — llegó al tope de su plan (agentes, inmuebles, las
 *    evaluaciones de candidatos del mes). Nace de una acción y se dice donde
 *    pasó: NUNCA navega. Trae `limite` (`LimiteDelPlan`).
 *  · `NOMINA_NO_HABILITADA` — el módulo de Nómina sin contratar; lo activa
 *    Leasefy, no la página del plan. Lo pinta su propio cartel.
 *
 * Un 402 SIN `code` es un back anterior (o los créditos de IA del micro) y
 * sigue con la regla de antes.
 *
 * Sin imports a propósito: lo leen `client.ts` y el traductor, y ninguno de
 * los dos puede arrastrar al otro.
 */
export const CODIGO_PLAN_REQUERIDO = 'PLAN_REQUERIDO'
export const CODIGO_LIMITE_DEL_PLAN = 'LIMITE_DEL_PLAN'
export const CODIGO_NOMINA_NO_HABILITADA = 'NOMINA_NO_HABILITADA'

/**
 * Qué tope del plan se alcanzó (`limite` en el cuerpo del 402
 * `LIMITE_DEL_PLAN`). Espejo de `LimiteDelPlan` del back.
 * `evaluaciones` (02-10-2026): el tope mensual de evaluaciones de candidatos,
 * que antes era un 429 sin `code` y el front leía como «demasiadas solicitudes».
 */
export type LimiteDelPlan = 'agentes' | 'inmuebles' | 'evaluaciones'
