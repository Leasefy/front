import { apiClient } from './client';

/**
 * 🔴 LAS CLÁUSULAS PROPIAS DE LA INMOBILIARIA (Nico, 18-09-2026).
 *
 * «La inmobiliaria puede agregar cláusulas propias (pasan por el validador que
 * ya existe); el texto legal base no se edita».
 *
 * El back quedó construido el 18-09 y sin pantalla: se podían guardar cláusulas
 * por API y ninguna inmobiliaria tenía cómo escribir una.
 *
 * 🔴 EL VALIDADOR ES EL MISMO que revisa los contratos generados con IA. No hay
 * una regla «para lo que escribe la inmobiliaria» y otra «para lo que propone el
 * modelo»: una cláusula ilegal no es más legal por haberla tecleado una persona.
 */

/** Por qué el validador rechaza algo. `norma` es lo que va a mirar un abogado. */
export interface MotivoDeRechazo {
  /** Llave estable, para el front. */
  codigo: string;
  /** Qué parte lo provocó: `titulo`, `cuerpo`… */
  donde: string;
  /** En español, para leer. */
  mensaje: string;
  /** La norma citada. */
  norma: string;
}

/** Las plantillas a las que una cláusula se puede pegar. */
export type PlantillaLegal = 'CONTRATO_VIVIENDA' | 'CONTRATO_COMERCIAL';

export interface ClausulaPropia {
  id: string;
  codigo: string;
  titulo: string;
  /** Una línea, para la pantalla. */
  resumen: string;
  aplicaA: string[];
  cuerpo: string;
  activa: boolean;
  /** Cuándo pasó el validador. */
  validadaAt: string;
  createdAt: string;
}

export interface GuardarClausulaPropia {
  titulo: string;
  resumen: string;
  aplicaA: PlantillaLegal[];
  cuerpo: string;
}

const BASE = '/inmobiliaria/contratos/clausulas-propias';

export const clausulasPropiasApi = {
  listar(): Promise<ClausulaPropia[]> {
    return apiClient.get<ClausulaPropia[]>(BASE);
  },

  /**
   * 🔴 Revisa SIN guardar. Es lo que deja a la persona ver qué está mal —y con
   * qué norma— antes de darle a guardar, en vez de recibir un 400 después de
   * escribir un texto largo.
   */
  revisar(datos: GuardarClausulaPropia): Promise<{ ok: boolean; motivos: MotivoDeRechazo[] }> {
    return apiClient.post<{ ok: boolean; motivos: MotivoDeRechazo[] }>(
      `${BASE}/revisar`,
      datos,
    );
  },

  crear(datos: GuardarClausulaPropia): Promise<ClausulaPropia> {
    return apiClient.post<ClausulaPropia>(BASE, datos);
  },

  actualizar(
    id: string,
    datos: Partial<GuardarClausulaPropia> & { activa?: boolean },
  ): Promise<ClausulaPropia> {
    return apiClient.patch<ClausulaPropia>(`${BASE}/${id}`, datos);
  },

  eliminar(id: string): Promise<void> {
    return apiClient.delete<void>(`${BASE}/${id}`);
  },
};
