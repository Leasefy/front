'use client'

/**
 * PilotoBandeja — lo que los agentes necesitan de vos, en una sola lista.
 *
 * ── Por qué se rediseñó (medido en pantalla el 2026-08-30) ─────────────────
 * La versión anterior pintaba 20 tarjetas de 161 px con el MISMO chip rojo
 * «ALTA» (21 veces en una página): 3.216 px de scroll donde nada destacaba
 * sobre nada. Cuando todo es urgente, nada es urgente.
 *
 * Este rediseño cambia tres cosas:
 *
 *   1. La señal es la ESPERA, no un chip repetido. Una carta que lleva 28
 *      días parada no puede verse igual que una de ayer: la antigüedad se
 *      pinta con escala (7 d rojo · 2 d ámbar · el resto tenue) y la lista
 *      se ordena por quién lleva más tiempo esperando.
 *   2. Se agrupa por TIPO de decisión con chips-filtro que traen el conteo,
 *      el patrón canónico del panel (cobranza/inbox y cobranza/llamadas).
 *   3. Filas densas (~72 px) + paginación de 10, para que la bandeja quepa
 *      en pantalla en vez de empujar todo lo demás fuera del viewport.
 *
 * Estados: `EstadoDeDatos` (cargando → falló → vacío → datos) en vez de las
 * tres cajas artesanales que tenía antes. `SinDatos` distingue el vacío por
 * filtro del vacío de verdad.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowRight,
  ChatCircleDots,
  Clock,
  FileText,
  HandCoins,
  Handshake,
  Receipt,
  ShieldCheck,
  Sparkle,
  Tray,
  UserSound,
  type Icon,
} from '@phosphor-icons/react'
import { Chip } from '@leasefy/cadence'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TablePagination } from '@/components/ui/pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { EsqueletoTarjetas } from '@/components/estado/EsqueletoTabla'
import { useI18n } from '@/lib/i18n'
import { relativeTime } from '@/components/inmobiliaria/ai/ColaHumana'
import { formatCurrency } from '@/lib/format'
import { runInboxAccion, type InboxItem } from '@/lib/api/piloto'

const POR_PAGINA = 10

/** Las 8 fuentes del contrato §4 (bandeja.ts del micro), con su cara visible. */
const FUENTE_META: Record<string, { icon: Icon; label: string }> = {
  carta_prejuridica: { icon: FileText, label: 'Cartas' },
  siniestro: { icon: ShieldCheck, label: 'Siniestros' },
  escalacion: { icon: UserSound, label: 'Escalaciones' },
  whatsapp: { icon: ChatCircleDots, label: 'WhatsApp' },
  plan_de_pago: { icon: Handshake, label: 'Planes de pago' },
  retencion: { icon: HandCoins, label: 'Retención' },
  calidad: { icon: Sparkle, label: 'Calidad' },
  factura_ap: { icon: Receipt, label: 'Cuentas por pagar' },
}

function metaDe(fuente: string): { icon: Icon; label: string } {
  return (
    FUENTE_META[fuente] ?? {
      icon: Tray,
      label: fuente.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()),
    }
  )
}

/**
 * Días de espera → color. Los umbrales son ALTOS a propósito: con «rojo a
 * los 2 días» toda la lista salía roja y volvíamos al problema que este
 * rediseño vino a matar (21 chips «ALTA» idénticos). El rojo se reserva
 * para lo verdaderamente escandaloso; el ámbar hace el trabajo diario.
 */
function tonoDeEspera(desde: string): string {
  const dias = (Date.now() - new Date(desde).getTime()) / 86_400_000
  if (!Number.isFinite(dias)) return 'text-fg-subtle'
  if (dias >= 30) return 'text-danger'
  if (dias >= 7) return 'text-warning'
  return 'text-fg-subtle'
}

export interface PilotoBandejaProps {
  items: InboxItem[]
  isLoading: boolean
  error: string | null
  onRefetch: () => Promise<void>
}

