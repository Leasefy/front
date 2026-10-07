/**
 * QA-PROP-95 G-14 (04-10-2026), lo que axe marcó como crítico en Propietarios:
 * - «Con giros atrasados»: el `Chip` de Cadence ya es `role="checkbox"` con
 *   `aria-checked`; el `aria-pressed` que le ponía la tabla es un atributo que
 *   ese rol no admite (`aria-allowed-attr`).
 * - Estado de cuenta: los filtros de período y contrato no tenían nombre para
 *   un lector de pantalla (`button-name`).
 * Estático a propósito (como los guardianes de cajones y modales): montar la
 * tabla y el documento con sus datos cuesta mucho más y falla por otras cosas;
 * la medición de verdad la hizo axe en el navegador.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')

describe('G-14 · lo que axe marcó en Propietarios', () => {
  it('el chip de «Con giros atrasados» no lleva aria-pressed', () => {
    const tabla = leer('components/inmobiliaria/PropietarioTable.tsx')
    const chip = tabla.slice(tabla.indexOf('<Chip'), tabla.indexOf('</Chip>'))
    expect(chip).toContain('selected={filterPending}')
    expect(chip).not.toMatch(/aria-pressed=/)
  })

  it('los filtros de período y de contrato del estado de cuenta tienen nombre', () => {
    const filtros = leer('components/estado-de-cuenta/FiltrosDelEstado.tsx')
    for (const id of ['filtro-periodo', 'filtro-contrato']) {
      const i = filtros.indexOf(`data-testid="${id}"`)
      const trigger = filtros.slice(filtros.lastIndexOf('<SelectTrigger', i), filtros.indexOf('>', filtros.indexOf('aria-label', i) > 0 ? filtros.indexOf('aria-label', i) : i) + 1)
      expect(trigger).toMatch(/aria-label=/)
    }
  })
})
