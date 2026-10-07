import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { VERSION_POLITICA_DE_TRATAMIENTO, VERSION_TERMINOS, VIGENCIA_POLITICA_DE_TRATAMIENTO } from './versiones'
import { POLITICA_V3 } from './politica-v3'
import { POLITICA_V4 } from './politica-v4'

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

  it('el registro de inmobiliaria acepta la MISMA versión de los términos que muestra (no «2026-08»)', async () => {
    // 🔴 30-09-2026: el paso «Habeas Data» mandaba `'2026-08'` escrito a mano
    // mientras en pantalla estaba la v2.0 del 5 de septiembre.
    const { CURRENT_TERMS_VERSION } = await import('@/lib/api/onboarding-session.service')
    expect(CURRENT_TERMS_VERSION).toBe(VERSION_TERMINOS)
  })

  it('nadie vuelve a clavar una versión a mano en el portal del inquilino', () => {
    // El guardián de la regresión concreta: la cadena suelta que estuvo meses.
    const portal = leer('src/app/inquilino/documentos/page.tsx')
    expect(portal).toContain('VERSION_POLITICA_DE_TRATAMIENTO')
    expect(portal).not.toContain("createEmptyDocumentConsent('")
  })
})

/**
 * 🔴 La cláusula de las preguntas al asistente, aprobada TAL CUAL por Nico el
 * 04-10-2026: política v4.0 (§13 y §16), la frase del Anexo de Encargo en la
 * §19 de los términos (v2.1). Un cambio material es una versión NUEVA; la v3.0
 * queda intacta (es lo que aceptó quien aceptó antes).
 */
describe('la cláusula de las preguntas al asistente (v4.0)', () => {
  const textoDe = (secciones: typeof POLITICA_V4, n: number) =>
    JSON.stringify(secciones.find((s) => s.n === n)?.bloques ?? [])

  const VINETA_13 =
    '**Conversaciones con el asistente de la plataforma**: 12 meses desde la última pregunta. Si borras una conversación, la borramos también de nuestros servidores.'
  const VINETA_16 =
    '**Revisar las preguntas que le hacen al asistente** para entender qué necesitan las inmobiliarias y mejorar sus respuestas. Las lee sólo el equipo de producto de Leasefy, con la inmobiliaria a la que pertenecen pero **sin el nombre ni el correo de quien preguntó**, y con los números largos (documentos, cuentas, teléfonos) ocultos. No las usamos para contactar a nadie, no las vendemos y no las compartimos con terceros. Se guardan 12 meses.'

  it('la versión publicada es la 4.0, con su fecha de vigencia', () => {
    expect(VERSION_POLITICA_DE_TRATAMIENTO).toBe('politica-tratamiento-v4.0')
    expect(VIGENCIA_POLITICA_DE_TRATAMIENTO).toBe('2026-10-04')
    const pagina = leer('src/app/privacidad/page.tsx')
    expect(pagina).toContain('POLITICA_V4')
    expect(pagina).toContain('VIGENCIA_POLITICA_DE_TRATAMIENTO')
  })

  it('§13 y §16 traen las viñetas nuevas palabra por palabra', () => {
    expect(textoDe(POLITICA_V4, 13)).toContain(JSON.stringify(VINETA_13).slice(1, -1))
    expect(textoDe(POLITICA_V4, 16)).toContain(JSON.stringify(VINETA_16).slice(1, -1))
  })

  it('la v3.0 no se tocó, y fuera de esas dos viñetas la v4.0 es la v3.0', () => {
    expect(textoDe(POLITICA_V3, 13)).not.toContain('asistente de la plataforma')
    expect(textoDe(POLITICA_V3, 16)).not.toContain('Revisar las preguntas')
    const sinLasNuevas = JSON.stringify(POLITICA_V4)
      .replace(',' + JSON.stringify(VINETA_13), '')
      .replace(',' + JSON.stringify(VINETA_16), '')
    expect(sinLasNuevas).toBe(JSON.stringify(POLITICA_V3))
  })

  it('los términos v2.1 traen la frase del Anexo de Encargo en la §19', () => {
    expect(VERSION_TERMINOS).toBe('terminos-v2.1')
    const terminos = leer('src/components/legal/TerminosContenido.tsx').replace(/\s+/g, ' ')
    expect(terminos).toContain(
      'La inmobiliaria autoriza a Leasefy a revisar, en los términos de la §16 de la Política, las preguntas que su equipo hace al asistente, con el único fin de mejorar el servicio.',
    )
  })
})

