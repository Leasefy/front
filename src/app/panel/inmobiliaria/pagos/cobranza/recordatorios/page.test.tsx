/**
 * Recordatorios — lo que la pantalla NO puede hacer.
 *
 * 🔴 Las dos garantías que estas pruebas cuidan:
 *   1. Abrir la pantalla no manda nada. El 2026-09-14 el back local le mandó
 *      ~680 correos reales a una inmobiliaria migrada; una pantalla que
 *      dispare al montarse sería la misma historia.
 *   2. No se puede enviar sin haber visto a cuántos le llega. El CEO pidió que
 *      finanzas decida «basada en la cartera», y eso significa ver el número
 *      antes del botón.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const SECUENCIA = {
  activa: true,
  diaDelRecordatorio: 1,
  diasEntreAvisos: 3,
  maxAvisosConInteres: 3,
  canalPreferido: 'CORREO' as const,
  mensajeDelRecordatorio: null,
  mensajeDelAviso: null,
  disponible: true,
  motivo: null,
  canalDeWhatsapp: { disponible: false as const, motivo: 'El canal está apagado en este entorno.' },
}

const CALENDARIO = {
  mes: '2026-10',
  pasos: [
    { paso: 0, fecha: '2026-10-01', conInteres: false, titulo: 'Recordatorio' },
    { paso: 1, fecha: '2026-10-04', conInteres: true, titulo: '1.er aviso con interés' },
  ],
}

const SIN_EXCLUIR = {
  YA_PAGO: 0,
  AUN_NO_VENCE: 0,
  DENTRO_DEL_PLAZO: 0,
  PLAZO_SIN_FIJAR: 0,
  CUBIERTO_POR_ANTICIPO: 0,
  YA_SE_LE_ENVIO: 0,
  SIN_DATOS_DE_CONTACTO: 0,
  SIN_CORREO: 0,
  SIN_WHATSAPP: 0,
  LEY_2300: 0,
}

const PREVIA = {
  mes: '2026-10',
  canal: 'CORREO' as const,
  paso: 0,
  // El paso 0 es el recordatorio: basta con deber, no hace falta ser cartera.
  exigeCartera: false,
  revisados: 3,
  lesLlega: 1,
  excluidos: { ...SIN_EXCLUIR, YA_PAGO: 1, CUBIERTO_POR_ANTICIPO: 1 },
  destinatarios: [
    {
      cuotaId: 'q1',
      // 🔴 Sin cobro emitido: el caso normal desde que la deuda nace con el
      // contrato. Si la fila se llaveara por acá, las tres colisionarían.
      cobroId: null,
      nombre: 'Juan Pérez',
      inmueble: 'Apartamento en Laureles',
      pendienteCop: 2_400_000,
      diasDeMora: 12,
      esCartera: true,
      personaClave: 'doc:1017',
      canal: 'CORREO' as const,
      destino: 'juan@ejemplo.co',
      leLlega: true,
      motivo: null,
      explicacion: null,
    },
    {
      cuotaId: 'q2',
      cobroId: null,
      nombre: 'Ana Gómez',
      inmueble: 'Casa en Envigado',
      pendienteCop: 0,
      diasDeMora: 0,
      esCartera: false,
      personaClave: 'doc:2028',
      canal: 'CORREO' as const,
      destino: 'ana@ejemplo.co',
      leLlega: false,
      motivo: 'YA_PAGO' as const,
      explicacion: 'Ya pagó este mes: no tiene saldo pendiente.',
    },
    {
      cuotaId: 'q3',
      cobroId: null,
      nombre: 'Luis Díaz',
      inmueble: 'Local en el Poblado',
      pendienteCop: 1_200_000,
      diasDeMora: 0,
      esCartera: false,
      personaClave: 'doc:3039',
      canal: 'CORREO' as const,
      destino: 'luis@ejemplo.co',
      leLlega: false,
      motivo: 'CUBIERTO_POR_ANTICIPO' as const,
      explicacion: 'Tiene saldo a favor que cubre lo que debe de este mes.',
    },
  ],
  disponible: true,
  motivo: null,
}

/**
 * El paso 1 (aviso CON INTERÉS) sobre la misma gente: los dos que están dentro
 * del plazo o cuya cuota no venció salen de la lista, y la única que llega es
 * la que ya es cartera. Es el caso que los motivos nuevos explican.
 */
