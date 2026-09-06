/**
 * API environment configuration for the Leasefy AI platform.
 *
 * Controls switching between mock and real API backends via environment variables.
 * Real API by default: the simulated mode is opt-in and explicit.
 *
 * Environment variables:
 *   NEXT_PUBLIC_USE_MOCK_API  — "true" para pedir el simulado; cualquier otra cosa
 *                               (incluido faltar) = datos reales
 *   NEXT_PUBLIC_AI_API_URL    — Backend URL, defaults to "/api/v1/ai"
 *   NEXT_PUBLIC_MOCK_DELAY_MS — Mock response delay in ms, defaults to 800
 */

// ============================================================================
// Types
// ============================================================================

export interface ApiConfig {
  /** Base URL for AI orchestrator API */
  baseUrl: string;
  /** Whether to use mock implementations instead of real API */
  useMockApi: boolean;
  /** Configurable delay for mock responses (ms) */
  mockDelayMs: number;
}

// ============================================================================
// Config
// ============================================================================

/**
 * Devuelve la configuración de API leída del entorno.
 *
 * El simulado es **opt-in explícito**: sin la variable puesta, la app pega a los
 * datos reales. Antes era al revés (`!== 'false'`), y eso significaba que en
 * desarrollo y en *staging* el panel servía datos inventados sin decirlo: quien
 * probaba ahí sacaba conclusiones sobre pantallas que "funcionaban" porque un
 * mock las llenaba. Un simulado silencioso es peor que no tenerlo.
 *
 * Mismo criterio que `funnel.service.ts` (`isMockMode`): en producción nunca,
 * fuera de producción sólo si alguien lo pide con todas las letras.
 */
export function getApiConfig(): ApiConfig {
  // El simulado NUNCA corre en producción (regla del producto: los datos
  // inventados no llegan a un usuario real). Fuera de producción hay que pedirlo
  // con `NEXT_PUBLIC_USE_MOCK_API=true`; sin la variable, datos reales.
  const useMock =
    process.env.NODE_ENV === 'production'
      ? false
      : process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

  return {
    baseUrl: process.env.NEXT_PUBLIC_AI_API_URL || '/api/v1/ai',
    useMockApi: useMock,
    mockDelayMs: parseInt(process.env.NEXT_PUBLIC_MOCK_DELAY_MS || '800', 10),
  };
}

/**
 * Quick check for mock mode — use this in conditional logic.
 *
 * @example
 * ```ts
 * if (isMockMode()) {
 *   return getMockResponse(message);
 * }
 * return aiClient.sendMessage({ message });
 * ```
 */
export function isMockMode(): boolean {
  return getApiConfig().useMockApi;
}
