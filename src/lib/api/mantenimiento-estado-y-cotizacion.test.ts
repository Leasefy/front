/**
 * El cable de mantenimientos: mover de estado y cotizar.
 *
 * 🔴 LA CAUSA RAÍZ DEL BUG DEL ARRASTRE, del lado del cliente. `changeStatus`
 * era un `switch` sobre tres endpoints (`approve`, `complete`, `cancel`) cuyo
 * `default` decía:
 *
 *     throw new Error(`Unsupported maintenance status transition: ${status}`)
 *
 * O sea que `reported`, `quoted` e `in_progress` —tres de las cinco columnas
 * del tablero— no se podían escribir por ningún camino. Estas pruebas fijan que
 * TODA transición sale por `PUT :id/status` con el estado en el vocabulario del
 * back, que es lo único que el `@IsEnum` del DTO acepta.
 *
 * Y `addQuote`, que no existía: el endpoint estaba en el back desde el primer
 * día y ningún cliente lo llamaba.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

const putMock = vi.fn()
const postMock = vi.fn()

vi.mock('./client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./client')>()
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      put: (...a: unknown[]) => putMock(...a),
      post: (...a: unknown[]) => postMock(...a),
    },
  }
})

const { mantenimientoApi } = await import('./inmobiliaria.service')

afterEach(() => vi.clearAllMocks())

const RUTA = '/inmobiliaria/mantenimiento/sol-1/status'

describe('mantenimientoApi.changeStatus — el destino del arrastre', () => {
  it.each([
    ['reported', 'REPORTED'],
    ['quoted', 'QUOTED'],
    ['approved', 'MAINT_APPROVED'],
    ['in_progress', 'IN_PROGRESS'],
    ['completed', 'MAINT_COMPLETED'],
    ['cancelled', 'MAINT_CANCELLED'],
  ])('%s sale por PUT :id/status como %s', async (front, back) => {
    putMock.mockResolvedValue({ id: 'sol-1', status: back, quotes: [] })

    await mantenimientoApi.changeStatus('sol-1', front)

    expect(putMock).toHaveBeenCalledTimes(1)
    expect(putMock).toHaveBeenCalledWith(RUTA, { status: back })
  })

  it.each(['reported', 'quoted', 'in_progress'])(
    '%s ya no revienta con «Unsupported maintenance status transition»',
    async (estado) => {
      putMock.mockResolvedValue({ id: 'sol-1', status: 'QUOTED', quotes: [] })
      await expect(mantenimientoApi.changeStatus('sol-1', estado)).resolves.toBeDefined()
    },
  )

  it('la respuesta vuelve traducida al vocabulario de la pantalla', async () => {
    putMock.mockResolvedValue({
      id: 'sol-1',
      status: 'MAINT_APPROVED',
      type: 'PLUMBING',
      priority: 'HIGH',
      paidBy: 'TENANT_PAYS',
      quotes: [],
    })

    const salida = await mantenimientoApi.changeStatus('sol-1', 'approved')

    expect(salida.status).toBe('approved')
    expect(salida.type).toBe('plumbing')
    expect(salida.priority).toBe('high')
    expect(salida.paidBy).toBe('tenant')
  })

  it('`updateStatus` es el mismo camino (lo usa el cajón del detalle)', async () => {
    putMock.mockResolvedValue({ id: 'sol-1', status: 'MAINT_CANCELLED', quotes: [] })

    await mantenimientoApi.updateStatus('sol-1', 'cancelled')

    expect(putMock).toHaveBeenCalledWith(RUTA, { status: 'MAINT_CANCELLED' })
  })

  it('un rechazo del back sube tal cual, con su motivo', async () => {
    putMock.mockRejectedValue(
      new Error('Desde Reportada sólo puede pasar a Cotizada o Cancelada.'),
    )

    await expect(mantenimientoApi.changeStatus('sol-1', 'completed')).rejects.toThrow(
      'Desde Reportada sólo puede pasar a Cotizada o Cancelada.',
    )
  })
})

describe('mantenimientoApi.addQuote — cotizar una solicitud ya creada', () => {
  const cotizacion = {
    providerName: 'Plomería El Rayo',
    providerPhone: '3001234567',
    amount: 350_000,
    description: 'Cambio del sifón y prueba de presión',
    estimatedDays: 2,
  }

  it('pega en POST :id/quote con los cinco campos del modelo', async () => {
    postMock.mockResolvedValue({ id: 'quote-1', ...cotizacion })

    await mantenimientoApi.addQuote('sol-1', cotizacion)

    expect(postMock).toHaveBeenCalledWith(
      '/inmobiliaria/mantenimiento/sol-1/quote',
      cotizacion,
    )
  })

  it('no mete el teléfono cuando quien llama no lo manda', async () => {
    postMock.mockResolvedValue({ id: 'quote-1' })
    const { providerPhone: _sinTelefono, ...sinTelefono } = cotizacion

    await mantenimientoApi.addQuote('sol-1', sinTelefono)

    const [, cuerpo] = postMock.mock.calls[0] as [string, Record<string, unknown>]
    expect('providerPhone' in cuerpo).toBe(false)
  })

  it('un 400 del back sube con su mensaje', async () => {
    postMock.mockRejectedValue(
      new Error('No se le pueden agregar cotizaciones a una solicitud completada.'),
    )

    await expect(mantenimientoApi.addQuote('sol-1', cotizacion)).rejects.toThrow(
      'No se le pueden agregar cotizaciones a una solicitud completada.',
    )
  })
})
