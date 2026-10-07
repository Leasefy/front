'use client'

/**
 * Cobranza Config Page — Phase 2 rewrite (docs/front-cobranza-config.md).
 *
 * Wires the 3 sections that map to REAL endpoints the agent runtime reads,
 * plus a 4th purely informative section:
 *
 *   ① Facturación e integraciones → GET/PATCH /api/agency/:id/policy (useAgencyPolicy).
 *      🔴 El modelo de cobro con Leasefy (modelo y comisión de éxito) es SÓLO
 *      LECTURA desde el 04-10-2026 (Nico: «sólo Leasefy lo cambia desde
 *      /admin»); CRM y ERP siguen editables.
 *   ② Autonomía    → GET/PUT   /api/agency/:id/cobranza/autonomy  (useAutonomy)
 *   ③ Horario y frecuencia → informativo fijo (Ley 2300), sin inputs.
 *   ④ Reporte diario → enlaces + el switch de WhatsApp (mismo PATCH de policy).
 *
 * Lo que YA NO vive acá (2026-08-09, decisión de Nico):
 *   · El acuerdo general se edita en /cobranza/acuerdos — es el acuerdo más
 *     importante de la inmobiliaria, no un ajuste del sistema. Queda un puntero.
 *   · La cadencia de contacto salió del panel (ver nota al pie).
 *
 * Replaces the previous `/policies` (plural, decorative journal) wiring — see
 * docs/front-cobranza-config.md for the bug root cause. `usePoliciesConfig`,
 * `usePolicyVersions` and `usePolicyImpact` are intentionally NOT used here
 * anymore (orphaned — kept only in case a future "historial de cambios" view
 * reconnects the decorative journal).
 *
 * Edit gate: `canAccess('cobranza', 'configure')` (OWNER/ADMIN per backend
 * RBAC). VIEWER/CONTADOR see every section read-only — disabled inputs, no
 * save actions. Page-level access still requires `cobranza:view` (PageGuard),
 * matching the pattern in `compliance/opt-out/page.tsx`.
 *
 * 404 on any of the 3 GETs = onboarding incompleto for that agency — surfaced
 * per-section as a dedicated banner (`notProvisioned`), never a generic error.
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Warning, FloppyDisk, LockSimple } from '@phosphor-icons/react'
import { CrossFade, Presence, RadioCardGroup, RadioCard } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useAgencyPolicy,
  type AgencyPolicy,
  type AgencyPolicyPatchBody,
} from '@/lib/hooks/cobranza/use-agency-policy'
import { useAutonomy } from '@/lib/hooks/cobranza/use-autonomy'
import { NOMBRE_DEL_MODO, useModoDeCobranzaEnElPiloto } from '@/lib/hooks/cobranza/use-modo-de-cobranza-en-el-piloto'
import { putPilotoAutonomia, type AutonomiaModo } from '@/lib/api/piloto'
import { modoDelNivel } from '@/lib/cobranza/modo-del-nivel'
import { AuthContext } from '@/lib/auth/auth-context'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { CobranzaConfiguracionSkeleton } from '@/components/skeleton/panel/CobranzaConfiguracionSkeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { plataEnPantalla } from '@/lib/plata/escribir-plata'

// ─── Negotiation draft ──────────────────────────────────────────────────────

const PAYMENT_PLAN_OPTIONS = [1, 3, 6, 9, 12, 18, 24, 36]
const CRM_PROVIDERS = ['wasi', 'domus', 'webprop', 'sinco'] as const
const ERP_PROVIDERS = ['alegra', 'alegra_full', 'siigo_full', 'world_office'] as const
const BILLING_MODELS = ['performance', 'subscription', 'hybrid'] as const

/**
 * El nombre del modelo de cobro (nunca el slug crudo). `standard` es el que
 * guarda el registro de la inmobiliaria (`agency-step-schema.ts`) y el motor de
 * facturación del micro (`billing/engine.ts`): por deudor.
 */
const NOMBRE_DEL_MODELO_DE_COBRO: Record<string, string> = {
  standard: 'Estándar (por deudor)',
  performance: 'Por resultado',
  subscription: 'Suscripción',
  hybrid: 'Mixto',
}

