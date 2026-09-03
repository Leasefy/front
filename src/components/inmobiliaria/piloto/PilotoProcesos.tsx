'use client'

/**
 * PilotoProcesos.tsx — el «process view» del Piloto.
 *
 * Nico (2026-09-02), mirando Patrimonista: «siempre que llegue un depósito,
 * que el agente de conciliación lo concilie y dé visibilidad de esto; y en
 * ese process view mostremos todas las llamadas de cobranza y mensajes que
 * estemos teniendo con los inquilinos. Múltiples procesos REALES».
 *
 * Tres capas, de arriba a abajo:
 *   1. En vivo — lo que pasa AHORA (una llamada, un depósito conciliándose),
 *      arriba y con movimiento. Si no hay nada vivo, una línea, no una card.
 *   2. Filtros — por tipo (con el total real de cada uno, no el de la página)
 *      y por estado (en curso · te esperan · hechos · sin resultado).
 *   3. La lista — una `ProcesoCard` por proceso, paginada de a 10.
 *
 * Honestidad de fuente: si el ERP no está conectado, o una fuente falló,
 * se dice arriba de la lista — «no hay depósitos» y «no pudimos leer los
 * depósitos» no son la misma frase.
 */

import { useMemo, useState } from 'react'
import { Chip, MonoLabel } from '@leasefy/cadence'
import { AirTrafficControl, Lightning } from '@phosphor-icons/react'

import { Card } from '@/components/ui/card'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/ui/pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'
import type {
  EstadoDeProceso,
  PilotoProcesosResponse,
  Proceso,
  TipoDeProceso,
} from '@/lib/api/piloto'
import { ProcesoCard } from './ProcesoCard'

const POR_PAGINA = 10
const TIPOS: Array<TipoDeProceso | 'todos'> = ['todos', 'deposito', 'llamada', 'whatsapp']
const ESTADOS: Array<EstadoDeProceso | 'todos'> = ['todos', 'en_curso', 'esperando', 'hecho', 'sin_resultado']

export interface PilotoProcesosProps {
  data: PilotoProcesosResponse | null
  isLoading: boolean
  error: string | null
  notAvailable: boolean
  tipo: TipoDeProceso | 'todos'
  onTipo: (tipo: TipoDeProceso | 'todos') => void
  onRefetch?: () => Promise<void> | void
  onAbrir?: (id: string) => void
}

