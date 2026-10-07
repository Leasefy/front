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
 *
 * T-0135 — reanudable y a la vista. Ya no es UNA petición larga: se piden
 * tandas de `TANDA` filas (`limite` + cursor `despuesDeFila`) y cada una sólo
 * toma las filas que TODAVÍA no tienen inmueble, así que lo creado queda
 * guardado tanda por tanda y repetir la acción nunca duplica. Se ve el avance;
 * si se corta (pestaña cerrada, red), al volver el conteo del servidor dice
 * cuántas faltan y el mismo botón continúa con ésas.
 */

import { useCallback, useEffect, useState } from 'react'
import { Presence } from '@leasefy/cadence'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SIN_TIPO, TIPOS_DE_INMUEBLE_FALTANTE } from '@/lib/contratos/tipos-de-inmueble-faltante'
import {
  contractsApi,
  type PrevisualizacionInmueblesFaltantes,
  type ResultadoInmueblesFaltantes,
} from '@/lib/api/contracts.service'
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'

const ID_DE_LA_CIUDAD = 'ciudad-inmuebles-faltantes'

/** Filas por petición: cada inmueble reserva su código bajo lock, así que tandas cortas. */
const TANDA = 25
/** Tope duro de tandas: 200 × 25 = 5.000, el máximo de un lote. */
const MAX_TANDAS = 220

/** Suma el resultado de una tanda al acumulado, sin pisar lo anterior. */
function acumular(
  acc: ResultadoInmueblesFaltantes,
  t: ResultadoInmueblesFaltantes,
): ResultadoInmueblesFaltantes {
  return {
    pedidas: acc.pedidas + t.pedidas,
    creados: acc.creados + t.creados,
    vinculados: acc.vinculados + t.vinculados,
    consignados: acc.consignados + t.consignados,
    omitidas: [...acc.omitidas, ...t.omitidas],
    fallidas: [...acc.fallidas, ...t.fallidas],
  }
}

interface Props {
  lote: string
  /** Se llama al terminar, con o sin fallos: la lista tiene que refrescarse. */
  onListo: () => void
}

