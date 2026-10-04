/**
 * «Por facturar» — qué se puede emitir hoy, qué no y por qué. PURA.
 *
 * QA de Facturación (QA-FACT, 03-10-2026) y las decisiones de Nico de ese día
 * (`memory/archivos/autonomo/decisiones.md`, «03-10 ~18:30»):
 *
 *   · **Escenario tributario sin confirmar → no se emite** hasta confirmarlo, con
 *     «Confirmar en el contrato» al lado. Se respeta acá también, no sólo en el
 *     back: un botón que deja apretar lo que el back va a rechazar es una trampa.
 *   · **La comisión del propietario se factura cuando se le gira**: antes sale sin
 *     preseleccionar y sin dejar emitir. La preselección del mes es SÓLO de
 *     inquilinos (FA-R13: antes marcaba también las comisiones desde el día 1).
 *   · **La factura del mes nunca lleva intereses**: se facturan aparte cuando se
 *     pagan. El aviso de «mora sin intereses» que el back pone en CADA fila se
 *     dice UNA vez arriba de la tabla (FA-03: salía 30 veces el mismo párrafo).
 *   · **Copropiedad**: una factura de comisión por copropietario con su parte
 *     («Jorge · 70 %»).
 *   · **Una factura anulada no se ve como «Emitida»** en «Por facturar».
 *
 * Los campos nuevos del back (`codigoNoEmitible`, `participacionBps`) son
 * OPCIONALES: con un back anterior la pantalla sigue funcionando con lo que ya
 * sabía leer (`emitible`, `motivoNoEmitible`, `impuestosSinConfirmar`).
 */

import type {
  EstadoDeLaResolucion,
  FacturaDelMes,
} from '@/lib/api/facturacion-por-mes.service'

// ── Qué se puede emitir ─────────────────────────────────────────────────────

/**
 * 🔴 El escenario tributario del contrato no está confirmado: la factura del
 * canon saldría sin los impuestos que de verdad lleva. Nico (03-10): no se
 * emite. Como el back: la del INQUILINO (la comisión depende del perfil de la
 * inmobiliaria, no del escenario del contrato).
 */
export function escenarioSinConfirmar(f: FacturaDelMes): boolean {
  if (f.estado === 'EMITIDA') return false
  return (
    f.codigoNoEmitible === 'ESCENARIO_SIN_CONFIRMAR' ||
    (f.destinatario === 'INQUILINO' && f.impuestosSinConfirmar === true)
  )
}

/**
 * Una factura que una nota crédito dejó sin efecto: antes de emitirse (FA-R16)
 * o ya emitida (`saldadaPorNota`, CONSISTENCIA 04-10-2026: LABQA-1 seguía
 * «Emitida» en Por facturar con la NC-1 encima, mientras Ventas decía que ya
 * se anuló).
 */
export function estaAnulada(f: FacturaDelMes): boolean {
  return f.codigoNoEmitible === 'ANULADA_POR_NOTA_CREDITO' || Boolean(f.saldadaPorNota)
}

const DICE_EL_GIRO = /\bgir(?:o|e|a|ar|ado|ada|en)\b/i

/**
 * 🔴 La comisión del propietario espera su giro (Nico, 03-10: «se factura al
 * marcar pagado su giro, con lo que de verdad se le descontó»). Con el código
 * del back, o con su frase si el back todavía no manda el código.
 */
export function esperaElGiro(f: FacturaDelMes): boolean {
  if (f.destinatario !== 'PROPIETARIO' || f.estado === 'EMITIDA' || estaAnulada(f)) return false
  if (f.codigoNoEmitible === 'GIRO_SIN_PAGAR') return true
  if (f.codigoNoEmitible) return false
  return !f.emitible && DICE_EL_GIRO.test(f.motivoNoEmitible ?? '')
}

/** Se puede emitir HOY: lleva casilla y «Generar esta». */
export function sePuedeEmitirHoy(f: FacturaDelMes): boolean {
  return (
    (f.estado === 'POR_EMITIR' || f.estado === 'GENERADA') &&
    f.emitible &&
    !escenarioSinConfirmar(f) &&
    !esperaElGiro(f)
  )
}

/**
 * Lo que la pantalla marca sola al cargar el mes: lo de INQUILINOS que se
 * puede emitir hoy. Las comisiones nunca vienen marcadas (FA-R13).
 */
