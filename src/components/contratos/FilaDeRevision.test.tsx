/**
 * La fila de revisión — lo que hay que ver ANTES de que exista un contrato.
 *
 * El defecto que originó esta pantalla: la migración asociaba los propietarios
 * sola, mostraba «Consignando… 13 de 90» en un toast, y al terminar ofrecía
 * «Activar 90 contratos». Los 90 contratos no se veían nunca — ni a quién
 * quedó consignado cada uno, ni con qué porcentaje.
 *
 * Lo que se protege acá son las tres cosas que, si se rompen, mandan la plata
 * a la persona equivocada sin un solo error en pantalla:
 *
 *  1. Corregir un propietario **reapunta** la consignación; no crea una ficha
 *     nueva. El endpoint es distinto según si la fila ya está consignada, y
 *     elegir mal el camino es exactamente el bug que esto arregla.
 *  2. El porcentaje no se puede tocar antes de consignar — no hay dónde
 *     escribirlo, y aceptarlo sería perderlo en silencio.
 *  3. Un error de guardado se queda EN la fila.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/inmobiliaria.service')
  >('@/lib/api/inmobiliaria.service')
  return {
    ...actual,
    propietariosApi: { ...actual.propietariosApi, getAll: vi.fn() },
  }
})

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/contracts.service')
  >('@/lib/api/contracts.service')
  return {
    ...actual,
    contractsApi: {
      migracion: {
        resolver: vi.fn(),
        crearInmueble: vi.fn(),
        registrarPropietario: vi.fn(),
        corregirPropietario: vi.fn(),
      },
    },
  }
})

import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import { propietariosApi } from '@/lib/api/inmobiliaria.service'
import type { Propietario } from '@/lib/types/inmobiliaria'
import { FilaDeRevision } from './FilaDeRevision'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const JORGE = {
  id: 'po-1',
  name: 'Jorge Restrepo',
  documentNumber: '71234567',
  email: 'jorge@correo.co',
  phone: '3105551234',
} as unknown as Propietario

function fila(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 0,
    datos: {
      direccion: 'Calle 75 # 57-31',
      inquilino: { nombre: 'Claudia Rodríguez', correo: 'c@x.co' },
      monthlyRent: 2_400_000,
    },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: ['propietario'],
    contractId: null,
    propietario: null,
    comisionPorcentaje: null,
    ...over,
  }
}

function montar(over: Partial<FilaDeMigracion> = {}, props = {}) {
  const onActualizada = vi.fn()
  const onCambio = vi.fn()
  act(() => {
    root.render(
      <FilaDeRevision
        fila={fila(over)}
        seleccionada={false}
        onSeleccion={() => {}}
        onActualizada={onActualizada}
        onCambio={onCambio}
        {...props}
      />,
    )
  })
  return { onActualizada, onCambio }
}

const $ = (sel: string) => container.querySelector(sel) as HTMLElement | null

async function elegirAJorge() {
  vi.mocked(propietariosApi.getAll).mockResolvedValue([JORGE])
  await act(async () => {
    $('[data-testid="propietario-fila-0"]')?.click()
  })
  const input = $('[data-testid="propietario-fila-0-buscar"]') as HTMLInputElement
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!
    setter.call(input, 'jor')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 400))
  })
  const opcion = container.querySelector(
    '[data-testid="propietario-fila-0-opciones"] button',
  ) as HTMLButtonElement
  await act(async () => {
    opcion.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<FilaDeRevision> — a quién se le consigna', () => {
  it('muestra lo que hay que mirar: inquilino, dirección, canon y propietario', () => {
    montar({
      propietario: { id: 'po-1', nombre: 'Jorge Restrepo', documento: '71234567' },
      comisionPorcentaje: 9,
      faltantes: [],
      estado: 'LISTO',
    })

    expect(container.textContent).toContain('Claudia Rodríguez')
    expect(container.textContent).toContain('Calle 75 # 57-31')
    expect(container.textContent).toContain('Jorge Restrepo')
    expect(container.textContent).toMatch(/2[.,]400[.,]000/)
    expect(
      ($('[data-testid="comision-fila-0"]') as HTMLInputElement).value,
    ).toBe('9')
  })

  it('sin canon dice «Sin canon», no «$ 0»', () => {
    // `formatCurrency(undefined)` pinta «$ 0», que se leería como un canon de
    // cero en vez de un canon que el archivo no traía.
    montar({ datos: { direccion: 'x', inquilino: { nombre: 'a', correo: 'a@x.co' } } })

    expect(container.textContent).toContain('Sin canon')
    expect(container.textContent).not.toContain('$ 0')
  })

  it('una fila SIN consignar usa registrarPropietario: crea o reusa la ficha', async () => {
    vi.mocked(contractsApi.migracion.registrarPropietario).mockResolvedValue(
      fila({ estado: 'LISTO', faltantes: [] }),
    )
    const { onActualizada } = montar()

    await elegirAJorge()

    expect(contractsApi.migracion.registrarPropietario).toHaveBeenCalledWith(
      'f-1',
      expect.objectContaining({ nombre: 'Jorge Restrepo', documento: '71234567' }),
    )
    expect(contractsApi.migracion.corregirPropietario).not.toHaveBeenCalled()
    // El nombre elegido se pega a la fila devuelta: el back recalcula la fila
    // pero no arma el bloque de propietario, y sin esto la tabla mostraría
    // «Elegir propietario…» justo después de haberlo elegido.
    expect(onActualizada).toHaveBeenCalledWith(
      expect.objectContaining({
        propietario: { id: 'po-1', nombre: 'Jorge Restrepo', documento: '71234567' },
      }),
    )
  })

  it('una fila YA consignada usa corregirPropietario: reapunta, no duplica', async () => {
    // 🔴 El corazón del arreglo. `registrarPropietario` sobre un inmueble ya
    // consignado NO cambia el propietario (lo deja intacto a propósito): si
    // esta fila llamara ahí, corregir una asociación equivocada no haría nada
    // y encima dejaría una ficha suelta.
    vi.mocked(contractsApi.migracion.corregirPropietario).mockResolvedValue(
      fila({ estado: 'LISTO', faltantes: [] }),
    )
    montar({
      propietario: { id: 'po-otro', nombre: 'Otra Persona', documento: '99999' },
      comisionPorcentaje: 9,
      faltantes: [],
      estado: 'LISTO',
    })

    await elegirAJorge()

    expect(contractsApi.migracion.corregirPropietario).toHaveBeenCalledWith('f-1', {
      propietarioId: 'po-1',
    })
    expect(contractsApi.migracion.registrarPropietario).not.toHaveBeenCalled()
  })

  it('sin inmueble no ofrece el selector: la consignación es del inmueble', () => {
    montar({ propertyId: null, faltantes: ['inmueble'] })

    expect($('[data-testid="propietario-sin-inmueble"]')).toBeTruthy()
    expect($('[data-testid="propietario-fila-0"]')).toBeNull()
  })

  it('un fallo al guardar se queda EN la fila, no en un toast', async () => {
    vi.mocked(contractsApi.migracion.registrarPropietario).mockRejectedValue(
      new Error('Ese inmueble ya tiene consignación'),
    )
    montar()

    await elegirAJorge()

    expect($('[data-testid="error-de-fila"]')?.textContent).toContain(
      'Ese inmueble ya tiene consignación',
    )
  })
})

describe('<FilaDeRevision> — la comisión', () => {
  const escribirComision = async (v: string) => {
    const input = $('[data-testid="comision-fila-0"]') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // React mapea `onBlur` al `focusout` nativo (que sí burbujea), no al
    // `blur`: despachar `blur` no dispara nada y el test pasaría por otra
    // razón que la que cree.
    await act(async () => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('se guarda al salir del campo, no en cada tecla', async () => {
    // Guardar por tecla manda una petición por dígito, y «12» pasa por «1» —
    // un uno por ciento escrito de verdad en la consignación.
    vi.mocked(contractsApi.migracion.corregirPropietario).mockResolvedValue(
      fila({ estado: 'LISTO', faltantes: [] }),
    )
    montar({
      propietario: { id: 'po-1', nombre: 'Jorge', documento: '712' },
      comisionPorcentaje: 9,
      faltantes: [],
      estado: 'LISTO',
    })

    await escribirComision('12')

    expect(contractsApi.migracion.corregirPropietario).toHaveBeenCalledTimes(1)
    expect(contractsApi.migracion.corregirPropietario).toHaveBeenCalledWith('f-1', {
      comisionPorcentaje: 12,
    })
  })

  it('un valor imposible se descarta y vuelve al que estaba', async () => {
    montar({
      propietario: { id: 'po-1', nombre: 'Jorge', documento: '712' },
      comisionPorcentaje: 9,
      faltantes: [],
      estado: 'LISTO',
    })

    await escribirComision('150')

    expect(contractsApi.migracion.corregirPropietario).not.toHaveBeenCalled()
    expect(
      ($('[data-testid="comision-fila-0"]') as HTMLInputElement).value,
    ).toBe('9')
  })

  it('está apagada mientras el inmueble no esté consignado', () => {
    montar()

    expect(
      ($('[data-testid="comision-fila-0"]') as HTMLInputElement).disabled,
    ).toBe(true)
    expect(container.textContent).toMatch(/cuando el inmueble esté consignado/i)
  })
})

describe('<FilaDeRevision> — una fila ya activada', () => {
  it('no se puede editar: el contrato existe y se edita desde el contrato', () => {
    montar({
      estado: 'ACTIVADO',
      faltantes: [],
      propietario: { id: 'po-1', nombre: 'Jorge', documento: '712' },
      comisionPorcentaje: 9,
    })

    expect(container.textContent).toContain('Ya activado')
    expect(
      ($('[data-testid="comision-fila-0"]') as HTMLInputElement).disabled,
    ).toBe(true)
    expect(
      ($('[data-testid="propietario-fila-0"]') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