const PREVIA_CON_INTERES = {
  ...PREVIA,
  paso: 1,
  exigeCartera: true,
  revisados: 3,
  lesLlega: 1,
  excluidos: { ...SIN_EXCLUIR, AUN_NO_VENCE: 1, DENTRO_DEL_PLAZO: 1 },
  destinatarios: [
    PREVIA.destinatarios[0]!,
    {
      ...PREVIA.destinatarios[1]!,
      motivo: 'AUN_NO_VENCE' as const,
      explicacion:
        'Debe este mes, pero la cuota todavía no vence: es deuda, no cartera. El aviso con interés no aplica.',
    },
    {
      ...PREVIA.destinatarios[2]!,
      motivo: 'DENTRO_DEL_PLAZO' as const,
      explicacion:
        'La cuota venció, pero todavía está dentro de los días de plazo del contrato: es deuda, no cartera.',
    },
  ],
}

const { obtenerMock, calendarioMock, destinatariosMock, enviarMock, guardarMock } = vi.hoisted(
  () => ({
    obtenerMock: vi.fn(),
    calendarioMock: vi.fn(),
    destinatariosMock: vi.fn(),
    enviarMock: vi.fn(),
    guardarMock: vi.fn(),
  }),
)

vi.mock('@/lib/api/cobranza-secuencia.service', () => ({
  mesDeHoy: () => '2026-10',
  cobranzaSecuenciaApi: {
    obtener: (...a: unknown[]) => obtenerMock(...a),
    guardar: (...a: unknown[]) => guardarMock(...a),
    calendario: (...a: unknown[]) => calendarioMock(...a),
    destinatarios: (...a: unknown[]) => destinatariosMock(...a),
    enviar: (...a: unknown[]) => enviarMock(...a),
  },
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/ui', async () => {
  const real = await vi.importActual<Record<string, unknown>>('@/components/ui')
  return { ...real, toast: { success: vi.fn(), error: vi.fn() } }
})

import Page from './page'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  obtenerMock.mockReset().mockResolvedValue(SECUENCIA)
  calendarioMock.mockReset().mockResolvedValue(CALENDARIO)
  destinatariosMock.mockReset().mockResolvedValue(PREVIA)
  enviarMock.mockReset().mockResolvedValue({
    mes: '2026-10',
    paso: 0,
    canal: 'CORREO',
    enviados: 1,
    omitidos: 0,
    fallidos: 0,
    detalle: [],
  })
  guardarMock.mockReset().mockResolvedValue(SECUENCIA)
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar() {
  await act(async () => {
    root.render(<Page />)
  })
}

function botonQueDice(texto: RegExp): HTMLButtonElement | undefined {
  return [...contenedor.querySelectorAll('button')].find((b) =>
    texto.test(b.textContent ?? ''),
  ) as HTMLButtonElement | undefined
}

describe('🔴 abrir la pantalla no manda nada', () => {
  it('al montar sólo se leen las condiciones y el calendario', async () => {
    await montar()
    expect(obtenerMock).toHaveBeenCalledTimes(1)
    expect(calendarioMock).toHaveBeenCalledWith('2026-10')
    expect(enviarMock).not.toHaveBeenCalled()
    expect(destinatariosMock).not.toHaveBeenCalled()
  })
})

describe('🔴 no se envía sin haber visto la lista', () => {
  it('sin vista previa no hay botón de enviar, y se explica por qué', async () => {
    await montar()
    expect(botonQueDice(/Enviar a/)).toBeUndefined()
    expect(contenedor.textContent).toContain('después')
  })

  it('con la vista previa aparece el botón, con el número adentro', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    const enviar = botonQueDice(/Enviar a/)
    expect(enviar).toBeDefined()
    expect(enviar?.textContent).toContain('Enviar a 1')
    expect(enviarMock).not.toHaveBeenCalled()
  })

  it('el envío manda el paso y el canal que la previa confirmó, no lo que diga la pantalla', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    await act(async () => {
      botonQueDice(/Enviar a/)?.click()
    })
    /*
     * 🔴 La selección viaja SIEMPRE y como `soloEstasCuotas`, con los `cuotaId`.
     * Con el nombre viejo (`soloEstosCobros`) el back lee esos valores como
     * `cuotaId`, no coincide ninguno, y el envío sale vacío sin decir nada.
     */
    expect(enviarMock).toHaveBeenCalledWith({
      mes: '2026-10',
      paso: 0,
      canal: 'CORREO',
      soloEstasCuotas: ['q1'],
    })
  })

  it('destildar a alguien lo saca del envío y del número del botón', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    expect(botonQueDice(/Enviar a/)?.textContent).toContain('Enviar a 1')

    await act(async () => {
      contenedor.querySelector<HTMLButtonElement>('[data-testid="elegir-q1"]')!.click()
    })
    // Sin nadie elegido no se puede mandar: el botón queda muerto.
    const enviar = botonQueDice(/Enviar a/)
    expect(enviar?.textContent).toContain('Enviar a 0')
    expect(enviar?.disabled).toBe(true)
    await act(async () => {
      enviar?.click()
    })
    expect(enviarMock).not.toHaveBeenCalled()
  })

  it('a quien NO recibe no se le ofrece una casilla que no haría nada', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    expect(contenedor.querySelector('[data-testid="elegir-q1"]')).toBeTruthy()
    expect(contenedor.querySelector('[data-testid="elegir-q2"]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="elegir-q3"]')).toBeNull()
  })

  it('🔴 la lista se llavea por cuotaId: las tres filas salen aunque ninguna tenga cobro', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    const filas = contenedor.querySelectorAll('[data-testid="fila-destinatario"]')
    expect(filas).toHaveLength(3)
    expect(new Set([...filas].map((f) => f.textContent)).size).toBe(3)
  })
})

