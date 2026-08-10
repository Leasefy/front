'use client'

/**
 * /ai/cobranza/equipo — "Equipo IA de cobranza" (visión #15–16).
 *
 * Decisión de Nico (igual que en Pagos): el equipo se presenta con PERSONAS
 * HUMANAS, no funciones anónimas. Mismos nombres que Pagos pero ROLES de
 * cobranza. UX-only: contenido estático de presentación del equipo + el flujo
 * conectado de subagentes. CERO hex inline (tokens del DS).
 */

import type { Icon } from '@phosphor-icons/react'
import { Card } from '@leasefy/cadence'
import {
  Robot,
  ChatCircleText,
  BellRinging,
  ClipboardText,
  Scales,
  FileText,
  ArrowDown,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  EquipoCobranzaPersona,
  type EquipoCobranzaPersonaData,
} from '@/components/inmobiliaria/cobranza/EquipoCobranzaPersona'

// ── Las 6 personas del equipo de cobranza (visión #15) ───────────────────────

const PERSONAS: EquipoCobranzaPersonaData[] = [
  {
    id: 'gabriela',
    nombre: 'Gabriela',
    inicial: 'G',
    rol: 'Agente principal de cobranza',
    icon: Robot,
    accent: 'blue',
    presentacion:
      'Coordino la recuperación de cartera: priorizo casos, activo a los subagentes, reviso avances, recomiendo decisiones y te muestro los resultados.',
    queHace: [
      'Detecta la cartera vencida.',
      'Prioriza casos por riesgo, valor y días de mora.',
      'Activa los playbooks de cobranza.',
      'Coordina promesas, acuerdos y escalamiento.',
      'Te pide aprobación cuando es necesario.',
    ],
    resultados: [
      'Casos coordinados.',
      'Valor recuperado.',
      'Casos cerrados.',
      'Acciones pendientes de tu decisión.',
    ],
  },
  {
    id: 'laura',
    nombre: 'Laura',
    inicial: 'L',
    rol: 'Contactabilidad',
    icon: ChatCircleText,
    accent: 'green',
    presentacion: 'Contacto a los inquilinos y clasifico sus respuestas para que cada caso avance.',
    queHace: [
      'Contacta inquilinos por los canales habilitados.',
      'Clasifica las respuestas (promesa, pago reportado, disputa…).',
      'Detecta casos sin contacto y propone alternativas.',
    ],
    resultados: [
      'Contactos efectivos.',
      'Tasa de respuesta.',
      'Casos sin contacto.',
      'Tiempo promedio de respuesta.',
    ],
  },
  {
    id: 'nicolas',
    nombre: 'Nicolás',
    inicial: 'N',
    rol: 'Seguimiento de promesas',
    icon: BellRinging,
    accent: 'amber',
    presentacion: 'Registro y persigo los compromisos de pago hasta que se cumplen.',
    queHace: [
      'Registra cada promesa de pago con fecha y valor.',
      'Programa el seguimiento automático.',
      'Detecta promesas incumplidas y recomienda el siguiente paso.',
    ],
    resultados: [
      'Promesas activas.',
      'Promesas cumplidas.',
      'Promesas incumplidas.',
      'Valor recuperado por promesas.',
    ],
  },
  {
    id: 'valentina',
    nombre: 'Valentina',
    inicial: 'V',
    rol: 'Acuerdos de pago',
    icon: ClipboardText,
    accent: 'blue',
    presentacion:
      'Propongo y estructuro acuerdos cuando el inquilino no puede pagar el total de una vez.',
    queHace: [
      'Propone acuerdos según las reglas de la inmobiliaria.',
      'Estructura cuota inicial, número de cuotas y fechas.',
      'Marca los acuerdos que necesitan tu aprobación.',
    ],
    resultados: [
      'Acuerdos creados.',
      'Acuerdos cumplidos.',
      'Acuerdos incumplidos.',
      'Valor recuperado por acuerdos.',
    ],
  },
  {
    id: 'samuel',
    nombre: 'Samuel',
    inicial: 'S',
    rol: 'Escalamiento',
    icon: Scales,
    accent: 'rose',
    presentacion: 'Identifico los casos críticos y preparo la revisión prejurídica con evidencia completa.',
    queHace: [
      'Detecta casos que superan el umbral de mora.',
      'Verifica promesas incumplidas e intentos de contacto.',
      'Prepara el expediente y deja el escalamiento listo para tu aprobación.',
    ],
    resultados: [
      'Casos escalados.',
      'Casos recuperados antes de escalar.',
      'Casos con evidencia completa.',
      'Casos pendientes de aprobación.',
    ],
  },
  {
    id: 'sofia',
    nombre: 'Sofía',
    inicial: 'S',
    rol: 'Reportes a propietarios',
    icon: FileText,
    accent: 'green',
    presentacion: 'Convierto la gestión de cobranza en reportes claros para los propietarios.',
    queHace: [
      'Resume la gestión de cada caso.',
      'Prepara el reporte de estado de cobranza por propietario.',
      'Deja los reportes listos para tu aprobación antes de enviarlos.',
    ],
    resultados: [
      'Reportes enviados.',
      'Propietarios informados.',
      'Casos con trazabilidad completa.',
      'Reportes pendientes de aprobación.',
    ],
  },
]

