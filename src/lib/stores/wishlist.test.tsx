/**
 * El corazón AVISA, y no miente sobre dónde quedó guardado.
 *
 * Nico (2026-09-04): «¿ese corazón de favorito sí se le ve reflejado en el
 * panel de inquilinos cuando le dan clic? […] porque toast ninguno de los dos
 * da». Antes sólo salía un toast cuando FALLABA, así que el caso normal —el
 * que le pasa a todo el mundo— era mudo. Y para quien no es inquilino
 * autenticado el favorito vive SÓLO en el localStorage de ese navegador: nunca
 * aparece en `/inquilino/guardados`, y decirle «guardado» a secas es prometerle
 * algo que no va a pasar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let authState: {
  isAuthenticated: boolean
  isLoading: boolean
  user: { role?: string } | null
}
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }))

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({ getMine: vi.fn(), add: vi.fn(), remove: vi.fn() }))
vi.mock('@/lib/api/wishlists.service', () => ({ wishlistsApi: api }))

// Sin I18nProvider, que es justo el caso real: el WishlistProvider vive en el
// root layout, por encima de cualquier provider de route-group.
vi.mock('@/lib/i18n', () => ({ useOptionalI18n: () => undefined }))

import { WishlistProvider, useWishlist } from './wishlist'

let container: HTMLDivElement
let root: Root
let store: ReturnType<typeof useWishlist>

function Sonda() {
  store = useWishlist()
  return null
}

async function montar() {
  await act(async () => {
    root.render(
      <WishlistProvider>
        <Sonda />
      </WishlistProvider>,
    )
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  localStorage.clear()
  authState = { isAuthenticated: false, isLoading: false, user: null }
  toast.mockClear()
  toast.success.mockClear()
  toast.error.mockClear()
  api.getMine.mockReset().mockResolvedValue([])
  api.add.mockReset().mockResolvedValue(undefined)
  api.remove.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const comoInquilino = () => {
  authState = { isAuthenticated: true, isLoading: false, user: { role: 'tenant' } }
}

describe('favoritos — la señal al dar clic', () => {
  it('un inquilino autenticado guarda EN SU CUENTA y se le dice así', async () => {
    comoInquilino()
    await montar()

    await act(async () => store.toggleWishlist('p1'))

    expect(api.add).toHaveBeenCalledWith('p1')
    expect(store.isWishlisted('p1')).toBe(true)
    expect(toast.success).toHaveBeenCalledTimes(1)
    const [titulo, opciones] = toast.success.mock.calls[0]
    expect(String(titulo)).toContain('tus favoritos')
    // Nada de «iniciá sesión»: ya la tiene.
    expect(opciones).toBeUndefined()
  })

  it('sin ser inquilino, el toast dice que quedó SÓLO en este navegador', async () => {
    await montar()

    await act(async () => store.toggleWishlist('p1'))

    // No hay a dónde mandarlo: no se llama al back.
    expect(api.add).not.toHaveBeenCalled()
    expect(store.isWishlisted('p1')).toBe(true)
    const [titulo, opciones] = toast.success.mock.calls[0]
    expect(String(titulo)).toContain('este navegador')
    expect(String((opciones as { description?: string }).description)).toContain('inquilino')
  })

  it('quitar también avisa, y con otro texto', async () => {
    comoInquilino()
    await montar()

    await act(async () => store.toggleWishlist('p1'))
    toast.success.mockClear()
    toast.mockClear()

    await act(async () => store.toggleWishlist('p1'))

    expect(api.remove).toHaveBeenCalledWith('p1')
    expect(store.isWishlisted('p1')).toBe(false)
    expect(String(toast.mock.calls[0][0])).toContain('quitamos')
  })

  it('si el back rechaza el favorito, se revierte y se avisa el error', async () => {
    comoInquilino()
    api.add.mockRejectedValueOnce(new Error('boom'))
    await montar()

    await act(async () => {
      store.toggleWishlist('p1')
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(store.isWishlisted('p1')).toBe(false)
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('un clic manda UNA sola vez al back (los efectos ya no viven dentro del updater)', async () => {
    comoInquilino()
    await montar()

    await act(async () => store.toggleWishlist('p1'))

    expect(api.add).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it('cargar los favoritos que ya tenía guardados NO dispara ningún toast', async () => {
    comoInquilino()
    api.getMine.mockResolvedValue(['p1', 'p2'])
    await montar()

    expect(store.isWishlisted('p1')).toBe(true)
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })
})

describe('favoritos — el espejo del estado se adelanta al re-render', () => {
  it('dos clics en el MISMO tick no mandan dos veces al back ni sacan dos toasts', async () => {
    comoInquilino()
    await montar()

    await act(async () => {
      store.toggleWishlist('p1')
      store.toggleWishlist('p1')
    })

    // Agregar y quitar: uno de cada, nunca dos altas.
    expect(api.add).toHaveBeenCalledTimes(1)
    expect(api.remove).toHaveBeenCalledTimes(1)
    expect(store.isWishlisted('p1')).toBe(false)
  })
})
