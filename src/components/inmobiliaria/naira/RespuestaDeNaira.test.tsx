/**
 * @vitest-environment happy-dom
 *
 * RespuestaDeNaira — las cuatro ramas de la respuesta en un bloque neutro «RESPUESTA» (13-06, Tarea 3; D13-8, D13-10, U6).
 *
 * Qué prueba: el bloque nunca es DATO ni una categoría; con `oraciones` (E13-4) cada una va en la de su sección, la causa
 * sin clase o la hipótesis sin banda se ocultan y cada cifra lleva su corte y su enlace; sin `oraciones`, el texto se
 * oculta si puede traer una causa, los cortes van por respuesta (C17) y el alcance se declara; las negativas sugieren sin
 * enviar, la acción lleva a Aprobaciones solo con permiso y las de grupo chico o persona no agregan ningún tamaño; el
 * ejemplo se marca. Fixtures del año 2000 que pasan el estricto. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true }),
  usePermissionsContextSafe: () => null,
}))

import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaConversationAnswer, type NairaConversationSentence } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'
import type { NairaConversacionNegada, NairaConversacionRespondida } from '@/lib/naira/conversacion'
import { rutaDeLaMetrica } from '@/lib/naira/fuente-a-ruta'

import { RespuestaDeNaira } from './RespuestaDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['conversacion.preguntar']
const AHORA = new Date('2000-01-03T12:00:00.000Z')
const ASOF_1 = '2000-01-03T11:00:00.000Z'
const ASOF_2 = '2000-01-04T11:00:00.000Z'

function respondidaDelEjemplo(): NairaConversacionRespondida {
  const e = EJEMPLOS_DE_NAIRA['conversacion.preguntar']
  if (e.kind !== 'respondida') throw new Error('el ejemplo de conversacion.preguntar (13-01) dejó de ser una respondida: ' + e.kind)
  return e
}
const BASE = respondidaDelEjemplo()
const ID = BASE.preguntaId

function sinEnmienda(r: NairaConversacionRespondida): NairaConversacionRespondida {
  const validada = ESTRICTO.parse(r)
  if (validada.kind !== 'respondida') throw new Error('sinEnmienda espera una respondida')
  const copia: NairaConversacionRespondida = { ...validada }
  delete copia.oraciones
  delete copia.refs
  return copia
}

const TEXTO = 'TOKEN-TEXTO (ejemplo)\n**sin markdown** (ejemplo)'
const RESPONDIDA: NairaConversacionRespondida = {
  ...BASE,
  texto: TEXTO,
  refsServidas: [],
  refs: [],
  asOfs: [ASOF_1, ASOF_2],
  alcance: { kind: 'toda_la_agencia' },
  noServidos: [],
  oraciones: TEXTO.split('\n').map((texto): NairaConversationSentence => ({ seccion: 'declaracion', texto, claimClass: null, cifras: [] })),
}
const POR_EJE: NairaConversacionRespondida = { ...RESPONDIDA, alcance: { kind: 'por_eje', eje: 'city' }, noServidos: ['grafo_sin_filtro_de_rol'] }
const CON_REFS: NairaConversacionRespondida = {
  ...RESPONDIDA,
  refsServidas: ['chunk-0001 (ejemplo)'],
  refs: [{ kind: 'investigacion', id: 'INV-0001 (ejemplo)' }],
}
const SIN_CORTES: NairaConversacionRespondida = { ...RESPONDIDA, asOfs: [] }

const ORACIONES: NairaConversationSentence[] = [
  { seccion: 'LIVE_DATA', texto: 'TOKEN-DATO (ejemplo)', claimClass: null, cifras: [{ metricId: 'cartera.morosidad_rate', asOf: ASOF_1 }] },
  { seccion: 'LIVE_DATA', texto: 'TOKEN-SIN-CORTE (ejemplo)', claimClass: null, cifras: [] },
  { seccion: 'KNOWLEDGE', texto: 'TOKEN-POLITICA (ejemplo)', claimClass: null, cifras: [] },
  { seccion: 'INFERENCE', texto: 'TOKEN-ASOCIACION (ejemplo)', claimClass: 'asociacion', cifras: [] },
  { seccion: 'INFERENCE', texto: 'TOKEN-SIN-CLASE (ejemplo)', claimClass: null, cifras: [] },
  { seccion: 'INFERENCE', texto: 'TOKEN-HIPOTESIS (ejemplo)', claimClass: 'hipotesis', cifras: [] },
  { seccion: 'declaracion', texto: 'TOKEN-DECLARACION (ejemplo)', claimClass: null, cifras: [] },
]
const CON_ORACIONES: NairaConversacionRespondida = {
  ...RESPONDIDA,
  oraciones: ORACIONES,
  texto: ORACIONES.map((o) => o.texto).join('\n'),
  refs: [{ kind: 'investigacion', id: 'INV-0001 (ejemplo)' }],
  refsServidas: ['INV-0001 (ejemplo)'],
  asOfs: [ASOF_1],
}

function negada(razon: NairaConversacionNegada['razon'], texto: string): NairaConversacionNegada {
  return {
    kind: 'negada',
    preguntaId: ID,
    razon,
    puedoResponder: [
      { kind: 'metrica', metricId: 'cartera.morosidad_rate', nombre: 'índice de morosidad' },
      { kind: 'politicas' },
      { kind: 'ficha_por_direccion_o_referencia' },
    ],
    texto,
  }
}
const NEGADA_ACCION = negada('accion_en_fase_12', 'TOKEN-NEGADA ¿Lo confirmás? (ejemplo)')
const NEGADA_BAJO_K = negada('bajo_k', 'Te respondo por inmueble, no por grupos chicos (ejemplo).')
const NEGADA_PERSONA = negada('dimension_de_persona', 'Te respondo por contrato, no por persona (ejemplo).')
const NEGADA_RANCIA = negada('fuente_rancia', 'La fuente está vieja (ejemplo).')
const NEGADA_PRESUPUESTO = negada('presupuesto_agotado', 'Sin cupo hoy (ejemplo).')
const BLOQUEADA: NairaConversationAnswer = { kind: 'bloqueada', preguntaId: ID, motivo: 'causal_sin_clase', texto: 'TOKEN-BLOQUEO (ejemplo)' }
const FALLIDA: NairaConversationAnswer = { kind: 'fallida', preguntaId: ID, razon: 'lectura_fallida', texto: 'TOKEN-FALLA (ejemplo)' }
const FALLIDA_REGISTRO: NairaConversationAnswer = { kind: 'fallida', preguntaId: ID, razon: 'registro_no_escrito', texto: 'TOKEN-FALLA (ejemplo)' }

const FIXTURES: readonly NairaConversationAnswer[] = [
  RESPONDIDA,
  POR_EJE,
  CON_REFS,
  SIN_CORTES,
  CON_ORACIONES,
  NEGADA_ACCION,
  NEGADA_BAJO_K,
  NEGADA_PERSONA,
  NEGADA_RANCIA,
  NEGADA_PRESUPUESTO,
  BLOQUEADA,
  FALLIDA,
  FALLIDA_REGISTRO,
]

let container: HTMLDivElement
let root: Root
const onSugerir = vi.fn()

beforeEach(() => {
  onSugerir.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(respuesta: NairaConversationAnswer, opciones: { origen?: 'agente' | 'ejemplo'; href?: string | null } = {}) {
  act(() => {
    root.render(
      <RespuestaDeNaira
        respuesta={respuesta}
        origen={opciones.origen ?? 'agente'}
        hrefDeAprobaciones={opciones.href === undefined ? '/sonda/aprobaciones' : opciones.href}
        onSugerir={onSugerir}
        ahora={AHORA}
      />,
    )
  })
}

const articulo = () => container.querySelector('article[data-naira-respuesta]')
const etiqueta = () => container.querySelector('[data-naira-etiqueta-respuesta]')?.textContent
const ETIQUETAS_DE_CATEGORIA = ['DATO', 'INFERENCIA', 'RECOMENDACIÓN', 'CONOCIMIENTO', 'MEMORIA', 'ACCIÓN']

/** El elemento más interno cuyo texto contiene `token`. */
function elementoCon(token: string): Element | null {
  const todos = Array.from(container.querySelectorAll('*')).filter((e) => e.textContent?.includes(token))
  return todos.find((e) => !Array.from(e.children).some((h) => h.textContent?.includes(token))) ?? null
}