export function seSugiere(f: FacturaDelMes, mes: string): boolean {
  return f.mes === mes && f.destinatario === 'INQUILINO' && sePuedeEmitirHoy(f)
}

export type EstadoDeLaFila =
  | 'emitida'
  | 'anulada'
  | 'sin-escenario'
  | 'espera-el-giro'
  | 'todavia-no'
  | 'por-emitir'

/** Qué dice la celda de estado de una fila. */
export function estadoDeLaFila(f: FacturaDelMes): EstadoDeLaFila {
  // La anulada primero: una emitida que una nota crédito anuló ya no está «Emitida».
  if (estaAnulada(f)) return 'anulada'
  if (f.estado === 'EMITIDA') return 'emitida'
  if (escenarioSinConfirmar(f)) return 'sin-escenario'
  if (esperaElGiro(f)) return 'espera-el-giro'
  if (!f.emitible) return 'todavia-no'
  return 'por-emitir'
}

/** La frase larga de por qué una fila no se emite hoy (cajón, `title`). */
export function porQueNoSeEmite(f: FacturaDelMes): string | null {
  switch (estadoDeLaFila(f)) {
    case 'sin-escenario':
      return 'El escenario tributario de este contrato no está confirmado: la factura saldría sin los impuestos que de verdad lleva. Confírmalo en el contrato y vuelve a esta pantalla para emitirla.'
    case 'espera-el-giro':
      return (
        f.motivoNoEmitible ??
        'La comisión se factura cuando se le gira al propietario, con lo que de verdad se le descontó.'
      )
    case 'anulada':
      return f.saldadaPorNota
        ? `Esta factura se anuló con la nota crédito ${f.saldadaPorNota.numero}.`
        : (f.motivoNoEmitible ?? 'Esta factura se anuló con una nota crédito.')
    case 'todavia-no':
      return f.motivoNoEmitible ?? 'Todavía no se puede emitir.'
    default:
      return null
  }
}

/**
 * Lo que dice la celda de una fila que todavía no se emite, en dos o tres
 * palabras. El porqué entero va en el `title` y en el cajón.
 */
export function motivoCorto(f: FacturaDelMes): string {
  switch (f.codigoNoEmitible) {
    case 'ANTES_DE_LA_FECHA_DE_CARTERA':
      return 'Desde su fecha de cartera'
    case 'PARTICIPACIONES_NO_SUMAN_100':
      return 'Revisa las participaciones'
    case 'COPROPIEDAD_SIN_MIGRACION':
      return 'Falta una actualización'
    default:
      return 'Todavía no'
  }
}

/** La ruta del contrato, en la sección del escenario tributario. */
export function rutaDelEscenario(f: Pick<FacturaDelMes, 'contractId'>): string {
  return `/panel/inmobiliaria/contratos/${f.contractId}#escenario-tributario`
}

// ── Quién recibe la factura ─────────────────────────────────────────────────

/** `7000` → «70», `3333` → «33,33». */
export function porcentajeDeLaParte(bps: number): string {
  return (bps / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })
}

/**
 * 🔴 Copropiedad (Nico, 03-10): una factura de comisión por copropietario con
 * su parte. «Jorge Restrepo · 70 %». El 100 % no se dice.
 */
export function aQuienSeFactura(f: FacturaDelMes): string {
  const bps = f.participacionBps
  if (typeof bps === 'number' && bps > 0 && bps < 10_000) {
    return `${f.terceroNombre} · ${porcentajeDeLaParte(bps)} %`
  }
  return f.terceroNombre
}

// ── La mora: una vez arriba, no en cada fila (FA-03) ─────────────────────────

const AVISO_DE_MORA_SIN_INTERESES =
  /^Esta cuota (?:está en mora hace|estuvo) [^.]*?la factura NO lleva intereses\.\s*/i

/** El aviso del back «Esta cuota está en mora… y la factura NO lleva intereses. <motivo>». */
export function esAvisoDeMoraSinIntereses(aviso: string): boolean {
  return AVISO_DE_MORA_SIN_INTERESES.test(aviso)
}

/** Los avisos que son de ESA fila (los de la mora sin intereses van arriba). */
export function avisosDeLaFila(f: FacturaDelMes): string[] {
  return f.avisos.filter((a) => !esAvisoDeMoraSinIntereses(a))
}

