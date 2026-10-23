/**
 * «Nuevo» compacto (C8 del plan de la barra, 22-10): en la barra plegada, un «＋» de 40 px con nombre
 * accesible que abre EL MISMO menú que el botón partido de la barra abierta.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

let permisos = { canAccess: () => true, agentPermsResolved: true, refetch: vi.fn(), isAdmin: true }
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => permisos,
}))

let migracion: { estado: { bloquea: boolean } | null; abrir: () => void; recargar: () => Promise<void> } | null = null
vi.mock('@/components/migracion/migracion-context', () => ({
  useMigracion: () => migracion,
}))

vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>
  const get = (k: string) =>
    k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], es)
  return { useI18n: () => ({ t: (k: string) => (get(k) as string) ?? k }) }
})

// The DS menu is a Radix portal; render its content inline so the test asserts
// on what the menu offers, not on Radix's open mechanics.
vi.mock('@leasefy/cadence', () => ({
  Button: (p: React.ComponentProps<'button'>) => <button {...p} />,
  SplitButton: ({ label, onClick, caretLabel, menuContent }: {
    label: React.ReactNode; onClick: () => void; caretLabel: string; menuContent: React.ReactNode
  }) => (
    <div>
      <button onClick={onClick}>{label}</button>
      <button aria-label={caretLabel} />
      <div role="menu">{menuContent}</div>
    </div>
  ),
}))
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownListTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownListContent: ({ children }: { children: React.ReactNode }) => <div role="menu">{children}</div>,
  DropdownListItem: ({ onSelect, children }: { onSelect?: (e: Event) => void; children: React.ReactNode }) => (
    <div role="menuitem" onClick={() => onSelect?.(new Event('select'))}>{children}</div>
  ),
  DropdownListLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownListSeparator: () => <hr />,
}))
vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null, DialogContent: () => null, DialogDescription: () => null,
  DialogFooter: () => null, DialogHeader: () => null, DialogTitle: () => null,
}))
vi.mock('@/components/ui/tooltip', () => {
  const Pasa = ({ children }: { children: React.ReactNode }) => <>{children}</>
  return { TooltipProvider: Pasa, Tooltip: Pasa, TooltipTrigger: Pasa, TooltipContent: () => null }
})
vi.mock('@/components/inmobiliaria/SelectorPostulacion', () => ({ SelectorPostulacion: () => null }))

import { BotonNuevo } from './BotonNuevo'
import { TooltipProvider } from '@/components/ui/tooltip'

let root: Root
let host: HTMLDivElement

function montar(compacto: boolean) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() =>
    root.render(
      <TooltipProvider>
        <BotonNuevo compacto={compacto} />
      </TooltipProvider>,
    ),
  )
}
const items = () => Array.from(host.querySelectorAll('[role="menuitem"]')).map((e) => e.textContent ?? '')

beforeEach(() => {
  document.body.innerHTML = ''
  push.mockClear()
  permisos = { canAccess: () => true, agentPermsResolved: true, refetch: vi.fn(), isAdmin: true }
  migracion = { estado: { bloquea: false }, abrir: vi.fn(), recargar: vi.fn(async () => undefined) }
})

describe('BotonNuevo compacto (barra plegada)', () => {
  it('es un «＋» con nombre accesible, sin texto visible', () => {
    montar(true)
    const b = host.querySelector<HTMLButtonElement>('[data-testid="nuevo-compacto"]')!
    expect(b.getAttribute('aria-label')).toBe('Empezar algo nuevo')
    expect(b.textContent?.trim()).toBe('')
  })

  it('ofrece exactamente el mismo menú que el botón de la barra abierta', () => {
    montar(false)
    const abierto = items()
    act(() => root.unmount())
    montar(true)
    expect(items()).toEqual(abierto)
    expect(abierto.length).toBeGreaterThan(1)
  })
})