describe('🔴 deuda no es cartera: los motivos nuevos se ven', () => {
  /*
   * Sin `AUN_NO_VENCE` y `DENTRO_DEL_PLAZO` en el catálogo del front, esa gente
   * desaparecía del resumen: la lista pasaba de 3 a 1 y no había manera de
   * saber por qué. Es el mismo defecto que hace desconfiar de la pantalla.
   */
  it('cuenta a los excluidos por no ser cartera todavía, con sus palabras', async () => {
    destinatariosMock.mockResolvedValue(PREVIA_CON_INTERES)
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })

    expect(contenedor.querySelector('[data-testid="excluidos-AUN_NO_VENCE"]')?.textContent).toContain(
      'Todavía no les vence',
    )
    expect(
      contenedor.querySelector('[data-testid="excluidos-DENTRO_DEL_PLAZO"]')?.textContent,
    ).toContain('Dentro del plazo del contrato')
    // Y la explicación por fila, tal cual la manda el back.
    expect(contenedor.textContent).toContain('es deuda, no cartera')
  })

  /*
   * 🔴 QA-CONT CR-31 (Nico, 03-10-2026): sin días de plazo fijados por la
   * inmobiliaria, la cuota vencida NO entra a la cobranza. El back la excluye
   * con `PLAZO_SIN_FIJAR`; sin ese motivo en el catálogo, esa gente
   * desaparecía del resumen y nadie sabía que faltaba fijar el plazo.
   */
  it('cuenta a los excluidos por plazo sin fijar y da el camino para fijarlo', async () => {
    destinatariosMock.mockResolvedValue({
      ...PREVIA_CON_INTERES,
      lesLlega: 0,
      excluidos: { ...SIN_EXCLUIR, PLAZO_SIN_FIJAR: 2, AUN_NO_VENCE: 1 },
      destinatarios: [
        { ...PREVIA_CON_INTERES.destinatarios[1]! },
        {
          ...PREVIA_CON_INTERES.destinatarios[2]!,
          esCartera: false,
          leLlega: false,
          motivo: 'PLAZO_SIN_FIJAR' as const,
          explicacion:
            'La cuota venció, pero la inmobiliaria todavía no fijó sus días de plazo: no entra a la cartera en mora ni a la cobranza. Se fijan en Configuración → Cartera.',
        },
      ],
    })
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })

    expect(contenedor.querySelector('[data-testid="excluidos-PLAZO_SIN_FIJAR"]')?.textContent).toContain(
      'Plazo sin fijar: 2',
    )
    const aviso = contenedor.querySelector('[data-testid="aviso-plazo-sin-fijar"]')
    expect(aviso?.textContent).toContain(
      'La inmobiliaria no ha fijado sus días de plazo: la cuota vencida no entra a la cobranza hasta fijarlos',
    )
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo',
    )
    // La fila de esa cuota no dice «dentro del plazo»: no hay plazo.
    const filas = [...contenedor.querySelectorAll('[data-testid="fila-destinatario"]')]
    const laDelPlazo = filas.find((f) => f.textContent?.includes('no fijó sus días de plazo'))
    expect(laDelPlazo?.textContent).toContain('vencida · plazo sin fijar')
    expect(laDelPlazo?.textContent).not.toContain('dentro del plazo')
  })

  it('explica por qué la lista se encoge al pasar al aviso con interés', async () => {
    destinatariosMock.mockResolvedValue(PREVIA_CON_INTERES)
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    expect(contenedor.querySelector('[data-testid="exige-cartera"]')?.textContent).toContain(
      'sólo entra quien ya pasó los días de plazo',
    )
  })

  it('en el recordatorio dice lo contrario: entra quien deba, aunque esté en plazo', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    expect(contenedor.querySelector('[data-testid="exige-cartera"]')?.textContent).toContain(
      'aunque todavía esté dentro de su plazo',
    )
  })
})

