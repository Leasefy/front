'use client'

/**
 * Aplicar la misma resolución a muchas filas.
 *
 * En una cartera real doscientos contratos son del mismo propietario y casi
 * todos son de vivienda. De a uno, eso son doscientas veces el mismo nombre y
 * el mismo documento — y una migración que cuesta eso se abandona a la mitad.
 *
 * Lo que NO hace: decir «listo» y seguir. El back procesa fila por fila y
 * devuelve cuáles fallaron con su número de línea del archivo; acá se muestran
 * todas. Una masiva que reporta éxito tapando lo que no pudo deja a la
 * inmobiliaria creyendo que migró todo, y el hueco aparece cuando no le llega
 * la plata.
 *
 * T-0033 §3.2.G2 — con selección de todo el lote, `ids` puede ser miles: se
 * trocea en tandas de `CHUNK_MASIVA = 100` (bajo el `@ArrayMaxSize(200)` del
 * DTO) y se manda SECUENCIAL, no en paralelo — dos tandas a la vez competirían
 * por el mismo `upsert` de `Propietario` y por `recalcular()` de las mismas
 * filas. Un trozo que falla a mitad de camino NO borra lo que los anteriores
 * ya aplicaron: `resultado` se actualiza tanda por tanda, nunca sólo al final.
 *
 * T-0135 — reanudable. Con `lote`, antes de aplicar se le pregunta al SERVIDOR
 * cuáles de las seleccionadas TODAVÍA no tienen el dato (`GET migrar/filas/ids
 * ?faltante=`, que ya excluye las ACTIVADO y DESCARTADO): una fila que una
 * corrida anterior alcanzó a resolver no vuelve a mandarse. Cerrar la pestaña a
 * mitad no obliga a empezar de cero — al volver, «Seguir con las N que faltan»
 * (en la lista) selecciona sólo lo que queda, y repetir la acción continúa. El
 * progreso se lee contra ese total del servidor, no contra la selección
 * original.
 */

import { useEffect, useState } from 'react'
import { Users, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  contractsApi,
  type FilaDeMigracion,
  type ResultadoMasivo,
} from '@/lib/api/contracts.service'
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir'

/**
 * Frozen en contract.md §3.2.G2 — 1.365 filas ⇒ 14 requests secuenciales.
 * Debe quedar ≤ `@ArrayMaxSize(200)` del back; 100 deja margen.
 */
const CHUNK_MASIVA = 100

/** Vueltas máximas contra el servidor: un tope duro, nunca un bucle sin fin. */
const MAX_VUELTAS = 50

type Modo = 'uso' | 'propietario'

interface Props {
  /**
   * Los ids a los que aplicar — de `seleccion` directamente (§3.2.G4), NUNCA
   * derivados de `seleccionadas`: con selección de todo el lote la mayoría no
   * está cargada en la página actual.
   */
  ids: string[]
  /**
   * Sólo las filas de la página actual que están seleccionadas — se usa
   * ÚNICAMENTE para la vista previa de "sin inmueble" antes de aplicar
   * (§3.2.G4, "kept"): con selección de todo el lote es un subconjunto, y el
   * conteo exacto lo da `omitidas` en el resultado, después de aplicar.
   */
  seleccionadas: FilaDeMigracion[]
  onListo: () => void
  /**
   * El lote de las filas. Con él, la acción sólo toca las filas a las que
   * todavía les falta el dato (lo dice el servidor). Sin él (usos viejos) se
   * manda `ids` tal cual.
   */
  lote?: string
  /** Abre ya en este modo: «Seguir con las N que faltan» elige el modo por la persona. */
  modoInicial?: Modo | null
}

/** Junta el resultado de una tanda al acumulado, sin pisar lo anterior. */
function acumular(acc: ResultadoMasivo, tanda: ResultadoMasivo): ResultadoMasivo {
  return {
    pedidas: acc.pedidas + tanda.pedidas,
    aplicadas: acc.aplicadas + tanda.aplicadas,
    fallidas: [...acc.fallidas, ...tanda.fallidas],
    omitidas: [...(acc.omitidas ?? []), ...(tanda.omitidas ?? [])],
  }
}

