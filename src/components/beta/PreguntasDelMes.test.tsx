/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ver = vi.fn()
let rol = 'ADMIN'
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ agency: { id: 'ag-1' }, agencyRole: rol }) }))
vi.mock('@/lib/api/recargas-de-preguntas.service', async (original) => {
  const real = await original<typeof import('@/lib/api/recargas-de-preguntas.service')>()
  return { ...real, verBolsaDePreguntas: (...a: unknown[]) => ver(...a) }
})

import { PreguntasDelMes } from './PreguntasDelMes'
import { mensajeDeFalloDelChat } from '@/lib/hooks/useBetaChat'
import { ApiError } from '@/lib/api/client'

let raiz: Root | null = null
let caja: HTMLDivElement | null = null
async function montar(el: React.ReactElement) {
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
  await act(async () => {
    raiz!.render(el)
  })
  for (let i = 0; i < 5; i++) await act(async () => {})
  return caja
}
function desmontar() {
  act(() => raiz?.unmount())
  caja?.remove()
  raiz = null
  caja = null
}
const porId = (id: string) => document.querySelector(`[data-testid="${id}"]`)

const bolsa = (o: Record<string, unknown>) => ({ prendida: true, usadas: 10, incluidas: 50, recargas: 0, disponibles: 40, porcentaje: 20, agotada: false, aviso: null, ...o })

describe('PreguntasDelMes', () => {
  beforeEach(() => {
    ver.mockReset()
    rol = 'ADMIN'
  })
  afterEach(desmontar)

  it('con el freno apagado no muestra nada', async () => {
    ver.mockResolvedValue(bolsa({ prendida: false }))
    const c = await montar(<PreguntasDelMes />)
    expect(ver).toHaveBeenCalledWith('ag-1')
    expect(c.innerHTML).toBe('')
  })

  it('prendido: «Llevan 10 de 50 preguntas este mes», sin recargar todavía', async () => {
    ver.mockResolvedValue(bolsa({}))
    await montar(<PreguntasDelMes />)
    expect(porId('preguntas-del-mes')?.textContent).toBe('Llevan 10 de 50 preguntas este mes')
    expect(porId('recargar-preguntas')).toBeNull()
  })

  it('al 80 %: el administrador ve «Recargar»; los demás, a quién pedírselo', async () => {
    ver.mockResolvedValue(bolsa({ usadas: 42, recargas: 0, aviso: 80, porcentaje: 84 }))
    await montar(<PreguntasDelMes />)
    expect(porId('recargar-preguntas')?.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade?seccion=preguntas')
    desmontar()
    rol = 'AGENTE'
    await montar(<PreguntasDelMes />)
    expect(porId('preguntas-del-mes')?.textContent).toContain('pídele a tu administrador que recargue')
  })

  it('agotada: lo dice y suma las recargas al total', async () => {
    ver.mockResolvedValue(bolsa({ usadas: 250, recargas: 200, agotada: true, aviso: 100, porcentaje: 100 }))
    await montar(<PreguntasDelMes />)
    expect(porId('preguntas-del-mes')?.textContent).toContain('Se acabaron las preguntas de este mes')
  })

  it('la cuenta gratis (5 de una vez): cuenta las que quedan y, al acabarse, ofrece recargar o abrir todo', async () => {
    ver.mockResolvedValue(bolsa({ periodo: 'siempre', usadas: 3, incluidas: 5, disponibles: 2, porcentaje: 60 }))
    await montar(<PreguntasDelMes />)
    expect(porId('preguntas-del-mes')?.textContent).toBe('Te quedan 2 de tus 5 preguntas gratis')
    desmontar()
    ver.mockResolvedValue(bolsa({ periodo: 'siempre', usadas: 4, incluidas: 5, disponibles: 1, porcentaje: 80, aviso: 80 }))
    await montar(<PreguntasDelMes />)
    expect(porId('preguntas-del-mes')?.textContent).toContain('Te queda 1 de tus 5 preguntas gratis')
    expect(porId('recargar-preguntas')?.textContent).toBe('Recargar o abrir todo')
    desmontar()
    ver.mockResolvedValue(bolsa({ periodo: 'siempre', usadas: 5, incluidas: 5, disponibles: 0, porcentaje: 100, aviso: 100, agotada: true }))
    await montar(<PreguntasDelMes />)
    expect(porId('preguntas-del-mes')?.textContent).toContain('Se acabaron tus preguntas gratis')
  })

  it('la cuenta gratis agotada: la burbuja habla de las 5 gratis y de abrir todo', () => {
    const texto = mensajeDeFalloDelChat(
      new ApiError(402, 'x', 'BOLSA_DE_PREGUNTAS_AGOTADA', { code: 'BOLSA_DE_PREGUNTAS_AGOTADA', bolsa: { periodo: 'siempre', incluidas: 5 } } as never),
    )
    expect(texto).toContain('Ya usaste las 5 preguntas gratis del chat')
    expect(texto).toContain('abrir todo Leasefy')
  })

  it('el chat dice qué hacer con la bolsa agotada (402 del micro)', () => {
    const texto = mensajeDeFalloDelChat(new ApiError(402, 'x', 'BOLSA_DE_PREGUNTAS_AGOTADA'))
    expect(texto).toContain('ya usó las preguntas al chat de este mes')
    expect(texto).toContain('lo demás de Leasefy sigue funcionando')
  })
})