/** La factura trae renglones de intereses (un back anterior a la decisión del 03-10). */
export function llevaIntereses(f: FacturaDelMes): boolean {
  return f.lineas.some((l) => l.tipo === 'INTERES_DE_MORA' || l.tipo === 'GASTO_ADMINISTRATIVO')
}

export interface MoraDelMes {
  /** Cuántas filas por emitir tienen su cuota en mora. */
  enMora: number
  /** Los motivos distintos por los que no hay con qué liquidar el interés. */
  motivos: string[]
}

/**
 * Lo que la mora del mes tiene que decir UNA vez: cuántas cuotas están en mora
 * y, si las hay, las razones (casi siempre una sola: «la inmobiliaria no tiene
 * reglas de mora activas»). Las ya emitidas no cuentan: ésas ya salieron.
 */
export function moraDelMes(filas: readonly FacturaDelMes[]): MoraDelMes {
  const motivos = new Set<string>()
  let enMora = 0
  for (const f of filas) {
    if (f.estado === 'EMITIDA' || estaAnulada(f)) continue
    const avisoDeMora = f.avisos.find(esAvisoDeMoraSinIntereses)
    if (f.mora?.esCartera || avisoDeMora) enMora += 1
    if (avisoDeMora) {
      const motivo = avisoDeMora.replace(AVISO_DE_MORA_SIN_INTERESES, '').trim()
      if (motivo) motivos.add(motivo)
    } else if (f.mora?.sinReglas && f.mora.motivo) {
      motivos.add(f.mora.motivo)
    }
  }
  return { enMora, motivos: [...motivos] }
}

// ── La resolución ───────────────────────────────────────────────────────────

/**
 * 🔴 FA-08: el back dice «… Cárgala en Facturación → Resolución, eligiendo ese
 * tipo de documento (o una resolución sin tipo, que numera todo).» y la persona
 * YA está en Facturación, con el botón para cargarla al lado. Se quita esa
 * oración; lo demás queda tal cual.
 */
export function sinLaRutaDeFacturacion(texto: string | null | undefined): string {
  if (!texto) return ''
  const i = texto.search(/Cárgala en Facturación\s*→\s*Resolución/)
  if (i < 0) return texto
  const resto = texto.slice(i)
  const fin = resto.search(/\.(?:\s|$)/)
  const despues = fin < 0 ? '' : resto.slice(fin + 1)
  return `${texto.slice(0, i)}${despues}`.replace(/\s{2,}/g, ' ').trim()
}

/**
 * El número que sigue después de `n` emisiones: «LABQA-2» + 29 → «LABQA-31».
 * `null` si el número no termina en cifras (no se adivina).
 */
export function numeroDespuesDe(siguiente: string | null, cuantos: number): string | null {
  if (!siguiente) return null
  const m = /^(.*?)(\d+)$/.exec(siguiente)
  if (!m) return null
  return `${m[1]}${Number(m[2]) + Math.max(0, cuantos - 1)}`
}

/** «LABQA-2» o «LABQA-2 a LABQA-31». */
export function numerosQueSalen(
  resolucion: Pick<EstadoDeLaResolucion, 'siguiente'> | null,
  cuantos: number,
): string | null {
  if (!resolucion?.siguiente || cuantos <= 0) return null
  if (cuantos === 1) return resolucion.siguiente
  const ultimo = numeroDespuesDe(resolucion.siguiente, cuantos)
  return ultimo ? `${resolucion.siguiente} a ${ultimo}` : null
}

// ── Lo que todavía no está en la base ───────────────────────────────────────

/**
 * 🔴 FA-R27: sin su migración el back explica «… llega con la migración
 * 20260917120000_cola_y_entrega, que todavía no está aplicada…» y la pantalla
 * lo pintaba tal cual. El id de una migración no le dice nada a quien factura:
 * se dice qué falta y que lo demás sigue funcionando.
 */
export function faltaEnLaBase(que: string): string {
  return `${que} todavía no está disponible en esta base: falta una actualización que hace el equipo técnico de Leasefy. Emitir, numerar y el recaudo funcionan igual.`
}

/** «1 documento», «2 documentos». */
export function cuantos(n: number, singular: string, plural: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? singular : plural}`
}
