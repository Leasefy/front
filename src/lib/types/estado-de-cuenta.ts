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
  rol: RolEnElContrato;
  inmueble: { direccion: string };
  vigente: boolean;
  secciones: {
    arriendos: FilaDelEstadoDeCuenta[];
    otrosConceptos: FilaDelEstadoDeCuenta[];
  };
  totales: TotalesDelEstadoDeCuenta;
  cortes: PuntoDeQuiebre[];
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

// ══ Prefacturas ═════════════════════════════════════════════════════════════

/**
 * Una cuota por facturar (`PrefacturaDto` en el back).
 *
 * «Si quiero mirar qué facturas tengo por generar hasta el 31 de diciembre,
 * revisa los estados de cuenta de los contratos y muestra todas las posibles
 * facturas hasta esa fecha; los contratos que finalicen antes se van eliminando
 * de la prefactura. Lo que NO se puede es enviarlas todas en un solo mes.»
 * (CEO, 2026-09-13)
 *
 * Por eso esto LISTA y no emite: emitir sigue siendo por mes, en
 * `POST /inmobiliaria/facturacion/generar`.
 */
export interface PrefacturaDelMes {
  cuotaId: string;
  contratoId: string;
  /** El número que la inmobiliaria reconoce (`externalId ?? code`). */
  contratoNumero: string;
  lado: RolEnElContrato;
  /** `YYYY-MM` del período. */
  mes: string;
  /** `YYYY-MM-DD`. */
  desde: string;
  /** `YYYY-MM-DD`. */
  hasta: string;
  /** `YYYY-MM-DD`: el día de cartera del período. */
  vencimiento: string;
  clienteNombre: string;
  clienteDocumento: string | null;
  inmueble: string;
  /** Base gravable (canon + conceptos que se facturan). */
  baseCop: number;
  ivaCop: number;
  totalCop: number;
  /** `true` si esa cuota ya tiene factura emitida. Se ve, y no se vuelve a contar. */
  yaFacturada: boolean;
}

export interface PrefacturasHasta {
  /** `YYYY-MM-DD` hasta donde se miró. */
  hasta: string;
  prefacturas: PrefacturaDelMes[];
  /** Cuántas por mes, para que la pantalla muestre la carga de cada mes. */
  porMes: { mes: string; cantidad: number; totalCop: number }[];
  totales: {
    cantidad: number;
    baseCop: number;
    ivaCop: number;
    totalCop: number;
  };
}
