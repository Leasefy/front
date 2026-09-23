/**
 * Lotes de pagos a propietarios — lo que devuelve
 * `/inmobiliaria/lotes-de-dispersion`.
 *
 * Calcado del back (`dispersiones/lotes/lotes.service.ts`). Un lote es la
 * versión con controles de «exportar a Excel, pasar por el conversor del
 * banco y subir el plano»: se arma, lo aprueba OTRA persona (con código si el
 * monto lo exige), se genera el archivo y alguien confirma que el banco pagó.
 */

/** En qué punto está el lote. Es el enum `EstadoDelLote` del back. */
export type EstadoDelLote =
  | 'BORRADOR'
  | 'ESPERANDO_APROBACION'
  | 'APROBADO'
  | 'ARCHIVO_GENERADO'
  | 'PAGADO'
  | 'ANULADO';

/**
 * Formatos de archivo plano: el enum `FormatoArchivoDePagos` del back. Tienen
 * generador `BANCOLOMBIA_PAB` y `BANCO_DE_BOGOTA` (cada uno sacado del
 * instructivo oficial de su banco); los otros dos existen en el enum y no se
 * generan. El formato NO se elige al final: es el del banco elegido al armar.
 */
export type FormatoArchivoDePagos =
  | 'BANCOLOMBIA_PAB'
  | 'BANCOLOMBIA_SAP'
  | 'ONEPAY'
  | 'BANCO_DE_BOGOTA'
  | 'BANCO_AGRARIO'
  | 'BANCO_AV_VILLAS'
  | 'BANCO_CAJA_SOCIAL'
  /** No es un archivo del banco: la planilla para cargar a mano. */
  | 'PLANILLA_MANUAL';

/**
 * Qué recibe la inmobiliaria para un banco (Nico, 22-09: «el archivo plano
 * para TODOS los bancos de Colombia»):
 *   · `ARCHIVO_OFICIAL`: el archivo del portal, armado con un documento que
 *     publicó el mismo banco.
 *   · `ARCHIVO_DE_TERCERO`: el archivo del portal, con la estructura de un
 *     tercero (software contable, código abierto). Sin verificar.
 *   · `PLANILLA`: no hay estructura publicada; una planilla con los datos de
 *     cada pago para cargarlos a mano. NO se sube al banco.
 */
export type EntregaDelFormato = 'ARCHIVO_OFICIAL' | 'ARCHIVO_DE_TERCERO' | 'PLANILLA';

/** Ahorros o corriente: la cuenta de la inmobiliaria desde la que se gira. */
export type TipoDeCuentaDeOrigen = 'AHORROS' | 'CORRIENTE';

/** El instructivo del banco del que sale cada posición del archivo. */
export interface FuenteDelFormato {
  url: string;
  documento: string;
  version: string;
  consultado: string;
}

/**
 * Desde qué banco y cuenta sale la plata de un lote (`origenes_de_lote`), como
 * la muestra la pantalla: la cuenta llega tapada (`•••• 8901`).
 */
export interface OrigenDelLote {
  /** Id del banco (`BANCOLOMBIA`, `BANCO_BOGOTA`…). */
  banco: string;
  nombreDelBanco: string;
  formato: FormatoArchivoDePagos;
  tipoDeCuenta: TipoDeCuentaDeOrigen;
  cuenta: string;
}

/** Un banco de la pregunta «¿desde qué banco vas a dispersar?». */
export interface BancoDeOrigen {
  id: string;
  nombre: string;
  /** `null` = no se puede elegir todavía (falta una migración); `porQueNo` lo dice. */
  formato: FormatoArchivoDePagos | null;
  nombreDelFormato: string | null;
  /** Qué se le entrega a la inmobiliaria para ESTE banco. Opcional: back anterior al 22-09 noche. */
  entrega?: EntregaDelFormato;
  extension?: string;
  /** El documento del banco (o del tercero) del que sale el archivo. `null` en la planilla. */
  fuente: FuenteDelFormato | null;
  otrasFuentes?: FuenteDelFormato[];
  /** Qué hay que revisar antes de subirlo (o, en la planilla, qué es). */
  pendienteDeConfirmar?: string[];
  /** Por qué no hay archivo propio (planilla) o qué migración falta. */
  porQueNo: string | null;
}

