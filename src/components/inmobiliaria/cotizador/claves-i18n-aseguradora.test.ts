import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

/*
 * `t()` devuelve la CLAVE cuando falta la traducción. El detalle de una
 * aseguradora y su cumplimiento se pintaban con 43 claves crudas
 * («inmobiliaria.ai.cotizador.aseguradoras.carrier.kpis.latencyP95») como
 * títulos. Esta prueba lee cada `t('…')` de esas pantallas y exige que la
 * clave exista, como texto, en los dos idiomas.
 */
const ARCHIVOS = [
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/aseguradoras/[carrier]/page.tsx',
  'src/app/panel/inmobiliaria/postulaciones/asegurabilidad/aseguradoras/[carrier]/sla/page.tsx',
  'src/components/inmobiliaria/cotizador/CarrierApprovalByCanonChart.tsx',
  'src/components/inmobiliaria/cotizador/CarrierDeepDiveKpiStrip.tsx',
  'src/components/inmobiliaria/cotizador/CarrierErrorRateChart.tsx',
  'src/components/inmobiliaria/cotizador/CarrierLatencySparkline.tsx',
  'src/components/inmobiliaria/cotizador/CarrierRecentQuotesTable.tsx',
  'src/components/inmobiliaria/cotizador/CarrierSlaBreachWindows.tsx',
  'src/components/inmobiliaria/cotizador/CarrierSlaStateCard.tsx',
]

function valor(dic: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>((n, p) => (n && typeof n === 'object' ? (n as Record<string, unknown>)[p] : undefined), dic)
}

describe('claves i18n del detalle de una aseguradora', () => {
  for (const archivo of ARCHIVOS) {
    it(`${archivo.split('/').slice(-2).join('/')} no deja ninguna clave cruda`, () => {
      const fuente = readFileSync(join(process.cwd(), archivo), 'utf8')
      const claves = [...fuente.matchAll(/\bt\(\s*'([^']+)'/g)].map((m) => m[1])
      expect(claves.length).toBeGreaterThan(0)
      const faltan = claves.flatMap((c) => [
        ...(typeof valor(es, c) === 'string' ? [] : [`es:${c}`]),
        ...(typeof valor(en, c) === 'string' ? [] : [`en:${c}`]),
      ])
      expect(faltan).toEqual([])
    })
  }
})
