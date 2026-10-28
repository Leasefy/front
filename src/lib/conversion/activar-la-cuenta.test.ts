import { describe, expect, it } from 'vitest'

import { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import { ActivacionSinSesionError, activarLaCuenta, type DatosParaActivar, type Dependencias } from './activar-la-cuenta'

const DATOS: DatosParaActivar = {
  nombre: 'Laura',
  apellido: 'Gómez',
  razonSocial: 'Laura Gómez',
  nit: '900123456-8',
  representante: 'Laura Gómez',
  documentoDelRepresentante: '900123456',
  celular: '3001234567',
  correo: 'laura@correo.co',
  direccion: 'Carrera 43A # 1-50',
  ciudad: 'Medellín',
  departamento: 'Antioquia',
}

function dobles(desdeElPaso = 'agency', sesion: string | null = 's1') {
  const llamadas: string[] = []
  const cuerpos: Record<string, unknown> = {}
  const anotar = (paso: string) => (_id: string, cuerpo?: unknown) => {
    llamadas.push(paso)
    cuerpos[paso] = cuerpo
    return Promise.resolve({} as never)
  }
  const deps: Dependencias = {
    alta: (c) => {
      llamadas.push('alta')
      cuerpos.alta = c
      return Promise.resolve({ agentSessionId: sesion, tenantId: 'a1' })
    },
    retomar: () => Promise.resolve({ sessionId: 's1', currentStep: desdeElPaso, nextStep: null, draft: {} } as never),
    agencia: anotar('agency'),
    miembros: anotar('members'),
    pasarela: anotar('payment_provider'),
    politica: anotar('policy'),
    terminos: (id: string) => anotar('habeas_data')(id),
  }
  return { deps, llamadas, cuerpos }
}

describe('activar la cuenta del marketplace (lo mismo que el asistente, sin sus pantallas)', () => {
  it('el back con la razón social y el NIT, y el asistente del micro de punta a punta, en orden', async () => {
    const { deps, llamadas, cuerpos } = dobles('start')
    await activarLaCuenta(DATOS, deps)
    expect(llamadas).toEqual(['alta', 'agency', 'members', 'payment_provider', 'policy', 'habeas_data'])
    expect(cuerpos.alta).toMatchObject({ userType: 'INMOBILIARIA', agency: { name: 'Laura Gómez', nit: '900123456-8', legalRepresentative: 'Laura Gómez' } })
    expect(cuerpos.agency).toMatchObject({
      legalName: 'Laura Gómez',
      nit: '900123456-8',
      address: { calle: 'Carrera 43A # 1-50', ciudad: 'Medellín', departamento: 'Antioquia' },
      primaryContactPhone: '3001234567',
    })
    // Trabaja solo: nadie invitado; la pasarela, después.
    expect(cuerpos.members).toEqual({ members: [] })
    expect(cuerpos.payment_provider).toEqual({ skip: true })
  })

  it('retoma donde quedó la sesión (un corte a la mitad no obliga a empezar de cero)', async () => {
    const { deps, llamadas } = dobles('policy')
    await activarLaCuenta(DATOS, deps)
    expect(llamadas).toEqual(['alta', 'policy', 'habeas_data'])
  })

  it('ya activa (complete): sólo confirma con el back', async () => {
    const { deps, llamadas } = dobles('complete')
    await activarLaCuenta(DATOS, deps)
    expect(llamadas).toEqual(['alta'])
  })

  it('si el micro dice que va en otro paso (409), sigue desde ése', async () => {
    const { deps, llamadas } = dobles('agency')
    let primera = true
    deps.agencia = () => {
      llamadas.push('agency?')
      if (primera) {
        primera = false
        return Promise.reject(new OnboardingSessionError('conflict', 409, 'otro paso', { error: 'step', requiredStep: 'habeas_data' }))
      }
      return Promise.resolve({} as never)
    }
    await activarLaCuenta(DATOS, deps)
    expect(llamadas).toEqual(['alta', 'agency?', 'habeas_data'])
  })

  it('sin sesión del micro: lo dice y no sigue (se puede reintentar)', async () => {
    const { deps, llamadas } = dobles('agency', null)
    await expect(activarLaCuenta(DATOS, deps)).rejects.toBeInstanceOf(ActivacionSinSesionError)
    expect(llamadas).toEqual(['alta'])
  })
})
