'use client'

/**
 * /ai/pagos/recordatorios — Recordatorios (punto 8).
 *
 * PREVENCIÓN, no cobranza: la secuencia de avisos ANTES de que un pago se
 * atrase (3 días antes · día de vencimiento · 1 día después · 3 días después →
 * el caso pasa a cobranza). Esta superficie es UX sobre un backend de
 * recordatorios que todavía no existe → toda persistencia es un placeholder
 * honesto "Próximamente" (T-323: ningún botón finge funcionar). La config se
 * edita en estado local para que el equipo vea/diseñe la secuencia y el mensaje.
 *
 * Las operaciones profundas de cobros viven en /panel/inmobiliaria/cobros y la
 * cobranza humana en /ai/pagos/cola — acá solo se cross-linkea, no se duplica.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BellRinging,
  CalendarCheck,
  ClockClockwise,
  WarningCircle,
  EnvelopeSimple,
  ChatCircleDots,
  DeviceMobile,
  Sparkle,
  Info,
} from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

import { Button, Card, CardContent, Switch } from '@/components/ui'
import { Chip, SegmentedControl, Eyebrow } from '@leasefy/cadence'

import {
  SecuenciaRecordatorios,
  type PasoRecordatorio,
} from '@/components/inmobiliaria/pagos/SecuenciaRecordatorios'

// ── Secuencia de prevención (4 toques + escalación) ──────────────────────────
// Estática: describe el embudo de recordatorios estándar de la visión.

const SECUENCIA: PasoRecordatorio[] = [
  {
    id: 'preaviso',
    cuando: '3 días antes',
    titulo: 'Preaviso amable',
    descripcion: 'Recordamos al inquilino que su pago vence pronto, con el monto y el medio.',
    icon: BellRinging,
    tono: 'info',
  },
  {
    id: 'vencimiento',
    cuando: 'Día de vencimiento',
    titulo: 'Recordatorio del día',
    descripcion: 'Aviso el mismo día con el enlace de pago listo para completar en un toque.',
    icon: CalendarCheck,
    tono: 'info',
  },
  {
    id: 'post-1',
    cuando: '1 día después',
    titulo: 'Seguimiento temprano',
    descripcion: 'Si aún no hay pago, recordamos con tono cordial y ofrecemos ayuda.',
    icon: ClockClockwise,
    tono: 'warning',
  },
  {
    id: 'post-3',
    cuando: '3 días después',
    titulo: 'Último aviso de prevención',
    descripcion: 'Cierre del ciclo preventivo: si no hay pago, el caso pasa a cobranza.',
    icon: WarningCircle,
    tono: 'danger',
    esEscalacion: true,
  },
]

// ── Canales (multi-select, contrato §3 → <Chip>) ─────────────────────────────

type CanalId = 'whatsapp' | 'correo' | 'sms'

const CANALES: { id: CanalId; label: string; icon: typeof ChatCircleDots }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: ChatCircleDots },
  { id: 'correo', label: 'Correo', icon: EnvelopeSimple },
  { id: 'sms', label: 'SMS', icon: DeviceMobile },
]

// ── Tono del mensaje (excluyente, contrato §3 → <SegmentedControl>) ──────────

type TonoMensaje = 'cordial' | 'directo' | 'formal'

const TONOS: { value: TonoMensaje; label: string }[] = [
  { value: 'cordial', label: 'Cordial' },
  { value: 'directo', label: 'Directo' },
  { value: 'formal', label: 'Formal' },
]

// Texto de muestra por tono (preview en la card de mensaje).
const PREVIEW_POR_TONO: Record<TonoMensaje, string> = {
  cordial:
    '¡Hola, María! 👋 Te recordamos con cariño que tu arriendo de octubre vence en 3 días ($1.850.000). Puedes pagar en un toque desde aquí: leasefy.co/pago. ¡Gracias!',
  directo:
    'Hola María. Tu arriendo de octubre ($1.850.000) vence en 3 días. Paga aquí: leasefy.co/pago.',
  formal:
    'Estimada María, le recordamos que su canon de arrendamiento correspondiente a octubre ($1.850.000) vence en 3 días. Realice su pago en: leasefy.co/pago. Cordialmente, su inmobiliaria.',
}

const CUANDO_COBRANZA: { value: string; label: string }[] = [
  { value: '1', label: '1 día después del vencimiento' },
  { value: '3', label: '3 días después del vencimiento' },
  { value: '5', label: '5 días después del vencimiento' },
  { value: '7', label: '7 días después del vencimiento' },
]

function PagosRecordatorios() {
  // Estado local (no persiste: sin endpoint → "Próximamente").
  const [automatico, setAutomatico] = useState(true)
  const [canales, setCanales] = useState<Set<CanalId>>(new Set<CanalId>(['whatsapp', 'correo']))
  const [tono, setTono] = useState<TonoMensaje>('cordial')
  const [diasACobranza, setDiasACobranza] = useState('3')

  const toggleCanal = (id: CanalId) => {
    setCanales((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const canalesActivosLabel = useMemo(() => {
    const activos = CANALES.filter((c) => canales.has(c.id)).map((c) => c.label)
    return activos.length > 0 ? activos.join(' · ') : 'Ningún canal seleccionado'
  }, [canales])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="space-y-2">
        <h1 className="text-h2 text-fg">Recordatorios</h1>
        <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
          La secuencia de avisos que enviamos <span className="font-medium text-fg">antes</span> de
          que un pago se atrase. Es prevención: el objetivo es que el inquilino pague a tiempo y el
          caso nunca llegue a cobranza.
        </p>
      </header>

      {/* ── Secuencia de prevención ────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 lg:p-6 space-y-5">
          <div className="space-y-1">
            <Eyebrow>Secuencia de prevención</Eyebrow>
            <h2 className="text-base font-semibold text-fg">Cómo recordamos cada pago</h2>
            <p className="text-sm text-fg-muted max-w-2xl">
              Cuatro toques escalonados; si tras el último el pago sigue pendiente, el caso pasa al
              agente de cobranza.
            </p>
          </div>

          <SecuenciaRecordatorios pasos={SECUENCIA} />

          {/* Cross-link a la cobranza humana — NO se duplica la cola acá */}
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-fg-muted mt-0.5" weight="duotone" aria-hidden="true" />
            <p className="text-sm text-fg-muted">
              Los casos que ya escalaron se gestionan en la{' '}
              <Link
                href="/panel/inmobiliaria/pagos/cola"
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                cola de cobranza
              </Link>
              . El detalle de cobros y aging vive en{' '}
              <Link
                href="/panel/inmobiliaria/cobros"
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                Cobros
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Configuración (estado local; persistir = Próximamente) ─────────── */}
      <Card>
        <CardContent className="p-5 lg:p-6 space-y-6">
          <div className="space-y-1">
            <Eyebrow>Configuración</Eyebrow>
            <h2 className="text-base font-semibold text-fg">Cuándo y cómo enviamos</h2>
            <p className="text-sm text-fg-muted max-w-2xl">
              Ajusta el comportamiento de la secuencia. Estos cambios son una vista previa: la
              activación se conectará pronto.
            </p>
          </div>

          {/* Automático on/off */}
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3.5">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-fg">Recordatorios automáticos</p>
              <p className="text-xs text-fg-muted">
                Cuando está activo, la secuencia se envía sola en cada hito sin intervención.
              </p>
            </div>
            <Switch
              checked={automatico}
              onCheckedChange={setAutomatico}
              aria-label="Recordatorios automáticos"
              className="shrink-0 mt-0.5"
            />
          </div>

          {/* Canales (multi-select) */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-fg">Canales</p>
              <p className="text-xs text-fg-muted">Por dónde llegan los recordatorios al inquilino.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CANALES.map((canal) => {
                const CanalIcon = canal.icon
                const selected = canales.has(canal.id)
                return (
                  <Chip
                    key={canal.id}
                    selected={selected}
                    onClick={() => toggleCanal(canal.id)}
                    icon={<CanalIcon weight="duotone" />}
                  >
                    {canal.label}
                  </Chip>
                )
              })}
            </div>
          </div>

          {/* Tono (excluyente) */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-fg">Tono del mensaje</p>
              <p className="text-xs text-fg-muted">Define el estilo con el que hablamos.</p>
            </div>
            <SegmentedControl
              options={TONOS}
              value={tono}
              onChange={(v) => setTono(v)}
              aria-label="Tono del mensaje"
            />
          </div>

          {/* Cuándo pasa a cobranza (excluyente) */}
          <div className="space-y-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-fg">Cuándo pasa a cobranza</p>
              <p className="text-xs text-fg-muted">
                Tras este margen sin pago, el caso deja la prevención y escala al agente de cobranza.
              </p>
            </div>
            <SegmentedControl
              options={CUANDO_COBRANZA.map((o) => ({ value: o.value, label: `${o.value} días` }))}
              value={diasACobranza}
              onChange={(v) => setDiasACobranza(v)}
              aria-label="Días antes de pasar a cobranza"
            />
            <p className="text-xs text-fg-muted">
              {CUANDO_COBRANZA.find((o) => o.value === diasACobranza)?.label}
            </p>
          </div>

          {/* Guardar — T-323: sin endpoint → placeholder honesto deshabilitado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-fg-muted">
              Guardar la configuración estará disponible cuando se conecte el motor de recordatorios.
            </p>
            <Button hideArrow disabled title="Próximamente" className="shrink-0">
              Guardar (Próximamente)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Vista previa del mensaje ───────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="space-y-1">
            <Eyebrow>Vista previa</Eyebrow>
            <h2 className="text-base font-semibold text-fg">Ejemplo de mensaje</h2>
            <p className="text-sm text-fg-muted">
              Así se ve el preaviso de 3 días antes con el tono y los canales elegidos.
            </p>
          </div>

          {/* Burbuja de mensaje de muestra */}
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary-soft text-primary">
                <Sparkle className="h-4 w-4" weight="duotone" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                Preaviso · 3 días antes
              </span>
            </div>
            <p className="text-sm text-fg leading-relaxed">{PREVIEW_POR_TONO[tono]}</p>
          </div>

          <p className="text-xs text-fg-muted">
            Se enviará por: <span className="font-medium text-fg">{canalesActivosLabel}</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PagosRecordatoriosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosRecordatorios />
    </PageGuard>
  )
}
