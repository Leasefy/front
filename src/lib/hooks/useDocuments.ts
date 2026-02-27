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
      const docs = await documentsApi.getByCandidateApplication(candidateId);
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
