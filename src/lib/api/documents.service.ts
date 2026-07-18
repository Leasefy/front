/**
 * Documents API service
 * Endpoints for fetching, uploading, downloading, and deleting documents
 */

import { apiClient, getAccessToken, ApiError } from './client';
import type {
  BackendDocumentFull,
  UploadDocumentDto,
  DocumentSignedUrl,
  DocumentConsent,
} from './documents.types';
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
  // BackendDocument uses `originalName` as canonical; BackendDocumentFull uses `fileName`
  const name = ('originalName' in bd ? bd.originalName : undefined) ?? bd.fileName ?? 'documento';
  return {
    id: bd.id,
    type: bd.type ?? 'other',
    fileName: name,
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

  /**
   * GET /documents/:id/signed-url — short-lived, ownership-checked URL to the
   * document's bytes. Returns `{ url, expiresAt }` ({@link DocumentSignedUrl}),
   * modeled 1:1 on `contractsApi.getSignedPdfUrl` ({@link file://src/lib/api/contracts.service.ts}:214).
   *
   * This is the anti-IDOR download path: the **backend** mints the URL, verifies
   * the caller owns the document, and stamps `expiresAt`. The frontend can neither
   * sign nor ownership-check — so if this endpoint is missing/blocked this throws
   * (an `ApiError`); it never fabricates a fake signed URL. Callers on
   * tenant-reachable paths must consume this instead of `getDownloadUrl`.
   */
  async getSignedUrl(docId: string): Promise<DocumentSignedUrl> {
    return apiClient.get<DocumentSignedUrl>(`/documents/${docId}/signed-url`);
  },

  /**
   * @deprecated Returns the **raw persistent Supabase URL** (`DocumentItem.url`)
   * with **no expiry and no server-side ownership check** — an IDOR-shaped
   * exposure: anyone who obtains the URL can read the bytes indefinitely, and the
   * URL is guessable/enumerable to the extent the backend's storage path is.
   *
   * This is the disclosed DOCU-04 backend gap: FULL IDOR closure requires the
   * backend to sign `/documents/:id` (see `getSignedUrl`); the frontend alone
   * CANNOT satisfy "sin IDOR". Kept only for back-compat with non-tenant callers.
   * Any caller on a tenant-reachable path MUST migrate to `getSignedUrl`.
   */
  getDownloadUrl(doc: DocumentItem): string {
    // The URL from the backend is already a valid download URL (Supabase storage)
    return doc.url;
  },

  /**
   * POST /documents/:id/consent — records the tenant's per-purpose Ley 1581
   * consent ({@link DocumentConsent}) for SIC audit.
   *
   * Best-effort: the authoritative, SIC-audit consent store is **backend-owned**.
   * If the endpoint is absent (404) or forbidden (403) this degrades to a resolved
   * no-op rather than blocking the flow — the real, enforcing gate is the
   * unchecked-default consent UI (v7-02-03), which won't let the user proceed
   * without ticking `purposeDocAccess`. Any other error is re-thrown so genuine
   * failures are not swallowed.
   */
  async recordConsent(docId: string, consent: DocumentConsent): Promise<void> {
    try {
      await apiClient.post<void>(`/documents/${docId}/consent`, consent);
    } catch (err) {
      // Missing/blocked endpoint → silent no-op (persistence is a disclosed
      // backend dependency). Surface everything else.
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        return;
      }
      throw err;
    }
  },
};
