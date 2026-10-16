'use client'

/**
 * ConsentimientoWhatsapp — cada persona autoriza (o retira) recibir el briefing de Naira por WhatsApp (P2, Nico
 * 15-10-2026). El texto que se acepta lo manda el micro con su versión; aquí sólo se muestra y se guarda.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { Switch } from '@/components/ui/switch'
import { guardarConsentimientoWhatsapp, leerConsentimientoWhatsapp } from '@/lib/api/naira/cliente'
import type { NairaWhatsappConsent } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

export function ConsentimientoWhatsapp(): JSX.Element | null {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? ''
  const [estado, setEstado] = useState<NairaWhatsappConsent | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let vivo = true
    void leerConsentimientoWhatsapp(agencyId).then((r) => {
      if (vivo && r.kind === 'ok') setEstado(r.data)
    })
    return () => {
      vivo = false
    }
  }, [agencyId])

  if (estado === null) return null

  const cambiar = async (otorgar: boolean): Promise<void> => {
    setGuardando(true)
    setFallo(false)
    const r = await guardarConsentimientoWhatsapp(agencyId, otorgar)
    setGuardando(false)
    if (r.kind === 'ok') setEstado(r.data)
    else setFallo(true)
  }

  return (
    <section className="flex items-start justify-between gap-4 rounded-lg border border-border bg-bg-elevated p-4" data-testid="naira-consentimiento-whatsapp">
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.whatsapp.titulo')}</p>
        <p className="text-sm text-fg-muted">{estado.texto}</p>
        {fallo ? <p className="text-sm text-danger">{t('inmobiliaria.ai.naira.whatsapp.noSeGuardo')}</p> : null}
      </div>
      <Switch
        checked={estado.otorgado}
        disabled={guardando}
        onCheckedChange={(v) => void cambiar(v)}
        aria-label={t('inmobiliaria.ai.naira.whatsapp.titulo')}
      />
    </section>
  )
}
