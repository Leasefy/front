'use client'

/**
 * PilotoComoFunciona — el cajón «¿Cómo funciona?» del Piloto automático.
 *
 * Nico (30-09): «si un usuario llega acá no entiende pero nada de lo que hace
 * esa pantalla, qué agentes usa, por qué se tiene, qué significa piloto
 * automático, qué hace etc.». En la pantalla queda lo corto (qué es y en qué
 * modo está, `PilotoQueEs`); acá va lo completo, en el orden en que uno lo
 * pregunta:
 *
 *   1. Qué es — y que NO es el chat (el chat es donde el equipo pregunta; el
 *      Piloto es el trabajo que los agentes hacen solos).
 *   2. Los tres modos — de `MODOS_DEL_PILOTO`, con las MISMAS frases que la
 *      píldora del header (`flota.que.*`), el modo actual marcado y lo que
 *      espera a una persona aunque esté en Automático (`perilla.ts` del micro).
 *   3. Qué agentes trabajan — la flota EN VIVO, agrupada en «con el modo»,
 *      «a pedido» y «todavía no» (ver `como-funciona.ts`).
 *   4. Qué ves en esta pantalla — pulso, bandeja, actividad.
 *   5. Los botones de arriba — ¿Opera sola?, Procesos, Autonomía y la píldora.
 *
 * Es el CONTENIDO del modal de `ParaEntenderMas`, el patrón del panel para
 * «la explicación se guarda detrás de un botón» (Nico, 21-09): el mismo botón
 * y el mismo modal que «¿Cómo funciona?» de Conciliación o de Postulaciones.
 * Lo monta `PilotoQueEs`; el contenido sólo existe mientras está abierto.
 */

import type { ReactNode } from 'react'
import { Play } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import { DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { usePilotoFlotaCompartida } from '@/lib/hooks/piloto/piloto-flota-context'
import { workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'
import { AGENTES_NO_DISPONIBLES } from '@/components/inmobiliaria/piloto/PilotoAutonomia'
import { cn } from '@/lib/utils'
import { MODOS_DEL_PILOTO, type AgenteDeLaFlota } from '@/lib/api/piloto'
import {
  AGENTES_DEL_PILOTO,
  agruparAgentes,
  esAgenteConocido,
  type GrupoDeAgentes,
} from './como-funciona'

const NS = 'inmobiliaria.piloto.comoFunciona'

/** Un grupo vacío no se pinta; el orden es el de la lectura. */
const GRUPOS: GrupoDeAgentes[] = ['conModo', 'aPedido', 'apagados']

export interface PilotoComoFuncionaProps {
  /**
   * Vuelve a mostrar la presentación de la primera vez. El botón CIERRA este
   * modal antes: dos diálogos apilados se pelean el foco.
   */
  onVerPresentacion?: () => void
}

export function PilotoComoFunciona({ onVerPresentacion }: PilotoComoFuncionaProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-7" data-testid="piloto-como-funciona">
      <Seccion id="piloto-cf-que-es" titulo={t(`${NS}.queEs.titulo`)}>
        <p className="text-sm text-fg">{t(`${NS}.queEs.p1`)}</p>
        <p className="text-sm text-fg-muted">{t(`${NS}.queEs.p2`)}</p>
        <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-caption text-fg-muted">
          {t(`${NS}.queEs.noEsElChat`)}
        </p>
      </Seccion>

      <SeccionModos />

      <SeccionAgentes />

      <Seccion id="piloto-cf-pantalla" titulo={t(`${NS}.pantalla.titulo`)}>
        <Glosario grupo="pantalla" claves={['pulso', 'bandeja', 'actividad']} />
      </Seccion>

      <Seccion id="piloto-cf-botones" titulo={t(`${NS}.botones.titulo`)}>
        <Glosario grupo="botones" claves={['operaSola', 'procesos', 'autonomia', 'piloto']} />
      </Seccion>

      {onVerPresentacion && (
        <div className="border-t border-border-faint pt-5">
          <DialogClose asChild>
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={onVerPresentacion}
              data-testid="piloto-como-funciona-ver-presentacion"
            >
              <Play weight="duotone" className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t(`${NS}.verPresentacion`)}
            </Button>
          </DialogClose>
        </div>
      )}
    </div>
  )
}

