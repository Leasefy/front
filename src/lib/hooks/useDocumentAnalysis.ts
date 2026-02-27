'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { aiAnalysisApi } from '@/lib/api/ai-analysis.service';
import type { AnalysisResultsResponse } from '@/lib/api/ai-analysis.service';

const POLL_INTERVAL = 4000; // 4 seconds

interface UseDocumentAnalysisReturn {
  /** Current analysis results (null if not yet fetched) */
  results: AnalysisResultsResponse | null;
  /** Whether analysis is currently in progress (polling) */
  isAnalyzing: boolean;
  /** Whether initial results are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
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
      setError(err instanceof Error ? err.message : 'Error al obtener resultados');
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
      const message = err instanceof Error ? err.message : 'Error al iniciar análisis';
      setError(message);
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

  // Fetch existing results on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    aiAnalysisApi.getResults(applicationId)
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        // If there are in-progress items, resume polling
        if (data.summary.processing > 0 || data.summary.pending > 0) {
          startPolling();
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = no analysis yet, that's fine
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
          setResults(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [applicationId, startPolling]);

  return { results, isAnalyzing, isLoading, error, triggerAnalysis, fetchResults };
}
