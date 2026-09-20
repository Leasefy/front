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
    // Desde la v3.0 la página NO escribe el número a mano: importa la constante
    // y la pinta. Es más fuerte que lo de antes —un literal y una constante
    // podían separarse sin que nadie lo notara, que es justo el defecto que
    // este archivo existe para impedir— así que lo que se asegura ahora es que
    // la página siga leyendo de la fuente y no vuelva a escribirlo suelto.
    const pagina = leer('src/app/privacidad/page.tsx')
    expect(pagina).toContain('VERSION_POLITICA_DE_TRATAMIENTO')
    expect(pagina).toContain('@/lib/legal/versiones')
  })

  it('la versión de los términos es la que muestra /terminos', () => {
    // El texto vive en `TerminosContenido` desde el 2026-09-07 (la página y el
    // cajón del asistente lo comparten); la página sólo lo monta.
    expect(leer('src/components/legal/TerminosContenido.tsx')).toContain(
      numero(VERSION_TERMINOS),
    )
  })

  it('nadie vuelve a clavar una versión a mano en el portal del inquilino', () => {
    // El guardián de la regresión concreta: la cadena suelta que estuvo meses.
    const portal = leer('src/app/inquilino/documentos/page.tsx')
    expect(portal).toContain('VERSION_POLITICA_DE_TRATAMIENTO')
    expect(portal).not.toContain("createEmptyDocumentConsent('")
  })
})
