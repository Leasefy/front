'use client'

/**
 * PilotoDirector — la tarjeta del DIRECTOR, arriba de la página del Piloto
 * (fase 1, 28-09-2026; FASE-1.md §5, decisiones 10 a 15).
 *
 * Cada mañana el director arma el plan del día de la inmobiliaria: qué hace
 * cada agente, sobre quién y por qué. En la fase 1 TODA orden suya espera el
 * clic de una persona en la Bandeja (decisión 10). Esta tarjeta es donde se
 * lee ese plan y donde viven sus metas:
 *
 *   · «Hoy»   — el plan (`PilotoDirectorHoy`);
 *   · «Metas» — las cinco metas y su aceptar/ajustar/pausar (`PilotoDirectorMetas`).
 *
 * Pestañas y no dos bandas: el plan y las metas son del mismo actor, y dos
 * bloques más encima del pulso empujaban la Bandeja fuera de la pantalla.
 *
 * ── Estados ────────────────────────────────────────────────────────────────
 *   · cargando          → la tarjeta dice qué está leyendo, sin gris mudo;
 *   · falló             → `FalloDeCarga` con el error entero y reintentar;
 *   · 404               → no se pinta: un micro sin estas rutas (igual que el pulso);
 *   · `encendido:false` → UNA frase («El director todavía no está prendido
 *                         para tu inmobiliaria»), sin error;
 *   · en curso / sin modelo / fallido → lo dice `PilotoDirectorHoy`.
 *
 * «Volver a planear» es SÓLO para un administrador (el micro responde 403 al
 * resto). 202 o 409 esperan al mismo ciclo, preguntando cada 5 s hasta 3 min
 * (`useDirectorHoy`); mientras tanto el botón dice «Planeando…».
 */

import { useState, type ReactNode } from 'react'
import { ArrowsClockwise, Compass } from '@phosphor-icons/react'
import { MonoLabel } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useDirectorHoy,
  useDirectorMetas,
  type UseDirectorHoy,
  type UseDirectorMetas,
} from '@/lib/hooks/piloto/use-piloto-director'
import { PilotoDirectorHoy, type PorQueDeRespaldo } from './PilotoDirectorHoy'
import { PilotoDirectorMetas } from './PilotoDirectorMetas'

export type PestanaDelDirector = 'hoy' | 'metas'

export interface PilotoDirectorVistaProps {
  hoy: UseDirectorHoy
  metas: UseDirectorMetas
  isAdmin: boolean
  /** Abre el cajón de la Bandeja con la fila de esa orden. */
  onAbrirAccion: (accionId: string, porQue: PorQueDeRespaldo) => void
  pestanaInicial?: PestanaDelDirector
  /** Para las pruebas: «hoy» en Bogotá. */
  hoyEnBogota?: string
}

/** El marco de la tarjeta: el mismo en todos los estados, para que no salte. */
function Marco({ children, testid, estado }: { children: ReactNode; testid: string; estado?: string }) {
  const { t } = useI18n()
  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-label={t('inmobiliaria.piloto.director.titulo')}
      data-testid={testid}
      {...(estado ? { 'data-estado': estado } : {})}
    >
      {children}
    </section>
  )
}

function Rotulo() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2">
      <Compass weight="duotone" className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
      <MonoLabel>{t('inmobiliaria.piloto.director.titulo')}</MonoLabel>
    </div>
  )
}

