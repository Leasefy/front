/**
 * escenarios-tributarios — quién paga qué impuesto, y por qué.
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * En el catálogo de Portofino, **el tratamiento tributario está metido dentro
 * del NOMBRE del concepto**. Hay nueve "Canon de arrendamiento":
 *
 *     Canon De Arrendamiento con IVA
 *     Canon De Arrendamiento Con Iva y Retención
 *     Canon De Arrendamiento Con Iva, Retención Y Retecree
 *     Canon De Arrendamiento con IVA, RF y Reteiva
 *     Canon De Arrendamiento con Iva, RF, Reteica y Reteiva
 *     Canon De Arrendamiento con IVA, RF, y Reteica
 *     Canon De Arrendamiento Con Retencion
 *     Canon De Arrendamiento Personas Naturales
 *     CANON DE ARRENDAMIENTO INMUEBLE ARRENDADO
 *
 * Son el mismo concepto: cambia a quién se le cobra. Elegir mal entre nueve
 * opciones que se llaman casi igual no da un error — da una factura equivocada,
 * y nadie se entera hasta la declaración.
 *
 * Los impuestos no los decide el concepto: los decide **quién le paga a quién**.
 * Acá se calculan a partir de los perfiles de las dos partes y del uso del
 * inmueble, y el concepto vuelve a ser uno solo.
 *
 * ── Las reglas, y de dónde salen ────────────────────────────────────────────
 *
 * **IVA.** El arrendamiento de inmueble para VIVIENDA está excluido de IVA
 * (Estatuto Tributario, art. 476 num. 5). El comercial sí está gravado, a la
 * tarifa general. Por eso el uso del inmueble no es un dato de ficha: es lo que
 * decide si hay IVA — y hoy el contrato ni siquiera lo guarda.
 *
 * **Retención en la fuente.** La practica el PAGADOR, y sólo si es agente
 * retenedor. Es la regla que contó Juan: entre dos personas naturales no hay
 * retención; si el que paga es una empresa, sí. No depende de quién recibe.
 * Además tiene base mínima: 10 UVT para arrendamiento de inmuebles.
 *
 * **ReteIVA.** Sólo puede existir si hay IVA. La practica el pagador cuando es
 * agente de retención de IVA, sobre el VALOR DEL IVA, no sobre la base.
 *
 * **ReteICA.** Es municipal: la tarifa y quién es agente retenedor cambian por
 * municipio y actividad. Por eso entra como parámetro y no como constante.
 *
 * ── Lo que acá NO se decide ─────────────────────────────────────────────────
 *
 * Las tarifas son configurables. Las que vienen por defecto son las que la
 * inmobiliaria ya tenía en su catálogo (IVA 19, RF 3.5 y 11, ReteIVA 15,
 * ReteICA 0.8) — no son una opinión nuestra sobre la ley, son su configuración
 * actual, para que migrar no cambie ni un peso.
 */

export type TipoPersona = 'NATURAL' | 'JURIDICA'

export type UsoDelInmueble = 'VIVIENDA' | 'COMERCIAL'

/**
 * Sobre qué base tributaria se comporta un concepto. Es lo que antes estaba
 * escrito en el nombre.
 */
export type BaseTributaria =
  /** Canon, incrementos, reajustes: RF de arrendamiento, IVA si es comercial. */
  | 'ARRENDAMIENTO'
  /** Comisiones y servicios inmobiliarios: RF de comisiones, IVA siempre. */
  | 'COMISION'
  /** Servicios gravados (avalúos, papelería, remodelación): IVA, sin RF propia. */
  | 'SERVICIO_GRAVADO'
  /** Traslados, devoluciones, ajustes: no generan impuesto. */
  | 'NO_GRAVADO'

export interface PerfilTributario {
  tipoPersona: TipoPersona
  /** Cobra IVA en sus facturas. */
  responsableIva: boolean
  /** Practica retención en la fuente a quien le factura. */
  agenteRetenedorRenta: boolean
  /** Practica ReteIVA. Implica ser agente retenedor de renta. */
  agenteRetenedorIva: boolean
  /** Practica ReteICA en el municipio de la operación. */
  agenteRetenedorIca: boolean
}

export interface Tarifas {
  ivaPorcentaje: number
  /** RF sobre arrendamiento de bienes inmuebles. */
  rfArrendamientoPorcentaje: number
  /** RF sobre comisiones y servicios inmobiliarios. */
  rfComisionPorcentaje: number
  /** ReteIVA: se aplica sobre el VALOR DEL IVA, no sobre la base. */
  reteIvaPorcentaje: number
  /** ReteICA: municipal. Se expresa en porcentaje (0.8 = 8 por mil). */
  reteIcaPorcentaje: number
  /** Valor de la UVT del año, para las bases mínimas. */
  uvtCop: number
  /** Base mínima en UVT para practicar RF sobre arrendamiento. */
  baseMinimaArrendamientoUvt: number
  /** Base mínima en UVT para practicar RF sobre comisiones. */
  baseMinimaComisionUvt: number
}

