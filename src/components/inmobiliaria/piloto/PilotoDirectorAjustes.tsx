'use client'

/**
 * PilotoDirectorAjustes — la configuración del director (fase 1, 28-09-2026),
 * dentro del panel de configuración del Piloto (el de Autonomía, que la
 * página llama «configuración, no operación»).
 *
 * Dos piezas:
 *
 *   1. **Gasto de IA** (decisión 14), SÓLO para un administrador: lo gastado
 *      en el mes contra el tope, el tramo (el tope sale del tamaño de la
 *      inmobiliaria), el escalón en que va el director y el gasto por
 *      componente. La cobranza (Laura) NO cuenta: tiene su propio modelo de
 *      negocio y se cobra aparte — la pantalla lo dice con esas palabras.
 *      A quien no es administrador ni se le pide el dato.
 *
 *   2. **Grupo de control** (decisión 15): el interruptor lo mueve sólo un
 *      administrador; el resto ve cómo está. La explicación es la de la
 *      especificación, en una línea.
 *
 * Con el director apagado para la inmobiliaria se dice una vez y ya.
 *
 * `PilotoDirectorAjustesVista` es presentacional (se prueba sin abrir el
 * Sheet: abrirlo por clic bajo happy-dom colgó la corrida, ver
 * `PilotoAutonomia.test.tsx`).
 */

import { Compass } from '@phosphor-icons/react'
import { MonoLabel, Sparkline } from '@leasefy/cadence'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { useI18n } from '@/lib/i18n'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import type { DirectorExperimento, DirectorGasto, ResultadoDeExperimento } from '@/lib/api/piloto-director'
import {
  useDirectorExperimento,
  useDirectorGasto,
  type LecturaDelDirector,
} from '@/lib/hooks/piloto/use-piloto-director'
import { fechaLarga, formatoUsd, humanizarClave, mesLargo } from '@/lib/piloto/director'

/** Los componentes del gasto que tienen nombre propio en pantalla. */
const COMPONENTE_CONOCIDO: Record<string, string> = {
  'director.plan': 'directorPlan',
  'director.replan': 'directorReplan',
  chat: 'chat',
  cobranza: 'cobranza',
}

const TRAMOS = new Set(['pequena', 'mediana', 'grande'])
const ESCALONES = new Set(['normal', 'ahorro', 'sinModelo'])
const VARIANTE_DEL_ESCALON: Record<string, 'default' | 'warning' | 'error'> = {
  normal: 'default',
  ahorro: 'warning',
  sinModelo: 'error',
}

export interface PilotoDirectorAjustesVistaProps {
  isAdmin: boolean
  gasto: LecturaDelDirector<DirectorGasto>
  experimento: LecturaDelDirector<DirectorExperimento> & { cambiando: boolean }
  onCambiarExperimento: (activo: boolean) => Promise<ResultadoDeExperimento>
}

