/**
 * Estado de cuenta — lo que devuelve `/inmobiliaria/estado-de-cuenta/*`.
 *
 * ── Qué es (palabras del CEO, Juan Camilo López, 2026-09-13) ────────────────
 * «El estado de cuenta es una deuda que se genera una vez se contrae el
 * contrato. Contrato del 1 de enero de 2026, canon de 1 millón, un año: mi
 * estado de cuenta como inquilino es de 12 millones. […] El software lo
 * DIFIERE por mes.» «Funciona como una tabla de amortización.» «El estado de
 * cuenta se le genera al CLIENTE, pero basado en el contrato: un propietario
 * con 15 contratos tiene UN estado de cuenta; un inquilino con varios locales
 * de distintos propietarios, uno solo, pero bien especificado de qué
 * corresponde cada valor.»
 *
 * Espejo de `back-erp/src/inmobiliaria/estado-de-cuenta/`. Cada número tiene su
 * definición allá, al lado de la consulta que lo produce: acá sólo se describe
 * la forma. Si el back renombra algo, manda el back.
 */

/**
 * Los CUATRO estados que imprime una fila (`EstadoDeLaFila` en el back).
 *
 * 🔴 No hay `PARCIAL`: un abono parcial PARTE la cuota en dos filas —una
 * `CANCELADA` por lo abonado, con su documento, y una `PENDIENTE` con
 * `parcial: true` por el resto—, exactamente como Nui. Un estado «parcial»
 * sobre una sola fila obligaría a explicar en cada renglón cuánto de ese
 * número ya entró.
 *
 * 🔴 `ANTERIOR` no es un estado de pago: es «esta cuota es de antes de la fecha
 * de corte de la agencia, la gestionó el sistema viejo y su saldo no está en
 * nuestra cartera». Se muestra en gris y NO suma a ningún total. Sin esa marca,
 * un período migrado sin recaudo se lee como deuda viva.
 *
 * `CANCELADA` se lee «Cancelada» del lado del inquilino y «Pagada» del lado del
 * propietario: la palabra la pone el front, el estado es el mismo.
 */
export type EstadoDeFila = 'CANCELADA' | 'PENDIENTE' | 'ANULADA' | 'ANTERIOR';

/** El lado del contrato que mira este estado de cuenta. */
export type RolEnElContrato = 'INQUILINO' | 'PROPIETARIO';

/** El comprobante con el que se pagó la fila. `null` = «Sin pago». */
export interface DocumentoDePago {
  numero: string;
  /** «INGRESO» para el inquilino, «EGRESO» para el propietario. */
  tipo: string;
  descripcion: string;
  /**
   * 🔴 D11 (17-09-2026): quién pagó, cuando NO fue el cliente. Ausente = pagó
   * el cliente. Hoy sólo una aseguradora que pagó un siniestro.
   */
  pagador?: {
    tipo: 'ASEGURADORA';
    nombre: string;
    nit: string;
    siniestroReferencia: string | null;
  };
}

/**
 * 🔴 D11: la deuda SUBROGADA a una aseguradora. Las cuotas que ella pagó
 * quedan canceladas para la inmobiliaria y el propietario, pero el inquilino le
 * debe ese valor a ella (C.Co. art. 1096): va aparte, nunca sumado a lo
 * pendiente con la inmobiliaria.
 */
export interface Subrogacion {
  aseguradoras: {
    nombre: string;
    nit: string;
    valorCop: number;
    siniestros: string[];
  }[];
  totalCop: number;
}

/**
 * Un renglón del estado de cuenta: una cuota, o el saldo que quedó de una.
 *
 * Un abono parcial PARTE la fila, como en Nui: queda la parte abonada
 * (`CANCELADA`, con su documento) y una fila nueva «Saldo pendiente por …» con
 * el resto y `parcial: true`. Es la única forma de que la suma de la columna
 * cuadre con lo que efectivamente entró.
 */
