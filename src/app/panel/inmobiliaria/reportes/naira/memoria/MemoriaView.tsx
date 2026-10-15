'use client'

/**
 * MemoriaView — lo que pinta un `ok` de la memoria de Naira (Fase 13, plan 13-07; UI-SPEC §7.8).
 *
 * El corte de la vista va junto a su versión (P9: la memoria no pinta cifras propias). Tras un 409/404 al escribir, avisa y
 * recarga (P4); tras un hecho, toast + recarga + foco (P17). Los filtros se aplican en el cliente sin reordenar (P15). No
 * importa nada de `@/lib/hooks/`: el fallo de la lectura lo decide `VistaDeNaira` antes de llegar aquí.
 */

import type { JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { CaretDown, Notebook } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'

import { ItemDeMemoria, type PermisosDeMemoria } from '@/components/inmobiliaria/naira/ItemDeMemoria'
import { MarcaDeCorte } from '@/components/inmobiliaria/naira/MarcaDeCorte'
import { PropuestaProceduralPendiente } from '@/components/inmobiliaria/naira/PropuestaProceduralPendiente'
import { Button } from '@/components/ui/button'
import {
  DropdownList,
  DropdownListContent,
  DropdownListRadioGroup,
  DropdownListRadioItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { PERSISTED_MEMORY_LAYERS, PROVENANCE_KINDS, type NairaMemoryView } from '@/lib/api/naira/contrato'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_LA_CAPA,
  CLAVE_DE_LA_PROCEDENCIA,
  CLAVE_DEL_AVISO,
  FILTRO_SIN_ELEGIR,
  SIN_FILTROS,
  claveDelHecho,
  filtrarLaMemoria,
  idDelArticuloDeMemoria,
  leerFiltrosDeMemoria,
  siguienteFocoTrasBorrar,
  type AvisoDeMemoria,
  type DesenlaceParaLaVista,
  type FiltrosDeMemoria,
  type OperacionDeMemoria,
} from '@/lib/naira/vocabulario-de-memoria'

export interface MemoriaViewProps {
  readonly vista: NairaMemoryView
  readonly permisos: PermisosDeMemoria
  readonly filtrosIniciales: FiltrosDeMemoria
  readonly onFiltrosCambiados: (filtros: FiltrosDeMemoria) => void
  readonly onRecargar: () => void
}

export function MemoriaView({ vista, permisos, filtrosIniciales, onFiltrosCambiados, onRecargar }: MemoriaViewProps): JSX.Element {
  const { t } = useI18n()
  const idPropuestas = useId()
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [aviso, setAviso] = useState<AvisoDeMemoria | null>(null)
  const refTitulo = useRef<HTMLHeadingElement>(null)
  const refAviso = useRef<HTMLParagraphElement>(null)

  const [foco, setFoco] = useState<{ readonly destino: string | null; readonly vez: number }>({ destino: null, vez: 0 })

  useEffect(() => {
    if (aviso !== null) refAviso.current?.focus()
  }, [aviso])

  // Tras un hecho: el siguiente ítem visible si existe (borrar), si no el título (UI-SPEC §11.2).
  useEffect(() => {
    if (foco.vez === 0) return
    const destino = foco.destino !== null ? document.getElementById(foco.destino) : null
    if (destino !== null) destino.focus()
    else refTitulo.current?.focus()
  }, [foco])

  const visibles = filtrarLaMemoria(vista.items, filtros)
  const idsVisibles = visibles.map((item) => item.id)

  function cambiarFiltros(f: FiltrosDeMemoria): void {
    setFiltros(f)
    onFiltrosCambiados(f)
  }

  function alDesenlace(
    operacion: OperacionDeMemoria,
    d: DesenlaceParaLaVista,
    itemId: string,
    decision: 'confirm' | 'reject' | null,
  ): void {
    if (d.kind === 'recargar') { setAviso(d.aviso); onRecargar(); return }
    setAviso(null)
    toast.success(t(claveDelHecho(operacion, decision)))
    onRecargar()
    let destino: string | null = null
    if (operacion === 'borrar') {
      const siguiente = siguienteFocoTrasBorrar(idsVisibles, itemId)
      destino = siguiente !== null ? idDelArticuloDeMemoria(siguiente) : null
    }
    // El foco se aplica DESPUÉS del commit: con el diálogo todavía montado, su trampa de foco lo devolvería adentro.
    setFoco((f) => ({ destino, vez: f.vez + 1 }))
  }

  const capaElegida = filtros.capa !== FILTRO_SIN_ELEGIR

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 ref={refTitulo} tabIndex={-1} className="text-2xl font-semibold tracking-tight leading-tight">
          {t('inmobiliaria.ai.naira.memoria.titulo')}
        </h1>
        <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.memoria.bajada')}</p>
        <div data-naira-version="" className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
          <span className="font-mono">{t('inmobiliaria.ai.naira.memoria.version', { revision: vista.snapshot.revision })}</span>
          <MarcaDeCorte asOf={vista.generatedAt} />
        </div>
      </header>
      {aviso !== null ? (
        <p
          ref={refAviso}
          tabIndex={-1}
          role="status"
          data-naira-aviso-de-memoria={aviso}
          className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-fg"
        >
          {t(CLAVE_DEL_AVISO[aviso])}
        </p>
      ) : null}
      <div data-naira-filtros="" className="flex flex-col gap-3 md:flex-row md:flex-wrap">
        <div className="-mx-1 overflow-x-auto px-1">
          <DropdownList>
            <DropdownListTrigger asChild>
              <button
                type="button"
                data-naira-filtro-capa=""
                aria-label={t('inmobiliaria.ai.naira.memoria.filtros.capa')}
                className={
                  'inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm ' +
                  (capaElegida ? 'border-border-strong bg-surface-muted' : 'border-border bg-surface hover:bg-surface-muted')
                }
              >
                {filtros.capa !== FILTRO_SIN_ELEGIR
                  ? t(CLAVE_DE_LA_CAPA[filtros.capa])
                  : t('inmobiliaria.ai.naira.memoria.filtros.capa')}
                <CaretDown aria-hidden="true" className="h-3.5 w-3.5 text-fg-muted" />
              </button>
            </DropdownListTrigger>
            <DropdownListContent align="start">
              <DropdownListRadioGroup value={filtros.capa} onValueChange={(capa) => cambiarFiltros(leerFiltrosDeMemoria(capa, filtros.procedencia))}>
                <DropdownListRadioItem value={FILTRO_SIN_ELEGIR}>{t('inmobiliaria.ai.naira.memoria.filtros.todas')}</DropdownListRadioItem>
                {PERSISTED_MEMORY_LAYERS.map((capa) => (
                  <DropdownListRadioItem key={capa} value={capa}>
                    {t(CLAVE_DE_LA_CAPA[capa])}
                  </DropdownListRadioItem>
                ))}
              </DropdownListRadioGroup>
            </DropdownListContent>
          </DropdownList>
        </div>
        <div className="-mx-1 overflow-x-auto px-1">
          <SegmentedControl<FiltrosDeMemoria['procedencia']>
            aria-label={t('inmobiliaria.ai.naira.memoria.filtros.procedencia')}
            value={filtros.procedencia}
            onChange={(procedencia) => cambiarFiltros({ ...filtros, procedencia })}
            options={[
              { value: FILTRO_SIN_ELEGIR, label: t('inmobiliaria.ai.naira.memoria.filtros.todas') },
              ...PROVENANCE_KINDS.map((p) => ({ value: p, label: t(CLAVE_DE_LA_PROCEDENCIA[p]) })),
            ]}
          />
        </div>
      </div>
      {vista.items.length === 0 ? (
        <div data-testid="naira-memoria-vacio">
          <EmptyState
            icon={Notebook}
            title={t('inmobiliaria.ai.naira.memoria.vacioTitulo')}
            description={t('inmobiliaria.ai.naira.memoria.vacioDescripcion')}
          />
        </div>
      ) : visibles.length === 0 ? (
        <div data-testid="naira-memoria-sin-resultados" className="space-y-2">
          <p className="text-sm text-fg-muted">{t('inmobiliaria.ai.naira.memoria.sinResultados')}</p>
          <Button type="button" variant="link" onClick={() => cambiarFiltros(SIN_FILTROS)}>
            {t('inmobiliaria.ai.naira.memoria.quitarFiltros')}
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((item, indice) => (
            <li key={item.id + ':' + indice} className="min-w-0">
              <ItemDeMemoria
                item={item}
                permisos={permisos}
                idsVisibles={idsVisibles}
                onDesenlace={(op, d, id) => alDesenlace(op, d, id, null)}
              />
            </li>
          ))}
        </ul>
      )}
      {vista.pendingProposals.length > 0 ? (
        <section data-naira-propuestas-pendientes="" aria-labelledby={idPropuestas} className="space-y-3">
          <h2 id={idPropuestas} className="text-lg font-semibold">
            {t('inmobiliaria.ai.naira.memoria.propuestas.titulo')}
          </h2>
          <ul className="space-y-2">
            {vista.pendingProposals.map((propuesta, indice) => (
              <PropuestaProceduralPendiente
                key={propuesta.id + ':' + indice}
                propuesta={propuesta}
                puedeResolver={permisos.resolver}
                onDesenlace={(d, decision) => alDesenlace('resolver', d, propuesta.id, decision)}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
