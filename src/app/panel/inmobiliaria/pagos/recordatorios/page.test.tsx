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

const PREVIA = {
  mes: '2026-10',
  canal: 'CORREO' as const,
  paso: 0,
  revisados: 3,
  lesLlega: 1,
  excluidos: {
    YA_PAGO: 1,
    CUBIERTO_POR_ANTICIPO: 1,
    YA_SE_LE_ENVIO: 0,
    SIN_DATOS_DE_CONTACTO: 0,
    SIN_CORREO: 0,
    SIN_WHATSAPP: 0,
    LEY_2300: 0,
  },
  destinatarios: [
    {
      cobroId: 'c1',
      nombre: 'Juan Pérez',
      inmueble: 'Apartamento en Laureles',
      pendienteCop: 2_400_000,
      personaClave: 'doc:1017',
      canal: 'CORREO' as const,
      destino: 'juan@ejemplo.co',
      leLlega: true,
      motivo: null,
      explicacion: null,
    },
    {
      cobroId: 'c2',
      nombre: 'Ana Gómez',
      inmueble: 'Casa en Envigado',
      pendienteCop: 0,
      personaClave: 'doc:2028',
      canal: 'CORREO' as const,
      destino: 'ana@ejemplo.co',
      leLlega: false,
      motivo: 'YA_PAGO' as const,
      explicacion: 'Ya pagó este mes: no tiene saldo pendiente.',
    },
    {
      cobroId: 'c3',
      nombre: 'Luis Díaz',
      inmueble: 'Local en el Poblado',
      pendienteCop: 1_200_000,
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
    expect(enviarMock).toHaveBeenCalledWith({ mes: '2026-10', paso: 0, canal: 'CORREO' })
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
