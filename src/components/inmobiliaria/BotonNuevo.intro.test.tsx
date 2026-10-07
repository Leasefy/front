/**
 * La explicación de la primera vez de «Nuevo» (Nico, 05-10-2026, mirando
 * «Vas a crear una consignación»: «¿qué es eso tan horrible de arriba a la
 * izquierda?»). Era una píldora celeste VACÍA: el ícono iba en una caja de
 * 40 px como PRIMER hijo de la cabecera, y la cabecera de Cadence le reserva a
 * la ✕ un `pr-11` (44 px) a su primer hijo cuando no hay medallón. 40 px de
 * caja con 44 px de relleno dejan 0 px de contenido: el ícono medía 0 de ancho.
 *
 * Arreglo (05-10, fase 1): el ícono iba al medallón del DS. Fase 2 (Nico
 * eligió A «Héroe», 05-10 19:10): la explicación es `IntroHeroe`, con el
 * ícono en su medallón ilustrado. Se fija lo que la persona necesita:
 *   1. el ícono del flujo vive en el medallón del héroe, con su tamaño (no 0);
 *   2. el modal se anuncia con el título del flujo y muestra los pasos;
 *   3. y, por todo el código, ninguna cabecera de modal empieza con una caja
 *      de tamaño fijo (`h-N w-N`): es el mismo defecto en otro modal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: () => true,
    agentPermsResolved: true,
    refetch: vi.fn(),
    isAdmin: true,
    agencyRole: 'ADMIN',
  }),
}))
vi.mock('@/components/migracion/migracion-context', () => ({ useMigracion: () => null }))
vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>
  const get = (k: string) =>
    k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown> | undefined)?.[p], es)
  return { useI18n: () => ({ t: (k: string) => (get(k) as string) ?? k }) }
})
vi.mock('@/components/inmobiliaria/SelectorPostulacion', () => ({ SelectorPostulacion: () => null }))

import { BotonNuevo } from './BotonNuevo'
import { claveVisto } from '@/lib/inmobiliaria/flujos'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  window.localStorage.removeItem(claveVisto('consignacion'))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

function abrirLaExplicacion() {
  act(() => root.render(<BotonNuevo />))
  const principal = Array.from(host.querySelectorAll('button')).find((b) =>
    /Nueva consignación/.test(b.textContent ?? ''),
  )
  expect(principal, 'el segmento principal «Nueva consignación»').toBeDefined()
  act(() => principal!.click())
  const modal = document.querySelector<HTMLElement>('[role="dialog"][data-testid="intro-heroe"]')
  expect(modal, 'la explicación de la primera vez (A «Héroe») se abre').not.toBeNull()
  return modal!
}

describe('«Vas a crear una consignación»: el ícono se ve', () => {
  it('el ícono del flujo va en el medallón del héroe, con su tamaño', () => {
    const modal = abrirLaExplicacion()
    const icono = modal.querySelector('[data-medallon-del-flujo] svg')
    expect(icono, 'el ícono adentro del medallón').not.toBeNull()
    // Phosphor escribe el tamaño en el SVG: nunca 0 (la píldora vacía era el ícono a 0 px).
    expect(Number(icono!.getAttribute('width'))).toBeGreaterThan(16)
    expect(icono!.getAttribute('width')).toBe(icono!.getAttribute('height'))
  })

  it('se anuncia con el título del flujo y muestra los pasos de su asistente', () => {
    const modal = abrirLaExplicacion()
    const titulo = document.getElementById(modal.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.textContent).toBe('Vas a crear una consignación')
    expect(modal.querySelectorAll('[data-paso]').length).toBe(5)
    expect(modal.textContent).toContain('Esto se muestra una sola vez.')
  })
})

describe('ninguna cabecera de modal empieza con una caja de tamaño fijo', () => {
  it('sin `<DialogHeader>` (ni de AlertDialog) cuyo primer hijo sea un `<div|span className="…h-N w-N…">`', () => {
    const raiz = join(process.cwd(), 'src')
    const archivos: string[] = []
    const recorrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n)
        if (statSync(p).isDirectory()) recorrer(p)
        else if (p.endsWith('.tsx') && !p.includes('.test.')) archivos.push(p)
      }
    }
    recorrer(raiz)
    const malos: string[] = []
    for (const p of archivos) {
      const lineas = readFileSync(p, 'utf8').split('\n')
      lineas.forEach((l, i) => {
        if (!/<(Dialog|AlertDialog)Header(\s[^>]*)?>\s*$/.test(l.trim())) return
        let j = i + 1
        while (j < lineas.length && (!lineas[j].trim() || lineas[j].trim().startsWith('{/*'))) {
          // Salta comentarios de una o varias líneas.
          if (lineas[j].trim().startsWith('{/*')) while (j < lineas.length && !lineas[j].includes('*/}')) j++
          j++
        }
        const sig = (lineas[j] ?? '').trim()
        if (/^<(div|span)\b/.test(sig) && /\bh-\d+\b/.test(sig) && /\bw-\d+\b/.test(sig)) {
          malos.push(`${relative(process.cwd(), p)}:${j + 1}`)
        }
      })
    }
    expect(malos).toEqual([])
  })
})
