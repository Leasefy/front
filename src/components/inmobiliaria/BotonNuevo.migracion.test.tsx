/**
 * «Nuevo» → «Migrar mis datos»: the way back into the migration after it was
 * dismissed at sign-up. Same entry as Configuración → Migración → «Migrar
 * ahora»: `useMigracion().abrir()`, or the first importer route without the
 * context.
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
vi.mock('@/components/inmobiliaria/SelectorPostulacion', () => ({ SelectorPostulacion: () => null }))

import { BotonNuevo } from './BotonNuevo'

let root: Root
let host: HTMLDivElement

function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root.render(<BotonNuevo />))
}
const item = (re: RegExp) =>
  Array.from(host.querySelectorAll('[role="menuitem"]')).find((e) => re.test(e.textContent ?? '')) as HTMLElement | undefined

beforeEach(() => {
  document.body.innerHTML = ''
  push.mockClear()
  permisos = { canAccess: () => true, agentPermsResolved: true, refetch: vi.fn(), isAdmin: true }
  migracion = { estado: { bloquea: false }, abrir: vi.fn(), recargar: vi.fn(async () => undefined) }
})

describe('BotonNuevo → Migrar mis datos', () => {
  it('opens the full-screen migration through the context', () => {
    montar()
    act(() => item(/Migrar mis datos/)!.click())
    expect(migracion!.abrir).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('falls back to the first importer when there is no context', () => {
    migracion = null
    montar()
    act(() => item(/Migrar mis datos/)!.click())
    expect(push).toHaveBeenCalledWith('/panel/inmobiliaria/migracion/terceros')
  })

  it('is hidden for non-admins, other entries stay', () => {
    permisos = { ...permisos, isAdmin: false }
    montar()
    expect(item(/consignación/i)).toBeDefined()
    expect(item(/Migrar mis datos/)).toBeUndefined()
  })

  it('is hidden while the migration wall is already blocking', () => {
    migracion = { ...migracion!, estado: { bloquea: true } }
    montar()
    expect(item(/consignación/i)).toBeDefined()
    expect(item(/Migrar mis datos/)).toBeUndefined()
  })
})
