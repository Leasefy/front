'use client';

import { useState, useEffect, useCallback } from 'react';
import { documentsApi, type DocumentItem } from '@/lib/api/documents.service';

/**
 * Hook to fetch documents for an application
 */
export function useApplicationDocuments(applicationId: string | undefined) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const docs = await documentsApi.getByApplication(applicationId);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents');
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, isLoading, error, refetch: fetch };
}

/**
 * Hook to fetch documents for a candidate (via their application)
 */
export function useCandidateDocuments(candidateId: string | undefined) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!candidateId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Prefer /documents/application/:id — more likely to include resolved URLs.
      // Fall back to the application-scoped endpoint on error.
      let docs: DocumentItem[];
      try {
        docs = await documentsApi.getByApplication(candidateId);
      } catch {
        docs = await documentsApi.getByCandidateApplication(candidateId);
      }
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading documents');
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { documents, isLoading, error, refetch: fetch };
}
