/**
 * Medios de pago de la inmobiliaria — el contrato de `/inmobiliaria/medios-de-pago`.
 */

export type TipoDeMedioDePago =
  | 'TRANSFERENCIA'
  | 'EFECTIVO'
  | 'PSE'
  | 'NEQUI'
  | 'DAVIPLATA'
  | 'ENLACE_DE_PAGO'
  | 'OTRO';

export type TipoDeCuenta = 'AHORROS' | 'CORRIENTE';

export interface MedioDePago {
  id: string;
  agencyId: string;
  tipo: TipoDeMedioDePago;
  nombre: string;
  instrucciones: string | null;
  banco: string | null;
  tipoDeCuenta: string | null;
  numeroDeCuenta: string | null;
  titular: string | null;
  documentoTitular: string | null;
  enlace: string | null;
  visibleAlInquilino: boolean;
  activo: boolean;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

/** Lo que se manda al crear. Los textos vacíos viajan como `null`. */
export interface NuevoMedioDePago {
  tipo: TipoDeMedioDePago;
  nombre: string;
  instrucciones?: string | null;
  banco?: string | null;
  tipoDeCuenta?: TipoDeCuenta | null;
  numeroDeCuenta?: string | null;
  titular?: string | null;
  documentoTitular?: string | null;
  enlace?: string | null;
  visibleAlInquilino?: boolean;
  activo?: boolean;
  orden?: number;
}

export type CambiosDeMedioDePago = Partial<NuevoMedioDePago>;

export interface TipoDelCatalogo {
  tipo: TipoDeMedioDePago;
  nombre: string;
}

/** Lo que ve el inquilino: sin número completo ni documento del titular. */
export interface MedioDePagoParaInquilino {
  id: string;
  tipo: TipoDeMedioDePago;
  tipoLegible: string;
  nombre: string;
  instrucciones: string | null;
  banco: string | null;
  tipoDeCuenta: string | null;
  numeroDeCuentaEnmascarado: string | null;
  titular: string | null;
  enlace: string | null;
}

export interface MediosDeUnaInmobiliariaParaInquilino {
  agencyId: string;
  agencyName: string;
  leaseIds: string[];
  medios: MedioDePagoParaInquilino[];
}
