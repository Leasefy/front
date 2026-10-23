'use client'

import { useMemo } from 'react'

import { PlanSidebar } from '@/components/ui/plan/PlanSidebar'
import { filasDelMenuDelAdmin } from '@/lib/admin/menu-del-admin'

/** The nav sections, in order (FRONT.md §5.1). Routes are prefixed /admin. */
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
  { href: '/admin/onboarding', label: 'Inmobiliarias nuevas', hint: 'cómo arrancan', code: '20' },
  { href: '/admin/debtors', label: 'Debtors 🛡', hint: 'cross-tenant · PII', code: '21' },
  { href: '/admin/templates', label: 'Templates', hint: 'WA multi-idioma', code: '22' },
  { href: '/admin/users', label: 'Users', hint: 'admin roster', code: '23' },
  { href: '/admin/keys', label: 'Keys', hint: 'rotación 90d', code: '24' },
  { href: '/admin/feature-flags', label: 'Flags', hint: 'per-tenant', code: '25' },
  { href: '/admin/pricing-config', label: 'Pricing', hint: 'modelo agencia', code: '26' },
  // ACT-09 (Nico, 05-10-2026): el Piloto automático de cada inmobiliaria lo deja Leasefy en prueba, contratado o apagado.
  { href: '/admin/piloto', label: 'Piloto automático', hint: 'prueba · contratado · apagado', code: '37' },
  { href: '/admin/plans', label: 'Planes', hint: 'catálogo agency', code: '30' },
  { href: '/admin/agency-targets', label: 'Targets', hint: 'metas mensuales', code: '27' },
  { href: '/admin/avaluos', label: 'Avalúos', hint: 'firma certificados', code: '28' },
  { href: '/admin/registration-profiles', label: 'Perfiles', hint: 'signup on/off', code: '29' },
  { href: '/admin/cotizador', label: 'Cotizador', hint: 'carriers · credenciales', code: '31' },
  { href: '/admin/inmuebles', label: 'Inmuebles', hint: 'riesgo · historial interno', code: '32' },
  { href: '/admin/chat-feedback', label: 'Chat feedback', hint: 'pulgares · dónde falla', code: '33' },
  // Prendida el 04-10-2026: Nico aprobó la cláusula de la política (v4.0 §13 y §16).
  { href: '/admin/chat-preguntas', label: 'Preguntas del chat', hint: 'qué preguntan · sugerencias', code: '36' },
  { href: '/admin/modulos-pagos', label: 'Módulos', hint: 'nómina · qué compró cada una', code: '34' },
  { href: '/admin/exogena', label: 'Exógena', hint: 'conceptos por año · publicar', code: '34' },
  { href: '/admin/recaudo-en-linea', label: 'Recaudo en línea', hint: 'wompi · liquidaciones', code: '35' },
] as const

/**
 * La barra lateral del admin: el `PlanSidebar` de la plataforma (Cadence), el
 * mismo de los paneles de la inmobiliaria, el propietario y el inquilino.
 * Secciones plegables, un ícono por fila, el logotipo de Leasefy, plegar con
 * ⌘B, el cajón en el celular y el buscador de pantallas (⌘K) arriba.
 *
 * `NAV_ITEMS` (arriba) sigue siendo LA lista de pantallas; la sección, el ícono
 * y el nombre de cada una salen de `lib/admin/menu-del-admin.ts`.
 */
export function Nav({ onBuscar }: { onBuscar: () => void }) {
  const filas = useMemo(() => filasDelMenuDelAdmin(NAV_ITEMS), [])
  return (
    <PlanSidebar
      navItems={filas}
      logo={{ title: 'Admin de Leasefy', href: '/admin' }}
      workspaceName="Admin de Leasefy"
      onSearchClick={onBuscar}
      searchPlaceholder="Buscar"
      // La ayuda pública es para las inmobiliarias; acá no lleva a nada útil.
      ayudaHref={null}
    />
  )
}
