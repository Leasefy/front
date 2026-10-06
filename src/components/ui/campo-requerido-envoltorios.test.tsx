/**
 * Los envoltorios de campo que el guardián `campo-requerido` no ve (ARREGLOS-8,
 * ARREGLOS-4 Q4 A, 03-10-2026).
 *
 * El guardián mira una `<Label>`/`<label>` con `htmlFor` y el control con ese
 * id en el mismo archivo. Se le escapan los envoltorios que reciben el control
 * como `children` y pintan ellos la etiqueta con el asterisco rojo:
 *
 *   · el `FormField` del asistente de postulación (`wizard/WizardFormField`):
 *     ahora le avisa a `LightInput`/`LightSelect` (y a un control propio, con
 *     `useCampoRequerido`) y ellos ponen `aria-required`;
 *   · los `InputWrapper` de `ConsignacionEditForm`, `PropietarioForm` y
 *     `ConfigPerfilAgencia`: el control de cada uno marcado `required` lleva
 *     `aria-required` en el mismo archivo.
 *
 * SÓLO el atributo: ni texto, ni estilo (la decisión de Nico).
 * El `Campo` de proveedores no está acá: sus dos requeridos ya llevan el
 * `required` nativo, que lo dice solo.
 */
import * as React from 'react'
import { act } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { FormField, LightInput, LightSelect, useCampoRequerido } from '@/components/wizard/WizardFormField'

let host: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  host?.remove()
  host = null
  root = null
})

function pintar(el: React.ReactElement) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}

/** Un control propio del paso (como el `CurrencyInput` de los ingresos). */
function ControlPropio({ id }: { id: string }) {
  const requerido = useCampoRequerido()
  return <input id={id} aria-required={requerido || undefined} readOnly />
}

describe('🔴 el FormField del asistente le dice «requerido» a su control', () => {
  it('LightInput dentro de un FormField requerido lleva aria-required', () => {
    const h = pintar(
      <FormField label="Nombre completo" htmlFor="fullName" required>
        <LightInput id="fullName" value="" onChange={() => {}} />
      </FormField>,
    )
    expect(h.querySelector('#fullName')?.getAttribute('aria-required')).toBe('true')
  })

  it('LightSelect dentro de un FormField requerido lleva aria-required en su disparador', () => {
    const h = pintar(
      <FormField label="Tipo de documento" htmlFor="documentType" required>
        <LightSelect
          id="documentType"
          value=""
          onChange={() => {}}
          options={[{ value: 'CC', label: 'Cédula' }]}
        />
      </FormField>,
    )
    expect(h.querySelector('#documentType')?.getAttribute('aria-required')).toBe('true')
  })

  it('un control propio lo lee con useCampoRequerido', () => {
    const h = pintar(
      <FormField label="Salario mensual" htmlFor="monthlySalary" required>
        <ControlPropio id="monthlySalary" />
      </FormField>,
    )
    expect(h.querySelector('#monthlySalary')?.getAttribute('aria-required')).toBe('true')
  })

  it('sin `required` no lo dice (un opcional sigue siendo opcional)', () => {
    const h = pintar(
      <FormField label="Personas a cargo" htmlFor="dependents">
        <LightInput id="dependents" value="" onChange={() => {}} />
      </FormField>,
    )
    expect(h.querySelector('#dependents')?.hasAttribute('aria-required')).toBe(false)
  })
})

/** Hasta el `>` que cierra la etiqueta de apertura, saltando llaves y comillas. */
function finDeLaApertura(s: string, desde: number): number {
  let llaves = 0
  let comilla: string | null = null
  for (let i = desde; i < s.length; i++) {
    const c = s[i]
    if (comilla) {
      if (c === comilla) comilla = null
      continue
    }
    if (llaves === 0 && (c === '"' || c === "'")) comilla = c
    else if (c === '{') llaves++
    else if (c === '}') llaves--
    else if (c === '>' && llaves === 0) return i
  }
  return -1
}

const CONTROL = /<(Input|Textarea|SelectTrigger|RadioCardGroup|MoneyInput|PhoneInput|Combobox|input|textarea|select)\b/

/** Cada `<InputWrapper … required>` del archivo, con el control de adentro (o null). */
function requeridos(archivo: string) {
  const s = readFileSync(archivo, 'utf8')
  const out: { linea: number; control: string | null; dice: boolean }[] = []
  const re = /<InputWrapper\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const fin = finDeLaApertura(s, m.index + m[0].length)
    const atributos = s.slice(m.index + m[0].length, fin)
    if (!/(?:^|\s)required(?=\s|$)/.test(atributos)) continue
    const cierre = s.indexOf('</InputWrapper>', fin)
    const cuerpo = s.slice(fin + 1, cierre)
    const c = CONTROL.exec(cuerpo)
    let dice = false
    if (c) {
      const finDelControl = finDeLaApertura(cuerpo, c.index + c[0].length)
      const attrs = cuerpo.slice(c.index + c[0].length, finDelControl)
      dice = /(?:^|\s)aria-required(?=[=\s/]|$)/.test(attrs) || /(?:^|\s)required(?=[=\s/]|$)/.test(attrs)
    }
    out.push({ linea: s.slice(0, m.index).split('\n').length, control: c?.[1] ?? null, dice })
  }
  return out
}

describe('🔴 los InputWrapper requeridos: su control lleva aria-required', () => {
  it.each([
    ['src/components/inmobiliaria/ConsignacionEditForm.tsx', 9],
    // QA-PROP (03-10, PR-02/P-13): siempre requeridos sólo tipo, número de
    // documento y nombre. El correo (política de la inmobiliaria) y la cuenta
    // (banco, tipo y número, apenas se empieza) son requeridos A VECES
    // (`required={…}`), con su `aria-required` igual de condicional: eso lo
    // prueba `PropietarioForm.qa-prop.test.tsx`. El teléfono ya no lo es.
    ['src/components/inmobiliaria/PropietarioForm.tsx', 3],
    ['src/components/inmobiliaria/ConfigPerfilAgencia.tsx', 1],
  ] as const)('%s', (archivo, cuantos) => {
    const campos = requeridos(archivo).filter((c) => c.control !== null)
    expect(campos.length, 'el barrido encuentra los campos requeridos').toBe(cuantos)
    const faltan = campos.filter((c) => !c.dice).map((c) => `${archivo}:${c.linea} <${c.control}>`)
    expect(faltan).toEqual([])
  })
})