export interface FilaDelEstadoDeCuenta {
  concepto: string;
  estado: EstadoDeFila;
  /** `YYYY-MM-DD`. `null` cuando todavía no se pagó. */
  fechaDePago: string | null;
  valorBruto: number;
  iva: number;
  retencion: number;
  reteIva: number;
  reteIca: number;
  /** Sólo del lado PROPIETARIO: lo que la inmobiliaria le cobró por administrar. */
  comision?: number;
  ivaComision?: number;
  /** Lo que el PROPIETARIO le retiene a la inmobiliaria: vuelve a su favor. */
  retencionComision?: number;
  reteIvaComision?: number;
  reteIcaComision?: number;
  /** Lo que efectivamente se paga o se gira por esta fila. */
  valorNeto: number;
  /** 🔴 D11: la pagó una aseguradora; el inquilino se la debe a ella. */
  subrogadaA?: { nombre: string; nit: string };
  /** `YYYY-MM-DD`. Es la fecha por la que se filtra y se ordena. */
  fechaVencimiento: string;
  documentoDePago: DocumentoDePago | null;
  /** `true` si esta fila es el resto de una cuota abonada a medias. */
  parcial: boolean;
  /** La cuota de `contrato_cuotas` de la que salió, para pedir su detalle. */
  cuotaId?: string;
  /**
   * El período que cubre la cuota. Opcionales porque el concepto de Nui ya lo
   * trae adentro («De 22-May-2024 hasta 21-Jun-2024»); cuando el back los
   * manda sueltos, la pantalla los pinta aparte y el concepto queda limpio.
   */
  periodoDesde?: string | null;
  periodoHasta?: string | null;
  /**
   * 🔴 Dónde está la fila HOY, con la regla única del back (`cuotaEsCartera`:
   * vencimiento MÁS los días de plazo del contrato). `VENCIDA_EN_PLAZO` se lee
   * «Vencido, en plazo» y NO es mora; `CARTERA` sí. Es lo que la ficha y la
   * cartera dicen de la misma cuota: el front no vuelve a contar días.
   *
   * Opcional sólo porque un back anterior no lo manda.
   */
  cajon?: 'POR_VENCER' | 'VENCIDA_EN_PLAZO' | 'CARTERA' | 'SIN_DEUDA';
  /** Días de mora DESPUÉS del plazo. `0` mientras el plazo corre. */
  diasDeMora?: number;
}

/**
 * Un punto de quiebre: el día que cambió el inquilino o el propietario del
 * contrato sin que el historial se toque.
 *
 * CEO: «El contrato debe permitir cambio de inquilino o propietario (venden el
 * inmueble) sin modificar el historial: un PUNTO DE QUIEBRE. Con eso le digo a
 * la DIAN (exógena) cuánto le he pagado a cada propietario desde 2022.»
 */
export interface PuntoDeQuiebre {
  /** `YYYY-MM-DD`: desde ese día las cuotas son de la parte nueva. */
  fecha: string;
  /** Qué lado cambió. */
  rol: RolEnElContrato;
  /** «Venta del inmueble», «Cesión del contrato», … */
  motivo: string;
  parteAnterior: string;
  parteNueva: string;
}

export interface TotalesDelEstadoDeCuenta {
  /** Lo que ya se pagó (o se giró). */
  cancelado: number;
  /** 🔴 Lo VENCIDO y no pagado. No es lo mismo que `restaPorPagar`. */
  pendiente: number;
  /**
   * Todo lo que falta hasta el fin del contrato, vencido o no. Es el número del
   * CEO: «66.500.940 es lo que resta por pagar JYC en todos sus contratos».
   */
  restaPorPagar: number;
}

export interface ContratoDelEstadoDeCuenta {
  /** El `Contract.id`, para enlazar a la ficha del contrato. */
  id: string;
  /**
   * El número que la inmobiliaria conoce. En un contrato migrado es el de Nui
   * (`externalId`), no nuestro consecutivo: el documento se lo entrega a un
   * cliente que sólo conoce el número viejo.
   */
  numero: string;
  /**
   * Nuestro consecutivo (`Contract.code`), para decir de quién es cada número:
   * «Contrato 1686 · Leasefy #1839» en un migrado, «Contrato #14» en uno
   * nativo (`numero.ts`). Ausente si el back es anterior: se muestra `numero`
   * tal cual.
   */
  numeroDeLeasefy?: number | null;
  rol: RolEnElContrato;
  inmueble: { direccion: string };
  vigente: boolean;
  secciones: {
    arriendos: FilaDelEstadoDeCuenta[];
    otrosConceptos: FilaDelEstadoDeCuenta[];
  };
  totales: TotalesDelEstadoDeCuenta;
  /** 🔴 D11: lo que el inquilino le debe a una aseguradora. Ausente si no hay. */
  subrogacion?: Subrogacion | null;
  /**
   * El interés de mora del contrato, APARTE del capital. Sólo del lado
   * INQUILINO; ausente o `null` en el del propietario y con un back anterior.
   */
  intereses?: InteresesDelContrato | null;
  cortes: PuntoDeQuiebre[];
}

