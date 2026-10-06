/**
 * Pedir cita: a qué inmuebles se ofrece y dónde se dice por qué no se pudo.
 *
 * A4 — Antes el combo ofrecía TODOS los inmuebles, arrendados incluidos, y el
 *      back los aceptaba: la agenda se llenaba de visitas a casas ocupadas.
 *      Ahora el back responde 409 `INMUEBLE_ARRENDADO`, y el combo ni los
 *      ofrece (dice cuántos quedaron afuera, para que nadie busque en vano).
 * A6 — El 409 de solape salía en un toast que se iba solo, lejos de la hora
 *      que había que cambiar. Ahora va al lado del campo.
 * A7 — `submitting` pinta en el render siguiente: un doble clic mandaba dos
 *      citas iguales. La guarda es un `useRef`.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

const createCitaMock = vi.fn()
// A5: el modal pregunta qué modalidades acepta el inmueble al elegirlo. Por
// defecto responde con las dos, que es el caso de hoy; cada prueba que quiera
// otro inmueble cambia este mock.
const disponibilidadMock = vi.fn((_propertyId: string) =>
  Promise.resolve({ windows: [], agendas: {}, visitTypes: ['IN_PERSON', 'VIRTUAL'] }),
)
vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: {
    createCita: (dto: unknown) => createCitaMock(dto),
    getDisponibilidad: (id: string) => disponibilidadMock(id),
  },
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => ({
    consignaciones: [
      { id: 'c-1', propertyId: 'p-libre', propertyTitle: 'Casa Envigado', propertyAddress: 'Cra 43', availability: 'available', arrendado: false },
      // Contrato vigente aunque `availability` diga disponible (migrados): NO se ofrece.
      { id: 'c-2', propertyId: 'p-contrato', propertyTitle: 'Apto Laureles', propertyAddress: 'Cl 33', availability: 'available', arrendado: true },
      // Fila vieja sin `arrendado`: manda `availability`.
      { id: 'c-3', propertyId: 'p-rented', propertyTitle: 'Local Centro', propertyAddress: 'Cra 50', availability: 'rented' },
      // Mandato migrado sin inmueble: nunca pudo recibir una visita.
      { id: 'c-4', propertyId: '', propertyTitle: 'Sin inmueble', propertyAddress: '', availability: 'available' },
    ],
    isLoading: false,
  }),
}))

// El Combobox se reemplaza por un <select>: lo que importa acá son las
// opciones que recibe y el valor que devuelve, no el popover.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[]
    value?: string
    onChange: (v: string | undefined) => void
  }) =>
    React.createElement(
      'select',
      {
        'data-testid': 'combo-inmueble',
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value || undefined),
      },
      [React.createElement('option', { key: '', value: '' }, '—')].concat(
        options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
      ),
    ),
}))

vi.mock('@/components/ui/responsive-dialog', () => {
  const Pasa = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children)
  return {
    ResponsiveDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? React.createElement('div', null, children) : null,
    ResponsiveDialogContent: Pasa,
    ResponsiveDialogHeader: Pasa,
    ResponsiveDialogTitle: Pasa,
    ResponsiveDialogFooter: Pasa,
  }
})

// El DatePicker del DS se reemplaza por un botón que elige el 1 de octubre.
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@leasefy/cadence')>()),
  DatePicker: ({ onChange }: { onChange: (d: Date) => void }) =>
    React.createElement('button', { type: 'button', 'data-testid': 'elegir-fecha', onClick: () => onChange(new Date(2026, 9, 1)) }, 'fecha'),
}))

import { ApiError } from '@/lib/api/client'
import { PedirCitaModal, rechazoDeCita } from './PedirCitaModal'

let container: HTMLDivElement
let root: Root
const onClose = vi.fn()
const onCreated = vi.fn()

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar(props: Partial<React.ComponentProps<typeof PedirCitaModal>> = {}) {
  await act(async () => {
    root.render(
      React.createElement(PedirCitaModal, { isOpen: true, onClose, onCreated, ...props }),
    )
  })
}

const q = (id: string) => container.querySelector<HTMLElement>(`[data-testid="${id}"]`)
/** El error bajo un campo (`ErrorDelCampo`, id `cita-<campo>-error`). */
const errorDe = (campo: string) => container.querySelector<HTMLElement>(`#cita-${campo}-error`)

