/**
 * `/inmobiliaria/contabilidad/gastos` y `/inmobiliaria/contabilidad/egresos` —
 * el cliente del contrato congelado del 18-09 (§3 y §4).
 *
 * ── Qué hay del otro lado ───────────────────────────────────────────────────
 *
 * Dos piezas que hoy no existen en el producto: la FACTURA DEL PROVEEDOR (lo
 * que la inmobiliaria gasta en sí misma: cerraduras, el contador, la luz de la
 * oficina) y el EGRESO con su lote (la plata que le sale a pagarlo). Son las
 * dos que hacen que del sistema salga un P&G con gastos propios: hoy el libro
 * sólo sabe de lo que entra y de lo que se le gira al propietario.
 *
 * 🔴 **El canon no pasa por acá.** Lo que se le gira al propietario es el lote
 * de dispersión (`lotes-de-dispersion.service.ts`), que baja un pasivo (2815) y
 * NO es gasto de la inmobiliaria. Estos egresos son los propios: proveedores,
 * abogados, técnicos, empleados. Mezclarlos inflaría el gasto con plata que
 * nunca fue de la inmobiliaria.
 *
 * ── 🔴 Por qué cada cuerpo se arma con una lista explícita de claves ────────
 *
 * `back-erp/src/main.ts` monta el `ValidationPipe` global con
 * `whitelist: true` **y `forbidNonWhitelisted: true`**: una clave que el DTO no
 * declara no se ignora, devuelve 400 y con él la factura entera. Por eso cada
 * cuerpo pasa por `soloClaves()` contra la lista de su DTO, y por eso el test
 * de este archivo compara esas listas contra copias escritas a mano del
 * contrato — no contra sí mismas.
 *
 * Los TOTALES son el caso delicado: el back los recalcula de las líneas y de
 * las retenciones, compara con lo que mandó el cliente y devuelve 400
 * `TOTALES_NO_CUADRAN` con los dos números. Así que lo único que viaja es lo
 * que la FACTURA DE PAPEL dice (`totalCop` y las tres retenciones); el
 * subtotal, el IVA, el IVA descontable y el neto se leen de la respuesta y
 * nunca se envían: son cuenta del back y mandarlos sería pedirle que confíe.
 *
 * ── `disponible: false` en vez de una pantalla en blanco ────────────────────
 *
 * Las tres tablas viven en migraciones sin aplicar (50 y 51). Las lecturas
 * responden `{ disponible: false, motivo }` con el texto del 503 y las
 * escrituras tiran 503: la pantalla muestra el motivo y quién aplica la
 * migración, en vez de caerse — el mismo trato que ya usa finanzas.
 */

import { apiClient } from './client';
import { soloClaves } from './contabilidad.service';

const BASE = '/inmobiliaria/contabilidad';

// ══ Vocabulario del back ════════════════════════════════════════════════════

/** El tipo de documento con el que el proveedor cobra. */
export type TipoDeFacturaDeProveedor =
  | 'FACTURA'
  | 'DOCUMENTO_EQUIVALENTE'
  | 'CUENTA_DE_COBRO'
  | 'DOCUMENTO_SOPORTE';

export const TIPOS_DE_FACTURA: readonly TipoDeFacturaDeProveedor[] = [
  'FACTURA',
  'DOCUMENTO_EQUIVALENTE',
  'CUENTA_DE_COBRO',
  'DOCUMENTO_SOPORTE',
];

export const NOMBRE_DEL_TIPO_DE_FACTURA: Record<TipoDeFacturaDeProveedor, string> = {
  FACTURA: 'Factura electrónica',
  DOCUMENTO_EQUIVALENTE: 'Documento equivalente',
  CUENTA_DE_COBRO: 'Cuenta de cobro',
  DOCUMENTO_SOPORTE: 'Documento soporte',
};

export type EstadoDeFacturaDeProveedor = 'BORRADOR' | 'CAUSADA' | 'PAGADA' | 'ANULADA';

export const ESTADOS_DE_FACTURA: readonly EstadoDeFacturaDeProveedor[] = [
  'BORRADOR',
  'CAUSADA',
  'PAGADA',
  'ANULADA',
];

