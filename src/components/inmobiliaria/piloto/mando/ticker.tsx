'use client'

/**
 * La franja de telemetría «en vivo»: UNA línea que va pasando por lo que los
 * agentes hacen ahora (lo en curso del pulso) y lo último que hicieron (el
 * feed). Cambia cada 4,8 s con un fundido que sube 4 px (`CrossFade`); cuando
 * entra una acción nueva salta a ella. Fuera de pantalla o con movimiento
 * reducido se queda quieta en la primera. El lector de pantalla no la oye
 * pasar (sería ruido cada 5 s): `aria-live` sólo anuncia lo NUEVO.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { CrossFade } from '@leasefy/cadence'

import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente'
import { agenteDeLaAutonomia } from '@/lib/agentes/equipo'
import type { ActivityItem, PulsoEnCurso } from '@/lib/api/piloto'
import { cn } from '@/lib/utils'

import { agenteDelEnCurso } from './calculos'
import { TONO, unir, useBucleVivo, useNombreDeAgente, type Tono } from './piezas'
import { TEXTOS } from './textos'

interface Linea {
  id: string
  ahora: boolean
  agente: string | null
  texto: string
}

const CADA_MS = 4_800

export function Ticker({
  enCurso,
  actividad,
  tono = 'superficie',
  className,
}: {
  enCurso: readonly PulsoEnCurso[]
  actividad: readonly ActivityItem[]
  tono?: Tono
  className?: string
}) {
  const nombre = useNombreDeAgente()
  const t = TONO[tono]
  const lineas = useMemo<Linea[]>(
    () => [
      ...enCurso.map((e) => ({ id: `c:${e.id}`, ahora: true, agente: agenteDelEnCurso(e), texto: e.titulo })),
      ...actividad.slice(0, 6).map((a) => ({ id: `a:${a.id}`, ahora: false, agente: a.agente, texto: a.titulo })),
    ],
    [enCurso, actividad],
  )
  const { ref, vivo } = useBucleVivo<HTMLDivElement>()
  const [i, setI] = useState(0)

  // Una acción nueva: se muestra ya y se anuncia.
  const primera = actividad[0]?.id
  const vista = useRef(primera)
  const [anuncio, setAnuncio] = useState('')
  useEffect(() => {
    if (primera && vista.current && primera !== vista.current) {
      setI(enCurso.length)
      setAnuncio(TEXTOS.enVivo.anuncio(actividad[0]?.titulo ?? ''))
    }
    vista.current = primera
  }, [primera, enCurso.length, actividad])

  useEffect(() => {
    if (!vivo || lineas.length < 2) return
    const id = setInterval(() => setI((x) => (x + 1) % lineas.length), CADA_MS)
    return () => clearInterval(id)
  }, [vivo, lineas.length])

  const linea = lineas[i % Math.max(1, lineas.length)]
  const agente = linea?.agente ? agenteDeLaAutonomia(linea.agente) : null
  return (
    <div ref={ref} className={cn('min-w-0', className)}>
      <span className="sr-only" aria-live="polite">
        {anuncio}
      </span>
      {linea ? (
        <CrossFade swapKey={linea.id} mode="popLayout" className="flex min-w-0 items-center gap-2.5" aria-hidden="true">
          {agente ? <OrbeDeAgente agente={agente} tamano={20} estado={linea.ahora ? 'trabajando' : 'quieto'} quieto={!linea.ahora} decorativo /> : null}
          <span className={unir('shrink-0 font-mono text-label uppercase tracking-wide', linea.ahora ? t.fg : t.muted)}>
            {linea.ahora ? TEXTOS.enVivo.ahora : nombre(linea.agente)}
          </span>
          <span className={unir('min-w-0 truncate text-body-sm', t.fg)}>{linea.texto}</span>
        </CrossFade>
      ) : (
        <p className={unir('truncate text-body-sm', t.muted)}>{TEXTOS.enVivo.vacio}</p>
      )}
    </div>
  )
}
