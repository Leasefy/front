/**
 * agent-module-access.ts — resolves canAccess() for modules served by the
 * AGENT service (GET {NEXT_PUBLIC_AGENT_URL}/api/agency/:id/my-permissions),
 * as opposed to the monolith's effectivePermissions map.
 *
 * Three posture tiers, by design:
 *
 * - 'cobranza' | 'cotizador' (gated since Phase 29/30): FAIL CLOSED.
 *   Payload missing, agent service down, or action not granted → DENIED.
 *
 * - 'estudio' | 'matching' | 'avaluos' (front gates added alongside the
 *   agent-repo pair PR that adds these keys to the payload):
 *   ABSENT-MODULE = ALLOWED.
 *   These workspaces shipped ungated (backend scopes by agency membership),
 *   so the front gate must be mergeable IN ANY ORDER with the agent PR:
 *   · key ABSENT from the payload (older agent build, agent fetch failed,
 *     NEXT_PUBLIC_AGENT_URL unset) → ALLOWED — preserves today's ungated
 *     posture and avoids lockout during a partial deploy;
 *   · key PRESENT but without the required action (e.g. no 'view') →
 *     DENIED — once the backend speaks for the module, we enforce it.
 *
 * - 'naira' (Fase 13, plan 13-01, D13-3): FAIL CLOSED POR ACCIÓN REAL.
 *   Payload ausente, agente caído o acción no otorgada → DENEGADO. NUNCA
 *   «ausente = permitido»: la UI prometería acciones que el agente niega
 *   (RESEARCH Q9). Naira no tiene ninguna acción 'view' (R13-7): 'view' es
 *   solo un ALIAS = «el arreglo `naira` existe y no está vacío», el que usan
 *   el sidebar, las secciones del módulo, WorkspaceNav y los gates del panel;
 *   toda otra acción tiene que estar en el arreglo. Como `canAccess` pregunta
 *   por el módulo del agente ANTES que por `isAdmin` (PermissionsContext.tsx),
 *   el admin del monolito tampoco pasa sin el arreglo. Consecuencia declarada:
 *   hasta que el agente (10-06) publique `naira` en /my-permissions, Naira
 *   entera queda oculta en el front, incluida la memoria que ya existe. El 403
 *   del servicio sigue siendo la autoridad final.
 */

/** Shape of the agent-service my-permissions payload consumed by the front. */
export interface AgentModulePermissions {
  cobranza: string[];
  cotizador: string[];
  /** Added by the agent-repo pair PR — optional so either repo merges first. */
  estudio?: string[];
  matching?: string[];
  avaluos?: string[];
  /** Lo agrega el agente en 10-06 (`MemberPermissionsResponse.naira`); ausente ⇒ Naira denegada. */
  naira?: string[];
}

const FAIL_CLOSED_MODULES = ['cobranza', 'cotizador', 'naira'] as const;
const ABSENT_ALLOWED_MODULES = ['estudio', 'matching', 'avaluos'] as const;

export type AgentModule =
  | (typeof FAIL_CLOSED_MODULES)[number]
  | (typeof ABSENT_ALLOWED_MODULES)[number];

/** True when the module key is resolved by the agent service (not the monolith). */
export function isAgentModule(module: string): module is AgentModule {
  return (
    (FAIL_CLOSED_MODULES as readonly string[]).includes(module) ||
    (ABSENT_ALLOWED_MODULES as readonly string[]).includes(module)
  );
}

/**
 * Resolve an agent-module permission check against the (possibly null)
 * agent payload, honoring the per-module posture documented above.
 */
export function resolveAgentModuleAccess(
  perms: AgentModulePermissions | null,
  module: AgentModule,
  action: string,
): boolean {
  if ((ABSENT_ALLOWED_MODULES as readonly string[]).includes(module)) {
    const granted = perms?.[module];
    // Absent key (or whole payload missing) → ALLOWED. See header comment.
    if (granted == null) return true;
    return granted.includes(action);
  }
  if (module === 'naira') {
    const granted = perms?.naira;
    // Sin el arreglo del agente (payload ausente o agente caído) → DENEGADO.
    if (granted == null) return false;
    if (action === 'view') return granted.length > 0;
    return granted.includes(action);
  }
  // cobranza / cotizador — FAIL CLOSED (pre-existing behavior, unchanged).
  return perms?.[module]?.includes(action) ?? false;
}