/** Una cuenta que la inmobiliaria ya registró en Medios de pago. */
export interface CuentaRegistrada {
  medioDePagoId: string;
  nombre: string;
  /** El banco reconocido, o `null` si no es ninguno de la lista. */
  banco: string | null;
  bancoEscrito: string | null;
  tipoDeCuenta: TipoDeCuentaDeOrigen | null;
  /** Sólo dígitos. */
  numeroDeCuenta: string;
}

/** `GET /inmobiliaria/lotes-de-dispersion/bancos`. */
export interface BancosParaGirar {
  /** `false` = falta la migración: el lote se arma sin preguntar el banco. */
  disponible: boolean;
  motivo: string | null;
  bancos: BancoDeOrigen[];
  cuentas: CuentaRegistrada[];
  /** Lo que eligió la agencia la última vez. */
  ultima: { banco: string; tipoDeCuenta: TipoDeCuentaDeOrigen; numeroDeCuenta: string } | null;
}

/** Lo que se manda al armar: el banco, el tipo y el número de la cuenta. */
export interface OrigenPedido {
  banco: string;
  tipoDeCuenta: TipoDeCuentaDeOrigen;
  numeroDeCuenta: string;
}

/** Una fila de la lista. Sin ítems: son ~300 por lote. */
export interface LoteResumen {
  id: string;
  /** `YYYY-MM`. */
  month: string;
  estado: EstadoDelLote;
  /** Sólo lo que sí se puede girar. */
  totalCop: number;
  /** Cuántos pagos entran en el archivo. */
  cantidad: number;
  creadoPorUserId: string;
  aprobadoPorUserId: string | null;
  aprobadoAt: string | null;
  formatoArchivo: FormatoArchivoDePagos | null;
  archivoGeneradoAt: string | null;
  archivoHash: string | null;
  pagadoAt: string | null;
  referenciaBanco: string | null;
  anuladoAt: string | null;
  motivoDeLaAnulacion: string | null;
  createdAt: string;
  _count?: { items: number };
  /** El cupo del día en que se armó. `null` mientras la migración no esté aplicada. */
  disponibleAlArmarCop?: number | null;
  /** Cuánto se giró por encima del cupo. `0` = alcanzaba. */
  descubiertoCop?: number | null;
  /** Qué se decidió sobre la factura al marcar pagado. */
  facturarAhora?: boolean | null;
}

/** Una dispersión dentro del lote, con los datos bancarios congelados. */
export interface ItemDelLote {
  id: string;
  loteId: string;
  dispersionId: string;
  propietarioId: string;
  nombreTitular: string;
  documento: string;
  tipoDocumento: string;
  banco: string;
  tipoDeCuenta: string;
  numeroDeCuenta: string;
  valorCop: number;
  /** Por qué NO va en el archivo. `null` = entra. */
  motivoDeExclusion: string | null;
}

/**
 * Qué pasó con la factura al propietario al marcar el lote pagado.
 *
 * El CEO (2026-09-15), describiendo el giro entero: «archivo plano por banco,
 * egreso, **factura ahora o después**, correo al propietario». Esto es el
 * resultado de esa casilla, con número.
 *
 * 🔴 Que `fallas` tenga filas NO deshace el pago: la plata ya salió del banco y
 * el lote quedó PAGADO. Facturar es un paso posterior que se reintenta desde
 * Facturación.
 */
export interface FacturacionDelLote {
  /** `true` si se pidió facturar ahora. `false` = queda para después. */
  pedida: boolean;
  /** Cuántas prefacturas del lado propietario dejó este lote (contrato × mes). */
  candidatas: number;
  emitidas: number;
  /** Ya estaban emitidas. NO es un error: es la llave única haciendo su trabajo. */
  yaEstaban: number;
  /** Las que no se numeraron porque el rango de la resolución no alcanzó. */
  sinNumero: number;
  totalCop: number;
  /** Los números DIAN emitidos, para cruzarlos con el egreso. */
  numeros: string[];
  /** Lo que no se pudo facturar, por mes y con el motivo en palabras. */
  fallas: { mes: string; motivo: string }[];
}

