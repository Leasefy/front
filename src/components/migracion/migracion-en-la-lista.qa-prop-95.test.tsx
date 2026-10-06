/**
 * QA-PROP-95 A-62 (04-10-2026): el vacío de Propietarios (y de Inquilinos,
 * Contratos y Cobros) decía «103 contratos migrados todavía no están
 * completos» con 63 activados, 39 descartados y UNA fila a medias. El número
 * es lo que falta: filas sin activar + contratos activos sin inmueble o sin
 * propietario.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${JSON.stringify(p)})` : k), locale: 'es' }),
}))

import { useCopyDeMigracionEnLista } from './VeredictoDeMigracion'
import type { DeudaDeMigracion } from './muro-reglas'

let host: HTMLDivElement
let root: Root
afterEach(() => { act(() => root.unmount()); host.remove() })

function titulo(deuda: DeudaDeMigracion): string {
  let salida = ''
  function Sonda() { salida = useCopyDeMigracionEnLista()(deuda).titulo; return null }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  act(() => root.render(<Sonda />))
  return salida
}

describe('A-62 · el número del vacío por la migración', () => {
  it('el lab: 103 filas, 63 activadas, 1 a medias → «1 contrato migrado todavía no está completo»', () => {
    expect(titulo({ contratos: 103, activados: 63, pendientes: 1, sinInmueble: 0, sinPropietario: 0, sinInquilino: 1 })).toBe('migracion.enLaLista.tituloUno')
  })

  it('varios: cuenta pendientes + sin inmueble + sin propietario, nunca el total del archivo', () => {
    expect(titulo({ contratos: 91, activados: 91, pendientes: 0, sinInmueble: 89, sinPropietario: 0, sinInquilino: 0 })).toBe('migracion.enLaLista.titulo({"n":89})')
  })
})
