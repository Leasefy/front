/**
 * fuente-a-ruta.ts — de una cifra de Naira a su pantalla en el panel (drill-down, Fase 13 plan 13-01; D13-7, UI-02).
 *
 * Mapas CERRADOS: cada métrica del catálogo del agente y cada fuente de su registro tiene una fila; `null` = «sin
 * enlace» (la vista lo declara, nunca un enlace roto). Jamás se arma un `href` con un string que venga del agente
 * (el antipatrón de PilotoCajon.tsx:498-518): cada ruta es un literal completo y la búsqueda usa `Object.hasOwn`, así
 * un id como `constructor` o `__proto__` no devuelve nada del prototipo. Toda ruta no nula tiene su `page.tsx` bajo
 * src/app/panel/inmobiliaria (lo prueba fuente-a-ruta.test.ts).
 *
 * El drill-down v1 llega al LISTADO de la fuente (U7). E13-2 ya trae `entidades` en los ítems del briefing; enlazarlas a
 * una ficha no es de este plan. Las rutas del ERP son las de /pagos/* (D13-21: /cobros/* ya no tiene `page.tsx`).
 * `agent.agency_members` jamás se enlaza (B-5: nunca a una persona del equipo).
 * 🔔 `agent.prospect_leads` ⇒ /pipeline por coherencia con la métrica de leads sin contacto (UI-SPEC §6.2); RESEARCH A3
 * duda de que /pipeline liste esos leads: queda declarado.
 */

// fuente: agent-account-manager src/naira/metrics/catalog.ts (EXISTE; medido por id, sus líneas se mueven)
export const METRICAS_DEL_CATALOGO = [
  'cartera.morosidad_rate',
  'cartera.mora_exposure_cop',
  'cartera.recovered_cop_30d',
  'cartera.promise_kept_rate_7d',
  'cartera.promises_open_count',
  'cartera.payment_plan_default_rate_90d',
  'cartera.escalations_open_count',
  'cartera.disputes_open_count',
  'portafolio.available_units_count',
  'portafolio.vacancy_rate',
  'portafolio.rent_roll_cop',
  'portafolio.days_on_market_p50',
  'prospectos.leads_sin_contacto_count',
  'sla.escalacion_vencida_count',
] as const

// fuente: agent-account-manager src/naira/volatility/registry.ts:48-330 (EXISTE, SOURCE_REGISTRY)
export const FUENTES_DEL_REGISTRO = [
  'public.consignaciones',
  'agent.debtors',
  'agent.payments',
  'agent.debtor_states',
  'agent.payment_promises',
  'agent.payment_plans',
  'agent.escalations',
  'agent.disputes',
  'agent.recovery_outcomes',
  'agent.insurance_claims',
  'agent.audit_log',
  'agent.approval_request',
  'agent.agency_members',
  'agent.agency_policies',
  'naira.metric_catalog',
  'agent.debtor_memos',
  'agent.domain_event',
  'agent.prospect_leads',
  'agent.approval_request_event',
  'naira.inngest_emission',
  'agent.agent_execution_metrics',
  'agent.automated_decisions',
  'naira.third_party_volume',
  'agent.messages.inbound',
] as const

/** UI-SPEC §6.2 (14 métricas ⇒ 7 destinos, bajo /pagos por D13-21). */
export const RUTA_DE_LA_METRICA: Readonly<Record<string, string | null>> = {
  'cartera.morosidad_rate': '/panel/inmobiliaria/pagos/cartera',
  'cartera.mora_exposure_cop': '/panel/inmobiliaria/pagos/cartera',
  'cartera.recovered_cop_30d': '/panel/inmobiliaria/pagos/recaudo',
  'cartera.promise_kept_rate_7d': '/panel/inmobiliaria/pagos/cobranza/acuerdos',
  'cartera.promises_open_count': '/panel/inmobiliaria/pagos/cobranza/acuerdos',
  'cartera.payment_plan_default_rate_90d': '/panel/inmobiliaria/pagos/cobranza/acuerdos',
  'cartera.escalations_open_count': '/panel/inmobiliaria/pagos/cobranza',
  'cartera.disputes_open_count': '/panel/inmobiliaria/pagos/cobranza/disputas',
  'portafolio.available_units_count': '/panel/inmobiliaria/inmuebles',
  'portafolio.vacancy_rate': '/panel/inmobiliaria/inmuebles',
  'portafolio.rent_roll_cop': '/panel/inmobiliaria/inmuebles',
  'portafolio.days_on_market_p50': '/panel/inmobiliaria/inmuebles',
  'prospectos.leads_sin_contacto_count': '/panel/inmobiliaria/pipeline',
  'sla.escalacion_vencida_count': '/panel/inmobiliaria/pagos/cobranza',
} as const satisfies Record<(typeof METRICAS_DEL_CATALOGO)[number], string | null>

/** RESEARCH T5: las fuentes con listado; el resto sin enlace. */
export const RUTA_POR_FUENTE: Readonly<Record<string, string | null>> = {
  'public.consignaciones': '/panel/inmobiliaria/inmuebles',
  'agent.debtors': '/panel/inmobiliaria/pagos/cobranza/deudores',
  'agent.payments': '/panel/inmobiliaria/pagos/cobranza/pagos',
  'agent.debtor_states': '/panel/inmobiliaria/pagos/cobranza/deudores',
  'agent.payment_promises': '/panel/inmobiliaria/pagos/cobranza/acuerdos',
  'agent.payment_plans': '/panel/inmobiliaria/pagos/cobranza/acuerdos',
  'agent.escalations': '/panel/inmobiliaria/pagos/cobranza/escalaciones',
  'agent.disputes': '/panel/inmobiliaria/pagos/cobranza/disputas',
  'agent.recovery_outcomes': '/panel/inmobiliaria/pagos/cobranza',
  'agent.insurance_claims': null,
  'agent.audit_log': null,
  'agent.approval_request': null,
  'agent.agency_members': null,
  'agent.agency_policies': null,
  'naira.metric_catalog': null,
  'agent.debtor_memos': null,
  'agent.domain_event': null,
  'agent.prospect_leads': '/panel/inmobiliaria/pipeline',
  'agent.approval_request_event': null,
  'naira.inngest_emission': null,
  'agent.agent_execution_metrics': null,
  'agent.automated_decisions': null,
  'naira.third_party_volume': null,
  'agent.messages.inbound': null,
} as const satisfies Record<(typeof FUENTES_DEL_REGISTRO)[number], string | null>

/** La pantalla de una métrica, o `null` (desconocida ⇒ null: nunca una ruta armada con el id). */
export function rutaDeLaMetrica(metricId: string): string | null {
  return Object.hasOwn(RUTA_DE_LA_METRICA, metricId) ? RUTA_DE_LA_METRICA[metricId] ?? null : null
}

/** El listado de una fuente del registro, o `null`. */
export function rutaDeLaFuente(fuente: string): string | null {
  return Object.hasOwn(RUTA_POR_FUENTE, fuente) ? RUTA_POR_FUENTE[fuente] ?? null : null
}
