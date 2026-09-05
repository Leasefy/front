/**
 * page.test.tsx — Mi perfil (inmobiliaria).
 *
 * Tres cosas que la pantalla decía y no eran:
 *
 *  1. La foto de perfil ya subida no se veía: `savedAvatar` arrancaba en `null`
 *     y sólo se llenaba tras una subida EN ESTA SESIÓN. Al recargar, la ficha
 *     volvía a la inicial del nombre aunque el backend tuviera la foto.
 *  2. «Cancelar» no cancelaba: lo tipeado quedaba en `formData`, que es lo
 *     mismo que pinta la vista de lectura, así que la ficha seguía mostrando el
 *     dato descartado y el siguiente «Guardar» lo mandaba al backend.
 *  3. El modal de baja afirmaba que se eliminaban «Datos de la agencia»,
 *     «Historial de propiedades y contratos», «Información de cobros y
 *     dispersiones» y «Conversaciones y mensajes». `DELETE /users/me/account`
 *     sólo marca al usuario con `isActive: false` + `deletedAt`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useAuthMock, updateProfileMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  updateProfileMock: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => useAuthMock() }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ agencyRole: 'ADMIN', canAccess: () => true, isLoading: false }),
}))

vi.mock('@/components/inmobiliaria/AgenteHorarioVisitas', () => ({
  AgenteHorarioVisitas: () => null,
}))

vi.mock('@/lib/api/settings.service', () => ({
  settingsApi: { uploadAvatar: vi.fn(), deleteAccount: vi.fn() },
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t, tag: string) =>
        ({ children, initial, animate, exit, transition, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void initial; void animate; void exit; void transition
          return React.createElement(tag, props, children)
        },
    },
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt, 'data-testid': 'avatar-img' }),
}))

vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  IconButton: ({ icon, ...props }: Record<string, unknown> & { icon?: React.ReactNode }) =>
    React.createElement('button', props, icon),
}))

vi.mock('@/components/ui', () => ({
  Button: ({
    children,
    variant,
    size,
    hideArrow,
    asChild,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant; void size; void hideArrow; void asChild
    return React.createElement('button', props, children)
  },
  Input: (props: Record<string, unknown>) => React.createElement('input', props),
  Spinner: () => React.createElement('span', { 'data-testid': 'spinner' }),
}))

// ── Import page AFTER mocks ───────────────────────────────────────────────
import InmobiliariaPerfilPage, { datosDelUsuario, oNulo } from './page'

const USUARIO = {
  id: 'u-1',
  email: 'ana@leasefy.co',
  firstName: 'Ana',
  lastName: 'Díaz',
  phone: '3001234567',
  address: 'Cra 7 #45-23',
  birthDate: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  avatar: undefined as string | undefined,
  emailConfirmedAt: '2026-01-01T00:00:00Z',
}

function conUsuario(overrides: Partial<typeof USUARIO> = {}) {
  useAuthMock.mockReturnValue({
    user: { ...USUARIO, ...overrides },
    agency: { name: 'Leasefy', nit: '900123456' },
    updateProfile: updateProfileMock,
    logout: vi.fn(),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useAuthMock.mockReset()
  updateProfileMock.mockReset()
  updateProfileMock.mockResolvedValue(undefined)
  conUsuario()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(InmobiliariaPerfilPage))
  })
}

function botonPorTexto(texto: string): HTMLButtonElement {
  const boton = Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto,
  )
  expect(boton, `no encontré el botón «${texto}»`).toBeDefined()
  return boton as HTMLButtonElement
}

function escribirEn(valorActual: string, nuevo: string) {
  const input = Array.from(container.querySelectorAll('input')).find(
    (i) => i.value === valorActual,
  )
  expect(input, `no encontré el input con «${valorActual}»`).toBeDefined()
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  act(() => {
    setter.call(input!, nuevo)
    input!.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('datosDelUsuario', () => {
  it('un usuario sin datos da campos vacíos, nunca undefined', () => {
    expect(datosDelUsuario(null)).toEqual({
      firstName: '', lastName: '', email: '', phone: '',
      address: '', birthDate: '', emergencyContactName: '', emergencyContactPhone: '',
    })
  })

  it('toma lo que el backend guardó', () => {
    expect(datosDelUsuario({ firstName: 'Ana', phone: '300' })).toMatchObject({
      firstName: 'Ana',
      phone: '300',
      lastName: '',
    })
  })
})

describe('oNulo — vaciar un campo tiene que llegar al backend', () => {
  it('un campo vaciado va como null, nunca como undefined', () => {
    expect(oNulo('')).toBeNull()
    expect(oNulo('   ')).toBeNull()
    expect(oNulo(' 3001234567 ')).toBe('3001234567')
  })
})

describe('Perfil — borrar un dato lo borra de verdad', () => {
  it('vaciar el teléfono manda null; con undefined el backend no lo tocaba', async () => {
    await renderPage()

    act(() => { botonPorTexto('Editar').click() })
    escribirEn('3001234567', '')
    await act(async () => { botonPorTexto('Guardar').click() })

    expect(updateProfileMock).toHaveBeenCalledTimes(1)
    const enviado = updateProfileMock.mock.calls[0][0] as Record<string, unknown>
    expect(enviado).toHaveProperty('phone', null)
    // `JSON.stringify` borra las claves `undefined`: el campo ni llegaría.
    expect(JSON.parse(JSON.stringify(enviado))).toHaveProperty('phone', null)
  })
})

describe('Perfil — la foto guardada se ve al entrar', () => {
  it('pinta el avatar que el backend devolvió, sin subir nada en esta sesión', async () => {
    conUsuario({ avatar: 'https://cdn.leasefy.co/avatars/ana.webp' })
    await renderPage()

    const img = container.querySelector<HTMLImageElement>('[data-testid="avatar-img"]')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('https://cdn.leasefy.co/avatars/ana.webp')
  })

  it('sin foto guardada muestra la inicial y ninguna imagen', async () => {
    await renderPage()
    expect(container.querySelector('[data-testid="avatar-img"]')).toBeNull()
    expect(container.textContent).toContain('A')
  })
})

describe('Perfil — «Cancelar» descarta de verdad', () => {
  it('lo tipeado y descartado no queda en la ficha ni se guarda después', async () => {
    await renderPage()

    act(() => { botonPorTexto('Editar').click() })
    escribirEn('Ana', 'NOMBRE DESCARTADO')
    expect(container.textContent).toContain('NOMBRE DESCARTADO')

    act(() => { botonPorTexto('Cancelar').click() })

    // La ficha vuelve a lo guardado…
    expect(container.textContent).not.toContain('NOMBRE DESCARTADO')
    expect(container.textContent).toContain('Ana')

    // …y un «Guardar» posterior manda el nombre real, no el descartado.
    act(() => { botonPorTexto('Editar').click() })
    await act(async () => { botonPorTexto('Guardar').click() })
    expect(updateProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ana' }),
    )
  })
})

describe('Perfil — el modal de baja no promete un borrado que no ocurre', () => {
  it('no dice que se eliminan los datos de la agencia, sus contratos ni sus cobros', async () => {
    await renderPage()
    act(() => { botonPorTexto('Eliminar mi cuenta').click() })

    const texto = container.textContent ?? ''
    expect(texto).not.toContain('Se eliminará permanentemente')
    expect(texto).not.toContain('Datos de la agencia y configuración')
    expect(texto).not.toContain('Historial de propiedades y contratos')
    expect(texto).not.toContain('Información de cobros y dispersiones')
  })

  it('dice qué se pierde y qué NO se elimina', async () => {
    await renderPage()
    act(() => { botonPorTexto('Eliminar mi cuenta').click() })

    const texto = container.textContent ?? ''
    expect(texto).toContain('Perderás:')
    expect(texto).toContain('El acceso al panel de la inmobiliaria')
    expect(texto).toContain('No se elimina:')
    expect(texto).toContain('siguen siendo de la agencia')
    // Y los dos bloqueos reales del backend.
    expect(texto).toContain('contratos de arriendo activos')
    expect(texto).toContain('único administrador')
  })

  it('la zona de peligro cuenta la ventana de 30 días, no «irreversible»', async () => {
    await renderPage()
    const texto = container.textContent ?? ''
    expect(texto).toContain('30 días')
    expect(texto).not.toContain('Estas acciones son irreversibles')
  })

  it('Escape cierra el modal — el foco queda en el botón que lo abrió, fuera del overlay', async () => {
    await renderPage()
    act(() => { botonPorTexto('Eliminar mi cuenta').click() })
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
