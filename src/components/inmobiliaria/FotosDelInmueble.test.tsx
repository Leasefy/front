/**
 * La galería de la ficha: elegir ya es subir (sin paso de confirmar), cada
 * miniatura abre el visor, y sin fotos se ve la zona grande de subida.
 * Nico (2026-09-02): «si quiero subir más no deja» · «que se deje de una
 * manera más fácil subirlas y más bonita».
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { api, toastMock } = vi.hoisted(() => ({
  api: {
    getImages: vi.fn(),
    uploadImage: vi.fn(),
    deleteImage: vi.fn(),
    reorderImages: vi.fn(),
  },
  toastMock: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: api }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))

import { FotosDelInmueble } from './FotosDelInmueble'

const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as { URL: typeof URL }).URL.createObjectURL = vi.fn(() => 'blob:preview')
  ;(globalThis as { URL: typeof URL }).URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(props: Partial<React.ComponentProps<typeof FotosDelInmueble>> = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onVer = vi.fn()
  const onCambio = vi.fn()
  act(() => {
    root.render(<FotosDelInmueble propertyId="prop-1" onVer={onVer} onCambio={onCambio} {...props} />)
  })
  await tick()
  return { onVer, onCambio }
}

function archivo(nombre: string) {
  return new File([new Uint8Array(10)], nombre, { type: 'image/jpeg' })
}

describe('FotosDelInmueble', () => {
  it('sin fotos muestra la zona grande de subida, no un botoncito', async () => {
    api.getImages.mockResolvedValue([])
    await montar()
    expect(container.querySelector('[data-testid="fotos-vacio"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="subida-fotos-grande"]')).not.toBeNull()
  })

  it('con fotos, cada miniatura abre el visor en su índice y hay una tarjeta para agregar', async () => {
    api.getImages.mockResolvedValue([
      { id: 'i1', url: 'https://cdn/1.jpg', order: 0 },
      { id: 'i2', url: 'https://cdn/2.jpg', order: 1 },
    ])
    const { onVer } = await montar()
    act(() => container.querySelector<HTMLButtonElement>('[data-testid="foto-ver-1"]')!.click())
    expect(onVer).toHaveBeenCalledWith(1)
    expect(container.querySelector('[data-testid="subida-fotos-ficha"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="fotos-contador"]')?.textContent).toBe('2 de 40')
  })

  it('elegir fotos las sube al tiro, en orden, y refresca la galería', async () => {
    api.getImages.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { id: 'i1', url: 'https://cdn/1.jpg', order: 0 },
      { id: 'i2', url: 'https://cdn/2.jpg', order: 1 },
    ])
    api.uploadImage.mockResolvedValue({ id: 'x', url: 'u', order: 0 })
    const { onCambio } = await montar()

    const input = container.querySelector<HTMLInputElement>('[data-testid="subida-fotos-input"]')!
    const files = [archivo('a.jpg'), archivo('b.jpg')]
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await tick()

    expect(api.uploadImage).toHaveBeenCalledTimes(2)
    expect(api.uploadImage.mock.calls.map((c) => (c[1] as File).name)).toEqual(['a.jpg', 'b.jpg'])
    expect(api.getImages).toHaveBeenCalledTimes(2)
    expect(onCambio).toHaveBeenCalled()
    expect(toastMock.success).toHaveBeenCalledWith('2 fotos subidas')
    expect(container.querySelectorAll('[data-testid="foto-ver-0"], [data-testid="foto-ver-1"]')).toHaveLength(2)
  })

  it('una que falla queda marcada y las otras siguen', async () => {
    api.getImages.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'i1', url: 'https://cdn/1.jpg', order: 0 }])
    api.uploadImage.mockRejectedValueOnce(new Error('Image must be less than 5MB')).mockResolvedValueOnce({ id: 'x', url: 'u', order: 0 })
    await montar()

    const input = container.querySelector<HTMLInputElement>('[data-testid="subida-fotos-input"]')!
    Object.defineProperty(input, 'files', { value: [archivo('grande.jpg'), archivo('ok.jpg')], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await tick()

    expect(toastMock.success).toHaveBeenCalledWith('Foto subida')
    expect(toastMock.error).toHaveBeenCalledWith('Una foto no se subió', { description: 'Image must be less than 5MB' })
    expect(container.querySelector('[data-testid="foto-en-camino"][data-estado="fallo"]')).not.toBeNull()
  })
})

describe('FotosDelInmueble — quitar y portada (Nico, 2026-09-03)', () => {
  const dosFotos = [
    { id: 'i1', url: 'https://cdn/1.jpg', order: 0 },
    { id: 'i2', url: 'https://cdn/2.jpg', order: 1 },
  ]

  it('la papelera NO borra de una: abre la confirmación', async () => {
    api.getImages.mockResolvedValue(dosFotos)
    await montar()
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Quitar la foto 2"]')!.click())
    await tick()
    expect(api.deleteImage).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-testid="quitar-foto-dialogo"]')).not.toBeNull()
  })

  it('confirmar borra, avisa con un toast y refresca', async () => {
    api.getImages.mockResolvedValue(dosFotos)
    api.deleteImage.mockResolvedValue(undefined)
    const { onCambio } = await montar()
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Quitar la foto 2"]')!.click())
    await tick()
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="quitar-foto-confirmar"]')!.click()
    })
    await tick()
    expect(api.deleteImage).toHaveBeenCalledWith('prop-1', 'i2')
    expect(toastMock.success).toHaveBeenCalledWith('Foto quitada')
    expect(onCambio).toHaveBeenCalled()
    expect(container.querySelector('[data-testid="foto-ver-1"]')).toBeNull()
  })

  it('cancelar no toca nada', async () => {
    api.getImages.mockResolvedValue(dosFotos)
    await montar()
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Quitar la foto 1"]')!.click())
    await tick()
    const cancelar = [...document.body.querySelectorAll('button')].find((b) => b.textContent === 'Cancelar')!
    await act(async () => { cancelar.click() })
    await tick()
    expect(api.deleteImage).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-testid="quitar-foto-dialogo"]')).toBeNull()
  })

  it('hacer portada manda el orden con esa foto primero y avisa', async () => {
    api.getImages.mockResolvedValue(dosFotos)
    api.reorderImages.mockResolvedValue(undefined)
    await montar()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Hacer portada la foto 2"]')!.click()
    })
    await tick()
    expect(api.reorderImages).toHaveBeenCalledWith('prop-1', ['i2', 'i1'])
    expect(toastMock.success).toHaveBeenCalledWith('Portada actualizada')
  })

  it('si el back escupe un volcado de Prisma, el toast no lo repite', async () => {
    api.getImages.mockResolvedValue(dosFotos)
    api.reorderImages.mockRejectedValue(new Error('Invalid `this.prisma.propertyImage.update()` invocation in /x/y.js:518\nUnique constraint failed'))
    await montar()
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Hacer portada la foto 2"]')!.click()
    })
    await tick()
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo cambiar la portada', { description: undefined })
  })
})