interface NegotiationDraft {
  maxDiscountPct: number
  maxPlanMonths: number
  minPaymentCop: number
  autoEscalateAfterDays: number
  negotiationMaxAttempts: number
  allowHardshipPath: boolean
  allowedPaymentPlans: number[]
  billingModel: (typeof BILLING_MODELS)[number]
  successFeePct: number
  hybridPct: number
  monthlyMinCop: number
  perDeudorCop: number
  baseFeeCop: number
  crmProvider: (typeof CRM_PROVIDERS)[number]
  erpProvider: (typeof ERP_PROVIDERS)[number]
  siniestroCanonesThreshold: number | null
  dailyReportWhatsappEnabled: boolean
}

function toDraft(policy: AgencyPolicy): NegotiationDraft {
  return {
    maxDiscountPct: policy.maxDiscountPct,
    maxPlanMonths: policy.maxPlanMonths,
    minPaymentCop: policy.minPaymentCop,
    autoEscalateAfterDays: policy.autoEscalateAfterDays,
    negotiationMaxAttempts: policy.negotiationMaxAttempts,
    allowHardshipPath: policy.allowHardshipPath,
    allowedPaymentPlans: policy.allowedPaymentPlans ?? [],
    billingModel: (policy.billingModel as NegotiationDraft['billingModel']) ?? 'performance',
    successFeePct: policy.successFeePct,
    hybridPct: policy.hybridPct,
    monthlyMinCop: policy.monthlyMinCop,
    perDeudorCop: policy.perDeudorCop,
    baseFeeCop: policy.baseFeeCop,
    crmProvider: policy.crmProvider,
    erpProvider: policy.erpProvider,
    siniestroCanonesThreshold: policy.siniestroCanonesThreshold,
    dailyReportWhatsappEnabled: policy.dailyReportWhatsappEnabled,
  }
}

/**
 * Los campos de `NegotiationDraft` viajan en UN solo PATCH, pero NO son una
 * sola cosa. Antes vivían los tres grupos apilados dentro de «Negociación»,
 * así que el CRM y el modelo de facturación quedaban bajo el título «Límites
 * que el agente puede ofrecer al negociar con un deudor».
 */

/** El acuerdo general: lo que el agente puede cerrar sin preguntar. */
const CLAVES_ACUERDO = [
  'maxDiscountPct',
  'maxPlanMonths',
  'minPaymentCop',
  'negotiationMaxAttempts',
  'allowedPaymentPlans',
  'allowHardshipPath',
  'autoEscalateAfterDays',
  'siniestroCanonesThreshold',
] as const satisfies readonly (keyof NegotiationDraft)[]

/** Con qué sistemas de la inmobiliaria se habla. */
const CLAVES_COMERCIAL = [
  'crmProvider',
  'erpProvider',
] as const satisfies readonly (keyof NegotiationDraft)[]

/**
 * 🔴 Cómo le cobra Leasefy a la inmobiliaria (el modelo de cobro del SaaS y la
 * comisión de éxito del 8 %): lo cambia SÓLO Leasefy, desde /admin (Nico,
 * 04-10-2026). Acá se ve en sólo lectura y nunca viaja en el PATCH (el micro
 * igual lo rechazaría: 403 `MODELO_DE_COBRO_SOLO_LEASEFY`).
 */
const CLAVES_DEL_MODELO_DE_COBRO = [
  'billingModel',
  'successFeePct',
  'hybridPct',
  'monthlyMinCop',
  'perDeudorCop',
  'baseFeeCop',
] as const satisfies readonly (keyof NegotiationDraft)[]

function difieren(
  saved: NegotiationDraft | null,
  draft: NegotiationDraft | null,
  keys: readonly (keyof NegotiationDraft)[],
): boolean {
  if (!saved || !draft) return false
  return keys.some((k) => JSON.stringify(saved[k]) !== JSON.stringify(draft[k]))
}