/**
 * Las tarifas que la inmobiliaria ya tenía configuradas, leídas de su catálogo
 * de conceptos. Se cambian por agencia: acá son un punto de partida, no una
 * afirmación sobre la ley.
 *
 * La UVT de 2026 sale de la base mínima publicada para arrendamientos
 * ($523.740 = 10 UVT).
 */
export const TARIFAS_2026: Tarifas = {
  ivaPorcentaje: 19,
  rfArrendamientoPorcentaje: 3.5,
  rfComisionPorcentaje: 11,
  reteIvaPorcentaje: 15,
  reteIcaPorcentaje: 0.8,
  uvtCop: 52_374,
  baseMinimaArrendamientoUvt: 10,
  baseMinimaComisionUvt: 4,
}

export interface Operacion {
  base: BaseTributaria
  /** Valor del concepto, antes de impuestos, en pesos. */
  baseCop: number
  uso: UsoDelInmueble
  /** Quien entrega el dinero. Es quien practica las retenciones. */
  paga: PerfilTributario
  /** Quien recibe el dinero. Es quien cobra el IVA. */
  recibe: PerfilTributario
  tarifas?: Tarifas
}

export interface Renglon {
  concepto: 'IVA' | 'RETENCION_RENTA' | 'RETE_IVA' | 'RETE_ICA'
  /** Positivo suma al pago; negativo lo descuenta. */
  valorCop: number
  porcentaje: number
  /** Sobre qué se calculó: la base del concepto, o el IVA. */
  sobreCop: number
}

export interface Liquidacion {
  baseCop: number
  renglones: Renglon[]
  /** Lo que sale de la cuenta de quien paga. */
  totalAPagarCop: number
  /** Lo que efectivamente entra a quien recibe, después de retenciones. */
  netoQueRecibeCop: number
  /**
   * Por qué cada impuesto aplicó o no. Sin esto, un número correcto es
   * indefendible: nadie puede revisarlo sin rehacer la cuenta a mano.
   */
  motivos: string[]
}

/** Redondeo al peso. La DIAN no recibe centavos. */
function alPeso(n: number): number {
  return Math.round(n)
}

/**
 * Liquida una operación: cuánto IVA, cuánta retención, cuánto entra de verdad.
 *
 * Devuelve siempre los motivos, incluso los negativos ("no hay IVA porque el
 * inmueble es de vivienda"): son la mitad del valor de esto. Un cobro sin IVA
 * y un cobro al que se le olvidó el IVA se ven exactamente igual en la factura.
 */
