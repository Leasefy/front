/**
 * AI Document Analysis API service
 * Endpoints for triggering and polling AI document analysis
 */

import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export interface TriggerAnalysisResponse {
  message: string;
  applicationId: string;
  totalDocuments: number;
  documentIds: string[];
  status: 'PROCESSING';
}

export interface DocumentAnalysisResult {
  id: string;
  documentId: string;
  applicationId: string;
  documentType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  scoreFinal: number | null;
  nivelRiesgo: string | null;
  justificacion: string | null;
  recomendacion: string | null;
  confidence: number | null;
  extractedData: Record<string, unknown>;
  inconsistencies: string[];
  flags: string[];
  errorMessage: string | null;
  processingTimeMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisResultsResponse {
  applicationId: string;
  results: DocumentAnalysisResult[];
  crossValidation: {
    consistencyScore: number;
    inconsistencies: Array<{ field: string; message: string }>;
  } | null;
  summary: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    pending: number;
    averageScore: number | null;
  };
}

// ============================================================================
// Service
// ============================================================================

export const aiAnalysisApi = {
  /** Trigger AI analysis for all documents in an application (non-blocking) */
  async triggerAnalysis(applicationId: string): Promise<TriggerAnalysisResponse> {
    return apiClient.post<TriggerAnalysisResponse>(`/ai/analyze/${applicationId}`);
  },

  /** Get analysis results and progress for an application */
  async getResults(applicationId: string): Promise<AnalysisResultsResponse> {
    return apiClient.get<AnalysisResultsResponse>(`/ai/analysis/${applicationId}`);
  },

  /** Trigger analysis for a single document (blocking — waits for completion) */
  async triggerDocumentAnalysis(documentId: string): Promise<{ message: string; documentId: string }> {
    return apiClient.post<{ message: string; documentId: string }>(`/ai/analyze/document/${documentId}`);
  },

  /** Get analysis result for a single document */
  async getDocumentResult(documentId: string): Promise<DocumentAnalysisResult> {
    return apiClient.get<DocumentAnalysisResult>(`/ai/analysis/document/${documentId}`);
  },
};
