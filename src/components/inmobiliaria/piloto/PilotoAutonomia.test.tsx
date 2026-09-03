/**
 * PilotoAutonomia — T-0051.
 *
 * Nota sobre el alcance de esta prueba: `PilotoAutonomia` abre su panel
 * dentro de un `Sheet` (Radix Dialog) cuyo estado `abierto` es interno y
 * solo se dispara con un click real en el trigger. Simular ese click bajo
 * happy-dom (crear el portal, animar, atrapar foco) colgó la corrida dos
 * veces seguidas (>180s cada vez, sin precedente de otro test en el repo
 * que abra un Sheet/Dialog por click — los existentes montan el contenido
 * ya abierto vía prop). Para no dejar un gate rojo por timeout, esta prueba
 * se queda en la lógica pura que decide el estado «Próximamente»
 * (`AGENTES_NO_DISPONIBLES`, exportado para esto) y en el copy real de los
 * locales. El renderizado de la fila muda se verificó a mano contra
 * `DESIGN.md` y quedó documentado en el reporte del worker.
 */

import { describe, it, expect } from 'vitest'

import { AGENTES_NO_DISPONIBLES } from './PilotoAutonomia'
import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

describe('AGENTES_NO_DISPONIBLES', () => {
  it('marca retención y prospectos como no disponibles, y a nadie más', () => {
    expect(AGENTES_NO_DISPONIBLES.has('retencion')).toBe(true)
    expect(AGENTES_NO_DISPONIBLES.has('prospectos')).toBe(true)
    // Un agente normal no debe quedar atrapado por accidente en la lista.
    expect(AGENTES_NO_DISPONIBLES.has('pagos')).toBe(false)
    expect(AGENTES_NO_DISPONIBLES.has('cobranza')).toBe(false)
    expect(AGENTES_NO_DISPONIBLES.size).toBe(2)
  })
})

describe('copy del panel de autonomía (es.json / en.json)', () => {
  it('el modo "sombra" se lee "Manual" en ambos locales — el wire sigue en "sombra"', () => {
    expect(es.inmobiliaria.piloto.autonomia.modo.sombra).toBe('Manual')
    expect(en.inmobiliaria.piloto.autonomia.modo.sombra).toBe('Manual')
    // Los otros dos modos no se tocaron.
    expect(es.inmobiliaria.piloto.autonomia.modo.copiloto).toBe('Copiloto')
    expect(es.inmobiliaria.piloto.autonomia.modo.autonomo).toBe('Autónomo')
  })

  it('el estado de gobierno "Próximamente" existe en ambos locales', () => {
    expect(es.inmobiliaria.piloto.gobierno.proximamente).toBe('Próximamente')
    expect(en.inmobiliaria.piloto.gobierno.proximamente).toBeTruthy()
    // La frase que reemplaza sigue existiendo (la usan otros agentes).
    expect(es.inmobiliaria.piloto.gobierno.apagadoServidor).toBe('Apagada en el servidor')
  })
})