export function PilotoBandeja({ items, isLoading, error, onRefetch }: PilotoBandejaProps) {
  const { t } = useI18n()
  const [fuenteFiltro, setFuenteFiltro] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [enVuelo, setEnVuelo] = useState<string | null>(null)

  /** Conteo por fuente para los chips — sobre TODO, no sobre lo filtrado. */
  const grupos = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const i of items) cuenta.set(i.fuente, (cuenta.get(i.fuente) ?? 0) + 1)
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [items])

  /** Quien más espera, primero: la bandeja se lee de arriba hacia abajo. */
  const visibles = useMemo(() => {
    const filtrados = fuenteFiltro ? items.filter((i) => i.fuente === fuenteFiltro) : items
    return [...filtrados].sort(
      (a, b) => new Date(a.desde).getTime() - new Date(b.desde).getTime(),
    )
  }, [items, fuenteFiltro])

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const enPantalla = visibles.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA)

  const ejecutar = useCallback(
    async (item: InboxItem) => {
      if (!item.accion) return
      setEnVuelo(item.id)
      try {
        const res = await runInboxAccion(item.accion)
        if (res.ok) {
          toast.success(t('inmobiliaria.piloto.bandeja.toastOk', { label: item.accion.label }))
          await onRefetch()
        } else {
          toast.error(
            t('inmobiliaria.piloto.bandeja.toastFail', { error: res.error ?? 'error' }),
          )
        }
      } finally {
        setEnVuelo(null)
      }
    },
    [onRefetch, t],
  )

  const hayFiltro = fuenteFiltro !== null

  return (
    <Card className="overflow-hidden">
      {/* Encabezado: qué es esto y cuánto hay */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">
          {t('inmobiliaria.piloto.bandeja.titulo')}
        </h2>
        {!isLoading && !error && items.length > 0 && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-fg-muted">
            {hayFiltro
              ? t('inmobiliaria.piloto.bandeja.contadorFiltrado', {
                  visibles: String(visibles.length),
                  total: String(items.length),
                })
              : t('inmobiliaria.piloto.bandeja.contador', { total: String(items.length) })}
          </span>
        )}
      </div>

      {/* Filtros por tipo de decisión — con el conteo adentro del chip */}
      {!isLoading && !error && grupos.length > 1 && (
        <fieldset className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <legend className="sr-only">{t('inmobiliaria.piloto.bandeja.filtrarPorTipo')}</legend>
          {grupos.map(([fuente, n]) => {
            const meta = metaDe(fuente)
            const FuenteIcon = meta.icon
            const activo = fuenteFiltro === fuente
            return (
              <Chip
                key={fuente}
                size="sm"
                selected={activo}
                onClick={() => {
                  setFuenteFiltro(activo ? null : fuente)
                  setPagina(1)
                }}
                icon={<FuenteIcon weight="duotone" aria-hidden="true" />}
                data-testid={`piloto-chip-${fuente}`}
              >
                {meta.label} <span className="tabular-nums">{n}</span>
              </Chip>
            )
          })}
          {hayFiltro && (
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={() => {
                setFuenteFiltro(null)
                setPagina(1)
              }}
            >
              {t('inmobiliaria.piloto.bandeja.limpiar')}
            </Button>
          )}
        </fieldset>
      )}

      <EstadoDeDatos
        cargando={isLoading}
        error={error ?? undefined}
        vacio={visibles.length === 0}
        queEs={t('inmobiliaria.piloto.bandeja.titulo').toLowerCase()}
        onReintentar={onRefetch}
        esqueleto={
          <div className="p-4">
            <EsqueletoTarjetas cantidad={4} />
          </div>
        }
        cuandoVacio={
          hayFiltro ? (
            <div className="px-4 py-10">
              <SinDatos
                hayFiltros
                queSon={t('inmobiliaria.piloto.bandeja.decisiones')}
                icono={Tray}
                onLimpiarFiltros={() => {
                  setFuenteFiltro(null)
                  setPagina(1)
                }}
              />
            </div>
          ) : (
            <div className="px-4 py-10">
              <SinDatos
                queSon={t('inmobiliaria.piloto.bandeja.decisiones')}
                icono={Tray}
                titulo={t('inmobiliaria.piloto.bandeja.vacia')}
                descripcion={t('inmobiliaria.piloto.bandeja.vaciaHint')}
              />
            </div>
          )
        }
      >
        <ul role="list" className="divide-y divide-border">
          {enPantalla.map((item) => {
            const meta = metaDe(item.fuente)
            const FuenteIcon = meta.icon
            const ocupado = enVuelo === item.id
            return (
              <li
                key={item.id}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-muted"
                  aria-hidden="true"
                >
                  <FuenteIcon weight="duotone" className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={item.href}
                      className="truncate text-sm font-medium text-fg hover:underline"
                    >
                      {item.titulo}
                    </Link>
                    <span
                      className={`ml-auto flex shrink-0 items-center gap-1 font-mono text-[11px] tabular-nums ${tonoDeEspera(item.desde)}`}
                      title={new Date(item.desde).toLocaleString('es-CO')}
                    >
                      <Clock weight="duotone" className="h-3 w-3" aria-hidden="true" />
                      {relativeTime(item.desde, t)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">
                    {item.resumen}
                    {typeof item.montoCop === 'number' && (
                      <span className="ml-1 font-mono tabular-nums text-fg">
                        · {formatCurrency(item.montoCop)}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-center">
                  {item.accion ? (
                    <Button
                      size="sm"
                      hideArrow
                      isLoading={ocupado}
                      onClick={() => void ejecutar(item)}
                    >
                      {item.accion.label}
                    </Button>
                  ) : (
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                    >
                      {t('inmobiliaria.piloto.bandeja.decidir')}
                      <ArrowRight weight="bold" className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

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
  )
}
