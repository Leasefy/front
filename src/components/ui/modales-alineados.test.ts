/**
 * Todos los modales de la plataforma se ven igual arriba.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * La cabecera de un modal —título, ✕, filete— no la decide cada pantalla: la
 * impone `components/ui/dialog.tsx`. Pero la primitiva sólo puede imponerla si
 * el call site la USA. Un modal que arma su propio `<h2>` y su propia ✕
 * compila, pasa todos los tests y se ve distinto: es exactamente cómo
 * aparecieron los títulos de 22px al lado de los de 16px.
 *
 * Este test es estático a propósito. Montar los ~29 diálogos de la primitiva
 * (más las cáscaras a mano) con sus providers, permisos y hooks de red para
 * comprobar tres cosas de layout cuesta muchísimo más y falla por motivos que
 * no son éste.
 */

import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const RAIZ = join(process.cwd(), 'src')
const PRIMITIVA = join(RAIZ, 'components/ui/dialog.tsx')

/**
 * Diálogos que legítimamente no llevan la cabecera estándar.
 *
 * Se listan uno por uno, con motivo: una excepción sin nombre se convierte en
 * la puerta por la que vuelve el desorden.
 */
const SIN_CABECERA_JUSTIFICADO: Record<string, string> = {
  'components/inmobiliaria/CommandPalette.tsx':
    'Paleta de comandos: su primer elemento es el buscador, no un título. Un ' +
    'filete y una ✕ arriba estorbarían el único gesto que importa (escribir).',
  'components/inmobiliaria/AgencyCheckoutOverlay.tsx':
    'Overlay de estado del checkout directo a Wompi: muestra el progreso del ' +
    'pago (procesando/esperando/éxito/error) como una tarjeta centrada con ' +
    'ícono, no como un diálogo con título. Es no-descartable mientras el pago ' +
    'está en curso, así que una cabecera con filete y ✕ no corresponde.',
}

function archivosTsx(dir: string, encontrados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      archivosTsx(ruta, encontrados)
    } else if (entrada.name.endsWith('.tsx') && !entrada.name.includes('.test.')) {
      encontrados.push(ruta)
    }
  }
  return encontrados
}

const TODOS = archivosTsx(RAIZ)
// Normalizamos a '/' para que las comparaciones de ruta (exclusión de
// components/ui/, allowlist) funcionen también en Windows, donde `relative`
// devuelve separadores '\'.
const rel = (p: string) => relative(RAIZ, p).replace(/\\/g, '/')

const usanDialogContent = TODOS.filter((p) => {
  if (rel(p).startsWith('components/ui/')) return false
  return /<DialogContent[\s>]/.test(readFileSync(p, 'utf8'))
})

describe('modales del panel — una sola cabecera', () => {
  it('encuentra los modales (si no, el glob se rompió y el test no prueba nada)', () => {
    expect(usanDialogContent.length).toBeGreaterThanOrEqual(20)
  })

  it.each(usanDialogContent.map((p) => [rel(p), p] as const))(
    '%s usa <DialogHeader>',
    (nombre, ruta) => {
      if (nombre in SIN_CABECERA_JUSTIFICADO) return
      const fuente = readFileSync(ruta, 'utf8')
      expect(
        /<DialogHeader[\s>]/.test(fuente),
        'Este modal no usa <DialogHeader>, así que se queda sin el título de ' +
          '16px, sin el filete y sin la ✕ del chip: se va a ver distinto al resto. Si de verdad no corresponde, agregalo a ' +
          'SIN_CABECERA_JUSTIFICADO con el motivo.',
      ).toBe(true)
    },
  )

  it('ningún call site cambia el TAMAÑO del título (el color sí se puede)', () => {
    const infractores: string[] = []
    for (const ruta of usanDialogContent) {
      const fuente = readFileSync(ruta, 'utf8')
      for (const m of fuente.matchAll(/<DialogTitle[^>]*className="([^"]*)"/g)) {
        const clases = m[1] ?? ''
        if (/\btext-(xs|sm|base|lg|xl|\d?xl|\[\d)/.test(clases)) {
          infractores.push(`${rel(ruta)} → ${clases}`)
        }
      }
    }
    expect(infractores, 'El tamaño del título lo fija la primitiva.').toEqual([])
  })
})

describe('la primitiva conserva lo que la hace única', () => {
  const fuente = readFileSync(PRIMITIVA, 'utf8')

  // El título del DS es `text-h2` (22px). tailwind-merge NO lo reconoce como
  // tamaño, así que un `className="text-base"` NO gana: sobreviven las dos
  // clases y decide el orden del CSS. Por eso va por especificidad de
  // descendiente. Si alguien lo "simplifica", los títulos vuelven a 22px.
  it('baja el título a 16px con un selector de descendiente, no con className', () => {
    expect(fuente).toContain('[&_h2]:text-base')
  })

  it('la cabecera y el pie quedan fijos, y sólo scrollea el cuerpo', () => {
    expect(fuente).toContain('border-b border-border')
    expect(fuente).toContain('border-t border-border')
    // `min-h-0` es lo que permite que el hijo flex se achique y aparezca su
    // scroll. Sin él vuelve a scrollear el contenedor y el título se va.
    expect(fuente).toMatch(/min-h-0[^\n]*overflow-y-auto|overflow-y-auto[^\n]*min-h-0/)
  })

  it('no deja dos ✕: apaga la del DS cuando la cabecera trae la suya', () => {
    expect(fuente).toContain('hideClose={hideClose || cabeceraTraeCierre}')
  })
})

describe('las cáscaras de modal escritas a mano usan el mismo radio', () => {
  // No todo modal pasa por la primitiva: propietarios, portafolio, ajustes y
  // visitas montan la suya con `createPortal` + una capa `fixed inset-0`. El
  // radio del DS (§41) es 20px; una cáscara en `rounded-xl` (12px) al lado de
  // un modal de la primitiva se nota.
  //
  // El barrido se limita a ESOS archivos a propósito: buscar `rounded-xl` en
  // todo `src` marca tarjetas y paneles, que sí van en 12px.
  const cascarasAMano = TODOS.filter((p) => {
    const f = readFileSync(p, 'utf8')
    return f.includes('createPortal') && f.includes('inset-0')
  })

  it('encuentra las cáscaras a mano', () => {
    expect(cascarasAMano.length).toBeGreaterThanOrEqual(5)
  })

  it('ninguna quedó en rounded-xl', () => {
    const infractoras: string[] = []
    for (const ruta of cascarasAMano) {
      for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
        const esContenedorDeModal =
          /rounded-xl/.test(linea) &&
          /(max-w-(sm|md|lg|xl|2xl|4xl)|max-h-\[8[05]vh\])/.test(linea)
        if (esContenedorDeModal) infractoras.push(`${rel(ruta)} → ${linea.trim().slice(0, 90)}`)
      }
    }
    expect(infractoras, 'Usar rounded-[20px], como la primitiva.').toEqual([])
  })
})
