/**
 * describirActor — quién hizo cada acción en el historial de un caso.
 *
 * Antes la lista mostraba `actor_type` a secas: «user · 10/8/2026». Eso dice
 * la CATEGORÍA del actor, no la persona. Con tres administradores en una
 * agencia no se podía saber quién pausó una cobranza, que es justo lo que una
 * traza tiene que contestar.
 */

import { describe, it, expect } from 'vitest'

import { describirActor } from './AccionesTab'

/** El `t` real devuelve la traducción; acá alcanza la última parte. */
const t = (k: string) => k.split('.').pop() as string

describe('describirActor', () => {
  it('una persona se identifica por su email Y su rol', () => {
    expect(
      describirActor(
        { actor_type: 'user', actor_id: 'ana@inmo.co', actor_role: 'ADMIN' },
        t,
      ),
    ).toBe('ana@inmo.co · ADMIN')
  })

  it('sin rol resuelto, al menos queda el email — nunca «user» a secas', () => {
    const s = describirActor(
      { actor_type: 'user', actor_id: 'ana@inmo.co', actor_role: null },
      t,
    )
    expect(s).toBe('ana@inmo.co')
    expect(s).not.toBe('user')
  })

  it('el agente y el sistema se nombran por lo que son, no con un slug', () => {
    expect(
      describirActor({ actor_type: 'saas_orchestrator', actor_id: null, actor_role: null }, t),
    ).toBe('agente')
    expect(describirActor({ actor_type: 'system', actor_id: null, actor_role: null }, t)).toBe(
      'sistema',
    )
  })

  it('un tipo de actor desconocido se muestra crudo, sin inventarle nombre', () => {
    // En una traza, equivocarse es peor que verse feo.
    expect(describirActor({ actor_type: 'webhook_x', actor_id: null, actor_role: null }, t)).toBe(
      'webhook_x',
    )
  })

  it('el rol no se muestra si no hay a quién atribuírselo', () => {
    // Un rol suelto sin actor sugeriría que alguien lo hizo.
    expect(
      describirActor(
        { actor_type: 'saas_orchestrator', actor_id: null, actor_role: 'OWNER' },
        t,
      ),
    ).toBe('agente')
  })
})