function escribir(el: HTMLInputElement, valor: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Llena lo obligatorio: inmueble (si no viene fijo), nombre y día. */
async function llenar({ conCombo = true } = {}) {
  await act(async () => {
    if (conCombo) {
      const combo = q('combo-inmueble') as HTMLSelectElement
      combo.value = 'p-libre'
      combo.dispatchEvent(new Event('change', { bubbles: true }))
    }
    escribir(
      container.querySelector<HTMLInputElement>('input[placeholder="inmobiliaria.agenda.citaContact"]')!,
      'Ana Pérez',
    )
    q('elegir-fecha')!.click()
  })
}

const botonAgendar = () =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
    b.textContent?.includes('inmobiliaria.agenda.citaSubmit'),
  )!

async function agendar() {
  await act(async () => {
    botonAgendar().click()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('A4 — el combo no ofrece inmuebles arrendados', () => {
  it('sólo el disponible con inmueble; y dice cuántos arrendados quedaron afuera', async () => {
    await montar()
    const valores = Array.from((q('combo-inmueble') as HTMLSelectElement).options).map((o) => o.value)
    expect(valores).toEqual(['', 'p-libre'])
    expect(q('cita-arrendados-ocultos')?.textContent).toContain('No aparecen 2 inmuebles arrendados')
  })

  it('409 INMUEBLE_ARRENDADO (inmueble fijo desde la ficha): el motivo va al lado del inmueble, no en un toast', async () => {
    createCitaMock.mockRejectedValue(
      new ApiError(409, 'Ese inmueble tiene un contrato vigente: no se pueden agendar visitas hasta que termine.', 'INMUEBLE_ARRENDADO'),
    )
    await montar({ presetPropertyId: 'p-contrato', presetPropertyTitle: 'Apto Laureles' })
    await llenar({ conCombo: false })
    await agendar()

    expect(errorDe('inmueble')?.textContent).toContain('contrato vigente')
    expect(errorDe('hora')).toBeNull()
    expect(toastMock.error).not.toHaveBeenCalled()
    // El modal sigue abierto con lo que ya se llenó.
    expect(onClose).not.toHaveBeenCalled()
  })

  it('el `code` también se lee de `detalle` (el filtro del back reenvía las claves extra)', () => {
    const r = rechazoDeCita(new ApiError(409, 'Ya está arrendado.', undefined, { code: 'INMUEBLE_ARRENDADO' }), 'genérico')
    expect(r).toEqual({ campo: 'inmueble', mensaje: 'Ya está arrendado.' })
  })
})

describe('A6 — el solape se dice al lado de la hora', () => {
  it('409 HORARIO_OCUPADO: aviso junto a la hora, sin toast, sin cerrar', async () => {
    createCitaMock.mockRejectedValue(
      new ApiError(409, 'Ya hay una cita en ese horario. Elige otra hora.', 'HORARIO_OCUPADO'),
    )
    await montar()
    await llenar()
    await agendar()

    expect(errorDe('hora')?.textContent).toBe('Ya hay una cita en ese horario. Elige otra hora.')
    expect(errorDe('inmueble')).toBeNull()
    expect(toastMock.error).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia, DENTRO del modal y sin el volcado', async () => {
    createCitaMock.mockRejectedValue(
      new ApiError(500, 'Invalid `prisma.propertyVisit.create()` invocation', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Invalid `prisma.propertyVisit.create()` invocation',
        referencia: 'ab12cd34',
      }),
    )
    await montar()
    await llenar()
    await agendar()

    const general = q('cita-rechazo-general')?.textContent ?? ''
    expect(general).toContain('de nuestro lado')
    expect(general).toContain('ab12cd34')
    expect(general).not.toMatch(/conexi[oó]n/i)
    expect(container.textContent).not.toContain('prisma')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('🔴 sin respuesta (status 0) habla de la conexión, dentro del modal', async () => {
    createCitaMock.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await montar()
    await llenar()
    await agendar()

    expect(q('cita-rechazo-general')?.textContent).toMatch(/conexi[oó]n/i)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('🔴 un 400 con campos: cada error bajo SU campo y el foco en el primero', async () => {
    const correo = 'Revisa el correo del contacto: debe tener la forma nombre@dominio.com.'
    const fecha = 'Elige un día válido para la visita (AAAA-MM-DD).'
    createCitaMock.mockRejectedValue(
      new ApiError(400, [fecha, correo], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [fecha, correo],
        campos: [
          { campo: 'date', regla: 'fecha', mensaje: fecha },
          { campo: 'contactEmail', regla: 'correo', mensaje: correo },
        ],
      }),
    )
    await montar()
    await llenar()
    await agendar()

    expect(errorDe('fecha')?.textContent).toBe(fecha)
    expect(errorDe('correo')?.textContent).toBe(correo)
    expect(q('cita-rechazo-general')).toBeNull()
    // El correo se ve antes que la fecha: ahí va el foco.
    expect(document.activeElement).toBe(container.querySelector('#cita-correo'))
    expect(container.querySelector('#cita-correo')?.getAttribute('aria-invalid')).toBe('true')
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('un correo mal escrito se dice antes de enviar, con la frase del back, y no deja agendar', async () => {
    await montar()
    await llenar()
    await act(async () => {
      escribir(container.querySelector<HTMLInputElement>('#cita-correo')!, 'ana@')
    })
    expect(errorDe('correo')?.textContent).toBe(
      'Revisa el correo del contacto: debe tener la forma nombre@dominio.com.',
    )
    expect(botonAgendar().disabled).toBe(true)
  })

  it('un 400 del back trae su motivo: va tal cual, arriba del pie', () => {
    expect(rechazoDeCita(new ApiError(400, 'La propiedad no pertenece a tu agencia'), 'genérico')).toEqual({
      campo: 'general',
      mensaje: 'La propiedad no pertenece a tu agencia',
    })
  })

  it('sesión vencida: nada encima del cierre de sesión', async () => {
    createCitaMock.mockRejectedValue(new ApiError(401, 'Tu sesión expiró.'))
    await montar()
    await llenar()
    await agendar()

    expect(q('cita-rechazo-general')).toBeNull()
    expect(errorDe('hora')).toBeNull()
    expect(errorDe('inmueble')).toBeNull()
  })

  it('con éxito: agenda, avisa y cierra', async () => {
    createCitaMock.mockResolvedValue({ id: 'v-1' })
    await montar()
    await llenar()
    await agendar()

    expect(createCitaMock).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 'p-libre', date: '2026-10-01', contactName: 'Ana Pérez' }),
    )
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('A7 — un doble clic no agenda dos citas', () => {
  it('dos clics antes del siguiente render: una sola llamada', async () => {
    createCitaMock.mockReturnValue(new Promise(() => {}))
    await montar()
    await llenar()

    await act(async () => {
      const b = botonAgendar()
      b.click()
      b.click()
    })

    expect(createCitaMock).toHaveBeenCalledTimes(1)
  })
})

/**
 * A5 — la modalidad tenía que tener respaldo.
 *
 * El selector ofrecía «Presencial» y «Virtual» siempre, sin mirar qué acepta el
 * inmueble. Ahora pregunta al elegirlo y ofrece sólo lo aceptado; si la
 * consulta no responde (o el inmueble no tiene horarios), ofrece las dos, que
 * es lo que hacía antes: una lectura que falló no puede quitarle opciones a
 * nadie, y el back sigue teniendo la última palabra.
 */
describe('A5 — sólo se ofrece la modalidad que el inmueble acepta', () => {
  it('un inmueble que sólo acepta virtual: la cita se manda VIRTUAL sin tocar el selector', async () => {
    createCitaMock.mockResolvedValue(undefined)
    disponibilidadMock.mockResolvedValue({
      windows: [],
      agendas: {},
      visitTypes: ['VIRTUAL'],
    })
    await montar()
    await llenar()
    await agendar()

    expect(createCitaMock).toHaveBeenCalledWith(
      expect.objectContaining({ visitType: 'VIRTUAL' }),
    )
  })

  it('un inmueble sin horarios cargados: ofrece las dos y lo dice', async () => {
    createCitaMock.mockResolvedValue(undefined)
    disponibilidadMock.mockResolvedValue({ windows: [], agendas: {}, visitTypes: [] })
    await montar()
    await llenar()

    expect(container.textContent).toContain('todavía no tiene horarios de visita cargados')
    await agendar()
    expect(createCitaMock).toHaveBeenCalledWith(
      expect.objectContaining({ visitType: 'IN_PERSON' }),
    )
  })

  it('si la consulta falla no se quita ninguna opción ni se muestra un error', async () => {
    createCitaMock.mockResolvedValue(undefined)
    disponibilidadMock.mockRejectedValue(new Error('se cayó'))
    await montar()
    await llenar()

    expect(container.textContent).not.toContain('todavía no tiene horarios')
    await agendar()
    expect(createCitaMock).toHaveBeenCalledWith(
      expect.objectContaining({ visitType: 'IN_PERSON' }),
    )
  })

  it('el 409 del back va al lado del selector de modalidad, no arriba del pie', () => {
    const r = rechazoDeCita(
      new ApiError(
        409,
        'Ese inmueble no se muestra por videollamada. Cambia la modalidad o ajusta sus horarios de visita.',
        'MODALIDAD_NO_ACEPTADA',
      ),
      'genérico',
    )
    expect(r?.campo).toBe('modalidad')
    expect(r?.mensaje).toContain('videollamada')
  })
})
