import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { VERSION_POLITICA_DE_TRATAMIENTO, VERSION_TERMINOS, VIGENCIA_POLITICA_DE_TRATAMIENTO } from './versiones'
import { POLITICA_V3 } from './politica-v3'
import { POLITICA_V4 } from './politica-v4'
import {
  AUTORIZACION_DE_WHATSAPP,
  PARRAFO_DE_WHATSAPP,
  POLITICA_V5,
  SUBTITULO_DE_WHATSAPP,
} from './politica-v5'
import {
  CONTROL_DE_SALIDA,
  GRABACIONES_EN_LA_CONSERVACION,
  GRABACIONES_EN_LA_CONSERVACION_VIEJO,
  GRABACIONES_EN_LAS_LLAMADAS,
  GRABACIONES_EN_LAS_LLAMADAS_VIEJO,
  PARRAFO_DE_LOS_AGENTES,
  POLITICA_V6,
  QUIEN_VE_Y_QUIEN_DESCARGA,
  REGLAS_DE_SALIDA,
  SUBTITULO_DE_LOS_AGENTES,
} from './politica-v6'

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

  it('la v4.0 sigue escrita aparte (desde el 15-10 la publicada es la 5.0)', () => {
    expect(POLITICA_V4.length).toBe(19)
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

  it('los términos (desde la v2.1) traen la frase del Anexo de Encargo en la §19', () => {
    expect(VERSION_TERMINOS).toBe('terminos-v2.2')
    const terminos = leer('src/components/legal/TerminosContenido.tsx').replace(/\s+/g, ' ')
    expect(terminos).toContain(
      'La inmobiliaria autoriza a Leasefy a revisar, en los términos de la §16 de la Política, las preguntas que su equipo hace al asistente, con el único fin de mejorar el servicio.',
    )
  })
})

/**
 * 🔴 Los mensajes de la inmobiliaria por WhatsApp (Nico, 15-10-2026): política
 * v5.0 (§4 y §5) y términos v2.2 (§18). La v4.0 queda intacta.
 */
describe('WhatsApp a quien firmó contrato (v5.0 y v2.2)', () => {
  const textoDe = (secciones: typeof POLITICA_V5, n: number) =>
    JSON.stringify(secciones.find((s) => s.n === n)?.bloques ?? [])

  it('la v5.0 sigue escrita aparte (desde el 20-10 la publicada es la 6.0)', () => {
    expect(POLITICA_V5.length).toBe(19)
    expect(leer('src/app/privacidad/page.tsx')).not.toContain('POLITICA_V5')
  })

  it('§4 trae el subtítulo y el párrafo de WhatsApp después de «Operar el arrendamiento» (inquilinos y propietarios)', () => {
    expect(PARRAFO_DE_WHATSAPP).toContain('si eres propietario, de administración de tu inmueble')
    const s4 = POLITICA_V5.find((s) => s.n === 4)!.bloques
    const i = s4.findIndex((b) => b.texto === 'Operar el arrendamiento')
    expect(s4[i + 2]).toEqual({ tipo: 'sub', texto: SUBTITULO_DE_WHATSAPP })
    expect(s4[i + 3]).toEqual({ tipo: 'p', texto: PARRAFO_DE_WHATSAPP })
  })

  it('§5 trae la autorización y dice «versión 5.0»', () => {
    expect(textoDe(POLITICA_V5, 5)).toContain(JSON.stringify(AUTORIZACION_DE_WHATSAPP).slice(1, -1))
    expect(textoDe(POLITICA_V5, 5)).toContain('la versión 5.0')
    expect(textoDe(POLITICA_V4, 5)).toContain('la versión 3.0')
  })

  it('fuera de eso, la 5.0 es la 4.0 sin tocar (y la 4.0 no tiene nada de esto)', () => {
    expect(JSON.stringify(POLITICA_V4)).not.toContain('por WhatsApp de parte de tu inmobiliaria')
    const sinLoNuevo = JSON.stringify(POLITICA_V5)
      .replace(',' + JSON.stringify({ tipo: 'sub', texto: SUBTITULO_DE_WHATSAPP }), '')
      .replace(',' + JSON.stringify({ tipo: 'p', texto: PARRAFO_DE_WHATSAPP }), '')
      .replace(',' + JSON.stringify({ tipo: 'p', texto: AUTORIZACION_DE_WHATSAPP }), '')
      .replace('la versión 5.0', 'la versión 3.0')
    expect(sinLoNuevo).toBe(JSON.stringify(POLITICA_V4))
  })

  it('los términos v2.2 traen la autorización de WhatsApp en la §18', () => {
    const terminos = leer('src/components/legal/TerminosContenido.tsx').replace(/\s+/g, ' ')
    expect(terminos).toContain('Contar con la autorización de sus inquilinos y propietarios con contrato firmado para escribirles por WhatsApp')
    expect(terminos).toContain('lo apaga en la ficha de quien le pida no recibir más mensajes por WhatsApp')
  })
})

