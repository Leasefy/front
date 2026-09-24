/**
 * `GET /agent-credits/packs` devuelve `{ packs: [{ size, priceCop, pricePerCreditCop }] }`
 * (back `AgentCreditsService.getAvailablePacks`). El servicio lo leía como
 * `AgentCreditPack[]` o `{ data }`: con la forma real quedaba `undefined` y la
 * pantalla de créditos se caía en `packs.length`.
 *
 * Y la compra va por el PSE real: `POST /agent-credits/pse/checkout` (la ruta
 * existe en el back — ver `rutas-del-back.json`), no `/agent-credits/purchase`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import rutas from '../rutas-del-back.json'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('../client', () => ({ apiClient: { get, post } }))

import { agentCreditsApi } from '../agent-credits.service'

const RUTAS: string[] = Array.isArray(rutas) ? rutas : (rutas as { rutas: string[] }).rutas

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe('agentCreditsApi', () => {
  it('traduce la forma real de los packs del back', async () => {
    get.mockResolvedValue({ packs: [{ size: 5, priceCop: 189000, pricePerCreditCop: 37800 }] })
    await expect(agentCreditsApi.getPacks()).resolves.toEqual([{ packSize: 5, price: 189000 }])
  })

  it('compra por POST /agent-credits/pse/checkout, que el back sí expone', async () => {
    post.mockResolvedValue({ asyncPaymentUrl: 'https://banco.example' })
    await agentCreditsApi.startPseCheckout({
      packSize: 5,
      userType: 'NATURAL',
      legalIdType: 'CC',
      legalId: '1020304050',
      financialInstitutionCode: '1007',
      email: 'a@b.co',
      fullName: 'Ana',
    })
    expect(post.mock.calls[0][0]).toBe('/agent-credits/pse/checkout')
    expect(RUTAS).toContain('POST /agent-credits/pse/checkout')
    expect(RUTAS).not.toContain('POST /agent-credits/purchase')
  })
})
