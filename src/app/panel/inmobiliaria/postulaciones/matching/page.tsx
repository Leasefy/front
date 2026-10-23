'use client'

/**
 * /panel/inmobiliaria/postulaciones/matching — Afinidad (antes «Matching»): su resumen.
 *
 * ── Por qué esta pantalla dejó de usar <SalaAgente> ───────────────────────
 * Hoy el micro no corre Matching para ninguna inmobiliaria: las corridas de
 * smart-matching no guardan agencyId, así que el overview vuelve vacío o 404
 * por diseño. <SalaAgente> pintaba igual «Casos por etapa: sin casos» y
 * «Sin actividad reciente», y eso se lee como «el agente trabaja y no
 * encontró nada», que es falso. Acá el vacío dice la verdad —todavía no está
 * trabajando tu cartera— y los números sólo se pintan cuando el overview
 * trae KPIs, que es cuando el agente esté encendido de verdad.
 *
 * El cableado a useAgentOverview se conserva a propósito: el día que el
 * micro persista agencyId, esta pantalla se enciende sola.
 *
 * «¿Cómo funciona?» describe SÓLO lo que existe: candidato validado → cruce
 * con inmuebles vacantes → revisas y decides. El cuarto paso de antes
 * («apruebas y el agente hace el contacto») prometía un contacto que ninguna
 * acción respalda; se fue.
 */

import Link from 'next/link'
import { Buildings, GitMerge, Ranking, UserCheck } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { CifraHeroe, type TonoDelTramo } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { formatKpiValue } from '@/components/inmobiliaria/ai/SalaAgente'
import { Button } from '@/components/ui/button'
import { SinDatos } from '@/components/estado/SinDatos'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PasosExplicados, type QuienLoHace } from '@/components/ui/pasos-explicados'
import type { AgentOverviewResponse } from '@/lib/api/agent-workspace'
import { relativeTime } from '@/lib/cartera'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { useI18n } from '@/lib/i18n'
import { AnimatedNumber, CrossFade, Stagger, StaggerItem } from '@leasefy/cadence'

const PAGES_NS = 'inmobiliaria.ai.workspace.pages.matching'
const SALA_NS = 'inmobiliaria.ai.workspace.sala'
const COLA_HREF = '/panel/inmobiliaria/postulaciones/matching/cola'

/**
 * Los tres pasos que existen hoy. Sin cuarto paso: no hay contacto que aprobar.
 *
 * Viven detrás del botón «¿Cómo funciona?» del encabezado, en el cajón de
 * `ParaEntenderMas` (Nico, 05-10-2026: «eso no debe de estar ahí siempre […]
 * llévalas al botón que al dar clic abre drawer y explica mejor cada cosa»).
 * Antes la tarjeta se veía siempre, también cargando o con error.
 *
 * Verificado contra el código (05-10): compara con los inmuebles disponibles en
 * arriendo y deja los que calzan 70 % o más; en Autónomo sale solo si hay al
 * menos dos opciones; nunca más de un correo cada 24 horas por candidato.
 */
const PASOS: { icon: Icon; clave: string; quien?: QuienLoHace; tuParte?: true }[] = [
  { icon: UserCheck, clave: 'step1' },
  { icon: Buildings, clave: 'step2', quien: 'agente' },
  { icon: Ranking, clave: 'step3', quien: 'tu', tuParte: true },
]

function ComoFunciona() {
  const { t } = useI18n()
  return (
    <ParaEntenderMas
      etiqueta={t(`${PAGES_NS}.comoFunciona.title`)}
      titulo={t(`${PAGES_NS}.comoFunciona.titulo`)}
      descripcion={t(`${PAGES_NS}.comoFunciona.descripcion`)}
    >
      <PasosExplicados
        data-testid="matching-como-funciona"
        pasos={PASOS.map((paso) => ({
          id: paso.clave,
          icono: paso.icon,
          titulo: t(`${PAGES_NS}.comoFunciona.${paso.clave}.title`),
          explicacion: t(`${PAGES_NS}.comoFunciona.${paso.clave}.desc`),
          quien: paso.quien,
          tuParte: paso.tuParte ? t(`${PAGES_NS}.comoFunciona.${paso.clave}.tuParte`) : undefined,
        }))}
      />
    </ParaEntenderMas>
  )
}

/** El tono de cada estado del candidato en la barra: lo que espera, lo que salió, lo que se cayó. */
const TONO_DEL_ESTADO: Record<string, TonoDelTramo> = {
  sugerido: 'aviso',
  en_revision: 'aviso',
  aprobado: 'exito',
  ejecutando: 'exito',
  resuelto: 'exito',
  rechazado: 'neutro',
  fallo: 'critico',
}

/**
 * Lo que se pinta cuando el overview trae KPIs de verdad. GLOW UP 22-10 (revisora r24, Afinidad #5): LA
 * RESPUESTA en grande —los que esperan tu visto bueno, de cuántos con opciones en 30 días—; la barra es
 * el embudo (los estados del candidato, partes del total) y las demás cifras del agente van en UNA línea
 * al pie. Fuera la tarjeta «Estado de los candidatos» (repetía la barra); la actividad, plegada.
 */
