/**
 * Documents API service
 * Endpoints for fetching, uploading, downloading, and deleting documents
 */

import { apiClient, getAccessToken } from './client';
import type { BackendDocumentFull, UploadDocumentDto } from './documents.types';
import type { BackendDocument } from './applications.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ============================================================================
// Mapper
// ============================================================================

export interface DocumentItem {
  id: string;
  type: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  verified: boolean;
  createdAt: string;
  applicationId?: string;
}

function mapDocument(bd: BackendDocumentFull | BackendDocument): DocumentItem {
  return {
    id: bd.id,
    type: bd.type ?? 'other',
    fileName: bd.fileName ?? 'documento',
    url: bd.url ?? '',
    mimeType: bd.mimeType ?? 'application/octet-stream',
    size: bd.size ?? 0,
    verified: 'verified' in bd ? !!bd.verified : false,
    createdAt: bd.createdAt,
    applicationId: bd.applicationId,
  };
}

// ============================================================================
// Service
// ============================================================================

export const documentsApi = {
  /** Get a document by ID */
  async getById(id: string): Promise<DocumentItem> {
    const bd = await apiClient.get<BackendDocumentFull>(`/documents/${id}`);
    return mapDocument(bd);
  },

  /** Get documents for an application */
  async getByApplication(applicationId: string): Promise<DocumentItem[]> {
    const docs = await apiClient.get<BackendDocument[]>(
      `/documents/application/${applicationId}`
    );
    return docs.map(mapDocument);
  },

  /** Get documents for a candidate (applicationId) via the application documents endpoint */
  async getByCandidateApplication(candidateId: string): Promise<DocumentItem[]> {
    // Backend: GET /applications/:applicationId/documents
    const docs = await apiClient.get<BackendDocument[]>(
      `/applications/${candidateId}/documents`
    );
    return docs.map(mapDocument);
  },

  /** Upload a general document (multipart) */
  async upload(dto: UploadDocumentDto): Promise<DocumentItem> {
    const token = getAccessToken();

    const formData = new FormData();
    formData.append('file', dto.file);
    formData.append('type', dto.type);
    if (dto.entityType) formData.append('entityType', dto.entityType);
    if (dto.entityId) formData.append('entityId', dto.entityId);

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND_URL}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed: ${res.status}`);
    }

    const bd: BackendDocumentFull = await res.json();
    return mapDocument(bd);
  },

  /** Delete a document */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  /** Get the download URL for a document */
  getDownloadUrl(doc: DocumentItem): string {
    // The URL from the backend is already a valid download URL (Supabase storage)
    return doc.url;
  },
};
