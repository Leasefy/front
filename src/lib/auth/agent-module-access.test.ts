/**
 * agent-module-access.test.ts — the per-module posture for agent-service
 * permissions. The load-bearing cases are the estudio/matching/avaluos
 * fallback: ABSENT key → ALLOWED (so the front gate merges in any order with
 * the agent-repo pair PR), PRESENT without the action → DENIED.
 */

import { describe, it, expect } from 'vitest'
import {
  isAgentModule,
  resolveAgentModuleAccess,
  type AgentModulePermissions,
} from './agent-module-access'

const BASE: AgentModulePermissions = {
  cobranza: ['view'],
  cotizador: [],
}

describe('isAgentModule', () => {
  it('recognizes the five agent modules', () => {
    expect(isAgentModule('cobranza')).toBe(true)
    expect(isAgentModule('cotizador')).toBe(true)
    expect(isAgentModule('estudio')).toBe(true)
    expect(isAgentModule('matching')).toBe(true)
    expect(isAgentModule('avaluos')).toBe(true)
  })

  it('rejects monolith modules (resolved via effectivePermissions instead)', () => {
    expect(isAgentModule('dispersiones')).toBe(false)
    expect(isAgentModule('analytics')).toBe(false)
    expect(isAgentModule('')).toBe(false)
  })
})

describe('estudio/matching/avaluos — ABSENT-module = ALLOWED fallback', () => {
  it('allows when the key is absent from the payload (older agent build)', () => {
    expect(resolveAgentModuleAccess(BASE, 'estudio', 'view')).toBe(true)
    expect(resolveAgentModuleAccess(BASE, 'matching', 'view')).toBe(true)
    expect(resolveAgentModuleAccess(BASE, 'avaluos', 'view')).toBe(true)
  })

  it('allows when the whole agent payload is null (fetch failed / no agent URL)', () => {
    expect(resolveAgentModuleAccess(null, 'estudio', 'view')).toBe(true)
    expect(resolveAgentModuleAccess(null, 'matching', 'view')).toBe(true)
    expect(resolveAgentModuleAccess(null, 'avaluos', 'view')).toBe(true)
  })

  it('denies when the key is present WITHOUT the action', () => {
    const perms: AgentModulePermissions = {
      ...BASE,
      estudio: [],
      matching: ['execute'],
      avaluos: [],
    }
    expect(resolveAgentModuleAccess(perms, 'estudio', 'view')).toBe(false)
    expect(resolveAgentModuleAccess(perms, 'matching', 'view')).toBe(false)
    expect(resolveAgentModuleAccess(perms, 'avaluos', 'view')).toBe(false)
  })

  it('allows when the key is present WITH the action', () => {
    const perms: AgentModulePermissions = {
      ...BASE,
      estudio: ['view'],
      matching: ['view', 'execute'],
      avaluos: ['view'],
    }
    expect(resolveAgentModuleAccess(perms, 'estudio', 'view')).toBe(true)
    expect(resolveAgentModuleAccess(perms, 'matching', 'view')).toBe(true)
    expect(resolveAgentModuleAccess(perms, 'matching', 'execute')).toBe(true)
    expect(resolveAgentModuleAccess(perms, 'avaluos', 'view')).toBe(true)
  })
})

describe('cobranza/cotizador — FAIL CLOSED (pre-existing, unchanged)', () => {
  it('denies when the whole agent payload is null', () => {
    expect(resolveAgentModuleAccess(null, 'cobranza', 'view')).toBe(false)
    expect(resolveAgentModuleAccess(null, 'cotizador', 'view')).toBe(false)
  })

  it('denies when the action is not granted', () => {
    expect(resolveAgentModuleAccess(BASE, 'cotizador', 'view')).toBe(false)
    expect(resolveAgentModuleAccess(BASE, 'cobranza', 'execute')).toBe(false)
  })

  it('allows when the action is granted', () => {
    expect(resolveAgentModuleAccess(BASE, 'cobranza', 'view')).toBe(true)
  })
})