/**
 * El extracto a cada propietario que el lote cerró en $0.
 *
 * Nico y Juan Camilo (2026-09-16): en el mes en que se gira $0 se factura la
 * administración y se le manda su extracto con las deducciones que explican
 * por qué no hubo giro. 🔴 Una falla NO deshace el pago: el extracto se
 * reenvía desde la ficha del propietario.
 */
export interface ExtractosDeLosCompensados {
  /** Cuántos propietarios se cerraron en $0 con este lote. */
  compensados: number;
  enviados: number;
  fallas: { propietarioId: string; nombre: string; motivo: string }[];
}

/** El lote entero, como lo devuelven `ver`, `aprobar`, `pagado` y `anular`. */
export interface LoteDeDispersion extends LoteResumen {
  /**
   * El HASH del código, nunca el código. Sirve para una sola cosa acá: saber
   * si este lote exige código (`!== null`) y pedirlo en el formulario.
   */
  codigoHash?: string | null;
  codigoExpiraAt: string | null;
  codigoIntentos: number;
  items: ItemDelLote[];
  /**
   * Sólo lo devuelve `POST /:id/pagado`. Ausente en `ver`, `aprobar` y
   * `anular`, y con un back anterior a la segunda vuelta de facturación.
   */
  facturacion?: FacturacionDelLote;
  /** Sólo en `POST /:id/pagado`, con un back del 2026-09-16 en adelante. */
  extractosDeCompensados?: ExtractosDeLosCompensados;
}

/**
 * Una liquidación que se cierra con el lote SIN girar nada: sus deducciones
 * cubren el neto del mes. No va en el archivo del banco; al marcar el lote
 * pagado quedan aplicadas y lo que falte pasa a su siguiente liquidación.
 */
export interface FilaCompensada {
  propietarioId: string;
  nombre: string;
  dispersionId: string;
  /** El neto guardado: cero o en contra. */
  netoCop: number;
  /** Lo que pasa a su siguiente liquidación. */
  saldoEnContraCop: number;
}

/** A quién le falta un dato, con nombre y motivo. */
export interface FilaExcluida {
  propietarioId: string;
  nombre: string;
  valorCop: number;
  motivo: string;
}

export interface VistaDelLote {
  lote: LoteDeDispersion;
  /**
   * Desde qué banco se gira y, por lo tanto, en qué formato sale el archivo.
   * `null` = el lote se armó sin preguntarlo (su archivo no sale).
   * Opcional: back anterior al 2026-09-22.
   */
  origen?: OrigenDelLote | null;
  excluidos: FilaExcluida[];
  /** Las que se cierran en $0 por deducciones. Opcional: back anterior al 2026-09-16. */
  compensados?: FilaCompensada[];
  /** Intentos de código que quedan antes de que el lote se bloquee. */
  intentosRestantes: number;
  bloqueado: boolean;
}

export interface LoteArmado {
  lote: LoteDeDispersion;
  excluidos: FilaExcluida[];
  compensados?: FilaCompensada[];
  /** Lo que había en la cuenta cuando se armó. */
  plata: PlataDisponible;
  /**
   * Cuánto de este lote sale de plata de la inmobiliaria porque no alcanzaba.
   * `0` = alcanzaba. Se puede girar de más (decisión de Nico, 2026-09-15); lo
   * que no se puede es que el número no se vea antes de mandarlo a aprobación.
   */
  descubiertoCop: number;
  /** El banco elegido. `null` sin la migración. */
  origen?: OrigenDelLote | null;
}

/**
 * Cuánta plata hay HOY para girar.
 *
 * El CEO (2026-09-15): «la plata que yo tengo en mi cuenta hoy es la que
 * debería mostrarse para poder dispersar. No necesito que me hayan cobrado ni
 * que me hayan pagado». Es `entradas del extracto − lo ya comprometido`.
 */
