'use client'

import { useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { ImageSquare, X, WarningCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAvaluo } from './AvaluoContext'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_ACCEPT = 'image/jpeg,image/png,image/webp'

// ---------------------------------------------------------------------------
// StepFotos — Step 3
// ---------------------------------------------------------------------------

/**
 * Step 3: Photo collection (staging only — no upload here).
 *
 * Photos are STAGED as File objects in formData.pendingPhotoFiles.
 * The actual upload to S3 happens in AvaluoContext.submitAvaluo() AFTER
 * submitIntake() returns the {id, token} needed for the presign endpoint.
 *
 * This reorder (intake first, photos after) is required by the micro contract:
 * photo-presign requires submissionId + capability token.
 *
 * Photos are optional — this step is always valid.
 */
export function StepFotos() {
  const { formData, updateFormData } = useAvaluo()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const pendingFiles = formData.pendingPhotoFiles ?? []
  const totalCount = pendingFiles.length
  const isFull = totalCount >= MAX_PHOTOS

  // ──────────────────────────────────────────────────────────────────────────
  // Stage a single file (validation only — no S3 call here)
  // ──────────────────────────────────────────────────────────────────────────

  const stageFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Solo se aceptan imágenes JPG, PNG o WebP.')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Cada imagen debe pesar menos de 10 MB.')
        return
      }

      updateFormData({
        pendingPhotoFiles: [...pendingFiles, file],
      })
    },
    [pendingFiles, updateFormData]
  )

  // ──────────────────────────────────────────────────────────────────────────
  // Process a FileList / File[]
  // ──────────────────────────────────────────────────────────────────────────

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const remaining = MAX_PHOTOS - totalCount

      if (remaining <= 0) {
        toast.error('Ya alcanzaste el máximo de fotos permitidas.')
        return
      }

      fileArray.slice(0, remaining).forEach((file) => {
        stageFile(file)
      })
    },
    [totalCount, stageFile]
  )

  // ──────────────────────────────────────────────────────────────────────────
  // Event handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Remove a staged file
  // ──────────────────────────────────────────────────────────────────────────

  const removeFile = (index: number) => {
    updateFormData({
      pendingPhotoFiles: pendingFiles.filter((_, i) => i !== index),
    })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">
          Fotos del inmueble{' '}
          <span className="text-fg-muted font-normal">(opcional)</span>
        </h3>
        <p className="text-sm text-fg-muted">
          Las fotos ayudan al avaluador a contextualizar el inmueble. Podés
          continuar sin ellas — se subirán al enviar el formulario.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_ACCEPT}
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Drop zone */}
      <button
        type="button"
        onClick={() => !isFull && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isFull}
        className={cn(
          'w-full border-2 border-dashed rounded-[20px] p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isFull
            ? 'border-border bg-surface-muted cursor-not-allowed'
            : isDragOver
            ? 'border-primary bg-primary-soft'
            : 'border-border hover:border-border-strong hover:bg-surface-hover'
        )}
      >
        <ImageSquare className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
        <p className="text-sm font-medium text-fg">
          {isFull
            ? 'Máximo de fotos alcanzado'
            : isDragOver
            ? 'Soltá las fotos aquí'
            : 'Hacé clic o arrastrá fotos aquí'}
        </p>
        <p className="text-xs text-fg-subtle mt-1">
          <span className="font-mono tabular-nums">{totalCount}/{MAX_PHOTOS}</span> fotos · JPG, PNG o WebP · Máx 10 MB c/u
        </p>
      </button>

      {/* Staged files list */}
      {pendingFiles.length > 0 && (
        <ul className="space-y-2" aria-label="Fotos seleccionadas">
          {pendingFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border"
            >
              <ImageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground truncate flex-1">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 p-1 rounded-md hover:bg-border transition-colors"
                aria-label={`Eliminar ${file.name}`}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Tips */}
      <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
        <WarningCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Tips para mejores fotos:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Usá luz natural cuando sea posible</li>
            <li>Mostrá todas las habitaciones principales</li>
            <li>Asegurate de que el espacio esté ordenado</li>
            <li>Incluí fachada y áreas comunes si aplica</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
