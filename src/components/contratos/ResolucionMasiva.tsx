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
 *
 * T-0138 — las acciones salen de los problemas REALES de la selección. Al
 * cambiar la selección se le pregunta al servidor cuántas filas tienen cada
 * problema (`POST migrar/filas/faltantes`) y se ofrece una acción por problema
 * presente, con su número; las de 0 no se muestran. Lo que no tiene arreglo en
 * bloque seguro (el correo o el nombre del inquilino, las fechas…) se cuenta y
 * se manda a la fila, sin botón. Repartir en partes iguales y descartar piden
 * confirmación en la página: una cambia cómo se divide el canon, la otra saca
 * filas del lote.
 */

import { useEffect, useState } from 'react'
import { Presence } from '@leasefy/cadence'
import { Buildings, Trash, Users, WarningCircle } from '@phosphor-icons/react'

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
  type FaltantesDeLaSeleccion,
  type FilaDeMigracion,
  type ResultadoMasivo,
} from '@/lib/api/contracts.service'
import { useAvisoAlSalir } from '@/lib/hooks/use-aviso-al-salir'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { errorDeLaComision } from '@/components/migracion/limites-de-la-migracion'

/**
 * Los campos de `ResolverMasivoDto` que este formulario muestra, con el nombre
 * del back (`propietario.nombre` llega como su hoja, `nombre`).
 */
type CampoDeLaMasiva = 'usoInmueble' | 'nombre' | 'documento' | 'comisionPorcentaje'
const CAMPOS_DE_LA_MASIVA: readonly CampoDeLaMasiva[] = [
  'usoInmueble',
  'nombre',
  'documento',
  'comisionPorcentaje',
]
const idDe = (campo: CampoDeLaMasiva) => `masiva-${campo}`

/**
 * Frozen en contract.md §3.2.G2 — 1.365 filas ⇒ 14 requests secuenciales.
 * Debe quedar ≤ `@ArrayMaxSize(200)` del back; 100 deja margen.
 */
const CHUNK_MASIVA = 100

/** Vueltas máximas contra el servidor: un tope duro, nunca un bucle sin fin. */
const MAX_VUELTAS = 50

type Modo = 'uso' | 'propietario' | 'reparto' | 'descartar'

/**
 * Lo que no se arregla en bloque: el código de `faltantes` dicho como lo que le
 * pasa a la fila. Un código que no está acá (o `otros`) cae en la última.
 */
const PROBLEMAS_POR_FILA: Record<string, string> = {
  inmueble_ambiguo: 'con dos inmuebles posibles para la dirección',
  inmueble_codigo: 'con un código de inmueble que no está cargado',
  inmueble_ocupado: 'con un inmueble que ya tiene un contrato vivo',
  inquilino_correo: 'sin correo del inquilino',
  inquilino_nombre: 'sin nombre del inquilino',
  inquilino_documento_ajeno: 'con un documento del inquilino que es de otra cuenta',
  fechas: 'con fechas que no cuadran',
  canon: 'sin canon',
  dia_de_pago: 'con un día de pago fuera de rango',
  consecutivo_repetido: 'con un consecutivo repetido en el archivo',
  cartera_antes_del_inicio: 'con la fecha de cartera anterior al inicio',
  otros: 'con otro dato por completar',
}

/** Códigos que tienen botón propio arriba: no se repiten en «se resuelve en cada fila». */
const CON_ACCION = new Set(['uso', 'propietario', 'reparto_del_canon', 'inmueble'])

