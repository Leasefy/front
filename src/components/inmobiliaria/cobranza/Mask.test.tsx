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

  it('is focusable (tabIndex=0) and role=button', () => {
    renderMask({ field: 'cedula', value: '12•••678' })
    const el = getByAria('cédula enmascarada')
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.getAttribute('role')).toBe('button')
  })

  it('invokes onClick with stopPropagation called on the synthetic event', () => {
    // The React synthetic event has stopPropagation called inside the handler;
    // we verify by inspecting the event argument passed to onReveal indirectly:
    // we attach a parent React click handler and assert it does not run when the
    // child Mask is clicked. (happy-dom forwards React-synthetic stopPropagation
    // by setting nativeEvent's cancelBubble — verified via second-listener semantics.)
    const parentClick = vi.fn()
    const Parent = () => (
      <div onClick={parentClick} data-testid="parent">
        <Mask field="cedula" value="12•••678" />
      </div>
    )
    act(() => {
      root.render(<Parent />)
    })
    act(() => {
      const el = container.querySelector('[aria-label="cédula enmascarada"]') as HTMLElement
      el.click()
    })
    expect(parentClick).not.toHaveBeenCalled()
  })
})