// ══ Intereses de mora ═══════════════════════════════════════════════════════
//
// La prefactura le cobraba al inquilino un interés que ni la cartera ni el
// estado de cuenta mostraban. El back manda, por contrato, un bloque
// `intereses` liquidado con la MISMA regla que la prefactura y la cartera.
// Arriendos y Otros conceptos no cambian: siguen siendo lo pactado. Ausente no
// es «cero intereses»: es «no hay nada que decir de mora».

/** Un renglón de interés: el de UNA cuota. */
export interface FilaDeInteres {
  cuotaId: string;
  /** `YYYY-MM`. */
  mes: string;
  /** «Intereses de mora sobre Canon de arrendamiento. De … hasta …». */
  concepto: string;
  /** `YYYY-MM-DD`: el vencimiento de la cuota. */
  fechaVencimiento: string;
  /** Hasta hoy, o hasta el último abono si la cuota ya se pagó. */
  diasDeMora: number;
  liquidado: number;
  /** Lo ya abonado a intereses (la ley los pone antes que el capital). */
  abonado: number;
  /** 🔴 Lo que falta. */
  pendiente: number;
  /** `COBRO` = ya liquidado y escrito; `CUOTA` = calculado hoy, crece mañana. */
  origen: 'COBRO' | 'CUOTA' | null;
  /** La cuota ya se pagó, pero se pagó cuando ya estaba en mora. */
  pagadaEnMora: boolean;
}

export interface InteresesDelContrato {
  filas: FilaDeInteres[];
  liquidado: number;
  abonado: number;
  /** 🔴 El interés que falta hoy. */
  pendiente: number;
  /** Lo vencido del contrato, con su mora. */
  pendienteConIntereses: number;
  /** Todo lo que falta del contrato, con la mora. */
  restaPorPagarConIntereses: number;
  /**
   * Cuotas en mora que NO llevan interés, y por qué. `null` cuando no hay
   * ninguna. Un cero sin esto se leería «no hay mora».
   */
  sinInteres: { cuotas: number; motivo: string; sinReglas: boolean } | null;
}

export interface TotalesDeInteres {
  liquidado: number;
  abonado: number;
  pendiente: number;
  pendienteConIntereses: number;
  restaPorPagarConIntereses: number;
  /** Algún contrato tiene mora sin interés porque la agencia no tiene reglas. */
  sinReglas: boolean;
}

export interface ClienteDelEstadoDeCuenta {
  nombre: string;
  documento: string | null;
  /** Con qué sombrero entra a este documento. La palabra la pone el front. */
  tipo: RolEnElContrato;
}

export interface InmobiliariaDelEstadoDeCuenta {
  razonSocial: string;
  nit: string | null;
  matricula: string | null;
  telefono: string | null;
  ciudad: string | null;
  logoUrl: string | null;
}

export interface EstadoDeCuenta {
  cliente: ClienteDelEstadoDeCuenta;
  inmobiliaria: InmobiliariaDelEstadoDeCuenta;
  /** `YYYY-MM-DD`: el día en que el back armó el documento. */
  fecha: string;
  contratos: ContratoDelEstadoDeCuenta[];
  totales: TotalesDelEstadoDeCuenta;
  /**
   * Con qué recorte lo armó el back, cuando lo armó con uno. Ausente o `null`
   * es el documento entero.
   *
   * 🔴 Lo DICE el back porque es el back quien recorta (auditoría 13-09, E4):
   * ni la pantalla ni el PDF tienen que adivinarlo, y en el enlace público es
   * la única forma de que quien lo abre sepa que está viendo una vista parcial
   * y no su cuenta entera.
   */
  filtro?: FiltrosDelEstadoDeCuenta | null;
  /** Los intereses de todo el documento. `null`/ausente si no hay nada de mora. */
  intereses?: TotalesDeInteres | null;
  /** 🔴 D11: la deuda subrogada de todos los contratos. Ausente si no hay. */
  subrogacion?: Subrogacion | null;
}

