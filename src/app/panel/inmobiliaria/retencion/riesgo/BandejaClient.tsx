'use client'

/**
 * Riesgo · Vinci — los casos: inquilinos (¿se van al fin del contrato?) y
 * propietarios (¿sacan sus inmuebles?), cada uno con su puntaje y QUÉ señal
 * del ERP sumó cuánto. Antes era la bandeja de un portafolio de EJEMPLO que
 * sólo cuidaba al propietario.
 *
 * EL MOLDE: la frase afuera; filtros + tabla = una tarjeta; la fila abre el caso.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SegmentedControl } from '@leasefy/cadence'
import { HeartStraight } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/empty-state'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { formatCurrency } from '@/lib/format'
import { useRiesgoDeVinci } from '@/lib/hooks/retencion/use-vinci'
import { PuntajeDeVinci, QUIEN } from '@/components/retencion/vinci'
import { fraseDelRiesgo } from '@/components/retencion/frases'
import type { Poblacion } from '@/lib/types/retencion'

type Filtro = Poblacion | 'todos'

export default function BandejaClient() {
  const { data, isLoading, error, refetch } = useRiesgoDeVinci()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [soloEnRiesgo, setSoloEnRiesgo] = useState(true)

  const casos = useMemo(
    () =>
      (data?.casos ?? [])
        .filter((c) => (filtro === 'todos' ? true : c.poblacion === filtro))
        .filter((c) => (soloEnRiesgo ? c.enRiesgo : true)),
    [data, filtro, soloEnRiesgo],
  )
  const cuenta = (p: Filtro) =>
    (data?.casos ?? []).filter((c) => (p === 'todos' || c.poblacion === p) && (soloEnRiesgo ? c.enRiesgo : true)).length

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">Riesgo de retención</h1>
        {data?.disponible ? <p className="text-sm text-fg-muted">{fraseDelRiesgo(data)}</p> : null}
      </header>

      <EstadoDeDatos
        cargando={isLoading && !data}
        error={error}
        vacio={Boolean(data) && !data!.disponible}
        queEs="los casos de retención"
        onReintentar={() => void refetch()}
        principal
        cuandoVacio={
          <EmptyState
            icon={HeartStraight}
            title="Vinci no puede medir todavía."
            description={`Faltan datos del ERP (${data?.faltan.join(', ') ?? ''}). No se muestran casos inventados.`}
          />
        }
      >
        <section aria-label="Casos" className="rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <SegmentedControl<Filtro>
              aria-label="Inquilinos o propietarios"
              value={filtro}
              onChange={setFiltro}
              options={[
                { value: 'todos', label: `Todos (${cuenta('todos')})` },
                { value: 'inquilino', label: `Inquilinos (${cuenta('inquilino')})` },
                { value: 'propietario', label: `Propietarios (${cuenta('propietario')})` },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={soloEnRiesgo}
                onChange={(e) => setSoloEnRiesgo(e.target.checked)}
                data-testid="vinci-solo-en-riesgo"
              />
              Sólo los que pasan el umbral ({data?.umbral ?? 60}/100)
            </label>
          </div>
          {casos.length === 0 ? (
            <EmptyState
              icon={HeartStraight}
              title={soloEnRiesgo ? 'Nadie pasa el umbral.' : 'Nadie con señales de irse.'}
              description="Con las señales del ERP de hoy no hay casos para mostrar con este filtro."
            />
          ) : (
            <table className="w-full text-left text-sm" data-testid="vinci-casos">
              <thead>
                <tr className="border-b border-border text-fg-muted">
                  <th className="px-4 py-2.5 font-medium">Quién</th>
                  <th className="px-4 py-2.5 font-medium">Riesgo</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Por qué</th>
                  <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Canon en juego</th>
                  <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {casos.map((c) => (
                  <tr key={c.caseId} className="hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <Link
                        href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(c.caseId)}`}
                        className="font-medium text-fg hover:underline"
                      >
                        {c.nombre ?? 'Sin nombre registrado'}
                      </Link>
                      <p className="text-caption text-fg-muted">
                        {QUIEN[c.poblacion]}
                        {c.poblacion === 'inquilino'
                          ? ` · contrato ${c.contratos[0]?.numero ?? ''}`
                          : ` · ${c.contratos.length} ${c.contratos.length === 1 ? 'inmueble' : 'inmuebles'}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <PuntajeDeVinci puntaje={c.puntaje} enRiesgo={c.enRiesgo} />
                    </td>
                    <td className="hidden px-4 py-3 text-fg-muted md:table-cell">
                      {c.senales
                        .slice(0, 2)
                        .map((s) => `${s.texto} (+${s.puntos})`)
                        .join(' · ')}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-mono tabular-nums text-fg sm:table-cell">
                      {formatCurrency(c.canonEnJuegoCop)}
                    </td>
                    <td className="hidden px-4 py-3 text-fg-muted lg:table-cell">
                      {c.plan ? `${c.plan.estado}${c.plan.tareasAbiertas ? ` · ${c.plan.tareasAbiertas} tareas` : ''}` : 'Sin plan'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </EstadoDeDatos>
    </div>
  )
}