describe('la lista dice por qué cada quien NO recibe', () => {
  it('muestra a los tres y el motivo de los dos que quedan fuera', async () => {
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    expect(contenedor.textContent).toContain('Juan Pérez')
    expect(contenedor.textContent).toContain('Ya pagó este mes')
    expect(contenedor.textContent).toContain('Tiene saldo a favor')
    expect(contenedor.textContent).toContain('Ya pagaron')
    expect(contenedor.textContent).toContain('Pagaron por adelantado')
  })
})

describe('el calendario es la promesa de la pantalla', () => {
  it('muestra el recordatorio y el aviso con interés, con sus fechas', async () => {
    await montar()
    expect(contenedor.textContent).toContain('Recordatorio')
    expect(contenedor.textContent).toContain('1.er aviso con interés')
    expect(contenedor.textContent).toContain('con el interés ya generado')
  })
})

describe('un canal apagado se dice', () => {
  it('el motivo del canal de WhatsApp se muestra tal cual lo manda el back', async () => {
    await montar()
    expect(contenedor.textContent).toContain('El canal está apagado en este entorno.')
  })
})

describe('sin la migración aplicada', () => {
  it('se ve la pantalla con el motivo y no se puede consultar ni guardar', async () => {
    obtenerMock.mockResolvedValue({
      ...SECUENCIA,
      disponible: false,
      motivo: 'Falta aplicar la migración 20260915160000_cobranza_con_reglaje.',
    })
    await montar()
    expect(contenedor.textContent).toContain('20260915160000')
    expect(botonQueDice(/Ver a quién le llega/)?.disabled).toBe(true)
  })
})

// ── Errores: un solo traductor y la regla de oro (02-10-2026) ────────────────
// Antes había una copia local `mensajeDeError` que pintaba el `message` crudo
// (o «Error 500») y un 400 con `campos` iba entero al toast.

