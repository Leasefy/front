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

/**
 * El selector es el `Combobox` del DS (Radix Popover adentro). Lo que se
 * prueba acá no es cómo se despliega un popover —eso es del design system—
 * sino a QUÉ endpoint manda esta fila según su estado, que es donde estuvo el
 * bug. Así que se cambia por un botón por propietario: el mismo contrato
 * (`onElegir(p)`), sin depender de las tripas de Radix en happy-dom.
 */
vi.mock('./SelectorDePropietario', () => ({
  SelectorDePropietario: ({
    propietarios,
    onElegir,
    disabled,
    testId,
  }: {
    propietarios: Array<{ id: string; name: string }>
    onElegir: (p: unknown) => void
    disabled?: boolean
    testId?: string
  }) => (
    <div data-testid={testId}>
      {propietarios.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          data-testid={`${testId}-elegir-${p.id}`}
          onClick={() => onElegir(p)}
        >
          {p.name}
        </button>
      ))}
    </div>
  ),
}))

import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
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
        propietarios={[JORGE]}
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
  const btn = $('[data-testid="propietario-fila-0-elegir-po-1"]') as HTMLButtonElement
  await act(async () => {
    btn.click()
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

  it('un porcentaje imposible se descarta y vuelve al que estaba', async () => {
    // 🔴 El clamp del DS no corre acá: `PercentInput` hace el spread de
    // `...props` DESPUÉS de sus manejadores, así que nuestro `onBlur`
    // reemplaza al suyo. Sin esta validación propia, escribir 150 guardaba
    // 150 — un ciento cincuenta por ciento de comisión, escrito de verdad en
    // la consignación. Se DESCARTA en vez de topar: un 150 mal tecleado no es
    // una intención de cobrar el 100%.
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

  it('salir del campo sin cambiar nada no manda nada', async () => {
    montar({
      propietario: { id: 'po-1', nombre: 'Jorge', documento: '712' },
      comisionPorcentaje: 9,
      faltantes: [],
      estado: 'LISTO',
    })

    await escribirComision('9')

    expect(contractsApi.migracion.corregirPropietario).not.toHaveBeenCalled()
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
      ($('[data-testid="propietario-fila-0-elegir-po-1"]') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  /**
   * 2026-09-02 — el hueco de «Crear los N inmuebles que faltan» sobre un
   * archivo sin propietario: la fila queda activada, con inmueble, sin
   * propietario, y el selector estaba apagado. El contrato existe y no cobra.
   */
  it('activada CON inmueble y SIN propietario: lo dice, deja elegirlo y lo registra (primer propietario)', async () => {
    vi.mocked(contractsApi.migracion.registrarPropietario).mockResolvedValue(
      fila({ estado: 'ACTIVADO', faltantes: [], contractId: 'ct-1', propietarioId: 'po-1' }),
    )
    const { onActualizada, onCambio } = montar({
      estado: 'ACTIVADO',
      faltantes: [],
      contractId: 'ct-1',
      propietario: null,
    })

    expect($('[data-testid="pastilla-sin-propietario"]')?.textContent).toContain('sin propietario')
    expect($('[data-testid="activada-sin-propietario"]')?.textContent).toMatch(/no genera cobros/i)
    // Se puede seleccionar para el masivo «Mismo propietario».
    expect($('[role="checkbox"]')).not.toBeNull()
    expect(
      ($('[data-testid="propietario-fila-0-elegir-po-1"]') as HTMLButtonElement).disabled,
    ).toBe(false)

    await elegirAJorge()

    // Primer propietario ⇒ registrar (crea o reusa la ficha), nunca corregir.
    expect(contractsApi.migracion.registrarPropietario).toHaveBeenCalledWith(
      'f-1',
      expect.objectContaining({ nombre: 'Jorge Restrepo', documento: '71234567' }),
    )
    expect(contractsApi.migracion.corregirPropietario).not.toHaveBeenCalled()
    expect(onActualizada).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'ACTIVADO',
        propietario: expect.objectContaining({ id: 'po-1' }),
      }),
    )
    expect(onCambio).toHaveBeenCalled()
  })

  it('activada SIN inmueble no ofrece propietario: primero el inmueble', () => {
    montar({ estado: 'ACTIVADO', faltantes: [], contractId: 'ct-1', propertyId: null, propietario: null })

    expect($('[data-testid="propietario-sin-inmueble"]')).not.toBeNull()
    expect($('[data-testid="activada-sin-propietario"]')).toBeNull()
    expect($('[role="checkbox"]')).toBeNull()
  })
})

/**
 * Por qué camino quedó pegado el inmueble (back `48e30bb`).
 *
 * Un `propertyId` es un uuid: no dice si el contrato quedó pegado por el
 * código exacto de la inmobiliaria o porque dos direcciones se parecían. Al
 * revisar, esas dos cosas no merecen la misma atención — y la segunda es
 * justamente la que hay que mirar.
 */
describe('<FilaDeRevision> — cómo quedó pegado el inmueble', () => {
  const asociacion = (
    asociadoPor: 'codigo' | 'direccion' | 'manual' | 'ninguno',
    codigo: string | null = null,
  ): FilaDeMigracion['asociacion'] => ({
    inmueble: { asociadoPor, codigo, direccion: 'Calle 75 # 57-31', propertyId: 'prop-1' },
    propietario: { asociadoPor: 'ninguno', documento: null, nombre: null, id: null, cuantos: 0 },
    inquilino: { asociadoPor: 'documento', documento: '71211270', nombre: 'X', id: null, cuantos: 1 },
    escenario: [],
    historico: false,
  })

  it('por código lo dice, con el código', () => {
    montar({ asociacion: asociacion('codigo', '2945') })
    expect($('[data-testid="asociacion-codigo"]')?.textContent).toContain('2945')
  })

  it('por dirección avisa que es un parecido, no una certeza', () => {
    montar({ asociacion: asociacion('direccion') })
    expect($('[data-testid="asociacion-direccion"]')?.textContent).toContain(
      'vale la pena mirarlo',
    )
  })

  it('elegido a mano se distingue de los dos automáticos', () => {
    montar({ asociacion: asociacion('manual') })
    expect($('[data-testid="asociacion-manual"]')).toBeTruthy()
  })

  /*
   * 🔴 Sin el dato (una fila preparada antes de que el back lo mandara) no se
   * escribe nada: afirmar «ninguno» sería contestar por el back.
   */
  it('sin el dato del back no dibuja ninguna línea', () => {
    montar()
    for (const camino of ['codigo', 'direccion', 'manual', 'ninguno']) {
      expect($(`[data-testid="asociacion-${camino}"]`), camino).toBeNull()
    }
  })

  it('«ninguno» tampoco escribe una línea: lo dicen los faltantes de abajo', () => {
    montar({ asociacion: asociacion('ninguno') })
    expect($('[data-testid="asociacion-ninguno"]')).toBeNull()
  })
})

/*
 * Varios dueños con su % (Nico, 2026-09-13): la fila muestra, ANTES de
 * activar, cómo va a quedar repartido el mandato. Lo arma el back en
 * `asociacion.propietario.reparto`; en QA en vivo no se pudo ver porque la
 * cola de preparación la toman otros backs de la máquina, así que se fija acá.
 */
describe('<FilaDeRevision> — el reparto entre los dueños', () => {
  const conReparto = (reparto: unknown): Partial<FilaDeMigracion> => ({
    asociacion: {
      inmueble: { asociadoPor: 'codigo', codigo: '77001', direccion: 'Calle 10', propertyId: 'prop-1' },
      propietario: {
        asociadoPor: 'documento',
        documento: '43090971',
        nombre: 'LUZ ADRIANA',
        id: 'po-1',
        cuantos: 2,
        reparto,
      },
      inquilino: { asociadoPor: 'correo', documento: null, nombre: 'Claudia', id: null, cuantos: 1 },
      escenario: [],
      historico: false,
    } as FilaDeMigracion['asociacion'],
  })

  it('muestra cada dueño con su % y su plata, y dice que el reparto es del archivo', () => {
    montar(
      conReparto({
        explicito: true,
        problema: null,
        duenos: [
          { documento: '43090971', nombre: 'LUZ ADRIANA', bps: 4100, canon: 451000 },
          { documento: '42979803', nombre: 'MARIA VICTORIA', bps: 5900, canon: 649000 },
        ],
      }),
    )
    const bloque = document.querySelector('[data-testid="reparto-de-duenos"]')
    expect(bloque?.textContent).toContain('2 dueños · reparto del archivo')
    const filas = [...document.querySelectorAll('[data-testid="dueno-del-reparto"]')].map((li) =>
      (li.textContent ?? '').replace(/\s+/g, ' '),
    )
    expect(filas[0]).toContain('LUZ ADRIANA')
    expect(filas[0]).toContain('41 %')
    expect(filas[0]).toMatch(/451\.000/)
    expect(filas[1]).toContain('59 %')
  })

  it('en partes iguales lo dice, para que no se lea como un dato del archivo', () => {
    montar(
      conReparto({
        explicito: false,
        problema: null,
        duenos: [
          { documento: '1', nombre: 'A', bps: 5000, canon: 550000 },
          { documento: '2', nombre: 'B', bps: 5000, canon: 550000 },
        ],
      }),
    )
    expect(document.querySelector('[data-testid="reparto-de-duenos"]')?.textContent).toContain(
      'partes iguales',
    )
  })

  it('si no cuadra, los dueños se ven SIN un % inventado', () => {
    montar(
      conReparto({
        explicito: false,
        problema: 'Los valores de «Valor Canon» suman $1.100.000 y el canon del contrato es $1.500.000',
        duenos: [
          { documento: '1', nombre: 'A', bps: null, canon: 451000 },
          { documento: '2', nombre: 'B', bps: null, canon: 649000 },
        ],
      }),
    )
    const texto = document.querySelector('[data-testid="reparto-de-duenos"]')?.textContent ?? ''
    expect(texto).toContain('el reparto no cuadra')
    expect(texto).not.toMatch(/\d+ %/)
  })

  it('con un solo dueño, o sin el dato del back, no dibuja nada', () => {
    montar()
    expect(document.querySelector('[data-testid="reparto-de-duenos"]')).toBeNull()
  })
})
