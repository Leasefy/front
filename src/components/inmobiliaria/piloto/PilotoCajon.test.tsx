/**
 * El cajón del Piloto.
 *
 * Lo que se protege acá son las reglas que ya nos costaron caro en esta
 * pantalla, no el diseño:
 *
 *  1. **Cero botones muertos.** El botón de acción sólo existe si el micro
 *     declaró la acción (`acciones[]`); si el micro dice que ESTE rol no la
 *     puede ejecutar (`permitida: false`, P-9), se ve apagada con el porqué.
 *  2. **«No se pudo consultar» NO es «no hay nada».** Un 404 se dice con
 *     palabras; jamás con un cajón vacío que parezca un caso sin información.
 *  3. **Una alerta del tablero no se le pide al micro.** Es una regla sobre
 *     números, no una fila: pedirla daría 404. Se pinta con lo que ya trae.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado } = vi.hoisted(() => ({
  estado: {
    detalle: null as unknown,
    isLoading: false,
    error: null as string | null,
    notAvailable: false,
    rol: 'OWNER' as string | null,
    accionesCorridas: [] as unknown[],
    respuesta: { ok: true } as { ok: boolean; error?: string; fallo?: unknown },
    toasts: [] as string[],
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
  useOptionalI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ agencyRole: estado.rol, isAdmin: true }),
}))

const usePilotoDetalleMock = vi.fn(() => ({
  data: estado.detalle,
  isLoading: estado.isLoading,
  error: estado.error,
  notAvailable: estado.notAvailable,
  refetch: async () => {},
}))
vi.mock('@/lib/hooks/piloto/use-piloto-detalle', () => ({
  usePilotoDetalle: (...a: unknown[]) => usePilotoDetalleMock(...(a as [])),
}))

vi.mock('@/lib/api/piloto', () => ({
  runInboxAccion: async (accion: unknown, valores?: unknown) => {
    estado.accionesCorridas.push(valores === undefined ? accion : { ...(accion as object), valores })
    return estado.respuesta
  },
}))

vi.mock('sonner', () => ({
  toast: { success: () => {}, error: (m: string) => estado.toasts.push(m) },
}))

vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({
  relativeTime: () => 'hace 2 h',
}))

vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))

import { PilotoCajon, type PilotoApertura } from './PilotoCajon'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

const DETALLE = {
  id: 'esc:e-1',
  fuente: 'escalacion',
  agente: 'cobranza',
  titulo: 'Escalación de cobranza',
  subtitulo: 'El deudor pidió hablar con una persona',
  prioridad: 'alta' as const,
  desde: '2026-08-30T14:00:00-05:00',
  contexto: [
    { titulo: 'La escalación', filas: [{ label: 'Motivo', valor: 'Pidió una persona' }] },
  ],
  traza: [{ at: '2026-08-30T14:00:00-05:00', titulo: 'Se creó la escalación' }],
  acciones: [
    { label: 'Tomar el caso', method: 'POST' as const, path: '/api/x/claim', body: {} },
  ],
  enlaces: [] as unknown[],
}

let container: HTMLDivElement
let root: Root

function render(
  apertura: PilotoApertura | null,
  onAbrirItem: (id: string) => void = () => {},
) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <PilotoCajon apertura={apertura} onClose={() => {}} onAbrirItem={onAbrirItem} />,
    )
  })
}

/** El Sheet de Radix se monta en un portal: hay que mirar todo el body. */
const texto = () => document.body.textContent ?? ''
/**
 * Lo clicable del cajón. Se consulta por ROL y no por etiqueta: el `ListRow`
 * del DS es un `div role="button"` (con tabIndex y teclado), así que buscar
 * `<button>` dejaría fuera filas que el usuario sí puede accionar.
 */
const botones = () => [
  ...document.body.querySelectorAll<HTMLElement>('button, [role="button"]'),
]

