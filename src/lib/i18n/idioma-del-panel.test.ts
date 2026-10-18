import { afterEach, describe, expect, it } from 'vitest'

import { agentAuthHeaders } from '@/lib/api/agent-auth'
import { cabeceraDelIdiomaDelPanel, CLAVE_DEL_IDIOMA_DEL_PANEL, idiomaDelPanelAhora } from './idioma-del-panel'

/**
 * Nico (16-10-2026): con el panel en inglés, el back y el micro contestan en
 * inglés. Cada llamada dice el idioma del panel con `Accept-Language`: exacto
 * `en` o `es-CO` (el micro sólo toma inglés con `en` exacto).
 */
describe('el idioma del panel en las llamadas', () => {
  afterEach(() => window.localStorage.removeItem(CLAVE_DEL_IDIOMA_DEL_PANEL))

  it('sin elegir nada, español', () => {
    expect(idiomaDelPanelAhora()).toBe('es')
    expect(cabeceraDelIdiomaDelPanel()).toBe('es-CO')
  })

  it('con el panel en inglés, `en` exacto', () => {
    window.localStorage.setItem(CLAVE_DEL_IDIOMA_DEL_PANEL, 'en')
    expect(cabeceraDelIdiomaDelPanel()).toBe('en')
  })

  it('cualquier otra cosa guardada es español', () => {
    window.localStorage.setItem(CLAVE_DEL_IDIOMA_DEL_PANEL, 'fr')
    expect(cabeceraDelIdiomaDelPanel()).toBe('es-CO')
  })

  it('las llamadas al micro llevan el idioma, sin pisar uno que ya venga', () => {
    window.localStorage.setItem(CLAVE_DEL_IDIOMA_DEL_PANEL, 'en')
    expect(agentAuthHeaders().get('Accept-Language')).toBe('en')
    expect(agentAuthHeaders({ 'Accept-Language': 'es-CO' }).get('Accept-Language')).toBe('es-CO')
  })
})
