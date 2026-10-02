/**
 * La presentación del Piloto (Nico, 30-09): sale la primera vez que la
 * persona entra, se puede cerrar, no vuelve a salir sola, y se vuelve a ver a
 * mano desde «¿Cómo funciona?». El «ya la vi» es el del servidor
 * (`PanelPrefsContext` → `/inmobiliaria/onboarding-visto`), por persona.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const USUARIO = '6f1c2a3b-0000-4000-8000-00000000abcd'
const CLAVE = `novedad:piloto:${USUARIO}`

const h = vi.hoisted(() => ({
  vistas: {} as Record<string, boolean | null>,
  tourDismissed: true as boolean | null,
  marcarVista: vi.fn(async (_clave: string, _estado: string) => {}),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: USUARIO } }),
}))
vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefsSafe: () => ({
    tourDismissed: h.tourDismissed,
    estaVista: (clave: string) => (clave in h.vistas ? h.vistas[clave] : false),
    marcarVista: h.marcarVista,
    cerrarRecorrido: vi.fn(),
    relaunchTour: vi.fn(),
    vistaDelRecorrido: null,
  }),
}))

import { PilotoNovedad, olvidarRecorridoDeEstaSesion } from './PilotoNovedad'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  h.vistas = {}
  h.tourDismissed = true
  h.marcarVista.mockClear()
  olvidarRecorridoDeEstaSesion()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  document.querySelectorAll('[data-capa-de-prueba]').forEach((e) => e.remove())
  vi.useRealTimers()
})

async function montar(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
  })
  // La presentación espera a que la pantalla pinte (600 ms).
  await act(async () => {
    vi.advanceTimersByTime(700)
  })
}

const modal = () => document.body.querySelector('[data-testid="piloto-novedad"]')

describe('PilotoNovedad', () => {
  it('la primera vez sale sola, con sus tres pasos', async () => {
    await montar(<PilotoNovedad />)
    expect(modal()).not.toBeNull()
    const texto = modal()?.textContent ?? ''
    expect(texto).toContain('inmobiliaria.piloto.novedad.titulo')
    expect(texto).toContain('inmobiliaria.piloto.novedad.paso1.titulo')
    expect(texto).toContain('inmobiliaria.piloto.novedad.paso2.titulo')
    expect(texto).toContain('inmobiliaria.piloto.novedad.paso3.titulo')
  })

  it('el halo va limpio: sin la píldora «L Leasefy» (Nico, 30-09: «quitale eso a las imágenes»)', async () => {
    await montar(<PilotoNovedad />)
    expect(modal()).not.toBeNull()
    expect(modal()?.textContent ?? '').not.toContain('Leasefy')
    const monogramas = [...(modal()?.querySelectorAll('span') ?? [])].filter(
      (s) => s.children.length === 0 && s.textContent?.trim() === 'L',
    )
    expect(monogramas).toHaveLength(0)
  })

  it('🔴 el héroe es el orbe de Ori, no la aurora (Nico, 02-10), y despierta', async () => {
    await montar(<PilotoNovedad />)
    // La aurora era un `background: url(data:…)` en el héroe: ya no hay ninguno.
    const conImagen = [...(modal()?.querySelectorAll<HTMLElement>('[style]') ?? [])].filter((el) =>
      el.style.background.includes('url('),
    )
    expect(conImagen).toHaveLength(0)
    const orbe = modal()?.querySelector('[data-escenario-del-orbe] .cdc-orb') as HTMLElement
    expect(orbe).not.toBeNull()
    expect(orbe.dataset.agente).toBe('orquestador')
    expect(orbe.dataset.variant).toBe('orchestrator')
    expect(orbe.style.width).toBe('120px')
    // Recién montada (el `act` de `montar` la pinta al cerrar): todavía
    // quieta; a los 450 ms late y a los 1900 se asienta.
    expect(orbe.dataset.estado).toBe('quieto')
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(orbe.dataset.estado).toBe('trabajando')
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(orbe.dataset.estado).toBe('listo')
  })

  it('«Entendido» la cierra y la deja vista, por persona, como completa', async () => {
    await montar(<PilotoNovedad />)
    const cta = [...(modal()?.querySelectorAll('button') ?? [])].find((b) =>
      b.textContent?.includes('inmobiliaria.piloto.novedad.cta'),
    ) as HTMLButtonElement
    await act(async () => cta.click())
    expect(h.marcarVista).toHaveBeenCalledWith(CLAVE, 'completo')
    expect(modal()).toBeNull()
  })

  it('la ✕ la cierra y cuenta como omitida', async () => {
    await montar(<PilotoNovedad />)
    const aspa = modal()?.querySelector('[data-testid="piloto-novedad-cerrar"]') as HTMLButtonElement
    await act(async () => aspa.click())
    expect(h.marcarVista).toHaveBeenCalledWith(CLAVE, 'omitido')
    expect(modal()).toBeNull()
  })

  it('la segunda vez (ya vista) no sale', async () => {
    h.vistas[CLAVE] = true
    await montar(<PilotoNovedad />)
    expect(modal()).toBeNull()
    expect(h.marcarVista).not.toHaveBeenCalled()
  })

  it('mientras no se sabe si ya la vio, no sale', async () => {
    h.vistas[CLAVE] = null
    await montar(<PilotoNovedad />)
    expect(modal()).toBeNull()
  })

  it('no sale encima del recorrido del panel', async () => {
    h.tourDismissed = false
    await montar(<PilotoNovedad />)
    expect(modal()).toBeNull()
  })

  it('se vuelve a ver a mano sin tocar la marca', async () => {
    h.vistas[CLAVE] = true
    const onCerrar = vi.fn()
    await montar(<PilotoNovedad forzada onCerrarForzada={onCerrar} />)
    expect(modal()).not.toBeNull()
    const aspa = modal()?.querySelector('[data-testid="piloto-novedad-cerrar"]') as HTMLButtonElement
    await act(async () => aspa.click())
    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(h.marcarVista).not.toHaveBeenCalled()
  })

  describe('nunca a la vez que otra bienvenida (coordinación, 30-09)', () => {
    it('recién visto el recorrido en esta sesión, no se encadena: espera a la próxima', async () => {
      h.tourDismissed = false
      await montar(<PilotoNovedad />)
      expect(modal()).toBeNull()
      // La persona cierra el recorrido: la preferencia pasa a `true`.
      h.tourDismissed = true
      await montar(<PilotoNovedad />)
      expect(modal()).toBeNull()
      expect(h.marcarVista).not.toHaveBeenCalled()
    })

    it('con el muro de migración o la bienvenida encima, espera a que caigan', async () => {
      const muro = document.createElement('div')
      muro.setAttribute('data-testid', 'bienvenida-a-leasefy')
      muro.setAttribute('data-capa-de-prueba', '')
      document.body.appendChild(muro)
      await montar(<PilotoNovedad />)
      expect(modal()).toBeNull()
      muro.remove()
      await act(async () => {
        vi.advanceTimersByTime(1100)
      })
      expect(modal()).not.toBeNull()
    })

    it('con el Inicio tapado (inerte), no sale', async () => {
      const tapado = document.createElement('div')
      tapado.setAttribute('inert', '')
      tapado.setAttribute('data-capa-de-prueba', '')
      const pagina = document.createElement('div')
      pagina.setAttribute('data-testid', 'piloto-page')
      tapado.appendChild(pagina)
      document.body.appendChild(tapado)
      await montar(<PilotoNovedad />)
      expect(modal()).toBeNull()
    })

    it('con otro diálogo abierto, no sale encima', async () => {
      const dialogo = document.createElement('div')
      dialogo.setAttribute('role', 'dialog')
      dialogo.setAttribute('data-state', 'open')
      dialogo.setAttribute('data-capa-de-prueba', '')
      document.body.appendChild(dialogo)
      await montar(<PilotoNovedad />)
      expect(modal()).toBeNull()
    })
  })
})
