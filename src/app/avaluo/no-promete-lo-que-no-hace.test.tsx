/**
 * /avaluo — la página pública dice lo que hace el servicio de avalúos (PROMESAS-Y-DIRECTOR, 05-10-2026).
 *
 * Prometía «Pago solo si apruebas», «Entrega en 48 h», «valuadores
 * certificados», «Avaluadores registrados en la Lonja de Propiedad Raíz» y que
 * el informe sirve para «crédito hipotecario o procesos legales» y es «válido
 * ante entidades financieras, notarías y juzgados». Lo que hace el servicio
 * (repo `avaluo`, rama develop):
 *
 *   · se paga ANTES, al enviar la solicitud (`src/app/avaluo/payment-screen.tsx`,
 *     «WU2 pay-first»), y si el avalúo firmado no sale el pago se devuelve
 *     (`src/avaluo/payment/refund.ts`, rechazo del revisor o valuación negada);
 *   · ningún plazo de entrega está escrito en el código: depende de la firma;
 *   · sin visita física (sección `sin-visita` del certificado) y lo revisa y
 *     firma una persona SIN inscripción en el RAA (`legal/cert-sections.ts`);
 *   · NO sirve para crédito, procesos judiciales ni la DIAN (sección
 *     `usos-documento`; su propia portada: «No constituye un avalúo formal RAA,
 *     hipotecario ni judicial», `src/app/layout.tsx`).
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/components/landing-v2/LandingChrome', () => ({
  LandingChrome: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/landing-v2/LandingFooterV2', () => ({
  LandingFooterV2: () => null,
}))
vi.mock('@/lib/avaluo/wizard-url', () => ({
  AVALUO_WIZARD_URL: 'http://localhost:3003/avaluo',
  AVALUO_WIZARD_ORIGIN: 'http://localhost:3003',
}))

import AvaluoPage from './page'
import { metadata } from './layout'

let root: Root | null = null
let host: HTMLDivElement | null = null

function texto(): string {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<AvaluoPage />)
  })
  return (host.textContent ?? '').replace(/ /g, ' ')
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
})

describe('/avaluo — sin promesas que el servicio no cumple', () => {
  it('no promete «pago solo si apruebas» ni que el link de pago llega después de revisar: se paga al enviar', () => {
    const t = texto()
    expect(t).not.toMatch(/pago solo si apruebas/i)
    expect(t).not.toContain('Una vez revisada tu solicitud, recibes el link de pago')
    expect(t).toContain('al enviar la solicitud')
    expect(t).toMatch(/te devolvemos el pago/i)
  })

  it('no promete un plazo que el código no tiene («48 h»)', () => {
    const t = texto()
    expect(t).not.toMatch(/48\s*h/i)
    expect(t).not.toMatch(/en minutos, no semanas/i)
  })

  it('no dice valuadores certificados, Lonja ni RAA como si los hubiera, ni usos para crédito o juzgados', () => {
    const t = texto()
    expect(t).not.toMatch(/valuadores certificados/i)
    expect(t).not.toContain('Lonja')
    expect(t).not.toMatch(/firmado por valuador/i)
    expect(t).not.toMatch(/válido ante entidades financieras/i)
    expect(t).not.toMatch(/aceptados por bancos/i)
    expect(t).not.toMatch(/crédito hipotecario o procesos legales/i)
    // «Avalúo comercial certificado» se lee como avalúo certificado (Ley 1673); el
    // certificado es el DOCUMENTO firmado, y así se nombra más abajo.
    expect(host!.querySelector('h1')!.textContent).not.toMatch(/certificado/i)
  })

  it('dice lo cierto: remoto, sin visita, revisado y firmado por una persona, y para qué no sirve', () => {
    const t = texto()
    expect(t).toMatch(/sin visita/i)
    expect(t).toMatch(/revisor/i)
    expect(t).toMatch(/firma/i)
    expect(t).toContain('RAA')
    expect(t).toMatch(/no sirve para crédito hipotecario/i)
  })

  it('el título y la descripción para buscadores tampoco prometen «certificado» ni crédito hipotecario o litigios', () => {
    const titulo = String(metadata.title ?? '')
    const descripcion = String(metadata.description ?? '')
    expect(titulo).not.toMatch(/certificado/i)
    expect(descripcion).not.toMatch(/crédito hipotecario|litigios|certificado/i)
    expect(String(metadata.openGraph?.description ?? '')).not.toMatch(/certificado/i)
  })
})
