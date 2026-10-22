'use client'

/**
 * 🔴 Los recibos de caja de la inmobiliaria, todos en un lugar (Juan, Portofino,
 * 15-10-2026: «¿dónde se ven los recibos de caja que se generaron?»). Antes sólo
 * se veían dentro de cada cobro o de cada contrato.
 *
 * Paginada en el servidor (Portofino pasa de 15.000), con un buscador que
 * entiende el número del recibo o del contrato, el inquilino, el documento, el
 * inmueble y la referencia, sin tildes. Cada recibo se baja en PDF (el mismo
 * papel que ve el inquilino) y el administrador lo anula con motivo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DownloadSimple, MagnifyingGlass, Prohibit, Scroll, X } from '@phosphor-icons/react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconButton } from '@leasefy/cadence'
import { Input, Textarea } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { FalloDeCarga } from '@/components/estado/FalloDeCarga'
import { SinDatos } from '@/components/estado/SinDatos'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { toast } from '@/components/ui/toast'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service'
import {
  listaDeRecibosApi,
  type EstadoDeLosRecibos,
  type FilaDeLaListaDeRecibos,
  type ListaDeRecibos,
} from '@/lib/api/lista-de-recibos.service'
import { MOTIVO_DE_ANULAR_MAXIMO, MOTIVO_DE_ANULAR_MINIMO } from '@/lib/recaudo/limites-del-recibo'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { formatCurrency } from '@/lib/format'
import { diaLegible } from '@/lib/mandato/textos'
import { nombreDelMes } from '@/lib/utils/mes'
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa'
import { cn } from '@/lib/utils'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

const POR_PAGINA = [25, 50, 100]
const ESTADOS: Array<{ id: EstadoDeLosRecibos; nombre: string }> = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'vivos', nombre: 'Vigentes' },
  { id: 'anulados', nombre: 'Anulados' },
]

/** Espera a que la persona deje de escribir antes de preguntarle al servidor. */
function useConPausa<T>(valor: T, ms: number): T {
  const [quieto, setQuieto] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setQuieto(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return quieto
}

export function RecibosDeCajaDeLaInmobiliaria() {
  const [busqueda, setBusqueda] = useState('')
  const q = useConPausa(busqueda, 300)
  const [estado, setEstado] = useState<EstadoDeLosRecibos>('todos')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(POR_PAGINA[0])
  const [datos, setDatos] = useState<ListaDeRecibos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [aAnular, setAAnular] = useState<FilaDeLaListaDeRecibos | null>(null)
  const [bajando, setBajando] = useState<string | null>(null)

  /*
   * Anular es del ADMINISTRADOR (PG-R06: el back responde 403
   * SOLO_UN_ADMINISTRADOR_ANULA). Al contador no se le ofrece el botón. Fuera
   * del proveedor de permisos (una prueba aislada), se ofrece.
   */
  const permisos = usePermissionsContextSafe()
  const puedeAnular = permisos === null || permisos.isAdmin || permisos.agencyRole === 'ADMIN'

  // Cambiar lo que se busca vuelve a la primera página.
  useEffect(() => setPagina(1), [q, estado, porPagina])

  const cargar = useCallback(() => {
    setCargando(true)
    setError(null)
    listaDeRecibosApi
      .lista({ q, estado, pagina, porPagina })
      .then(setDatos)
      .catch((e: unknown) => setError(e ?? new Error('No se pudieron cargar los recibos.')))
      .finally(() => setCargando(false))
  }, [q, estado, pagina, porPagina])

  useEffect(() => cargar(), [cargar])

  const hayFiltros = q.trim() !== '' || estado !== 'todos'

  async function bajar(r: FilaDeLaListaDeRecibos) {
    setBajando(r.id)
    try {
      await listaDeRecibosApi.bajarPdf(r)
    } catch (e) {
      toast.error(mensajeParaLaPersona(e, { porDefecto: 'No se pudo bajar el recibo.', accion: 'bajar el recibo' }))
    } finally {
      setBajando(null)
    }
  }

  const resumen = useMemo(() => {
    if (!datos) return null
    const n = datos.total
    return `${n.toLocaleString(localeDeLasCifras())} ${n === 1 ? 'recibo' : 'recibos'} · ${formatCurrency(datos.totalCop)} recibidos${
      estado === 'anulados' ? '' : ' (sin contar los anulados)'
    }`
  }, [datos, estado])

  return (
    <div className="space-y-4" data-testid="recibos-de-caja-de-la-inmobiliaria">
      {/* GLOW UP (21-10): UNA tarjeta — la barra (buscar, qué recibos, cuántos) es parte de la tabla. */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <Input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número, inquilino, documento, inmueble o referencia"
            aria-label="Buscar recibos"
            className="pl-9 pr-9"
            data-testid="buscar-recibos"
          />
          {busqueda && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => setBusqueda('')}
              aria-label="Borrar la búsqueda"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              icon={<X className="h-4 w-4" />}
            />
          )}
        </div>
        <Select value={estado} onValueChange={(v) => setEstado(v as EstadoDeLosRecibos)}>
          <SelectTrigger className="h-10 w-full sm:w-44" aria-label="Qué recibos ver" data-testid="estado-de-los-recibos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {resumen && (
          <p className="text-sm text-fg-muted sm:ml-auto" data-testid="resumen-de-los-recibos">
            {resumen}
          </p>
        )}
      </div>

      {error && !datos ? (
        <div className="p-4">
          <FalloDeCarga error={error} queEs="los recibos de caja" onReintentar={cargar} />
        </div>
      ) : cargando && !datos ? (
        <EsqueletoTabla columnas={5} />
      ) : datos && datos.recibos.length === 0 ? (
        <SinDatos
          hayFiltros={hayFiltros}
          queSon="recibos de caja"
          icono={Scroll}
          titulo={hayFiltros ? 'Ningún recibo coincide' : 'Todavía no hay recibos de caja'}
          descripcion={
            hayFiltros
              ? 'Prueba con otro número, nombre o documento.'
              : 'Cada pago que registres —en Recaudo, por la conciliación o en línea— deja su recibo aquí.'
          }
          onLimpiarFiltros={() => {
            setBusqueda('')
            setEstado('todos')
          }}
        />
      ) : datos ? (
        // 22-10 (revisión, 390): en el celular son tarjetas; el desplazamiento lateral sólo desde md.
        <div className={cn('md:overflow-x-auto', cargando && 'opacity-70')}>
          {/* GLOW UP (revisión de Dinero, 22-10-2026): cinco columnas —el recibo con su
              fecha, quién y dónde, el medio, el valor y las acciones— y, bajo 768,
              una tarjeta por recibo. */}
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead className="w-36">Recibo</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBodyAnimado className="max-md:block">
              {datos.recibos.map((r) => (
                <TableRowAnimada
                  key={r.id}
                  className={cn(
                    'max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1.5 max-md:border-b max-md:border-border max-md:px-4 max-md:py-4',
                    r.anulado && 'text-fg-muted',
                  )}
                  data-testid={`recibo-${r.numero}`}
                >
                  <TableCell className="md:whitespace-nowrap max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0">
                    <span className="font-mono text-body-sm tabular-nums">N.º {r.numero}</span>
                    {r.anulado && (
                      <Badge variant="outline" className="ml-2 border-danger/40 text-danger">
                        Anulado
                      </Badge>
                    )}
                    <p className="text-caption text-fg-muted">
                      {fechaCorta(r.fecha)}
                      {r.mes ? ` · cuota de ${nombreDelMes(r.mes)}` : ''}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[22rem] max-md:col-start-1 max-md:row-start-1 max-md:block max-md:max-w-none max-md:p-0">
                    <span className={cn('font-medium', !r.inquilino && 'font-normal text-fg-muted')}>{r.inquilino ?? 'Sin nombre registrado'}</span>
                    {r.documento ? <p className="font-mono text-caption tabular-nums text-fg-subtle">{r.documento}</p> : null}
                    <p className="line-clamp-1 text-caption text-fg-muted" title={r.inmueble ?? undefined}>
                      {r.inmueble ?? '—'}
                      {r.contrato ? ` · Contrato #${r.contrato.numero}` : ''}
                    </p>
                    {r.contrato?.externalId && r.contrato.externalId !== String(r.contrato.numero) ? (
                      <p className="text-caption text-fg-subtle">{r.contrato.externalId} en su sistema</p>
                    ) : null}
                    {r.anulado && r.motivoDeLaAnulacion && (
                      <p className="text-caption text-danger">Anulado: {r.motivoDeLaAnulacion}</p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[15rem] max-md:col-span-2 max-md:block max-md:max-w-none max-md:p-0 max-md:text-caption max-md:text-fg-muted">
                    {r.medioLegible}
                    {/* La referencia INTERNA («cobro-<uuid>», la del pago en línea) no se muestra;
                        la del banco sí, en un renglón y entera al pasar el cursor. */}
                    {r.referencia && !/^cobro-[0-9a-f]{8}-/i.test(r.referencia) && (
                      <p className="truncate text-caption text-fg-muted" title={`Ref. ${r.referencia}`}>
                        Ref. {r.referencia}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0', r.anulado ? 'line-through' : 'text-fg')}>
                    {formatCurrency(r.valorCop)}
                  </TableCell>
                  <TableCell className="text-right max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0">
                    <div className="flex justify-end gap-1">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={`Bajar el recibo ${r.numero} en PDF`}
                        title="Bajar en PDF"
                        disabled={bajando === r.id}
                        onClick={() => void bajar(r)}
                        data-testid={`pdf-del-recibo-${r.numero}`}
                        icon={<DownloadSimple className="h-4 w-4" />}
                      />
                      {puedeAnular && !r.anulado && (
                        // Anular no se esconde en un ícono suelto; dice lo que hace (y abre la confirmación de siempre).
                        <Button
                          variant="ghost"
                          size="sm"
                          hideArrow
                          aria-label={`Anular el recibo ${r.numero}`}
                          onClick={() => setAAnular(r)}
                          data-testid={`anular-recibo-${r.numero}`}
                          // 22-10 (revisión): gris en la fila (11 rojos seguidos gritaban); rojo al pasar y en la confirmación.
                          className="text-fg-muted hover:text-danger"
                        >
                          <Prohibit className="h-4 w-4" aria-hidden="true" />
                          Anular
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRowAnimada>
              ))}
            </TableBodyAnimado>
          </Table>
          <div className="border-t border-border px-4 py-3">
            <TablePagination
              total={datos.total}
              page={pagina}
              pageSize={porPagina}
              pageSizeOptions={POR_PAGINA}
              onPageChange={setPagina}
              onPageSizeChange={setPorPagina}
            />
          </div>
        </div>
      ) : null}
      </div>

      <AnularElRecibo
        recibo={aAnular}
        onCerrar={() => setAAnular(null)}
        onAnulado={() => {
          setAAnular(null)
          cargar()
        }}
      />
    </div>
  )
}

/** Anular pide motivo: el back lo exige y la base tiene un CHECK que lo pide. */
function AnularElRecibo({
  recibo,
  onCerrar,
  onAnulado,
}: {
  recibo: FilaDeLaListaDeRecibos | null
  onCerrar: () => void
  onAnulado: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setMotivo('')
    setError(null)
  }, [recibo?.id])

  async function anular() {
    if (!recibo) return
    const limpio = motivo.trim()
    if (limpio.length < MOTIVO_DE_ANULAR_MINIMO) {
      setError(`Escribe por qué se anula (al menos ${MOTIVO_DE_ANULAR_MINIMO} caracteres).`)
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await recibosDeCajaApi.anular(recibo.id, limpio)
      toast.success(`Recibo ${recibo.numero} anulado`, {
        description: `${formatCurrency(recibo.valorCop)} vuelven a la deuda del inquilino.`,
      })
      onAnulado()
    } catch (e) {
      setError(mensajeParaLaPersona(e, { porDefecto: 'No se pudo anular el recibo.', accion: 'anular el recibo' }))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={recibo !== null} onOpenChange={(v) => !v && !guardando && onCerrar()}>
      <DialogContent data-testid="anular-recibo">
        <DialogHeader>
          <DialogTitle>Anular el recibo {recibo?.numero}</DialogTitle>
          <DialogDescription>
            El recibo no se borra: queda anulado con el motivo, y{' '}
            {recibo ? formatCurrency(recibo.valorCop) : 'su valor'} vuelve a la deuda del inquilino.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <label htmlFor="motivo-de-anular" className="text-caption text-fg-muted">
            Por qué se anula
          </label>
          <Textarea
            id="motivo-de-anular"
            value={motivo}
            maxLength={MOTIVO_DE_ANULAR_MAXIMO}
            onChange={(e) => {
              setMotivo(e.target.value)
              setError(null)
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby="motivo-de-anular-error"
          />
          <ErrorDelCampo id="motivo-de-anular-error" mensaje={error} />
        </div>
        <DialogFooter>
          <Button variant="ghost" hideArrow onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="destructive" hideArrow onClick={() => void anular()} disabled={guardando}>
            {guardando ? 'Anulando…' : 'Anular el recibo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
