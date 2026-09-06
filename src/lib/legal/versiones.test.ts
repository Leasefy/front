import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { VERSION_POLITICA_DE_TRATAMIENTO, VERSION_TERMINOS } from './versiones'

/**
 * La versión que se guarda como prueba tiene que ser la que está publicada.
 *
 * Lo que se conserva de una autorización es la VERSIÓN del texto aceptado. Si
 * la constante y la página se separan, la fila apunta a algo que nadie puede
 * leer, y el art. 12 de la Ley 1581 nos obliga a entregarle al titular copia de
 * lo que autorizó.
 *
 * Pasó: el portal del inquilino guardaba la cadena 'v1' escrita a mano mientras
 * la política publicada iba en la v2.0. Cada consentimiento nacía apuntando a
 * una versión inexistente.
 */
const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8')

/** `politica-tratamiento-v2.0` → `v2.0`, que es como se muestra en la ficha. */
const numero = (version: string) => version.slice(version.lastIndexOf('-v') + 1)

describe('las versiones legales no se separan de lo publicado', () => {
  it('la versión de la política es la que muestra /privacidad', () => {
    expect(leer('src/app/privacidad/page.tsx')).toContain(
      numero(VERSION_POLITICA_DE_TRATAMIENTO),
    )
  })

  it('la versión de los términos es la que muestra /terminos', () => {
    expect(leer('src/app/terminos/page.tsx')).toContain(numero(VERSION_TERMINOS))
  })

  it('nadie vuelve a clavar una versión a mano en el portal del inquilino', () => {
    // El guardián de la regresión concreta: la cadena suelta que estuvo meses.
    const portal = leer('src/app/inquilino/documentos/page.tsx')
    expect(portal).toContain('VERSION_POLITICA_DE_TRATAMIENTO')
    expect(portal).not.toContain("createEmptyDocumentConsent('")
  })
})
