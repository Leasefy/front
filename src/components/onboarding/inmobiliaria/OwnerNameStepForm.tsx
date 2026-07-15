'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProvisioningNames } from '@/lib/hooks/use-onboarding-provisioning'

export interface OwnerNameStepFormProps {
  onSubmit: (names: ProvisioningNames) => void
}

/**
 * Pre-step shown before provisioning when the signup never captured the
 * owner's name (`useOnboardingProvisioning` reports `needs-name` — the back
 * rejects an empty firstName/lastName with a 400). Splits the full name like
 * the canonical `src/app/onboarding/propietario/page.tsx` step: first word →
 * firstName, rest → lastName (falls back to firstName).
 */
export function OwnerNameStepForm({ onSubmit }: OwnerNameStepFormProps) {
  const [displayName, setDisplayName] = useState('')
  const [showError, setShowError] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) {
      setShowError(true)
      return
    }
    const nameParts = trimmed.split(/\s+/)
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || firstName
    onSubmit({ firstName, lastName })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="owner-name-step-form">
      <div className="text-center">
        <h1 className="text-h1">Antes de comenzar</h1>
        <p className="text-body-sm text-fg-muted mt-2">
          Cuéntanos tu nombre para crear tu cuenta y continuar con el registro de tu inmobiliaria.
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
            if (showError) setShowError(false)
          }}
        />
        {showError && (
          <p className="mt-1.5 text-xs text-danger">Ingresa tu nombre completo para continuar.</p>
        )}
      </div>

      <Button type="submit" hideArrow size="lg" className="w-full">
        Continuar
        <ArrowRight className="w-4 h-4" />
      </Button>
    </form>
  )
}
