/**
 * estudio-solicitud.service.test.ts — crea la ORDEN de pre-scoring de
 * afianzamiento y obtiene el link de pago hosteado.
 *
 * Pega directo al back principal (`POST /pre-scoring`) con `apiClient`, que
 * inyecta el JWT de Supabase en memoria. Ver `src/app/api/estudio/solicitud/
 * route.ts`, que se borró: era el forwarding server-side de cuando esto
 * dependía de una env de upstream sin definir.
 *
 * Corrección de arquitectura: el back ya arma la sesión de pago completa
 * (igual que el checkout de planes de agencia, `agencySubscriptionApi`) —
 * el front no calcula hash de integridad ni construye la URL de Wompi, solo
 * redirige a `paymentUrl`.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiClient, ApiError } from '@/lib/api/client'
import {
  crearOrdenPreScoring,
  PreScoringError,
  type CrearOrdenPreScoringRequest,
} from './estudio-solicitud.service'

const REQ: CrearOrdenPreScoringRequest = {
  documentNumber: '1098765432',
  phoneE164: '+573001112233',
  candidate: { names: 'María', surnames: 'Restrepo', email: 'maria@correo.com' },
  ciudad: 'Bogotá',
  canonCop: 2_000_000,
  tipoInmueble: 'apartamento',
  consent: true,
}

describe('crearOrdenPreScoring', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTea a /pre-scoring vía apiClient con el body mapeado a snake_case', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      reused: false,
      orderId: 'ord-1',
      paymentUrl: 'https://checkout.wompi.co/l/ord-1',
    })

    await crearOrdenPreScoring(REQ)

    expect(post).toHaveBeenCalledTimes(1)
    const [path, body] = post.mock.calls[0]
    expect(path).toBe('/pre-scoring')
    expect(body).toEqual({
      cedula: '1098765432',
      ciudad: 'Bogotá',
      tipo_inmueble: 'apartamento',
      canon_mensual_cop: 2_000_000,
      candidate: { names: 'María', surnames: 'Restrepo', email: 'maria@correo.com' },
      consent_granted: true,
      phoneE164: '+573001112233',
    })
  })

  it('canon_mensual_cop es requerido: siempre viaja en el body', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      reused: false,
      orderId: 'ord-1',
      paymentUrl: 'https://checkout.wompi.co/l/ord-1',
    })

    await crearOrdenPreScoring(REQ)

    const [, body] = post.mock.calls[0]
    expect(body).toHaveProperty('canon_mensual_cop', 2_000_000)
  })

  it('201 (orden nueva): devuelve reused:false con orderId/paymentUrl', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      reused: false,
      orderId: 'ord-123',
      paymentUrl: 'https://checkout.wompi.co/l/ord-123',
    })

    const r = await crearOrdenPreScoring(REQ)
    expect(r).toEqual({
      reused: false,
      orderId: 'ord-123',
      paymentUrl: 'https://checkout.wompi.co/l/ord-123',
    })
  })

  it('200 (orden reusada): devuelve reused:true con status y, si vienen, evaluationId/result', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      reused: true,
      orderId: 'ord-999',
      status: 'STUDY_STARTED',
      evaluationId: 'eval-1',
      result: { carriers: [] },
    })

    const r = await crearOrdenPreScoring(REQ)
    expect(r).toEqual({
      reused: true,
      orderId: 'ord-999',
      status: 'STUDY_STARTED',
      evaluationId: 'eval-1',
      result: { carriers: [] },
    })
  })

  it('200 reusada sin evaluationId/result: no los inventa', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({
      reused: true,
      orderId: 'ord-999',
      status: 'PENDING_PAYMENT',
    })

    const r = await crearOrdenPreScoring(REQ)
    expect(r).toEqual({ reused: true, orderId: 'ord-999', status: 'PENDING_PAYMENT' })
    expect(r).not.toHaveProperty('evaluationId')
    expect(r).not.toHaveProperty('result')
  })

  it('un 400/422 (datos inválidos) lanza PreScoringError kind validation', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(422, 'invalid'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('validation')

    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(400, 'invalid'))
    await expect(crearOrdenPreScoring(REQ)).rejects.toMatchObject({ kind: 'validation' })
  })

  it('un 401/403 (sesión vencida o sin permiso) lanza kind unauthorized', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(401, 'No autorizado'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('unauthorized')
  })

  it('un fallo de red (ApiError status 0) lanza kind network', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(0, 'offline'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('network')
  })

  it('un 5xx lanza kind unavailable', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(500, 'boom'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('unavailable')
  })

  it('una respuesta ok con forma irreconocible tampoco inventa una orden', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ ok: true })
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('unavailable')
  })

  it('reused:false con paymentUrl vacío tampoco inventa una orden', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ reused: false, orderId: 'ord-1', paymentUrl: '' })
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('unavailable')
  })
})