export const NOMBRE_DEL_ESTADO_DE_FACTURA: Record<EstadoDeFacturaDeProveedor, string> = {
  BORRADOR: 'Borrador',
  CAUSADA: 'Causada',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
};

/** Una línea de la factura: la base, su cuenta del PUC y su IVA. */
export interface LineaDeFactura {
  descripcion: string;
  /** La cuenta del gasto. `null` ⇒ el back usa la del rubro o `GASTO_SIN_RUBRO`. */
  cuentaId: string | null;
  baseCop: number;
  ivaPct: number;
  /** Lo calcula el back de `baseCop × ivaPct`. Sólo se lee. */
  ivaCop: number;
}

export interface FacturaDeProveedor {
  id: string;
  tipo: TipoDeFacturaDeProveedor;
  estado: EstadoDeFacturaDeProveedor;
  /**
   * El proveedor del registro, o `null` cuando se escribió a mano.
   *
   * 🔴 Los datos del proveedor quedan CONGELADOS en la factura: un documento
   * tributario no cambia porque alguien editó una ficha. Por eso el nombre y
   * el documento están acá y no se leen del registro al pintar la fila.
   */
  proveedorId: string | null;
  proveedorNombre: string;
  proveedorTipoDocumento: string | null;
  proveedorDocumento: string | null;
  proveedorCiudad: string | null;
  proveedorDireccion: string | null;
  prefijoDelProveedor: string | null;
  numeroDelProveedor: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  fechaDeVencimiento: string | null;
  concepto: string;
  rubro: string | null;
  sedeId: string | null;
  lineas: LineaDeFactura[];
  subtotalCop: number;
  ivaCop: number;
  /** `0` si la inmobiliaria no es responsable de IVA: ahí el IVA es más gasto. */
  ivaDescontableCop: number;
  retefuenteCop: number;
  reteivaCop: number;
  reteicaCop: number;
  /** Lo que dice la factura. */
  totalCop: number;
  /** Lo que se le paga: total − retenciones. */
  netoCop: number;
  asientoId: string | null;
  asientoNumero: number | null;
  egresoId: string | null;
  motivoDeLaAnulacion: string | null;
  registradoPorUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Los totales de la página de facturas, ya sumados por el back. */
export interface TotalesDeFacturas {
  subtotalCop: number;
  ivaCop: number;
  retencionesCop: number;
  totalCop: number;
  netoCop: number;
}

export interface PaginaDeFacturas {
  /** `false` = falta la migración 50. El resto viene vacío. */
  disponible: boolean;
  /** El texto del 503, con el nombre de la migración. */
  motivo: string | null;
  total: number;
  limite: number;
  desplazamiento: number;
  totales: TotalesDeFacturas;
  facturas: FacturaDeProveedor[];
}

/** `@Max(200)` en el DTO: pedir más es 400. */
export const MAX_LIMITE_DE_FACTURAS = 200;
export const LIMITE_POR_DEFECTO_DE_FACTURAS = 50;

export interface FiltrosDeFacturas {
  desde?: string;
  hasta?: string;
  estado?: EstadoDeFacturaDeProveedor;
  proveedorId?: string;
  sedeId?: string;
  rubro?: string;
  limite?: number;
  desplazamiento?: number;
}

/**
 * `LineaDeFacturaDto`. 🔴 `ivaCop` NO está: lo calcula el back de
 * `baseCop × ivaPct`, y mandarlo sería pedirle que confíe en una cuenta que
 * hizo el navegador.
 */
export const CLAVES_DE_LINEA_DE_FACTURA = ['descripcion', 'cuentaId', 'baseCop', 'ivaPct'] as const;

export interface LineaNueva {
  descripcion: string;
  cuentaId?: string;
  baseCop: number;
  ivaPct: number;
}

/**
 * `CrearFacturaDeProveedorDto`.
 *
 * 🔴 Lo que NO está y es a propósito: `subtotalCop`, `ivaCop`,
 * `ivaDescontableCop` y `netoCop`. Los calcula el back. `totalCop` SÍ va —es
 * lo que dice el papel— y el back lo compara con su cuenta: si no coinciden,
 * 400 `TOTALES_NO_CUADRAN` con los dos números, que es exactamente la
 * pregunta que hay que hacerle a quien digita.
 */
export const CLAVES_DE_CREAR_FACTURA = [
  'tipo',
  'proveedorId',
  'proveedorNombre',
  'proveedorTipoDocumento',
  'proveedorDocumento',
  'proveedorCiudad',
  'proveedorDireccion',
  'prefijoDelProveedor',
  'numeroDelProveedor',
  'fecha',
  'fechaDeVencimiento',
  'concepto',
  'rubro',
  'sedeId',
  'lineas',
  'retefuenteCop',
  'reteivaCop',
  'reteicaCop',
  'totalCop',
  'causar',
] as const;

export interface FacturaNueva {
  tipo: TipoDeFacturaDeProveedor;
  proveedorId?: string;
  proveedorNombre: string;
  proveedorTipoDocumento?: string;
  proveedorDocumento?: string;
  proveedorCiudad?: string;
  proveedorDireccion?: string;
  prefijoDelProveedor?: string;
  numeroDelProveedor: string;
  fecha: string;
  fechaDeVencimiento?: string;
  concepto: string;
  rubro?: string;
  sedeId?: string;
  lineas: LineaNueva[];
  retefuenteCop?: number;
  reteivaCop?: number;
  reteicaCop?: number;
  totalCop: number;
  /** Registra y causa en un solo paso. */
  causar?: boolean;
}

/** `AnularDto`: un solo campo. Un asiento no se borra, se reversa con motivo. */
export const CLAVES_DE_ANULAR = ['motivo'] as const;

// ── La liquidación, antes de escribir nada ─────────────────────────────────

/**
 * Un impuesto de la liquidación, con DE DÓNDE SALE.
 *
 * 🔴 `origen` es el campo que hace útil a esta respuesta. `DECLARADO` = el valor
 * que la persona escribió (leyó la retención en el papel del proveedor);
 * `CALCULADO` = el que el back dedujo del perfil tributario del proveedor. Sin
 * esa distinción, una retención calculada y una leída se ven igual, y nadie
 * sabe cuál revisar contra la factura.
 */
export interface ImpuestoDeLaFactura {
  tipo: 'IVA' | 'RETEFUENTE' | 'RETEIVA' | 'RETEICA';
  nombre: string;
  porcentaje: number | null;
  baseCop: number;
  valorCop: number;
  origen: 'DECLARADO' | 'CALCULADO';
}

/** `PrevisualizarFacturaDto`. Sólo lo que hace falta para liquidar. */
export const CLAVES_DE_PREVISUALIZAR = [
  'proveedorId',
  'lineas',
  'retefuenteCop',
  'reteivaCop',
  'reteicaCop',
] as const;

export interface BorradorAPrevisualizar {
  proveedorId?: string;
  lineas: LineaNueva[];
  retefuenteCop?: number;
  reteivaCop?: number;
  reteicaCop?: number;
}

/**
 * La liquidación de `POST /gastos/facturas/previsualizar`. **No escribe nada**:
 * es lo que la pantalla muestra mientras se digita.
 *
 * 🔴 `sinConfirmar` es el `PENDIENTE_DE_CONFIRMAR` de esta pieza: el back
 * calculó una retención con un perfil tributario que nadie confirmó. Se muestra
 * con el mismo tratamiento que el PUC le da a lo que propone y no sabe — un
 * aviso con el texto exacto, nunca un asterisco — porque una retención mal
 * practicada es plata que la inmobiliaria le debe a la DIAN.
 */
export interface LiquidacionDeFactura {
  subtotalCop: number;
  ivaCop: number;
  /** `0` si la inmobiliaria no es responsable de IVA: ahí el IVA es más gasto. */
  ivaDescontableCop: number;
  retefuenteCop: number;
  reteivaCop: number;
  reteicaCop: number;
  totalCop: number;
  netoCop: number;
  impuestos: ImpuestoDeLaFactura[];
  /** `true` = algún impuesto salió de un perfil tributario sin confirmar. */
  sinConfirmar: boolean;
  /** Lo que el back quiere decir de esta liquidación, en palabras. */
  notas: string[];
}

// ── Egresos ────────────────────────────────────────────────────────────────

export type EstadoDeEgreso = 'PENDIENTE' | 'EN_LOTE' | 'PAGADO' | 'ANULADO';

export const ESTADOS_DE_EGRESO: readonly EstadoDeEgreso[] = [
  'PENDIENTE',
  'EN_LOTE',
  'PAGADO',
  'ANULADO',
];

export const NOMBRE_DEL_ESTADO_DE_EGRESO: Record<EstadoDeEgreso, string> = {
  PENDIENTE: 'Pendiente',
  EN_LOTE: 'En un lote',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

export type BeneficiarioDeEgreso = 'PROVEEDOR' | 'ABOGADO' | 'TECNICO' | 'EMPLEADO' | 'OTRO';

export const BENEFICIARIOS_DE_EGRESO: readonly BeneficiarioDeEgreso[] = [
  'PROVEEDOR',
  'ABOGADO',
  'TECNICO',
  'EMPLEADO',
  'OTRO',
];

export const NOMBRE_DEL_BENEFICIARIO: Record<BeneficiarioDeEgreso, string> = {
  PROVEEDOR: 'Proveedor',
  ABOGADO: 'Abogado',
  TECNICO: 'Técnico',
  EMPLEADO: 'Empleado',
  OTRO: 'Otro',
};

export interface Egreso {
  id: string;
  /** El consecutivo del COMPROBANTE de egreso. `null` hasta que se paga. */
  numero: number | null;
  estado: EstadoDeEgreso;
  beneficiarioTipo: BeneficiarioDeEgreso;
  beneficiarioId: string | null;
  beneficiarioNombre: string;
  beneficiarioTipoDocumento: string | null;
  beneficiarioDocumento: string | null;
  banco: string | null;
  tipoDeCuenta: string | null;
  numeroDeCuenta: string | null;
  facturaId: string | null;
  concepto: string;
  valorCop: number;
  retefuenteCop: number;
  reteivaCop: number;
  reteicaCop: number;
  netoCop: number;
  rubro: string | null;
  sedeId: string | null;
  loteId: string | null;
  fechaDelEgreso: string | null;
  asientoId: string | null;
  asientoNumero: number | null;
  /** El movimiento del extracto con el que quedó conciliado. */
  movimientoBancarioId: string | null;
  motivoDeLaAnulacion: string | null;
}

export interface ListaDeEgresos {
  /** `false` = falta la migración 51. */
  disponible: boolean;
  motivo: string | null;
  total: number;
  egresos: Egreso[];
}

export interface FiltrosDeEgresos {
  estado?: EstadoDeEgreso;
  desde?: string;
  hasta?: string;
  beneficiarioTipo?: BeneficiarioDeEgreso;
}

/** `CrearEgresoDto`. Sin `facturaId` es un egreso suelto (un anticipo). */
export const CLAVES_DE_CREAR_EGRESO = [
  'beneficiarioTipo',
  'beneficiarioId',
  'beneficiarioNombre',
  'beneficiarioTipoDocumento',
  'beneficiarioDocumento',
  'banco',
  'tipoDeCuenta',
  'numeroDeCuenta',
  'facturaId',
  'concepto',
  'valorCop',
  'retefuenteCop',
  'reteivaCop',
  'reteicaCop',
  'rubro',
  'sedeId',
  'fechaDelEgreso',
] as const;

export interface EgresoNuevo {
  beneficiarioTipo: BeneficiarioDeEgreso;
  beneficiarioId?: string;
  beneficiarioNombre: string;
  beneficiarioTipoDocumento?: string;
  beneficiarioDocumento?: string;
  banco?: string;
  tipoDeCuenta?: string;
  numeroDeCuenta?: string;
  facturaId?: string;
  concepto: string;
  valorCop: number;
  retefuenteCop?: number;
  reteivaCop?: number;
  reteicaCop?: number;
  rubro?: string;
  sedeId?: string;
  fechaDelEgreso?: string;
}

/** `ConciliarEgresoDto`. */
export const CLAVES_DE_CONCILIAR = ['movimientoBancarioId'] as const;

/** El comprobante de egreso, listo para imprimir. */
export interface ComprobanteDeEgreso {
  egreso: Egreso;
  /** El nombre de la inmobiliaria y su NIT, como los imprime el back. */
  agencia: { nombre: string; nit: string | null };
  /** Las líneas del asiento, para que el comprobante muestre la contrapartida. */
  lineas: { codigo: string; cuenta: string; debitoCop: number; creditoCop: number }[];
  /** El texto legal del pie, si el back lo manda. */
  nota: string | null;
}

// ── Lotes de egreso ────────────────────────────────────────────────────────

export type EstadoDelLoteDeEgreso =
  | 'BORRADOR'
  | 'ESPERANDO_APROBACION'
  | 'APROBADO'
  | 'ARCHIVO_GENERADO'
  | 'PAGADO'
  | 'ANULADO';

export const ESTADOS_DEL_LOTE: readonly EstadoDelLoteDeEgreso[] = [
  'BORRADOR',
  'ESPERANDO_APROBACION',
  'APROBADO',
  'ARCHIVO_GENERADO',
  'PAGADO',
  'ANULADO',
];

export const NOMBRE_DEL_ESTADO_DEL_LOTE: Record<EstadoDelLoteDeEgreso, string> = {
  BORRADOR: 'Borrador',
  ESPERANDO_APROBACION: 'Esperando aprobación',
  APROBADO: 'Aprobado',
  ARCHIVO_GENERADO: 'Archivo generado',
  PAGADO: 'Pagado',
  ANULADO: 'Anulado',
};

/** Los mismos de `FormatoArchivoDePagos` del lote de propietarios. */
export type FormatoDelArchivo = 'BANCOLOMBIA_PAB' | 'BANCOLOMBIA_SAP' | 'ONEPAY';

export const FORMATOS_DEL_ARCHIVO: readonly FormatoDelArchivo[] = [
  'BANCOLOMBIA_PAB',
  'BANCOLOMBIA_SAP',
  'ONEPAY',
];

export const NOMBRE_DEL_FORMATO: Record<FormatoDelArchivo, string> = {
  BANCOLOMBIA_PAB: 'Bancolombia PAB',
  BANCOLOMBIA_SAP: 'Bancolombia SAP',
  ONEPAY: 'OnePay',
};

export interface LoteDeEgreso {
  id: string;
  concepto: string;
  estado: EstadoDelLoteDeEgreso;
  totalCop: number;
  cantidad: number;
  creadoPorUserId: string | null;
  aprobadoPorUserId: string | null;
  aprobadoAt: string | null;
  formatoArchivo: FormatoDelArchivo | null;
  archivoGeneradoAt: string | null;
  archivoHash: string | null;
  pagadoAt: string | null;
  referenciaBanco: string | null;
  anuladoAt: string | null;
  motivoDeLaAnulacion: string | null;
  egresos: Egreso[];
}

export interface ListaDeLotes {
  disponible: boolean;
  motivo: string | null
  total: number;
  lotes: LoteDeEgreso[];
}

/** `CrearLoteDeEgresoDto`. */
export const CLAVES_DE_CREAR_LOTE = ['concepto', 'egresoIds'] as const;

export interface LoteNuevo {
  concepto: string;
  egresoIds: string[];
}

/** `MarcarPagadoDto`. */
export const CLAVES_DE_PAGADO = ['fecha', 'referenciaBanco'] as const;

export interface PagoDelLote {
  fecha: string;
  referenciaBanco?: string;
}

/**
 * Lo que devuelve marcar pagado el lote: el lote, y **un asiento POR EGRESO**.
 *
 * 🔴 No es un detalle de forma. Con un asiento compartido por lote, anular UN
 * egreso reversaba el pago de los otros ocho —a los que el banco ya les había
 * girado—. Con un asiento por egreso, el comprobante N.º 87 y el asiento N.º 415
 * son la misma cosa, y anular uno no toca a nadie más.
 *
 * Consecuencia para la pantalla: después de pagar NO se anuncia «asiento N.º X»
 * (no hay uno), se anuncia cuántos quedaron y se puede abrir el de cada
 * comprobante.
 */
export interface AsientoDelEgreso {
  egresoId: string;
  id: string;
  numero: number;
}

export interface ResultadoDelPago {
  lote: LoteDeEgreso;
  asientos: AsientoDelEgreso[];
  /** Cuántos comprobantes de egreso quedaron numerados. */
  comprobantes: number;
}

/**
 * El 409 de aprobar un lote que armó la misma persona.
 *
 * 🔴 No es un detalle de implementación: es el control de doble firma sobre
 * plata que sale del banco. La pantalla lo dice con estas palabras y no como
 * «no se pudo aprobar».
 */
export const APROBADOR_ES_EL_MISMO = 'APROBADOR_ES_EL_MISMO';

// ══ Helpers ═════════════════════════════════════════════════════════════════

function conQuery(path: string, params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

const numero = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : String(n);

function cuerpoDeFactura(factura: FacturaNueva): FacturaNueva {
  const base = soloClaves(factura, CLAVES_DE_CREAR_FACTURA) as FacturaNueva;
  return {
    ...base,
    lineas: factura.lineas.map((l) => soloClaves(l, CLAVES_DE_LINEA_DE_FACTURA) as LineaNueva),
  };
}

// ══ API ═════════════════════════════════════════════════════════════════════

export const gastosApi = {
  facturas: {
    /** Lectura. `limite` se recorta al tope del DTO antes de salir. */
    async listar(filtros: FiltrosDeFacturas = {}): Promise<PaginaDeFacturas> {
      return apiClient.get<PaginaDeFacturas>(
        conQuery(`${BASE}/gastos/facturas`, {
          desde: filtros.desde,
          hasta: filtros.hasta,
          estado: filtros.estado,
          proveedorId: filtros.proveedorId,
          sedeId: filtros.sedeId,
          rubro: filtros.rubro,
          limite: numero(
            filtros.limite === undefined
              ? undefined
              : Math.min(filtros.limite, MAX_LIMITE_DE_FACTURAS),
          ),
          desplazamiento: numero(filtros.desplazamiento),
        }),
      );
    },

    /**
     * Lectura. Liquida la factura **sin escribir nada**: es lo que la pantalla
     * muestra mientras se digita.
     *
     * 🔴 Lo hace el BACK y no el navegador porque la liquidación depende del
     * perfil tributario del proveedor (si es responsable de IVA, su porcentaje
     * de retefuente, si la inmobiliaria es agente retenedor de ICA en ese
     * municipio) — datos que la pantalla no tiene y no debería adivinar. La
     * respuesta dice, impuesto por impuesto, si el valor lo declaró la persona o
     * lo calculó el back, y si algo salió de un perfil sin confirmar.
     */
    async previsualizar(borrador: BorradorAPrevisualizar): Promise<LiquidacionDeFactura> {
      const base = soloClaves(borrador, CLAVES_DE_PREVISUALIZAR) as BorradorAPrevisualizar;
      return apiClient.post<LiquidacionDeFactura>(`${BASE}/gastos/facturas/previsualizar`, {
        ...base,
        lineas: borrador.lineas.map(
          (l) => soloClaves(l, CLAVES_DE_LINEA_DE_FACTURA) as LineaNueva,
        ),
      });
    },

    /** Escritura. Con `causar: true` registra y asienta en un solo paso. */
    async registrar(factura: FacturaNueva): Promise<FacturaDeProveedor> {
      return apiClient.post<FacturaDeProveedor>(
        `${BASE}/gastos/facturas`,
        cuerpoDeFactura(factura),
      );
    },

    /**
     * Escritura. Genera el asiento del gasto: las líneas al débito, el IVA
     * descontable al débito, la cuenta por pagar y las retenciones al crédito.
     */
    async causar(id: string): Promise<FacturaDeProveedor> {
      return apiClient.post<FacturaDeProveedor>(
        `${BASE}/gastos/facturas/${encodeURIComponent(id)}/causar`,
        {},
      );
    },

    /** Escritura. Reversa el asiento —nunca lo borra— y marca `ANULADA`. */
    async anular(id: string, motivo: string): Promise<FacturaDeProveedor> {
      return apiClient.post<FacturaDeProveedor>(
        `${BASE}/gastos/facturas/${encodeURIComponent(id)}/anular`,
        soloClaves({ motivo }, CLAVES_DE_ANULAR),
      );
    },
  },

  egresos: {
    async listar(filtros: FiltrosDeEgresos = {}): Promise<ListaDeEgresos> {
      return apiClient.get<ListaDeEgresos>(
        conQuery(`${BASE}/egresos`, {
          estado: filtros.estado,
          desde: filtros.desde,
          hasta: filtros.hasta,
          beneficiarioTipo: filtros.beneficiarioTipo,
        }),
      );
    },

    async registrar(egreso: EgresoNuevo): Promise<Egreso> {
      return apiClient.post<Egreso>(
        `${BASE}/egresos`,
        soloClaves(egreso, CLAVES_DE_CREAR_EGRESO),
      );
    },

    /** Escritura. Si estaba pagado, reversa el asiento. */
    async anular(id: string, motivo: string): Promise<Egreso> {
      return apiClient.post<Egreso>(
        `${BASE}/egresos/${encodeURIComponent(id)}/anular`,
        soloClaves({ motivo }, CLAVES_DE_ANULAR),
      );
    },

    /** Escritura. Lo amarra a la salida del extracto bancario. */
    async conciliar(id: string, movimientoBancarioId: string): Promise<Egreso> {
      return apiClient.post<Egreso>(
        `${BASE}/egresos/${encodeURIComponent(id)}/conciliar`,
        soloClaves({ movimientoBancarioId }, CLAVES_DE_CONCILIAR),
      );
    },

    /** Lectura. El comprobante de egreso, listo para imprimir. */
    async comprobante(id: string): Promise<ComprobanteDeEgreso> {
      return apiClient.get<ComprobanteDeEgreso>(
        `${BASE}/egresos/${encodeURIComponent(id)}/comprobante`,
      );
    },
  },

  lotes: {
    async listar(estado?: EstadoDelLoteDeEgreso): Promise<ListaDeLotes> {
      return apiClient.get<ListaDeLotes>(conQuery(`${BASE}/egresos/lotes`, { estado }));
    },

    /** Escritura. Los egresos pasan de `PENDIENTE` a `EN_LOTE`. */
    async crear(lote: LoteNuevo): Promise<LoteDeEgreso> {
      return apiClient.post<LoteDeEgreso>(
        `${BASE}/egresos/lotes`,
        soloClaves(lote, CLAVES_DE_CREAR_LOTE),
      );
    },

    /**
     * Escritura. 🔴 Aprueba OTRA persona: quien armó el lote recibe 409
     * `APROBADOR_ES_EL_MISMO`. Sin cuerpo: el aprobador sale del JWT.
     */
    async aprobar(id: string): Promise<LoteDeEgreso> {
      return apiClient.post<LoteDeEgreso>(
        `${BASE}/egresos/lotes/${encodeURIComponent(id)}/aprobar`,
        {},
      );
    },

    /**
     * Lectura, pero con efecto: marca `ARCHIVO_GENERADO` y guarda el hash del
     * archivo que se subió al banco. Baja como blob, no como JSON.
     */
    async archivo(id: string, formato?: FormatoDelArchivo): Promise<Blob> {
      return apiClient.getBlob(
        conQuery(`${BASE}/egresos/lotes/${encodeURIComponent(id)}/archivo`, { formato }),
      );
    },

    /**
     * Escritura. Numera los comprobantes y asienta la salida del banco: **un
     * asiento por egreso**, no uno por lote (ver `ResultadoDelPago`).
     */
    async pagado(id: string, pago: PagoDelLote): Promise<ResultadoDelPago> {
      return apiClient.post<ResultadoDelPago>(
        `${BASE}/egresos/lotes/${encodeURIComponent(id)}/pagado`,
        soloClaves(pago, CLAVES_DE_PAGADO),
      );
    },

    /** Escritura. Los egresos del lote vuelven a `PENDIENTE`. */
    async anular(id: string, motivo: string): Promise<LoteDeEgreso> {
      return apiClient.post<LoteDeEgreso>(
        `${BASE}/egresos/lotes/${encodeURIComponent(id)}/anular`,
        soloClaves({ motivo }, CLAVES_DE_ANULAR),
      );
    },
  },
};
