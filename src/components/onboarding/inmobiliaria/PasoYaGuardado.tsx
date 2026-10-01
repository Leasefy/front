'use client'

import { ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { agenciaDelBorrador } from './agency-step-prefill'
import { MEMBER_ROLE_OPTIONS } from './members-step-schema'
import { WIZARD_STEPS } from './wizard-steps'
import type { OnboardingWizardStep } from '@/lib/hooks/use-onboarding-session'

/**
 * Un paso que YA quedó guardado, visto desde más adelante: en solo lectura.
 *
 * Nico, 2026-09-30: estando en «Confirmar» volvió a «Agencia», el formulario
 * salió vacío, lo llenó, y al continuar: «No puedes continuar esta sesión».
 * El micro sólo deja escribir el paso actual o el siguiente
 * (`isValidTransition`), y aceptar Habeas Data cierra la sesión: reenviar un
 * paso anterior es siempre un 409/403. Mostrar el formulario editable era
 * prometer algo que el back no deja hacer. Acá se ve lo que quedó, con la
 * salida real para cambiarlo.
 */

export interface PasoYaGuardadoProps {
  paso: OnboardingWizardStep
  draft: Record<string, unknown> | null | undefined
  /** El paso donde va la persona: a donde lleva «Volver». */
  pasoActual: OnboardingWizardStep | null
  onVolver: () => void
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

function Fila({ rotulo, valor, mono }: { rotulo: string; valor: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="w-40 shrink-0 text-caption text-fg-subtle">{rotulo}</dt>
      <dd className={mono ? 'font-mono text-body-sm text-fg tabular-nums' : 'text-body-sm text-fg'}>
        {valor ?? <span className="text-fg-subtle">—</span>}
      </dd>
    </div>
  )
}

function DondeSeCambia({ donde }: { donde: string }) {
  return (
    <p className="text-caption text-fg-subtle">
      Si algo quedó mal, lo cambias después de crear la inmobiliaria en {donde}.
    </p>
  )
}

export function PasoYaGuardado({ paso, draft, pasoActual, onVolver }: PasoYaGuardadoProps) {
  const etiquetaActual = WIZARD_STEPS.find((s) => s.key === pasoActual)?.label ?? 'tu paso'

  let contenido: React.ReactNode = null
  if (paso === 'agency' || paso === 'start') {
    const a = agenciaDelBorrador(draft) ?? {}
    const d = (a.address && typeof a.address === 'object' ? a.address : {}) as Record<string, unknown>
    const direccion = [texto(d.calle), texto(d.ciudad), texto(d.departamento)].filter(Boolean).join(', ')
    contenido = (
      <>
        <dl className="divide-y divide-border-faint">
          <Fila rotulo="Razón social" valor={texto(a.legalName)} />
          <Fila rotulo="NIT" valor={texto(a.nit)} mono />
          <Fila rotulo="Dirección" valor={direccion || null} />
          <Fila rotulo="Código postal" valor={texto(d.codigoPostal)} mono />
          <Fila rotulo="Correo de la cuenta" valor={texto(a.primaryContactEmail)} />
          <Fila rotulo="Teléfono de la cuenta" valor={texto(a.primaryContactPhone)} mono />
        </dl>
        <DondeSeCambia donde="Configuración → Perfil" />
      </>
    )
  } else if (paso === 'members') {
    const miembros = Array.isArray(draft?.members) ? (draft.members as Record<string, unknown>[]) : []
    contenido = (
      <>
        {miembros.length === 0 ? (
          <p className="text-body-sm text-fg-muted">No invitaste a nadie todavía.</p>
        ) : (
          <ul className="divide-y divide-border-faint">
            {miembros.map((m, i) => {
              const rol = MEMBER_ROLE_OPTIONS.find((o) => o.value === m.role)?.label ?? texto(m.role)
              return (
                <li key={`${texto(m.email) ?? i}`} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate text-body-sm text-fg">{texto(m.email)}</span>
                  <span className="shrink-0 text-caption text-fg-subtle">{rol}</span>
                </li>
              )
            })}
          </ul>
        )}
        <DondeSeCambia donde="Configuración → Equipo" />
      </>
    )
  } else if (paso === 'habeas_data') {
    contenido = (
      <p className="text-body-sm text-fg-muted">
        Aceptaste los términos y la política de tratamiento de datos.
      </p>
    )
  }

  return (
    <div className="space-y-5" data-testid="paso-ya-guardado">
      <p className="flex items-center gap-2 rounded-md bg-success-soft px-3.5 py-2.5 text-caption text-fg">
        <CheckCircle className="h-4 w-4 shrink-0 text-success" weight="fill" aria-hidden />
        Este paso ya quedó guardado.
      </p>
      <div className="space-y-4">{contenido}</div>
      <Button type="button" hideArrow className="w-full" onClick={onVolver} data-testid="volver-al-paso-actual">
        Volver a {etiquetaActual}
        <ArrowRight className="h-4 w-4" weight="bold" aria-hidden />
      </Button>
    </div>
  )
}
