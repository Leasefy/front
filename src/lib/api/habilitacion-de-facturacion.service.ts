import { apiClient } from './client';
import { enviarFormulario } from './consignacion-firma.service';

/** Activa tu facturación electrónica con Feel (Nico, 28-10-2026). Back: `/inmobiliaria/facturacion/habilitacion`. */
export type ClaveDelPaso = 'antes' | 'rut' | 'alta' | 'registro' | 'proveedor' | 'pruebas' | 'numeracion' | 'resolucion' | 'asociar';
export type EstadoDelPaso = 'hecho' | 'te-toca' | 'esperando' | 'despues' | 'no-aplica';

export interface VistaDeLaHabilitacion {
  disponible: boolean;
  motivo: string | null;
  elegible: boolean;
  termino: boolean;
  pasos: { clave: ClaveDelPaso; estado: EstadoDelPaso; quien: 'tu' | 'feel' | 'leasefy'; hechoAt: string | null; seMarca: boolean }[];
  siguiente: ClaveDelPaso | null;
  avance: { hechos: number; total: number };
  yaFacturaConOtro: boolean;
  tipoDePersona: 'EMPRESA' | 'PERSONA';
  rut: { subido: boolean; subidoAt: string | null; altaPedidaAt: string | null; avisoAFeel: string | null };
  testSetId: { valor: string | null; guardadoAt: string | null; avisoAFeel: string | null };
  prefijos: { tipo: string; nombre: string; prefijo: string; desde: number; hasta: number; yaLaTiene: boolean }[];
  proveedor: { empresa: string; razonSocialCompleta: string; nit: string; software: string };
  enlaces: { habilitacion: string; facturando: string; muisca: string; instructivo: string };
  inmobiliaria: { nombre: string; nit: string | null };
  tarjeta: { mostrar: boolean };
}

const BASE = '/inmobiliaria/facturacion/habilitacion';

export const habilitacionApi = {
  vista: () => apiClient.get<VistaDeLaHabilitacion>(BASE),
  contarDeLaInmobiliaria: (cambios: { yaFacturaConOtro?: boolean; tipoDePersona?: 'EMPRESA' | 'PERSONA' }) =>
    apiClient.patch<VistaDeLaHabilitacion>(BASE, cambios),
  subirRut(archivo: File): Promise<VistaDeLaHabilitacion> {
    const f = new FormData();
    f.append('archivo', archivo);
    return enviarFormulario<VistaDeLaHabilitacion>(`${BASE}/rut`, f, 'No pudimos subir tu RUT');
  },
  testSetId: (testSetId: string) => apiClient.post<VistaDeLaHabilitacion>(`${BASE}/test-set-id`, { testSetId }),
  marcar: (clave: ClaveDelPaso, hecho: boolean) => apiClient.post<VistaDeLaHabilitacion>(`${BASE}/pasos/${clave}`, { hecho }),
  cerrarTarjeta: () => apiClient.post<{ cerrada: true }>(`${BASE}/tarjeta/cerrar`, {}),
};
