'use client'

/**
 * /ai/pagos/equipo — "Equipo IA" de Pagos (visión §13–14).
 *
 * A diferencia de estudio/asegurabilidad (donde el equipo se presenta por
 * función, sin nombres), para PAGOS Nico decidió presentarlo con PERSONAS
 * HUMANAS, cada una con su rol dentro del ciclo del pago:
 *
 *   Gabriela  — Agente principal de pagos (orquesta y supervisa todo)
 *   Laura     — Generadora de cobros
 *   Nicolás   — Enviador de links
 *   Valentina — Monitora de pagos
 *   Samuel    — Liquidador de propietarios
 *   Sofía     — Reportes y notificaciones
 *
 * Dos bloques (visión §13 y §14):
 *   1. Las personas del equipo (cards: avatar + rol + presentación en
 *      primera persona + "Qué hace" + "Resultados que muestra").
 *   2. El FLUJO CONECTADO de un lote mensual:
 *      Laura → Nicolás → Valentina → Conciliación → Samuel → Sofía → Gabriela.
 *
 * UX-only scaffold: tokens semánticos del DS (CERO hex). Las métricas/tabla de
 * "lote mensual" son ILUSTRATIVAS y están claramente rotuladas — no inventan
 * endpoints ni fingen datos reales (T-323). Las operaciones profundas viven en
 * /cobros, /conciliacion, /dispersiones, /tesoreria y se CROSS-LINKEAN.
 */

