'use client'

/**
 * CasillaDeDocumento — one upload slot of the free document study (T-0193).
 *
 * The file is uploaded as soon as it is chosen (the page owns the request);
 * this component only picks the file, checks the cheap things the back also
 * checks (type and 10 MB) so the person gets feedback without a round trip, and
 * says what state the slot is in. The back stays the authority: its message
 * (`ARCHIVO_INVALIDO`) arrives through `error`.
 */

import { useId, useRef, useState } from 'react'
import { CheckCircle, UploadSimple, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024
const TIPOS_ACEPTADOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export interface CasillaDeDocumentoProps {
  /** Stable id used for the test id and the DOM ids, e.g. `cedula`. */
  tipo: string
  titulo: string
  ayuda: string
  obligatorio: boolean
  subido: boolean
  subiendo: boolean
  /** Message from the back (or the page) for this slot. */
  error?: string
  disabled?: boolean
  onElegir: (file: File) => void
}

export function CasillaDeDocumento({
  tipo,
  titulo,
  ayuda,
  obligatorio,
  subido,
  subiendo,
  error,
  disabled,
  onElegir,
}: CasillaDeDocumentoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const base = useId()
  const errorId = `${base}-error`
  const mensaje = errorLocal ?? error ?? null

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Allows choosing the same file again after an error.
    e.target.value = ''
    if (!file) return
    if (!TIPOS_ACEPTADOS.includes(file.type)) {
      setErrorLocal('Sube un PDF o una imagen (JPG, PNG o WebP).')
      return
    }
    if (file.size === 0) {
      setErrorLocal('Ese archivo está vacío. Elige otro.')
      return
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      setErrorLocal('El archivo pesa más de 10 MB. Sube uno más liviano.')
      return
    }
    setErrorLocal(null)
    onElegir(file)
  }

  return (
    <div
      data-testid={`casilla-${tipo}`}
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between',
        mensaje ? 'border-danger' : 'border-border',
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
          {titulo}
          <span className="text-caption font-normal text-fg-muted">{obligatorio ? 'Obligatorio' : 'Opcional'}</span>
        </p>
        <p className="text-caption text-fg-muted">{ayuda}</p>
        {subido && !subiendo && (
          <p className="flex items-center gap-1.5 text-caption font-medium text-success" data-testid={`subido-${tipo}`}>
            <CheckCircle weight="fill" className="h-4 w-4" aria-hidden="true" />
            Listo, lo recibimos
          </p>
        )}
        {subiendo && (
          <p className="text-caption text-fg-muted" role="status">
            Subiendo…
          </p>
        )}
        {mensaje && (
          <p id={errorId} role="alert" className="flex items-start gap-1.5 text-caption text-danger">
            <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {mensaje}
          </p>
        )}
      </div>

      <div className="shrink-0">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          data-testid={`archivo-${tipo}`}
          aria-describedby={mensaje ? errorId : undefined}
          onChange={alElegir}
          disabled={disabled || subiendo}
        />
        <Button
          type="button"
          variant={subido ? 'outline' : 'secondary'}
          size="sm"
          hideArrow
          isLoading={subiendo}
          disabled={disabled || subiendo}
          onClick={() => inputRef.current?.click()}
          aria-label={`${subido ? 'Cambiar' : 'Subir'} ${titulo}`}
        >
          <UploadSimple className="h-4 w-4" aria-hidden="true" />
          {subido ? 'Cambiar archivo' : 'Subir archivo'}
        </Button>
      </div>
    </div>
  )
}
