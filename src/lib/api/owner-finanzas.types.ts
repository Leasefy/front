/**
 * Portal del Propietario — tipos de finanzas (F3 "Ver mi plata", v8-02, frontend-first).
 *
 * Shapes EXACTOS del contrato owner-facing del back (`portal-propietario-finanzas.ts`, schemas
 * `PortalFinanzas*`). Se declaran a mano porque el schema generado (`./generated/agent`) todavía no
 * incluye `portal-propietario` (rama sin mergear); cuando lo incluya, migrar a
 * `components['schemas'][...]` — una sola fuente de verdad (igual que v7 acuerdos).
 *
 * ⚠️ Los montos (`*Cop`) se leen VERBATIM del back. El front NUNCA recomputa totales ni saldos:
 * la aritmética de dinero vive enteramente en el agent (evita divergencias de saldo).
 */

/** Estado de un embudo de elección de inquilino asociado a un inmueble vacante (F2 lo consume). */
export interface FinanzasFunnel {
  processId: string;
  status: string;
  candidateCount: number;
  aptoCount: number;
  awaitingYourChoice: boolean;
}

/** Opción de preaviso/terminación con su fundamento legal (informativo — Ley 820). */
export interface FinanzasPreavisoOption {
  tipo: 'prorroga_unilateral' | 'causal_especial' | 'plena_voluntad_4anios';
  costoCop?: number;
  caucionCop?: number;
  disponible: boolean;
  fundamento: string;
}

export interface FinanzasPreaviso {
  noticeDeadline: string;
  daysToDeadline: number;
  windowOpen: boolean;
  contractYears: number;
  options: FinanzasPreavisoOption[];
}

/** `GET /portafolio` — consolidado multi-inmueble. */
export interface FinanzasPortafolio {
  totalProperties: number;
  occupied: number;
  vacant: number;
  occupancyPct: number;
  vacantDetail: Array<{
    propertyRef: string;
    label: string;
    vacantDays: number | null;
    funnel: FinanzasFunnel | null;
  }>;
  recaudoMesActual: number;
  contractsExpiring: Array<{
    propertyRef: string;
    propertyLabel: string;
    tenantDisplayName: string | null;
    endDate: string;
    daysLeft: number;
    preaviso: FinanzasPreaviso;
  }>;
  openRequestsCount: number;
}

/** `GET /inmuebles` — un item de la lista. */
export interface FinanzasInmueble {
  propertyRef: string;
  label: string;
  occupancyStatus: string;
  contract: {
    canonCop: number;
    endDate: string;
    daysRemaining: number;
    tenantDisplayName: string | null;
  } | null;
}

export interface MonthAmount {
  month: string;
  amountCop: number;
}

/** `GET /inmuebles/{ref}` — detalle. `payload` de novedad restringido a claves no-PII (barrera anti-PII del back). */
export interface FinanzasInmuebleDetalle {
  property: {
    propertyRef: string;
    label: string;
    occupancyStatus: string;
    vacantSince: string | null;
  };
  contract: {
    contractRef: string;
    canonCop: number;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    tenantDisplayName: string | null;
    preaviso: FinanzasPreaviso;
  } | null;
  novedades: Array<{
    eventRef: string;
    tipo: string;
    payload: {
      detalle?: string;
      motivo?: string;
      estado?: string;
      categoria?: string;
      montoCop?: number;
    } | null;
    occurredAt: string;
  }>;
  recaudo?: {
    months: string[];
    total: MonthAmount[];
  };
}

/** `GET /inmuebles/{ref}/pagos` — historial de pagos paginado. */
export interface FinanzasPagos {
  total: number;
  items: Array<{
    paymentRef: string;
    contractRef: string;
    amountCop: number;
    paidAt: string;
    concepto: string;
    periodo: string | null;
  }>;
}

/** `GET /recaudo` — series por mes + por inmueble. */
export interface FinanzasRecaudo {
  months: string[];
  total: MonthAmount[];
  byProperty: Array<{
    propertyRef: string;
    label: string;
    series: MonthAmount[];
  }>;
}

/** `GET /recaudo/anual` — totales del año por concepto. */
export interface FinanzasRecaudoAnual {
  year: number;
  totals: Array<{
    concepto: string;
    totalCop: number;
    paymentsCount: number;
  }>;
}

/** `GET /proyeccion` — proyección de ingresos (canon × meses restantes) + supuestos. */
export interface FinanzasProyeccion {
  months: Array<{
    month: string;
    totalCop: number;
    byProperty: Array<{ propertyRef: string; amountCop: number }>;
  }>;
  assumptions: string[];
}
