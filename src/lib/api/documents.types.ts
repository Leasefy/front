/**
 * Backend document API types
 * Reflects the exact shape of NestJS responses for /documents
 */

export interface BackendDocumentFull {
  id: string;
  applicationId?: string;
  type: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  entityType?: string;
  entityId?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedNotes?: string;
  createdAt: string;
}

export interface UploadDocumentDto {
  file: File;
  type: string;
  entityType?: string;
  entityId?: string;
}
