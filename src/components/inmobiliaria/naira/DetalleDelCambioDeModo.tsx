'use client'

/**
 * DetalleDelCambioDeModo — el cajón de una propuesta de Naira de cambiar el modo de un agente del Piloto (paso 2 de «Naira
 * lo sabe todo», Nico 18-10-2026: «Propone, una persona aprueba», «Solo en el panel», «Desde el cajón»).
 *
 * Cuerpo: qué cambio, por qué (con las cifras del micro, en el idioma del panel), en qué modo está hoy y hasta cuándo
 * vale; si ya se decidió, su estado y, si no se aplicó, por qué. Pie: «Aprobar» y «Rechazar» mientras esté por decidir.
 * Subir a Automático pasa por `ConfirmarAutomatico` (explica y, si el micro lo pide, las seis cifras del segundo factor de
 * ahora), como el selector del Piloto; bajar o pasar a Manual se aprueba directo. Lo monta `CajonDeAprobacion`.
 */

import type { JSX } from 'react'
import { useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { ConfirmarAutomatico } from '@/components/inmobiliaria/piloto/ConfirmarAutomatico'
import { Button } from '@/components/ui/button'
import { CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { decidirCambioDeModo, type CambioDeModo } from '@/lib/api/naira/cambios-de-modo'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { LineaConFecha } from './FilaDeSeguimiento'

const BASE = 'inmobiliaria.ai.naira.cambiosDeModo'

export const CLAVE_DEL_MODO = {
  sombra: 'inmobiliaria.piloto.flota.modo.sombra',
  copiloto: 'inmobiliaria.piloto.flota.modo.copiloto',
  autonomo: 'inmobiliaria.piloto.flota.modo.autonomo',
} as const

type Traductor = (clave: string, params?: Record<string, string>) => string

/** «Pasar a Niti (calidad de las publicaciones) a Manual». */
export function tituloDelCambioDeModo(t: Traductor, c: CambioDeModo): string {
  return t(`${BASE}.titulos.${c.regla}`, { agente: c.nombre, modo: t(CLAVE_DEL_MODO[c.a]) })
}

/** El porqué, con las cifras del micro (las que falten, en 0). */
export function porQueDelCambioDeModo(t: Traductor, c: CambioDeModo): string {
  const cifras: Record<string, number> = { dias: 0, aprobadas: 0, descartadas: 0, solas: 0, mal: 0, esperando: 0, ...c.cifras }
  return t(`${BASE}.porque.${c.regla}`, Object.fromEntries(Object.entries(cifras).map(([k, v]) => [k, String(v)])))
}

type Aviso = { readonly tono: 'bien' | 'mal'; readonly texto: string } | null

export function DetalleDelCambioDeModo({ cambio, onDecidido }: { readonly cambio: CambioDeModo; readonly onDecidido: () => void }): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? ''
  const [ocupado, setOcupado] = useState<'aprobar' | 'rechazar' | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [decidido, setDecidido] = useState(false)
  const [confirmandoSubir, setConfirmandoSubir] = useState(false)
  const porDecidir = cambio.estado === 'abierto' && !decidido

  async function decidir(decision: 'aprobar' | 'rechazar'): Promise<{ ok: boolean; fallo?: unknown }> {
    setOcupado(decision)
    setAviso(null)
    const r = await decidirCambioDeModo(agencyId, cambio.id, decision)
    setOcupado(null)
    if (r.kind === 'segundo_factor') return { ok: false, fallo: r.fallo }
    if (r.kind === 'ok') {
      const { resultado, razon } = r.resultado
      setAviso(
        resultado === 'no_aplicado' && razon
          ? { tono: 'mal', texto: t(`${BASE}.razones.${razon}`) }
          : { tono: 'bien', texto: t(`${BASE}.resultados.${resultado === 'rechazado' ? 'rechazado' : 'aplicado'}`) },
      )
      setDecidido(true)
      onDecidido()
      return { ok: true }
    }
    setAviso({ tono: 'mal', texto: t(r.kind === 'conflicto' ? `${BASE}.conflicto` : `${BASE}.noDisponible`) })
    if (r.kind === 'conflicto') {
      setDecidido(true)
      onDecidido()
    }
    return { ok: false }
  }

  return (
    <>
      <CajonCuerpo className="space-y-4">
        <article data-naira-cambio-de-modo={cambio.estado} className="min-w-0">
          <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'ACTION' }}>
            <div className="space-y-2">
              <p className="text-base font-semibold text-fg">{tituloDelCambioDeModo(t, cambio)}</p>
              <p className="text-sm text-fg">{porQueDelCambioDeModo(t, cambio)}</p>
              {cambio.estado === 'abierto' ? (
                <p className="text-sm text-fg-muted">
                  {t(`${BASE}.hoy`, { modo: t(CLAVE_DEL_MODO[cambio.de]) })}{' '}
                  <LineaConFecha clave="inmobiliaria.ai.naira.aprobaciones.vence" valor={cambio.expiraEn} />
                </p>
              ) : cambio.razon ? (
                <p className="text-sm text-fg-muted">{t(`${BASE}.razones.${cambio.razon}`)}</p>
              ) : null}
              <p className="text-sm text-fg-muted">{t(`${BASE}.bajada`)}</p>
            </div>
          </BloqueDeCategoria>
        </article>
        <Presence show={aviso !== null}>
          <p role="status" data-naira-cambio-aviso={aviso?.tono ?? ''} className={aviso?.tono === 'mal' ? 'text-sm text-danger' : 'text-sm text-success'}>
            {aviso?.texto}
          </p>
        </Presence>
      </CajonCuerpo>
      {porDecidir ? (
        <CajonPie>
          <Button variant="secondary" isLoading={ocupado === 'rechazar'} disabled={ocupado !== null} onClick={() => void decidir('rechazar')}>
            {t(`${BASE}.rechazar`)}
          </Button>
          <Button
            isLoading={ocupado === 'aprobar'}
            disabled={ocupado !== null}
            onClick={() => (cambio.a === 'autonomo' ? setConfirmandoSubir(true) : void decidir('aprobar'))}
          >
            {t(`${BASE}.aprobar`)}
          </Button>
        </CajonPie>
      ) : null}
      {cambio.a === 'autonomo' ? (
        <ConfirmarAutomatico
          abierto={confirmandoSubir}
          quien={cambio.nombre}
          pilotoActivo
          titulo={t(`${BASE}.confirmarSubir.titulo`, { agente: cambio.nombre })}
          textoSi={t(`${BASE}.confirmarSubir.si`)}
          textoVerificar={t(`${BASE}.confirmarSubir.verificar`)}
          onConfirmar={() => decidir('aprobar')}
          onCerrar={() => setConfirmandoSubir(false)}
        />
      ) : null}
    </>
  )
}
