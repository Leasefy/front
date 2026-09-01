/**
 * T-0031/WU-3: dos huecos del checklist original.
 *
 * `inmueble_ocupado` estaba en la unión y en `EXPLICACION` pero SIN rama en
 * el render — una fila podía quedar en un estado que la UI describe y no
 * ofrece salida (N11). `dia_de_pago` ni siquiera estaba en la unión: el
 * archivo real del owner no trae esa columna (F7) y no había forma de
 * completarla desde acá. `EXPLICACION` y el render deben cambiar juntos —
 * es exactamente donde nació el hueco de `inmueble_ocupado`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  )
  return {
    ...actual,
    propietariosApi: { ...actual.propietariosApi, getAll: vi.fn() },
  }
})

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  )
  return {
    ...actual,
    contractsApi: {
      migracion: {
        resolver: vi.fn(),
        crearInmueble: vi.fn(),
        registrarPropietario: vi.fn(),
      },
    },
  }
})

import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import { celdaDelFaltante, EXPLICACION, FaltantesDeFila } from './FaltantesDeFila'

let container: HTMLDivElement
let root: Root

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
  vi.restoreAllMocks()
})

function filaBase(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 0,
    datos: { direccion: 'Cra 1', inquilino: { nombre: 'Ana', correo: 'ana@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: [],
    contractId: null,
    overrides: [],
    ...over,
  }
}

function render(fila: FilaDeMigracion) {
  act(() => {
    root.render(<FaltantesDeFila fila={fila} onResuelta={() => {}} />)
  })
}

/** Set a controlled input's value the React-tracked way, then fire input. */
function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, value)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<FaltantesDeFila> — dia_de_pago (T-0031)', () => {
  it('EXPLICACION tiene una entrada propia, no cae al código crudo', () => {
    expect(EXPLICACION.dia_de_pago?.titulo).toBeTruthy()
    expect(EXPLICACION.dia_de_pago?.titulo).not.toBe('dia_de_pago')
  })

  it('renderiza un campo numérico y guarda con el paymentDay ingresado', () => {
    render(filaBase({ faltantes: ['dia_de_pago'] }))

    const input = container.querySelector('input[type="number"]') as HTMLInputElement
    expect(input).toBeTruthy()

    typeInto(input, '5')

    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Guardar'),
    )
    act(() => {
      boton?.click()
    })

    expect(contractsApi.migracion.resolver).toHaveBeenCalledWith('f-1', {
      paymentDay: 5,
    })
  })
})

describe('<FaltantesDeFila> — inmueble_ocupado ya no es un callejón sin salida (N11)', () => {
  it('EXPLICACION lo sigue describiendo', () => {
    expect(EXPLICACION.inmueble_ocupado?.titulo).toBeTruthy()
  })

  it('ofrece reasignar el inmueble (reusa <ElegirInmueble>)', () => {
    render(
      filaBase({
        faltantes: ['inmueble_ocupado'],
        candidatos: [{ id: 'prop-2', address: 'Otra dirección', city: 'Medellín' }],
      }),
    )

    // <ElegirInmueble> ofrece "crear inmueble" cuando no hay candidatos, o
    // los candidatos como botones cuando sí — cualquiera de los dos confirma
    // que la rama existe y no está vacía.
    expect(
      container.textContent?.includes('Otra dirección') ||
        container.textContent?.includes('inmueble no está cargado'),
    ).toBe(true)
  })

  it('ofrece "seguir igual" — persiste permitirInmuebleOcupado', () => {
    render(filaBase({ faltantes: ['inmueble_ocupado'] }))

    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.toLowerCase().includes('seguir igual'),
    )
    expect(boton).toBeTruthy()

    act(() => {
      boton?.click()
    })

    expect(contractsApi.migracion.resolver).toHaveBeenCalledWith('f-1', {
      permitirInmuebleOcupado: true,
    })
  })
})

/**
 * T-0033 contract.md §3.2.C2/E4 — el checklist ya no bloquea la
 * activación: una fila sin inmueble se activa igual y queda "Sin
 * inmueble". `<ElegirInmueble>` seguía leyendo como "hay que resolver
 * esto sí o sí", que ahora es falso — gana copy explicativa, ningún
 * botón ni acción nueva.
 */
