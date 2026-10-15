/**
 * fuente-a-ruta.test.ts — el drill-down de Naira (13-01, Tarea 4; FG13-6).
 *
 * Qué prueba: los dos mapas son EXACTAMENTE las tablas de UI-SPEC §6.2 y RESEARCH T5 (las 14 métricas del catálogo y
 * las 24 fuentes del registro del agente, medidas); toda ruta no nula tiene `page.tsx`; nada se arma con un string del
 * agente (un id hostil da null); y la tabla de miembros jamás se enlaza (B-5). Marcador [N13:*] en el TÍTULO.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FUENTES_DEL_REGISTRO,
  METRICAS_DEL_CATALOGO,
  RUTA_DE_LA_METRICA,
  RUTA_POR_FUENTE,
  rutaDeLaFuente,
  rutaDeLaMetrica,
} from './fuente-a-ruta'

const APP = join(process.cwd(), 'src/app/panel/inmobiliaria')
const PANEL = '/panel/inmobiliaria'

/** Copiado del molde de src/lib/nav/arquitectura-del-panel.test.ts (baja también por route groups). */
function tienePagina(href: string): boolean {
  const segmentos = href.replace(PANEL, '').split('/').filter(Boolean)
  const buscar = (dir: string, i: number): boolean => {
    if (i === segmentos.length) return existsSync(join(dir, 'page.tsx'))
    if (!existsSync(dir)) return false
    const candidatos = [join(dir, segmentos[i]!)]
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() && e.name.startsWith('(') && e.name.endsWith(')')) candidatos.push(join(dir, e.name, segmentos[i]!))
    }
    return candidatos.some((c) => buscar(c, i + 1))
  }
  return buscar(APP, 0)
}

const P = '/panel/inmobiliaria'

describe('RUTA_DE_LA_METRICA y RUTA_POR_FUENTE', () => {
  it('[N13:metricas-del-catalogo] las 14 métricas del catálogo y la tabla de UI-SPEC §6.2', () => {
    expect([...METRICAS_DEL_CATALOGO]).toEqual([
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
    ])
    expect(RUTA_DE_LA_METRICA).toEqual({
      'cartera.morosidad_rate': P + '/pagos/cartera',
      'cartera.mora_exposure_cop': P + '/pagos/cartera',
      'cartera.recovered_cop_30d': P + '/pagos/recaudo',
      'cartera.promise_kept_rate_7d': P + '/pagos/cobranza/acuerdos',
      'cartera.promises_open_count': P + '/pagos/cobranza/acuerdos',
      'cartera.payment_plan_default_rate_90d': P + '/pagos/cobranza/acuerdos',
      'cartera.escalations_open_count': P + '/pagos/cobranza',
      'sla.escalacion_vencida_count': P + '/pagos/cobranza',
      'cartera.disputes_open_count': P + '/pagos/cobranza/disputas',
      'portafolio.available_units_count': P + '/inmuebles',
      'portafolio.vacancy_rate': P + '/inmuebles',
      'portafolio.rent_roll_cop': P + '/inmuebles',
      'portafolio.days_on_market_p50': P + '/inmuebles',
      'prospectos.leads_sin_contacto_count': P + '/pipeline',
    })
  })

  it('[N13:fuentes-del-registro] las 24 fuentes del registro y la tabla de RESEARCH T5 (el resto sin enlace)', () => {
    expect(FUENTES_DEL_REGISTRO.length).toBe(24)
    expect(new Set(FUENTES_DEL_REGISTRO).size).toBe(24)
    const conEnlace: Record<string, string> = {
      'public.consignaciones': P + '/inmuebles',
      'agent.debtors': P + '/pagos/cobranza/deudores',
      'agent.debtor_states': P + '/pagos/cobranza/deudores',
      'agent.payments': P + '/pagos/cobranza/pagos',
      'agent.payment_promises': P + '/pagos/cobranza/acuerdos',
      'agent.payment_plans': P + '/pagos/cobranza/acuerdos',
      'agent.escalations': P + '/pagos/cobranza/escalaciones',
      'agent.disputes': P + '/pagos/cobranza/disputas',
      'agent.recovery_outcomes': P + '/pagos/cobranza',
      'agent.prospect_leads': P + '/pipeline',
    }
    const esperado: Record<string, string | null> = {}
    for (const f of FUENTES_DEL_REGISTRO) esperado[f] = conEnlace[f] ?? null
    expect(RUTA_POR_FUENTE).toEqual(esperado)
    expect(Object.values(RUTA_POR_FUENTE).filter((r) => r === null).length).toBe(14)
  })

  it('[N13:ruta-con-pagina] toda ruta no nula está bajo el panel, sin segmento ai ni barra final, y tiene page.tsx', () => {
    const rutas = [...Object.values(RUTA_DE_LA_METRICA), ...Object.values(RUTA_POR_FUENTE)].filter((r): r is string => r !== null)
    expect(rutas.length).toBeGreaterThan(20)
    for (const ruta of rutas) {
      expect(ruta.startsWith(PANEL + '/'), ruta).toBe(true)
      expect(ruta.endsWith('/'), ruta).toBe(false)
      expect(ruta.split('/').includes('ai'), ruta).toBe(false)
      expect(tienePagina(ruta), ruta).toBe(true)
    }
  })

  it('[N13:sin-href-del-agente] un id desconocido u hostil da null, y el código no arma rutas', () => {
    const hostiles = [
      'constructor',
      'toString',
      '__proto__',
      'hasOwnProperty',
      'valueOf',
      '/panel/inmobiliaria/pagos',
      'javascript:alert(1)',
      'https://evil.test',
      '',
      'cartera.morosidad_rate/../x',
    ]
    for (const h of hostiles) {
      expect(rutaDeLaMetrica(h), h).toBeNull()
      expect(rutaDeLaFuente(h), h).toBeNull()
    }
    const codigo = readFileSync(join(process.cwd(), 'src/lib/naira/fuente-a-ruta.ts'), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n')
    expect(codigo).not.toContain('`')
    expect(codigo).not.toMatch(/['"]\s*\+|\+\s*['"]/)
  })

  it('[N13:miembros-sin-enlace] la tabla de miembros del equipo no tiene ruta y ninguna ruta va a configuración o a personas', () => {
    expect(rutaDeLaFuente('agent.agency_members')).toBeNull()
    const rutas = [...Object.values(RUTA_DE_LA_METRICA), ...Object.values(RUTA_POR_FUENTE)].filter((r): r is string => r !== null)
    for (const ruta of rutas) {
      for (const prohibida of ['configuracion', 'equipo', 'miembro']) expect(ruta.includes(prohibida), ruta).toBe(false)
    }
  })

  it('[N13:control-positivo] una métrica y una fuente conocidas sí tienen su ruta', () => {
    expect(rutaDeLaMetrica('cartera.morosidad_rate')).toBe('/panel/inmobiliaria/pagos/cartera')
    expect(rutaDeLaFuente('agent.debtors')).toBe('/panel/inmobiliaria/pagos/cobranza/deudores')
  })
})
