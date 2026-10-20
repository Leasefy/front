'use client'

import { Button } from '@/components/ui/button'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'

/**
 * El detalle de una fila en un cajón, como en el panel de la inmobiliaria
 * (20-10-2026): lo que la tabla corta (un JSON, un texto largo) se lee
 * entero acá. `campos` son las parejas nombre → valor; `datos` se muestra
 * como JSON con sangría.
 */
export function CajonDelDetalle({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  campos,
  datos,
  tituloDeLosDatos = 'Datos',
  pie,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  campos: Array<{ nombre: string; valor: React.ReactNode }>
  datos?: unknown
  tituloDeLosDatos?: string
  pie?: React.ReactNode
}) {
  const json = datos != null && !(typeof datos === 'object' && Object.keys(datos as object).length === 0)
  return (
    <Cajon abierto={abierto} onOpenChange={(a) => (a ? null : onCerrar())}>
      <CajonCabecera titulo={titulo} descripcion={descripcion} />
      <CajonCuerpo>
        <div className="space-y-5">
          <dl className="divide-y divide-border rounded-lg border border-border">
            {campos.map((c) => (
              <div key={c.nombre} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3 px-4 py-2.5">
                <dt className="text-caption text-fg-muted">{c.nombre}</dt>
                <dd className="min-w-0 break-words text-body-sm text-fg">{c.valor ?? '—'}</dd>
              </div>
            ))}
          </dl>
          {json ? (
            <section className="space-y-2">
              <h3 className="text-body-sm font-medium text-fg">{tituloDeLosDatos}</h3>
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-muted p-3 font-mono text-caption text-fg">
                {JSON.stringify(datos, null, 2)}
              </pre>
            </section>
          ) : null}
        </div>
      </CajonCuerpo>
      <CajonPie>
        {pie}
        <Button variant="outline" hideArrow onClick={onCerrar}>
          Cerrar
        </Button>
      </CajonPie>
    </Cajon>
  )
}
