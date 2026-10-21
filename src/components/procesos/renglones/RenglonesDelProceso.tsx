'use client'

/**
 * Lo que hizo el proceso, renglón por renglón (Nico, 20-10-2026): «todo lo que
 * sea con ver detalle de centro de procesos siempre lo abra con un drawer eso
 * en específico que hizo». Resumen arriba (cuántas salieron, cuántas no),
 * filtros y búsqueda, la lista por páginas, y cada renglón con un cajón propio
 * (la factura, el recibo…) lo abre encima.
 *
 * Un back sin la ruta (404) o sin la migración (`disponible: false`) no pinta
 * nada: el cajón sigue con el registro de siempre.
 */

import { useCallback, useEffect, useState } from 'react'
import { CaretRight, CheckCircle, MinusCircle, WarningCircle } from '@phosphor-icons/react'

import { Input } from '@/components/ui/input'
import { procesosApi } from '@/lib/api/procesos.service'
import type { EstadoDeRenglon, PaginaDeRenglones, RenglonDelProceso } from '@/lib/api/procesos.types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CajonDeLaFacturaEmitida } from './CajonDeLaFacturaEmitida'
import { CajonDelInquilinoDelProceso } from './CajonDelInquilinoDelProceso'
import { FichaDelRecurso, TIPOS_CON_FICHA } from './FichaDelRecurso'

/**
 * Qué recursos tienen su propio cajón: la factura y el inquilino (los de
 * siempre) y los de la ficha (contrato, propietario, cobro, inmueble, giro,
 * asiento). Uno sin cajón se lee, no se abre.
 */
const CON_CAJON = new Set(['FACTURA', 'INQUILINO', ...TIPOS_CON_FICHA])

type Filtro = 'TODOS' | EstadoDeRenglon

