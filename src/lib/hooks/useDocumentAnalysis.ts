'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { aiAnalysisApi } from '@/lib/api/ai-analysis.service';
import type { AnalysisResultsResponse } from '@/lib/api/ai-analysis.service';
import {
  leerFallo,
  mensajeDeUnFalloNuestro,
  mensajeParaLaPersona,
} from '@/lib/errores/traductor-de-errores';

const POLL_INTERVAL = 4000; // 4 seconds

/**
 * La frase de un fallo del análisis (02-10-2026, por el traductor). Antes se
 * guardaba el `err.message` crudo y la pantalla lo pintaba tal cual: un
 * «Internal error: …» o un «Unexpected token '<'…» en inglés.
 *
 *  · una respuesta HTTP va por `mensajeParaLaPersona`: «conexión» sólo si el
 *    pedido no salió, un 4xx dice qué está mal, un 5xx «de nuestro lado» con
 *    la referencia;
 *  · un error SIN status no vino de una respuesta (un JSON que no se pudo
 *    leer, un error de programación): su texto no es para nadie y es nuestro.
 *    Se decide con el status (`leerFallo`), nunca con el texto.
 */
function fraseDelFallo(err: unknown, accion: string, porDefecto: string): string {
  const fallo = leerFallo(err);
  if (fallo.tipo === 'desconocido') return mensajeDeUnFalloNuestro({ ...fallo, mensajes: [] }, accion);
  return mensajeParaLaPersona(err, { accion, porDefecto });
}

interface UseDocumentAnalysisReturn {
  /** Current analysis results (null if not yet fetched) */
  results: AnalysisResultsResponse | null;
  /** Whether analysis is currently in progress (polling) */
  isAnalyzing: boolean;
  /** Whether initial results are loading */
  isLoading: boolean;
  /** La frase del fallo, ya dicha por el traductor (nunca el `err.message` crudo). */
  error: string | null;
  /**
   * Lo que tiró la CARGA de los resultados (al montar o con `recargar`), tal
   * cual, para que la pantalla lo pinte con `FalloDeCarga`: status, `code`,
   * `campos` y `referencia` del sobre. Un 404 NO es un fallo (todavía no hay
   * análisis): queda en `null`.
   */
  falloAlCargar: unknown;
  /** Vuelve a cargar los resultados como al montar (el «Intentar de nuevo»). */
  recargar: () => Promise<void>;
  /** Trigger analysis for all documents */
  triggerAnalysis: () => Promise<void>;
  /** Fetch results once (no polling) */
  fetchResults: () => Promise<void>;
}

/**
 * Hook for AI document analysis with automatic polling.
 *
 * Usage:
 * 1. Call triggerAnalysis() to start background processing
 * 2. Hook automatically polls GET /ai/analysis/:applicationId every 4s
 * 3. Polling stops when all documents are completed or failed
 */
export function useDocumentAnalysis(applicationId: string): UseDocumentAnalysisReturn {
  const [results, setResults] = useState<AnalysisResultsResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [falloAlCargar, setFalloAlCargar] = useState<unknown>(null);
  // La carga vigente: una respuesta de una carga anterior (o de antes de
  // desmontar) no pisa lo que ya se pintó.
  const cargaVigente = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsAnalyzing(false);
  }, []);

  const fetchResults = useCallback(async () => {
    if (!applicationId) return;
    try {
      const data = await aiAnalysisApi.getResults(applicationId);
      setResults(data);
      setError(null);
      setFalloAlCargar(null);

      // Stop polling if all documents are done
      const { summary } = data;
      if (summary.total > 0 && summary.completed + summary.failed >= summary.total) {
        stopPolling();
      }
    } catch (err) {
      // 404 means no analysis exists yet — not an error
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        setResults(null);
        return;
      }
      setError(
        fraseDelFallo(
          err,
          'traer los resultados del análisis',
          'No pudimos traer los resultados del análisis. Prueba de nuevo en un momento.',
        ),
      );
    }
  }, [applicationId, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setIsAnalyzing(true);
    pollingRef.current = setInterval(fetchResults, POLL_INTERVAL);
  }, [fetchResults, stopPolling]);

  const triggerAnalysis = useCallback(async () => {
    if (!applicationId) return;
    setError(null);
    setIsAnalyzing(true);

    try {
      await aiAnalysisApi.triggerAnalysis(applicationId);
      // Fetch initial state immediately, then start polling
      await fetchResults();
      startPolling();
    } catch (err) {
      setIsAnalyzing(false);
      setError(
        fraseDelFallo(
          err,
          'iniciar el análisis de los documentos',
          'No pudimos iniciar el análisis. Prueba de nuevo en un momento.',
        ),
      );
      throw err;
    }
  }, [applicationId, fetchResults, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  /**
   * La carga de los resultados que ya existen (al montar y al reintentar).
   *
   * 02-10-2026 (Nico) · Antes, un fallo que no era 404 se tragaba en silencio:
   * la pantalla quedaba en «Inicia el análisis…» como si no hubiera nada, y
   * ofrecía analizar de nuevo unos documentos que quizá ya estaban analizados.
   * Ahora se guarda tal cual en `falloAlCargar` y la pantalla lo dice con
   * `FalloDeCarga` (el traductor), con «Intentar de nuevo» → `recargar`.
   */
  const cargar = useCallback(async () => {
    const esta = ++cargaVigente.current;
    setIsLoading(true);
    setFalloAlCargar(null);
    try {
      const data = await aiAnalysisApi.getResults(applicationId);
      if (esta !== cargaVigente.current) return;
      setResults(data);
      // If there are in-progress items, resume polling
      if (data.summary.processing > 0 || data.summary.pending > 0) {
        startPolling();
      }
    } catch (err) {
      if (esta !== cargaVigente.current) return;
      // 404 = no analysis yet, that's fine
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
        setResults(null);
        return;
      }
      setFalloAlCargar(err);
    } finally {
      if (esta === cargaVigente.current) setIsLoading(false);
    }
  }, [applicationId, startPolling]);

  // Fetch existing results on mount
  useEffect(() => {
    void cargar();
    // Al desmontar (o cambiar de postulación) la carga en vuelo deja de valer.
    return () => {
      cargaVigente.current += 1;
    };
  }, [cargar]);

  return {
    results,
    isAnalyzing,
    isLoading,
    error,
    falloAlCargar,
    recargar: cargar,
    triggerAnalysis,
    fetchResults,
  };
}