describe('errores al guardar las condiciones y al enviar', () => {
  async function escribirEn(id: string, valor: string) {
    const input = contenedor.querySelector<HTMLInputElement>(`#${id}`)!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    return input
  }

  async function errorDelToast(): Promise<string> {
    const { toast } = await import('@/components/ui')
    const llamadas = (toast.error as unknown as ReturnType<typeof vi.fn>).mock.calls
    return String(llamadas.at(-1)?.[0] ?? '')
  }

  beforeEach(async () => {
    const { toast } = await import('@/components/ui')
    ;(toast.error as unknown as ReturnType<typeof vi.fn>).mockClear()
  })

  it('un día del recordatorio fuera de 1–28 se ataja antes de enviar, debajo del campo y con el foco', async () => {
    await montar()
    const input = await escribirEn('dia-recordatorio', '31')
    await act(async () => {
      botonQueDice(/Guardar condiciones/)?.click()
    })
    expect(guardarMock).not.toHaveBeenCalled()
    expect(contenedor.querySelector('#dia-recordatorio-error')?.textContent).toBe(
      'El día del recordatorio va de 1 a 28, en números enteros.',
    )
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('dia-recordatorio-error')
    expect(document.activeElement).toBe(input)
  })

  it('un 400 con `campos` pinta el error en su campo, le da el foco y no va al toast', async () => {
    const { ApiError } = await import('@/lib/api/client')
    guardarMock.mockRejectedValue(
      new ApiError(400, 'Los días entre avisos no pueden pasar de 30.', 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: 'Los días entre avisos no pueden pasar de 30.',
        campos: [
          { campo: 'diasEntreAvisos', regla: 'maximo', mensaje: 'Los días entre avisos no pueden pasar de 30.' },
        ],
      }),
    )
    await montar()
    const input = await escribirEn('dias-entre', '5')
    await act(async () => {
      botonQueDice(/Guardar condiciones/)?.click()
    })
    expect(guardarMock).toHaveBeenCalledTimes(1)
    expect(contenedor.querySelector('#dias-entre-error')?.textContent).toBe(
      'Los días entre avisos no pueden pasar de 30.',
    )
    expect(document.activeElement).toBe(input)
    const { toast } = await import('@/components/ui')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('un 5xx al guardar dice «de nuestro lado» con la referencia', async () => {
    const { ApiError } = await import('@/lib/api/client')
    guardarMock.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    )
    await montar()
    await escribirEn('dias-entre', '5')
    await act(async () => {
      botonQueDice(/Guardar condiciones/)?.click()
    })
    const texto = await errorDelToast()
    expect(texto).toContain('No pudimos guardar las condiciones de cobro: algo falló de nuestro lado')
    expect(texto).toContain('ab12cd34')
    expect(texto).not.toMatch(/conexi[oó]n/i)
  })

  it('un envío que no sale (status 0) habla de la conexión', async () => {
    enviarMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    await act(async () => {
      botonQueDice(/Enviar a/)?.click()
    })
    expect(await errorDelToast()).toMatch(/conexi[oó]n/i)
  })

  it('un 409 al enviar muestra el `message` del back, no el status', async () => {
    const { ApiError } = await import('@/lib/api/client')
    enviarMock.mockRejectedValue(
      new ApiError(409, 'Ese paso ya se envió hoy por correo.', 'YA_ENVIADO', {
        statusCode: 409,
        code: 'YA_ENVIADO',
        message: 'Ese paso ya se envió hoy por correo.',
      }),
    )
    await montar()
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    await act(async () => {
      botonQueDice(/Enviar a/)?.click()
    })
    const texto = await errorDelToast()
    expect(texto).toBe('Ese paso ya se envió hoy por correo.')
    expect(texto).not.toContain('409')
  })
})

// QA-IA-95 (05-10-2026, IA95-16): «A quién le va a llegar el aviso de 2026-10» y «De N cuotas de
// 2026-10…»: el mes en formato de máquina. Va en palabras.
describe('el mes en palabras (QA-IA-95)', () => {
  it('el título y la vista previa dicen «octubre de 2026», nunca «2026-10»', async () => {
    await montar()
    expect(contenedor.textContent).toContain('A quién le va a llegar el aviso de octubre de 2026')
    await act(async () => {
      botonQueDice(/Ver a quién le llega/)?.click()
    })
    expect(contenedor.textContent).toContain('cuotas de octubre de 2026')
    expect(contenedor.textContent).not.toMatch(/\b2026-10\b/)
  })
})