const pesos = plataEnPantalla('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/**
 * El acuerdo, dicho en una frase.
 *
 * Es la parte que hacía falta: con once campos sueltos nadie sabe qué acordó.
 * Leer «hasta 20% de descuento, en 3, 6 o 12 cuotas» es la única forma de
 * revisar de un vistazo si el acuerdo dice lo que uno cree.
 */
function resumenAcuerdo(d: NegotiationDraft): string {
  const partes: string[] = []
  partes.push(
    d.maxDiscountPct > 0
      ? `hasta ${Math.round(d.maxDiscountPct * 100)}% de descuento`
      : 'sin descuento',
  )
  const planes = [...d.allowedPaymentPlans].sort((a, b) => a - b)
  if (planes.length > 0) {
    const enMeses = planes.map(String)
    const ultimo = enMeses.pop()
    partes.push(
      `en ${enMeses.length > 0 ? `${enMeses.join(', ')} o ${ultimo}` : ultimo} ${
        planes.length === 1 && planes[0] === 1 ? 'cuota' : 'cuotas'
      }`,
    )
  } else {
    partes.push('sin plazos a cuotas')
  }
  if (d.minPaymentCop > 0) partes.push(`con un pago mínimo de ${pesos.format(d.minPaymentCop)}`)
  partes.push(`y hasta ${d.negotiationMaxAttempts} ${d.negotiationMaxAttempts === 1 ? 'intento' : 'intentos'}`)
  return `El agente puede cerrar solo: ${partes.join(', ')}.`
}

/**
 * Incoherencias que hacen que el acuerdo no diga lo que aparenta.
 *
 * `maxPlanMonths` y `allowedPaymentPlans` NO son el mismo campo: el primero es
 * el tope que usa `calculatePaymentPlan` para armar el cronograma; el segundo
 * es la lista blanca que decide si la oferta se cierra sola o se escala. Se
 * pueden contradecir, y hoy en todos los tenants se contradicen.
 */
function avisosDelAcuerdo(d: NegotiationDraft): string[] {
  const avisos: string[] = []
  const planes = [...d.allowedPaymentPlans].sort((a, b) => a - b)
  const mayor = planes[planes.length - 1]

  if (d.maxPlanMonths < 1 && planes.length > 0) {
    avisos.push(
      `El plazo máximo está en ${d.maxPlanMonths}, así que el agente no puede armar ningún cronograma —aunque abajo estén marcados ${planes.join(', ')} meses. Súbelo a ${mayor} para que los plazos marcados sirvan.`,
    )
  } else if (mayor !== undefined && d.maxPlanMonths > 0 && mayor > d.maxPlanMonths) {
    avisos.push(
      `Están marcados ${mayor} meses, pero el plazo máximo es ${d.maxPlanMonths}: un deudor que pida ${mayor} cuotas te lo va a escalar en vez de cerrarlo.`,
    )
  }

  if (d.maxDiscountPct === 0 && planes.length === 0) {
    avisos.push('Sin descuento y sin plazos, el agente no tiene nada que ofrecer: todo termina escalado.')
  }

  return avisos
}

/** Partial diff — only keys that actually changed travel to the network. */
function diffPatch(saved: NegotiationDraft, draft: NegotiationDraft): AgencyPolicyPatchBody {
  const patch: Record<string, unknown> = {}
  ;(Object.keys(draft) as (keyof NegotiationDraft)[]).forEach((key) => {
    // El modelo de cobro no lo cambia la inmobiliaria: nunca viaja.
    if ((CLAVES_DEL_MODELO_DE_COBRO as readonly string[]).includes(key)) return
    const a = saved[key]
    const b = draft[key]
    const changed =
      Array.isArray(a) && Array.isArray(b)
        ? JSON.stringify([...a].sort((x, y) => x - y)) !== JSON.stringify([...b].sort((x, y) => x - y))
        : a !== b
    if (changed) patch[key] = b
  })
  return patch as AgencyPolicyPatchBody
}

/**
 * N-13 (QA-PAGOS-95 r2; main, con la recomendada; decisión de Nico 17-09): la
 * autonomía de la cobranza se dice con los TRES modos del Piloto (Manual ·
 * Copiloto · Automático), no con los cuatro peldaños del micro. Elegir uno lo
 * guarda en el Piloto (`PUT …/ai-hub/agentes/cobranza/autonomia`); desde ahí
 * manda ese modo (`piloto/autonomia.ts → modoEfectivo`).
 */
const MODOS_DEL_PILOTO: { value: AutonomiaModo; label: string; description: string }[] = [
  {
    value: 'sombra',
    label: 'Manual',
    description: 'El agente observa y propone; una persona decide y contacta al deudor.',
  },
  {
    value: 'copiloto',
    label: 'Copiloto',
    description: 'El agente prepara la acción y una persona la aprueba antes de contactar al deudor.',
  },
  {
    value: 'autonomo',
    label: 'Automático',
    description: 'El agente actúa solo, siempre bajo las guardas de Ley 2300 y habeas data.',
  },
]



// ─── Shared small components ────────────────────────────────────────────────

/**
 * Cómo le cobra Leasefy a la inmobiliaria, en sólo lectura. Lo que se muestra
 * depende del modelo, como lo cobra el motor de facturación del micro
 * (`billing/engine.ts`): estándar = mínimo o por deudor; por resultado = mínimo
 * o comisión de éxito sobre lo recuperado; mixto = tarifa base + porcentaje.
 */
function ModeloDeCobroDeLeasefy({ draft }: { draft: NegotiationDraft }) {
  const modelo: string = draft.billingModel
  const filas: { etiqueta: string; valor: string; testId: string }[] = []
  if (modelo === 'performance' || modelo === 'hybrid') {
    filas.push({
      etiqueta: modelo === 'hybrid' ? 'Porcentaje del modelo mixto' : 'Comisión de éxito',
      valor: `${Math.round((modelo === 'hybrid' ? draft.hybridPct : draft.successFeePct) * 10000) / 100} %`,
      testId: modelo === 'hybrid' ? 'valor-hybridPct' : 'valor-successFeePct',
    })
  }
  if (modelo === 'hybrid' || modelo === 'subscription') {
    filas.push({ etiqueta: 'Tarifa base', valor: pesos.format(draft.baseFeeCop), testId: 'valor-baseFeeCop' })
  }
  if (modelo === 'standard' || modelo === 'subscription') {
    filas.push({ etiqueta: 'Por deudor', valor: pesos.format(draft.perDeudorCop), testId: 'valor-perDeudorCop' })
  }
  filas.push({ etiqueta: 'Mínimo mensual', valor: pesos.format(draft.monthlyMinCop), testId: 'valor-monthlyMinCop' })

  return (
    <div className="rounded-lg border border-border bg-surface-muted p-4 space-y-3" data-testid="modelo-de-cobro">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <LockSimple className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        Modelo de cobro con Leasefy
      </p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <dt className="text-caption text-fg-muted">Modelo</dt>
          <dd className="text-foreground" data-testid="valor-billingModel">
            {NOMBRE_DEL_MODELO_DE_COBRO[modelo] ?? modelo}
          </dd>
        </div>
        {filas.map((f) => (
          <div key={f.testId}>
            <dt className="text-caption text-fg-muted">{f.etiqueta}</dt>
            <dd className="font-mono tabular-nums text-foreground" data-testid={f.testId}>
              {f.valor}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-caption text-fg-muted" data-testid="modelo-de-cobro-solo-leasefy">
        Lo define Leasefy. Para cambiarlo, escríbenos a{' '}
        <a className="text-primary underline-offset-2 hover:underline" href="mailto:hola@leasefy.co">
          hola@leasefy.co
        </a>
        .
      </p>
    </div>
  )
}

function NotProvisionedBanner({ testId }: { testId: string }) {
  return (
    <div
      data-testid={testId}
      className="rounded-md border border-warning/30 bg-warning-soft p-3 flex items-start gap-2"
    >
      <Warning weight="fill" className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
      <p className="text-sm text-foreground">
        Configuración no disponible — onboarding incompleto para esta agencia.
      </p>
    </div>
  )
}

function SectionErrorBanner({ testId, onRetry }: { testId: string; onRetry: () => void }) {
  return (
    <div
      data-testid={testId}
      className="rounded-md border border-danger/30 bg-danger-soft p-3 flex items-start gap-2"
    >
      <Warning weight="fill" className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <p className="text-sm text-danger">No pudimos cargar esta sección.</p>
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

// ─── Main content ───────────────────────────────────────────────────────────

const COBRANZA_BASE = '/panel/inmobiliaria/pagos/cobranza'

function CobranzaConfiguracionContent() {
  // De dónde vino la persona, para poder devolverla.
  const volverA = useSearchParams().get('volver')
  const { canAccess } = usePermissionsContext()
  const canEdit = canAccess('cobranza', 'configure')

  const policy = useAgencyPolicy()
  const autonomy = useAutonomy()
  // QA-IA-95: si la cobranza ya tiene su modo en el Piloto, ese manda y este nivel no decide nada.
  const modoLeido = useModoDeCobranzaEnElPiloto()
  // N-13 (r2): el modo elegido acá mismo (queda guardado en el Piloto).
  const [modoElegido, setModoElegido] = useState<AutonomiaModo | null>(null)
  const modoDelPiloto = modoElegido ?? modoLeido
  const agencyId = useContext(AuthContext)?.agency?.id ?? null

  // ── Negotiation local draft ────────────────────────────────────────────
  const [negDraft, setNegDraft] = useState<NegotiationDraft | null>(null)
  const negSavedRef = useRef<NegotiationDraft | null>(null)
  const [negSaving, setNegSaving] = useState(false)
  /**
   * El error del último guardado de la política, con el botón que lo disparó:
   * «Guardar facturación» y el «Guardar» del aviso diario mandan el mismo PATCH,
   * y el error se pinta junto al que se tocó. Antes se guardaba y nadie lo leía.
   */
  const [negError, setNegError] = useState<{ texto: string; donde: 'comercial' | 'aviso' } | null>(null)

  useEffect(() => {
    if (policy.data) {
      const d = toDraft(policy.data)
      setNegDraft(d)
      negSavedRef.current = d
    }
  }, [policy.data])

  const negDirty =
    !!negDraft && !!negSavedRef.current && JSON.stringify(negDraft) !== JSON.stringify(negSavedRef.current)

  // Cada bloque se guarda por su cuenta. El PATCH sigue siendo uno solo (viaja
  // el diff de TODO lo cambiado), pero un botón que se enciende porque tocaste
  // algo de otra tarjeta no se entiende.
  const acuerdoDirty = difieren(negSavedRef.current, negDraft, CLAVES_ACUERDO)
  const comercialDirty = difieren(negSavedRef.current, negDraft, CLAVES_COMERCIAL)
  const avisoDirty = difieren(negSavedRef.current, negDraft, ['dailyReportWhatsappEnabled'])

  const updateNeg = useCallback(
    <K extends keyof NegotiationDraft>(key: K, value: NegotiationDraft[K]) => {
      setNegDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    [],
  )

  const toggleAllowedPlan = useCallback((months: number, checked: boolean) => {
    setNegDraft((prev) => {
      if (!prev) return prev
      const next = checked
        ? [...prev.allowedPaymentPlans, months]
        : prev.allowedPaymentPlans.filter((m) => m !== months)
      return { ...prev, allowedPaymentPlans: Array.from(new Set(next)).sort((a, b) => a - b) }
    })
  }, [])

  const handleSaveNegotiation = useCallback(async (donde: 'comercial' | 'aviso' = 'comercial') => {
    if (!negDraft || !negSavedRef.current) return
    const patch = diffPatch(negSavedRef.current, negDraft)
    if (Object.keys(patch).length === 0) return
    setNegSaving(true)
    setNegError(null)
    try {
      await policy.patchPolicy(patch)
      negSavedRef.current = negDraft
    } catch (err) {
      // «Conexión» sólo si no hubo respuesta; un 400 dice qué está mal; un 5xx, que fue nuestro.
      setNegError({
        donde,
        texto: mensajeParaLaPersona(err, {
          porDefecto: 'No pudimos guardar los cambios de negociación.',
          accion: 'guardar los cambios de negociación',
        }),
      })
    } finally {
      setNegSaving(false)
    }
  }, [negDraft, policy])

  const handleCancelNegotiation = useCallback(() => {
    if (negSavedRef.current) setNegDraft(negSavedRef.current)
  }, [])

  // ── Autonomy ────────────────────────────────────────────────────────────
  const [autonomySaving, setAutonomySaving] = useState(false)
  const [autonomyError, setAutonomyError] = useState<string | null>(null)

  const elegirModoDelPiloto = useCallback(
    async (modo: AutonomiaModo) => {
      if (!canEdit || !agencyId) return
      setAutonomySaving(true)
      setAutonomyError(null)
      const r = await putPilotoAutonomia(agencyId, 'cobranza', modo)
      setAutonomySaving(false)
      if (r.ok) {
        setModoElegido(modo)
        return
      }
      setAutonomyError(
        mensajeParaLaPersona(r.fallo ?? r.error, {
          porDefecto: 'No pudimos guardar el modo de la cobranza.',
          accion: 'guardar el modo de la cobranza',
        }),
      )
    },
    [agencyId, canEdit],
  )


  // ── Full-page skeleton while the 2 resources settle ────────────────────
  const policySettled = !policy.isLoading || !!policy.data || policy.notProvisioned
  const autonomySettled = !autonomy.isLoading || !!autonomy.data || autonomy.notProvisioned

  // Movimiento: esqueleto → configuración en un `CrossFade` (el mismo nodo en
  // las dos ramas). Adentro, los campos de cada modelo de cobro se cruzan al
  // cambiarlo, y los errores y botones de guardar entran y salen con `Presence`.
  if (!policySettled || !autonomySettled) {
    return (
      <CrossFade swapKey="esqueleto">
        <CobranzaConfiguracionSkeleton />
      </CrossFade>
    )
  }

  return (
    <CrossFade swapKey="configuracion">
    <div className="p-4 md:p-6 space-y-6 pb-24">
      <div>
        {/* Vuelta al origen. Se llega acá desde «Ajustar» en Acuerdos de pago y
            no había cómo volver: el flujo quedaba cortado en una pantalla de
            configuración larga. El enlace sólo aparece si de verdad vienes de
            ahí (`?volver=acuerdos`), para no inventar una vuelta que no existe
            cuando entraste por el menú. */}
        {volverA === 'acuerdos' && (
          <Button asChild variant="ghost" size="sm" hideArrow className="-ml-2 mb-2">
            <Link href={`${COBRANZA_BASE}/acuerdos`}>
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Volver a Acuerdos de pago
            </Link>
          </Button>
        )}
        <h1 className="text-h2 text-fg">
          Configuración de cobranza
        </h1>
        {!canEdit && (
          <p className="mt-1 text-sm text-fg-muted line-clamp-2 max-w-2xl" data-testid="readonly-banner">
            Tu rol solo tiene acceso de lectura a esta configuración.
          </p>
        )}
      </div>

      {/* El acuerdo general NO vive acá — ni siquiera como puntero. Se arma en
          /cobranza/acuerdos, junto a los acuerdos puntuales. Dejar una tarjeta
          con el título «Acuerdo general» acá seguía diciendo que esto era su
          lugar. Ver la nota al pie del archivo. */}

      {/* ① Facturación e integraciones ──────────────────────────────────────
          Vivían dentro de «Negociación», bajo el subtítulo «Límites que el
          agente puede ofrecer al negociar con un deudor». No son eso: son cómo
          nos paga la inmobiliaria y con qué sistemas hablamos. Comparten el
          mismo PATCH de policy, no la misma pregunta. */}
      {!policy.notProvisioned && negDraft && (
        <section
          data-testid="section-comercial"
          className="rounded-lg border border-border bg-card p-6 space-y-4"
          aria-labelledby="heading-comercial"
        >
          <div>
            <h2 id="heading-comercial" className="text-xl font-semibold text-foreground">
              Facturación e integraciones
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              Cómo te cobra Leasefy el servicio y con qué sistemas de la inmobiliaria se sincroniza.
            </p>
          </div>
          <div className="border-t border-border-faint" />

          {/* 🔴 Cómo te cobra Leasefy: SÓLO LECTURA (Nico, 04-10-2026: «sólo
              Leasefy lo cambia desde /admin»). Antes se cambiaba acá el modelo
              de facturación y la comisión de éxito del 8 %. */}
          <ModeloDeCobroDeLeasefy draft={negDraft} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="crmProvider" className="text-sm">
                CRM
              </Label>
              <Select
                value={negDraft.crmProvider}
                onValueChange={(v) => updateNeg('crmProvider', v as NegotiationDraft['crmProvider'])}
                disabled={!canEdit}
              >
                <SelectTrigger id="crmProvider" data-testid="field-crmProvider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRM_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="erpProvider" className="text-sm">
                ERP
              </Label>
              <Select
                value={negDraft.erpProvider}
                onValueChange={(v) => updateNeg('erpProvider', v as NegotiationDraft['erpProvider'])}
                disabled={!canEdit}
              >
                <SelectTrigger id="erpProvider" data-testid="field-erpProvider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ERP_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Presence show={comercialDirty} direction="none" initial={false}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={handleCancelNegotiation}
                  data-testid="cancel-comercial"
                >
                  Descartar
                </Button>
              </Presence>
              <Button
                size="sm"
                className="min-h-[44px]"
                data-testid="save-comercial"
                disabled={!comercialDirty || negSaving}
                onClick={() => void handleSaveNegotiation('comercial')}
              >
                {negSaving ? (
                  <Spinner size="sm" variant="current" className="mr-1" />
                ) : (
                  <FloppyDisk className="h-4 w-4 mr-1" />
                )}
                Guardar integraciones
              </Button>
            </div>
          )}
          <Presence as="p" show={negError?.donde === 'comercial'} role="alert" className="text-sm text-danger text-right" data-testid="comercial-save-error">
              {negError?.texto}
          </Presence>
        </section>
      )}

      {/* ② Autonomía ────────────────────────────────────────────────────── */}
      <section
        data-testid="section-autonomia"
        className="rounded-lg border border-border bg-card p-6 space-y-4"
        aria-labelledby="heading-autonomia"
      >
        <div>
          <h2 id="heading-autonomia" className="text-xl font-semibold text-foreground">
            Autonomía
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Cuánto del ciclo de cobranza corre sin intervención humana.
          </p>
        </div>
        <div className="border-t border-border-faint" />

        {autonomy.notProvisioned && <NotProvisionedBanner testId="autonomia-not-provisioned" />}

        {!autonomy.notProvisioned && autonomy.error && !autonomy.data && (
          <SectionErrorBanner testId="autonomia-error" onRetry={() => void autonomy.refetch()} />
        )}

        {modoDelPiloto && (
          <div data-testid="autonomia-en-el-piloto" className="rounded-md border border-border bg-surface-muted p-4 text-sm text-fg space-y-2">
            <p>
              La cobranza sigue el modo que elegiste en el Piloto automático: <strong>{NOMBRE_DEL_MODO[modoDelPiloto]}</strong>.
              Este nivel ya no decide nada mientras ese modo esté elegido.
            </p>
            <Link href="/panel/inmobiliaria/piloto" className="font-medium text-primary hover:underline">
              Cambiar el modo en el Piloto (Autonomía)
            </Link>
          </div>
        )}

        {!modoDelPiloto && !autonomy.notProvisioned && autonomy.data && (
          <>
            {/* N-13 (r2): los tres modos del Piloto. Hoy rige el peldaño de
                antes; se dice a qué modo equivale y elegir lo guarda en el Piloto. */}
            <p className="text-sm text-fg-muted" data-testid="autonomia-tres-modos">
              Los modos son los del Piloto automático: Manual · Copiloto · Automático. Hoy la cobranza
              sigue lo que tenía antes, que equivale a <strong>{NOMBRE_DEL_MODO[modoDelNivel(autonomy.data.autonomyLevel)]}</strong>.
              Al elegir un modo queda guardado en el Piloto.
            </p>
            <RadioCardGroup
              orientation="vertical"
              className="space-y-2"
              value={modoDelNivel(autonomy.data.autonomyLevel)}
              onValueChange={(v) => void elegirModoDelPiloto(v as AutonomiaModo)}
            >
              {MODOS_DEL_PILOTO.map((opt) => (
                <RadioCard
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  description={opt.description}
                  disabled={!canEdit || autonomySaving || !agencyId}
                  data-testid={`autonomia-modo-${opt.value}`}
                />
              ))}
            </RadioCardGroup>

            <div className="flex items-center gap-2 text-sm">
              {autonomy.data.requiresHumanApproval ? (
                <Badge variant="warning">Requiere aprobación humana</Badge>
              ) : (
                <Badge variant="success">Despacho automático</Badge>
              )}
              {autonomySaving && <Spinner size="sm" variant="muted" data-testid="autonomy-saving" />}
            </div>

            <Presence as="p" show={Boolean(autonomyError)} role="alert" className="text-sm text-danger" data-testid="autonomia-save-error">
                {autonomyError}
            </Presence>
          </>
        )}
      </section>

      {/* ③ Cadencia de contacto — SACADA del panel (ver nota al pie).
          Cuándo y por qué canal contacta el agente lo afinamos nosotros, no la
          inmobiliaria: misma decisión que sacó a Playbooks. Lo que a ella sí le
          toca de horarios (Ley 2300) es la sección de abajo, informativa. */}

      {/* ④ Horario y frecuencia — informativo, Ley 2300, sin inputs ──────── */}
      <section
        data-testid="section-horario"
        className="rounded-lg border border-border bg-card p-6 space-y-3"
        aria-labelledby="heading-horario"
      >
        <div>
          <h2 id="heading-horario" className="text-xl font-semibold text-foreground">
            Horario y frecuencia
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Definido por Ley 2300 — sin excepciones configurables por la agencia.
          </p>
        </div>
        <div className="border-t border-border-faint" />
        <ul className="text-sm text-foreground list-disc pl-5 space-y-1">
          <li>Lunes a viernes: 07:00–19:00</li>
          <li>Sábados: 08:00–15:00</li>
          <li>Sin contacto domingos ni festivos</li>
          <li>Máximo 1 contacto por día</li>
          <li>Máximo 1 contacto por canal por semana</li>
        </ul>
      </section>

      {/*
        Reporte diario — su pantalla salió del menú porque lo que había que
        mirar (alertas y deudores que más pesan) subió al Resumen. Pero los
        umbrales y la suscripción son configuración de la inmobiliaria, de la
        misma familia que los acuerdos de arriba, así que su puerta vive acá.
        Sin esto quedaban sólo alcanzables escribiendo la URL.
      */}
      <section
        data-testid="section-reporte"
        className="rounded-lg border border-border bg-card p-6 space-y-3"
        aria-labelledby="heading-reporte"
      >
        <div>
          <h2 id="heading-reporte" className="text-xl font-semibold text-foreground">
            Reporte diario
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            Cuándo avisarte y a quién. Lo que hay que mirar cada día ya aparece
            en el resumen de Cobranza.
          </p>
        </div>
        <div className="border-t border-border-faint" />

        {/* Este switch vivía dentro de «Negociación», entre el CRM y el ERP.
            Es del reporte diario: vive acá. Guarda en el mismo PATCH de policy,
            por eso tiene su propio botón en vez de compartir el del acuerdo. */}
        {!policy.notProvisioned && negDraft && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
            <Label htmlFor="dailyReportWhatsappEnabled" className="text-sm cursor-pointer">
              Enviar el reporte diario por WhatsApp
            </Label>
            <div className="flex items-center gap-3 shrink-0">
              <Presence show={canEdit && avisoDirty} direction="none" initial={false}>
                <Button
                  size="sm"
                  variant="secondary"
                  hideArrow
                  data-testid="save-aviso"
                  disabled={negSaving}
                  onClick={() => void handleSaveNegotiation('aviso')}
                >
                  Guardar
                </Button>
              </Presence>
              <Switch
                id="dailyReportWhatsappEnabled"
                data-testid="field-dailyReportWhatsappEnabled"
                checked={negDraft.dailyReportWhatsappEnabled}
                disabled={!canEdit}
                onCheckedChange={(checked) => updateNeg('dailyReportWhatsappEnabled', checked)}
              />
            </div>
          </div>
        )}
        <Presence as="p" show={negError?.donde === 'aviso'} role="alert" className="text-sm text-danger" data-testid="aviso-save-error">
            {negError?.texto}
        </Presence>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cobranza/reporte/thresholds">
              Umbrales de alerta
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href="/panel/inmobiliaria/pagos/cobranza/reporte/suscripcion">
              Suscripción
            </Link>
          </Button>
          <Button asChild variant="link" size="sm" hideArrow className="px-1">
            <Link href="/panel/inmobiliaria/pagos/cobranza/reporte">
              Ver histórico y exportar CSV
            </Link>
          </Button>
        </div>
      </section>
    </div>
    </CrossFade>
  )
}

/**
 * NOTA — «Cadencia de contacto» fuera del panel (2026-08-09, decisión de Nico).
 *
 * Era un editor por etapa de cartera (S0…SX) para elegir día, canal y motivo de
 * cada toque. Cuándo y por qué canal contacta el agente lo afinamos nosotros,
 * no la inmobiliaria — la misma decisión que sacó a Playbooks del panel: qué
 * dice y cuándo habla el agente lo define Leasefy.
 *
 * Lo que a la inmobiliaria SÍ le toca de horarios es la Ley 2300, y eso sigue
 * en «Horario y frecuencia», que es informativo y no se edita.
 *
 * Se quitó el JSX y TODA su maquinaria (hook `useCadence`, borrador, handlers,
 * `STAGE_LABELS`, `CHANNEL_LABELS`). Dejar el hook habría seguido pidiendo
 * `GET /cobranza/cadence` en cada carga para una UI que ya no existe.
 * El endpoint y `use-cadence.ts` quedan intactos: el agente los sigue leyendo.
 */

/**
 * NOTA — «Acuerdo general» mudado a Acuerdos de pago (2026-08-09).
 *
 * Vivía acá como §Negociación y el enlace desde Acuerdos traía hasta esta
 * pantalla. Pero el marco general —«si el deudor cabe en estas condiciones,
 * ciérralo»— no es un ajuste del sistema: es el acuerdo más importante que tiene
 * la inmobiliaria, y se arma junto a los acuerdos puntuales. Ahora se edita en
 * `AcuerdosGeneralesCard`, plegado hasta que hace falta, con el acuerdo dicho
 * en una frase arriba. Acá queda un puntero para quien lo busque en el lugar
 * viejo.
 *
 * Lo que se quedó son los campos que de verdad son configuración: facturación,
 * CRM/ERP, autonomía, horario y reporte diario.
 */

export default function CobranzaConfiguracionPage() {
  return (
    <PageGuard module="cobranza" action="view">
      <CobranzaConfiguracionContent />
    </PageGuard>
  )
}