export function CrearInmueblesFaltantes({ lote, onListo }: Props) {
  const [previa, setPrevia] = useState<PrevisualizacionInmueblesFaltantes | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [ciudad, setCiudad] = useState('')
  /**
   * El tipo para las filas cuya dirección no lo dice. Sin elegir, esas filas
   * NO se crean (se dicen omitidas): antes nacían todas como apartamento
   * (QA-MIG-A, MG-34).
   */
  const [tipo, setTipo] = useState<string>(SIN_TIPO)
  const [corriendo, setCorriendo] = useState(false)
  /** Filas que ya pasaron por una tanda en esta corrida (creadas, resueltas u omitidas). */
  const [revisadas, setRevisadas] = useState(0)
  /** La corrida se cortó: el botón pasa a decir «Continuar». */
  const [seCorto, setSeCorto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Lo que el back dijo de la ciudad (`CrearInmueblesFaltantesDto.ciudad`). */
  const [errorDeLaCiudad, setErrorDeLaCiudad] = useState<string | null>(null)
  /** La ciudad está apagada mientras corre: el foco va cuando termina. */
  const [enfocarLaCiudad, setEnfocarLaCiudad] = useState(false)
  useEffect(() => {
    if (corriendo || !enfocarLaCiudad) return
    document.getElementById(ID_DE_LA_CIUDAD)?.focus()
    setEnfocarLaCiudad(false)
  }, [corriendo, enfocarLaCiudad])
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

  // Mientras corre, cerrar la pestaña la corta (lo creado queda guardado, pero
  // la persona tiene que saberlo antes de irse).
  useAvisoAlSalir(corriendo)

  async function crear() {
    setCorriendo(true)
    setError(null)
    setErrorDeLaCiudad(null)
    setSeCorto(false)
    setRevisadas(0)
    let acumulado: ResultadoInmueblesFaltantes = {
      pedidas: 0,
      creados: 0,
      vinculados: 0,
      consignados: 0,
      omitidas: [],
      fallidas: [],
    }
    try {
      let cursor: number | undefined
      for (let i = 0; i < MAX_TANDAS; i++) {
        const t = await contractsApi.migracion.crearInmueblesFaltantes(
          { lote },
          ciudad,
          { limite: TANDA, despuesDeFila: cursor },
          tipo === SIN_TIPO ? undefined : tipo,
        )
        acumulado = acumular(acumulado, t)
        setResultado(acumulado)
        setRevisadas(acumulado.pedidas)
        // Sin cursor (`undefined`: un back anterior lo hizo todo de una vez) o
        // `null` (ya no hay más filas): terminó.
        if (t.siguienteFila == null) break
        cursor = t.siguienteFila
      }
      setConfirmando(false)
    } catch (e) {
      // Lo creado en las tandas anteriores YA quedó guardado: se dice, y el
      // mismo botón continúa con las filas que falten.
      setSeCorto(acumulado.pedidas > 0)
      // Un 400 de la ciudad va debajo de la ciudad; lo demás, al aviso.
      const reparto = repartirErroresDelServidor(e, {
        campos: ['ciudad'],
        porDefecto: 'No pudimos crear los inmuebles.',
        accion: 'crear los inmuebles',
      })
      setErrorDeLaCiudad(reparto.porCampo.ciudad ?? null)
      const sueltos = reparto.sueltos.join(' · ')
      const guardado =
        ` — se alcanzaron a crear ${acumulado.creados}. Lo creado quedó guardado: pulsa «Continuar» para seguir con los que faltan.`
      if (acumulado.creados > 0) setError(`${sueltos || 'No pudimos crear los inmuebles.'}${guardado}`)
      else setError(sueltos || null)
      if (reparto.porCampo.ciudad) setEnfocarLaCiudad(true)
    } finally {
      setCorriendo(false)
      await contar()
      // Si se creó algo, la lista de trabajo tiene que refrescarse aunque una
      // tanda posterior haya fallado.
      if (acumulado.pedidas > 0) onListo()
    }
  }

  const n = previa?.candidatas ?? 0
  // Para el avance: todas las filas sin inmueble que la corrida va a mirar.
  const porMirar = previa ? previa.candidatas + previa.ambiguas + previa.sinDireccion : 0
  if (!previa || (n === 0 && !resultado)) return null

  return (
    <div id="crear-inmuebles-faltantes" className="space-y-3" data-testid="crear-inmuebles-faltantes">
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
            contrato ya está activo, vincularlo. Se hace por tandas y lo creado queda
            guardado: si se corta, aquí mismo continúas con los que falten.
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
              {seCorto
                ? `Continuar: crear los ${n} que faltan`
                : `Crear los ${n} inmuebles que faltan`}
            </Button>
          </div>
        </div>
      ) : null}

      {resultado ? <ResultadoDeCreacion resultado={resultado} /> : null}

      <AlertDialog open={confirmando} onOpenChange={(v) => !corriendo && setConfirmando(v)}>
        <AlertDialogContent
          variant="confirm"
          icon={<Buildings weight="bold" />}
          data-testid="crear-inmuebles-faltantes-dialogo"
        >
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
            <label className="text-caption text-muted-foreground" htmlFor={ID_DE_LA_CIUDAD}>
              Ciudad para las filas que no la traen
            </label>
            <Input
              id={ID_DE_LA_CIUDAD}
              value={ciudad}
              onChange={(e) => {
                setCiudad(e.target.value)
                setErrorDeLaCiudad(null)
              }}
              placeholder="La de la inmobiliaria"
              disabled={corriendo}
              invalid={Boolean(errorDeLaCiudad)}
              aria-invalid={errorDeLaCiudad ? true : undefined}
              aria-describedby={errorDeLaCiudad ? `${ID_DE_LA_CIUDAD}-error` : undefined}
              data-testid="crear-inmuebles-faltantes-ciudad"
            />
            <ErrorDelCampo id={`${ID_DE_LA_CIUDAD}-error`} mensaje={errorDeLaCiudad} />
          </div>
          <div className="space-y-1">
            <label className="text-caption text-muted-foreground" htmlFor="tipo-inmuebles-faltantes">
              Tipo para las que la dirección no lo dice
            </label>
            <Select value={tipo} onValueChange={setTipo} disabled={corriendo}>
              <SelectTrigger id="tipo-inmuebles-faltantes" data-testid="crear-inmuebles-faltantes-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                <SelectItem value={SIN_TIPO}>Ninguno: ésas las creo fila por fila</SelectItem>
                {TIPOS_DE_INMUEBLE_FALTANTE.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-muted-foreground">
              Si la dirección lo dice («CASA 7», «AP 801», «LC 101»), se usa el de la
              dirección. No se pone un tipo que nadie dijo.
            </p>
          </div>
          {corriendo ? (
            <p
              className="text-caption text-muted-foreground"
              aria-live="polite"
              data-testid="crear-inmuebles-faltantes-progreso"
            >
              Creando… {nf.format(Math.min(revisadas, porMirar || revisadas))} de{' '}
              {nf.format(porMirar || revisadas)} filas revisadas
              {resultado ? ` · ${nf.format(resultado.creados)} inmuebles creados` : ''}. Puedes
              esperar aquí: lo creado se va guardando.
            </p>
          ) : null}
          {/* El aviso de la acción (no es de un campo): un 409, un 5xx, la red. */}
          <Presence show={Boolean(error)} initial={false} distance="xs" as="p" className="flex items-center gap-1.5 text-sm text-destructive" role="alert">
            <WarningCircle className="h-4 w-4" />
            {error}
          </Presence>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={corriendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // El AlertDialog cierra solo al confirmar; acá se cierra cuando
                // el back contestó, para que el resultado no se pierda.
                e.preventDefault()
                void crear()
              }}
              loading={corriendo}
              data-testid="crear-inmuebles-faltantes-confirmar"
            >
              {corriendo ? 'Creando…' : seCorto ? `Continuar con ${n}` : `Crear ${n}`}
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
