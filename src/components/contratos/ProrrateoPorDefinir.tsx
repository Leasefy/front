'use client'

/**
 * ProrrateoPorDefinir — T-0153 §3.4 (decisión final del dueño).
 *
 * El sistema NUNCA asume si el primer mes se prorratea. Un contrato cuyo
 * archivo no lo dice (celda vacía, columna ausente o texto que no se entiende)
 * se lista acá y NO se manda hasta que la agencia lo define:
 *   · fila por fila, con un SI / NO;
 *   · o en bloque: se marcan todas (o las que se quiera) y un solo paso aplica
 *     el mismo valor a todas.
 * Los contratos que sí traen SI/NO siguen su camino sin esperar a éstos.
 *
 * Es un componente de presentación: la decisión vive en quien lo monta
 * (`onCambiar(indices, valor)`), y viaja como un `prorratearPrimerMes`
 * explícito, igual que si lo hubiera traído el archivo.
 */

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { FilaPorDecidir } from '@/lib/contratos/preparar-filas-para-migrar'

const POR_TANDA = 25

export interface ProrrateoPorDefinirProps {
  /** Todos los contratos cuyo archivo no dice SI/NO, con su decisión si ya se tomó. */
  porDefinir: FilaPorDecidir[]
  /** El archivo no trae la columna «Prorrateado». */
  sinColumna: boolean
  /** Aplica `valor` a esos contratos (`indice` de cada `FilaPorDecidir`). */
  onCambiar: (indices: number[], valor: boolean) => void
}

const contratos = (n: number) => (n === 1 ? '1 contrato' : `${n} contratos`)

export function ProrrateoPorDefinir({ porDefinir, sinColumna, onCambiar }: ProrrateoPorDefinirProps) {
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set())
  const [visibles, setVisibles] = useState(POR_TANDA)

  // Un archivo nuevo trae otras filas: la selección vieja no puede sobrevivir.
  const indices = useMemo(() => porDefinir.map((p) => p.indice), [porDefinir])
  useEffect(() => {
    setSeleccion((actual) => {
      const vigentes = new Set(indices)
      const filtrada = new Set([...actual].filter((i) => vigentes.has(i)))
      return filtrada.size === actual.size ? actual : filtrada
    })
  }, [indices])

  if (porDefinir.length === 0) return null

  const pendientes = porDefinir.filter((p) => p.decision === undefined).length
  const todasMarcadas = seleccion.size === porDefinir.length

  const aplicarEnBloque = (valor: boolean) => {
    if (seleccion.size === 0) return
    onCambiar(
      porDefinir.map((p) => p.indice).filter((i) => seleccion.has(i)),
      valor,
    )
    setSeleccion(new Set())
  }

  const alternar = (indice: number) =>
    setSeleccion((actual) => {
      const siguiente = new Set(actual)
      if (siguiente.has(indice)) siguiente.delete(indice)
      else siguiente.add(indice)
      return siguiente
    })

  return (
    <AlertaAccionable
      severidad={pendientes > 0 ? 'warning' : 'info'}
      data-testid="prorrateo-por-definir"
      titulo={
        pendientes > 0
          ? `Falta definir: ¿se prorratea el primer mes? (${contratos(pendientes)})`
          : `Todas definidas: ${contratos(porDefinir.length)} con el prorrateo que elegiste`
      }
    >
      <p>
        {sinColumna
          ? 'El archivo no trae la columna Prorrateado: defínela para todas o una por una. '
          : 'En estos contratos la celda de Prorrateado está vacía o no se entiende. '}
        {pendientes > 0
          ? 'Mientras no lo definas, esos contratos no se mandan; los demás siguen.'
          : 'Puedes cambiar cualquiera antes de revisar.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3" data-testid="prorrateo-masivo">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={todasMarcadas}
            onCheckedChange={(c) =>
              setSeleccion(c === true ? new Set(porDefinir.map((p) => p.indice)) : new Set())
            }
            aria-label={`Seleccionar las ${porDefinir.length} filas`}
            data-testid="prorrateo-seleccionar-todas"
          />
          Seleccionar todas ({porDefinir.length})
        </label>
        <span className="text-caption" data-testid="prorrateo-seleccionadas" aria-live="polite">
          {seleccion.size === 1 ? '1 seleccionada' : `${seleccion.size} seleccionadas`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          hideArrow
          disabled={seleccion.size === 0}
          onClick={() => aplicarEnBloque(true)}
          data-testid="prorrateo-masivo-si"
        >
          Prorratear (Sí) a las seleccionadas
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          hideArrow
          disabled={seleccion.size === 0}
          onClick={() => aplicarEnBloque(false)}
          data-testid="prorrateo-masivo-no"
        >
          No prorratear (No) a las seleccionadas
        </Button>
      </div>

      <ul className="mt-3 divide-y divide-border" aria-label="Contratos por definir">
        {porDefinir.slice(0, visibles).map((p) => (
          <li
            key={p.indice}
            className="flex flex-wrap items-center gap-3 py-2 text-sm"
            data-testid={`prorrateo-fila-${p.indice}`}
          >
            <Checkbox
              checked={seleccion.has(p.indice)}
              onCheckedChange={() => alternar(p.indice)}
              aria-label={`Elegir la fila ${p.filaDelArchivo}`}
              data-testid={`prorrateo-elegir-${p.indice}`}
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium">Fila {p.filaDelArchivo}</span>
              {p.inmueble ? ` · ${p.inmueble}` : ''}
              {p.inquilino ? ` · ${p.inquilino}` : ''}
              {p.texto ? <span className="block text-caption">El archivo dice «{p.texto}»</span> : null}
            </span>
            <span className="flex items-center gap-2" role="group" aria-label={`¿Se prorratea la fila ${p.filaDelArchivo}?`}>
              <Button
                type="button"
                size="sm"
                variant={p.decision === true ? 'default' : 'outline'}
                hideArrow
                aria-pressed={p.decision === true}
                onClick={() => onCambiar([p.indice], true)}
                data-testid={`prorrateo-si-${p.indice}`}
              >
                Sí
              </Button>
              <Button
                type="button"
                size="sm"
                variant={p.decision === false ? 'default' : 'outline'}
                hideArrow
                aria-pressed={p.decision === false}
                onClick={() => onCambiar([p.indice], false)}
                data-testid={`prorrateo-no-${p.indice}`}
              >
                No
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {visibles < porDefinir.length ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          hideArrow
          className="mt-2"
          onClick={() => setVisibles((v) => v + POR_TANDA)}
          data-testid="prorrateo-ver-mas"
        >
          Ver {Math.min(POR_TANDA, porDefinir.length - visibles)} más
        </Button>
      ) : null}
    </AlertaAccionable>
  )
}
