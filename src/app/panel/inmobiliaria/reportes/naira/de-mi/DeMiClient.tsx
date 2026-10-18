'use client'

/**
 * DeMiClient — «Qué dice Naira de mí» (P3, Nico 15-10-2026; concepto B-5 §4 y §5).
 *
 * La ficha de quien mira, con su autorización arriba (para cambiarla). El dueño, el admin y el gerente
 * (`naira:role-assignment-edit`) eligen además la ficha de una persona del equipo que autorizó: de a una, por nombre y sin
 * cifras en la lista (§5: sin ranking entre compañeros).
 */

import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { AutorizacionDeGestion } from '@/components/inmobiliaria/naira/AutorizacionDeGestion'
import { VistaDeNaira } from '@/components/inmobiliaria/naira/VistaDeNaira'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { leerEquipoQueAutorizo } from '@/lib/api/naira/cliente'
import type { NairaAuthorizedTeam } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useNairaFicha } from '@/lib/hooks/naira/use-naira-ficha'
import { useI18n } from '@/lib/i18n'

import { DeMiView } from './DeMiView'

const YO = 'yo'

function EsqueletoDeLaFicha(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  )
}

export function DeMiClient(): JSX.Element {
  const { t } = useI18n()
  const { canAccess } = usePermissionsContext()
  const agencyId = useAuth().agency?.id ?? ''
  const esGerencia = canAccess('naira', 'role-assignment-edit')
  const [equipo, setEquipo] = useState<NairaAuthorizedTeam['personas']>([])
  const [elegida, setElegida] = useState<string>(YO)
  const { estado, recargar } = useNairaFicha(elegida === YO ? null : elegida)

  useEffect(() => {
    if (!esGerencia) return
    let vivo = true
    void leerEquipoQueAutorizo(agencyId).then((r) => {
      if (vivo && r.kind === 'ok') setEquipo(r.data.personas)
    })
    return () => {
      vivo = false
    }
  }, [agencyId, esGerencia])

  const otros = equipo.filter((p) => p.userId !== (estado.kind === 'ok' && estado.data.persona.esQuienPregunta ? estado.data.persona.userId : ''))

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">{t('inmobiliaria.ai.naira.deMi.titulo')}</h1>
          <p className="max-w-2xl text-sm text-fg-muted">{t('inmobiliaria.ai.naira.deMi.noEsEvaluacion')}</p>
        </div>
        {esGerencia && otros.length > 0 ? (
          <div className="w-64 space-y-1">
            <label htmlFor="naira-ficha-de" className="text-caption text-fg-muted">
              {t('inmobiliaria.ai.naira.deMi.verFichaDe')}
            </label>
            <Select value={elegida} onValueChange={setElegida}>
              <SelectTrigger id="naira-ficha-de" aria-label={t('inmobiliaria.ai.naira.deMi.verFichaDe')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={YO}>{t('inmobiliaria.ai.naira.deMi.yo')}</SelectItem>
                {otros.map((p) => (
                  <SelectItem key={p.userId} value={p.userId}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {elegida === YO ? <AutorizacionDeGestion variante="interruptor" alCambiar={recargar} /> : null}

      <VistaDeNaira
        nombre="deMi"
        estado={estado}
        queEs={t('inmobiliaria.ai.naira.deMi.queEs')}
        volverA={{ label: t('inmobiliaria.ai.naira.memoria.volverAlPanel'), href: '/panel/inmobiliaria' }}
        onReintentar={recargar}
        esqueleto={<EsqueletoDeLaFicha />}
        renderOk={(ficha) => <DeMiView ficha={ficha} />}
      />
    </div>
  )
}
