'use client'

/**
 * El historial completo del centro de procesos: todo lo que se lanzó, con
 * filtros por tipo, estado y persona.
 *
 * Con el molde del panel: el resumen es una FRASE afuera; filtros + lista son
 * UNA tarjeta; cada filtro dice que lo es. La fila es la misma del botón del
 * header (`FilaDeProceso`), no una tabla aparte: un proceso se lee igual en
 * los dos lugares.
 *
 * «Persona» sólo aparece para el administrador —el único que ve lo de todo el
 * equipo— y sus opciones salen de lo que ya llegó en la lista: no se le pide
 * al back una lista de miembros para filtrar.
 */

import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { procesosApi } from '@/lib/api/procesos.service'
import type { EstadoDeProceso, FiltrosDeProcesos, Proceso, TipoDeProceso } from '@/lib/api/procesos.types'
import { useCentroDeProcesos } from '@/lib/hooks/use-centro-de-procesos'
import { FilaDeProceso } from './FilaDeProceso'
import { NOMBRE_DEL_ESTADO, NOMBRE_DEL_TIPO } from './estado-del-proceso'

const POR_PAGINA = 30
const TODOS = 'todos'

const ESTADOS: Array<EstadoDeProceso | 'ACTIVOS'> = ['ACTIVOS', 'TERMINADO', 'FALLO', 'CANCELADO', 'EN_COLA']

/** La frase de arriba: qué se está mirando y cuánto hay en curso. */
export function fraseDelHistorial(opciones: {
  veTodos: boolean
  activos: number
  cuantos: number
  hayMas: boolean
}): string {
  const de = opciones.veTodos ? 'Los procesos de todo el equipo' : 'Los procesos que lanzaste'
  const cuantos = `${opciones.cuantos.toLocaleString('es-CO')}${opciones.hayMas ? ' o más' : ''}`
  const vivos =
    opciones.activos === 0
      ? 'ninguno está corriendo ahora'
      : opciones.activos === 1
        ? '1 está corriendo ahora'
        : `${opciones.activos} están corriendo ahora`
  return `${de}: ${cuantos} en esta vista, ${vivos}.`
}

export function HistorialDeProcesos() {
  const [tipo, setTipo] = useState<string>(TODOS)
  const [estado, setEstado] = useState<string>(TODOS)
  const [persona, setPersona] = useState<string>(TODOS)
  const [anteriores, setAnteriores] = useState<Proceso[]>([])
  const [cargandoMas, setCargandoMas] = useState(false)
  const [sinMas, setSinMas] = useState(false)

  const filtros = useMemo<FiltrosDeProcesos>(
    () => ({
      limite: POR_PAGINA,
      ...(tipo !== TODOS ? { tipo: tipo as TipoDeProceso } : {}),
      ...(estado !== TODOS ? { estado: estado as EstadoDeProceso | 'ACTIVOS' } : {}),
      ...(persona === 'mios' ? { alcance: 'mios' as const } : persona !== TODOS ? { usuarioId: persona } : {}),
    }),
    [tipo, estado, persona],
  )
  const centro = useCentroDeProcesos(filtros)
  const data = centro.data

  // Cambiar un filtro empieza la lista de nuevo.
  useEffect(() => {
    setAnteriores([])
    setSinMas(false)
  }, [filtros])

  const lista = useMemo(() => {
    const primeros = data?.procesos ?? []
    const vistos = new Set(primeros.map((p) => p.id))
    return [...primeros, ...anteriores.filter((p) => !vistos.has(p.id))]
  }, [data, anteriores])

  /** Las personas que aparecen en lo cargado, para el filtro del administrador. */
  const personas = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of lista) {
      if (p.lanzadoPor?.id && !p.esMio) mapa.set(p.lanzadoPor.id, p.lanzadoPor.nombre ?? 'Alguien del equipo')
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [lista])

  const hayMas = !sinMas && lista.length >= POR_PAGINA

  const cargarMas = async () => {
    const ultimo = lista[lista.length - 1]
    if (!ultimo) return
    setCargandoMas(true)
    try {
      const r = await procesosApi.listar({ ...filtros, antesDe: ultimo.createdAt })
      setAnteriores((a) => [...a, ...r.procesos])
      if (r.procesos.length < POR_PAGINA) setSinMas(true)
    } finally {
      setCargandoMas(false)
    }
  }

  if (centro.error && !data) {
    return <FalloDeCarga error={centro.fallo} onReintentar={() => centro.refetch()} />
  }

  return (
    <div className="space-y-4" data-testid="historial-de-procesos">
      <p className="text-body-sm text-fg-muted" data-testid="historial-frase">
        {!data
          ? 'Leyendo el centro de procesos…'
          : !data.disponible
            ? data.motivo
            : fraseDelHistorial({
                veTodos: data.veTodos,
                activos: data.activos,
                cuantos: lista.length,
                hayMas,
              })}
      </p>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-end gap-3 border-b border-border-faint px-4 py-3">
          <Filtro etiqueta="Filtrar por tipo" valor={tipo} onCambio={setTipo} testId="filtro-tipo">
            <SelectItem value={TODOS}>Todos los tipos</SelectItem>
            {Object.entries(NOMBRE_DEL_TIPO).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </Filtro>
          <Filtro etiqueta="Filtrar por estado" valor={estado} onCambio={setEstado} testId="filtro-estado">
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {e === 'ACTIVOS' ? 'En cola o en curso' : NOMBRE_DEL_ESTADO[e]}
              </SelectItem>
            ))}
          </Filtro>
          {data?.veTodos && (
            <Filtro etiqueta="Filtrar por persona" valor={persona} onCambio={setPersona} testId="filtro-persona">
              <SelectItem value={TODOS}>Todo el equipo</SelectItem>
              <SelectItem value="mios">Los míos</SelectItem>
              {personas.map(([id, nombre]) => (
                <SelectItem key={id} value={id}>
                  {nombre}
                </SelectItem>
              ))}
            </Filtro>
          )}
        </div>

        {!data && centro.cargando ? (
          <ul className="space-y-2 p-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-14 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </ul>
        ) : lista.length === 0 ? (
          <p className="px-4 py-10 text-center text-body-sm text-fg-muted" data-testid="historial-vacio">
            {tipo !== TODOS || estado !== TODOS || persona !== TODOS
              ? 'Ningún proceso con estos filtros.'
              : 'Todavía no hay procesos. Cuando generes un archivo, emitas facturas, reproceses asientos o cargues la migración, aparecen aquí.'}
          </p>
        ) : (
          <ul className="divide-y divide-border-faint">
            {lista.map((p) => (
              <FilaDeProceso key={p.id} proceso={p} onCambio={() => void centro.refetch()} />
            ))}
          </ul>
        )}

        {hayMas && (
          <div className="border-t border-border-faint px-4 py-3">
            <Button variant="outline" size="sm" hideArrow onClick={() => void cargarMas()} isLoading={cargandoMas}>
              Cargar los anteriores
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function Filtro({
  etiqueta,
  valor,
  onCambio,
  testId,
  children,
}: {
  etiqueta: string
  valor: string
  onCambio: (v: string) => void
  testId: string
  children: React.ReactNode
}) {
  return (
    <label className="flex min-w-[180px] flex-col gap-1">
      <span className="text-caption text-fg-muted">{etiqueta}</span>
      <Select value={valor} onValueChange={onCambio}>
        <SelectTrigger className="h-9" data-testid={testId} aria-label={etiqueta}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  )
}