export function liquidar(op: Operacion): Liquidacion {
  const t = op.tarifas ?? TARIFAS_2026
  const renglones: Renglon[] = []
  const motivos: string[] = []

  // ── IVA ───────────────────────────────────────────────────────────────────
  let ivaCop = 0
  if (op.base === 'NO_GRAVADO') {
    motivos.push('Sin IVA: el concepto no genera impuesto.')
  } else if (op.base === 'ARRENDAMIENTO' && op.uso === 'VIVIENDA') {
    // Art. 476 num. 5 ET. Es la regla que más plata mueve y la que más se
    // olvida, porque el mismo canon sí lleva IVA cuando el local es comercial.
    motivos.push(
      'Sin IVA: el arrendamiento de vivienda está excluido (art. 476 num. 5 ET).',
    )
  } else if (!op.recibe.responsableIva) {
    motivos.push('Sin IVA: quien cobra no es responsable de IVA.')
  } else {
    ivaCop = alPeso((op.baseCop * t.ivaPorcentaje) / 100)
    renglones.push({
      concepto: 'IVA',
      valorCop: ivaCop,
      porcentaje: t.ivaPorcentaje,
      sobreCop: op.baseCop,
    })
    motivos.push(
      op.base === 'ARRENDAMIENTO'
        ? `IVA ${t.ivaPorcentaje}%: el arrendamiento comercial está gravado.`
        : `IVA ${t.ivaPorcentaje}%: el servicio está gravado y quien cobra es responsable.`,
    )
  }

  // ── Retención en la fuente ────────────────────────────────────────────────
  // La practica el PAGADOR. Entre dos personas naturales que no son agentes
  // retenedores no hay retención — la regla que contó Juan.
  let rfCop = 0
  const tarifaRf =
    op.base === 'ARRENDAMIENTO'
      ? t.rfArrendamientoPorcentaje
      : op.base === 'COMISION'
        ? t.rfComisionPorcentaje
        : 0
  const minimoUvt =
    op.base === 'ARRENDAMIENTO' ? t.baseMinimaArrendamientoUvt : t.baseMinimaComisionUvt
  const baseMinimaCop = minimoUvt * t.uvtCop

  if (tarifaRf === 0) {
    motivos.push('Sin retención en la fuente: el concepto no tiene tarifa propia.')
  } else if (!op.paga.agenteRetenedorRenta) {
    motivos.push(
      `Sin retención en la fuente: quien paga ${
        op.paga.tipoPersona === 'NATURAL' ? '(persona natural) ' : ''
      }no es agente retenedor.`,
    )
  } else if (op.baseCop < baseMinimaCop) {
    motivos.push(
      `Sin retención en la fuente: la base ($${op.baseCop.toLocaleString('es-CO')}) ` +
        `no llega al mínimo de ${minimoUvt} UVT ($${baseMinimaCop.toLocaleString('es-CO')}).`,
    )
  } else {
    rfCop = alPeso((op.baseCop * tarifaRf) / 100)
    renglones.push({
      concepto: 'RETENCION_RENTA',
      valorCop: -rfCop,
      porcentaje: tarifaRf,
      sobreCop: op.baseCop,
    })
    motivos.push(`Retención en la fuente ${tarifaRf}%: quien paga es agente retenedor.`)
  }

  // ── ReteIVA ───────────────────────────────────────────────────────────────
  // Sólo puede existir si hay IVA, y se calcula SOBRE EL IVA.
  let reteIvaCop = 0
  if (ivaCop === 0) {
    if (op.paga.agenteRetenedorIva) motivos.push('Sin ReteIVA: no hay IVA que retener.')
  } else if (!op.paga.agenteRetenedorIva) {
    motivos.push('Sin ReteIVA: quien paga no es agente de retención de IVA.')
  } else {
    reteIvaCop = alPeso((ivaCop * t.reteIvaPorcentaje) / 100)
    renglones.push({
      concepto: 'RETE_IVA',
      valorCop: -reteIvaCop,
      porcentaje: t.reteIvaPorcentaje,
      sobreCop: ivaCop,
    })
    motivos.push(`ReteIVA ${t.reteIvaPorcentaje}% sobre el IVA, no sobre la base.`)
  }

  // ── ReteICA ───────────────────────────────────────────────────────────────
  let reteIcaCop = 0
  if (op.base === 'NO_GRAVADO') {
    // ya se dijo arriba que el concepto no genera impuesto
  } else if (!op.paga.agenteRetenedorIca) {
    motivos.push('Sin ReteICA: quien paga no es agente retenedor de ICA en el municipio.')
  } else {
    reteIcaCop = alPeso((op.baseCop * t.reteIcaPorcentaje) / 100)
    renglones.push({
      concepto: 'RETE_ICA',
      valorCop: -reteIcaCop,
      porcentaje: t.reteIcaPorcentaje,
      sobreCop: op.baseCop,
    })
    motivos.push(
      `ReteICA ${t.reteIcaPorcentaje}%: la tarifa depende del municipio y la actividad.`,
    )
  }

  return {
    baseCop: op.baseCop,
    renglones,
    // Quien paga entrega base + IVA: las retenciones no las paga, las descuenta
    // y las consigna a la DIAN por cuenta de quien recibe.
    totalAPagarCop: op.baseCop + ivaCop,
    netoQueRecibeCop: op.baseCop + ivaCop - rfCop - reteIvaCop - reteIcaCop,
    motivos,
  }
}

/**
 * Perfiles de arranque, para no obligar a llenar cinco casillas cuando la
 * respuesta se deduce del tipo de persona.
 *
 * Una persona natural NO es agente retenedor por defecto: sólo lo es si supera
 * los topes de patrimonio o ingresos del año anterior. Darlo por sentado al
 * revés —asumir que sí— generaría retenciones que no existen, que es el error
 * caro: se le descuenta plata a alguien sin poder consignarla.
 */
export function perfilPorDefecto(tipoPersona: TipoPersona): PerfilTributario {
  return tipoPersona === 'JURIDICA'
    ? {
        tipoPersona,
        responsableIva: true,
        agenteRetenedorRenta: true,
        agenteRetenedorIva: false,
        agenteRetenedorIca: false,
      }
    : {
        tipoPersona,
        responsableIva: false,
        agenteRetenedorRenta: false,
        agenteRetenedorIva: false,
        agenteRetenedorIca: false,
      }
}
