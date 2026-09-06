import { apiClient } from './client';

/**
 * Plantillas de mensaje de la inmobiliaria.
 *
 * Son texto guardado que el agente inserta en el compositor y puede editar
 * ANTES de mandar: no se envía nada solo. Cada una puede traer variables entre
 * llaves dobles que se reemplazan con lo que ya sabe la conversación abierta.
 *
 * 🔴 Las variables se resuelven en el FRONT, no en el back: el back no sabe qué
 * conversación tenés abierta ni con qué datos se está pintando. Una variable
 * que no se puede resolver se deja tal cual y se avisa en pantalla — nunca se
 * manda un «Hola undefined».
 */

const BASE = '/inmobiliaria/plantillas-de-mensaje';

export interface PlantillaDeMensaje {
  id: string;
  titulo: string;
  cuerpo: string;
  /** Ascendente. Empata por título para que el orden sea estable. */
  orden: number;
}

export interface NuevaPlantilla {
  titulo: string;
  cuerpo: string;
  orden?: number;
}

/** Las variables que el compositor sabe reemplazar. */
export const VARIABLES_DE_PLANTILLA = [
  'nombre',
  'inmobiliaria',
  'inmueble',
  'saldo',
  'mes',
] as const;

export type VariableDePlantilla = (typeof VARIABLES_DE_PLANTILLA)[number];

export const plantillasDeMensajeApi = {
  listar() {
    return apiClient.get<{ plantillas: PlantillaDeMensaje[] }>(BASE);
  },

  crear(dto: NuevaPlantilla) {
    return apiClient.post<PlantillaDeMensaje>(BASE, dto);
  },

  actualizar(id: string, dto: Partial<NuevaPlantilla>) {
    return apiClient.patch<PlantillaDeMensaje>(`${BASE}/${id}`, dto);
  },

  eliminar(id: string) {
    return apiClient.delete<void>(`${BASE}/${id}`);
  },

  /**
   * Instala el catálogo sugerido. Es EXPLÍCITO —un botón— y no algo que pasa
   * solo la primera vez que se abre la pantalla: sembrar en silencio deja a la
   * inmobiliaria con textos que no escribió y no sabe de dónde salieron.
   * Idempotente: saltea los títulos que ya existen.
   */
  instalarSugeridas() {
    return apiClient.post<{ creadas: number; plantillas: PlantillaDeMensaje[] }>(
      `${BASE}/sugeridas`,
      {},
    );
  },
};

/**
 * Reemplaza las variables con lo que hay. Devuelve además cuáles quedaron sin
 * resolver, para poder decirlo en vez de mandar un hueco.
 */
export function resolverPlantilla(
  cuerpo: string,
  datos: Partial<Record<VariableDePlantilla, string>>,
): { texto: string; sinResolver: string[] } {
  const sinResolver: string[] = [];
  const texto = cuerpo.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (crudo, nombre: string) => {
    const valor = datos[nombre as VariableDePlantilla];
    if (valor === undefined || valor === '') {
      if (!sinResolver.includes(nombre)) sinResolver.push(nombre);
      return crudo;
    }
    return valor;
  });
  return { texto, sinResolver };
}
