/**
 * La bandeja de listas restrictivas, con la corrección de Nico (18-09-2026).
 *
 * Lo que fija este test, que es lo que cambió de raíz:
 *   · un tercero `SIN_VERIFICAR` **no** se pinta como bloqueado — opera, y por
 *     eso su insignia no es roja;
 *   · la bandeja dice CUÁNTOS son y por qué, y ofrece volver a revisarlos;
 *   · sin lista cargada el vacío NO dice «no hay consultas», dice que mientras
 *     no haya lista nada se compara. Es el dato accionable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { api, permisos } = vi.hoisted(() => ({
  api: {
    listas: (() => Promise.resolve(null)) as () => Promise<unknown>,
    cargadas: (() => Promise.resolve(null)) as () => Promise<unknown>,
    revisar: vi.fn(async () => ({
      revisados: 3,
      bloqueados: 1,
      liberados: 2,
    })),
  },
  permisos: { edit: true },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    captacionApi: {
      listas: () => api.listas(),
      listasCargadas: () => api.cargadas(),
      revisarSinVerificar: api.revisar,
    },
  }
})
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    canAccess: (_m: string, a: string) => (a === 'edit' ? permisos.edit : true),
  }),
}))

import { ListasClient } from './ListasClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const SIN_LISTA = {
  disponible: true,
  motivo: null,
  hayListaCargada: false,
  sinVerificar: 4,
  consultas: [
    {
      id: 'c-1',
      terceroTipo: 'PROPIETARIO',
      nombre: 'Juan Pérez',
      documento: '1017234567',
      proveedor: 'LISTAS_CARGADAS',
      resultado: 'SIN_LISTA' as const,
      estado: 'SIN_VERIFICAR' as const,
      coincidencias: null,
      motivoDeLaRevision: null,
      createdAt: '2026-09-18T10:00:00.000Z',
    },
  ],
}

const CON_COINCIDENCIA = {
  ...SIN_LISTA,
  hayListaCargada: true,
  sinVerificar: 0,
  consultas: [
    {
      ...SIN_LISTA.consultas[0],
      id: 'c-2',
      resultado: 'COINCIDENCIA' as const,
      estado: 'BLOQUEADO' as const,
      coincidencias: [
        { lista: 'OFAC', nombreEnLaLista: 'J PEREZ', parecido: 90 },
      ],
    },
  ],
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(<ListasClient />)
  })
}
const $ = (sel: string) => contenedor.querySelector(sel)

beforeEach(() => {
  api.listas = vi.fn(() => Promise.resolve(SIN_LISTA))
  api.cargadas = vi.fn(() =>
    Promise.resolve({ disponible: true, motivo: null, listas: [] }),
  )
  api.revisar.mockClear()
  permisos.edit = true
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => {
    root!.unmount()
  })
  root = null
  contenedor.remove()
})

describe('ListasClient', () => {
  it('🔴 la bandeja dice cuántos y por qué, arriba de todo', async () => {
    await pintar()
    const bandeja = $('[data-testid="bandeja-sin-verificar"]')?.textContent ?? ''
    expect(bandeja).toContain('4 terceros sin verificar')
    expect(bandeja).toContain('antes de que hubiera ninguna lista cargada')
  })

  it('🔴 un SIN_VERIFICAR no se pinta como bloqueado: opera', async () => {
    await pintar()
    const fila = $('[data-testid="consulta-c-1"]')?.textContent ?? ''
    expect(fila).toContain('Sin verificar')
    expect(fila).not.toContain('Bloqueado')
    expect(fila).toContain('No había ninguna lista cargada')
  })

  it('con lista cargada, el motivo de la bandeja cambia', async () => {
    api.listas = vi.fn(() =>
      Promise.resolve({ ...SIN_LISTA, hayListaCargada: true }),
    )
    await pintar()
    expect($('[data-testid="bandeja-sin-verificar"]')?.textContent).toContain(
      'La consulta falló',
    )
  })

  it('«volver a revisar» cuenta qué pasó', async () => {
    await pintar()
    await act(async () => {
      contenedor
        .querySelector<HTMLElement>('[data-testid="revisar-sin-verificar"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(api.revisar).toHaveBeenCalled()
    expect($('[data-testid="resultado-revision"]')?.textContent).toContain(
      '1 quedaron bloqueados',
    )
  })

  it('🔴 una COINCIDENCIA sí bloquea, y CON QUÉ coincide se lee en su cajón', async () => {
    api.listas = vi.fn(() => Promise.resolve(CON_COINCIDENCIA))
    await pintar()
    const fila = $('[data-testid="consulta-c-2"]') as HTMLElement
    // La fila dice el veredicto…
    expect(fila.textContent).toContain('Bloqueado')
    // Y sin nada en la bandeja, la bandeja no se muestra.
    expect($('[data-testid="bandeja-sin-verificar"]')).toBeNull()

    /*
     * 🔴 22-09 · Con qué coincide dejó de estar escrito en la fila y pasó al
     * cajón, junto con la DECISIÓN. Antes la fila prometía «un administrador
     * la revisa» y no había dónde revisarla: `revisarConsulta` estaba en el
     * cliente y no la llamaba nadie.
     */
    await act(async () => {
      fila.click()
    })
    const cajon = document.querySelector('[data-testid="cajon-de-la-consulta"]')!
    expect(cajon).not.toBeNull()
    expect(cajon.textContent).toContain('OFAC')
    // Y las dos salidas existen, que es lo que faltaba.
    expect(document.querySelector('[data-testid="liberar-consulta"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="confirmar-en-lista"]')).not.toBeNull()
  })

  it('🔴 sin lista cargada lo dice ARRIBA: no se está comprobando a nadie', async () => {
    await pintar()
    // La frase del encabezado es la que tiene que decirlo: antes esto vivía
    // dentro del vacío de la segunda tarjeta, 800 px más abajo.
    const estado = $('[data-testid="estado-de-las-listas"]')!
    expect(estado.textContent).toContain('no se está comprobando a nadie')
    expect(estado.textContent).toContain('sin verificar')
  })

  it('🔴 «cargar una lista» existe: la pantalla lo pedía y no había dónde', async () => {
    await pintar()
    expect($('[data-testid="abrir-cargar-lista"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="cajon-de-la-lista"]')).toBeNull()

    await act(async () => {
      ($('[data-testid="abrir-cargar-lista"]') as HTMLElement).click()
    })
    const cajon = document.querySelector('[data-testid="cajon-de-la-lista"]')!
    expect(cajon).not.toBeNull()
    expect(cajon.querySelector('[data-testid="lista-archivo"]')).not.toBeNull()
  })

  it('sin permiso de edición no ofrece revisar', async () => {
    permisos.edit = false
    await pintar()
    expect($('[data-testid="revisar-sin-verificar"]')).toBeNull()
  })
})