export function ResolucionMasiva({
  ids,
  seleccionadas,
  onListo,
  lote,
  modoInicial = null,
}: Props) {
  const [modo, setModo] = useState<Modo | null>(modoInicial)
  const [uso, setUso] = useState<'VIVIENDA' | 'COMERCIAL' | ''>('')
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [comision, setComision] = useState('')
  const [corriendo, setCorriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoMasivo | null>(null)
  /** Cuántas filas ya pasaron por una tanda (aplicada, fallida u omitida). */
  const [hechas, setHechas] = useState(0)
  /** Cuántas de las seleccionadas faltaban de verdad, según el servidor. */
  const [porHacer, setPorHacer] = useState(0)
  /** De las seleccionadas, cuántas ya tenían el dato (o ya están activadas) y no se tocaron. */
  const [yaResueltas, setYaResueltas] = useState(0)
  /**
   * Cuántas de las seleccionadas necesitan la acción elegida, según el servidor.
   * `null` = todavía no se sabe (sin `lote`, sin modo o preguntando): no se
   * bloquea nada. `0` = no hay nada que resolver: se dice y no se aplica.
   */
  const [faltanAhora, setFaltanAhora] = useState<number | null>(null)
  /** La acción terminó sin tener nada que hacer (no es un resultado de «0 de 0»). */
  const [nadaQueHacer, setNadaQueHacer] = useState(false)

  // Mientras corre la acción, cerrar la pestaña la corta: lo aplicado queda
  // guardado en el servidor, pero la persona tiene que saberlo antes de irse.
  useAvisoAlSalir(corriendo)

  /*
   * Cuántas de las seleccionadas (cargadas) todavía no tienen inmueble.
   * Registrarle el propietario a una fila sin inmueble no puede funcionar —la
   * consignación es del inmueble— así que conviene decirlo ANTES. Con
   * selección de todo el lote esto sólo ve la página actual: el conteo
   * exacto de TODA la selección llega en `resultado.omitidas`, después de
   * aplicar.
   */
  const sinInmueble = seleccionadas.filter((f) => !f.propertyId).length

  /**
   * Las filas a las que hay que aplicarle el cambio AHORA: las seleccionadas
   * que el servidor dice que todavía no lo tienen. Si no se puede preguntar (o
   * no hay `lote`), se cae a la selección completa — el servidor igual omite
   * lo activado y lo descartado, así que nunca es un daño, sólo más ruido.
   */
  async function pendientesAhora(
    faltante: Modo,
    yaIntentadas: Set<string>,
  ): Promise<string[]> {
    if (!lote) return ids.filter((id) => !yaIntentadas.has(id))
    try {
      const r = await contractsApi.migracion.idsDeFilas(lote, undefined, faltante)
      const faltan = new Set(r.ids)
      // «Mismo propietario» también alcanza a una fila ACTIVADA sin propietario
      // (se consigna): esas no tienen faltante, así que se respetan si la
      // persona las marcó a mano.
      const activadas =
        faltante === 'propietario'
          ? new Set(seleccionadas.filter((f) => f.estado === 'ACTIVADO').map((f) => f.id))
          : new Set<string>()
      return ids.filter(
        (id) => (faltan.has(id) || activadas.has(id)) && !yaIntentadas.has(id),
      )
    } catch {
      return ids.filter((id) => !yaIntentadas.has(id))
    }
  }

  // Antes de aplicar, se le pregunta al servidor cuántas de las seleccionadas
  // necesitan de verdad la acción elegida: si son 0, se dice y no se ofrece.
  const llaveDeLaSeleccion = `${ids.length}:${ids[0] ?? ''}:${ids[ids.length - 1] ?? ''}`
  useEffect(() => {
    setNadaQueHacer(false)
    if (modo === null || !lote || ids.length === 0) {
      setFaltanAhora(null)
      return
    }
    let vigente = true
    setFaltanAhora(null)
    pendientesAhora(modo, new Set())
      .then((p) => {
        if (vigente) setFaltanAhora(p.length)
      })
      .catch(() => {
        if (vigente) setFaltanAhora(null)
      })
    return () => {
      vigente = false
    }
    // `pendientesAhora` lee sólo props; la selección se compara por su llave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, lote, llaveDeLaSeleccion])

  async function aplicar() {
    if (modo === null) return
    setCorriendo(true)
    setError(null)
    setNadaQueHacer(false)
    setHechas(0)
    setPorHacer(0)
    setYaResueltas(0)
    let acumulado: ResultadoMasivo = { pedidas: 0, aplicadas: 0, fallidas: [], omitidas: [] }
    setResultado(acumulado)
    try {
      const cambios =
        modo === 'uso'
          ? { usoInmueble: uso === '' ? undefined : uso }
          : {
              propietario: {
                nombre: nombre.trim(),
                documento: documento.trim(),
                comisionPorcentaje:
                  comision.trim() === '' ? undefined : Number(comision),
              },
            }

      const intentadas = new Set<string>()
      let totalPorHacer = 0
      for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
        const pendientes = await pendientesAhora(modo, intentadas)
        if (vuelta === 0) {
          totalPorHacer = pendientes.length
          setPorHacer(totalPorHacer)
          setYaResueltas(ids.length - pendientes.length)
        } else if (pendientes.length > 0) {
          // El servidor topa los ids de una vez: lo que quedó atrás se suma.
          totalPorHacer += pendientes.length
          setPorHacer(totalPorHacer)
        }
        if (pendientes.length === 0) {
          // Nada que resolver desde el principio: no hay resultado que mostrar.
          if (vuelta === 0) {
            setNadaQueHacer(true)
            setFaltanAhora(0)
            setResultado(null)
          }
          break
        }

        for (let i = 0; i < pendientes.length; i += CHUNK_MASIVA) {
          const trozo = pendientes.slice(i, i + CHUNK_MASIVA)
          const r = await contractsApi.migracion.resolverMasivo(trozo, cambios)
          acumulado = acumular(acumulado, r)
          trozo.forEach((id) => intentadas.add(id))
          setResultado(acumulado)
          setHechas(intentadas.size)
        }
        // Sin `lote` no hay a quién volver a preguntarle: una sola vuelta.
        if (!lote) break
      }
    } catch (e) {
      // Una tanda puede fallar a mitad de camino: lo que las anteriores ya
      // aplicaron QUEDA en `resultado` (nunca se pisa acá) y en el servidor —
      // el error dice hasta dónde llegó y cómo seguir, para que nunca sea «no
      // sabemos qué pasó».
      setError(
        `${e instanceof Error ? e.message : 'No se pudo aplicar'} — se alcanzaron a aplicar ${acumulado.aplicadas} antes de este error. Lo aplicado quedó guardado: vuelve a pulsar «Aplicar» para seguir solo con las que faltan.`,
      )
    } finally {
      setCorriendo(false)
      // Refresca la lista de trabajo si al menos una tanda llegó a procesarse,
      // aunque una tanda posterior haya fallado — lo que se aplicó ya cambió
      // filas reales.
      if (acumulado.pedidas > 0) onListo()
    }
  }

  const nadaParaResolver = faltanAhora === 0 || nadaQueHacer
  const puedeAplicar =
    !nadaParaResolver &&
    (modo === 'uso'
      ? uso !== ''
      : modo === 'propietario'
        ? nombre.trim() !== '' && documento.trim() !== ''
        : false)

  // Lo que no es uso ni propietario no se resuelve en bloque: se dice dónde.
  const pistaDeLoQueFalta =
    ids.length === 1
      ? ' Lo que le falte se resuelve en la propia fila (reparto, inmueble, inquilino).'
      : ' Lo que les falta se resuelve en cada fila (reparto, inmueble, inquilino).'

  const mensajeNada =
    (modo === 'uso'
      ? ids.length === 1
        ? 'La fila seleccionada ya tiene uso: no hay nada que resolver.'
        : `Ninguna de las ${ids.length} filas necesita uso: todas ya lo tienen.`
      : ids.length === 1
        ? 'La fila seleccionada ya tiene propietario: no hay nada que resolver.'
        : `Ninguna de las ${ids.length} filas necesita propietario: todas ya lo tienen.`) +
    pistaDeLoQueFalta

  return (
    <Card className="space-y-4 border-primary/30 p-5" data-testid="resolucion-masiva">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {ids.length} {ids.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
        </p>
        <div className="flex gap-2">
          <Button
            variant={modo === 'uso' ? 'default' : 'outline'}
            size="sm"
            hideArrow
            disabled={corriendo}
            onClick={() => setModo(modo === 'uso' ? null : 'uso')}
          >
            Definir el uso
          </Button>
          <Button
            variant={modo === 'propietario' ? 'default' : 'outline'}
            size="sm"
            hideArrow
            disabled={corriendo}
            onClick={() => setModo(modo === 'propietario' ? null : 'propietario')}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Mismo propietario
          </Button>
        </div>
      </div>

      {modo === 'uso' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px]">
            <label className="text-caption text-muted-foreground">
              Uso para las {ids.length}
            </label>
            <Select value={uso} onValueChange={(v) => setUso(v as 'VIVIENDA' | 'COMERCIAL')}>
              <SelectTrigger>
                <SelectValue placeholder="Elige el uso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIVIENDA">Vivienda</SelectItem>
                <SelectItem value="COMERCIAL">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {modo === 'propietario' ? (
        <div className="space-y-3">
          {sinInmueble > 0 ? (
            <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2.5 text-caption text-foreground">
              <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              {sinInmueble} de las seleccionadas todavía no tienen inmueble. La
              consignación es del inmueble, así que esas van a quedar sin
              registrar — aparecen listadas abajo con su fila.
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <label className="text-caption text-muted-foreground">Nombre del propietario</label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="w-36">
              <label className="text-caption text-muted-foreground">Documento</label>
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />
            </div>
            <div className="w-24">
              <label className="text-caption text-muted-foreground">Comisión %</label>
              <Input
                type="number"
                value={comision}
                onChange={(e) => setComision(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {modo && nadaParaResolver ? (
        <p
          className="rounded-lg border border-border bg-muted/40 p-2.5 text-caption text-foreground"
          data-testid="nada-que-resolver-masivo"
        >
          {mensajeNada}
        </p>
      ) : null}

      {modo ? (
        <Button
          size="sm"
          hideArrow
          disabled={!puedeAplicar || corriendo || ids.length === 0}
          isLoading={corriendo}
          onClick={() => void aplicar()}
        >
          Aplicar a {ids.length}
        </Button>
      ) : null}

      {/* §3.2.G2 — progreso legible mientras corren las tandas secuenciales:
          con 1.365 filas en 14 requests, un botón que gira sin decir nada es
          indistinguible de uno colgado. T-0135: el total es el que dice el
          servidor (las que de verdad faltan), y lo aplicado queda guardado
          tanda por tanda — si se corta, se retoma con las que quedan. */}
      {corriendo ? (
        <p className="text-caption text-muted-foreground" data-testid="progreso-masivo">
          Aplicando {hechas}/{porHacer || ids.length}… Lo aplicado se va guardando: si se
          corta, puedes continuar con las que falten.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" data-testid="error-masivo">
          {error}
        </p>
      ) : null}

      {resultado && !nadaQueHacer ? (
        <div className="space-y-2 rounded-lg border border-border p-3" data-testid="resultado-masivo">
          <p className="text-sm text-foreground">
            {resultado.aplicadas} de {resultado.pedidas} resueltas.
          </p>
          {yaResueltas > 0 ? (
            <p className="text-caption text-muted-foreground" data-testid="ya-resueltas-masivo">
              {yaResueltas} de las {ids.length} seleccionadas ya tenían ese dato (o ya están
              activadas) y no se tocaron.
            </p>
          ) : null}
          {/* §3.2.G3 — una fila sin inmueble a la que se le pidió propietario
              NO es un fallo: registrarPropietario la rechaza siempre, y en un
              lote real son la mayoría de las filas. Reportarla junto con
              `fallidas` entrenaría a ignorar el reporte. */}
          {resultado.omitidas && resultado.omitidas.length > 0
            ? Object.entries(
                resultado.omitidas.reduce<Record<string, number>>((acc, o) => {
                  acc[o.motivo] = (acc[o.motivo] ?? 0) + 1
                  return acc
                }, {}),
              ).map(([motivo, n]) => (
                <p key={motivo} className="text-caption text-muted-foreground" data-testid="omitidas-masivo">
                  {n} {n === 1 ? 'fila' : 'filas'} — {motivo}
                </p>
              ))
            : null}
          {resultado.fallidas.length > 0 ? (
            <>
              <p className="text-caption font-medium text-destructive">
                {resultado.fallidas.length} no se pudieron:
              </p>
              <ul className="space-y-1 text-caption text-muted-foreground">
                {resultado.fallidas.map((f) => (
                  <li key={f.id}>
                    {/* +2: en el archivo la primera fila de datos es la 2. */}
                    {f.fila != null ? `Fila ${f.fila + 2}` : 'Una fila'}: {f.motivo}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
