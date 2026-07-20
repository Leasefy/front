/**
 * ContextSwitcher — the personal ↔ agency switcher shown in the avatar menu.
 * Renders ONLY for dual-context users; switching invokes onSwitch(context).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { ContextSwitcher } from './ContextSwitcher'
import type { ActiveContext } from '@/lib/auth/active-context'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

function render(props: Partial<React.ComponentProps<typeof ContextSwitcher>> = {}) {
  const onSwitch = props.onSwitch ?? vi.fn()
  act(() => {
    root.render(
      <ContextSwitcher
        user={{ role: 'tenant' }}
        agencyName="ABC"
        activeContext={'personal' as ActiveContext}
        hasActiveAgencyMembership
        locale="es"
        onSwitch={onSwitch}
        {...props}
      />,
    )
  })
  return onSwitch
}

describe('ContextSwitcher visibility', () => {
  it('renders for a dual-context user (personal role + ACTIVE membership)', () => {
    render()
    expect(container.querySelector('[data-testid="context-switcher"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="switch-personal"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="switch-agency"]')).not.toBeNull()
    expect(container.textContent).toContain('Inmobiliaria ABC')
  })

  it('renders nothing without an active membership', () => {
    render({ hasActiveAgencyMembership: false })
    expect(container.querySelector('[data-testid="context-switcher"]')).toBeNull()
  })

  it('renders nothing for a pure-agency user (single-context)', () => {
    render({ user: { role: 'agency' } })
    expect(container.querySelector('[data-testid="context-switcher"]')).toBeNull()
  })
})

describe('ContextSwitcher switching', () => {
  it('invokes onSwitch("agency") when the agency option is clicked', () => {
    const onSwitch = render()
    act(() => {
      ;(container.querySelector('[data-testid="switch-agency"]') as HTMLButtonElement).click()
    })
    expect(onSwitch).toHaveBeenCalledWith('agency')
  })

  it('invokes onSwitch("personal") when the personal option is clicked', () => {
    const onSwitch = render({ activeContext: 'agency' as ActiveContext })
    act(() => {
      ;(container.querySelector('[data-testid="switch-personal"]') as HTMLButtonElement).click()
    })
    expect(onSwitch).toHaveBeenCalledWith('personal')
  })
})