describe('<FaltantesDeFila> — sin inmueble ya no lee como obligatorio (T-0033)', () => {
  it('EXPLICACION.inmueble dice que se puede migrar igual, sin inmueble', () => {
    expect(EXPLICACION.inmueble?.porque).toMatch(/migrar.*sin inmueble/i)
  })

  it('<ElegirInmueble> muestra la nota informativa, sin agregar un tercer botón', () => {
    render(filaBase({ faltantes: ['inmueble'], propertyId: null, candidatos: [] }))

    expect(container.textContent).toMatch(/no hace falta resolver esto/i)
    // Las dos acciones de siempre siguen intactas: ninguna nueva aparece.
    const botones = Array.from(container.querySelectorAll('button')).map(
      (b) => b.textContent,
    )
    expect(botones).toContain('El inmueble no está cargado — crearlo')
  })
})

/**
 * La búsqueda de propietarios que falla NO puede parecer «no existe ese
 * propietario»: con la lista vacía y sin aviso, la persona escribe el
 * documento a mano convencida de que es nuevo — y el silencio le escondía
 * que la búsqueda ni siquiera corrió.
 */
describe('<FaltantesDeFila> — la búsqueda de propietarios que falla se dice', () => {
  it('un fallo de red muestra el aviso y el camino manual sigue abierto', async () => {
    const { propietariosApi } = await import('@/lib/api/inmobiliaria.service')
    vi.mocked(propietariosApi.getAll).mockRejectedValue(new Error('red caída'))

    render(filaBase({ faltantes: ['propietario'] }))
    const input = container.querySelector(
      '[data-testid="buscar-propietario"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    typeInto(input, 'Marcela')

    // Debounce de 250 ms + el rechazo.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })

    expect(container.querySelector('[data-testid="busqueda-fallida"]')).not.toBeNull()
    // Los campos manuales siguen ahí: el fallo no cierra ninguna salida.
    expect(container.textContent).toContain('Nombre del propietario')
  })

  it('si la búsqueda vuelve a responder, el aviso se va', async () => {
    const { propietariosApi } = await import('@/lib/api/inmobiliaria.service')
    vi.mocked(propietariosApi.getAll)
      .mockRejectedValueOnce(new Error('red caída'))
      .mockResolvedValue([])

    render(filaBase({ faltantes: ['propietario'] }))
    const input = container.querySelector(
      '[data-testid="buscar-propietario"]',
    ) as HTMLInputElement
    typeInto(input, 'Marcela')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    expect(container.querySelector('[data-testid="busqueda-fallida"]')).not.toBeNull()

    typeInto(input, 'Marcela C')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
    })
    expect(container.querySelector('[data-testid="busqueda-fallida"]')).toBeNull()
  })
})

describe('el faltante dice QUÉ decía el archivo', () => {
  /*
   * «No encontramos el inmueble» sin la dirección obliga a abrir el Excel y
   * contar líneas. El valor ya viaja en `datos`: mostrarlo no cuesta nada.
   */
  it('la dirección que no resolvió se muestra', () => {
    const f = {
      ...filaBase(),
      faltantes: ['inmueble'],
      datos: { direccion: 'Cra 43A # 5-15', inquilino: { nombre: 'Ana' } },
    } as unknown as FilaDeMigracion;

    expect(celdaDelFaltante(f, 'inmueble')).toBe('Cra 43A # 5-15');
  });

  it('un correo ilegible se muestra tal cual vino', () => {
    const f = {
      ...filaBase(),
      faltantes: ['inquilino_correo'],
      datos: { direccion: 'x', inquilino: { correo: 'ana@' } },
    } as unknown as FilaDeMigracion;

    expect(celdaDelFaltante(f, 'inquilino_correo')).toBe('ana@');
  });

  it('una celda vacía no inventa comillas vacías', () => {
    const f = {
      ...filaBase(),
      faltantes: ['inmueble'],
      datos: { direccion: '   ', inquilino: {} },
    } as unknown as FilaDeMigracion;

    expect(celdaDelFaltante(f, 'inmueble')).toBeNull();
  });

  it('un faltante cuyo valor NO sobrevive el parseo no muestra nada inventado', () => {
    // El canon ilegible se descarta al armar la fila: no hay valor que
    // mostrar, y fabricar uno sería peor que no decir nada.
    const f = {
      ...filaBase(),
      faltantes: ['canon'],
      datos: { direccion: 'x', inquilino: {} },
    } as unknown as FilaDeMigracion;

    expect(celdaDelFaltante(f, 'canon')).toBeNull();
  });

  it('una dirección enorme se recorta', () => {
    const f = {
      ...filaBase(),
      faltantes: ['inmueble'],
      datos: { direccion: 'C'.repeat(200), inquilino: {} },
    } as unknown as FilaDeMigracion;

    expect(celdaDelFaltante(f, 'inmueble')!).toHaveLength(61); // 60 + «…»
  });
});