function ResumenConDatos({ data }: { data: AgentOverviewResponse }) {
  const { t, locale } = useI18n()
  const segmentos = data.pipeline.filter((seg) => seg.count > 0)
  // IA-A-05 (QA-IA-95, 05-10-2026): sin candidatos con opciones en 30 días no
  // hubo calce que promediar: «0,0 %» era una medición que no ocurrió.
  const con30 = data.kpis.find((k) => k.id === 'candidatos_30d')
  const sinCasos = con30?.value === 0
  // La cifra de arriba: la cola (lo que te toca); si el micro no la manda, la primera.
  const heroe = data.kpis.find((k) => k.id === 'en_cola') ?? data.kpis[0]
  const resto = data.kpis.filter((k) => k !== heroe && k !== con30)

  return (
    <div className="space-y-6" data-testid="matching-resumen-datos">
      <section className="rounded-lg border border-border bg-card px-5 py-5" data-testid="matching-kpis">
        <CifraHeroe
          rotulo={heroe.label}
          cifra={<AnimatedNumber value={heroe.value} from={0} format={(n) => formatKpiValue(n, heroe.format)} />}
          contexto={
            con30 && con30 !== heroe
              ? t(`${PAGES_NS}.deCandidatos`).replace('{{n}}', formatKpiValue(con30.value, con30.format))
              : undefined
          }
          tramos={segmentos.map((seg) => ({
            clave: seg.estado,
            etiqueta: t(`${PAGES_NS}.estado.${seg.estado}`),
            monto: seg.count,
            tono: TONO_DEL_ESTADO[seg.estado] ?? 'neutro',
            cifra: String(seg.count),
          }))}
          pie={
            resto.length > 0 ? (
              <span className="flex flex-wrap gap-x-1.5">
                {resto.map((kpi, i) => (
                  <span key={kpi.id}>
                    {i > 0 ? '· ' : ''}
                    {kpi.label}{' '}
                    {kpi.id === 'calce_promedio' && sinCasos ? (
                      <span data-testid="calce-sin-casos" title="Sin candidatos con opciones en 30 días">—</span>
                    ) : (
                      <span className="font-mono tabular-nums text-fg">{formatKpiValue(kpi.value, kpi.format)}</span>
                    )}
                  </span>
                ))}
              </span>
            ) : undefined
          }
        />
      </section>

      {data.feed.length > 0 && (
        <MasDetalles etiqueta={t(`${SALA_NS}.feedTitle`)} data-testid="matching-actividad">
          <Stagger as="ul" direction="down" className="divide-y divide-border">
            {data.feed.map((entrada) => (
              <StaggerItem as="li" key={entrada.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{entrada.titulo}</p>
                  <p className="truncate text-caption text-fg-muted">{entrada.detalle}</p>
                </div>
                <span className="shrink-0 font-mono text-caption tabular-nums text-fg-muted">
                  {relativeTime(entrada.occurredAt, locale)}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </MasDetalles>
      )}
    </div>
  )
}

function MatchingResumen() {
  const { t } = useI18n()
  const { data, isLoading, error, errorCrudo, refetch } = useAgentOverview('matching')

  // «Encendido» = el micro devolvió KPIs. Un 404 o un overview con todo en
  // cero es el mismo caso: el agente todavía no trabaja esta cartera.
  // IA-A-05 (QA-IA-95): el micro manda SIEMPRE sus cuatro KPI, también en cero;
  // «tiene datos» es que alguno se mueva, no que lleguen.
  const tieneDatos = Boolean(
    data && (data.kpis.some((k) => k.value > 0) || data.pipeline.some((p) => p.count > 0) || data.feed.length > 0),
  )
  const enCola = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* GLOW UP 22-10 (UX): el encabezado común —«¿Cómo funciona?» en la ayuda, la cola como la única
          principal, con su conteo sólo cuando el micro lo reporta (un «(0)» inventado diría que ya revisó)—. */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.nav.secAgentes')}
        titulo={t(`${PAGES_NS}.salaTitulo`)}
        descripcion={t(`${PAGES_NS}.salaDesc`)}
        ayuda={<ComoFunciona />}
        accionPrincipal={
          <Button asChild size="sm" hideArrow className="shrink-0">
            <Link href={COLA_HREF}>
              {t(`${PAGES_NS}.colaLabel`)}
              {typeof enCola === 'number' ? ` (${enCola})` : ''}
            </Link>
          </Button>
        }
      />

      {/* Cargando → fallo / resumen / «aún no trabaja»: cada estado entra con
          su fundido. */}
      <CrossFade swapKey={isLoading ? 'cargando' : error ? 'fallo' : tieneDatos && data ? 'resumen' : 'sin-trabajo'}>
      {isLoading ? (
        // El esqueleto con la forma de la cifra (revisora r24 #6), no la grilla de cuatro cajas de antes.
        <div className="space-y-4 rounded-lg border border-border bg-card px-5 py-5" data-testid="matching-resumen-cargando" aria-busy="true">
          <div className="h-3 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="h-10 w-48 animate-pulse rounded bg-surface-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
        </div>
      ) : error ? (
        <FalloDeCarga error={errorCrudo} queEs={t(`${PAGES_NS}.queEs`)} onReintentar={refetch} />
      ) : tieneDatos && data ? (
        <ResumenConDatos data={data} />
      ) : (
        // Sin CTA a propósito: no hay nada que el usuario pueda hacer para
        // encenderlo desde acá, y un botón que no hace nada es peor que ninguno.
        // Ronda 30: el vacío de la casa (SinDatos), como el de su cola; el envoltorio conserva el data-testid.
        <div data-testid="empty-state" className="rounded-lg border border-border bg-card">
          <SinDatos
            queSon="casos"
            icono={GitMerge}
            titulo={t(`${PAGES_NS}.sinTrabajo.title`)}
            descripcion={t(`${PAGES_NS}.sinTrabajo.desc`)}
          />
        </div>
      )}
      </CrossFade>
    </div>
  )
}

export default function MatchingResumenPage() {
  return (
    // Compuerta del módulo — clave AUSENTE en my-permissions = permitido
    // (ver agent-module-access.ts); presente sin 'view' = negado.
    <PageGuard module="matching">
      <MatchingResumen />
    </PageGuard>
  )
}
