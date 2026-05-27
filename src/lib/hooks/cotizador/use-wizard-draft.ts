'use client'
// Phase 30 plan 30-05 (COTI-UI-02)
// localStorage CRUD for cotizador.draft.wizard with 24h TTL.
// Raw cédula stored in draft.candidato.cedula for input repopulation only.
// The hash is NOT stored here — it is computed at submit time in the page component.

import { useState } from 'react'

export interface WizardDraftData {
  step: 1 | 2 | 3
  candidato: {
    cedula: string
    nombre: string
    ciudad: string
  }
  propiedad: {
    canonCop: number
    tipoInmueble: string
    codeudoresCount: number
  }
  updatedAt: number
}

export const DRAFT_KEY = 'cotizador.draft.wizard'
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000

function readDraft(): WizardDraftData | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WizardDraftData
    if (Date.now() - parsed.updatedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function useWizardDraft(): {
  draft: WizardDraftData | null
  hasDraft: boolean
  save: (data: Omit<WizardDraftData, 'updatedAt'>) => void
  clear: () => void
} {
  const [draft, setDraft] = useState<WizardDraftData | null>(readDraft)

  const save = (data: Omit<WizardDraftData, 'updatedAt'>) => {
    const full: WizardDraftData = { ...data, updatedAt: Date.now() }
    if (typeof window !== 'undefined') {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(full))
    }
    setDraft(full)
  }

  const clear = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY)
    }
    setDraft(null)
  }

  return {
    draft,
    hasDraft: draft !== null,
    save,
    clear,
  }
}