export function PilotoProcesos({
  data,
  isLoading,
  error,
  notAvailable,
  tipo,
  onTipo,
  onRefetch,
  onAbrir,
}: PilotoProcesosProps) {
  const { t } = useI18n()
  const [estado, setEstado] = useState<EstadoDeProceso | 'todos'>('todos')
  const [pagina, setPagina] = useState(1)

  const procesos: Proceso[] = useMemo(() => data?.procesos ?? [], [data])
  const vivos = useMemo(() => procesos.filter((p) => p.enVivo), [procesos])
  const quietos = useMemo(() => procesos.filter((p) => !p.enVivo), [procesos])

  const porEstado = useMemo(() => {
    const n: Record<EstadoDeProceso, number> = { en_curso: 0, esperando: 0, hecho: 0, sin_resultado: 0 }
    for (const p of procesos) n[p.estado] += 1
    return n
  }, [procesos])

  const visibles = useMemo(
    () => (estado === 'todos' ? quietos : quietos.filter((p) => p.estado === estado)),
    [quietos, estado],
  )
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const enPantalla = visibles.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA)

  const totalCargado = data ? Object.values(data.totales).reduce((a, b) => a + b, 0) : 0
  const hayFiltro = estado !== 'todos' || tipo !== 'todos'

  /** Las fuentes que no contestaron, para decirlo arriba de la lista. */
  const avisosDeFuente = useMemo(() => {
    if (!data) return []
    const out: string[] = []
    for (const [fuente, salud] of Object.entries(data.fuentes) as Array<[TipoDeProceso, string]>) {
      if (salud === 'sin_back') out.push(t('inmobiliaria.piloto.procesos.sinBack'))
      else if (salud === 'error') {
        out.push(t('inmobiliaria.piloto.procesos.fuenteCaida', { fuente: t(`inmobiliaria.piloto.procesos.fuente.${fuente}`) }))
      }
    }
    return out
  }, [data, t])

  return (
    <div className="space-y-5">
      {/* ── En vivo ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="procesos-en-vivo" data-testid="procesos-en-vivo">
        <div className="mb-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            {vivos.length > 0 && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            )}
            <span className={vivos.length > 0 ? 'relative inline-flex h-2 w-2 rounded-full bg-success' : 'relative inline-flex h-2 w-2 rounded-full bg-border-strong'} />
          </span>
          <h2 id="procesos-en-vivo"><MonoLabel>{t('inmobiliaria.piloto.procesos.enVivo')}</MonoLabel></h2>
          {data && (
            <span className="ml-auto font-mono text-caption tabular-nums text-fg-subtle">
              {t('inmobiliaria.piloto.procesos.actualizado', { hace: relativeTime(data.tomadoAt, t) })}
            </span>
          )}
        </div>
        {vivos.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {vivos.map((p) => (
              <ProcesoCard key={p.id} proceso={p} expandida {...(onAbrir ? { onAbrir } : {})} />
            ))}
          </div>
        ) : (
          !isLoading && (
            <p className="text-caption text-fg-subtle">{t('inmobiliaria.piloto.procesos.enVivoVacio')}</p>
          )
        )}
      </section>

      {/* ── Avisos de fuente ──────────────────────────────────────────────── */}
      {avisosDeFuente.length > 0 && (
        <AlertaAccionable
          severidad="warning"
          titulo={avisosDeFuente[0] as string}
          data-testid="procesos-aviso-fuente"
          {...(onRefetch ? { accion: { label: t('inmobiliaria.piloto.cajon.reintentar'), onClick: () => void onRefetch() } } : {})}
        >
          {avisosDeFuente.length > 1 ? avisosDeFuente.slice(1).join(' ') : undefined}
        </AlertaAccionable>
      )}

      {/* ── La lista ──────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">{t('inmobiliaria.piloto.procesos.filtrarTipo')}</legend>
            {TIPOS.map((tp) => {
              const n = tp === 'todos' ? totalCargado : (data?.totales[tp] ?? 0)
              return (
                <Chip
                  key={tp}
                  size="sm"
                  selected={tipo === tp}
                  onClick={() => {
                    onTipo(tp)
                    setPagina(1)
                  }}
                  data-testid={`procesos-tipo-${tp}`}
                >
                  {t(`inmobiliaria.piloto.procesos.tipo.${tp}`)}{' '}
                  {data && <span className="tabular-nums">{n}</span>}
                </Chip>
              )
            })}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">{t('inmobiliaria.piloto.procesos.filtrarEstado')}</legend>
            {ESTADOS.map((es) => {
              const n = es === 'todos' ? quietos.length : porEstado[es] - (es === 'en_curso' ? vivos.length : 0)
              if (es !== 'todos' && n === 0 && estado !== es) return null
              return (
                <Chip
                  key={es}
                  size="sm"
                  selected={estado === es}
                  onClick={() => {
                    setEstado(es)
                    setPagina(1)
                  }}
                  data-testid={`procesos-estado-${es}`}
                >
                  {t(`inmobiliaria.piloto.procesos.estado.${es}`)}{' '}
                  <span className="tabular-nums">{n}</span>
                </Chip>
              )
            })}
            {hayFiltro && (
              <Button
                variant="link"
                size="sm"
                hideArrow
                onClick={() => {
                  setEstado('todos')
                  onTipo('todos')
                  setPagina(1)
                }}
              >
                {t('inmobiliaria.piloto.bandeja.limpiar')}
              </Button>
            )}
            {visibles.length > 0 && (
              <span className="ml-auto font-mono text-caption tabular-nums text-fg-subtle">
                {t('inmobiliaria.piloto.procesos.contador', {
                  visibles: String(visibles.length),
                  total: String(totalCargado),
                })}
              </span>
            )}
          </fieldset>
        </div>

        <EstadoDeDatos
          cargando={isLoading}
          error={error ?? undefined}
          vacio={visibles.length === 0}
          queEs={t('inmobiliaria.piloto.procesos.titulo').toLowerCase()}
          {...(onRefetch ? { onReintentar: () => void onRefetch() } : {})}
          esqueleto={
            <div className="p-4">
              <EsqueletoTarjetas cantidad={3} />
            </div>
          }
          cuandoVacio={
            <div className="px-4 py-10">
              <SinDatos
                queSon={t('inmobiliaria.piloto.procesos.titulo').toLowerCase()}
                icono={hayFiltro ? Lightning : AirTrafficControl}
                titulo={t(
                  notAvailable
                    ? 'inmobiliaria.piloto.procesos.sinFuente'
                    : hayFiltro && procesos.length > 0
                      ? 'inmobiliaria.piloto.procesos.vacioFiltro'
                      : 'inmobiliaria.piloto.procesos.vacio',
                )}
                descripcion={
                  notAvailable
                    ? t('inmobiliaria.piloto.procesos.sinFuenteHint')
                    : hayFiltro && procesos.length > 0
                      ? t('inmobiliaria.piloto.procesos.vacioFiltroHint', { n: String(procesos.length) })
                      : t('inmobiliaria.piloto.procesos.vacioHint')
                }
              />
            </div>
          }
        >
          <ol className="space-y-3 p-4 sm:p-5" data-testid="procesos-lista">
            {enPantalla.map((p) => (
              <li key={p.id}>
                <ProcesoCard proceso={p} {...(onAbrir ? { onAbrir } : {})} />
              </li>
            ))}
          </ol>
          {visibles.length > POR_PAGINA && (
            <div className="border-t border-border px-4 py-2">
              <TablePagination
                total={visibles.length}
                page={paginaSegura}
                pageSize={POR_PAGINA}
                onPageChange={setPagina}
              />
            </div>
          )}
        </EstadoDeDatos>
      </Card>
    </div>
  )
}