beforeEach(() => {
  estado.detalle = null
  estado.isLoading = false
  estado.error = null
  estado.notAvailable = false
  estado.rol = 'OWNER'
  estado.accionesCorridas = []
  estado.respuesta = { ok: true }
  estado.toasts = []
  usePilotoDetalleMock.mockClear()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PilotoCajon — modo ítem', () => {
  it('pinta el contexto, la traza y la acción declarada por el micro', () => {
    estado.detalle = DETALLE
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('Escalación de cobranza')
    expect(texto()).toContain('La escalación')
    expect(texto()).toContain('Se creó la escalación')
    expect(document.querySelector('[data-testid="piloto-cajon-accion-0"]')).not.toBeNull()
  })

  it('sin acciones declaradas NO dibuja ningún botón de acción', () => {
    // Cero botones muertos: un plan de pago no se aprueba de un clic porque
    // el endpoint exige el token de concurrencia. Si el micro no la declara,
    // acá no se inventa.
    estado.detalle = { ...DETALLE, acciones: [] }
    render({ tipo: 'item', id: 'plan:p-1' })
    expect(document.querySelector('[data-testid="piloto-cajon-accion-0"]')).toBeNull()
  })

  it('🔴 un hecho ya ocurrido (sin nada que decidir) NO dice «esperando»; una decisión sí', () => {
    // Visto en el navegador el 24-09: los cobros de un día decían «esperando hace 1d».
    estado.detalle = { ...DETALLE, id: 'dia:cobro.vencido:2026-09-22', acciones: [], enlaces: [] }
    render({ tipo: 'item', id: 'dia:cobro.vencido:2026-09-22' })
    const desde = () => document.querySelector('[data-testid="piloto-cajon-desde"]')?.textContent ?? ''
    expect(desde()).toBe('hace 2 h')
    expect(desde()).not.toContain('esperando')
    act(() => root.unmount())
    container.remove()

    estado.detalle = DETALLE
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(desde()).toContain('inmobiliaria.piloto.cajon.esperando')
    act(() => root.unmount())
    container.remove()

    // Una decisión que se toma en otra pantalla también espera.
    estado.detalle = { ...DETALLE, acciones: [], enlaces: [{ label: 'Abrir', href: '/x', razon: 'Se decide en Cobranza.' }] }
    render({ tipo: 'item', id: 'plan:p-1' })
    expect(desde()).toContain('inmobiliaria.piloto.cajon.esperando')
  })

  it('🔴 P-9: si el micro dice que ESTE rol no puede, la acción se ve apagada y con el porqué', () => {
    // Antes el front comparaba el rol del ERP con `!== 'VIEWER'` y un AGENTE
    // veía botones que el micro contestaba con 403. Ahora manda el micro.
    estado.detalle = {
      ...DETALLE,
      acciones: [
        {
          ...(DETALLE as { acciones: Array<Record<string, unknown>> }).acciones[0],
          permitida: false,
          porQueNo: 'Tu rol puede ver esta decisión, pero no tomarla.',
        },
      ],
    }
    render({ tipo: 'item', id: 'esc:e-1' })
    const boton = document.querySelector('[data-testid="piloto-cajon-accion-0"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(document.querySelector('[data-testid="piloto-cajon-porqueno"]')?.textContent).toContain(
      'no tomarla',
    )
  })

  it('🔴 abierto desde el botón de la fila, la acción que pregunta queda lista para confirmar', () => {
    estado.detalle = {
      ...DETALLE,
      acciones: [
        {
          label: 'Aprobar y llamar',
          method: 'POST',
          path: '/api/agency/a/ai-hub/retenidos/r/aprobar',
          body: {},
          confirmacion: 'Laura va a llamar a Ana, que debe $1.430.502 hoy.',
        },
      ],
    }
    render({ tipo: 'item', id: 'hold:r', accion: 'Aprobar y llamar' })
    // El formulario (con la advertencia) ya está abierto, sin otro clic.
    expect(document.querySelector('[data-testid="piloto-cajon-formulario"]')).not.toBeNull()
    expect(document.body.textContent).toContain('que debe $1.430.502 hoy')
    expect(estado.accionesCorridas).toHaveLength(0)
  })

  it('ejecuta la acción VERBATIM: método, path y cuerpo salen del micro', async () => {
    estado.detalle = DETALLE
    render({ tipo: 'item', id: 'esc:e-1' })
    const boton = document.querySelector(
      '[data-testid="piloto-cajon-accion-0"]',
    ) as HTMLButtonElement
    // `act` asíncrono: el clic dispara un estado que se resuelve en una
    // microtarea (el `finally` que apaga el spinner).
    await act(async () => {
      boton.click()
    })
    expect(estado.accionesCorridas).toEqual([
      { label: 'Tomar el caso', method: 'POST', path: '/api/x/claim', body: {} },
    ])
  })

  it('un 404 dice que el caso ya no está — no un cajón vacío', () => {
    estado.notAvailable = true
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('sinFuenteTitulo')
  })

  it('un error ofrece reintentar', () => {
    estado.error = 'boom'
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('errorTitulo')
    expect(texto()).toContain('reintentar')
  })
})