describe('RespuestaDeNaira', () => {
  it('[N13:fixture-es-contrato] cada fixture pasa el esquema estricto', () => {
    for (const f of FIXTURES) {
      const r = ESTRICTO.safeParse(f)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
  })

  it('[N13:control-positivo] una respondida sin oraciones pinta su texto, la etiqueta, la nota, los cortes y el alcance', () => {
    montar(sinEnmienda(RESPONDIDA))
    const a = container.querySelector('article[data-naira-respuesta="respondida"]')
    expect(a?.textContent).toContain('TOKEN-TEXTO')
    expect(etiqueta()).toBe('RESPUESTA')
    expect(a?.textContent).toContain('Esta versión de Naira no separa dato, inferencia y recomendación dentro de la respuesta.')
    expect(a?.textContent).toContain('Cortes de los datos:')
    expect(a?.textContent).toContain('Alcance: toda la inmobiliaria')
  })

  it('[N13:conversacion-ramas] cada rama pinta su artículo rotulado RESPUESTA y dice qué hacer, sin números', () => {
    montar(NEGADA_ACCION)
    expect(articulo()?.getAttribute('data-naira-respuesta')).toBe('negada')
    expect(etiqueta()).toBe('RESPUESTA')
    expect(container.querySelector('[data-naira-texto-del-servidor]')?.textContent).toBe(NEGADA_ACCION.texto)
    expect(articulo()?.textContent).toContain('Puedes preguntarle por:')
    expect(container.querySelector('[data-naira-sugerencias]')).not.toBeNull()

    montar(BLOQUEADA)
    expect(articulo()?.getAttribute('data-naira-respuesta')).toBe('bloqueada')
    expect(etiqueta()).toBe('RESPUESTA')
    expect(articulo()?.textContent).toContain(
      'Naira armó una respuesta pero no pasó sus controles de calidad, así que no te la mostramos. Reformula la pregunta o inténtalo más tarde.',
    )
    expect(articulo()?.textContent).toContain('TOKEN-BLOQUEO')
    expect(articulo()?.textContent).not.toMatch(/\d/)
    expect(container.querySelector('[data-naira-asof]')).toBeNull()
    expect(container.innerHTML).not.toContain('causal_sin_clase')

    montar(FALLIDA)
    expect(articulo()?.getAttribute('data-naira-respuesta')).toBe('fallida')
    expect(etiqueta()).toBe('RESPUESTA')
    expect(articulo()?.textContent).toContain('TOKEN-FALLA')
    expect(articulo()?.textContent).toContain('No pude leer el dato. Eso no significa que sea cero. Reformula la pregunta o inténtalo más tarde.')
    expect(articulo()?.textContent).not.toMatch(/\d/)
    expect(container.querySelector('[data-naira-asof]')).toBeNull()

    montar(FALLIDA_REGISTRO)
    expect(articulo()?.textContent).toContain('Naira no pudo registrar tu pregunta, así que no la respondió. Inténtalo de nuevo en un momento.')
    expect(articulo()?.textContent).not.toMatch(/\d/)

    montar(sinEnmienda(RESPONDIDA))
    expect(articulo()?.getAttribute('data-naira-respuesta')).toBe('respondida')
    expect(etiqueta()).toBe('RESPUESTA')
  })

  it('[N13:respuesta-no-es-dato] el bloque nunca es una categoría; con oraciones las categorías viven dentro de ellas', () => {
    for (const r of [sinEnmienda(RESPONDIDA), NEGADA_ACCION, BLOQUEADA, FALLIDA]) {
      montar(r)
      const a = articulo()!
      expect(a.querySelectorAll('[data-categoria]'), r.kind).toHaveLength(0)
      expect(etiqueta(), r.kind).toBe('RESPUESTA')
      for (const el of Array.from(a.querySelectorAll('*'))) {
        expect(ETIQUETAS_DE_CATEGORIA, r.kind).not.toContain((el.textContent ?? '').trim())
      }
      expect(a.querySelectorAll('[data-claim-class]'), r.kind).toHaveLength(0)
    }
    montar(CON_ORACIONES)
    expect(etiqueta()).toBe('RESPUESTA')
    const oraciones = container.querySelector('[data-naira-oraciones]')!
    const categorias = Array.from(container.querySelectorAll('[data-categoria]'))
    expect(categorias.length).toBeGreaterThan(0)
    for (const c of categorias) expect(oraciones.contains(c)).toBe(true)
  })

  it('[N13:oraciones-por-seccion] con oraciones cada una va en la categoría de su sección y en el orden del servidor', () => {
    montar(CON_ORACIONES)
    const dato = elementoCon('TOKEN-DATO')!
    const politica = elementoCon('TOKEN-POLITICA')!
    const asociacion = elementoCon('TOKEN-ASOCIACION')!
    const declaracion = elementoCon('TOKEN-DECLARACION')!
    expect(dato.closest('[data-categoria="dato"][data-seccion="LIVE_DATA"]')).not.toBeNull()
    expect(politica.closest('[data-seccion="KNOWLEDGE"]')).not.toBeNull()
    expect(asociacion.closest('[data-seccion="INFERENCE"]')).not.toBeNull()
    expect(declaracion.closest('[data-naira-tramo-neutro]')).not.toBeNull()
    expect(declaracion.closest('[data-categoria]')).toBeNull()
    const orden = [dato, politica, asociacion, declaracion]
    for (let i = 0; i < orden.length - 1; i += 1) {
      expect(orden[i]!.compareDocumentPosition(orden[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(container.textContent).not.toContain('Esta versión de Naira no separa')
    expect(container.querySelector('[data-naira-sin-fuente-por-cifra]')).toBeNull()
    expect(container.querySelector('[data-naira-texto-del-servidor]')).toBeNull()
    expect(container.querySelector('[data-naira-alcance="toda_la_agencia"]')).not.toBeNull()
  })

  it('[N13:chip-por-clase] solo la causa con su clase lleva chip; sin clase o hipótesis sin banda se ocultan y se declara', () => {
    montar(CON_ORACIONES)
    // OracionesCausales (13-02) marca la oración visible (p) y su chip (button): una oración, un chip.
    const oracionesConClase = container.querySelectorAll('p[data-claim-class]')
    expect(oracionesConClase).toHaveLength(1)
    expect(oracionesConClase[0]?.getAttribute('data-claim-class')).toBe('asociacion')
    expect(oracionesConClase[0]?.textContent).toContain('TOKEN-ASOCIACION')
    expect(container.querySelectorAll('button[data-claim-class]')).toHaveLength(1)
    for (const el of Array.from(container.querySelectorAll('[data-claim-class]'))) expect(oracionesConClase[0]?.contains(el)).toBe(true)
    expect(container.textContent).not.toContain('TOKEN-SIN-CLASE')
    expect(container.textContent).not.toContain('TOKEN-HIPOTESIS')
    expect(container.querySelectorAll('[data-naira-causa-oculta]')).toHaveLength(1)
  })

  it('[N13:cifra-con-su-corte] cada cifra lleva su corte y su enlace; un dato sin corte no se pinta', () => {
    montar(CON_ORACIONES)
    const oracion = Array.from(container.querySelectorAll('[data-naira-oracion]')).find((e) => e.textContent?.includes('TOKEN-DATO'))!
    const cifras = oracion.nextElementSibling!
    expect(cifras.hasAttribute('data-naira-cifras-de-la-oracion')).toBe(true)
    expect(cifras.querySelectorAll(`[data-naira-asof="${ASOF_1}"]`)).toHaveLength(1)
    const enlaces = cifras.querySelectorAll('[data-naira-enlace="activo"]')
    expect(enlaces).toHaveLength(1)
    expect(enlaces[0]?.querySelector('a')?.getAttribute('href')).toBe(rutaDeLaMetrica('cartera.morosidad_rate'))
    expect(rutaDeLaMetrica('cartera.morosidad_rate')).toBe('/panel/inmobiliaria/pagos/cartera')
    expect(container.textContent).not.toContain('TOKEN-SIN-CORTE')
    expect(container.querySelector('[data-naira-dato-sin-corte]')?.textContent).toBe('Dato sin corte: no lo mostramos')
    expect(container.querySelectorAll('[data-naira-numero]')).toHaveLength(0)
    montar(CON_ORACIONES, { origen: 'ejemplo' })
    expect(container.querySelector(`[data-naira-asof="${ASOF_1}"]`)?.getAttribute('data-naira-ejemplo')).toBe('true')
  })

  it('[N13:causa-no-clasificada-oculta] con refs que pueden traer una causa, el texto no se muestra y quedan cortes y alcance', () => {
    montar(sinEnmienda(CON_REFS))
    expect(container.textContent).not.toContain('TOKEN-TEXTO')
    expect(container.querySelector('[data-naira-texto-oculto]')?.textContent).toBe(
      'Esta respuesta puede incluir una explicación de causas que esta versión de Naira no clasifica, así que no mostramos su texto. Abajo ves los cortes y el alcance.',
    )
    expect(container.querySelectorAll('[data-naira-asof]')).toHaveLength(2)
    expect(container.querySelector('[data-naira-alcance]')).not.toBeNull()
  })

  it('[N13:cortes-de-la-respuesta] sin oraciones, un corte por asOf dentro del artículo y ningún enlace', () => {
    montar(sinEnmienda(RESPONDIDA))
    const marcas = Array.from(container.querySelectorAll('[data-naira-asof]'))
    expect(marcas.map((m) => m.getAttribute('data-naira-asof'))).toEqual([ASOF_1, ASOF_2])
    for (const m of marcas) expect(m.closest('[data-naira-respuesta]')).toBe(articulo())
    const a = articulo()!
    expect(a.querySelectorAll('[data-naira-numero]')).toHaveLength(0)
    expect(a.querySelectorAll('[data-naira-enlace]')).toHaveLength(0)
    expect(a.querySelectorAll('a[href]')).toHaveLength(0)
    expect(container.querySelector('[data-naira-sin-fuente-por-cifra]')?.textContent).toBe(
      'Esta versión de Naira no indica de qué métrica sale cada cifra, así que no podemos enlazarla a su fuente.',
    )
    montar(sinEnmienda(SIN_CORTES))
    expect(container.textContent).not.toContain('Cortes de los datos:')
    expect(container.querySelector('[data-naira-asof]')).toBeNull()
  })

  it('[N13:alcance-declarado] el alcance por eje se nombra y lo que no consultó se declara', () => {
    montar(sinEnmienda(POR_EJE))
    expect(container.querySelector('[data-naira-alcance="por_eje"]')?.textContent).toBe('Alcance: por ciudad')
    expect(container.querySelector('[data-naira-no-servido="grafo_sin_filtro_de_rol"]')?.textContent).toBe(
      'No consulté las relaciones entre registros: todavía no se pueden filtrar por rol.',
    )
    montar(sinEnmienda(RESPONDIDA))
    expect(container.querySelector('[data-naira-alcance="toda_la_agencia"]')).not.toBeNull()
  })

  it('[N13:texto-tal-cual] el texto del servidor va sin Markdown, con sus saltos y su registro', () => {
    montar(sinEnmienda(RESPONDIDA))
    const p = container.querySelector('[data-naira-texto-del-servidor]')!
    expect(p.classList.contains('whitespace-pre-wrap')).toBe(true)
    expect(p.textContent).toBe(TEXTO)
    expect(p.querySelectorAll('strong, em, p')).toHaveLength(0)
    montar(NEGADA_ACCION)
    expect(container.querySelector('[data-naira-texto-del-servidor]')?.textContent).toContain('¿Lo confirmás?')
  })

  it('[N13:negativa-sugiere] una métrica sugerida precarga la pregunta sin enviarla; las demás son texto', () => {
    montar(NEGADA_ACCION)
    const sugerencias = container.querySelector('[data-naira-sugerencias]')!
    const boton = Array.from(sugerencias.querySelectorAll('button')).find((b) => b.textContent === 'índice de morosidad')
    expect(boton).toBeDefined()
    act(() => boton!.click())
    expect(onSugerir).toHaveBeenCalledTimes(1)
    expect(onSugerir).toHaveBeenCalledWith('Índice de morosidad: ¿cómo va?')
    for (const texto of ['Políticas de la agencia', 'Una ficha por dirección o referencia']) {
      const li = Array.from(sugerencias.querySelectorAll('li')).find((l) => l.textContent === texto)
      expect(li, texto).toBeDefined()
      expect(li!.querySelector('button, a'), texto).toBeNull()
    }
  })

  it('[N13:accion-en-aprobaciones] pedir una acción manda a Aprobaciones, con enlace solo con permiso, sin ejecutar nada', () => {
    const frase = 'Naira no ejecuta acciones desde la conversación: lo que propone se revisa y se aprueba en Aprobaciones.'
    montar(NEGADA_ACCION, { href: '/sonda/aprobaciones' })
    const copia = container.querySelector('[data-naira-copia-propia="aprobaciones"]')!
    expect(copia.textContent).toContain(frase)
    const enlace = copia.querySelector('a[href="/sonda/aprobaciones"]')
    expect(enlace?.textContent).toBe('Ir a Aprobaciones')
    const sugerencias = container.querySelector('[data-naira-sugerencias]')!
    for (const b of Array.from(container.querySelectorAll('button'))) expect(sugerencias.contains(b)).toBe(true)
    montar(NEGADA_ACCION, { href: null })
    expect(container.querySelector('[data-naira-copia-propia="aprobaciones"]')?.textContent).toContain(frase)
    expect(articulo()!.querySelectorAll('a')).toHaveLength(0)
    const sugerencias2 = container.querySelector('[data-naira-sugerencias]')!
    for (const b of Array.from(container.querySelectorAll('button'))) expect(sugerencias2.contains(b)).toBe(true)
  })

  it('[N13:b5-reencuadre-sin-n] las negativas por grupo chico o por persona no agregan ningún tamaño', () => {
    for (const r of [NEGADA_BAJO_K, NEGADA_PERSONA]) {
      montar(r)
      expect(container.querySelector('[data-naira-copia-propia]'), r.razon).toBeNull()
      const a = articulo()!
      const delServidor = a.querySelector('[data-naira-texto-del-servidor]')?.textContent ?? ''
      const propio = (a.textContent ?? '').split(delServidor).join('')
      expect(propio, r.razon).not.toMatch(/\d/)
      expect(a.textContent, r.razon).toContain('Puedes preguntarle por:')
      expect(a.textContent, r.razon).toContain('índice de morosidad')
    }
  })

  it('[N13:precaucion-y-presupuesto] la fuente rancia lleva su precaución y el presupuesto su frase', () => {
    montar(NEGADA_RANCIA)
    const precaucion = container.querySelector('[data-naira-copia-propia="precaucion"]')!
    expect(precaucion.textContent).toContain('Fuente desactualizada')
    expect(precaucion.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    montar(NEGADA_PRESUPUESTO)
    expect(container.querySelector('[data-naira-copia-propia="frase"]')?.textContent).toBe(
      'Llegaste al límite de preguntas de hoy. Vuelve a intentarlo mañana.',
    )
  })

  it('[N13:simulado-visible] con datos de ejemplo los cortes dicen DATO DE EJEMPLO y la etiqueta sigue siendo RESPUESTA', () => {
    montar(sinEnmienda(RESPONDIDA), { origen: 'ejemplo' })
    const marcas = Array.from(container.querySelectorAll('[data-naira-asof]'))
    expect(marcas).toHaveLength(2)
    for (const m of marcas) {
      expect(m.getAttribute('data-naira-ejemplo')).toBe('true')
      expect(m.textContent).toBe('DATO DE EJEMPLO')
    }
    expect(container.querySelector('time')).toBeNull()
    expect(etiqueta()).toBe('RESPUESTA')
  })
})