/** Nombre en negrita y qué es: se escanea por el nombre. */
function Glosario({ grupo, claves }: { grupo: 'pantalla' | 'botones'; claves: string[] }) {
  const { t } = useI18n()
  return (
    <dl className="space-y-2.5 text-sm">
      {claves.map((k) => (
        <div key={k}>
          <dt className="font-medium text-fg">{t(`${NS}.${grupo}.${k}.titulo`)}</dt>
          <dd className="text-fg-muted">{t(`${NS}.${grupo}.${k}.texto`)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Seccion({
  id,
  titulo,
  children,
}: {
  id: string
  titulo: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h3 id={id}>
        <MonoLabel>{titulo}</MonoLabel>
      </h3>
      {children}
    </section>
  )
}

function SeccionModos() {
  const { t } = useI18n()
  const flota = usePilotoFlotaCompartida()
  const modoActual = flota.data?.activo ? flota.data.modo : null
  const apagado = flota.data ? !flota.data.activo : false

  return (
    <Seccion id="piloto-cf-modos" titulo={t(`${NS}.modos.titulo`)}>
      <p className="text-sm text-fg">{t(`${NS}.modos.intro`)}</p>
      <dl className="space-y-2 rounded-lg border border-border bg-surface-muted p-3" data-testid="piloto-cf-modos">
        {MODOS_DEL_PILOTO.map((modo) => {
          const esElActual = modo === modoActual
          return (
            <div key={modo} className="text-caption" data-modo={modo}>
              <dt className="flex items-center gap-2 font-medium text-fg">
                {t(`inmobiliaria.piloto.flota.modo.${modo}`)}
                {esElActual && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                    {t(`${NS}.modos.ahora`)}
                  </span>
                )}
              </dt>
              <dd className="text-fg-muted">{t(`inmobiliaria.piloto.flota.que.${modo}`)}</dd>
            </div>
          )
        })}
      </dl>
      {apagado && <p className="text-caption text-fg-muted">{t(`${NS}.modos.apagado`)}</p>}
      <p className="text-caption text-fg-muted">{t(`${NS}.modos.siempre`)}</p>
      <p className="text-caption text-fg-muted">{t(`${NS}.modos.quienLoCambia`)}</p>
    </Seccion>
  )
}

function SeccionAgentes() {
  const { t } = useI18n()
  const flota = usePilotoFlotaCompartida()
  const agentes = flota.data?.agentes

  let cuerpo: ReactNode
  if (flota.isLoading && !agentes) {
    cuerpo = (
      <p className="text-caption text-fg-subtle" role="status">
        {t(`${NS}.agentes.cargando`)}
      </p>
    )
  } else if (!agentes || agentes.length === 0) {
    // Sin lectura: la lista del micro (ver `como-funciona.ts`), sin estados —
    // no se sabe cuáles corren, así que no se dice.
    cuerpo = (
      <>
        <p className="text-caption text-fg-muted">{t(`${NS}.agentes.sinLectura`)}</p>
        <ListaDeAgentes ids={[...AGENTES_DEL_PILOTO]} />
      </>
    )
  } else {
    const grupos = agruparAgentes(agentes, AGENTES_NO_DISPONIBLES)
    cuerpo = GRUPOS.filter((g) => grupos[g].length > 0).map((g) => (
      <div key={g} className="space-y-1.5" data-testid={`piloto-cf-grupo-${g}`}>
        <p className="text-caption font-medium text-fg">
          {t(`${NS}.agentes.${g}`)} <span className="font-mono tabular-nums text-fg-subtle">· {grupos[g].length}</span>
        </p>
        <ListaDeAgentes ids={grupos[g].map((a) => a.agente)} flota={grupos[g]} atenuados={g === 'apagados'} />
      </div>
    ))
  }

  return (
    <Seccion id="piloto-cf-agentes" titulo={t(`${NS}.agentes.titulo`)}>
      {cuerpo}
    </Seccion>
  )
}

function ListaDeAgentes({
  ids,
  flota,
  atenuados = false,
}: {
  ids: string[]
  flota?: AgenteDeLaFlota[]
  atenuados?: boolean
}) {
  const { t } = useI18n()
  return (
    <ul role="list" className="divide-y divide-border-faint rounded-lg border border-border">
      {ids.map((id, i) => {
        const fila = flota?.[i]
        // Un agente que el micro agregue y este front no conozca se muestra
        // igual, con lo que el micro dice que hace hoy.
        const queHace = esAgenteConocido(id) ? t(`${NS}.agente.${id}`) : fila?.efectoReal
        return (
          <li key={id} className="px-3 py-2.5" data-agente={id}>
            <p className={cn('text-sm font-medium', atenuados ? 'text-fg-muted' : 'text-fg')}>
              {workspaceVocab(t, 'agente', id)}
            </p>
            {queHace && <p className="text-caption text-fg-muted">{queHace}</p>}
          </li>
        )
      })}
    </ul>
  )
}
