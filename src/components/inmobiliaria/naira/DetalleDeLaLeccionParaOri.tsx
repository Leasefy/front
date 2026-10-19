'use client'

/**
 * DetalleDeLaLeccionParaOri — el cajón de una lección que Naira le quiere enseñar a Ori (paso 4 de «Naira lo sabe todo»,
 * Nico 18-10-2026: «Le enseña, el admin confirma», «En Naira → Aprobaciones»; enseña «lo que se ve en las decisiones»).
 *
 * Cuerpo: lo que Ori aprendería (en palabras de Naira), de dónde lo sacó (el agente y su proceso, o lo decidido en
 * Aprobaciones), en qué sentido decide el equipo y las cifras que citó; qué pasa si se aprueba o se rechaza y, si las
 * lecciones del chat están apagadas, que Ori la usará cuando se prendan. Pie: «Aprobar» y «Rechazar» mientras esté por
 * decidir (las dos van directo: no cambian nada de la operación). Lo monta `CajonDeAprobacion`.
 */

import type { JSX } from 'react'
import { useState } from 'react'
import { Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { decidirLeccionParaOri, type LeccionParaOri } from '@/lib/api/naira/lecciones-para-ori'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { CLAVE_DEL_TIPO_DE_ACCION } from '@/lib/naira/vocabulario-de-aprobaciones'

import { BloqueDeCategoria } from './BloqueDeCategoria'
import { nombreDeLaCifra } from './DetalleDelCambioDeModo'
import { LineaConFecha } from './FilaDeSeguimiento'

const BASE = 'inmobiliaria.ai.naira.leccionesParaOri'

type Traductor = (clave: string, params?: Record<string, string>) => string

const CIFRA_DE_NAIRA = /^naira_([a-z_]+)_(aprobadas|rechazadas|vencidas)_30d$/
const CIFRA_DE_CAMBIOS = /^cambios_de_modo_(aplicados|rechazados|vencidos)_30d$/

/** Una cifra que citó Naira: las de Aprobaciones con su tipo; las de un agente, como en los cambios de modo. */
export function nombreDeLaCifraDeLaLeccion(t: Traductor, clave: string): string {
  const deNaira = CIFRA_DE_NAIRA.exec(clave)
  if (deNaira) {
    const tipo = deNaira[1] as keyof typeof CLAVE_DEL_TIPO_DE_ACCION
    const dicho = tipo in CLAVE_DEL_TIPO_DE_ACCION ? t(CLAVE_DEL_TIPO_DE_ACCION[tipo]) : (deNaira[1] ?? '').replaceAll('_', ' ')
    return t(`${BASE}.cifras.naira`, { tipo: dicho, estado: t(`${BASE}.cifras.estadosDeNaira.${deNaira[2]}`) })
  }
  const deCambios = CIFRA_DE_CAMBIOS.exec(clave)
  if (deCambios) return t(`${BASE}.cifras.cambiosDeModo.${deCambios[1]}`)
  return nombreDeLaCifra(t, clave)
}

/** De dónde sale la lección, en una frase: el agente (con su nombre corto) o lo decidido en Aprobaciones. */
export function deDondeDeLaLeccion(t: Traductor, l: Pick<LeccionParaOri, 'agente' | 'nombre'>): string {
  if (l.agente === null) return t(`${BASE}.deAprobaciones`)
  return t(`${BASE}.delAgente`, { agente: l.nombre ?? l.agente })
}

type Aviso = { readonly tono: 'bien' | 'mal'; readonly texto: string } | null

export function DetalleDeLaLeccionParaOri({
  leccion,
  oriLasUsa,
  onDecidido,
}: {
  readonly leccion: LeccionParaOri
  /** Si las lecciones del chat están prendidas (Ori usa ya lo que se aprueba). */
  readonly oriLasUsa: boolean
  readonly onDecidido: () => void
}): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? ''
  const [ocupado, setOcupado] = useState<'aprobar' | 'rechazar' | null>(null)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [decidido, setDecidido] = useState(false)
  const porDecidir = leccion.estado === 'por_decidir' && !decidido
  const cifras = Object.entries(leccion.cifras)

  async function decidir(decision: 'aprobar' | 'rechazar'): Promise<void> {
    setOcupado(decision)
    setAviso(null)
    const r = await decidirLeccionParaOri(agencyId, leccion.id, decision)
    setOcupado(null)
    if (r.kind === 'ok') {
      const clave = r.resultado === 'descartada' ? 'descartada' : oriLasUsa ? 'aprendida' : 'aprendidaApagado'
      setAviso({ tono: 'bien', texto: t(`${BASE}.resultados.${clave}`) })
      setDecidido(true)
      onDecidido()
      return
    }
    setAviso({ tono: 'mal', texto: t(r.kind === 'conflicto' ? `${BASE}.conflicto` : `${BASE}.noDisponible`) })
    if (r.kind === 'conflicto') {
      setDecidido(true)
      onDecidido()
    }
  }

  return (
    <>
      <CajonCuerpo className="space-y-4">
        <article data-naira-leccion-para-ori={leccion.estado} className="min-w-0">
          <BloqueDeCategoria origen={{ kind: 'seccion', seccion: 'ACTION' }}>
            <div className="space-y-3">
              <p className="text-base font-semibold text-fg" data-naira-leccion-texto="">
                {leccion.texto}
              </p>
              <div className="space-y-1">
                <p className="text-caption font-medium text-fg-muted">{t(`${BASE}.deDonde`)}</p>
                <p className="text-sm text-fg">{deDondeDeLaLeccion(t, leccion)}</p>
                {leccion.queHaceElProceso ? (
                  <p className="text-sm text-fg-muted">{t(`${BASE}.delProceso`, { proceso: leccion.queHaceElProceso })}</p>
                ) : null}
                <p className="text-sm text-fg">{t(`${BASE}.sentido.${leccion.sentido}`)}</p>
              </div>
              {cifras.length > 0 ? (
                <div data-naira-cifras-citadas="" className="space-y-1">
                  <p className="text-caption font-medium text-fg-muted">{t('inmobiliaria.ai.naira.cambiosDeModo.cifrasQueVio')}</p>
                  <dl className="space-y-1">
                    {cifras.map(([clave, valor]) => (
                      <div key={clave} className="flex items-baseline justify-between gap-3 text-sm">
                        <dt className="min-w-0 text-fg-muted">{nombreDeLaCifraDeLaLeccion(t, clave)}</dt>
                        <dd className="shrink-0 font-mono tabular-nums text-fg">{valor}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              <p className="text-sm text-fg-muted">
                {leccion.estado !== 'por_decidir' && leccion.decididaEn ? (
                  <LineaConFecha clave={`${BASE}.decidida.${leccion.estado}`} valor={leccion.decididaEn} />
                ) : (
                  <LineaConFecha clave={`${BASE}.propuestaEl`} valor={leccion.propuestaEn} />
                )}
              </p>
              {porDecidir ? <p className="text-sm text-fg-muted">{t(`${BASE}.bajada`)}</p> : null}
              {porDecidir && !oriLasUsa ? (
                <p className="text-sm text-fg-muted" data-naira-lecciones-apagadas="">
                  {t(`${BASE}.oriApagado`)}
                </p>
              ) : null}
            </div>
          </BloqueDeCategoria>
        </article>
        <Presence show={aviso !== null}>
          <p role="status" data-naira-leccion-aviso={aviso?.tono ?? ''} className={aviso?.tono === 'mal' ? 'text-sm text-danger' : 'text-sm text-success'}>
            {aviso?.texto}
          </p>
        </Presence>
      </CajonCuerpo>
      {porDecidir ? (
        <CajonPie>
          <Button variant="secondary" isLoading={ocupado === 'rechazar'} disabled={ocupado !== null} onClick={() => void decidir('rechazar')}>
            {t(`${BASE}.rechazar`)}
          </Button>
          <Button isLoading={ocupado === 'aprobar'} disabled={ocupado !== null} onClick={() => void decidir('aprobar')}>
            {t(`${BASE}.aprobar`)}
          </Button>
        </CajonPie>
      ) : null}
    </>
  )
}
