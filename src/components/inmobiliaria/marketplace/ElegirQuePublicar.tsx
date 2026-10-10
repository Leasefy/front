'use client'

/**
 * «¿CUÁLES PUBLICAS?» (Nico, 10-10-2026: «nada sale hasta que lo elijan»).
 *
 * Lo migrado nace sin publicar en el marketplace; acá la inmobiliaria elige:
 * los que tienen fotos de una vez, o uno por uno. También sirve para quitar.
 * Publicar es una marca aparte de «disponible»: un arrendado publicado sale
 * cuando quede libre, y cada fila lo dice en palabras.
 *
 * 🔴 Los conteos y el porqué los manda el back: acá no se decide nada.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Storefront } from '@phosphor-icons/react'

import { Badge } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/toast'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import {
  fraseDelCambio,
  marketplaceDelPortafolioApi,
  type ListaParaElegir,
} from '@/lib/api/marketplace-del-portafolio.service'

type Vista = 'no-publicados' | 'publicados'

export interface ElegirQuePublicarProps {
  /** Sólo los inmuebles que creó esta importación (el final de la migración). */
  lote?: string
  /** Después de publicar o quitar, para que quien lo abrió recargue. */
  alCambiar?: () => void
}

export function ElegirQuePublicar({ lote, alCambiar }: ElegirQuePublicarProps) {
  const [lista, setLista] = useState<ListaParaElegir | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [vista, setVista] = useState<Vista>('no-publicados')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [trabajando, setTrabajando] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setLista(await marketplaceDelPortafolioApi.lista(lote ? { lote } : {}))
    } catch (e) {
      setError(e)
    } finally {
      setCargando(false)
    }
  }, [lote])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const visibles = useMemo(
    () => (lista?.inmuebles ?? []).filter((i) => (vista === 'publicados' ? i.publicado : !i.publicado)),
    [lista, vista],
  )
  const elegidosVisibles = visibles.filter((i) => elegidos.has(i.id))
  const todosElegidos = visibles.length > 0 && elegidosVisibles.length === visibles.length

  const alternar = (id: string) =>
    setElegidos((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })

  const alternarTodos = () =>
    setElegidos((prev) => {
      const s = new Set(prev)
      if (todosElegidos) for (const i of visibles) s.delete(i.id)
      else for (const i of visibles) s.add(i.id)
      return s
    })

  const cambiar = async (cuerpo: Parameters<typeof marketplaceDelPortafolioApi.cambiar>[0]) => {
    setTrabajando(true)
    try {
      const r = await marketplaceDelPortafolioApi.cambiar(cuerpo)
      toast.success(fraseDelCambio(r))
      setElegidos(new Set())
      await cargar()
      alCambiar?.()
    } catch (e) {
      toast.error('No se pudo guardar', { description: mensajeParaLaPersona(e) })
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="elegir-que-publicar">
      <EstadoDeDatos cargando={cargando && !lista} error={error} queEs="los inmuebles" onReintentar={cargar}>
        {lista && !lista.disponible && (
          <p className="rounded-md border border-border bg-surface p-3 text-sm text-fg-muted" data-testid="publicar-sin-migrar">
            {lista.motivo ?? 'Esta parte todavía no está disponible.'}
          </p>
        )}
        {lista && lista.disponible && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-border p-0.5 text-sm" role="tablist">
                {(
                  [
                    ['no-publicados', `No publicados (${lista.resumen.noPublicados})`],
                    ['publicados', `Publicados (${lista.resumen.publicados})`],
                  ] as const
                ).map(([v, rotulo]) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={vista === v}
                    onClick={() => setVista(v)}
                    className={`rounded-full px-3 py-1 ${vista === v ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'}`}
                    data-testid={`vista-${v}`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              {vista === 'no-publicados' && lista.resumen.noPublicadosConFotos > 0 && (
                <Button
                  variant="secondary"
                  hideArrow
                  disabled={trabajando}
                  data-testid="publicar-los-que-tienen-fotos"
                  onClick={() =>
                    void cambiar({
                      publicar: true,
                      soloConFotos: true,
                      ...(lote ? { lote } : { propertyIds: visibles.map((i) => i.id) }),
                    })
                  }
                >
                  <ImageIcon className="h-4 w-4" />
                  Publicar los {lista.resumen.noPublicadosConFotos} que tienen fotos
                </Button>
              )}
            </div>

            {visibles.length === 0 ? (
              <SinDatos
                queSon="inmuebles"
                icono={Storefront}
                titulo={vista === 'no-publicados' ? 'Todo está publicado' : 'Nada está publicado todavía'}
                descripcion={
                  vista === 'no-publicados'
                    ? 'Todos tus inmuebles salen en el marketplace cuando están disponibles.'
                    : 'Elige en «No publicados» cuáles salen en el marketplace.'
                }
              />
            ) : (
              <div className="max-h-[52vh] overflow-y-auto rounded-lg border border-border" data-lenis-prevent>
                <label className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 text-sm text-fg-muted">
                  <Checkbox checked={todosElegidos} onCheckedChange={alternarTodos} aria-label="Elegir todos" />
                  Elegir los {visibles.length}
                </label>
                <ul className="divide-y divide-border">
                  {visibles.map((i) => (
                    <li key={i.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-surface" data-testid="inmueble-para-elegir">
                        <Checkbox
                          checked={elegidos.has(i.id)}
                          onCheckedChange={() => alternar(i.id)}
                          aria-label={`Elegir ${i.titulo}`}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{i.titulo}</span>
                          <span className="block truncate text-xs text-fg-muted">
                            {[i.barrio, i.ciudad].filter(Boolean).join(', ') || i.direccion || 'Sin dirección'}
                            {i.canonCop ? ` · ${formatCurrency(i.canonCop)}${i.venta ? '' : ' / mes'}` : ''}
                          </span>
                          {i.porQueNoSeVe && (
                            <span className="mt-0.5 block text-xs text-fg-subtle">{i.porQueNoSeVe}</span>
                          )}
                        </span>
                        <Badge variant={i.fotos > 0 ? 'secondary' : 'outline'} className="shrink-0 whitespace-nowrap">
                          {i.fotos > 0 ? `${i.fotos} ${i.fotos === 1 ? 'foto' : 'fotos'}` : 'Sin fotos'}
                        </Badge>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {elegidosVisibles.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-2" data-testid="acciones-de-los-elegidos">
                <span className="mr-auto text-sm text-fg-muted">
                  {elegidosVisibles.length} {elegidosVisibles.length === 1 ? 'elegido' : 'elegidos'}
                </span>
                {vista === 'no-publicados' ? (
                  <Button
                    hideArrow
                    disabled={trabajando}
                    data-testid="publicar-los-elegidos"
                    onClick={() => void cambiar({ publicar: true, propertyIds: elegidosVisibles.map((i) => i.id) })}
                  >
                    Publicar {elegidosVisibles.length === 1 ? 'el elegido' : `los ${elegidosVisibles.length}`}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    hideArrow
                    disabled={trabajando}
                    data-testid="quitar-los-elegidos"
                    onClick={() => void cambiar({ publicar: false, propertyIds: elegidosVisibles.map((i) => i.id) })}
                  >
                    Quitar del marketplace
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </EstadoDeDatos>
    </div>
  )
}
