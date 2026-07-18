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

/**
 * Hook for document upload operations
 */
export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, type: string, entityType?: string, entityId?: string) => {
    setIsUploading(true);
    setError(null);
    try {
      const doc = await documentsApi.upload({ file, type, entityType, entityId });
      return doc;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
}

/**
 * Hook for document deletion
 */
export function useDocumentDelete() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDoc = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);
    try {
      await documentsApi.delete(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  return { deleteDoc, isDeleting, error };
}

// ============================================================================
// useSignedDocUrl - load the signed URL for GET /documents/:id/signed-url
// ============================================================================

/**
 * Carga la signed URL de un documento vía GET /documents/:id/signed-url —
 * `{ url, expiresAt }` de corta duración, verificada por el backend (anti-IDOR).
 *
 * Clonado 1:1 de `useSignedPdfUrl` ({@link file://src/lib/hooks/useContracts.ts}:182)
 * y consume `documentsApi.getSignedUrl`.
 *
 * Usá `enabled` para pedir la signed URL solo al abrir/descargar (no para cada card
 * en el mount): el gate evita firmar N URLs que el usuario nunca va a usar.
 */
export function useSignedDocUrl(
  docId: string | null | undefined,
  { enabled }: { enabled: boolean }
) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!docId || !enabled) {
      setUrl(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await documentsApi.getSignedUrl(docId);
      setUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el documento');
      setUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [docId, enabled]);

  useEffect(() => { load(); }, [load]);

  return { url, isLoading, error, refetch: load };
}
