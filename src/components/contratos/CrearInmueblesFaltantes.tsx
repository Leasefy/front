'use client'

/**
 * «Crear los N inmuebles que faltan» — la salida masiva para un lote cuyas
 * direcciones no coincidieron con nada.
 *
 * Nico (2026-09-02): 90 contratos migrados «activos» y ninguno con inmueble
 * — 3 inmuebles cargados, ninguna dirección coincidía letra a letra. Sin
 * inmueble no hay consignación, y sin consignación no hay cobros: la cartera
 * entera estaba migrada y no cobraba un peso. Crear los 90 a mano, fila por
 * fila, es como una migración se abandona.
 *
 * Lo que hace, y lo dice antes de hacerlo: crea cada inmueble con la
 * dirección del archivo, a nombre de la inmobiliaria, lo consigna al
 * propietario que trae la fila, y si el contrato ya se activó lo vincula.
 * También sirve DESPUÉS de activar — es justo el caso de Nico.
 *
 * El número que muestra sale del back (`GET migrar/inmuebles-faltantes`),
 * contado con el MISMO criterio que la acción. Contarlo acá desde la página
 * visible diría «3» con 90 filas en el lote.
 */

import { useCallback, useEffect, useState } from 'react'
import { Buildings, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import {
  contractsApi,
  type PrevisualizacionInmueblesFaltantes,
  type ResultadoInmueblesFaltantes,
} from '@/lib/api/contracts.service'

interface Props {
  lote: string
  /** Se llama al terminar, con o sin fallos: la lista tiene que refrescarse. */
  onListo: () => void
}

export function CrearInmueblesFaltantes({ lote, onListo }: Props) {
  const [previa, setPrevia] = useState<PrevisualizacionInmueblesFaltantes | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [ciudad, setCiudad] = useState('')
  const [corriendo, setCorriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoInmueblesFaltantes | null>(null)

  const contar = useCallback(async () => {
    try {
      setPrevia(await contractsApi.migracion.inmueblesFaltantes(lote))
    } catch {
      // Sin conteo no hay botón: mejor que un botón que promete «0».
      setPrevia(null)
    }
  }, [lote])

  useEffect(() => {
    void contar()
  }, [contar])

  async function crear() {
    setCorriendo(true)
    setError(null)
    try {
      const r = await contractsApi.migracion.crearInmueblesFaltantes({ lote }, ciudad)
      setResultado(r)
      setConfirmando(false)
      await contar()
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos crear los inmuebles.')
    } finally {
      setCorriendo(false)
    }
  }

  const n = previa?.candidatas ?? 0
  if (!previa || (n === 0 && !resultado)) return null

  return (
    <div className="space-y-3" data-testid="crear-inmuebles-faltantes">
      {n > 0 ? (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Buildings className="h-4 w-4 text-warning" />
            {n === 1 ? 'Un contrato' : `${n} contratos`} sin inmueble
            {previa.activadas > 0
              ? ` (${previa.activadas === n ? 'todos' : previa.activadas} ya ${previa.activadas === 1 ? 'activado' : 'activados'})`
              : ''}
            : no generan cobros.
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            Ninguna dirección coincidió con tu portafolio. Podemos crear los inmuebles
            desde el archivo, consignarlos al propietario que trae cada fila y, si el
            contrato ya está activo, vincularlo — de una.
            {previa.ambiguas > 0
              ? ` ${previa.ambiguas} ${previa.ambiguas === 1 ? 'fila tiene' : 'filas tienen'} dos inmuebles con la misma dirección: esas se eligen a mano.`
              : ''}
            {previa.sinDireccion > 0
              ? ` ${previa.sinDireccion} sin dirección en el archivo: no hay con qué.`
              : ''}
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              hideArrow
              onClick={() => setConfirmando(true)}
              data-testid="crear-inmuebles-faltantes-abrir"
            >
              Crear los {n} inmuebles que faltan
            </Button>
          </div>
        </div>
      ) : null}

      {resultado ? <ResultadoDeCreacion resultado={resultado} /> : null}

      <AlertDialog open={confirmando} onOpenChange={(v) => !corriendo && setConfirmando(v)}>
        <AlertDialogContent data-testid="crear-inmuebles-faltantes-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>Crear {n} {n === 1 ? 'inmueble' : 'inmuebles'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Se crean {n} {n === 1 ? 'inmueble' : 'inmuebles'} con la dirección del
                  archivo, a nombre de la inmobiliaria, y quedan consignados al
                  propietario que dice el archivo. Dos contratos de la misma puerta
                  comparten un inmueble.
                  {previa.activadas > 0
                    ? ` Los ${previa.activadas} contratos ya activos quedan vinculados y empiezan a generar cobros.`
                    : ''}
                </p>
                <p>
                  La dirección y el propietario se toman tal cual del archivo. Después
                  se corrigen desde la ficha de cada inmueble.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <label className="text-caption text-muted-foreground" htmlFor="ciudad-inmuebles-faltantes">
              Ciudad para las filas que no la traen
            </label>
            <Input
              id="ciudad-inmuebles-faltantes"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="La de la inmobiliaria"
              disabled={corriendo}
              data-testid="crear-inmuebles-faltantes-ciudad"
            />
          </div>
          {error ? (
            <p className="flex items-center gap-1.5 text-sm text-destructive">
              <WarningCircle className="h-4 w-4" />
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={corriendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // El AlertDialog cierra solo al confirmar; acá se cierra cuando
                // el back contestó, para que el resultado no se pierda.
                e.preventDefault()
                void crear()
              }}
              disabled={corriendo}
              data-testid="crear-inmuebles-faltantes-confirmar"
            >
              {corriendo ? 'Creando…' : `Crear ${n}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type Nota = { id: string; fila: number; motivo: string }

interface GrupoDeNotas {
  motivo: string
  /** Número de fila como lo ve la persona en su archivo (Excel: +2). */
  filas: number[]
  informativo: boolean
}

/** Resultados esperados: no hay nada que corregir, no se muestran como alerta. */
const MOTIVOS_INFORMATIVOS = new Set(['Ya tiene inmueble.', 'Fila descartada.'])

const EJEMPLOS_VISIBLES = 5
const nf = new Intl.NumberFormat('es-CO')

/** Agrupa por texto del motivo; los problemas reales primero. */
function agruparNotas(notas: Nota[]): GrupoDeNotas[] {
  const porMotivo = new Map<string, number[]>()
  for (const n of notas) {
    const lista = porMotivo.get(n.motivo)
    if (lista) lista.push(n.fila + 2)
    else porMotivo.set(n.motivo, [n.fila + 2])
  }
  return [...porMotivo.entries()]
    .map(([motivo, filas]) => ({
      motivo,
      filas: filas.sort((a, b) => a - b),
      informativo: MOTIVOS_INFORMATIVOS.has(motivo),
    }))
    .sort((a, b) => Number(a.informativo) - Number(b.informativo) || b.filas.length - a.filas.length)
}

function titularGrupo(g: GrupoDeNotas): string {
  const n = g.filas.length
  const cuantas = nf.format(n)
  if (g.motivo === 'Ya tiene inmueble.') {
    return n === 1
      ? '1 fila ya tenía inmueble (no hacía falta crearlo)'
      : `${cuantas} filas ya tenían inmueble (no hacía falta crearlo)`
  }
  if (g.motivo === 'Fila descartada.') {
    return n === 1 ? '1 fila descartada' : `${cuantas} filas descartadas`
  }
  const motivo = g.motivo.replace(/\.$/, '')
  return n === 1 ? `1 fila — ${motivo}` : `${cuantas} filas — ${motivo}`
}

function GrupoDeFilas({ grupo }: { grupo: GrupoDeNotas }) {
  const ejemplos = grupo.filas.slice(0, EJEMPLOS_VISIBLES)
  const resto = grupo.filas.length - ejemplos.length
  return (
    <li
      className="flex items-start gap-1.5"
      data-testid={grupo.informativo ? 'resultado-grupo-informativo' : 'resultado-grupo-problema'}
    >
      {grupo.informativo ? null : (
        <WarningCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      )}
      <div className="min-w-0">
        <p className={grupo.informativo ? undefined : 'text-foreground'}>
          {titularGrupo(grupo)}
        </p>
        <p>
          {grupo.filas.length === 1 ? 'Fila ' : 'Filas '}
          {ejemplos.join(', ')}
          {resto > 0 ? '…' : ''}
        </p>
        {resto > 0 ? (
          <details className="mt-1">
            <summary className="cursor-pointer select-none underline-offset-2 hover:underline">
              Ver todas las filas ({nf.format(grupo.filas.length)})
            </summary>
            <p className="mt-1 max-h-40 overflow-y-auto break-words rounded-md border border-border bg-background p-2">
              {grupo.filas.join(', ')}
            </p>
          </details>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Lo que pasó, agrupado por motivo. Un «listo» que tapa 12 omitidas deja a la
 * inmobiliaria creyendo que los 90 cobran, y el hueco aparece cuando no le
 * llega la plata. Pero una línea por fila con 1.850 «Ya tiene inmueble» es un
 * scroll infinito que esconde las 2 filas que sí requieren atención: por eso
 * se agrupa, los problemas van primero y las filas completas quedan plegadas.
 */
function ResultadoDeCreacion({ resultado }: { resultado: ResultadoInmueblesFaltantes }) {
  const grupos = agruparNotas([...resultado.omitidas, ...resultado.fallidas])
  return (
    <div
      className="rounded-lg border border-border bg-surface-muted p-4 text-sm"
      data-testid="crear-inmuebles-faltantes-resultado"
    >
      <p className="font-medium text-foreground">
        {resultado.creados} {resultado.creados === 1 ? 'inmueble creado' : 'inmuebles creados'} ·{' '}
        {resultado.vinculados} {resultado.vinculados === 1 ? 'contrato' : 'contratos'} con inmueble ·{' '}
        {resultado.consignados} {resultado.consignados === 1 ? 'consignado' : 'consignados'} al propietario del archivo
      </p>
      {resultado.vinculados > resultado.consignados ? (
        <p className="mt-1 text-caption text-muted-foreground">
          {resultado.vinculados - resultado.consignados} sin propietario: el archivo no traía
          su documento. Se registra desde la fila o desde Inmuebles.
        </p>
      ) : null}
      {grupos.length > 0 ? (
        <ul className="mt-2 space-y-2 text-caption text-muted-foreground">
          {grupos.map((g) => (
            <GrupoDeFilas key={g.motivo} grupo={g} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}