export function PilotoDirectorVista({
  hoy,
  metas,
  isAdmin,
  onAbrirAccion,
  pestanaInicial = 'hoy',
  hoyEnBogota,
}: PilotoDirectorVistaProps) {
  const { t } = useI18n()
  const [pestana, setPestana] = useState<PestanaDelDirector>(pestanaInicial)
  const data = hoy.data

  if (hoy.isLoading && !data) {
    return (
      <Marco testid="piloto-director-cargando">
        <div className="space-y-3 px-6 py-6" role="status" aria-live="polite">
          <div className="flex items-center gap-2">
            <Spinner size="sm" variant="muted" />
            <MonoLabel>{t('inmobiliaria.piloto.director.titulo')}</MonoLabel>
          </div>
          <p className="text-body text-fg-muted">{t('inmobiliaria.piloto.director.cargando')}</p>
          <div className="h-16 animate-pulse rounded-md bg-surface-muted" aria-hidden="true" />
        </div>
      </Marco>
    )
  }

  if (hoy.error && !data) {
    return (
      <Marco testid="piloto-director-fallo">
        <div className="px-6 pt-6">
          <Rotulo />
        </div>
        <FalloDeCarga
          error={hoy.error}
          queEs={t('inmobiliaria.piloto.director.queEsFallo')}
          onReintentar={hoy.refetch}
          enmarcado={false}
        />
      </Marco>
    )
  }

  // Un micro que no publica estas rutas: la pieza todavía no existe.
  if (hoy.notAvailable || !data) return null

  if (!data.encendido) {
    return (
      <Marco testid="piloto-director-apagado">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-4">
          <Rotulo />
          <p className="text-body-sm text-fg-muted">{t('inmobiliaria.piloto.director.apagado')}</p>
        </div>
      </Marco>
    )
  }

  const planeando = hoy.pidiendoReplan || hoy.esperando || data.ciclo?.estado === 'en_curso'
  const porAceptar = metas.data?.metas.filter((m) => m.estado === 'propuesta').length ?? 0

  const replanear = async () => {
    const r = await hoy.replanear()
    if (r.estado === 'arranco') toast.success(t('inmobiliaria.piloto.director.replanear.arranco'))
    else if (r.estado === 'en_curso') toast.info(t('inmobiliaria.piloto.director.replanear.enCurso'))
    else if (r.status === 403 || r.error === 'solo_admin') toast.error(t('inmobiliaria.piloto.director.replanear.soloAdmin'))
    else toast.error(t('inmobiliaria.piloto.director.replanear.fallo'))
  }

  return (
    <Marco testid="piloto-director" estado={data.ciclo?.estado ?? 'sin_plan'}>
      <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Rotulo />
          <p className="max-w-2xl text-caption text-fg-muted">{t('inmobiliaria.piloto.director.queEs')}</p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <Button
              variant="outline"
              size="sm"
              hideArrow
              isLoading={planeando}
              disabled={planeando}
              onClick={() => void replanear()}
              data-testid="piloto-director-replanear"
            >
              {!planeando && <ArrowsClockwise weight="bold" className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              {planeando
                ? t('inmobiliaria.piloto.director.replanear.planeando')
                : t('inmobiliaria.piloto.director.replanear.boton')}
            </Button>
          </div>
        )}
      </div>
      {hoy.seCansoDeEsperar && (
        <p className="px-6 pt-2 text-caption text-fg-muted" role="status" data-testid="piloto-director-se-canso">
          {t('inmobiliaria.piloto.director.replanear.seCanso')}
        </p>
      )}

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as PestanaDelDirector)}>
        {/* Padding en el envoltorio y no margen en la lista: la lista trae
            `max-w-full` y, con margen, pasaría del ancho de la tarjeta. */}
        <div className="px-6 pt-4">
          <TabsList className="justify-start" aria-label={t('inmobiliaria.piloto.director.titulo')}>
            <TabsTrigger value="hoy" data-testid="piloto-director-pestana-hoy">
              {t('inmobiliaria.piloto.director.pestanas.hoy')}
            </TabsTrigger>
            <TabsTrigger value="metas" data-testid="piloto-director-pestana-metas">
              {t('inmobiliaria.piloto.director.pestanas.metas')}
              {porAceptar > 0 && (
                <span className="ml-1.5 font-mono text-caption tabular-nums text-fg-muted">
                  {t('inmobiliaria.piloto.director.pestanas.porAceptar', { n: String(porAceptar) })}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="hoy" className="px-6 pb-6 pt-5">
          <PilotoDirectorHoy
            hoy={data}
            isAdmin={isAdmin}
            onAbrirAccion={onAbrirAccion}
            {...(hoyEnBogota ? { hoyEnBogota } : {})}
          />
        </TabsContent>
        <TabsContent value="metas" className="px-6 pb-6 pt-5">
          <PilotoDirectorMetas lectura={metas} isAdmin={isAdmin} enVuelo={metas.enVuelo} onActuar={metas.actuar} />
        </TabsContent>
      </Tabs>
    </Marco>
  )
}

export interface PilotoDirectorProps {
  onAbrirAccion: (accionId: string, porQue: PorQueDeRespaldo) => void
}

/** La tarjeta con sus lecturas. La página le pasa cómo abrir el cajón. */
export function PilotoDirector({ onAbrirAccion }: PilotoDirectorProps) {
  const hoy = useDirectorHoy()
  const metas = useDirectorMetas()
  const { isAdmin } = usePermissionsContext()
  return <PilotoDirectorVista hoy={hoy} metas={metas} isAdmin={isAdmin} onAbrirAccion={onAbrirAccion} />
}
