/**
 * page.test.tsx — «Por pagar a propietarios».
 *
 * 🔴 El encabezado decía que al propietario se le gira «lo recaudado a su
 * nombre». La liquidación del propietario es lo que el contrato cobra (base
 * CAUSADO) con sus deducciones (Juan Camilo, 2026-09-16), y la tabla de abajo
 * ya lo calcula así. El texto tiene que decir lo mismo que el número.
 *
 * La tabla, las pestañas y el guardia se mockean: acá sólo importa el texto.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/cartera/CarteraDePropietarios', () => ({
  CarteraDePropietarios: () => null,
}))
vi.mock('@/components/cartera/PestanasDeCartera', () => ({
  PestanasDeCartera: () => null,
}))

import CarteraPorPagarPage from './page'
import { QUE_ES_EL_CANON_CAUSADO } from '@/lib/propietarios/base-del-canon'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('Por pagar a propietarios — qué se le gira', () => {
  it('🔴 dice «canon causado» con la convención compartida, no «lo recaudado»', () => {
    act(() => root.render(<CarteraPorPagarPage />))
    const texto = container.querySelector('[data-testid="que-se-le-debe"]')?.textContent ?? ''

    expect(texto).toContain('canon causado a su nombre')
    expect(texto).toContain(QUE_ES_EL_CANON_CAUSADO)
    expect(texto).toContain('menos la comisión')
    expect(texto.toLowerCase()).not.toContain('recaudado')
  })
})
