'use client'

/**
 * AutorizacionDeGestion — P3 (Nico, 15-10-2026: «por persona, con transparencia… + autorización del empleado»; concepto
 * B-5 §3): cada persona autoriza (o no) que Naira le atribuya datos de su gestión. El texto lo manda el micro con su
 * versión; aquí se muestra y se guarda.
 *
 * Dos formas:
 *   - `pregunta`: arriba del briefing, SOLO mientras la persona no ha decidido («la primera vez que entra a Naira»), con
 *     «Autorizo» y «Ahora no» (las dos son una decisión; sin autorización Naira la trata por rol y por equipo);
 *   - `interruptor`: en «Qué dice Naira de mí», siempre, para cambiarla. Al retirarla, el micro borra lo atribuido.
 */
import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

import { Collapse } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { guardarAutorizacionDeGestion, leerAutorizacionDeGestion } from '@/lib/api/naira/cliente'
import type { NairaManagementAuthorization } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { RUTA_DE_LO_QUE_DICE_NAIRA } from '@/lib/nav/rutas-de-naira'

export interface AutorizacionDeGestionProps {
  readonly variante: 'pregunta' | 'interruptor'
  /** Después de guardar (la ficha se vuelve a leer: con o sin la sección de gestión). */
  readonly alCambiar?: (estado: NairaManagementAuthorization['estado']) => void
}

export function AutorizacionDeGestion({ variante, alCambiar }: AutorizacionDeGestionProps): JSX.Element | null {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? ''
  const [estado, setEstado] = useState<NairaManagementAuthorization | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let vivo = true
    void leerAutorizacionDeGestion(agencyId).then((r) => {
      if (vivo && r.kind === 'ok') setEstado(r.data)
    })
    return () => {
      vivo = false
    }
  }, [agencyId])

  if (estado === null) return null

  const decidir = async (autorizar: boolean): Promise<void> => {
    setGuardando(true)
    setFallo(false)
    const r = await guardarAutorizacionDeGestion(agencyId, autorizar)
    setGuardando(false)
    if (r.kind === 'ok') {
      setEstado(r.data)
      alCambiar?.(r.data.estado)
    } else setFallo(true)
  }

  if (variante === 'pregunta') {
    return (
      <Collapse open={estado.estado === 'sin_decidir'}>
        <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-4" data-testid="naira-autorizacion-pregunta">
          <p className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.deMi.autorizacion.pregunta')}</p>
          <p className="text-sm text-fg-muted">{estado.texto}</p>
          {fallo ? <p className="text-sm text-danger">{t('inmobiliaria.ai.naira.deMi.autorizacion.noSeGuardo')}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={guardando} onClick={() => void decidir(true)}>
              {t('inmobiliaria.ai.naira.deMi.autorizacion.autorizo')}
            </Button>
            <Button size="sm" variant="outline" disabled={guardando} onClick={() => void decidir(false)}>
              {t('inmobiliaria.ai.naira.deMi.autorizacion.ahoraNo')}
            </Button>
            <Link href={RUTA_DE_LO_QUE_DICE_NAIRA} className="text-sm text-fg-muted underline underline-offset-4 hover:text-fg">
              {t('inmobiliaria.ai.naira.deMi.autorizacion.verQueGuarda')}
            </Link>
          </div>
        </section>
      </Collapse>
    )
  }

  return (
    <section className="flex items-start justify-between gap-4 rounded-lg border border-border bg-bg-elevated p-4" data-testid="naira-autorizacion-interruptor">
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.deMi.autorizacion.titulo')}</p>
        <p className="text-sm text-fg-muted">{estado.texto}</p>
        {estado.estado === 'autorizada' ? <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.deMi.autorizacion.retirar')}</p> : null}
        {fallo ? <p className="text-sm text-danger">{t('inmobiliaria.ai.naira.deMi.autorizacion.noSeGuardo')}</p> : null}
      </div>
      <Switch
        checked={estado.estado === 'autorizada'}
        disabled={guardando}
        onCheckedChange={(v) => void decidir(v)}
        aria-label={t('inmobiliaria.ai.naira.deMi.autorizacion.titulo')}
      />
    </section>
  )
}