export interface PlataDisponible {
  /** Hasta qué día se contó, `YYYY-MM-DD`. */
  corte: string;
  entradasCop: number;
  comprometidoCop: number;
  /** Puede ser NEGATIVO: ya se adelantó plata propia. */
  disponibleCop: number;
  /**
   * 🔴 `false` = la inmobiliaria nunca cargó un extracto. Entonces el cupo no
   * es «no hay plata», es «no sabemos», y la pantalla lo tiene que decir así.
   */
  hayExtracto: boolean;
  ultimoMovimiento: string | null;
}

/** Cómo se ordena «a quién le pago». */
export type OrdenDeCandidatos = 'MENOR_A_MAYOR' | 'MAYOR_A_MENOR' | 'NOMBRE';

/** Un propietario al que se le puede pagar, con el acumulado hasta él. */
export interface CandidatoDeDispersion {
  dispersionId: string;
  propietarioId: string;
  propietarioName: string;
  month: string;
  netoCop: number;
  /** La suma de esta fila y las anteriores, en este orden. */
  acumuladoCop: number;
  /** El acumulado todavía cabe en el disponible. NO es un bloqueo. */
  entraEnElCupo: boolean;
  /** Por qué no podría ir al banco. `null` = puede. */
  motivoDeExclusion: string | null;
  /**
   * Sus deducciones cubren el neto del mes: se gira $0, pero entra al lote
   * para cerrarse y pasar el saldo en contra a la siguiente liquidación.
   */
  seCompensa?: boolean;
  /** Lo que pasa a su siguiente liquidación si se cierra en $0. */
  saldoEnContraCop?: number;
}

export interface CandidatosDeDispersion {
  orden: OrdenDeCandidatos;
  plata: PlataDisponible;
  candidatos: CandidatoDeDispersion[];
  /** Los que caben en el tope pedido, para tildarlos de una. */
  sugeridos: string[];
  totalCop: number;
  cantidad: number;
}

/** Con qué se arma el lote: a quiénes, en qué orden y hasta qué monto. */
export interface QueMeterEnElLote {
  month: string;
  /** Sin la lista, todas las pendientes del mes. */
  dispersionIds?: string[];
  orden?: OrdenDeCandidatos;
  topeCop?: number;
  /** Desde qué banco y cuenta se gira. Sin la migración no se manda. */
  origen?: OrigenPedido;
}

/**
 * Lo que devuelve pedir la aprobación.
 *
 * 🔴 El código NO viene acá: sale por correo a quienes pueden aprobar. Lo que
 * vuelve son los correos tapados y hasta cuándo vale.
 */
export interface SolicitudDeAprobacion {
  lote: LoteDeDispersion;
  exigeCodigo: boolean;
  motivoDelCodigo: string | null;
  expiraAt: string | null;
  /** `con***@portofino.co`. */
  enviadoA: string[];
}

/**
 * El archivo generado. Es JSON y no el archivo crudo a propósito: junto al
 * contenido vienen los excluidos, las advertencias y si el layout está
 * verificado — eso se tiene que ver ANTES de guardar el archivo.
 */
export interface ArchivoGenerado {
  nombreArchivo: string;
  contenido: string;
  hash: string;
  formato: FormatoArchivoDePagos;
  cantidad: number;
  totalCop: number;
  excluidos: FilaExcluida[];
  advertencias: string[];
  /** Qué se descargó: el archivo del banco o la planilla para cargar a mano. */
  entrega?: EntregaDelFormato;
  /** 🔴 `false` hasta que alguien coteje el layout contra un archivo real. */
  layoutVerificado: boolean;
  /** Qué del layout falta confirmar contra el banco. */
  pendienteDeConfirmar: string[];
  /** El instructivo del banco. `null` en la planilla; ausente en un back anterior al 2026-09-22. */
  fuente?: FuenteDelFormato | null;
  origen?: OrigenDelLote;
  /** `true` cuando el lote ya estaba en ARCHIVO_GENERADO y se volvió a entregar el mismo. */
  reenvio: boolean;
  /**
   * Su fila en el centro de procesos (22-09): el archivo queda guardado ahí y
   * se baja desde el centro. `null`/ausente = back sin la migración del centro.
   */
  procesoId?: string | null;
}

export interface FiltrosDeLotes {
  month?: string;
  estado?: EstadoDelLote;
}
