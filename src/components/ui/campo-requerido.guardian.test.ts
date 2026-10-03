/**
 * 🔴 Guardián: un campo que la pantalla MARCA como requerido también se lo dice
 * a un lector de pantalla (ARREGLOS-7, Nico, ARREGLOS-4 Q4 A, 03-10-2026).
 *
 * ARREGLOS-4 quitó el `aria-invalid` de los requeridos VACÍOS (pintaban de rojo
 * un formulario recién abierto). Lo que quedó: el asterisco rojo se ve, pero un
 * lector de pantalla no sabía que el campo era obligatorio. La decisión: SÓLO
 * el atributo `aria-required` en el control, nada más (ni texto, ni estilo).
 *
 * ── Qué mira ────────────────────────────────────────────────────────────────
 * Una etiqueta (`<Label>` del DS o `<label>`) que marca el campo como requerido
 * —con la prop `required` del `Label` o con el asterisco rojo
 * (`<span className="… text-danger …">*</span>`)— y apunta con `htmlFor` a un
 * control del MISMO archivo (`id` igual). Ese control lleva `aria-required` (o
 * el `required` nativo, que ya lo dice).
 *
 * ── Qué no puede mirar (y por eso no está) ──────────────────────────────────
 * Las etiquetas sin `htmlFor` (no apuntan a ningún control) y los envoltorios
 * que reciben el control como `children` (`WizardFormField`, el `Campo` de
 * proveedores, `ConsignacionEditForm`, `PropietarioForm`): ahí el control vive
 * en otro lado y ponerle el atributo no es «sólo el atributo».
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

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

/** Hasta el `>` que cierra la etiqueta de apertura, saltando lo que va entre llaves y comillas. */
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

/** El valor de un atributo tal como está escrito: `"x"` o `{…}` (con sus llaves balanceadas). */
function valorDe(atributos: string, nombre: string): string | null {
  const m = new RegExp(`(?:^|\\s)${nombre}=`).exec(atributos)
  if (!m) return null
  const i = m.index + m[0].length
  if (atributos[i] === '"' || atributos[i] === "'") {
    const fin = atributos.indexOf(atributos[i], i + 1)
    return atributos.slice(i, fin + 1)
  }
  if (atributos[i] !== '{') return null
  let llaves = 0
  for (let j = i; j < atributos.length; j++) {
    if (atributos[j] === '{') llaves++
    else if (atributos[j] === '}' && --llaves === 0) return atributos.slice(i, j + 1)
  }
  return null
}

