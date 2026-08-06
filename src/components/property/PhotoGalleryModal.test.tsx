import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

// next/image → plain <img>, dropping the non-DOM props (fill/priority/sizes).
vi.mock('next/image', () => ({
  default: ({ src, alt, className, ...rest }: { src: string; alt: string; className?: string } & Record<string, unknown>) => {
    const testId = rest['data-testid']
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} className={className} data-testid={testId as string | undefined} />
  },
}))

import { PhotoGalleryModal } from './PhotoGalleryModal'

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

const IMAGES = ['a.jpg', 'b.jpg', 'c.jpg']

function render(props: Partial<React.ComponentProps<typeof PhotoGalleryModal>> = {}) {
  const defaultProps: React.ComponentProps<typeof PhotoGalleryModal> = {
    images: IMAGES,
    propertyTitle: 'Depto Centro',
    isOpen: true,
    onClose: vi.fn(),
    initialImageIndex: 0,
    ...props,
  }
  act(() => {
    root.render(<PhotoGalleryModal {...defaultProps} />)
  })
  return defaultProps
}

function counterText(): string {
  return container.querySelector('[data-testid="gallery-counter"]')?.textContent ?? ''
}

function activeSrc(): string {
  return (container.querySelector('[data-testid="gallery-active-image"]') as HTMLImageElement)?.getAttribute('src') ?? ''
}

function clickAria(label: string) {
  const btn = container.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement
  act(() => {
    btn.click()
  })
}

describe('<PhotoGalleryModal> — carousel', () => {
  it('renders nothing when closed', () => {
    render({ isOpen: false })
    expect(container.querySelector('[role="dialog"]')).toBeFalsy()
  })

  it('opens directly on the clicked image (initialImageIndex) with a counter — no scrollable gallery page', () => {
    render({ initialImageIndex: 1 })

    expect(activeSrc()).toBe('b.jpg')
    expect(counterText()).toBe('2 / 3')
    // The old scrollable gallery page is gone.
    expect(container.textContent).not.toContain('Galería de fotos')
    expect(container.textContent).not.toContain('Ver en grande')
  })

  it('advances to the next image and wraps around from the last', () => {
    render({ initialImageIndex: 2 })
    expect(activeSrc()).toBe('c.jpg')

    clickAria('Siguiente imagen')
    expect(activeSrc()).toBe('a.jpg')
    expect(counterText()).toBe('1 / 3')
  })

  it('goes to the previous image and wraps around from the first', () => {
    render({ initialImageIndex: 0 })

    clickAria('Imagen anterior')
    expect(activeSrc()).toBe('c.jpg')
    expect(counterText()).toBe('3 / 3')
  })

  it('jumps to a thumbnail when clicked', () => {
    render({ initialImageIndex: 0 })

    clickAria('Ver foto 3')
    expect(activeSrc()).toBe('c.jpg')
  })

  it('navigates with the arrow keys and closes on Escape', () => {
    const onClose = vi.fn()
    render({ onClose, initialImageIndex: 0 })

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    })
    expect(activeSrc()).toBe('b.jpg')

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hides the counter, arrows and thumbnails for a single image', () => {
    render({ images: ['only.jpg'] })

    expect(activeSrc()).toBe('only.jpg')
    expect(container.querySelector('[data-testid="gallery-counter"]')).toBeFalsy()
    expect(container.querySelector('[aria-label="Siguiente imagen"]')).toBeFalsy()
    expect(container.querySelector('[aria-label="Imagen anterior"]')).toBeFalsy()
  })
})
