/**
 * Facturación — contrato de tipos (v6-02, frontend-first).
 *
 * Define el shape que el motor de facturación (M2 — back-main + proveedor DIAN
 * autorizado) implementará. La UI se construye contra estos tipos con estado
 * vacío honesto; NO hay data falsa persistente hasta que exista el backend.
 *
 * Dominio: facturación inmobiliaria Colombia (DIAN factura electrónica + CUFE,
 * IVA, notas débito/crédito, facturas de venta y de compra).
 */

/** Estado del documento frente a la DIAN (factura electrónica). */
export type EstadoDIAN =
  | 'borrador'        // aún no emitido
  | 'emitida'         // enviada a la DIAN, sin acuse
  | 'aceptada'        // aceptada por la DIAN (CUFE válido)
  | 'rechazada'       // rechazada por la DIAN
  | 'anulada';        // anulada vía nota crédito

/** Estado de pago / cartera del documento. */
export type EstadoPago = 'pagada' | 'pendiente' | 'vencida' | 'parcial';

/** Tipo de nota equivalente electrónico. */
export type TipoNota = 'credito' | 'debito';

/** Periodicidad para facturación recurrente (canon, administración, etc.). */
export type Periodicidad = 'mensual' | 'bimestral' | 'trimestral' | 'anual';

/** Línea/concepto de una factura. */
export interface ConceptoFactura {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;   // COP
  ivaPorcentaje: number;   // p.ej. 19, 5, 0
}

/** Factura de venta — conceptos distintos al canon (reparaciones, honorarios, etc.) y/o recurrentes. */
export interface FacturaVenta {
  id: string;
  numero: string;
  cufe?: string;                 // presente cuando estadoDIAN === 'aceptada'
  terceroId: string;
  terceroNombre: string;
  concepto: string;              // resumen del concepto principal
  fechaEmision: string;          // ISO
  fechaVencimiento?: string;     // ISO
  subtotal: number;              // COP
  iva: number;                   // COP
  total: number;                 // COP
  estadoPago: EstadoPago;
  estadoDIAN: EstadoDIAN;
  recurrente?: boolean;
  periodicidad?: Periodicidad;
  conceptos?: ConceptoFactura[];
}

/** Factura de compra — costos/gastos de la operación (proveedores, servicios, etc.). */
export interface FacturaCompra {
  id: string;
  numero: string;
  proveedorId: string;
  proveedorNombre: string;
  concepto: string;
  fechaEmision: string;          // ISO
  fechaVencimiento?: string;     // ISO
  total: number;                 // COP
  estadoPago: EstadoPago;
  aCredito?: boolean;
}

/** Nota crédito / débito (documento equivalente electrónico) asociada a una factura. */
export interface NotaCreditoDebito {
  id: string;
  tipo: TipoNota;
  numero: string;
  cufe?: string;
  facturaRefId: string;
  facturaRefNumero: string;
  motivo: string;
  valor: number;                 // COP
  fechaEmision: string;          // ISO
  estadoDIAN: EstadoDIAN;
}

/** Documento electrónico (vista FE/DIAN): unifica facturas de venta + notas con CUFE. */
export interface DocumentoElectronico {
  id: string;
  tipo: 'factura' | 'nota_credito' | 'nota_debito';
  numero: string;
  cufe?: string;
  terceroNombre: string;
  fechaEmision: string;          // ISO
  total: number;                 // COP
  estadoDIAN: EstadoDIAN;
}

/** Contrato del listado paginado que el motor (M2) devolverá. */
export interface FacturacionListResponse<T> {
  items: T[];
  total: number;
}

/** Tabs de la sección de facturación. */
export type FacturacionTab = 'ventas' | 'compras' | 'electronica' | 'notas';
