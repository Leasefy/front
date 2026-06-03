/**
 * Avalúo API service
 *
 * Typed client for the avalúo backend micro-service.
 * All functions are independent exports — no class wrapper — so tree-shaking
 * works correctly in Next.js App Router.
 *
 * Base URL: NEXT_PUBLIC_AVALUO_URL env variable.
 * Photos go directly to S3 via presigned URL — no auth header on the S3 PUT.
 */

import type {
  AvaluoFormData,
  AvaluoStatusResponse,
  IntakeResponse,
  PhotoPresignResponse,
} from "@/lib/types/avaluo";

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

const AVALUO_URL = process.env.NEXT_PUBLIC_AVALUO_URL;

// ---------------------------------------------------------------------------
// photoPresign — request a presigned S3 upload URL
// ---------------------------------------------------------------------------

/**
 * Requests a presigned upload URL for a single photo.
 *
 * @param filename    Original file name (used to derive the S3 key prefix)
 * @param contentType MIME type of the file (e.g. "image/jpeg")
 * @returns           { key, uploadUrl } — PUT the file to `uploadUrl`, keep `key` for the intake
 */
export async function photoPresign(
  filename: string,
  contentType: string
): Promise<PhotoPresignResponse> {
  const res = await fetch(`${AVALUO_URL}/api/avaluo/photo-presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });

  if (!res.ok) {
    throw new Error(`presign_failed:${res.status}`);
  }

  return res.json() as Promise<PhotoPresignResponse>;
}

// ---------------------------------------------------------------------------
// uploadPhotoToS3 — full photo upload (presign + PUT to S3)
// ---------------------------------------------------------------------------

/**
 * Uploads a File directly to S3 via presigned URL.
 *
 * The two-step flow:
 *   1. Calls `photoPresign` to get a one-time presigned PUT URL
 *   2. PUTs the raw file bytes to that URL
 *
 * CRITICAL: the `Content-Type` header on the S3 PUT MUST match the MIME type
 * that was sent to `photoPresign`. Mismatch causes S3 to return 403 because
 * the presigned URL embeds a content-type policy.
 *
 * No auth headers on the S3 PUT — AWS validates via the signed URL only.
 *
 * @param file  Browser File object selected by the user
 * @returns     The S3 object key to include in `AvaluoFormData.photoKeys`
 */
export async function uploadPhotoToS3(file: File): Promise<string> {
  const { key, uploadUrl } = await photoPresign(file.name, file.type);

  const s3Res = await fetch(uploadUrl, {
    method: "PUT",
    // Must match the content-type used to generate the presigned URL.
    // No Authorization / x-amz-* headers — signed URL is self-contained.
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!s3Res.ok) {
    throw new Error(`s3_upload_failed:${s3Res.status}`);
  }

  return key;
}

// ---------------------------------------------------------------------------
// submitIntake — POST the completed multi-step form
// ---------------------------------------------------------------------------

/**
 * Submits the completed avalúo intake form to the backend.
 *
 * Error mapping (thrown as Error with a machine-readable message):
 *   - 429 → "rate_limit"
 *   - 422 → "validation_error"
 *   - 503 → "service_unavailable"
 *   - 201 → returns { id }
 *
 * Callers should catch and map these to user-facing messages via Sonner toast.
 *
 * @param formData  Completed AvaluoFormData (all three steps filled)
 * @returns         { id } — the server-assigned submission identifier
 */
export async function submitIntake(
  formData: AvaluoFormData
): Promise<IntakeResponse> {
  const res = await fetch(`${AVALUO_URL}/api/avaluo/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  if (res.status === 429) throw new Error("rate_limit");
  if (res.status === 422) throw new Error("validation_error");
  if (res.status === 503) throw new Error("service_unavailable");

  if (res.status !== 201) {
    throw new Error(`intake_failed:${res.status}`);
  }

  return res.json() as Promise<IntakeResponse>;
}

// ---------------------------------------------------------------------------
// getAvaluoStatus — poll submission status
// ---------------------------------------------------------------------------

/**
 * Returns the current status for a submitted avalúo request.
 *
 * The backend status endpoint is not yet implemented in v1 of the service.
 * This function attempts a real fetch and falls back to a safe mock response
 * so UI components can render without crashing during development.
 *
 * TODO: replace mock fallback when backend exposes status endpoint
 *
 * @param submissionId  The `id` returned by `submitIntake`
 * @returns             Current status + optional slug / downloadUrl
 */
export async function getAvaluoStatus(
  submissionId: string
): Promise<AvaluoStatusResponse> {
  try {
    const res = await fetch(
      `${AVALUO_URL}/api/avaluo/${submissionId}/status`,
      { cache: "no-store" }
    );

    if (res.ok) {
      return res.json() as Promise<AvaluoStatusResponse>;
    }
  } catch {
    // Network error or backend not reachable — fall through to mock
  }

  // TODO: replace mock fallback when backend exposes status endpoint
  return { status: "en_revisión" };
}
