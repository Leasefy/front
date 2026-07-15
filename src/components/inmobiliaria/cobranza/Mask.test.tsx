import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Mask } from './Mask'

void React // keep the import alive under "jsx": "preserve"

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
})

function renderMask(props: Parameters<typeof Mask>[0]) {
  act(() => {
    root.render(<Mask {...props} />)
  })
}

function getByAria(label: string): HTMLElement {
  const el = container.querySelector(`[aria-label="${label}"]`)
  if (!el) throw new Error(`no element with aria-label="${label}"`)
  return el as HTMLElement
}

describe('<Mask>', () => {
  it('renders the masked cedula value with the cédula aria-label', () => {
    renderMask({ field: 'cedula', value: '12•••678' })
    expect(getByAria('cédula enmascarada').textContent).toContain('12•••678')
  })

  it('renders phone with phone aria-label', () => {
    renderMask({ field: 'phone', value: '300•••5678' })
    expect(getByAria('teléfono enmascarado').textContent).toContain('300•••5678')
  })

  it('renders email with email aria-label', () => {
    renderMask({ field: 'email', value: 'j•••@gmail.com' })
    expect(getByAria('email enmascarado').textContent).toContain('j•••@gmail.com')
  })

  it('renders fiador cedula with its aria-label', () => {
    renderMask({ field: 'fiador_cedula', value: '12•••678' })
    expect(getByAria('cédula del fiador enmascarada').textContent).toContain('12•••678')
  })

  it('renders em-dash for null value with sin dato aria-label', () => {
    renderMask({ field: 'cedula', value: null })
    expect(getByAria('sin dato').textContent).toBe('—')
  })

  it('renders em-dash for empty string', () => {
    renderMask({ field: 'email', value: '' })
    expect(getByAria('sin dato').textContent).toBe('—')
  })

  it('fires onReveal when clicked', () => {
    const onReveal = vi.fn()
    renderMask({ field: 'phone', value: '300•••5678', onReveal })
    act(() => {
      getByAria('teléfono enmascarado').click()
    })
    expect(onReveal).toHaveBeenCalledWith('phone')
  })

  it('does not throw when clicked without onReveal (31-08 no-op contract)', () => {
    renderMask({ field: 'cedula', value: '12•••678' })
    expect(() => {
      act(() => {
        getByAria('cédula enmascarada').click()
      })
    }).not.toThrow()
  })

  it('exposes data-pii-field attribute matching the field prop', () => {
    renderMask({ field: 'email', value: 'j•••@gmail.com' })
    expect(getByAria('email enmascarado').getAttribute('data-pii-field')).toBe('email')
  })

  it('is interactive (tabIndex=0, role=button) ONLY when onReveal is bound', () => {
    // a11y fix: a non-actionable mask (no onReveal) must NOT be announced as a
    // button / be keyboard-focusable.
    renderMask({ field: 'cedula', value: '12•••678' })
    const plain = getByAria('cédula enmascarada')
    expect(plain.getAttribute('role')).toBeNull()
    expect(plain.getAttribute('tabindex')).toBeNull()

    // With onReveal bound it becomes a real button.
    renderMask({ field: 'cedula', value: '12•••678', onReveal: vi.fn() })
    const btn = getByAria('cédula enmascarada')
    expect(btn.getAttribute('tabindex')).toBe('0')
    expect(btn.getAttribute('role')).toBe('button')
  })

  it('stops click propagation to the parent only when interactive (onReveal bound)', () => {
    // The interactive handler calls stopPropagation; we assert a parent React
    // click handler does NOT run when the child Mask is clicked.
    const parentClick = vi.fn()
    const onReveal = vi.fn()
    const Parent = () => (
      <div onClick={parentClick} data-testid="parent">
        <Mask field="cedula" value="12•••678" onReveal={onReveal} />
      </div>
    )
    act(() => {
      root.render(<Parent />)
    })
    act(() => {
      const el = container.querySelector('[aria-label="cédula enmascarada"]') as HTMLElement
      el.click()
    })
    expect(onReveal).toHaveBeenCalledWith('cedula')
    expect(parentClick).not.toHaveBeenCalled()
  })
})
