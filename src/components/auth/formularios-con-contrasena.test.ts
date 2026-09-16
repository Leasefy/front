/**
 * Guardia: todo `<form>` con un campo de contraseña va en POST y con el botón
 * apagado hasta hidratar.
 *
 * El login dejaba el correo y la contraseña en la URL cuando alguien tocaba
 * «Iniciar sesión» antes de que React hidratara (prueba en vivo, 2026-09-16):
 * sin `onSubmit` que lo ataje, el navegador envía el formulario solo, por GET.
 * `AuthForm.envioAntesDeHidratar.test.tsx` prueba el comportamiento en el
 * login; esta guarda recorre el código para que el formulario con contraseña
 * que alguien agregue mañana no repita el defecto.
 *
 * Reglas, por archivo que dibuje un `type="password"` dentro de un `<form>`:
 *  1. cada `<form>` / `<motion.form>` del archivo declara `method="post"`;
 *  2. el archivo usa `useHidratado()` (el botón de enviar se apaga con él).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { describe, it, expect } from 'vitest'

const SRC = join(__dirname, '..', '..')

function archivosTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) {
      return nombre === 'node_modules' || nombre === '__tests__' ? [] : archivosTsx(ruta)
    }
    return nombre.endsWith('.tsx') && !nombre.includes('.test.') ? [ruta] : []
  })
}

const CAMPO_DE_CONTRASENA = /type=["']password["']|type=\{[^}]*["']password["'][^}]*\}/

/** Sin comentarios: un «envía el `<form>`» escrito en prosa no es un formulario. */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * Las etiquetas de apertura de formulario, enteras. Se corta en el primer `>`
 * que no esté dentro de llaves: los `=>` de un `onSubmit={() => …}` no cuentan.
 */
function aperturasDeFormulario(fuente: string): string[] {
  const codigo = sinComentarios(fuente)
  const etiquetas: string[] = []
  const inicio = /(?<!`)<(?:motion\.)?form[\s>]/g
  let m: RegExpExecArray | null
  while ((m = inicio.exec(codigo)) !== null) {
    let profundidad = 0
    let i = m.index + 1
    for (; i < codigo.length; i++) {
      const c = codigo[i]
      if (c === '{') profundidad++
      else if (c === '}') profundidad--
      else if (c === '>' && profundidad === 0) break
    }
    etiquetas.push(codigo.slice(m.index, i + 1))
  }
  return etiquetas
}

const conContrasena = archivosTsx(SRC)
  .map((ruta) => ({ ruta: relative(SRC, ruta).split(sep).join('/'), codigo: readFileSync(ruta, 'utf8') }))
  .filter(({ codigo }) => CAMPO_DE_CONTRASENA.test(codigo))
  .map((archivo) => ({ ...archivo, formularios: aperturasDeFormulario(archivo.codigo) }))
  .filter(({ formularios }) => formularios.length > 0)

describe('formularios con contraseña', () => {
  it('la guarda encuentra los que conocemos (si no, estaría revisando nada)', () => {
    const rutas = conContrasena.map((a) => a.ruta)
    expect(rutas).toEqual(
      expect.arrayContaining([
        'components/auth/AuthForm.tsx',
        'app/registro/page.tsx',
        'app/auth/update-password/page.tsx',
        'components/tenant/CrearCuentaDesdeAprobacion.tsx',
        'components/onboarding/inmobiliaria/PaymentProviderStepForm.tsx',
      ]),
    )
  })

  it.each(conContrasena.map((a) => [a.ruta, a] as const))(
    '🔴 %s: cada <form> va en POST y el botón espera a que React hidrate',
    (_ruta, archivo) => {
      const sinPost = archivo.formularios.filter((etiqueta) => !/\smethod=["']post["']/.test(etiqueta))
      expect(sinPost).toEqual([])
      expect(archivo.codigo).toMatch(/useHidratado\(\)/)
    },
  )
})
