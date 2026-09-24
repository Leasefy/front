/**
 * El inventario del inmueble por versiones, tal como lo devuelve el back
 * (`src/inmobiliaria/inventario-del-inmueble/` en back-erp).
 *
 * 🔴 Nico y Juan Camilo, 2026-09-16: el inventario se hace sobre el INMUEBLE;
 * iniciar un contrato exige uno actualizado y el contrato se queda con una
 * copia fija; al terminar, el inmueble pide actualizarlo.
 */
import type { InventoryItem } from '@/lib/types/inmobiliaria';

export type EstadoDelInventario = 'BORRADOR' | 'COMPLETO';

export type MotivoDeInventarioNoVigente =
  | 'SIN_INVENTARIO'
  | 'SOLO_BORRADOR'
  | 'ANTERIOR_AL_FIN_DEL_CONTRATO';

/** Un ítem de una versión: el de siempre, más el espacio donde está. */
export type ItemDeVersion = InventoryItem & { espacio?: string };

export interface ContratoQuePideActualizar {
  contratoId: string;
  code: number | null;
  externalId: string | null;
  /** `YYYY-MM-DD` */
  terminoEl: string;
}

export interface VigenciaDelInventario {
  vigente: boolean;
  motivo: MotivoDeInventarioNoVigente | null;
  inventarioVigenteId: string | null;
  ultimoCompleto: { id: string; version: number; completadoEl: string } | null;
  hayBorrador: boolean;
  porActualizarTras: ContratoQuePideActualizar | null;
}

export interface VersionDelInventario {
  id: string;
  version: number;
  estado: EstadoDelInventario;
  origen: 'PANEL' | 'CONSIGNACION' | string;
  items: ItemDeVersion[];
  creadoPorUserId: string | null;
  completadoPorUserId: string | null;
  completadoEn: string | null;
  createdAt: string;
  updatedAt: string;
  /** Cuántos contratos arrancaron con esta versión. */
  contratos: number;
}

export interface InventariosDelInmueble {
  /** `false` = migración sin aplicar: el inventario sigue en la consignación. */
  disponible: boolean;
  consignacionId: string;
  propertyId: string | null;
  versiones: VersionDelInventario[];
  borrador: VersionDelInventario | null;
  ultimoCompleto: VersionDelInventario | null;
  vigencia: VigenciaDelInventario | null;
}

export interface ParaIniciarUnContrato {
  exigible: boolean;
  motivoNoExigible: 'MIGRACION_PENDIENTE' | 'SIN_AGENCIA' | 'SIN_CONSIGNACION' | null;
  consignacionId: string | null;
  vigencia: VigenciaDelInventario | null;
}

export interface CopiaDelContrato {
  disponible: boolean;
  contractId: string;
  consignacionId: string | null;
  copia: {
    inventarioId: string | null;
    version: number;
    items: ItemDeVersion[];
    completadoEn: string;
    fijadoEn: string;
    /** La firma electrónica del inquilino sobre la copia. */
    firmaDelInquilino: ResumenDeFirma;
  } | null;
  vigenciaDelInmueble: VigenciaDelInventario | null;
}

/** Pendiente, o quién y cuándo. `integra: false` = la copia no es la firmada. */
export interface ResumenDeFirma {
  estado: 'PENDIENTE' | 'FIRMADO';
  firmadoPor: string | null;
  correo: string | null;
  firmadoEn: string | null;
  integra: boolean | null;
}

/** Lo que ve el inquilino en su portal: `GET /contracts/:id/inventario/firma`. */
export interface InventarioParaElInquilino {
  disponible: boolean;
  copia: { version: number; items: ItemDeVersion[]; completadoEn: string } | null;
  firma: ResumenDeFirma | null;
}