import Link from 'next/link'
import {
  ArrowDown,
  ArrowsClockwise,
  Bell,
  CurrencyDollar,
  Eye,
  HandCoins,
  PaperPlaneTilt,
  Receipt,
  UsersThree,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import {
  EquipoPagosPersona,
  type EquipoPagosPersonaData,
} from '@/components/inmobiliaria/pagos/EquipoPagosPersona'
import { PagoEstadoBadge } from '@/components/inmobiliaria/pagos/PagoEstadoBadge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ── Personas del equipo (visión §13) ─────────────────────────────────────────

const GABRIELA: EquipoPagosPersonaData = {
  id: 'gabriela',
  nombre: 'Gabriela',
  inicial: 'G',
  rol: 'Agente principal de pagos',
  icon: UsersThree,
  accent: 'blue',
  presentacion:
    'Coordino a todo el equipo y vigilo que cada pago avance sin atascos. Cuando algo necesita tu decisión, te lo dejo claro.',
  queHace: [
    'Orquesta el ciclo completo del pago, de la generación al cierre.',
    'Prioriza lo urgente y te escala solo lo que requiere tu decisión.',
    'Mantiene la cola humana al día y explica el porqué de cada caso.',
  ],
  resultados: [
    'Estado general del lote del mes.',
    'Casos abiertos que esperan tu revisión.',
  ],
}

const LAURA: EquipoPagosPersonaData = {
  id: 'laura',
  nombre: 'Laura',
  inicial: 'L',
  rol: 'Generadora de cobros',
  icon: Receipt,
  accent: 'blue',
  presentacion:
    'Armo cada cobro del mes con su valor, su concepto y su vencimiento, listo para enviar.',
  queHace: [
    'Genera los cobros del periodo a partir de los contratos vigentes.',
    'Calcula valor, concepto y fecha de vencimiento de cada uno.',
    'Deja cada cobro programado y listo para enviar.',
  ],
  resultados: [
    'Cobros generados en el lote.',
    'Cobros listos para enviar.',
  ],
}

const NICOLAS: EquipoPagosPersonaData = {
  id: 'nicolas',
  nombre: 'Nicolás',
  inicial: 'N',
  rol: 'Enviador de links',
  icon: PaperPlaneTilt,
  accent: 'blue',
  presentacion:
    'Envío el link de pago por el canal de cada inquilino y confirmo que llegó y se vio.',
  queHace: [
    'Despacha el link de pago por el canal habilitado de cada inquilino.',
    'Reintenta el envío cuando un canal falla.',
    'Marca cuándo el cobro fue entregado y visto.',
  ],
  resultados: [
    'Links enviados y entregados.',
    'Envíos vistos por el inquilino.',
  ],
}

const VALENTINA: EquipoPagosPersonaData = {
  id: 'valentina',
  nombre: 'Valentina',
  inicial: 'V',
  rol: 'Monitora de pagos',
  icon: Eye,
  accent: 'amber',
  presentacion:
    'Vigilo cada pago en curso: aviso cuando entra, cuando se atrasa y cuando algo necesita atención.',
  queHace: [
    'Sigue el estado de cada cobro hasta que se paga.',
    'Detecta pagos parciales, intentos fallidos y vencimientos.',
    'Levanta a la cola humana lo que no se resuelve solo.',
  ],
  resultados: [
    'Pagos recibidos vs. pendientes.',
    'Casos en atención (parciales o vencidos).',
  ],
}

const SAMUEL: EquipoPagosPersonaData = {
  id: 'samuel',
  nombre: 'Samuel',
  inicial: 'S',
  rol: 'Liquidador de propietarios',
  icon: HandCoins,
  accent: 'green',
  presentacion:
    'Una vez conciliado el dinero, calculo lo que le toca a cada propietario y dejo la liquidación lista.',
  queHace: [
    'Calcula la liquidación de cada propietario sobre el dinero conciliado.',
    'Descuenta comisión y conceptos según las reglas de la inmobiliaria.',
    'Deja la dispersión preparada para su aprobación.',
  ],
  resultados: [
    'Liquidaciones preparadas.',
    'Monto total a dispersar.',
  ],
}

const SOFIA: EquipoPagosPersonaData = {
  id: 'sofia',
  nombre: 'Sofía',
  inicial: 'S',
  rol: 'Reportes y notificaciones',
  icon: Bell,
  accent: 'green',
  presentacion:
    'Cierro el ciclo: informo a propietarios e inquilinos y dejo el reporte del mes a la mano.',
  queHace: [
    'Notifica a propietarios e inquilinos los movimientos del periodo.',
    'Arma el reporte del lote con lo cobrado, conciliado y dispersado.',
    'Avisa los pendientes que quedan para el cierre.',
  ],
  resultados: [
    'Notificaciones enviadas.',
    'Reporte del mes disponible.',
  ],
}

/** Orden de presentación de las cards (principal primero). */
const PERSONAS: EquipoPagosPersonaData[] = [
  GABRIELA,
  LAURA,
  NICOLAS,
  VALENTINA,
  SAMUEL,
  SOFIA,
]

// ── Flujo conectado (visión §14) ─────────────────────────────────────────────

type FlowAccent = 'blue' | 'green' | 'amber' | 'neutral'

const FLOW_ACCENT: Record<FlowAccent, { chip: string; fg: string }> = {
  blue: { chip: 'bg-primary-soft', fg: 'text-primary' },
  green: { chip: 'bg-success-soft', fg: 'text-success' },
  amber: { chip: 'bg-warning-soft', fg: 'text-warning' },
  neutral: { chip: 'bg-surface-muted', fg: 'text-fg-muted' },
}

type FlowNode = {
  id: string
  icon: Icon
  accent: FlowAccent
  /** Persona (o "Paso" para el nodo de proceso). */
  quien: string
  titulo: string
  detalle: string
  /** Cross-link a la operación profunda, si aplica. */
  link?: { href: string; label: string }
}

/** Laura → Nicolás → Valentina → Conciliación → Samuel → Sofía → Gabriela. */
const FLOW: FlowNode[] = [
  {
    id: 'laura',
    icon: Receipt,
    accent: 'blue',
    quien: 'Laura',
    titulo: 'Genera los cobros del mes',
    detalle: 'Arma cada cobro con su valor, concepto y vencimiento, listo para enviar.',
    link: { href: '/panel/inmobiliaria/cobros', label: 'Ver cobros' },
  },
  {
    id: 'nicolas',
    icon: PaperPlaneTilt,
    accent: 'blue',
    quien: 'Nicolás',
    titulo: 'Envía los links de pago',
    detalle: 'Despacha cada link por el canal del inquilino y confirma entrega y vista.',
  },
  {
    id: 'valentina',
    icon: Eye,
    accent: 'amber',
    quien: 'Valentina',
    titulo: 'Monitorea los pagos',
    detalle: 'Sigue cada pago, detecta parciales, fallidos y vencimientos, y escala lo que lo amerita.',
  },
  {
    id: 'conciliacion',
    icon: ArrowsClockwise,
    accent: 'neutral',
    quien: 'Paso',
    titulo: 'Conciliación del dinero',
    detalle: 'Los pagos recibidos se cruzan con el banco para confirmar qué entró de verdad.',
    link: { href: '/panel/inmobiliaria/conciliacion', label: 'Ir a conciliación' },
  },
  {
    id: 'samuel',
    icon: HandCoins,
    accent: 'green',
    quien: 'Samuel',
    titulo: 'Liquida a los propietarios',
    detalle: 'Calcula lo que le toca a cada propietario y deja la dispersión preparada.',
    link: { href: '/panel/inmobiliaria/dispersiones', label: 'Ver dispersiones' },
  },
  {
    id: 'sofia',
    icon: Bell,
    accent: 'green',
    quien: 'Sofía',
    titulo: 'Reporta y notifica',
    detalle: 'Informa a propietarios e inquilinos y deja el reporte del mes a la mano.',
  },
]

// ── Tabla ilustrativa del lote mensual (visión §14, claramente rotulada) ──────

type LoteRow = {
  agente: string
  trabajo: string
  estado: string
  resultado: string
}

const LOTE_EJEMPLO: LoteRow[] = [
  { agente: 'Laura', trabajo: 'Generar cobros del mes', estado: 'conciliado', resultado: 'Lote armado y programado' },
  { agente: 'Nicolás', trabajo: 'Enviar links de pago', estado: 'enviado', resultado: 'Links entregados por su canal' },
  { agente: 'Valentina', trabajo: 'Monitorear pagos', estado: 'en_proceso', resultado: 'Seguimiento de cada pago' },
  { agente: 'Conciliación', trabajo: 'Cruzar pagos con el banco', estado: 'en_conciliacion', resultado: 'Dinero confirmado' },
  { agente: 'Samuel', trabajo: 'Liquidar propietarios', estado: 'pagado', resultado: 'Dispersión preparada' },
  { agente: 'Sofía', trabajo: 'Reportar y notificar', estado: 'conciliado', resultado: 'Reporte del mes listo' },
]

// ── Sub-componentes ───────────────────────────────────────────────────────────

/** Nodo del flujo conectado: chip de ícono + quién + título + detalle + cross-link. */
function FlowStep({ node }: { node: FlowNode }) {
  const StepIcon = node.icon
  const accent = FLOW_ACCENT[node.accent]

  return (
    <article className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <span
        className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent.chip)}
        aria-hidden="true"
      >
        <StepIcon className={cn('w-5 h-5', accent.fg)} weight="duotone" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{node.quien}</p>
        <h3 className="text-base font-semibold text-fg leading-tight">{node.titulo}</h3>
        <p className="mt-1 text-sm text-fg-muted leading-snug">{node.detalle}</p>
        {node.link && (
          <Link
            href={node.link.href}
            className="mt-2 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {node.link.label}
          </Link>
        )}
      </div>
    </article>
  )
}