export function RenglonesDelProceso({ procesoId, activo }: { procesoId: string; activo: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [buscar, setBuscar] = useState('')
  const [buscado, setBuscado] = useState('')
  const [pagina, setPagina] = useState<PaginaDeRenglones | null>(null)
  const [renglones, setRenglones] = useState<RenglonDelProceso[]>([])
  const [cargando, setCargando] = useState(true)
  const [sinDetalle, setSinDetalle] = useState(false)
  const [abierto, setAbierto] = useState<RenglonDelProceso | null>(null)
  const cerrar = useCallback(() => setAbierto(null), [])

  // La búsqueda espera a que la persona deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => setBuscado(buscar.trim()), 300)
    return () => clearTimeout(t)
  }, [buscar])

  const pedir = useCallback(
    async (despuesDe?: string) => {
      setCargando(true)
      try {
        const p = await procesosApi.renglones(procesoId, {
          estado: filtro === 'TODOS' ? undefined : filtro,
          buscar: buscado || undefined,
          despuesDe,
          limite: 50,
        })
        if (!p.disponible) {
          setSinDetalle(true)
          return
        }
        setPagina(p)
        setRenglones((antes) => (despuesDe ? [...antes, ...p.renglones] : p.renglones))
      } catch {
        // Un back anterior (404) o sin respuesta: el cajón queda con el registro.
        setSinDetalle(true)
      } finally {
        setCargando(false)
      }
    },
    [procesoId, filtro, buscado],
  )

  useEffect(() => {
    void pedir()
  }, [pedir])

  // Mientras el proceso corre, la lista se pone al día sola.
  useEffect(() => {
    if (!activo) return
    const t = setInterval(() => void pedir(), 4000)
    return () => clearInterval(t)
  }, [activo, pedir])

  if (sinDetalle) return null
  const resumen = pagina?.resumen
  if (!cargando && resumen && resumen.total === 0 && !buscado && filtro === 'TODOS') return null

  const opciones: { valor: Filtro; texto: string; cuantos?: number }[] = [
    { valor: 'TODOS', texto: 'Todas', cuantos: resumen?.total },
    { valor: 'OK', texto: 'Salieron', cuantos: resumen?.OK },
    { valor: 'FALLO', texto: 'No salieron', cuantos: resumen?.FALLO },
    ...(resumen && resumen.OMITIDO > 0 ? [{ valor: 'OMITIDO' as Filtro, texto: 'Omitidas', cuantos: resumen.OMITIDO }] : []),
  ]

  return (
    <section className="space-y-3" data-testid="renglones-del-proceso">
      {resumen && (
        <p className="text-body-sm text-fg" data-testid="resumen-de-renglones">
          <span className="font-medium">{resumen.OK.toLocaleString('es-CO')}</span> salieron
          {resumen.FALLO > 0 && (
            <>
              {' · '}
              <span className="font-medium text-danger">{resumen.FALLO.toLocaleString('es-CO')}</span> no salieron
            </>
          )}
          {resumen.OMITIDO > 0 && <> · {resumen.OMITIDO.toLocaleString('es-CO')} omitidas</>}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Qué mostrar">
          {opciones.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="tab"
              aria-selected={filtro === o.valor}
              onClick={() => setFiltro(o.valor)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-caption transition-colors',
                filtro === o.valor ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-muted hover:text-fg',
              )}
              data-testid={`filtro-renglones-${o.valor}`}
            >
              {o.texto}
              {o.cuantos != null && <span className="font-mono tabular-nums">{o.cuantos.toLocaleString('es-CO')}</span>}
            </button>
          ))}
        </div>
        <Input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar en lo que hizo"
          className="h-8 min-w-0 flex-1 basis-40"
          data-testid="buscar-renglones"
        />
      </div>

      <ul className="divide-y divide-border rounded-md border border-border" data-testid="lista-de-renglones">
        {renglones.map((r) => {
          const abre = r.recurso && CON_CAJON.has(r.recurso.tipo)
          const Contenido = (
            <>
              <IconoDelEstado estado={r.estado} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm text-fg" title={r.titulo}>
                  {r.titulo}
                </p>
                {r.detalle && <p className="truncate text-caption text-fg-subtle">{r.detalle}</p>}
                {r.motivo && <p className={cn('text-caption', r.estado === 'FALLO' ? 'text-danger' : 'text-fg-muted')}>{r.motivo}</p>}
              </div>
              {r.montoCop != null && (
                <span className="shrink-0 font-mono text-body-sm tabular-nums text-fg">{formatCurrency(r.montoCop)}</span>
              )}
              {abre && <CaretRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />}
            </>
          )
          return (
            <li key={r.n} data-testid="renglon-del-proceso" data-estado={r.estado}>
              {abre ? (
                <button
                  type="button"
                  onClick={() => setAbierto(r)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Contenido}
                </button>
              ) : (
                <div className="flex items-start gap-3 px-3 py-2.5">{Contenido}</div>
              )}
            </li>
          )
        })}
        {cargando && renglones.length === 0 && (
          <li className="space-y-2 px-3 py-3" role="status" aria-label="Cargando lo que hizo">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
          </li>
        )}
        {!cargando && renglones.length === 0 && (
          <li className="px-3 py-4 text-center text-body-sm text-fg-subtle">Nada con ese filtro.</li>
        )}
      </ul>
      {pagina?.siguiente && (
        <button
          type="button"
          onClick={() => void pedir(pagina.siguiente ?? undefined)}
          disabled={cargando}
          className="text-body-sm font-medium text-primary hover:underline disabled:opacity-60"
          data-testid="mas-renglones"
        >
          {cargando ? 'Cargando…' : 'Ver más'}
        </button>
      )}

      <CajonDeLaFacturaEmitida
        id={abierto?.recurso?.tipo === 'FACTURA' ? abierto.recurso.id : null}
        onCerrar={cerrar}
      />
      <CajonDelInquilinoDelProceso
        id={abierto?.recurso?.tipo === 'INQUILINO' ? abierto.recurso.id : null}
        onCerrar={cerrar}
      />
      <FichaDelRecurso
        recurso={abierto?.recurso && TIPOS_CON_FICHA.has(abierto.recurso.tipo) ? abierto.recurso : null}
        onCerrar={cerrar}
      />
    </section>
  )
}

function IconoDelEstado({ estado }: { estado: EstadoDeRenglon }) {
  if (estado === 'OK') return <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Salió" />
  if (estado === 'FALLO') return <WarningCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="No salió" />
  return <MinusCircle weight="bold" className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-label="Omitida" />
}
