'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { Wordmark } from './Wordmark'

/** The 28 nav sections, in order (FRONT.md §5.1). Routes are prefixed /admin. */
export const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', hint: 'dashboard', code: '00' },
  { href: '/admin/agents', label: 'Agentes', hint: 'vapi prompts', code: '01' },
  { href: '/admin/tenants', label: 'Tenants', hint: 'inmobiliarias', code: '02' },
  { href: '/admin/calls', label: 'Llamadas', hint: 'cross-tenant', code: '03' },
  { href: '/admin/audits', label: 'Auditoría', hint: 'compliance events', code: '04' },
  { href: '/admin/cartera', label: 'Cartera', hint: 'stage S0..SX', code: '05' },
  { href: '/admin/approvals', label: 'Aprobaciones', hint: 'T-323/2024 queue', code: '06' },
  { href: '/admin/escalations', label: 'Escalaciones', hint: 'handoff humano', code: '07' },
  { href: '/admin/payments', label: 'Pagos', hint: 'wompi/bold funnel', code: '08' },
  { href: '/admin/qa', label: 'QA', hint: 'score · flags', code: '09' },
  { href: '/admin/costs', label: 'Costos', hint: 'burn plataforma', code: '10' },
  { href: '/admin/opt-outs', label: 'Opt-outs', hint: 'habeas data', code: '11' },
  { href: '/admin/ley-2300', label: 'Ley 2300', hint: 'ventanas contacto', code: '12' },
  { href: '/admin/failed-states', label: 'Failed', hint: 'ops inbox', code: '13' },
  { href: '/admin/health', label: 'Health', hint: 'pings sistema', code: '14' },
  { href: '/admin/inngest-monitor', label: 'Inngest', hint: 'crons + workflows', code: '15' },
  { href: '/admin/kill-switch', label: 'Kill-switch', hint: 'pausar agencia', code: '16' },
  { href: '/admin/audit-explorer', label: 'Audit search', hint: 'SIC / SAGRILAFT', code: '17' },
  { href: '/admin/billing', label: 'Billing', hint: 'MRR · ARR', code: '18' },
  { href: '/admin/ab-tests', label: 'A/B tests', hint: 'experiments', code: '19' },
  { href: '/admin/onboarding', label: 'Onboarding', hint: 'nuevas agencias', code: '20' },
  { href: '/admin/debtors', label: 'Debtors 🛡', hint: 'cross-tenant · PII', code: '21' },
  { href: '/admin/templates', label: 'Templates', hint: 'WA multi-idioma', code: '22' },
  { href: '/admin/users', label: 'Users', hint: 'admin roster', code: '23' },
  { href: '/admin/keys', label: 'Keys', hint: 'rotación 90d', code: '24' },
  { href: '/admin/feature-flags', label: 'Flags', hint: 'per-tenant', code: '25' },
  { href: '/admin/pricing-config', label: 'Pricing', hint: 'modelo agencia', code: '26' },
  { href: '/admin/agency-targets', label: 'Targets', hint: 'metas mensuales', code: '27' },
] as const

export function Nav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  async function signOut() {
    await getSupabase()?.auth.signOut()
    window.location.href = '/admin/login'
  }

  return (
    <aside className="w-64 shrink-0 border-r border-bg-border bg-bg-surface min-h-screen flex flex-col sticky top-0 h-screen overflow-y-auto" data-lenis-prevent>
      <div className="px-5 py-5 border-b border-bg-border">
        <Wordmark size="md" variant="blue" />
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">admin · v1</div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-px">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'group flex items-center gap-3 px-3 py-2.5 transition-colors border-l-2 ' +
                (active
                  ? 'bg-bg-hover text-fg border-l-brand'
                  : 'text-fg-muted hover:bg-bg-hover hover:text-fg border-l-transparent')
              }
            >
              <span
                className={
                  'font-mono text-[10px] tabular-nums ' +
                  (active ? 'text-brand' : 'text-fg-subtle group-hover:text-fg-muted')
                }
              >
                {item.code}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">{item.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{item.hint}</div>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-bg-border space-y-3">
        <div className="px-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">sesión</div>
          <div className="text-xs text-fg-muted truncate mt-0.5" title={userEmail}>{userEmail}</div>
        </div>
        <button onClick={signOut} className="btn btn-ghost w-full justify-start">Cerrar sesión →</button>
      </div>
    </aside>
  )
}
