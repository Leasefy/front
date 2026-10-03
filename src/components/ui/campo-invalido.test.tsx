/**
 * 🔴 ARREGLOS-4 (03-10-2026) · Lo que se ANUNCIA como error se VE como error.
 *
 * PRUEBAS-RESTO, en el navegador: la fecha de vigencia rechazada, la penalidad
 * de más y el celular inválido decían su error debajo y el lector de pantalla
 * lo anunciaba (`aria-invalid`), pero el campo se veía igual que uno bueno: el
 * borde rojo del DS sale de `invalid` (→ `data-invalid`), y 36 de los 131
 * formularios con `aria-invalid` nunca pasaban `invalid`. Nico eligió la A: el
 * ADAPTADOR pinta el borde con `aria-invalid`, en vez de arreglarlo campo por
 * campo. La prueba vive sobre los primitivos: el próximo formulario nace bien.
 *
 * La otra mitad: con esto, un `aria-invalid` puesto a un requerido VACÍO
 * pintaría el formulario en rojo desde que se abre. El guardián de abajo no
 * deja que vuelva a aparecer.
 */
import * as React from 'react'
import { describe, expect, it, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { Input } from './input'
import { Textarea } from './textarea'
import { Select, SelectTrigger, SelectValue } from './select'
import { MoneyInput } from './money-input'
import { ariaDiceInvalido } from './campo-invalido'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  host = null
  root = null
})

function montar(nodo: React.ReactElement): HTMLDivElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(nodo))
  return host
}

describe('ariaDiceInvalido', () => {
  it.each([
    [true, true],
    ['true', true],
    ['grammar', true],
    ['spelling', true],
    [false, false],
    ['false', false],
    [undefined, false],
  ] as const)('%s → %s', (valor, esperado) => {
    expect(ariaDiceInvalido(valor)).toBe(esperado)
  })
})

describe('🔴 el adaptador pinta el borde de error con aria-invalid', () => {
  it('Input: aria-invalid=true → data-invalid (el borde rojo del DS)', () => {
    const el = montar(<Input aria-invalid data-testid="c" />).querySelector('[data-testid="c"]')!
    expect(el.hasAttribute('data-invalid')).toBe(true)
  })

  it('Input: aria-invalid="true" (como llega de un objeto de props) también', () => {
    const el = montar(<Input aria-invalid="true" data-testid="c" />).querySelector('[data-testid="c"]')!
    expect(el.hasAttribute('data-invalid')).toBe(true)
  })

  it('Input: sin error, nada de rojo (false, "false" o sin el atributo)', () => {
    for (const props of [{ 'aria-invalid': false as const }, { 'aria-invalid': 'false' as const }, {}]) {
      const el = montar(<Input {...props} data-testid="c" />).querySelector('[data-testid="c"]')!
      expect(el.hasAttribute('data-invalid')).toBe(false)
      act(() => root?.unmount())
      host?.remove()
    }
  })

  it('Input: `invalid` sigue pintando como siempre', () => {
    const el = montar(<Input invalid data-testid="c" />).querySelector('[data-testid="c"]')!
    expect(el.hasAttribute('data-invalid')).toBe(true)
  })

  it('MoneyInput (envuelve al Input) hereda el borde', () => {
    const el = montar(<MoneyInput value={null} onChange={() => {}} aria-invalid data-testid="c" />).querySelector(
      'input',
    )!
    expect(el.hasAttribute('data-invalid')).toBe(true)
  })

  it('Textarea: aria-invalid=true → data-invalid; sin error, no', () => {
    const con = montar(<Textarea aria-invalid data-testid="t" />).querySelector('textarea')!
    expect(con.hasAttribute('data-invalid')).toBe(true)
    act(() => root?.unmount())
    host?.remove()
    const sin = montar(<Textarea aria-invalid={false} data-testid="t" />).querySelector('textarea')!
    expect(sin.hasAttribute('data-invalid')).toBe(false)
  })

  it('SelectTrigger: aria-invalid=true → data-invalid y el borde de peligro; sin error, no', () => {
    const con = montar(
      <Select>
        <SelectTrigger aria-invalid data-testid="s">
          <SelectValue placeholder="Elige" />
        </SelectTrigger>
      </Select>,
    ).querySelector('[data-testid="s"]')!
    expect(con.hasAttribute('data-invalid')).toBe(true)
    expect(con.className).toContain('data-[invalid]:border-danger')
    act(() => root?.unmount())
    host?.remove()
    const sin = montar(
      <Select>
        <SelectTrigger data-testid="s">
          <SelectValue placeholder="Elige" />
        </SelectTrigger>
      </Select>,
    ).querySelector('[data-testid="s"]')!
    expect(sin.hasAttribute('data-invalid')).toBe(false)
  })
})

/*
 * Guardián: `aria-invalid` sale de un error DICHO, nunca de «está vacío».
 *
 * `aria-invalid={vacio}` o `aria-invalid={!valor}` pintaban de rojo un
 * formulario recién abierto (Armar el contrato, Generar documento). El
 * error va cuando la persona lo intentó o el servidor lo dijo
 * (`intentado && !x.trim()` sí vale).
 */
const SRC = 'src'

function tsx(d: string, out: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) {
      if (e === 'node_modules' || e === 'generated') continue
      tsx(p, out)
    } else if (/\.tsx$/.test(p) && !/\.test\.tsx$/.test(p)) out.push(p)
  }
  return out
}

/** `aria-invalid={vacio}`, `{vacia || …}`, `{empty}`, `{!valor}`, `{!x.trim()}`… */
const DE_VACIO = /aria-invalid=\{\s*(?:vac[ií][oa]\w*|empty\w*|isEmpty\w*|![\w.?]+(?:\.trim\(\))?)\s*(?:\|\||\})/

describe('🔴 guardián: ningún campo se pinta rojo por estar vacío', () => {
  it('ningún aria-invalid sale de «está vacío»', () => {
    const malos: string[] = []
    for (const f of tsx(SRC)) {
      const lineas = readFileSync(f, 'utf8').split('\n')
      lineas.forEach((l, i) => {
        if (DE_VACIO.test(l)) malos.push(`${f}:${i + 1}  ${l.trim()}`)
      })
    }
    expect(
      malos,
      `Estos campos llevan aria-invalid por estar vacíos: el adaptador los pinta de\n` +
        `rojo desde que se abre el formulario. Deja aria-invalid para el error dicho.\n\n` +
        `  ${malos.join('\n  ')}\n`,
    ).toEqual([])
  })
})
