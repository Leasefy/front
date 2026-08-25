/**
 * Portal del Propietario — tipos de novedades: daños + digest (F5, v8-05).
 *
 * Shapes EXACTOS del back (`portal-propietario-danos-digest.ts` schemas `PortalDanos`/`PortalDigest`
 * + `build-digest.ts` `DigestPayload`).
 *
 * ⚠️ Daños fail-soft: `available:false` cuando la tabla de mantenimiento (Martín) no existe →
 * la UI muestra "Próximamente" SOLO para daños, sin romper el resto.
 * ⚠️ El payload del digest ya viene PII-minimizado por el back (labels/montos/fechas); se muestra tal cual.
 */

/** Un ticket de daño (lectura fail-soft de la tabla de mantenimiento). */
export interface DamageTicket {
  id: string;
  propertyRef: string;
  category: string | null;
  severity: string | null;
  estadoDisplay: 'en_proceso' | 'resuelto' | 'cerrado';
  createdAt: string;
  resolvedAt: string | null;
  costoFinalCop: number | null;
}

/** `GET /danos` — `available:false` si la tabla de Martín no existe aún. */
export interface DanosResponse {
  available: boolean;
  tickets: DamageTicket[];
}

/** `GET /digests` — item de la lista de digests mensuales. */
export interface DigestListItem {
  periodo: string;
  generatedAt: string;
  deliveredAt: string | null;
  deliveryChannel: string | null;
}

/** Contenido del digest mensual (reusa agregaciones de finanzas/daños del back). */
export interface DigestPayload {
  periodo: string;
  generadoEn: string;
  recaudo: {
    totalCop: number;
    porInmueble: Array<{ propertyRef: string; label: string; amountCop: number }>;
  };
  ocupacion: {
    totalProperties: number;
    occupied: number;
    vacant: number;
    occupancyPct: number;
  };
  solicitudes: {
    creadas: number;
    resueltas: number;
    abiertas: number;
    /** Documenta la aproximación de `resueltas` (updatedAt del estado cerrado). */
    nota: string;
  };
  danos: {
    available: boolean;
    resueltosCount: number;
    resueltos: Array<{
      propertyRef: string;
      category: string | null;
      severity: string | null;
      resolvedAt: string | null;
      costoFinalCop: number | null;
    }>;
  };
  contratosPorVencer: Array<{
    propertyRef: string;
    propertyLabel: string;
    endDate: string;
    daysLeft: number;
    preaviso: unknown;
  }>;
  actionItems: {
    decisionesPendientes: Array<{ processId: string; propertyRef: string; label: string }>;
    preavisos: Array<{
      propertyRef: string;
      label: string;
      endDate: string;
      noticeDeadline: string;
      daysToDeadline: number;
      options: unknown[];
    }>;
  };
}

/** `GET /digest/{periodo}` — digest persistido de un periodo. */
export interface Digest {
  periodo: string;
  payload: DigestPayload;
  generatedAt: string;
  deliveredAt: string | null;
  deliveryChannel: string | null;
}