/**
 * EL FILTRO del estado de cuenta, y es parte del CONTRATO con el back: viaja
 * por query en las lecturas del panel y en el cuerpo al compartir, y queda
 * guardado con el enlace.
 *
 * 🔴 Vive acá y no en `filas.ts` porque la REGLA —qué fila pasa, qué contrato
 * desaparece, cómo se recalculan los totales— ya no vive en el front: la aplica
 * el back (`filtrar-el-estado-de-cuenta.ts`), que es el único lugar donde puede
 * ser una garantía para quien abre un enlace y no un recorte de píxeles. Acá
 * queda sólo la FORMA.
 */
export interface FiltrosDelEstadoDeCuenta {
  /** Deja sólo lo que todavía se debe (`PENDIENTE`). */
  soloPendientes: boolean;
  /** `YYYY-MM-DD` o cadena vacía. Se compara contra `fechaVencimiento`. */
  desde: string;
  hasta: string;
  /** El número del contrato, o `''` para todos. */
  contrato: string;
}

// ══ Compartir ═══════════════════════════════════════════════════════════════

/**
 * El enlace público y firmado del estado de cuenta.
 *
 * CEO (vía Nico, 2026-09-13): «qué tan FÁCIL DE DISTRIBUIR sea dentro del
 * software». Se comparte un ENLACE, no un adjunto: un PDF por correo queda
 * viejo el día que entra un abono, y un enlace muestra siempre lo de hoy. Por
 * eso vence: un estado de cuenta con datos de un cliente no puede quedar
 * abierto en internet para siempre.
 */
export interface EnlaceCompartido {
  /** La URL pública, ya armada. */
  url: string;
  /** El token suelto, por si hay que armar la URL de otra forma. */
  token?: string;
  /** ISO-8601. 30 días desde que se generó. */
  venceEl: string;
  /** Para poder revocarlo después. */
  id?: string;
  /**
   * El recorte que quedó GUARDADO con el enlace y que ve quien lo abra. `null`
   * es el documento entero.
   *
   * 🔴 Se lee de acá y no se asume: puede NO haberse guardado (la migración
   * del back todavía sin aplicar), y entonces el enlace sale entero. Prometer
   * en pantalla un filtro que no viajó es justo el defecto E4 al revés.
   */
  filtro?: FiltrosDelEstadoDeCuenta | null;
}

/** Lo que devuelve un envío por correo o por WhatsApp. */
export interface EnvioDelEnlace {
  enviado: boolean;
  /** A dónde se mandó, para que la pantalla lo confirme. */
  destino: string;
  canal: 'CORREO' | 'WHATSAPP';
  enlace: EnlaceCompartido;
  /** Por qué no se mandó, cuando `enviado` es `false`. */
  motivo?: string;
}

/**
 * El resumen barato para las fichas: no arma filas, sólo suma cuotas. Es lo
 * que se puede pedir desde una ficha sin hacerla lenta.
 */
export interface ResumenDelEstadoDeCuenta {
  /** Todo lo que falta hasta el fin de los contratos. */
  restaPorPagar: number;
  /** Lo vencido y no pagado. */
  pendiente: number;
  proximaCuota: { fecha: string; monto: number } | null;
  /** Días de mora de la cuota vencida más vieja y cuánto suma lo vencido. */
  enMora: { dias: number; monto: number } | null;
  contratos: number;
}

/*
 * Las prefacturas vivían acá, espejando `GET /estado-de-cuenta/prefacturas`.
 * Esa ruta se borró el 16-09: era una SEGUNDA regla para la misma plata —no
 * cuadraba contra el neto de la cuota, dejaba fuera las cuotas ya pagadas (que
 * también se facturan), no sabía de la resolución de la DIAN, no distinguía
 * mostrar de emitir y no llevaba intereses—. La única prefactura es la de
 * `GET /inmobiliaria/facturacion/por-generar`, en `facturacion-por-mes.service`.
 */
