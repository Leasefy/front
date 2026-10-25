/**
 * Revisora r25 (R8): sin la dirección de la solicitud (`NEXT_PUBLIC_AVALUO_API_URL`
 * sin poner), «Solicitar avalúo» abría la misma portada en otra pestaña. El propio
 * `wizard-url.ts` pide degradar: el botón se apaga y dice por qué y qué hacer.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/components/landing-v2/LandingChrome', () => ({
  LandingChrome: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/landing-v2/LandingFooterV2', () => ({
  LandingFooterV2: () => null,
}))
vi.mock('@/lib/avaluo/wizard-url', () => ({
  AVALUO_WIZARD_URL: '',
  AVALUO_WIZARD_ORIGIN: '',
}))

import AvaluoPage from './page'

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
})

describe('/avaluo sin la solicitud disponible', () => {
  it('el botón queda apagado, sin enlace a ningún lado, y ofrece el correo', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(<AvaluoPage />)
    })
    const pausa = host.querySelector('[data-testid="avaluo-en-pausa"]')
    expect(pausa).not.toBeNull()
    expect(pausa?.querySelector('button')?.disabled).toBe(true)
    expect(pausa?.querySelector('a[href="mailto:avaluos@leasefy.co"]')).not.toBeNull()
    expect(host.querySelector('a[target="_blank"]')).toBeNull()
  })
})
