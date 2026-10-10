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
    case 'MANDANTE_SIN_TIPO_DE_DOCUMENTO':
      return 'Falta el tipo de documento del propietario'
    case 'MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR':
      return 'Revisa el tipo de documento del propietario'
    case 'MANDANTE_SIN_DOCUMENTO':
      return 'Falta el documento del propietario'
    case 'INQUILINO_SIN_TIPO_DE_DOCUMENTO':
      return 'Falta el tipo de documento del inquilino'
    // T-0163: la factura dividida entre los inquilinos se emite entera o no se emite.
    case 'INQUILINOS_PERFIL_TRIBUTARIO_DISTINTO':
      return 'Perfiles tributarios distintos'
    case 'DIVISION_BLOQUEADA_POR_OTRO_INQUILINO':
      return 'Espera la factura de otro inquilino'
    case 'DIVISION_SIN_MIGRACION':
      return 'Falta una actualización'
    case 'DIVISION_CON_CESION_DEL_INQUILINO':
      return 'Cesión en un contrato dividido'
    case 'DIVISION_NO_CUADRA':
      return 'El reparto no cuadra'
    default:
      return 'Todavía no'
  }
}

/**
 * 🔴 QA-FACT-CONTA-95 · B-08: los tres frenos de la factura por mandato por el
 * documento del propietario (espejo de `CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE`
 * del back). La fila los pinta igual: el motivo corto y «Completar en el propietario».
 */
export const CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE = [
  'MANDANTE_SIN_DOCUMENTO',
  'MANDANTE_SIN_TIPO_DE_DOCUMENTO',
  'MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR',
] as const

export function frenaPorElDocumentoDelMandante(codigo: string | null | undefined): boolean {
  return (CODIGOS_DEL_DOCUMENTO_DEL_MANDANTE as readonly string[]).includes(codigo ?? '')
}

/**
 * QA-FACT-PROF (04-10): la ficha del propietario a cuyo nombre sale la factura
 * por mandato, para completarle el tipo de documento. `null` sin mandante.
 */
export function rutaDelMandante(f: Pick<FacturaDelMes, 'mandato'>): string | null {
  const id = f.mandato?.mandanteId
  return id ? `/panel/inmobiliaria/propietarios/${id}` : null
}

/**
 * 🔴 QA-FACT-CONTA-95 r2 (decisión de Nico 05-10, «la a»): la persona inquilina
 * en Inquilinos («Editar datos» guarda el tipo en su contrato), para completar
 * el tipo de documento que falta. Vuelve a Facturación. `null` sin documento.
 */
export function rutaDelInquilino(f: Pick<FacturaDelMes, 'terceroDocumento'>): string | null {
  const doc = (f.terceroDocumento ?? '').trim()
  if (!doc) return null
  const volver = '/panel/inmobiliaria/facturacion?tab=nueva'
  return `/panel/inmobiliaria/inquilinos?persona=${encodeURIComponent(`doc:${doc}`)}&volver=${encodeURIComponent(volver)}`
}

/**
 * T-0163: las partes del contrato (donde se completa el tipo de documento de un
 * coarrendatario y se define el reparto de la factura).
 */
export function rutaDeLasPartesDelContrato(f: Pick<FacturaDelMes, 'contractId'>): string {
  return `/panel/inmobiliaria/contratos/${f.contractId}#partes-del-contrato`
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
 * La parte de la factura en palabras: «70», «33,33»; `null` si no hay reparto
 * (sin parte, un back anterior, o el 100 %, que no se dice).
 */
export function parteDeLaFactura(bps: number | null | undefined): string | null {
  return typeof bps === 'number' && bps > 0 && bps < 10_000 ? porcentajeDeLaParte(bps) : null
}

/**
 * 🔴 Copropiedad (Nico, 03-10): una factura de comisión por copropietario con
 * su parte. «Jorge Restrepo · 70 %». El 100 % no se dice.
 *
 * T-0163: igual del lado del inquilino, cuando el contrato divide su factura
 * entre varios: «Ana Gómez · 50 %».
 */
export function aQuienSeFactura(f: Pick<FacturaDelMes, 'terceroNombre' | 'participacionBps'>): string {
  const bps = f.participacionBps
  if (typeof bps === 'number' && bps > 0 && bps < 10_000) {
    return `${f.terceroNombre} · ${porcentajeDeLaParte(bps)} %`
  }
  return f.terceroNombre
}

// ── Un mes dividido entre los inquilinos del contrato (T-0163) ──────────────

/** La fila es parte de un mes dividido: el back le pone su `participacionBps` (la de un mes sin dividir va en `null`). */
function esParteDeUnMesDividido(f: FacturaDelMes): boolean {
  return f.destinatario === 'INQUILINO' && typeof f.participacionBps === 'number'
}

/**
 * Las filas del lado inquilino del MISMO contrato y mes (la propia incluida),
 * en el orden de la lista: el back las manda juntas, el titular primero. Todas
 * comparten la cuota, así que se emiten juntas o no se emiten.
 *
 * Sólo cuenta como «dividido» lo que el back marca con su parte
 * (`participacionBps` numérico): un mes sin dividir, y cualquier respuesta de un
 * back anterior, devuelve sólo la propia, como hasta hoy.
 *
 * `clave` es opaca: no se parte ni se lee, se compara entera.
 */
export function hermanasDeLaFila(f: FacturaDelMes, filas: readonly FacturaDelMes[]): FacturaDelMes[] {
  if (!esParteDeUnMesDividido(f)) return [f]
  const hermanas = filas.filter(
    (o) => esParteDeUnMesDividido(o) && o.contractId === f.contractId && o.mes === f.mes,
  )
  return hermanas.length > 1 && hermanas.some((o) => o.clave === f.clave) ? hermanas : [f]
}

/**
 * Marcar una factura de un mes dividido marca a las demás: la factura de un
 * contrato sale junta para todos sus inquilinos. Es comodidad —el back también
 * expande al emitir—, no la regla. Las hermanas que hoy no se pueden emitir no
 * entran a la selección.
 */
export function expandirALasHermanas(
  claves: Iterable<string>,
  filas: readonly FacturaDelMes[],
): Set<string> {
  const salida = new Set<string>()
  for (const clave of claves) {
    salida.add(clave)
    const fila = filas.find((f) => f.clave === clave)
    if (!fila) continue
    for (const h of hermanasDeLaFila(fila, filas)) {
      if (sePuedeEmitirHoy(h)) salida.add(h.clave)
    }
  }
  return salida
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
  resolucion: (Pick<EstadoDeLaResolucion, 'siguiente'> & { disponibles?: number }) | null,
  pedidas: number,
): string | null {
  // QA-FACT-PROF (04-10): nunca se promete un número fuera del rango («de la
  // FPA-1 a la FPA-3» con sólo 2 disponibles): se nombran los que alcanzan.
  const cuantos =
    typeof resolucion?.disponibles === 'number' ? Math.min(pedidas, resolucion.disponibles) : pedidas
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