/** Conector hairline vertical entre nodos del flujo. */
function FlowConnector() {
  return (
    <div className="flex justify-center py-1.5" aria-hidden="true">
      <span className="flex flex-col items-center text-fg-muted">
        <span className="w-px h-3 bg-border" />
        <ArrowDown className="w-4 h-4 -my-0.5" weight="bold" />
        <span className="w-px h-3 bg-border" />
      </span>
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────────

function EquipoPagos() {
  return (
    <main className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-fg tracking-tight">Equipo IA</h1>
        <p className="text-fg-muted mt-0.5 text-sm max-w-2xl">
          Un equipo de agentes —cada uno con su nombre y su rol— se reparte el trabajo de los pagos,
          de generar el cobro a liquidar al propietario. Aquí ves quiénes son y cómo se pasan el caso
          de la mano, paso a paso.
        </p>
      </header>

      {/* 1 · Las personas del equipo */}
      <section aria-label="Personas del equipo de pagos" className="space-y-3">
        <div className="flex items-center gap-2">
          <CurrencyDollar className="w-4 h-4 text-fg-muted" weight="duotone" aria-hidden="true" />
          <h2 className="text-base font-semibold text-fg">El equipo</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PERSONAS.map((persona) => (
            <EquipoPagosPersona key={persona.id} persona={persona} />
          ))}
        </div>
      </section>

      {/* 2 · El flujo conectado del lote mensual */}
      <section aria-label="Flujo del equipo de pagos" className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ArrowsClockwise className="w-4 h-4 text-fg-muted" weight="duotone" aria-hidden="true" />
            <h2 className="text-base font-semibold text-fg">Cómo se pasan el caso</h2>
          </div>
          <p className="text-sm text-fg-muted max-w-2xl">
            Cada pago recorre el equipo en orden. Lo que entrega uno es el punto de partida del
            siguiente, y Gabriela supervisa todo el recorrido.
          </p>
        </div>

        <div className="max-w-2xl">
          <ol className="space-y-0">
            {FLOW.map((node, i) => {
              const isLast = i === FLOW.length - 1
              return (
                <li key={node.id} data-flow={node.id}>
                  <FlowStep node={node} />
                  {!isLast && <FlowConnector />}
                </li>
              )
            })}
          </ol>

          {/* Cierre del recorrido — vuelve a Gabriela, que supervisa el ciclo. */}
          <FlowConnector />
          <article className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary-soft p-4">
            <span
              className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <UsersThree className="w-5 h-5 text-primary" weight="duotone" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Gabriela</p>
              <h3 className="text-base font-semibold text-fg leading-tight">Supervisa todo el ciclo</h3>
              <p className="mt-1 text-sm text-fg-muted leading-snug">
                Vigila el recorrido completo, prioriza lo urgente y te escala a la cola humana solo
                lo que necesita tu decisión.
              </p>
              <Link
                href="/panel/inmobiliaria/ai/pagos/cola"
                className="mt-2 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ir a la cola humana
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 3 · Tabla ilustrativa del lote mensual (claramente rotulada) */}
      <section aria-label="Ejemplo de lote mensual" className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">Un lote mensual, de un vistazo</h2>
          <p className="text-sm text-fg-muted max-w-2xl">
            Ejemplo ilustrativo de cómo se reparte el trabajo de un lote del mes entre el equipo. Los
            datos reales de cada lote viven en{' '}
            <Link
              href="/panel/inmobiliaria/cobros"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Cobros
            </Link>
            ,{' '}
            <Link
              href="/panel/inmobiliaria/conciliacion"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Conciliación
            </Link>{' '}
            y{' '}
            <Link
              href="/panel/inmobiliaria/dispersiones"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Dispersiones
            </Link>
            .
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table className="w-full min-w-[640px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Agente</TableHead>
                <TableHead scope="col">Trabajo</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LOTE_EJEMPLO.map((row, i) => (
                <TableRow key={i} className="border-t border-border align-top">
                  <TableCell className="py-3 px-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-fg">{row.agente}</span>
                  </TableCell>
                  <TableCell className="py-3 pr-4">
                    <span className="text-sm text-fg leading-snug">{row.trabajo}</span>
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    <PagoEstadoBadge estado={row.estado} />
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <span className="text-sm text-fg-muted leading-snug">{row.resultado}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-fg-muted max-w-2xl">
          Ejemplo ilustrativo. Las cifras y estados reales se actualizan en cada superficie de
          operación.
        </p>
      </section>
    </main>
  )
}

export default function EquipoPagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <EquipoPagos />
    </PageGuard>
  )
}
