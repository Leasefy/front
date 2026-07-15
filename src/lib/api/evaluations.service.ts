/**
 * Evaluations API service.
 *
 * Thin helpers over the main backend `evaluations` module. The scoring run/poll
 * lifecycle lives in `use-agent.ts`; this file covers the post-completion
 * artifacts (the official certificate PDF).
 */

import { apiClient } from './client';

/**
 * Fetches the official scoring certificate PDF for a COMPLETED evaluation.
 * Backend returns 400 if the evaluation is not yet completed.
 */
export async function getEvaluationCertificate(applicationId: string): Promise<Blob> {
  return apiClient.getBlob(`/evaluations/${applicationId}/certificate.pdf`);
}

/**
 * Fetches the certificate PDF and triggers a browser download.
 * Browser-only: relies on `URL.createObjectURL` + a transient anchor.
 */
export async function downloadEvaluationCertificate(applicationId: string): Promise<void> {
  const blob = await getEvaluationCertificate(applicationId);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `certificado-scoring-${applicationId}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface SendCertificateResponse {
  success: boolean;
  sentTo: string;
  messageId: string;
}

/**
 * Emails the scoring certificate PDF to a recipient.
 *
 * NOTE (pending feature): `recipientEmail` must be the PROPERTY OWNER's email,
 * NOT the agency's. Auto-resolving the owner email from the property is not built
 * yet, so the caller passes the address manually for now. When owner-email
 * resolution exists, prefill it instead of asking the user to type it.
 *
 * Backend: 400 if not COMPLETED · 403 if not the landlord · 404 not found ·
 * 503 if the email send failed.
 */
export async function sendCertificateToOwner(
  applicationId: string,
  recipientEmail: string,
  recipientName?: string,
): Promise<SendCertificateResponse> {
  return apiClient.post<SendCertificateResponse>(
    `/evaluations/${applicationId}/send-to-owner`,
    { recipientEmail, ...(recipientName ? { recipientName } : {}) },
  );
}