describe('PilotoCajon — modo alerta', () => {
  const ALERTA = {
    id: 'promesas-incumplidas',
    severidad: 'alta' as const,
    titulo: '3 promesas de pago vencidas',
    detalle: 'El deudor se comprometió y la fecha pasó.',
    href: '/panel/inmobiliaria/pagos/cobranza/pagos',
    items: [
      { id: 'prom:p-1', titulo: '$250.000 — Ana R.', desde: '2026-08-25T10:00:00-05:00' },
      { id: 'prom:p-2', titulo: '$800.000 — Luis M.' },
    ],
  }

  it('NO le pide el detalle al micro: una alerta es una regla, no una fila', () => {
    render({ tipo: 'alerta', alerta: ALERTA })
    // El hook se llama igual (es un hook), pero con `null`: no hay petición.
    expect(usePilotoDetalleMock).toHaveBeenCalledWith(null)
  })

  it('lista los casos que sostienen el número y cada uno abre su cajón', () => {
    const abiertos: string[] = []
    render({ tipo: 'alerta', alerta: ALERTA }, (id) => {
      abiertos.push(id)
    })
    expect(texto()).toContain('$250.000 — Ana R.')
    const caso = botones().find((b) => b.textContent?.includes('$800.000'))
    expect(caso).toBeDefined()
    act(() => {
      caso?.click()
    })
    expect(abiertos).toEqual(['prom:p-2'])
  })

  it('sin lista NO afirma que no hay casos', () => {
    // El número del título se midió aparte; decir «no hay» sería falso.
    render({ tipo: 'alerta', alerta: { ...ALERTA, items: undefined } })
    expect(texto()).toContain('3 promesas de pago vencidas')
    expect(texto()).toContain('sinCasos')
  })
})

describe('PilotoCajon — una carta se lee acá mismo', () => {
  /**
   * Antes de esto el bloque «Dónde seguir» de una carta tenía TRES entradas
   * para lo mismo: la del sub-cajón, «Leer el PDF antes de aprobar» —muerta,
   * apuntaba a `pdfUrl`, que es una ubicación de almacenamiento— y «Abrir la
   * carta», que sacaba del Piloto (Nico, 2026-09-06).
   */
  const CARTA = {
    ...DETALLE,
    id: 'art:carta-9',
    fuente: 'carta',
    enlaces: [
      { label: 'Leer el PDF antes de aprobar', href: 'https://demo.leasefy.co/cartas/2.pdf' },
      { label: 'Abrir la carta', href: '/panel/inmobiliaria/pagos/cobranza/cartas/carta-9' },
    ],
  }

  it('deja UN solo enlace, y es el que abre el documento sin salir', () => {
    estado.detalle = CARTA
    render({ tipo: 'item', id: 'art:carta-9' })
    expect(document.body.querySelector('[data-testid="piloto-cajon-leer-pdf"]')).toBeTruthy()
    // Los dos del micro no se pintan: uno está muerto y el otro lo ofrece el
    // pie del sub-cajón.
    expect(texto()).not.toContain('Leer el PDF antes de aprobar')
    expect(texto()).not.toContain('Abrir la carta')
    expect(document.body.querySelectorAll('a[href*="demo.leasefy.co"]')).toHaveLength(0)
  })

  it('un caso que NO es carta conserva los enlaces del micro', () => {
    estado.detalle = { ...DETALLE, enlaces: [{ label: 'Ver la llamada', href: '/x/llamadas/1' }] }
    render({ tipo: 'item', id: 'esc:e-1' })
    expect(texto()).toContain('Ver la llamada')
    expect(document.body.querySelector('[data-testid="piloto-cajon-leer-pdf"]')).toBeNull()
  })
})

