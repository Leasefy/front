/**
 * PI-01 (PILOTO-ACTIVO, 04-10-2026) — la franja del Piloto automático de la
 * inmobiliaria en la página del Piloto. Lo que se fija:
 *   · sin activar: lo dice y, SÓLO a un administrador, ofrece «Activar la
 *     prueba de 30 días»; la confirmación dice qué va a pasar (hasta cuándo va
 *     la prueba, qué agentes empiezan a actuar solos, con qué topes, qué
 *     sigue pidiendo el clic) y pide el código de ahora (PI-23);
 *   · en prueba: «Prueba: te quedan N días» y «Apagar el Piloto» (con su
 *     confirmación, sin código);
 *   · prueba terminada / apagado por Leasefy: lo dice, sin botón de prender;
 *   · CR-31: lo que le falta a la operación, cada cosa con su enlace.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const lectura = vi.hoisted(() => ({
  data: null as unknown,
  cambiar: vi.fn(),
  refetch: vi.fn(async () => {}),
}))

vi.mock('@/lib/hooks/piloto/use-piloto-opera-sola', () => ({
  usePilotoActivo: () => ({
    data: lectura.data,
    isLoading: false,
    error: null,
    notAvailable: false,
    refetch: lectura.refetch,
    cambiando: false,
    cambiar: lectura.cambiar,
  }),
}))
vi.mock('@/lib/hooks/piloto/piloto-flota-context', () => ({
  usePilotoFlotaCompartida: () => ({ refetch: vi.fn(async () => {}) }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
const permisos = vi.hoisted(() => ({ valor: null as null | { isAdmin: boolean; agencyRole: string | null; isLoading: boolean } }))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => permisos.valor }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { PilotoActivacion, comoSeVe } from './PilotoActivacion'
import type { PilotoActivoResponse } from '@/lib/api/piloto'

const SIN_ACTIVAR: PilotoActivoResponse = {
  activo: false,
  motivo: 'sin_activar',
  maestro: true,
  activoDesde: null,
  prueba: null,
  sinVencimiento: false,
  sePuedeActivar: true,
  guardable: true,
  frase:
    'El Piloto automático no está activo en tu inmobiliaria: ningún agente actúa solo y todo te pide un clic. Un administrador lo activa aquí, con una prueba de 30 días.',
  puedeCambiarlo: true,
  diasDePrueba: 30,
  pruebaHastaSiSeActivaHoy: '2026-11-04T15:00:00.000Z',
  enAutomatico: [
    { agente: 'contratos', nombre: 'Contratos' },
    { agente: 'facturacion', nombre: 'Facturación' },
  ],
  topes: { topeMontoCop: 5_000_000, topeDestinatarios: 10, graciaSegundos: 60 },
  requisitos: [
    {
      id: 'requisito:plazo_de_pago',
      agentes: ['cobranza'],
      que: 'Tu inmobiliaria todavía no fijó sus días de plazo para pagar: sin plazo no hay mora, así que no hay cobranza.',
      como: 'Fíjalos en Configuración → Perfil (el sugerido es 5 días).',
      enlace: { href: '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo', texto: 'Fijar los días de plazo' },
    },
  ],
}

const EN_PRUEBA: PilotoActivoResponse = {
  ...SIN_ACTIVAR,
  activo: true,
  motivo: 'activo',
  activoDesde: '2026-10-05T15:00:00.000Z',
  prueba: { desde: '2026-10-05T15:00:00.000Z', hasta: '2026-11-04T15:00:00.000Z', diasRestantes: 23, terminada: false },
  pruebaHastaSiSeActivaHoy: null,
  frase: 'Prueba del Piloto: te quedan 23 días (hasta el 4 de noviembre de 2026). Al terminar vuelves a Copiloto.',
  requisitos: [],
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function pintar(data: PilotoActivoResponse) {
  lectura.data = data
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(<PilotoActivacion />))
}

const q = (sel: string) => document.querySelector(sel)
const botonCon = (texto: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as HTMLButtonElement | undefined

beforeEach(() => {
  lectura.cambiar.mockReset()
  lectura.cambiar.mockResolvedValue({ ok: true })
})
afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  document.body.innerHTML = ''
  permisos.valor = null
})

describe('PI-01: la franja del Piloto automático de la inmobiliaria', () => {
  it('sin activar: lo dice y el administrador ve «Activar la prueba de 30 días»; la confirmación dice qué va a pasar', async () => {
    pintar(SIN_ACTIVAR)
    expect(q('[data-testid="piloto-activacion-estado"]')!.textContent).toContain(
      'El Piloto automático no está activo en tu inmobiliaria',
    )
    const activar = botonCon('Activar la prueba de 30 días')
    expect(activar).toBeDefined()
    await act(async () => activar!.click())
    const dialogo = q('[data-testid="confirmar-automatico"]')!
    expect(dialogo.textContent).toContain('¿Activar el Piloto automático?')
    const queVaAPasar = q('[data-testid="piloto-activacion-que-va-a-pasar"]')!.textContent!
    expect(queVaAPasar).toContain('Empieza tu prueba de 30 días: va hasta el 4 de noviembre de 2026')
    expect(queVaAPasar).toContain('Desde ya actúan solos, a tu nombre, los agentes que tienes en Automático: Contratos y Facturación.')
    expect(queVaAPasar).toContain('5.000.000 por acción y 10 personas por envío')
    expect(queVaAPasar).toContain('te lo sigue pidiendo con un clic')
    expect(queVaAPasar).toContain('el código de tu aplicación de autenticación')
    await act(async () => botonCon('Sí, activarlo')!.click())
    expect(lectura.cambiar).toHaveBeenCalledWith(true)
  })

  it('quien no es administrador lo ve, sin botón, y sabe quién lo activa', () => {
    pintar({ ...SIN_ACTIVAR, puedeCambiarlo: false })
    expect(botonCon('Activar la prueba')).toBeUndefined()
    expect(q('[data-testid="piloto-activacion"]')!.textContent).toContain('Lo activa un administrador de tu inmobiliaria.')
  })

  it('🔴 CR-31: lo que le falta a la operación, con el enlace a Configuración → Perfil', () => {
    pintar(SIN_ACTIVAR)
    const req = q('[data-testid="piloto-activacion-requisitos"]')!
    expect(req.textContent).toContain('A tu operación le falta 1 cosa para que el Piloto trabaje')
    const enlace = q('[data-testid="piloto-requisito-plazo_de_pago"] a') as HTMLAnchorElement
    expect(enlace.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo')
    expect(enlace.textContent).toBe('Fijar los días de plazo')
  })

  it('🔴 el contador ve lo que falta pero no un enlace a Configuración → Perfil (no la puede abrir): dice quién lo hace', () => {
    permisos.valor = { isAdmin: false, agencyRole: 'CONTADOR', isLoading: false }
    pintar({ ...SIN_ACTIVAR, puedeCambiarlo: false })
    const req = q('[data-testid="piloto-requisito-plazo_de_pago"]')!
    expect(req.querySelector('a')).toBeNull()
    expect(req.textContent).toContain('Lo hace un administrador de tu inmobiliaria.')
  })

  it('en prueba: «te quedan N días», quiénes actúan solos, y apagarlo confirma sin código', async () => {
    pintar(EN_PRUEBA)
    expect(q('[data-testid="piloto-activacion-estado"]')!.textContent).toContain('Piloto automático activo · Prueba: te quedan 23 días')
    expect(q('[data-testid="piloto-activacion-frase"]')!.textContent).toContain('hasta el 4 de noviembre de 2026')
    expect(q('[data-testid="piloto-activacion-en-automatico"]')!.textContent).toBe('Actúan solos: Contratos y Facturación.')
    expect(q('[data-testid="piloto-activacion-requisitos"]')).toBeNull()
    await act(async () => botonCon('Apagar el Piloto')!.click())
    expect(q('[data-testid="piloto-activacion-apagar"]')!.textContent).toContain('tu prueba sigue corriendo hasta el 4 de noviembre de 2026')
    await act(async () => botonCon('Sí, apagarlo')!.click())
    expect(lectura.cambiar).toHaveBeenCalledWith(false)
  })

  it('prueba terminada y apagado por Leasefy: lo dicen y no ofrecen prenderlo', () => {
    expect(comoSeVe({ ...SIN_ACTIVAR, motivo: 'prueba_terminada' }).titulo).toBe('Terminó tu prueba del Piloto automático')
    expect(comoSeVe({ ...SIN_ACTIVAR, motivo: 'apagado_por_leasefy' }).titulo).toBe('Leasefy tiene apagado el Piloto automático')
    pintar({ ...SIN_ACTIVAR, motivo: 'prueba_terminada', sePuedeActivar: false, frase: 'Tu prueba de 30 días del Piloto automático terminó el 3 de noviembre de 2026.' })
    expect(botonCon('Activar')).toBeUndefined()
    expect(botonCon('Volver a encenderlo')).toBeUndefined()
  })

  it('🔴 ACT-09: contratado con Leasefy y apagado: «Encender el Piloto automático», nunca «Activar la prueba de 30 días»', () => {
    pintar({
      ...SIN_ACTIVAR,
      sinVencimiento: true,
      pruebaHastaSiSeActivaHoy: null,
      frase:
        'Tu inmobiliaria tiene contratado el Piloto automático, pero está apagado: ningún agente actúa solo y todo te pide un clic. Un administrador lo enciende aquí.',
    })
    expect(botonCon('Encender el Piloto automático')).toBeDefined()
    expect(botonCon('Activar la prueba')).toBeUndefined()
    expect(q('[data-testid="piloto-activacion-frase"]')!.textContent).toContain('tiene contratado el Piloto automático')
  })

  it('ACT-09: Leasefy lo apagó para ESTA inmobiliaria: lo dice con su frase y no ofrece prenderlo', () => {
    pintar({
      ...SIN_ACTIVAR,
      motivo: 'apagado_por_leasefy',
      sePuedeActivar: false,
      frase:
        'Leasefy apagó el Piloto automático para tu inmobiliaria: ningún agente actúa solo y todo te pide un clic. Lo que elijas en cada agente queda guardado. Para volver a encenderlo, habla con Leasefy.',
    })
    expect(q('[data-testid="piloto-activacion-estado"]')!.textContent).toContain('Leasefy tiene apagado el Piloto automático')
    expect(q('[data-testid="piloto-activacion-frase"]')!.textContent).toContain('habla con Leasefy')
    expect(botonCon('Activar')).toBeUndefined()
    expect(botonCon('Encender')).toBeUndefined()
  })

  // 🟡 QA-PILOTO-95 (06-10): apagado por la inmobiliaria, el asesor (o el otro administrador) leía
  // «Apagaste el Piloto automático», como si lo hubiera apagado él. El título no le atribuye nada a
  // quien mira; quién lo apagó lo dice la frase («Tu inmobiliaria apagó…»).
  it('apagado por la inmobiliaria: el título no le dice «Apagaste» a quien lo está mirando', () => {
    pintar({ ...SIN_ACTIVAR, motivo: 'apagado_por_la_inmobiliaria', puedeCambiarlo: false, frase: 'Tu inmobiliaria apagó el Piloto automático: ningún agente actúa solo.' })
    const estado = q('[data-testid="piloto-activacion-estado"]')!.textContent!
    expect(estado).not.toContain('Apagaste')
    expect(estado).toContain('El Piloto automático está apagado')
    expect(estado).toContain('Lo activa un administrador de tu inmobiliaria.')
  })

  // 🔴 axe (06-10, QA-PILOTO-95): «Actúan solos: …» iba en `text-fg-muted` dentro de la
  // alerta verde, que además escribe con opacidad 0,9: 3,9:1 sobre #E8F4EA (AA pide 4,5:1).
  // Las líneas de abajo heredan la tinta legible de la alerta, como la frase.
  it.each([
    ['en prueba, con agentes en Automático', () => EN_PRUEBA, 'Actúan solos:'],
    ['activo sin agentes en Automático', () => ({ ...EN_PRUEBA, enAutomatico: [] }), 'Todavía no tienes ningún agente en Automático'],
    ['sin activar, visto por quien no es administrador', () => ({ ...SIN_ACTIVAR, puedeCambiarlo: false }), 'Lo activa un administrador'],
  ])('🔴 contraste: %s — la línea de abajo usa la tinta de la alerta, no el gris', (_caso, datos, texto) => {
    pintar(datos() as PilotoActivoResponse)
    const lineas = [...document.querySelectorAll('[data-testid="piloto-activacion-estado"] p')]
    const linea = lineas.find((p) => p.textContent?.includes(texto))
    expect(linea).toBeDefined()
    expect(linea!.className).not.toMatch(/\btext-fg-(muted|subtle)\b/)
  })
})
