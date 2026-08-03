'use client'

import { useState } from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { ArrowRight, File as FileIcon, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { sha256Hex, uploadPdfToPresignedUrl } from '@/lib/onboarding/habeas-data-upload'
import type {
  OnboardingSessionHabeasDataConfirmRequest,
  OnboardingSessionHabeasDataConfirmResponse,
  OnboardingSessionHabeasDataPresignRequest,
  OnboardingSessionHabeasDataPresignResponse,
} from '@/lib/api/generated/agency'
import {
  HABEAS_DATA_MAX_FILE_SIZE_BYTES,
  HABEAS_DATA_STEP_DEFAULT_VALUES,
  habeasDataStepSchema,
  toHabeasDataConfirmRequest,
  toHabeasDataPresignRequest,
  type HabeasDataStepFormValues,
} from './habeas-data-step-schema'

export interface HabeasDataStepFormProps {
  isSubmitting: boolean
  presignHabeasData: (
    body: OnboardingSessionHabeasDataPresignRequest,
  ) => Promise<OnboardingSessionHabeasDataPresignResponse | null>
  confirmHabeasData: (
    body: OnboardingSessionHabeasDataConfirmRequest,
  ) => Promise<OnboardingSessionHabeasDataConfirmResponse | null>
  /**
   * Session-level `error.kind === 'validation'` message from the hook (same
   * contract as the other step forms). Covers `presignHabeasData` and
   * `confirmHabeasData` failures — the S3 upload failure has its own local
   * banner (`habeas-data-upload-error`) since it never touches the hook.
   */
  submitError?: string | null
}

/** Local orchestration stage — covers the gap `isSubmitting` doesn't see (hashing + the S3 PUT itself). */
type Stage = 'idle' | 'hashing' | 'presigning' | 'uploading' | 'confirming'

const STAGE_LABEL: Record<Exclude<Stage, 'idle'>, string> = {
  hashing: 'Procesando documento...',
  presigning: 'Preparando la subida...',
  uploading: 'Subiendo documento...',
  confirming: 'Confirmando...',
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-danger">{message}</p>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Form for the wizard's `habeas_data` step — the user uploads an
 * already-signed PDF (the agent generates nothing). Submit orchestrates 3
 * agent-facing stages in order: presign → S3 PUT (direct, no agent
 * involvement) → confirm. Each stage fails independently:
 *  - presign / confirm failures surface via the hook's session-level error
 *    (`submitError`, same contract as every other step) — this component
 *    just stops and lets the parent render `OnboardingSessionErrorBanner`.
 *  - the S3 PUT failure is local (not an `OnboardingSessionError`) and gets
 *    its own banner since the hook never sees it.
 */
export function HabeasDataStepForm({
  isSubmitting,
  presignHabeasData,
  confirmHabeasData,
  submitError,
}: HabeasDataStepFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<HabeasDataStepFormValues>({ defaultValues: HABEAS_DATA_STEP_DEFAULT_VALUES })

  const [stage, setStage] = useState<Stage>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const isBusy = isSubmitting || stage !== 'idle'

  const submit = handleSubmit(async (values) => {
    const parsed = habeasDataStepSchema.safeParse(values)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        setError(issue.path.join('.') as FieldPath<HabeasDataStepFormValues>, { message: issue.message })
      }
      return
    }

    setUploadError(null)

    setStage('hashing')
    let sha256: string
    try {
      sha256 = await sha256Hex(parsed.data.file)
    } catch {
      setUploadError('No pudimos procesar el documento. Intenta con otro archivo.')
      setStage('idle')
      return
    }

    setStage('presigning')
    const presign = await presignHabeasData(toHabeasDataPresignRequest(parsed.data))
    if (!presign) {
      setStage('idle')
      return
    }

    setStage('uploading')
    try {
      await uploadPdfToPresignedUrl(presign.presignedUrl, parsed.data.file)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No pudimos subir el documento.')
      setStage('idle')
      return
    }

    setStage('confirming')
    await confirmHabeasData(toHabeasDataConfirmRequest(parsed.data, presign.s3Key, sha256))
    setStage('idle')
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-5" data-testid="habeas-data-step-form">
      <p className="text-body-sm text-fg-muted">
        Sube el documento de habeas data firmado en formato PDF (máx. 10MB).
      </p>

      <Controller
        control={control}
        name="file"
        render={({ field }) => (
          <div>
            <label htmlFor="habeas-data-file" className="block text-sm font-medium text-fg mb-2">
              Documento firmado <span className="text-danger">*</span>
            </label>

            {field.value ? (
              <div className="flex items-center gap-3 p-3 bg-surface-muted border border-border rounded-md">
                <FileIcon className="w-5 h-5 text-fg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{field.value.name}</p>
                  <p className="text-caption text-fg-muted">{formatFileSize(field.value.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  hideArrow
                  disabled={isBusy}
                  onClick={() => field.onChange(null)}
                  data-testid="habeas-data-file-remove"
                >
                  Cambiar
                </Button>
              </div>
            ) : null}

            <input
              id="habeas-data-file"
              data-testid="habeas-data-file-input"
              type="file"
              accept="application/pdf"
              disabled={isBusy}
              className={field.value ? 'sr-only' : 'block w-full text-sm text-fg'}
              onChange={(e) => field.onChange(e.target.files?.[0] ?? null)}
            />

            <FieldError message={errors.file?.message as string | undefined} />
          </div>
        )}
      />

      <div>
        <label htmlFor="signedByFullName" className="block text-sm font-medium text-fg mb-2">
          Nombre completo del firmante <span className="text-danger">*</span>
        </label>
        <Input
          id="signedByFullName"
          type="text"
          autoComplete="name"
          {...register('signedByFullName')}
        />
        <FieldError message={errors.signedByFullName?.message} />
      </div>

      <div>
        <label htmlFor="signedByCedula" className="block text-sm font-medium text-fg mb-2">
          Cédula del firmante <span className="text-danger">*</span>
        </label>
        <Input
          id="signedByCedula"
          type="text"
          inputMode="numeric"
          className="font-mono tabular-nums"
          {...register('signedByCedula')}
        />
        <FieldError message={errors.signedByCedula?.message} />
      </div>

      {uploadError && (
        <div
          data-testid="habeas-data-upload-error"
          className="rounded-md bg-danger-soft border border-border p-3 flex items-start gap-2"
        >
          <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{uploadError}</p>
        </div>
      )}

      {submitError && (
        <div
          data-testid="habeas-data-step-form-error"
          className="rounded-md bg-danger-soft border border-border p-3"
        >
          <p className="text-sm text-danger">{submitError}</p>
        </div>
      )}

      <Button type="submit" disabled={isBusy} hideArrow size="lg" className="w-full">
        {isBusy ? (
          <>
            <Spinner size="xs" variant="current" />
            {stage !== 'idle' ? STAGE_LABEL[stage] : 'Guardando...'}
          </>
        ) : (
          <>
            Continuar
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  )
}
