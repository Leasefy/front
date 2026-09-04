'use client'

/**
 * AcuerdosGeneralesTabla — los acuerdos que la inmobiliaria escribió y que el
 * agente puede cerrar SIN preguntar.
 *
 * Vive en Acuerdos de pago, no en Configuración. Armar el marco de los acuerdos
 * no es un ajuste del sistema: es el acuerdo más importante que tiene la
 * inmobiliaria, y se hace donde se miran los acuerdos.
 *
 * Distinto de `AcuerdosGeneralesCard`, que edita los LÍMITES (el techo de la
 * política). Un acuerdo dice qué ofrecer; el límite, hasta dónde. El techo
 * recorta al acuerdo, nunca al revés.
 *
 * Anatomía canónica del panel: Card ├ cabecera ├ tabla └ paginación. La misma
 * de `AcuerdosTabla`, que vive en esta misma pantalla: dos tablas apiladas que
 * se recortan distinto se leen como dos componentes ajenos.
 */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Handshake, PencilSimple, Trash } from '@phosphor-icons/react'
import { Card } from '@leasefy/cadence'

import {
  Button,
  Switch,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { TablePagination } from '@/components/ui/pagination'
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import {
  useAcuerdosGenerales,
  type AcuerdoGeneral,
} from '@/lib/hooks/cobranza/use-acuerdos-generales'
import { cuandoAplica, queOfrece } from '@/lib/cobranza/acuerdo-general-vocab'

const BASE = '/panel/inmobiliaria/cobros/cobranza/acuerdos/generales'

export function AcuerdosGeneralesTabla() {
  const { canAccess } = usePermissionsContext()
  const canEdit = canAccess('cobranza', 'configure')
  const { acuerdos, isLoading, error, refetch, editar, borrar } = useAcuerdosGenerales()

  const [ocupado, setOcupado] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)

  // Sin `resetKey`: la tabla no tiene filtros ni búsqueda, así que no hay nada
  // que cambie el conjunto de filas y obligue a volver a la página 1. Si el
  // total encoge (se borró un acuerdo), el hook reencuadra solo.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(acuerdos)

  const alternar = useCallback(
    async (a: AcuerdoGeneral) => {
      setOcupado(a.id)
      setErrorAccion(null)
      try {
        await editar(a.id, { active: !a.active })
      } catch (e) {
        setErrorAccion(e instanceof Error ? e.message : 'No pudimos guardar el cambio.')
      } finally {
        setOcupado(null)
      }
    },
    [editar],
  )

  const eliminar = useCallback(
    async (a: AcuerdoGeneral) => {
      // Borrar un acuerdo cambia lo que el agente ofrece a partir de la próxima
      // llamada: se confirma, y se dice cuál.
      const ok = window.confirm(
        `¿Borrar «${a.name}»? El agente deja de ofrecerlo desde la próxima llamada. Para pausarlo sin perderlo, apagalo.`,
      )
      if (!ok) return
      setOcupado(a.id)
      setErrorAccion(null)
      try {
        await borrar(a.id)
      } catch (e) {
        setErrorAccion(e instanceof Error ? e.message : 'No pudimos borrar el acuerdo.')
      } finally {
        setOcupado(null)
      }
    },
    [borrar],
  )

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">Acuerdos generales</h2>
          <p className="text-xs text-fg-muted max-w-xl leading-relaxed">
            Las reglas que el agente cierra solo: «si el deudor cabe acá, tomalo
            y no me preguntes». Sin ninguno, el agente usa las condiciones que
            trae Leasefy por etapa de mora.
          </p>
        </div>
        {/* Secundario: el primario de la pantalla es «Nuevo acuerdo». Dos pills
            primarias apiladas compiten y ninguna se lee como la principal. */}
        {canEdit && (
          <Button asChild size="sm" variant="outline" hideArrow className="shrink-0">
            <Link href={`${BASE}/nuevo`} data-testid="acuerdo-general-crear">
              Crear acuerdo general
            </Link>
          </Button>
        )}
      </div>

      {/* Cargando, falló, y no hay: tres cosas distintas, tres mensajes. */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 flex-wrap border-b border-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span>No pudimos cargar los acuerdos generales. {error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 underline underline-offset-2 hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {errorAccion && (
        <div
          role="alert"
          className="border-b border-border bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {errorAccion}
        </div>
      )}

      {isLoading && acuerdos.length === 0 && !error ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : acuerdos.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <Handshake className="w-7 h-7 text-fg-muted" weight="duotone" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">
            Todavía no escribiste ningún acuerdo general
          </p>
          <p className="text-xs text-fg-muted max-w-md">
            Mientras tanto el agente negocia con las condiciones que trae Leasefy
            para cada etapa de mora. Escribí uno cuando quieras que ofrezca algo
            distinto.
          </p>
          {canEdit && (
            <Button asChild size="sm" variant="outline" hideArrow className="mt-2">
              <Link href={`${BASE}/nuevo`}>Crear el primero</Link>
            </Button>
          )}
        </div>
      ) : acuerdos.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Acuerdo</TableHead>
                <TableHead>Cuándo aplica</TableHead>
                <TableHead>Qué ofrece</TableHead>
                <TableHead className="text-right">Prioridad</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((a) => (
                <TableRow key={a.id} data-testid={`acuerdo-general-${a.id}`}>
                  <TableCell>
                    <span className="font-medium text-fg">{a.name}</span>
                    <span className="block text-xs text-fg-muted">{a.conditionEs}</span>
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs max-w-[18rem]">
                    {cuandoAplica(a)}
                  </TableCell>
                  <TableCell className="text-fg-muted text-xs max-w-[18rem]">
                    {queOfrece(a)}
                  </TableCell>
                  {/* Números alineados: es una columna que se compara. */}
                  <TableCell className="text-right font-mono tabular-nums">
                    {a.priority}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={a.active}
                      disabled={!canEdit || ocupado === a.id}
                      onCheckedChange={() => void alternar(a)}
                      aria-label={`${a.active ? 'Apagar' : 'Prender'} ${a.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    {canEdit && (
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm" hideArrow>
                          <Link href={`${BASE}/${a.id}`} aria-label={`Editar ${a.name}`}>
                            <PencilSimple className="w-4 h-4" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          hideArrow
                          disabled={ocupado === a.id}
                          onClick={() => void eliminar(a)}
                          aria-label={`Borrar ${a.name}`}
                        >
                          <Trash className="w-4 h-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {acuerdos.length > 1 && (
        <p className="border-t border-border px-4 py-2 text-xs text-fg-muted">
          Si un deudor califica para varios, gana el de mayor prioridad.
        </p>
      )}

      {/* Un paginador que no pagina es ruido. */}
      {shouldPaginate && (
        <div className="border-t border-border px-4 py-3">
          <TablePagination
            total={total}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </Card>
  )
}