function GastoDeIa({ lectura }: { lectura: LecturaDelDirector<DirectorGasto> }) {
  const { t, locale } = useI18n()
  const idioma = locale === 'en' ? 'en' : 'es'
  const { data, isLoading, error, notAvailable, refetch } = lectura

  if (isLoading && !data) {
    return <div className="h-28 animate-pulse rounded-lg bg-surface-muted" role="status" aria-label={t('inmobiliaria.piloto.director.gasto.titulo')} />
  }
  if (error && !data) {
    return (
      <FalloDeCarga
        error={error}
        queEs={t('inmobiliaria.piloto.director.gasto.queEsFallo')}
        onReintentar={refetch}
        enmarcado={false}
      />
    )
  }
  if (notAvailable || !data || !data.encendido) return null

  const mes = mesLargo(data.mes, idioma)
  const tope = data.topeUsd
  const tramo = data.tramo && TRAMOS.has(data.tramo) ? data.tramo : null
  const escalon = data.escalon && ESCALONES.has(data.escalon) ? data.escalon : null

  return (
    <div className="space-y-3 rounded-lg border border-border p-3" data-testid="piloto-director-gasto">
      <div className="space-y-1">
        <p className="text-body-sm font-medium text-fg">
          {mes
            ? t('inmobiliaria.piloto.director.gasto.tituloDelMes', { mes })
            : t('inmobiliaria.piloto.director.gasto.titulo')}
        </p>
        <p className="text-body-sm" data-testid="piloto-director-gasto-total">
          <span className="font-mono tabular-nums text-fg">{formatoUsd(data.gastadoUsd, idioma)}</span>
          {typeof tope === 'number' && (
            <span className="text-fg-muted">
              {' '}
              {t('inmobiliaria.piloto.director.gasto.de')}{' '}
              <span className="font-mono tabular-nums">{formatoUsd(tope, idioma)}</span>
            </span>
          )}
        </p>
        {typeof tope === 'number' && tope > 0 && (
          <Progress
            value={Math.min(data.gastadoUsd, tope)}
            max={tope}
            size="sm"
            variant={escalon ? VARIANTE_DEL_ESCALON[escalon] : 'default'}
            label={t('inmobiliaria.piloto.director.gasto.barra')}
          />
        )}
      </div>

      {tramo && (
        <p className="text-caption text-fg-muted" data-testid="piloto-director-gasto-tramo">
          {t(`inmobiliaria.piloto.director.gasto.tramo.${tramo}`)}
        </p>
      )}
      {escalon && (
        <p className="text-caption text-fg" data-testid="piloto-director-gasto-escalon">
          {t(`inmobiliaria.piloto.director.gasto.escalon.${escalon}`)}
        </p>
      )}

      {data.porComponente.length > 0 && (
        <div className="space-y-1">
          <p className="text-label text-fg-muted">{t('inmobiliaria.piloto.director.gasto.porComponente')}</p>
          <ul className="divide-y divide-border-faint" data-testid="piloto-director-gasto-componentes">
            {data.porComponente.map((c) => {
              const conocido = COMPONENTE_CONOCIDO[c.componente]
              return (
                <li key={c.componente} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-caption text-fg">
                    {conocido
                      ? t(`inmobiliaria.piloto.director.gasto.componente.${conocido}`)
                      : humanizarClave(c.componente)}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {!c.cuentaParaTope && (
                      <Badge variant="secondary">{t('inmobiliaria.piloto.director.gasto.noCuenta')}</Badge>
                    )}
                    <span className="font-mono text-caption tabular-nums text-fg">{formatoUsd(c.usd, idioma)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {data.porDia.length >= 2 && (
        <div className="space-y-1">
          <p className="text-label text-fg-muted">{t('inmobiliaria.piloto.director.gasto.porDia')}</p>
          <Sparkline values={data.porDia.map((d) => d.usd)} width={200} height={32} color="hsl(var(--primary))" />
        </div>
      )}

      <p className="text-caption text-fg-muted" data-testid="piloto-director-gasto-laura">
        {t('inmobiliaria.piloto.director.gasto.laura')}
        {data.excluidoUsd > 0 && (
          <>
            {' '}
            {t('inmobiliaria.piloto.director.gasto.excluido')}{' '}
            <span className="font-mono tabular-nums text-fg">{formatoUsd(data.excluidoUsd, idioma)}</span>.
          </>
        )}
      </p>
    </div>
  )
}

function GrupoDeControl({
  lectura,
  isAdmin,
  onCambiar,
}: {
  lectura: PilotoDirectorAjustesVistaProps['experimento']
  isAdmin: boolean
  onCambiar: PilotoDirectorAjustesVistaProps['onCambiarExperimento']
}) {
  const { t, locale } = useI18n()
  const idioma = locale === 'en' ? 'en' : 'es'
  const { data, isLoading, error, notAvailable, refetch, cambiando } = lectura

  if (isLoading && !data) {
    return <div className="h-24 animate-pulse rounded-lg bg-surface-muted" role="status" aria-label={t('inmobiliaria.piloto.director.experimento.titulo')} />
  }
  if (error && !data) {
    return (
      <FalloDeCarga
        error={error}
        queEs={t('inmobiliaria.piloto.director.experimento.queEsFallo')}
        onReintentar={refetch}
        enmarcado={false}
      />
    )
  }
  if (notAvailable || !data || !data.encendido) return null

  const cambiar = async (activo: boolean) => {
    const r = await onCambiar(activo)
    if (r.ok) {
      toast.success(
        activo
          ? t('inmobiliaria.piloto.director.experimento.toastPrendido')
          : t('inmobiliaria.piloto.director.experimento.toastApagado'),
      )
    } else {
      toast.error(
        r.status === 403
          ? t('inmobiliaria.piloto.director.experimento.soloAdmin')
          : t('inmobiliaria.piloto.director.experimento.fallo'),
      )
    }
  }

  const desde = fechaLarga(data.desde, idioma)

  return (
    <div className="space-y-2 rounded-lg border border-border p-3" data-testid="piloto-director-experimento">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-sm font-medium text-fg">{t('inmobiliaria.piloto.director.experimento.titulo')}</p>
        <Switch
          checked={data.activo}
          disabled={!isAdmin || cambiando}
          onCheckedChange={(v: boolean) => void cambiar(v)}
          aria-label={t('inmobiliaria.piloto.director.experimento.switchAria')}
          data-testid="piloto-director-experimento-switch"
        />
      </div>
      <p className="text-caption text-fg-muted" data-testid="piloto-director-experimento-explicacion">
        {t('inmobiliaria.piloto.director.experimento.explicacion', { porcentaje: String(data.porcentajeControl) })}
      </p>
      <p className="text-caption text-fg" data-testid="piloto-director-experimento-estado">
        {data.activo
          ? desde
            ? t('inmobiliaria.piloto.director.experimento.prendidoDesde', {
                fecha: desde,
                n: String(data.entidadesEnControl),
              })
            : t('inmobiliaria.piloto.director.experimento.prendido', { n: String(data.entidadesEnControl) })
          : t('inmobiliaria.piloto.director.experimento.apagado')}
      </p>
      {data.activo && (
        <p className="text-caption text-fg-subtle">{t('inmobiliaria.piloto.director.experimento.apagarNoBorra')}</p>
      )}
      {!isAdmin && (
        <p className="text-caption text-fg-subtle" data-testid="piloto-director-experimento-solo-admin">
          {t('inmobiliaria.piloto.director.experimento.soloAdmin')}
        </p>
      )}
    </div>
  )
}

export function PilotoDirectorAjustesVista({
  isAdmin,
  gasto,
  experimento,
  onCambiarExperimento,
}: PilotoDirectorAjustesVistaProps) {
  const { t } = useI18n()
  // Apagado para la inmobiliaria: lo dice cualquiera de las dos lecturas.
  const apagado = experimento.data?.encendido === false || (isAdmin && gasto.data?.encendido === false)
  // Un micro sin estas rutas (404 en las dos): la sección no se pinta.
  const sinRutas = experimento.notAvailable && (!isAdmin || gasto.notAvailable)
  if (sinRutas) return null

  return (
    <section className="mt-6 space-y-3 border-t border-border pt-5" data-testid="piloto-director-ajustes">
      <h3 className="flex items-center gap-1.5">
        <Compass weight="duotone" className="h-4 w-4 text-fg-muted" aria-hidden="true" />
        <MonoLabel>{t('inmobiliaria.piloto.director.titulo')}</MonoLabel>
      </h3>
      {apagado ? (
        <p className="text-caption text-fg-muted" data-testid="piloto-director-ajustes-apagado">
          {t('inmobiliaria.piloto.director.apagado')}
        </p>
      ) : (
        <>
          {isAdmin && <GastoDeIa lectura={gasto} />}
          <GrupoDeControl lectura={experimento} isAdmin={isAdmin} onCambiar={onCambiarExperimento} />
        </>
      )}
    </section>
  )
}

/**
 * Montado DENTRO del Sheet de Autonomía: el contenido de un Sheet cerrado no
 * se monta, así que las lecturas salen sólo al abrirlo (configuración, no
 * operación). El gasto sólo se le pide al micro si quien mira es administrador.
 */
export function PilotoDirectorAjustes() {
  const { isAdmin } = usePermissionsContext()
  const gasto = useDirectorGasto(isAdmin)
  const experimento = useDirectorExperimento(true)
  return (
    <PilotoDirectorAjustesVista
      isAdmin={isAdmin}
      gasto={gasto}
      experimento={experimento}
      onCambiarExperimento={experimento.cambiar}
    />
  )
}
