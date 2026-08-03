import type { PillTone } from '@/lib/admin/types'

const TONE_CLASS: Record<PillTone, string> = {
  ok: 'pill-ok',
  info: 'pill-info',
  warn: 'pill-warn',
  bad: 'pill-bad',
  muted: '',
  neutral: '',
}

/**
 * Status pill — single colored-chip component reused across screens (cartera
 * stages, call outcomes, payment status, escalation urgency, health, key
 * rotation, QA flags). See FRONT.md §5.2.
 */
export function Pill({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: PillTone
  children: React.ReactNode
  className?: string
}) {
  return <span className={`pill ${TONE_CLASS[tone]} ${className}`.trim()}>{children}</span>
}
