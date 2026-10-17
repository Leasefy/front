import { describe, it, expect } from 'vitest'

import type { InboxItem } from '@/lib/api/piloto'
import { cobrosDeCobriEnLaBandeja } from './use-cobros-en-la-bandeja'

const item = (extra: Partial<InboxItem>): InboxItem => ({
  id: 'x',
  fuente: 'retenido',
  agente: 'pagos',
  prioridad: 'media',
  titulo: 't',
  resumen: 'r',
  desde: '2026-10-16T16:33:00-05:00',
  href: '/panel/inmobiliaria/piloto',
  ...extra,
})

describe('cobrosDeCobriEnLaBandeja (COBRI-4)', () => {
  it('sólo los cobros de Cobri retenidos: por cuota el caso que la espera, y el total con o sin cuota', () => {
    const r = cobrosDeCobriEnLaBandeja([
      item({ id: 'hold:1', cuotaId: 'c-1' }),
      item({ id: 'hold:2' }), // un cobro sin cuota (micro viejo): cuenta, no marca fila
      item({ id: 'hold:3', agente: 'cobranza', cuotaId: 'c-9' }), // una llamada de Mori
      item({ id: 'acc:4', fuente: 'acciones_del_piloto', cuotaId: 'c-8' }),
    ])
    expect(r.total).toBe(2)
    expect(r.ids).toEqual(['hold:1', 'hold:2'])
    expect([...r.porCuota]).toEqual([['c-1', 'hold:1']])
  })

  it('una Bandeja vacía no afirma nada', () => {
    expect(cobrosDeCobriEnLaBandeja([])).toEqual({ porCuota: new Map(), ids: [], total: 0 })
  })
})
