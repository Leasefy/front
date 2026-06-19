'use client'

// Phase 31 plan 31-08 (D-31-08 component contract).
// Reusable mask primitive for PII at list + detail level.
//
// At the list level, value is ALREADY pre-masked by the server (D-31-05) —
// this component just styles the masked string + adds a lock glyph + exposes
// an optional onReveal callback for plans 31-09 / 31-10 to wire the
// PIIRevealModal into. For 31-08, onReveal is intentionally unbound.

import * as React from 'react'
import { type MouseEvent, type KeyboardEvent } from 'react'

void React // keep React in scope under tsconfig "jsx": "preserve"

export type MaskField = 'cedula' | 'phone' | 'email' | 'fiador_cedula'

interface MaskProps {
  field: MaskField
  value: string | null | undefined
  /** Optional callback fired on click/Enter when the user wants to reveal.
   *  31-10 wires the PIIRevealModal here. 31-08 leaves it undefined. */
  onReveal?: (field: MaskField) => void
  /** Revealed raw value (from PIIRevealContext); when present, displayed
   *  in place of the masked value. 31-09 wires this. */
  rawValue?: string | null | undefined
  /** Seconds remaining on the reveal token; shown alongside rawValue.
   *  Auto re-masking happens upstream when the context entry expires. */
  countdownSeconds?: number | null
  className?: string
}

const ARIA_LABEL_BY_FIELD: Record<MaskField, string> = {
  cedula: 'cédula enmascarada',
  phone: 'teléfono enmascarado',
  email: 'email enmascarado',
  fiador_cedula: 'cédula del fiador enmascarada',
}

const LockGlyph = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="12"
    height="12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="inline-block text-neutral-400 dark:text-neutral-500"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export function Mask({ field, value, onReveal, rawValue, countdownSeconds, className }: MaskProps) {
  // If a raw value is present (revealed), render it with the countdown chip.
  if (rawValue != null && rawValue !== '') {
    return (
      <span
        data-pii-field={field}
        data-pii-revealed="true"
        className={
          'inline-flex items-center gap-1 font-mono text-sm tracking-tight ' +
          'text-neutral-600 dark:text-neutral-300 ' +
          (className ?? '')
        }
      >
        <span>{rawValue}</span>
        {countdownSeconds != null && countdownSeconds > 0 && (
          <span
            aria-label={`tiempo restante ${formatCountdown(countdownSeconds)}`}
            className="px-1 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          >
            {formatCountdown(countdownSeconds)}
          </span>
        )}
      </span>
    )
  }

  const isEmpty = value === null || value === undefined || value === ''

  if (isEmpty) {
    return (
      <span
        aria-label="sin dato"
        className={
          'text-neutral-400 dark:text-neutral-500 ' + (className ?? '')
        }
      >
        —
      </span>
    )
  }

  const interactive = typeof onReveal === 'function'

  // Non-interactive (onReveal unbound, e.g. plan 31-08): render a plain,
  // non-actionable span — NO role=button / tabIndex / click handlers — so
  // screen readers and keyboard nav don't announce a button that does nothing.
  if (!interactive) {
    return (
      <span
        aria-label={ARIA_LABEL_BY_FIELD[field]}
        data-pii-field={field}
        className={
          'inline-flex items-center gap-1 font-mono text-sm tracking-tight ' +
          'text-neutral-700 dark:text-neutral-200 ' +
          (className ?? '')
        }
      >
        <span>{value}</span>
        <LockGlyph />
      </span>
    )
  }

  const handleClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    if (onReveal) onReveal(field)
  }

  const handleKey = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      if (onReveal) onReveal(field)
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ARIA_LABEL_BY_FIELD[field]}
      data-pii-field={field}
      onClick={handleClick}
      onKeyDown={handleKey}
      className={
        'inline-flex items-center gap-1 font-mono text-sm tracking-tight ' +
        'text-neutral-700 dark:text-neutral-200 cursor-pointer ' +
        'hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-600 dark:text-neutral-300 focus:outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-fg-muted rounded-sm ' +
        (className ?? '')
      }
    >
      <span>{value}</span>
      <LockGlyph />
    </span>
  )
}
