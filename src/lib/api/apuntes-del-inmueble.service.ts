/**
 * Los apuntes del inmueble (back `src/properties/apuntes-del-inmueble/`, 27-10-2026): lo pactado en la captación
 * cuando todavía no hay propietario (comisión, plazo, inventario) y las observaciones internas, que sólo ve la
 * inmobiliaria. Sin la migración del back, la lectura dice `disponible: false` y guardar responde 503
 * `FALTA_UNA_MIGRACION`.
 */
import { apiClient } from './client';

export type EstadoDelItemDeLaCaptacion = 'excellent' | 'good' | 'fair' | 'poor';

export interface CondicionesDeLaCaptacion {
  comisionPorcentaje?: number;
  comisionDeVentaPorcentaje?: number;
  plazoMinimoMeses?: number;
  /** AAAA-MM-DD. */
  fechaDelContrato?: string;
  inventario?: Array<{ nombre: string; cantidad: number; estado: EstadoDelItemDeLaCaptacion; notas?: string }>;
  notasDelInventario?: string;
}

export interface ApuntesDelInmueble {
  disponible: boolean;
  condiciones: CondicionesDeLaCaptacion | null;
  observacionesInternas: string | null;
}

export const apuntesDelInmuebleApi = {
  leer: (propertyId: string) => apiClient.get<ApuntesDelInmueble>(`/properties/${propertyId}/apuntes`),
  guardarObservaciones: (propertyId: string, texto: string) =>
    apiClient.put<ApuntesDelInmueble>(`/properties/${propertyId}/apuntes/observaciones`, { texto }),
  guardarCondiciones: (propertyId: string, condiciones: CondicionesDeLaCaptacion) =>
    apiClient.put<ApuntesDelInmueble>(`/properties/${propertyId}/apuntes/condiciones`, condiciones),
};

/** Lo del asistente (`WizardFormData`) que se guarda como condiciones de la captación. */
export function condicionesDelAsistente(f: {
  listingType?: 'rent' | 'sale';
  tambienEnVenta?: boolean;
  commissionPercent?: number;
  saleCommissionPercent?: number;
  minimumTerm?: number;
  contractStartDate?: string;
  inventoryItems?: Array<{ name: string; quantity: number; condition: string; notes?: string }>;
  inventoryNotes?: string;
}): CondicionesDeLaCaptacion {
  const deVenta = f.listingType === 'sale';
  const conVenta = deVenta || f.tambienEnVenta === true;
  const estados: readonly string[] = ['excellent', 'good', 'fair', 'poor'];
  const inventario = deVenta
    ? []
    : (f.inventoryItems ?? [])
        .filter((i) => i.name.trim().length > 0)
        .map((i) => ({
          nombre: i.name.trim(),
          cantidad: Math.max(1, Math.trunc(i.quantity) || 1),
          estado: (estados.includes(i.condition) ? i.condition : 'good') as EstadoDelItemDeLaCaptacion,
          ...(i.notes?.trim() ? { notas: i.notes.trim() } : {}),
        }));
  return {
    ...(!deVenta && f.commissionPercent != null ? { comisionPorcentaje: f.commissionPercent } : {}),
    ...(conVenta && f.saleCommissionPercent != null ? { comisionDeVentaPorcentaje: f.saleCommissionPercent } : {}),
    ...(!deVenta && f.minimumTerm != null ? { plazoMinimoMeses: f.minimumTerm } : {}),
    ...(f.contractStartDate ? { fechaDelContrato: f.contractStartDate } : {}),
    ...(inventario.length > 0 ? { inventario } : {}),
    ...(!deVenta && f.inventoryNotes?.trim() ? { notasDelInventario: f.inventoryNotes.trim() } : {}),
  };
}
