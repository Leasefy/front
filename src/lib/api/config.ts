/**
 * API environment configuration for the Leasefy AI platform.
 *
 * Controls switching between mock and real API backends via environment variables.
 * Defaults to mock mode when NEXT_PUBLIC_USE_MOCK_API is not explicitly set to "false".
 *
 * Environment variables:
 *   NEXT_PUBLIC_USE_MOCK_API  — "true" (default) or "false"
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
 * Returns the current API configuration from environment variables.
 * Defaults to mock mode (useMockApi=true) when NEXT_PUBLIC_USE_MOCK_API is unset.
 */
export function getApiConfig(): ApiConfig {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API !== 'false';

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
