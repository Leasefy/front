'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { ProvisioningInput } from '@/lib/hooks/use-onboarding-provisioning'

export interface OwnerNameStepFormProps {
  onSubmit: (input: ProvisioningInput) => void
  /** Disables submit while `POST /users/me/onboarding` is in flight. */
  isSubmitting: boolean
}

/** Digits with an optional check digit (e.g. 900123456-7). Deliberately loose. */
const NIT_PATTERN = /^\d{5,15}(-\d)?$/

/**
 * Colombian RUT documents print the NIT dot-separated ("900.123.456-7") —
 * strip dots and spaces (the check digit's hyphen stays) before validating
 * and sending.
 */
function normalizeNit(raw: string): string {
  return raw.replace(/[.\s]/g, '')
}

interface FieldErrors {
  fullName?: string
  agencyName?: string
  nit?: string
}

/**
 * Pre-step shown before provisioning (`useOnboardingProvisioning` reports
 * `needs-info`). Collects everything `POST /users/me/onboarding` needs to
 * create the agency: the owner's name (the back rejects an empty
 * firstName/lastName with a 400) plus the agency's razón social and NIT
 * (the back marks the agency FAILED — with no auto-retry — when the NIT is
 * missing). Splits the full name like the canonical
 * `src/app/onboarding/propietario/page.tsx` step: first word → firstName,
 * rest → lastName (falls back to firstName).
 */
export function OwnerNameStepForm({ onSubmit, isSubmitting }: OwnerNameStepFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [nit, setNit] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const clearError = (field: keyof FieldErrors) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Belt-and-braces alongside the disabled button (e.g. Enter-key submit
    // before the disabled state re-renders).
    if (isSubmitting) return
    const trimmedName = displayName.trim()
    const trimmedAgencyName = agencyName.trim()
    const normalizedNit = normalizeNit(nit.trim())

    const nextErrors: FieldErrors = {}
    if (!trimmedName) {
      nextErrors.fullName = 'Ingresa tu nombre completo para continuar.'
    }
    if (!normalizedNit) {
      nextErrors.nit = 'El NIT es obligatorio.'
    } else if (!NIT_PATTERN.test(normalizedNit)) {
      nextErrors.nit = 'Ingresa un NIT válido. Ej: 900123456-7'
    }
    if (!trimmedAgencyName) {
      nextErrors.agencyName = 'La razón social es obligatoria.'
    }
    if (nextErrors.fullName || nextErrors.agencyName || nextErrors.nit) {
      setErrors(nextErrors)
      return
    }

    const nameParts = trimmedName.split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || firstName
    onSubmit({ firstName, lastName, agencyName: trimmedAgencyName, nit: normalizedNit })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="owner-name-step-form">
      <div className="text-center">
        <h1 className="text-h1">Antes de comenzar</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Cuéntanos sobre ti y tu inmobiliaria para crear tu cuenta y continuar con el registro.
        </p>
      </div>

      <div>
        <label htmlFor="ownerFullName" className="block text-sm font-medium text-fg mb-2">
          Nombre completo <span className="text-danger">*</span>
        </label>
        <Input
          id="ownerFullName"
          type="text"
          autoComplete="name"
          placeholder="Ej: Ana María Pérez"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value)
            clearError('fullName')
          }}
        />
        {errors.fullName && <p className="mt-1.5 text-xs text-danger">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="agencyName" className="block text-sm font-medium text-fg mb-2">
          Razón social <span className="text-danger">*</span>
        </label>
        <Input
          id="agencyName"
          type="text"
          autoComplete="organization"
          placeholder="Ej: Inmobiliaria Andes SAS"
          value={agencyName}
          onChange={(event) => {
            setAgencyName(event.target.value)
            clearError('agencyName')
          }}
        />
        {errors.agencyName && <p className="mt-1.5 text-xs text-danger">{errors.agencyName}</p>}
      </div>

      <div>
        <label htmlFor="agencyNit" className="block text-sm font-medium text-fg mb-2">
          NIT <span className="text-danger">*</span>
        </label>
        <Input
          id="agencyNit"
          type="text"
          inputMode="numeric"
          className="font-mono tabular-nums"
          placeholder="Ej: 900123456-7"
          value={nit}
          onChange={(event) => {
            setNit(event.target.value)
            clearError('nit')
          }}
        />
        {errors.nit && <p className="mt-1.5 text-xs text-danger">{errors.nit}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} hideArrow size="lg" className="w-full">
        {isSubmitting ? (
          <>
            <Spinner size="xs" variant="current" />
            Creando tu cuenta...
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