// ── Flujo conectado de subagentes (visión #16) ───────────────────────────────

type FlujoPaso = { nombre: string; descripcion: string; icon: Icon }

const FLUJO: FlujoPaso[] = [
  { nombre: 'Laura', descripcion: 'Contacta al inquilino y clasifica su respuesta.', icon: ChatCircleText },
  { nombre: 'Nicolás', descripcion: 'Registra la promesa de pago y la persigue.', icon: BellRinging },
  { nombre: 'Valentina', descripcion: 'Propone un acuerdo si el inquilino no puede pagar completo.', icon: ClipboardText },
  { nombre: 'Samuel', descripcion: 'Evalúa el escalamiento si el caso incumple.', icon: Scales },
  { nombre: 'Sofía', descripcion: 'Reporta el estado al propietario.', icon: FileText },
  { nombre: 'Gabriela', descripcion: 'Coordina todo y te recomienda la mejor decisión.', icon: Robot },
]

// ── Lote ejemplo "en cada caso" (visión #16, ilustrativo) ────────────────────

const LOTE_EJEMPLO: { agente: string; trabajo: string; estado: string; resultado: string }[] = [
  { agente: 'Laura', trabajo: 'Contacto inicial', estado: 'Completado', resultado: 'Respondió por WhatsApp' },
  { agente: 'Nicolás', trabajo: 'Promesa de pago', estado: 'Activo', resultado: 'Prometió pagar el viernes' },
  { agente: 'Valentina', trabajo: 'Acuerdo', estado: 'Pendiente', resultado: 'Se activará si no paga' },
  { agente: 'Samuel', trabajo: 'Escalamiento', estado: 'No aplica aún', resultado: '—' },
  { agente: 'Sofía', trabajo: 'Reporte al propietario', estado: 'Preparado', resultado: 'Pendiente aprobación' },
  { agente: 'Gabriela', trabajo: 'Coordinación', estado: 'Activa', resultado: 'Recomienda esperar 48 h' },
]

function EquipoCobranzaContent() {
  return (
    <main className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Equipo IA de cobranza</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Un equipo de IA coordina la recuperación de cartera de punta a punta: contacta, registra
          promesas, propone acuerdos, escala casos críticos y reporta a los propietarios.
        </p>
      </header>

      {/* Las 6 personas */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PERSONAS.map((persona) => (
          <EquipoCobranzaPersona key={persona.id} persona={persona} />
        ))}
      </section>

      {/* Flujo conectado */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">Cómo trabajan juntos</h2>
          <p className="text-sm text-fg-muted max-w-2xl">
            Cada caso recorre el equipo en orden, y Gabriela coordina y te recomienda la decisión.
          </p>
        </div>

        <ol className="max-w-2xl">
          {FLUJO.map((paso, i) => {
            const StepIcon = paso.icon
            const isLast = i === FLUJO.length - 1
            return (
              <li key={paso.nombre} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Conector hairline */}
                {!isLast && (
                  <span
                    className="absolute left-[1.375rem] top-12 bottom-0 w-px bg-border"
                    aria-hidden="true"
                  />
                )}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                  <StepIcon weight="duotone" className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="pt-1">
                  <p className="text-sm font-semibold text-fg">{paso.nombre}</p>
                  <p className="text-sm text-fg-muted">{paso.descripcion}</p>
                </div>
                {!isLast && (
                  <ArrowDown
                    weight="bold"
                    className="absolute left-[1.25rem] top-[2.85rem] h-3 w-3 text-fg-muted/50"
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {/* Lote ejemplo en un caso */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-fg">En un caso, así se ve</h2>
          <p className="text-xs uppercase tracking-wide text-fg-muted">Ejemplo ilustrativo</p>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead>Trabajo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LOTE_EJEMPLO.map((row) => (
                <TableRow key={row.agente}>
                  <TableCell className="px-4 py-2.5 font-medium text-fg">{row.agente}</TableCell>
                  <TableCell className="px-4 py-2.5 text-fg-muted">{row.trabajo}</TableCell>
                  <TableCell className="px-4 py-2.5 text-fg-muted">{row.estado}</TableCell>
                  <TableCell className="px-4 py-2.5 text-fg-muted">{row.resultado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      </section>
    </main>
  )
}

export default function EquipoCobranzaPage() {
  return (
    <PageGuard module="cobranza">
      <EquipoCobranzaContent />
    </PageGuard>
  )
}
