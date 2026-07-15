'use client'

/**
 * /panel/inmobiliaria/avaluos-ia/enviar — Send the owner report (§15, agency side).
 *
 * Closes the loop from the result screen's "Enviar reporte al propietario":
 * pick a channel (WhatsApp / email / PDF), review the auto-drafted message,
 * preview what the owner will see, and send. Confirms with a sent state that
 * sets up post-send monitoring (Camila).
 *
 * In-page state, mock data — renders standalone for review.
 */

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  CheckCircle,
  WhatsappLogo,
  EnvelopeSimple,
  FilePdf,
  ArrowSquareOut,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { BrandContour, MonoLabel } from '@leasefy/cadence'

import { Button, Card, Textarea } from '@/components/ui'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #14130f 56%, #2a2824 140%)'
const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const RECOMENDADO = 3_450_000

type Channel = 'whatsapp' | 'email' | 'pdf'

const CHANNELS: { key: Channel; icon: Icon; label: string; detail: string; color: string }[] = [
  { key: 'whatsapp', icon: WhatsappLogo, label: 'WhatsApp', detail: '+57 310 555 1820', color: '#25D366' },
  { key: 'email', icon: EnvelopeSimple, label: 'Correo', detail: 'carlos.r@email.com', color: BLUE },
  { key: 'pdf', icon: FilePdf, label: 'PDF', detail: 'Descargar y enviar tú', color: '#C4503B' },
]

const CTA_LABEL: Record<Channel, string> = {
  whatsapp: 'Enviar por WhatsApp',
  email: 'Enviar por correo',
  pdf: 'Descargar PDF',
}

const DRAFT =
  'Hola Carlos, preparamos el avalúo de arriendo de tu inmueble en Cra. 43 #5-20, El Poblado. ' +
  'Acá puedes ver la recomendación y por qué llegamos a ese número:'

export default function EnviarReportePage() {
  const [channel, setChannel] = React.useState<Channel>('whatsapp')
  const [message, setMessage] = React.useState(DRAFT)
  const [sent, setSent] = React.useState(false)

  // ── Sent confirmation ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-[460px] pt-10 text-center space-y-5">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-success-soft">
            <CheckCircle className="w-8 h-8 text-success" weight="fill" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-fg">Reporte enviado a Carlos</h1>
            <p className="text-[14px] text-fg-muted leading-relaxed">
              {channel === 'pdf'
                ? 'Descargamos el PDF. Cuando se lo compartas, Camila vigila la respuesta.'
                : `Se lo enviamos por ${channel === 'whatsapp' ? 'WhatsApp' : 'correo'}. Camila te avisa cuando lo abra y responda.`}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button asChild hideArrow>
              <Link href="/panel/inmobiliaria/avaluos-ia/r1">
                Volver al avalúo
              </Link>
            </Button>
            <Button asChild variant="outline" hideArrow>
              <a
                href="/avaluo-ia/reporte"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver el reporte
                <ArrowSquareOut className="w-4 h-4 text-fg-muted" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[920px] space-y-6">
        {/* Header */}
        <Link
          href="/panel/inmobiliaria/avaluos-ia/r1"
          className="inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-fg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Resultado del avalúo
        </Link>

        <div className="space-y-1">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-fg">Enviar reporte al propietario</h1>
          <p className="text-[14px] text-fg-muted">Carlos verá el número sustentado y podrá aprobarlo desde el mismo enlace.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Compose (left) ──────────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">
            {/* Recipient */}
            <Card className="rounded-2xl p-5">
              <div className="mb-3"><MonoLabel>Para</MonoLabel></div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[14px] font-medium shrink-0 bg-surface-muted text-fg-muted">
                  CR
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-fg">Carlos Restrepo</p>
                  <p className="text-[12.5px] text-fg-muted">Propietario · Cra. 43 #5-20, El Poblado</p>
                </div>
              </div>
            </Card>

            {/* Channel */}
            <Card className="rounded-2xl p-5">
              <div className="mb-3"><MonoLabel>Cómo enviarlo</MonoLabel></div>
              <div className="grid grid-cols-3 gap-3">
                {CHANNELS.map((c) => {
                  const CIcon = c.icon
                  const isSel = channel === c.key
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChannel(c.key)}
                      aria-pressed={isSel}
                      className="relative rounded-xl border bg-surface p-3.5 text-left transition-all active:scale-[0.99]"
                      style={{ borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)', boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none' }}
                    >
                      <CIcon className="w-6 h-6 mb-2" weight="fill" style={{ color: c.color }} />
                      <p className="text-[13.5px] font-medium text-fg">{c.label}</p>
                      <p className="text-[11.5px] text-fg-muted truncate mt-0.5">{c.detail}</p>
                      {isSel && (
                        <span className="absolute top-3 right-3 inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ background: BLUE }}>
                          <Check className="w-2.5 h-2.5 text-white" weight="bold" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Message */}
            {channel !== 'pdf' && (
              <Card className="rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <MonoLabel>Mensaje</MonoLabel>
                  <span className="text-[11.5px] text-fg-subtle">Redactado por Sofía · editable</span>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="text-[13.5px] leading-relaxed resize-none"
                />
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2">
                  <span className="font-mono text-[11px] text-fg-subtle truncate flex-1">leasefy.co/r/aV3-9kQ</span>
                  <span className="text-[11px] text-fg-subtle">enlace del reporte</span>
                </div>
              </Card>
            )}
          </div>

          {/* ── Report preview (right) ──────────────────────────────────── */}
          <aside className="lg:sticky lg:top-6">
            <section className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-border-faint">
                <MonoLabel>Lo que verá Carlos</MonoLabel>
              </div>
              {/* mini ink preview */}
              <div className="p-4">
                <div className="relative overflow-hidden rounded-xl px-4 py-5 text-center" style={{ background: INK_GRADIENT }}>
                  <div className="pointer-events-none absolute -inset-x-2 top-[54%] h-[40%] text-white/[0.10]">
                    <BrandContour />
                  </div>
                  <div className="relative space-y-0.5">
                    <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/50">Canon recomendado</span>
                    <div className="text-[24px] font-semibold tracking-[-0.02em] text-white font-mono tabular-nums leading-none pt-1">
                      {COP.format(RECOMENDADO)}
                    </div>
                    <div className="text-[10px] text-white/50">por mes</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 rounded-full bg-surface-muted w-3/4" />
                  <div className="h-2 rounded-full bg-surface-muted w-full" />
                  <div className="h-2 rounded-full bg-surface-muted w-2/3" />
                </div>
                <Button asChild variant="outline" size="sm" hideArrow className="mt-4 w-full">
                  <a
                    href="/avaluo-ia/reporte"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver reporte completo
                    <ArrowSquareOut className="w-3.5 h-3.5 text-fg-muted" />
                  </a>
                </Button>
              </div>
            </section>

            {/* Send CTA */}
            <Button
              type="button"
              onClick={() => setSent(true)}
              size="lg"
              hideArrow
              className="mt-4 w-full"
            >
              <PaperPlaneTilt className="w-4 h-4" weight="fill" />
              {CTA_LABEL[channel]}
            </Button>
          </aside>
        </div>
      </div>
    </div>
  )
}
