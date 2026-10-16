'use client'

/**
 * ConsentimientoWhatsapp — cada persona autoriza (o retira) recibir el briefing de Naira por WhatsApp (P2, Nico
 * 15-10-2026). El texto que se acepta lo manda el micro con su versión; aquí sólo se muestra y se guarda.
 *
 * #13 (Nico, 15-10-2026: «cualquier pregunta, con un código (6 dígitos al correo o al panel)»): debajo, preguntarle a
 * Naira por WhatsApp. Dice hasta cuándo está verificado el número y pide un código de seis dígitos, que se muestra UNA
 * vez para escribírselo a Naira por WhatsApp. Sin celular registrado, dice dónde agregarlo.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { Collapse } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { guardarConsentimientoWhatsapp, leerConsentimientoWhatsapp, pedirCodigoWhatsapp } from '@/lib/api/naira/cliente'
import type { NairaWhatsappCode, NairaWhatsappConsent } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { fechaLegible } from '@/lib/naira/vocabulario-de-seguimiento'

/** El día de Bogotá de un instante ISO, para decir «hasta el 15 de noviembre». */
function diaEnBogota(iso: string): string | null {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return null
  return fechaLegible(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(fecha))
}

/** «004217» → «004 217»: más fácil de copiar a mano. */
function codigoEnDosPartes(codigo: string): string {
  return codigo.slice(0, 3) + ' ' + codigo.slice(3)
}

export function ConsentimientoWhatsapp(): JSX.Element | null {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? ''
  const [estado, setEstado] = useState<NairaWhatsappConsent | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const [codigo, setCodigo] = useState<NairaWhatsappCode | null>(null)
  const [pidiendo, setPidiendo] = useState(false)
  const [falloDelCodigo, setFalloDelCodigo] = useState(false)

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

  const pedirCodigo = async (): Promise<void> => {
    setPidiendo(true)
    setFalloDelCodigo(false)
    const r = await pedirCodigoWhatsapp(agencyId)
    setPidiendo(false)
    if (r.kind === 'ok') setCodigo(r.data)
    else setFalloDelCodigo(true)
  }

  // Un micro anterior a #13 no manda estos campos: sólo el interruptor, como antes.
  const conPreguntas = estado.telefonoRegistrado !== undefined
  const hasta = estado.verificadoHasta ? diaEnBogota(estado.verificadoHasta) : null

  return (
    <section className="space-y-4 rounded-lg border border-border bg-bg-elevated p-4" data-testid="naira-consentimiento-whatsapp">
      <div className="flex items-start justify-between gap-4">
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
      </div>

      {conPreguntas ? (
        <div className="space-y-2 border-t border-border pt-4" data-testid="naira-preguntas-whatsapp">
          <p className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.whatsapp.preguntas.titulo')}</p>
          {estado.telefonoRegistrado === false ? (
            <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.whatsapp.preguntas.sinTelefono')}</p>
          ) : (
            <>
              <p className="text-sm text-fg-muted">
                {hasta
                  ? t('inmobiliaria.ai.naira.whatsapp.preguntas.verificado', { fecha: hasta })
                  : t('inmobiliaria.ai.naira.whatsapp.preguntas.explicacion')}
              </p>
              <Collapse open={codigo !== null}>
                {codigo ? (
                  <div className="space-y-1 rounded-md bg-bg-subtle p-3" data-testid="naira-codigo-whatsapp">
                    <p className="font-mono text-2xl font-semibold tracking-[0.3em] text-fg">{codigoEnDosPartes(codigo.codigo)}</p>
                    <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.whatsapp.preguntas.codigo', { minutos: codigo.minutos })}</p>
                  </div>
                ) : null}
              </Collapse>
              {falloDelCodigo ? <p className="text-sm text-danger">{t('inmobiliaria.ai.naira.whatsapp.preguntas.noSalio')}</p> : null}
              <Button variant="outline" size="sm" disabled={pidiendo} onClick={() => void pedirCodigo()}>
                {codigo || hasta ? t('inmobiliaria.ai.naira.whatsapp.preguntas.otroCodigo') : t('inmobiliaria.ai.naira.whatsapp.preguntas.pedir')}
              </Button>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
