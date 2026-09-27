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

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

import { AGENTES_NO_DISPONIBLES, claveDelEfectoPropio } from './PilotoAutonomia'
import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

/** Lee una clave con puntos de un diccionario, como `t()`. */
function leer(dic: unknown, clave: string): unknown {
  return clave.split('.').reduce<unknown>(
    (o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined),
    dic,
  )
}

/*
 * 🔴 Niti · calidad (26-09-2026, `niti-spec.md`): en los TRES modos Niti audita
 * y propone; todo cambio al inmueble espera el clic de una persona y no le
 * escribe al propietario. La frase genérica de Automático
 * (`flota.que.autonomo`) habla del horario de cobranza y de agentes que
 * «actúan sin preguntarte»: puesta debajo de Niti, prometía justo lo que Niti
 * no hace. Su fila dice lo suyo; las de los demás agentes no cambian.
 */
describe('Niti · calidad en Autonomía', () => {
  const MODOS = ['sombra', 'copiloto', 'autonomo'] as const

  it('la fila de calidad usa una frase propia por modo; los demás agentes siguen con la del micro', () => {
    for (const modo of MODOS) {
      expect(claveDelEfectoPropio('calidad', modo)).toBe(`inmobiliaria.piloto.autonomia.porAgente.calidad.${modo}`)
    }
    for (const otro of ['cobranza', 'pagos', 'conciliacion', 'retencion']) {
      expect(claveDelEfectoPropio(otro, 'autonomo')).toBeNull()
    }
    const fuente = readFileSync(join(__dirname, 'PilotoAutonomia.tsx'), 'utf8')
    expect(fuente).toContain('claveDelEfectoPropio(row.agente, row.modo)')
  })

  it('en los tres modos dice lo mismo que el código: propone, espera el clic y no le escribe al propietario', () => {
    for (const modo of MODOS) {
      const frase = leer(es, `inmobiliaria.piloto.autonomia.porAgente.calidad.${modo}`)
      expect(typeof frase).toBe('string')
      expect(frase).toMatch(/audita/)
      expect(frase).toMatch(/propone/)
      expect(frase).toMatch(/clic de una persona/)
      expect(frase).toMatch(/no le escribe al propietario/)
      // Nada del horario de cobranza ni de «actuar sin preguntarte».
      expect(frase).not.toMatch(/cobranza|8 a\. m\.|sin preguntarte/)

      const inglés = leer(en, `inmobiliaria.piloto.autonomia.porAgente.calidad.${modo}`)
      expect(typeof inglés).toBe('string')
      expect(inglés).toMatch(/owner/)
    }
    // Automático lo dice explícito: no aplica nada solo.
    expect(leer(es, 'inmobiliaria.piloto.autonomia.porAgente.calidad.autonomo')).toMatch(/no aplica nada solo/)
    // La frase genérica de los demás agentes queda como estaba.
    expect(es.inmobiliaria.piloto.flota.que.autonomo).toContain('8 a. m.–7 p. m.')
  })

  it('se llama «Niti · calidad» (y «Niti · quality» en inglés), no «Calidad de publicación»', () => {
    expect(es.inmobiliaria.ai.workspace.agente.calidad).toBe('Niti · calidad')
    expect(en.inmobiliaria.ai.workspace.agente.calidad).toBe('Niti · quality')
  })
})

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
  /*
   * 🔴 «Sombra», no «Manual» (Nico, 2026-09-12). `develop` lo había renombrado
   * a «Manual» y Nico pidió el nombre de vuelta: es el modo en que el piloto
   * mira y sugiere sin tocar nada, y «Manual» se lee como «apagado», que es
   * otra cosa. La llave del cable NO cambia — sigue siendo `sombra`, y eso es
   * lo que esta prueba cuida: que renombrar la etiqueta no arrastre el
   * contrato con el micro.
   */
  it('🔴 P-1: los modos se leen Manual / Copiloto / Automático — el wire sigue en "sombra"/"autonomo"', () => {
    // Decisión de Nico (23-09-2026): «Sombra se renombra Manual». La píldora
    // y el panel dicen lo MISMO (antes el panel decía «Autónomo» y la
    // píldora «Automático»), y «Mixto» ya no existe.
    for (const loc of [es.inmobiliaria.piloto.autonomia.modo, es.inmobiliaria.piloto.flota.modo]) {
      expect(loc.sombra).toBe('Manual')
      expect(loc.copiloto).toBe('Copiloto')
      expect(loc.autonomo).toBe('Automático')
    }
    expect(en.inmobiliaria.piloto.autonomia.modo.sombra).toBe('Manual')
    expect((es.inmobiliaria.piloto.flota.modo as Record<string, string>).mixto).toBeUndefined()
  })

  it('🔴 la píldora y el panel explican los modos con las MISMAS frases, sin prometer topes que no existen', () => {
    const que = es.inmobiliaria.piloto.flota.que
    expect(que.autonomo).not.toMatch(/tus topes/)
    expect(que.autonomo).toContain('8 a. m.–7 p. m.')
    // El panel ya no trae su propia explicación: usa estas claves.
    const fuente = readFileSync(join(__dirname, 'PilotoAutonomia.tsx'), 'utf8')
    expect(fuente).toContain('inmobiliaria.piloto.flota.que.')
    expect(fuente).not.toContain('Ejecuta lo reversible solo')
  })

  it('el estado de gobierno "Próximamente" existe en ambos locales', () => {
    expect(es.inmobiliaria.piloto.gobierno.proximamente).toBe('Próximamente')
    expect(en.inmobiliaria.piloto.gobierno.proximamente).toBeTruthy()
    // La frase que reemplaza sigue existiendo (la usan otros agentes).
    //
    // Esta aserción fijaba el literal 'Apagada en el servidor'. En mvp-v2.1.0
    // `cambios-nico-1` reescribió ese copy en es.json ('Todavía no disponible
    // en tu plan') sin tocar la clave, así que el literal quedó viejo mientras
    // el invariante que esta prueba dice cuidar —«la frase sigue existiendo»,
    // y es un estado distinto de «Próximamente»— sigue intacto. Se guarda el
    // invariante, no la redacción: los dos estados son las dos ramas del
    // ternario de PilotoAutonomia.tsx:232/235 y no pueden colapsar en uno.
    expect(es.inmobiliaria.piloto.gobierno.apagadoServidor).toBeTruthy()
    expect(en.inmobiliaria.piloto.gobierno.apagadoServidor).toBeTruthy()
    expect(es.inmobiliaria.piloto.gobierno.apagadoServidor).not.toBe(
      es.inmobiliaria.piloto.gobierno.proximamente,
    )
  })
})
