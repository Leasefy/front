/**
 * Revisora r25 (C1, C2 y C4, ronda 26): la puerta de Cobranza dice el título de
 * la ruta —no «Cobranza» en las 28 sub-rutas—, las sub-pantallas tienen su
 * vuelta y las 14 pestañas quedaron en 7 con sus hermanas como segmentos.
 */
import { describe, expect, it } from 'vitest'

import { AGENT_WORKSPACES, pestanaQueContiene, pestanasYSegmentos } from './agentWorkspaceNav'
import { claveDelTituloDeLaRuta, vueltaDeLaRuta, COBRANZA_BASE as C } from './lugar-en-cobranza'

const cobranza = AGENT_WORKSPACES.find((w) => w.slug === 'cobranza')!

describe('el lugar en Cobranza', () => {
  it('la puerta dice el título de la ruta, con el mismo mapa que las migas', () => {
    expect(claveDelTituloDeLaRuta(C)).toBe('inmobiliaria.ai.nav.cobranza')
    expect(claveDelTituloDeLaRuta(`${C}/compliance/ley-2300`)).toBe('inmobiliaria.ai.cobranza.compliance.subPages.ley2300Title')
    expect(claveDelTituloDeLaRuta(`${C}/cartas`)).toBe('inmobiliaria.ai.nav.cartas')
    expect(claveDelTituloDeLaRuta(`${C}/deudores/9`)).toBe('inmobiliaria.ai.nav.cobranzaCasos')
  })

  it('las sub-pantallas sin pestaña tienen su vuelta; las pestañas y las fichas no la duplican', () => {
    expect(vueltaDeLaRuta(`${C}/compliance/audit`)).toEqual({ href: `${C}/compliance`, label: 'Cumplimiento' })
    expect(vueltaDeLaRuta(`${C}/reporte/thresholds`)?.href).toBe(`${C}/reporte`)
    expect(vueltaDeLaRuta(`${C}/analitica`)?.href).toBe(C)
    expect(vueltaDeLaRuta(`${C}/cartas`)).toBeNull()
    expect(vueltaDeLaRuta(`${C}/deudores/9`)).toBeNull()
  })

  it('siete pestañas, y todo lo de antes sigue alcanzable desde la barra', () => {
    expect(cobranza.items).toHaveLength(7)
    const hrefs = pestanasYSegmentos(cobranza).map((i) => i.href)
    for (const r of ['deudores', 'acuerdos', 'disputas', 'pagos', 'fallidos', 'llamadas', 'cartas', 'recordatorios', 'siniestros', 'reportes-propietarios', 'compliance', 'arco', 'configuracion']) {
      expect(hrefs, r).toContain(`${C}/${r}`)
    }
  })

  it('la pestaña agrupada queda activa en sus hermanas y en sus fichas', () => {
    const contactos = cobranza.items.find((i) => i.labelKey.endsWith('cobranzaGrupoContactos'))!
    expect(pestanaQueContiene(contactos, `${C}/cartas`)).toBe(true)
    expect(pestanaQueContiene(contactos, `${C}/llamadas/abc`)).toBe(true)
    expect(pestanaQueContiene(contactos, `${C}/pagos`)).toBe(false)
  })
})