/*
 * Tanda 2 de errores (02-10-2026): una acción del cajón que no salía decía
 * «No se pudo: 400» en un toast, y lo que el micro decía de un dato del
 * formulario (un 400 con `campos`) nunca llegaba al campo.
 */
describe('PilotoCajon — una acción que no sale', () => {
  const CON_MOTIVO = {
    ...DETALLE,
    acciones: [
      {
        label: 'Rechazar la carta',
        method: 'POST' as const,
        path: '/api/agency/a/cobranza/cartas/c-1/rechazar',
        campos: [{ id: 'motivo', label: 'Motivo', tipo: 'texto' as const, requerido: true, maxLargo: 500 }],
      },
    ],
  }

  async function escribirYEnviar(texto: string) {
    const area = document.querySelector('#accion-motivo') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(area, texto)
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = document.querySelector('[data-testid="piloto-cajon-formulario"]') as HTMLFormElement
    await act(async () => {
      form.requestSubmit()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    return area
  }

  it('🔴 un 400 con `campos` pinta el error debajo de SU campo, le da el foco y no lo manda al toast', async () => {
    estado.detalle = CON_MOTIVO
    estado.respuesta = {
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['El motivo debe explicar por qué se rechaza: escribe al menos 10 caracteres.'],
          campos: [
            {
              campo: 'motivo',
              regla: 'longitud_minima',
              mensaje: 'El motivo debe explicar por qué se rechaza: escribe al menos 10 caracteres.',
            },
          ],
        }),
      }),
    }
    render({ tipo: 'item', id: 'carta:c-1', accion: 'Rechazar la carta' })
    const area = await escribirYEnviar('No va')

    expect(estado.accionesCorridas).toHaveLength(1)
    const error = document.getElementById('accion-motivo-error')
    expect(error?.textContent).toContain('escribe al menos 10 caracteres')
    expect(area.getAttribute('aria-invalid')).toBe('true')
    expect(area.getAttribute('aria-describedby')).toBe('accion-motivo-error')
    expect(document.activeElement).toBe(area)
    expect(estado.toasts).toEqual([])
    // El formulario sigue abierto con lo escrito.
    expect(area.value).toBe('No va')
  })

  it('un 5xx dice «de nuestro lado» con la referencia, en el toast', async () => {
    estado.detalle = CON_MOTIVO
    estado.respuesta = {
      ok: false,
      error: 'Internal Server Error',
      fallo: await falloDelMicro({
        status: 500,
        json: async () => ({ error: 'Internal Server Error', requestId: '9f8e7d6c-1111' }),
      }),
    }
    render({ tipo: 'item', id: 'carta:c-1', accion: 'Rechazar la carta' })
    await escribirYEnviar('No corresponde a este contrato.')

    expect(estado.toasts).toHaveLength(1)
    expect(estado.toasts[0]).toContain('No pudimos rechazar la carta: algo falló de nuestro lado')
    expect(estado.toasts[0]).toContain('9f8e7d6c')
    expect(estado.toasts[0]).not.toMatch(/conexi|500/i)
    expect(document.getElementById('accion-motivo-error')).toBeNull()
  })

  it('si el pedido ni salió (status 0) habla de la conexión', async () => {
    estado.detalle = DETALLE
    const red = new TypeError('Failed to fetch')
    estado.respuesta = { ok: false, error: red.message, fallo: red }
    render({ tipo: 'item', id: 'esc:e-1' })
    await act(async () => {
      ;(document.querySelector('[data-testid="piloto-cajon-accion-0"]') as HTMLButtonElement).click()
    })
    expect(estado.toasts[0]).toMatch(/conexión/)
  })
})

