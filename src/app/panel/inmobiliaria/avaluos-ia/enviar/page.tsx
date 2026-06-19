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

import { BrandContour } from '@leasefy/ui'

const BLUE = '#1A40FF'
const INK_GRADIENT = 'linear-gradient(150deg, #0B1220 56%, #122457 140%)'
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
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl" style={{ background: '#E9F3EE' }}>
            <CheckCircle className="w-8 h-8" weight="fill" style={{ color: '#2C7A53' }} />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#0B1220]">Reporte enviado a Carlos</h1>
            <p className="text-[14px] text-neutral-500 leading-relaxed">
              {channel === 'pdf'
                ? 'Descargamos el PDF. Cuando se lo compartas, Camila vigila la respuesta.'
                : `Se lo enviamos por ${channel === 'whatsapp' ? 'WhatsApp' : 'correo'}. Camila te avisa cuando lo abra y responda.`}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              href="/panel/inmobiliaria/avaluos-ia/r1"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-white text-sm font-medium"
              style={{ background: BLUE }}
            >
              Volver al avalúo
            </Link>
            <a
              href="/avaluo-ia/reporte"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-neutral-200 text-[#0B1220] text-sm font-medium hover:bg-neutral-50 transition-colors"
            >
              Ver el reporte
              <ArrowSquareOut className="w-4 h-4 text-neutral-500" />
            </a>
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
          className="inline-flex items-center gap-2 text-[13px] text-neutral-500 hover:text-[#0B1220] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Resultado del avalúo
        </Link>

        <div className="space-y-1">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[#0B1220]">Enviar reporte al propietario</h1>
          <p className="text-[14px] text-neutral-500">Carlos verá el número sustentado y podrá aprobarlo desde el mismo enlace.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Compose (left) ──────────────────────────────────────────── */}
          <div className="space-y-5 min-w-0">
            {/* Recipient */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400 mb-3">Para</p>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[14px] font-medium shrink-0" style={{ background: '#EEF1F6', color: '#3A4254' }}>
                  CR
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#0B1220]">Carlos Restrepo</p>
                  <p className="text-[12.5px] text-neutral-500">Propietario · Cra. 43 #5-20, El Poblado</p>
                </div>
              </div>
            </section>

            {/* Channel */}
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
              <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400 mb-3">Cómo enviarlo</p>
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
                      className="relative rounded-xl border bg-white p-3.5 text-left transition-all active:scale-[0.99]"
                      style={{ borderColor: isSel ? BLUE : 'rgba(0,0,0,0.10)', boxShadow: isSel ? `0 0 0 1px ${BLUE}` : 'none' }}
                    >
                      <CIcon className="w-6 h-6 mb-2" weight="fill" style={{ color: c.color }} />
                      <p className="text-[13.5px] font-medium text-[#0B1220]">{c.label}</p>
                      <p className="text-[11.5px] text-neutral-500 truncate mt-0.5">{c.detail}</p>
                      {isSel && (
                        <span className="absolute top-3 right-3 inline-flex items-center justify-center w-4 h-4 rounded-full" style={{ background: BLUE }}>
                          <Check className="w-2.5 h-2.5 text-white" weight="bold" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Message */}
            {channel !== 'pdf' && (
              <section className="rounded-2xl border border-neutral-200/80 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400">Mensaje</p>
                  <span className="text-[11.5px] text-neutral-400">Redactado por Sofía · editable</span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-[13.5px] text-[#0B1220] leading-relaxed resize-none focus:outline-none focus:border-[#1A40FF] focus:ring-1 focus:ring-[#1A40FF]"
                />
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
                  <span className="font-mono text-[11px] text-neutral-400 truncate flex-1">leasefy.co/r/aV3-9kQ</span>
                  <span className="text-[11px] text-neutral-400">enlace del reporte</span>
                </div>
              </section>
            )}
          </div>

          {/* ── Report preview (right) ──────────────────────────────────── */}
          <aside className="lg:sticky lg:top-6">
            <section className="rounded-2xl border border-neutral-200/80 bg-white overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
                <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-neutral-400">Lo que verá Carlos</p>
              </div>
              {/* mini ink preview */}
              <div className="p-4">
                <div className="relative overflow-hidden rounded-xl px-4 py-5 text-center" style={{ background: INK_GRADIENT }}>
                  <div className="pointer-events-none absolute -inset-x-2 top-[54%] h-[40%] text-white/[0.10]">
                    <BrandContour />
                  </div>
                  <div className="relative space-y-0.5">
                    <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.12em] text-white/50">Canon recomendado</span>
                    <div className="text-[24px] font-semibold tracking-[-0.02em] text-white tabular-nums leading-none pt-1">
                      {COP.format(RECOMENDADO)}
                    </div>
                    <div className="text-[10px] text-white/50">por mes</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="h-2 rounded-full bg-neutral-100 w-3/4" />
                  <div className="h-2 rounded-full bg-neutral-100 w-full" />
                  <div className="h-2 rounded-full bg-neutral-100 w-2/3" />
                </div>
                <a
                  href="/avaluo-ia/reporte"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-neutral-200 text-[12.5px] font-medium text-[#0B1220] hover:bg-neutral-50 transition-colors"
                >
                  Ver reporte completo
                  <ArrowSquareOut className="w-3.5 h-3.5 text-neutral-500" />
                </a>
              </div>
            </section>

            {/* Send CTA */}
            <button
              type="button"
              onClick={() => setSent(true)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white text-[15px] font-medium transition-colors"
              style={{ background: BLUE }}
            >
              <PaperPlaneTilt className="w-4 h-4" weight="fill" />
              {CTA_LABEL[channel]}
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
