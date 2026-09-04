'use client';

/**
 * Los datos de la pantalla de Documentos.
 *
 * Vive acá y no en `useInmobiliaria.ts` porque los tipos de aquel
 * (`PropertyDocument`, `DocumentTemplate`) no son lo que el backend responde:
 * describían un shape con `propertyTitle`, `category` en minúscula y
 * `usageCount` que nunca existió en `AgencyDocument`. Este hook devuelve las
 * filas tal como llegan.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  documentosLegalesApi,
  type DocumentoGenerado,
  type PlantillaDeLaAgencia,
} from '@/lib/api/documentos.service';

export interface DatosDeDocumentos {
  documentos: DocumentoGenerado[];
  plantillas: PlantillaDeLaAgencia[];
  cargando: boolean;
  /** El error entero: `FalloDeCarga` necesita el status, no el texto. */
  error: unknown;
  recargar: () => Promise<void>;
  /** Mete el documento recién generado sin esperar a la relectura. */
  agregar: (documento: DocumentoGenerado) => void;
}

export function useDocumentosLegales(): DatosDeDocumentos {
  const [documentos, setDocumentos] = useState<DocumentoGenerado[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaDeLaAgencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // En paralelo: son dos pestañas de la misma pantalla y no dependen entre
      // sí. `GET /templates` además siembra las plantillas legales del sistema.
      const [docs, plants] = await Promise.all([
        documentosLegalesApi.documentos(),
        documentosLegalesApi.plantillas(),
      ]);
      setDocumentos(docs);
      setPlantillas(plants);
    } catch (e: unknown) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const agregar = useCallback((documento: DocumentoGenerado) => {
    setDocumentos((previos) => [documento, ...previos.filter((d) => d.id !== documento.id)]);
  }, []);

  return { documentos, plantillas, cargando, error, recargar, agregar };
}