/**
 * 🔴 La política de datos hermética (Nico, 20-10-2026): política v6.0. La v5.0
 * queda intacta; los términos siguen en la v2.2.
 */
describe('la política de datos hermética (v6.0)', () => {
  const seccion = (secciones: typeof POLITICA_V6, n: number) => secciones.find((s) => s.n === n)!.bloques
  const texto = (secciones: typeof POLITICA_V6, n: number) => JSON.stringify(seccion(secciones, n))

  it('la publicada es la 6.0 desde el 20-10, y /privacidad la muestra', () => {
    expect(VERSION_POLITICA_DE_TRATAMIENTO).toBe('politica-tratamiento-v6.0')
    expect(VIGENCIA_POLITICA_DE_TRATAMIENTO).toBe('2026-10-20')
    expect(VERSION_TERMINOS).toBe('terminos-v2.2')
    const pagina = leer('src/app/privacidad/page.tsx')
    expect(pagina).toContain('POLITICA_V6')
    expect(pagina).not.toContain('POLITICA_V5')
  })

  it('§6 cierra con los agentes dentro de la plataforma', () => {
    const s6 = seccion(POLITICA_V6, 6)
    expect(s6.slice(-2)).toEqual([
      { tipo: 'sub', texto: SUBTITULO_DE_LOS_AGENTES },
      { tipo: 'p', texto: PARRAFO_DE_LOS_AGENTES },
    ])
  })

  it('§7 y §13: las grabaciones y transcripciones se guardan 2 años o mientras siga el caso jurídico (ya no 12 meses)', () => {
    expect(texto(POLITICA_V6, 7)).toContain(JSON.stringify(GRABACIONES_EN_LAS_LLAMADAS).slice(1, -1))
    expect(texto(POLITICA_V6, 13)).toContain(JSON.stringify(GRABACIONES_EN_LA_CONSERVACION).slice(1, -1))
    expect(texto(POLITICA_V6, 7) + texto(POLITICA_V6, 13)).not.toMatch(/12 meses, o hasta/)
    // La v5.0 publicada decía 12 meses: queda así, es lo que aceptó quien aceptó.
    expect(texto(POLITICA_V5, 7)).toContain(JSON.stringify(GRABACIONES_EN_LAS_LLAMADAS_VIEJO).slice(1, -1))
  })

  it('§11 trae el control antes de que algo salga, después del aviso', () => {
    const s11 = seccion(POLITICA_V6, 11)
    const i = s11.findIndex((b) => b.tipo === 'aviso')
    expect(s11[i + 1]).toEqual({ tipo: 'p', texto: CONTROL_DE_SALIDA })
    expect(s11[i + 2]).toEqual({ tipo: 'lista', items: [...REGLAS_DE_SALIDA] })
  })

  it('§17 dice quién ve y quién descarga, y §5 dice «versión 6.0»', () => {
    expect(texto(POLITICA_V6, 17)).toContain(JSON.stringify(QUIEN_VE_Y_QUIEN_DESCARGA).slice(1, -1))
    expect(texto(POLITICA_V6, 5)).toContain('la versión 6.0')
    expect(texto(POLITICA_V5, 5)).toContain('la versión 5.0')
  })

  it('fuera de eso, la 6.0 es la 5.0 sin tocar', () => {
    const sinLoNuevo = JSON.stringify(POLITICA_V6)
      .replace(',' + JSON.stringify({ tipo: 'sub', texto: SUBTITULO_DE_LOS_AGENTES }), '')
      .replace(',' + JSON.stringify({ tipo: 'p', texto: PARRAFO_DE_LOS_AGENTES }), '')
      .replace(',' + JSON.stringify({ tipo: 'p', texto: CONTROL_DE_SALIDA }), '')
      .replace(',' + JSON.stringify({ tipo: 'lista', items: [...REGLAS_DE_SALIDA] }), '')
      .replace(',' + JSON.stringify({ tipo: 'p', texto: QUIEN_VE_Y_QUIEN_DESCARGA }), '')
      .replace(JSON.stringify(GRABACIONES_EN_LAS_LLAMADAS), JSON.stringify(GRABACIONES_EN_LAS_LLAMADAS_VIEJO))
      .replace(JSON.stringify(GRABACIONES_EN_LA_CONSERVACION), JSON.stringify(GRABACIONES_EN_LA_CONSERVACION_VIEJO))
      .replace('la versión 6.0', 'la versión 5.0')
    expect(sinLoNuevo).toBe(JSON.stringify(POLITICA_V5))
  })

  it('no promete lo que todavía no está firmado con los proveedores de IA', () => {
    expect(JSON.stringify(POLITICA_V6)).not.toMatch(/no (los )?usan para (sus )?fines propios|no entrenan/i)
  })
})
