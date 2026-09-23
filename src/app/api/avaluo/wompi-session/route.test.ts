/**
 * La firma de integridad del avalúo cubre `avaluo-<submissionId>`. Sin validar
 * el id, cualquiera sacaba una firma válida para una referencia con el texto
 * que quisiera (auditoría de seguridad 23-09).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { POST } from './route'

const orig = { s: process.env.WOMPI_INTEGRITY_SECRET, k: process.env.WOMPI_PUBLIC_KEY }

beforeEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = 'secreto_de_prueba'
  process.env.WOMPI_PUBLIC_KEY = 'pub_test_key'
})
afterEach(() => {
  process.env.WOMPI_INTEGRITY_SECRET = orig.s
  process.env.WOMPI_PUBLIC_KEY = orig.k
})

const pedir = (body: unknown) =>
  POST(new Request('http://localhost/api/avaluo/wompi-session', { method: 'POST', body: JSON.stringify(body) }))

describe('/api/avaluo/wompi-session', () => {
  it('firma la referencia de un submissionId normal', async () => {
    const res = await pedir({ submissionId: 'b3f1c2d4-0000-4000-8000-000000000001' })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reference).toBe('avaluo-b3f1c2d4-0000-4000-8000-000000000001')
    expect(JSON.stringify(json)).not.toContain('secreto_de_prueba')
  })

  it.each([['x-rent-otro-2026-09'.replace(/-/g, '/')], ['a b'], ['x#y'], [123]])(
    'no firma un submissionId con forma rara (%s)',
    async (submissionId) => {
      const res = await pedir({ submissionId })
      expect(res.status).toBe(400)
    },
  )
})