/** `"x"` y `{'x'}` / `{"x"}` / `{`x`}` sin interpolar son el mismo id. */
function normalizar(v: string): string {
  const lit = v.match(/^\{\s*(['"`])([^'"`$]*)\1\s*\}$/)
  if (lit) return `"${lit[2]}"`
  if (/^'.*'$/.test(v)) return `"${v.slice(1, -1)}"`
  return v.replace(/\s+/g, '')
}

/** Lo que es un control (lo que un lector de pantalla enfoca). */
const CONTROLES = new Set([
  'Input', 'input', 'Textarea', 'textarea', 'select', 'SelectTrigger', 'MoneyInput', 'PhoneInput',
  'Combobox', 'Checkbox', 'RadioGroup', 'Switch', 'DatePicker', 'AuthInput',
])

const ASTERISCO = /<span\b[^>]*\btext-danger\b[^>]*>\s*\*\s*<\/span>/

interface Campo {
  archivo: string
  linea: number
  id: string
  control: string
  dice: boolean
}

function camposMarcados(): Campo[] {
  const campos: Campo[] = []
  for (const f of tsx(SRC)) {
    const s = readFileSync(f, 'utf8')
    const etiqueta = /<(Label|label)\b/g
    let m: RegExpExecArray | null
    while ((m = etiqueta.exec(s))) {
      const finAp = finDeLaApertura(s, m.index + m[0].length)
      if (finAp < 0) continue
      const atributos = s.slice(m.index + m[0].length, finAp)
      if (atributos.trimEnd().endsWith('/')) continue
      const cierre = s.indexOf(`</${m[1]}>`, finAp)
      if (cierre < 0) continue
      const cuerpo = s.slice(finAp + 1, cierre)
      const requerido = /(?:^|\s)required(?=\s|$|=\{true\})/.test(atributos) || ASTERISCO.test(cuerpo)
      if (!requerido) continue
      const htmlFor = valorDe(atributos, 'htmlFor')
      if (!htmlFor) continue
      const id = normalizar(htmlFor)
      // El control con ese id, en el mismo archivo.
      const elemento = /<([A-Za-z][\w.]*)\b/g
      let e: RegExpExecArray | null
      while ((e = elemento.exec(s))) {
        if (!CONTROLES.has(e[1])) continue
        const fin = finDeLaApertura(s, e.index + e[0].length)
        if (fin < 0) continue
        const attrs = s.slice(e.index + e[0].length, fin)
        const suId = valorDe(attrs, 'id')
        if (!suId || normalizar(suId) !== id) continue
        campos.push({
          archivo: f,
          linea: s.slice(0, e.index).split('\n').length,
          id,
          control: e[1],
          dice: /(?:^|\s)aria-required(?=[=\s/]|$)/.test(attrs) || /(?:^|\s)required(?=[=\s/]|$)/.test(attrs),
        })
        break
      }
    }
  }
  return campos
}

/**
 * Los que todavía no lo dicen, con su porqué. Cada uno se va de acá el día que
 * su archivo se pueda tocar; la segunda prueba no deja que la lista se quede
 * con uno que ya cumple.
 */
const PENDIENTES: Record<string, string> = {
  // El `DatePicker` de Cadence no deja pasar `aria-*` (sus props son cerradas).
  'src/components/inmobiliaria/agenda/PedirCitaModal.tsx#"cita-fecha"': 'Cadence: DatePicker sin aria-required',
  // Archivos que otro agente tiene abiertos el 03-10 (no se tocan hasta su commit).
  'src/app/onboarding/propietario/page.tsx#"displayName"': 'MOV-A7 (onboarding)',
  'src/app/onboarding/propietario/page.tsx#"propertyCity"': 'MOV-A7 (onboarding)',
  'src/app/panel/inmobiliaria/pagos/cobranza/disputas/page.tsx#"disputa-reason"': 'MOV-A2 (cobranza)',
  'src/components/inmobiliaria/cobranza/DisputaDetailPanel.tsx#"resolver-outcome"': 'MOV-A2 (cobranza)',
  'src/components/inmobiliaria/cobranza/DisputaDetailPanel.tsx#"resolver-note"': 'MOV-A2 (cobranza)',
  'src/components/inmobiliaria/cobranza/EscalationResolveModal.tsx#"resolve-category"': 'MOV-A2 (cobranza)',
  'src/components/inmobiliaria/cobranza/EscalationResolveModal.tsx#"resolve-text"': 'MOV-A2 (cobranza)',
  'src/components/onboarding/inmobiliaria/AgencyStepForm.tsx#"legalName"': 'MOV-A7 (onboarding)',
  'src/components/onboarding/inmobiliaria/AgencyStepForm.tsx#"nit"': 'MOV-A7 (onboarding)',
  'src/components/onboarding/inmobiliaria/AgencyStepForm.tsx#"address.calle"': 'MOV-A7 (onboarding)',
  'src/components/onboarding/inmobiliaria/AgencyStepForm.tsx#"primaryContactEmail"': 'MOV-A7 (onboarding)',
  'src/components/onboarding/inmobiliaria/AgencyStepForm.tsx#"primaryContactPhone"': 'MOV-A7 (onboarding)',
}

const llave = (c: Campo) => `${c.archivo}#${c.id}`

describe('🔴 guardián: un campo marcado como requerido lleva aria-required', () => {
  it('ningún control marcado como requerido se queda sin aria-required', { timeout: 30_000 }, () => {
    const faltan = camposMarcados()
      .filter((c) => !c.dice && !(llave(c) in PENDIENTES))
      .map((c) => `${c.archivo}:${c.linea}  <${c.control} id=${c.id}>`)
    expect(
      faltan,
      `Estos controles tienen la etiqueta marcada como requerida (prop \`required\` del\n` +
        `Label o el asterisco rojo) y no lo dicen a un lector de pantalla. Ponles\n` +
        `aria-required (sólo el atributo).\n\n  ${faltan.join('\n  ')}\n`,
    ).toEqual([])
  })

  it('la lista de pendientes no se queda con uno que ya lo dice o ya no existe', { timeout: 30_000 }, () => {
    const hoy = new Map(camposMarcados().map((c) => [llave(c), c]))
    const sobran = Object.keys(PENDIENTES).filter((k) => !hoy.has(k) || hoy.get(k)!.dice)
    expect(sobran, `Sácalos de PENDIENTES:\n  ${sobran.join('\n  ')}\n`).toEqual([])
  })

  it('el barrido encuentra campos marcados de verdad', { timeout: 30_000 }, () => {
    // Un regex roto encontraría cero y pasaría verde para siempre.
    expect(camposMarcados().length).toBeGreaterThan(30)
  })
})
