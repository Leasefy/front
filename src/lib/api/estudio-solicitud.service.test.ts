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

  it('un 401 (sesión vencida) lanza kind unauthorized', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(401, 'No autorizado'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('unauthorized')
    expect(err.message).toMatch(/sesión expiró/)
  })

  it('un fallo de red (ApiError status 0) lanza kind network', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(0, 'offline'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('network')
  })
  it('una respuesta ok con forma irreconocible tampoco inventa una orden (es nuestro, no «el servicio»)', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ ok: true })
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('ours')
    expect(err.message).toMatch(/de nuestro lado/)
    expect(err.message).not.toMatch(/no está disponible/)
  })

  it('reused:false con paymentUrl vacío tampoco inventa una orden', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ reused: false, orderId: 'ord-1', paymentUrl: '' })
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('ours')
  })
})

/**
 * 🔴 02-10-2026 · Sistema de errores. Antes: un 400 decía «Revisa los datos
 * ingresados» sin decir cuál; un 409 y un 5xx decían «El servicio no está
 * disponible». Ahora cada fallo dice lo que es, con la regla de oro.
 */
describe('crearOrdenPreScoring — errores con la regla de oro (02-10-2026)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const CANON = 'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.'
  const CIUDAD = 'La ciudad puede tener hasta 100 caracteres.'

  it('🔴 un 400 DATOS_INVALIDOS lleva cada problema a SU campo del formulario (snake_case → campo)', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiError(400, [CANON, CIUDAD], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [CANON, CIUDAD],
        campos: [
          { campo: 'canon_mensual_cop', regla: 'maximo', mensaje: CANON },
          { campo: 'ciudad', regla: 'largo', mensaje: CIUDAD },
          { campo: 'candidate.email', regla: 'formato', mensaje: 'El correo no es válido.' },
        ],
      }),
    )
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err).toBeInstanceOf(PreScoringError)
    expect(err.kind).toBe('validation')
    expect(err.porCampo).toEqual({ canon: CANON, ciudad: CIUDAD, email: 'El correo no es válido.' })
    expect(err.message).not.toMatch(/Revisa los datos ingresados/)
  })

  it('un 400 sin campos dice lo que mandó el back, no un genérico', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiError(400, 'cedula debe tener entre 6 y 10 dígitos numéricos', 'DATOS_INVALIDOS'),
    )
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err.kind).toBe('validation')
    expect(err.message).toBe('cedula debe tener entre 6 y 10 dígitos numéricos')
  })

  it('🔴 un 409 dice lo que choca (el mensaje del back), no «el servicio no está disponible»', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiError(409, 'Ya tienes un estudio en proceso. Te avisamos cuando esté listo.', 'ESTUDIO_EN_CURSO'),
    )
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err.kind).toBe('conflict')
    expect(err.message).toBe('Ya tienes un estudio en proceso. Te avisamos cuando esté listo.')
    expect(err.message).not.toMatch(/no está disponible/)
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, sin «conexión» ni «servicio no disponible»', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err.kind).toBe('ours')
    expect(err.message).toMatch(/^No pudimos crear tu estudio: algo falló de nuestro lado/)
    expect(err.message).toContain('ab12cd34')
    expect(err.message).not.toMatch(/conexi[oó]n|no está disponible/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    const err = await crearOrdenPreScoring(REQ).catch((e) => e)
    expect(err.kind).toBe('network')
    expect(err.message).toMatch(/conexión/)
  })
})