/** El bloque «Crear los inmuebles que faltan» del resumen del lote (T-0135). */
const ID_CREAR_INMUEBLES = 'crear-inmuebles-faltantes'

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
  /** T-0138 — los problemas reales de la selección; `null` mientras se pregunta o si falló. */
  const [desglose, setDesglose] = useState<FaltantesDeLaSeleccion | null>(null)
  const [cargandoDesglose, setCargandoDesglose] = useState(false)
  /** Se sube al terminar una acción para volver a contar contra el servidor. */
  const [versionDesglose, setVersionDesglose] = useState(0)
  /** La acción delicada (repartir, descartar) espera un «sí» explícito en la página. */
  const [confirmando, setConfirmando] = useState(false)
  const [avisoInmuebles, setAvisoInmuebles] = useState<string | null>(null)

  // Mientras corre la acción, cerrar la pestaña la corta: lo aplicado queda
  // guardado en el servidor, pero la persona tiene que saberlo antes de irse.
  useAvisoAlSalir(corriendo)

  /**
   * El error de cada campo: el del cliente (la comisión, con la regla del
   * back) o el que mandó el back en `campos`. Va DEBAJO del campo.
   */
  const [errores, setErrores] = useState<Partial<Record<CampoDeLaMasiva, string>>>({})
  const quitarError = (campo: CampoDeLaMasiva) =>
    setErrores((e) => (e[campo] ? { ...e, [campo]: undefined } : e))
  const propsDelCampo = (campo: CampoDeLaMasiva) => ({
    id: idDe(campo),
    invalid: Boolean(errores[campo]),
    'aria-invalid': errores[campo] ? true : undefined,
    'aria-describedby': errores[campo] ? `${idDe(campo)}-error` : undefined,
  })

  /*
   * Cuántas de las seleccionadas (cargadas) todavía no tienen inmueble.
   * Registrarle el propietario a una fila sin inmueble no puede funcionar —la
   * consignación es del inmueble— así que conviene decirlo ANTES. Con
   * selección de todo el lote esto sólo ve la página actual: el conteo
   * exacto de TODA la selección llega en `resultado.omitidas`, después de
   * aplicar.
   */
  // Una fila DESCARTADA sin inmueble (T-0156) no cuenta: está ignorada, no pendiente.
  const sinInmueble = seleccionadas.filter((f) => !f.propertyId && f.estado !== 'DESCARTADO').length

  /**
   * Las filas a las que hay que aplicarle el cambio AHORA: las seleccionadas
   * que el servidor dice que todavía no lo tienen. Si no se puede preguntar (o
   * no hay `lote`), se cae a la selección completa — el servidor igual omite
   * lo activado y lo descartado, así que nunca es un daño, sólo más ruido.
   */
  async function pendientesAhora(
    accion: Modo,
    yaIntentadas: Set<string>,
  ): Promise<string[]> {
    if (!lote) return ids.filter((id) => !yaIntentadas.has(id))
    try {
      let faltan: Set<string>
      if (accion === 'descartar') {
        // Descartar no depende de un faltante: son las filas vivas (ni
        // activadas ni descartadas), con o sin problema.
        const [p, l] = await Promise.all([
          contractsApi.migracion.idsDeFilas(lote, 'PENDIENTE'),
          contractsApi.migracion.idsDeFilas(lote, 'LISTO'),
        ])
        faltan = new Set([...p.ids, ...l.ids])
      } else {
        const faltante = accion === 'reparto' ? 'reparto_del_canon' : accion
        const r = await contractsApi.migracion.idsDeFilas(lote, undefined, faltante)
        faltan = new Set(r.ids)
      }
      // «Mismo propietario» también alcanza a una fila ACTIVADA sin propietario
      // (se consigna): esas no tienen faltante, así que se respetan si la
      // persona las marcó a mano.
      const activadas =
        accion === 'propietario'
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

  // T-0138 — qué problemas tiene de verdad ESTA selección: de ahí salen las
  // acciones que se ofrecen. Sin `lote` no hay a quién preguntarle y se cae al
  // par de siempre (uso / propietario).
  useEffect(() => {
    if (!lote || ids.length === 0) {
      setDesglose(null)
      return
    }
    let vigente = true
    setCargandoDesglose(true)
    contractsApi.migracion
      .faltantesDeLaSeleccion(lote, ids)
      .then((d) => {
        if (vigente) setDesglose(d)
      })
      .catch(() => {
        if (vigente) setDesglose(null)
      })
      .finally(() => {
        if (vigente) setCargandoDesglose(false)
      })
    return () => {
      vigente = false
    }
    // `ids` se compara por su llave: cambia cuando cambia la selección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lote, llaveDeLaSeleccion, versionDesglose])

  // Cambiar de acción o de selección cancela una confirmación a medias.
  useEffect(() => {
    setConfirmando(false)
  }, [modo, llaveDeLaSeleccion])
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
    if (modo === 'propietario') {
      const m = errorDeLaComision(comision)
      if (m) {
        setErrores({ comisionPorcentaje: m })
        document.getElementById(idDe('comisionPorcentaje'))?.focus()
        return
      }
    }
    setErrores({})
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
      const aplicarTanda = (trozo: string[]): Promise<ResultadoMasivo> =>
        modo === 'reparto'
          ? contractsApi.migracion.repartirEnPartesIguales(trozo)
          : modo === 'descartar'
            ? contractsApi.migracion.descartarFilas(trozo)
            : contractsApi.migracion.resolverMasivo(trozo, cambios)

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
          const r = await aplicarTanda(trozo)
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
      //
      // Sistema de errores (02-10-2026): un 400 con `campos` se pinta en SU
      // campo y le da el foco; el resto pasa por el traductor (nunca el
      // `message` crudo, ni «conexión» si el servidor sí respondió).
      const reparto = repartirErroresDelServidor<CampoDeLaMasiva>(e, {
        campos: CAMPOS_DE_LA_MASIVA,
        porDefecto: 'No pudimos aplicar el cambio.',
        accion: 'aplicar el cambio',
      })
      setErrores(reparto.porCampo)
      const primero = reparto.orden[0]
      if (primero) document.getElementById(idDe(primero))?.focus()
      const motivo =
        reparto.sueltos.length > 0 ? reparto.sueltos.join(' · ') : 'Revisa lo marcado arriba.'
      setError(
        `${motivo} — se alcanzaron a aplicar ${acumulado.aplicadas} antes de este error. Lo aplicado quedó guardado: vuelve a pulsar «Aplicar» para seguir solo con las que faltan.`,
      )
    } finally {
      setCorriendo(false)
      setConfirmando(false)
      setVersionDesglose((v) => v + 1)
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
        : modo === 'reparto' || modo === 'descartar')

  const n = (codigo: string) => desglose?.porMotivo[codigo] ?? 0
  const activadasSeleccionadas = seleccionadas.filter((f) => f.estado === 'ACTIVADO').length
  // Cuántas filas toca cada acción. «Mismo propietario» también alcanza a una
  // fila ACTIVADO sin propietario que la persona marcó a mano (se consigna).
  const cuantasUso = n('uso')
  const cuantasPropietario = n('propietario') + activadasSeleccionadas
  const cuantasReparto = n('reparto_del_canon')
  const cuantasInmueble = n('inmueble')
  const cuantasDescartar = desglose?.descartables ?? 0
  const cuantasDeLaAccion =
    modo === 'uso'
      ? cuantasUso
      : modo === 'propietario'
        ? cuantasPropietario
        : modo === 'reparto'
          ? cuantasReparto
          : modo === 'descartar'
            ? cuantasDescartar
            : 0

  // Los problemas sin arreglo en bloque seguro: se cuentan y se mandan a la fila.
  const sinArregloEnBloque = Object.entries(desglose?.porMotivo ?? {})
    .filter(([codigo, cuantas]) => !CON_ACCION.has(codigo) && (cuantas ?? 0) > 0)
    .map(([codigo, cuantas]) => ({
      codigo,
      cuantas: cuantas ?? 0,
      texto: PROBLEMAS_POR_FILA[codigo] ?? PROBLEMAS_POR_FILA.otros,
    }))
  const nadaPendiente =
    desglose !== null &&
    cuantasDescartar === 0 &&
    cuantasUso + cuantasPropietario + cuantasReparto + cuantasInmueble === 0 &&
    sinArregloEnBloque.length === 0

  function elegir(m: Modo) {
    setModo(modo === m ? null : m)
  }

  function irACrearInmuebles() {
    const bloque = document.getElementById(ID_CREAR_INMUEBLES)
    if (bloque) {
      setAvisoInmuebles(null)
      bloque.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      setAvisoInmuebles(
        'El bloque «Crear los inmuebles que faltan» no está disponible ahora: recarga el lote e inténtalo de nuevo.',
      )
    }
  }

  const mensajeNada =
    modo === 'uso'
      ? 'Las filas seleccionadas ya tienen uso: no hay nada que resolver.'
      : modo === 'propietario'
        ? 'Las filas seleccionadas ya tienen propietario: no hay nada que resolver.'
        : modo === 'reparto'
          ? 'Las filas seleccionadas ya no tienen problema de reparto: no hay nada que resolver.'
          : 'Las filas seleccionadas ya no se pueden descartar: no hay nada que hacer.'

  // Sin `lote` (o si falló la pregunta) no hay desglose: se ofrece el par de siempre.
  const mostrarUso = desglose === null ? !cargandoDesglose : cuantasUso > 0
  const mostrarPropietario = desglose === null ? !cargandoDesglose : cuantasPropietario > 0
  const conNumero = (texto: string, cuantas: number) =>
    desglose === null ? texto : `${texto} (${cuantas})`

  return (
    <Card className="space-y-4 border-primary/30 p-5" data-testid="resolucion-masiva">
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          {ids.length} {ids.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
        </p>

        {cargandoDesglose && desglose === null ? (
          <p className="text-caption text-muted-foreground" data-testid="revisando-problemas">
            Revisando qué problemas tienen las filas seleccionadas…
          </p>
        ) : null}

        {nadaPendiente ? (
          <p className="text-caption text-muted-foreground" data-testid="nada-pendiente-seleccion">
            No hay nada pendiente en la selección: todas las filas ya están activadas o
            descartadas.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2" data-testid="acciones-masivas">
          {mostrarUso ? (
            <Button
              variant={modo === 'uso' ? 'default' : 'outline'}
              size="sm"
              hideArrow
              disabled={corriendo}
              onClick={() => elegir('uso')}
            >
              {conNumero('Definir el uso', cuantasUso)}
            </Button>
          ) : null}
          {mostrarPropietario ? (
            <Button
              variant={modo === 'propietario' ? 'default' : 'outline'}
              size="sm"
              hideArrow
              disabled={corriendo}
              onClick={() => elegir('propietario')}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {conNumero('Mismo propietario', cuantasPropietario)}
            </Button>
          ) : null}
          {cuantasReparto > 0 ? (
            <Button
              variant={modo === 'reparto' ? 'default' : 'outline'}
              size="sm"
              hideArrow
              disabled={corriendo}
              onClick={() => elegir('reparto')}
              data-testid="accion-reparto"
            >
              Repartir en partes iguales ({cuantasReparto})
            </Button>
          ) : null}
          {cuantasInmueble > 0 ? (
            <Button
              variant="outline"
              size="sm"
              hideArrow
              disabled={corriendo}
              onClick={irACrearInmuebles}
              data-testid="accion-inmuebles"
            >
              <Buildings className="mr-1.5 h-3.5 w-3.5" />
              Crear los inmuebles que faltan ({cuantasInmueble})
            </Button>
          ) : null}
          {cuantasDescartar > 0 ? (
            <Button
              variant={modo === 'descartar' ? 'default' : 'outline'}
              size="sm"
              hideArrow
              disabled={corriendo}
              onClick={() => elegir('descartar')}
              data-testid="accion-descartar"
            >
              <Trash className="mr-1.5 h-3.5 w-3.5" />
              Descartar las seleccionadas ({cuantasDescartar})
            </Button>
          ) : null}
        </div>

        {cuantasInmueble > 0 ? (
          <p className="text-caption text-muted-foreground">
            Crear los inmuebles se hace desde el bloque del resumen del lote, que cubre
            todas las filas sin inmueble del lote, no sólo las seleccionadas.
          </p>
        ) : null}
        {avisoInmuebles ? (
          <p className="text-caption text-warning" data-testid="aviso-inmuebles">
            {avisoInmuebles}
          </p>
        ) : null}

        {sinArregloEnBloque.length > 0 ? (
          <ul
            className="space-y-0.5 text-caption text-muted-foreground"
            data-testid="sin-arreglo-en-bloque"
          >
            {sinArregloEnBloque.map((p) => (
              <li key={p.codigo}>
                {p.cuantas} {p.cuantas === 1 ? 'fila' : 'filas'} {p.texto} — se resuelve en
                cada fila.
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {modo === 'uso' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px]">
            <label className="text-caption text-muted-foreground" htmlFor={idDe('usoInmueble')}>
              Uso para las {cuantasUso || ids.length}
            </label>
            <Select
              value={uso}
              onValueChange={(v) => {
                setUso(v as 'VIVIENDA' | 'COMERCIAL')
                quitarError('usoInmueble')
              }}
            >
              <SelectTrigger
                id={idDe('usoInmueble')}
                aria-invalid={errores.usoInmueble ? true : undefined}
                aria-describedby={errores.usoInmueble ? `${idDe('usoInmueble')}-error` : undefined}
              >
                <SelectValue placeholder="Elige el uso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIVIENDA">Vivienda</SelectItem>
                <SelectItem value="COMERCIAL">Comercial</SelectItem>
              </SelectContent>
            </Select>
            <ErrorDelCampo id={`${idDe('usoInmueble')}-error`} mensaje={errores.usoInmueble} />
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
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-[160px] flex-1">
              <label className="text-caption text-muted-foreground" htmlFor={idDe('nombre')}>
                Nombre del propietario
              </label>
              <Input
                {...propsDelCampo('nombre')}
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  quitarError('nombre')
                }}
              />
              <ErrorDelCampo id={`${idDe('nombre')}-error`} mensaje={errores.nombre} />
            </div>
            <div className="w-36">
              <label className="text-caption text-muted-foreground" htmlFor={idDe('documento')}>
                Documento
              </label>
              <Input
                {...propsDelCampo('documento')}
                value={documento}
                onChange={(e) => {
                  setDocumento(e.target.value)
                  quitarError('documento')
                }}
              />
              <ErrorDelCampo id={`${idDe('documento')}-error`} mensaje={errores.documento} />
            </div>
            <div className="w-28">
              <label
                className="text-caption text-muted-foreground"
                htmlFor={idDe('comisionPorcentaje')}
              >
                Comisión %
              </label>
              <Input
                {...propsDelCampo('comisionPorcentaje')}
                type="number"
                value={comision}
                onChange={(e) => {
                  setComision(e.target.value)
                  quitarError('comisionPorcentaje')
                }}
              />
              <ErrorDelCampo
                id={`${idDe('comisionPorcentaje')}-error`}
                mensaje={errores.comisionPorcentaje}
              />
            </div>
          </div>
        </div>
      ) : null}

      {modo === 'reparto' ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2.5 text-caption text-foreground">
          <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          Esto cambia cómo se divide el canon entre los dueños: cada dueño queda con la
          misma parte y los pesos que sobran van al primero, sin importar lo que decía el
          archivo. El canon total no cambia.
        </p>
      ) : null}

      {modo === 'descartar' ? (
        <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft/40 p-2.5 text-caption text-foreground">
          <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
          Las filas descartadas dejan de entrar a la migración. No se borra nada: queda su
          rastro en el lote. Las ya activadas no se tocan.
        </p>
      ) : null}

      {modo && nadaParaResolver ? (
        <p
          className="rounded-lg border border-border bg-muted/40 p-2.5 text-caption text-foreground"
          data-testid="nada-que-resolver-masivo"
        >
          {mensajeNada}
        </p>
      ) : null}

      {modo && confirmando ? (
        <div
          className="space-y-2 rounded-lg border border-border bg-muted/40 p-3"
          data-testid="confirmar-masivo"
        >
          <p className="text-sm text-foreground">
            {modo === 'descartar'
              ? `¿Descartar ${cuantasDeLaAccion} ${cuantasDeLaAccion === 1 ? 'fila' : 'filas'}?`
              : `¿Repartir el canon en partes iguales en ${cuantasDeLaAccion} ${cuantasDeLaAccion === 1 ? 'fila' : 'filas'}?`}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              hideArrow
              isLoading={corriendo}
              disabled={corriendo}
              onClick={() => void aplicar()}
              data-testid="confirmar-masivo-si"
            >
              {modo === 'descartar' ? 'Sí, descartar' : 'Sí, repartir'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              hideArrow
              disabled={corriendo}
              onClick={() => setConfirmando(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {modo && !confirmando ? (
        <Button
          size="sm"
          hideArrow
          disabled={!puedeAplicar || corriendo || ids.length === 0}
          isLoading={corriendo}
          onClick={() =>
            modo === 'reparto' || modo === 'descartar'
              ? setConfirmando(true)
              : void aplicar()
          }
        >
          {modo === 'descartar'
            ? `Descartar ${cuantasDeLaAccion || ids.length}`
            : modo === 'reparto'
              ? `Repartir en ${cuantasDeLaAccion || ids.length}`
              : `Aplicar a ${cuantasDeLaAccion || ids.length}`}
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

      <Presence show={Boolean(error)} initial={false} distance="xs" as="p" className="text-sm text-destructive" data-testid="error-masivo" role="alert">
        {error}
      </Presence>

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
