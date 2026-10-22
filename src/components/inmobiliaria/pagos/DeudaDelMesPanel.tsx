'use client'

/**
 * DeudaDelMesPanel — el bloque operativo de Pagos: la deuda de un mes.
 *
 * ── Lo que reemplaza, y por qué ─────────────────────────────────────────────
 *
 * Era `CobrosDelMesPanel`: leía `GET /inmobiliaria/cobros` y giraba alrededor
 * de «Generar los cobros de {mes}» como acción principal. Nico, el 2026-09-16,
 * mirando esa pantalla en cero sobre 30.951 cuotas y $8.446 millones:
 *
 *   «Hasta el CEO decía que no entiende por qué dice *generar los cobros*, si
 *    él explica otra cosa: **el cobro ya está generado**, porque en el estado
 *    de cuenta el usuario debe pagar en varias etapas, o sea cada mes el total
 *    del valor del canon por lo que vaya el contrato. Entonces **no es que le
 *    dé cobrar para poder que paguen**. Él puede pagar antes, o hasta el día
 *    máximo de cartera definido para ese contrato, y si se pasa ya pasa a
 *    cartera, o sea que no ha pagado, y ahí comienza a cobrarse por diferentes
 *    medios usando nuestros servicios de cobranza.»
 *
 * De ahí las tres decisiones de este archivo:
 *
 *   1. **La unidad es la CUOTA del contrato, no el cobro.** La deuda nace con
 *      la firma y vive en `contrato_cuotas`; el `Cobro` es el documento con el
 *      que finanzas reclama una parte de ella y puede no existir — en la
 *      inmobiliaria migrada no existe para ninguna de las 30.951 cuotas. Por
 *      eso los cuatro indicadores viejos (Cobros del mes · Recaudado ·
 *      Pendiente · En mora) mostraban 0, $0, $0, 0 con toda esa plata encima.
 *      Se lee `GET /inmobiliaria/cartera/mes`.
 *   2. **La acción principal es REGISTRAR UN PAGO**, el recibo de caja — que
 *      ya sabe imputar contra cuotas y permite adelantar. No hace falta emitir
 *      ningún documento para poder recibir plata.
 *   3. **«Generar los cobros» bajó a Cartera**, que es donde el CEO dijo que
 *      vive: «el cobro… por lo general es la cartera… ni siquiera debería
 *      generarse de forma automática: que la persona de finanzas decida cuándo
 *      cobrar basado en la cartera». Está en «Cartera → Cobros emitidos».
 *
 * ── 🔴 UNA SOLA TARJETA (Nico, 2026-09-18 de noche) ─────────────────────────
 *
 * «Esto tiene que hacer parte de la tabla», señalando el renglón del mes con
 * su botón y las seis fichas de cifras; y «esto debe sí o sí ser otra forma,
 * eso de prender o apagar algo, quizás con un switch tab como manejamos otras
 * tablas, y el buscador igual dentro de la tabla», señalando el interruptor
 * «Sólo cartera».
 *
 * Tenía razón en las dos, y las dos son el mismo defecto: había **cinco
 * bloques sueltos flotando** encima de la tabla —el mes, seis fichas, un
 * aviso, un interruptor y un buscador—, cada uno con su propio margen, y
 * ninguno se leía como parte de lo que estaba mirando. Peor: **los tres
 * cajones eran fichas de sólo lectura y el filtro era un interruptor
 * distinto**, así que el número y la forma de ver ese número eran dos
 * controles diferentes a 300 px de distancia.
 *
 * Ahora es UNA tarjeta con el orden en que se lee y se opera:
 *
 *   1. el **mes** y la única acción que mueve plata («Registrar un pago»);
 *   2. el **resumen del mes** en un renglón: se debe · pagado · falta;
 *   3. los **tres cajones como pestañas**, pegadas a la tabla — el número ES
 *      el filtro: tocar «Cartera $789.149.569» deja la tabla en esas 455
 *      cuotas. Es el patrón de pestañas de la casa (`role="tablist"` +
 *      `border-b`), el mismo de Requisitos;
 *   4. el **buscador**, dentro de la tarjeta, con el alcance a su derecha;
 *   5. la **tabla** y su paginación.
 *
 * El interruptor «Sólo cartera» ya no existe: era una tercera forma de decir
 * lo que ahora dice una pestaña, y un interruptor sólo puede expresar dos
 * estados de cuatro (¿y «por vencer»? ¿y «vencido, en plazo»?).
 *
 * ── Los cinco números, y por qué no se pueden mezclar ───────────────────────
 *
 * El vocabulario es el MISMO de «Cartera por concepto» (`CarteraPorConcepto`),
 * a propósito: el mismo hecho tiene que llamarse igual en las dos pantallas.
 *
 *   · **Se debe en el mes** — lo pactado en las cuotas del mes. Existe desde
 *     la firma; nadie tiene que generarlo.
 *   · **Pagado** y **Falta por pagar**.
 *   · Y lo que falta, partido en los tres cajones que NO son sinónimos:
 *     **Por vencer** (todavía no vence: es deuda, no cartera) · **Vencido, en
 *     plazo** (venció, pero el plazo del contrato sigue corriendo: tampoco es
 *     cartera, ni le corre interés) · **Cartera** (pasó el plazo; es lo único
 *     que la cobranza persigue). Son una partición: suman «Falta».
 *
 * Un solo «pendiente» mandaría a la cobranza a perseguir plata que nadie debe
 * todavía, con la Ley 2300 de por medio — donde cada contacto indebido es una
 * multa y cada llamada cuesta.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Decir «todavía no hay cobros».** Con contratos vigentes SÍ hay deuda.
 * 2. **Cambiar las cifras con el filtro.** Las pestañas y el resumen hablan
 *    del MES entero; la tabla muestra lo filtrado y lo dice al lado del
 *    buscador.
 * 3. **Callar lo que el número no cuenta.** Contratos sin tabla de
 *    amortización y cuotas que el contrato ya no cubre salen en los avisos.
 * 4. **Pintar un error como un mes vacío.** Eso lo separa `EstadoDeDatos`.
 *
 * ── 🔴 Y la salida al ESTADO DE CUENTA (Nico, 2026-09-16, más tarde) ────────
 *
 * «Sigo preguntando si eso está con estado de cuenta atado, y ya te he
 * explicado tantas veces que **eso va atado al estado de cuenta**.» Lo estaba
 * en el modelo y no en la pantalla: el documento existía desde el 13-09 y sólo
 * se llegaba a él desde las fichas (contrato, propietario, inquilino), nunca
 * desde Pagos, que es donde se trabaja la plata. Ahora cada fila de la tabla lo abre
 * (`CuotasDelMesTabla`) y el pie lo dice con palabras: un mes de esta tabla es
 * un renglón del estado de cuenta de alguien.
 */

import { useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { AnimatedNumber, Appear, MotionIndicator, Presence } from '@leasefy/cadence'

import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { CuotasDelMesTabla } from '@/components/inmobiliaria/pagos/CuotasDelMesTabla'
import { RegistrarPagoModal } from '@/components/inmobiliaria/RegistrarPagoModal'
import {
  MOTIVO_SIN_PERMISO_DE_RECIBO,
  usePuedeHacerRecibo,
} from '@/components/inmobiliaria/permiso-de-recibo'
import { useCarteraDelMes } from '@/lib/hooks/use-cartera'
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service'
import type { NuevoReciboPorCliente } from '@/lib/api/recibos-de-caja.types'
import type { CajonDeLaCuota, FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { plataPareja } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import { CLAVE_DE_MORA, RUTA_DE_REGLAS_DE_MORA, sumarIntereses } from '@/components/cartera/interes-de-mora'
import { mesEnTitulo, nombreDelMes } from '@/lib/utils/mes'
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa'
import { cn } from '@/lib/utils'
import { cifrasDeLaPantalla } from '@/lib/i18n/idioma-de-las-cifras'

/** A-04: el mismo destino de «Fijar los días de plazo» de toda la app (foco en el campo). */
const RUTA_PARA_FIJAR_EL_PLAZO = '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo'

const numberFormatter = cifrasDeLaPantalla()

/** PG-R18: cuántos meses por venir ofrece el selector (como «Por pagar»: el mes en curso + 3). */
export const MESES_HACIA_ADELANTE = 3

/** El mes corriente en 'YYYY-MM', en hora LOCAL (no UTC: ver lib/utils/mes). */
export function mesActual(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Los últimos `cantidad` meses hasta hoy, del más reciente al más viejo.
 *
 * 🔴 PG-R18 (QA de Pagos, decisión de Nico 03-10-2026): con `adelante` el
 * selector también ofrece los meses que vienen —hasta el mes en curso + 3, como
 * «Por pagar a propietarios»—: un inquilino que adelanta paga cuotas de
 * noviembre, y esa deuda ya existe desde la firma del contrato.
 */
export function mesesRecientes(cantidad = 12, hoy: Date = new Date(), adelante = 0): string[] {
  const meses: string[] = []
  for (let i = -adelante; i < cantidad; i += 1) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Qué pestaña está elegida. `TODAS` no es un cajón del back: es «sin filtro».
 *
 * 🔴 Reemplaza al booleano `soloCartera`. Un interruptor sólo sabe decir dos
 * estados y los cajones son tres: con él, «por vencer» y «vencido, en plazo»
 * no tenían forma de mirarse solos aunque cada uno tuviera su propia cifra en
 * pantalla.
 */
export type CajonElegido = 'MES' | 'TODAS' | 'PAGADO' | CajonDeLaCuota

/**
 * Qué significa cada pestaña, en una línea.
 *
 * 🔴 Estas frases estaban debajo de cada ficha cuando los cajones eran seis
 * cuadros de sólo lectura, y son lo que hace que la partición se entienda: sin
 * ellas, «vencido, en plazo» y «cartera» se leen como sinónimos y la cobranza
 * termina persiguiendo a alguien que está usando el plazo que la inmobiliaria
 * misma le dio, con la Ley 2300 de por medio. En una pestaña no caben, así que
 * se dice la del cajón ELEGIDO, justo encima de la tabla que se está mirando.
 * Las palabras son las de «Cartera por concepto», sin cambiar una coma.
 */
const QUE_ES_ESTE_CAJON: Record<CajonElegido, string> = {
  MES: 'Todas las cuotas pactadas para este mes, pagadas y sin pagar: es lo que suma «se debe».',
  PAGADO: 'Cuotas de este mes en las que ya entró plata, aunque sea un abono parcial.',
  TODAS: 'Todo lo que falta por pagar de este mes, en los tres momentos por los que pasa una deuda.',
  POR_VENCER: 'Todavía no vence. Es deuda, no cartera.',
  VENCIDA_EN_PLAZO: 'Venció, pero el plazo del contrato sigue corriendo.',
  CARTERA: 'Pasó el plazo. Es lo único que la cobranza persigue.',
  SIN_DEUDA: 'Cuotas de este mes que ya están pagadas del todo.',
}

/**
 * Las filas que se ven: la búsqueda (inquilino, documento, contrato, inmueble)
 * y el cajón elegido en las pestañas. Pura y exportada para poder fijarla en
 * un test.
 *
 * 🔴 Filtra por el CAJÓN, no por «tiene saldo»: una cuota vencida dentro del
 * plazo no es cartera y no puede aparecer bajo «Cartera».
 */
export function filtrarCuotas(
  filas: readonly FilaDeLaCuotaDelMes[],
  busqueda: string,
  cajon: CajonElegido,
): FilaDeLaCuotaDelMes[] {
  const q = normalizar(busqueda.trim())
  return filas.filter((f) => {
    /*
     * 🔴 19-09 (visto en el navegador, con los 105 de la agencia de QA):
     * «Todo lo que falta» NO es «todas las cuotas del mes». La pestaña decía
     * «105 cuotas» mientras los tres momentos que promete contener sumaban
     * 101 —0 por vencer, 8 vencidas en plazo, 93 en cartera—, porque metía
     * adentro las 4 que ya están pagadas del todo. El dinero sí cuadraba
     * ($356.595.650), o sea la cifra hablaba de la deuda y el conteo del mes:
     * dos cosas distintas en la misma pestaña. Una cuota saldada no es «lo
     * que falta», y va en su propia pestaña.
     */
    /*
     * 🔴 19-09, segundo pedido de Nico sobre esta pantalla: «yo debería poder
     * dar clic a cada una de ellas si es que quiero ampliar información».
     * Las tres cifras de arriba también son filtros, así que acá hay dos
     * selecciones que NO son cajones del back:
     *   · `MES` — el mes entero, pagadas incluidas: lo que suma «se debe».
     *   · `PAGADO` — las filas en las que entró plata, aunque sea un abono
     *     parcial de una cuota que todavía debe. Por eso no es `SIN_DEUDA`:
     *     ése es el subconjunto de las que quedaron saldadas del todo.
     */
    if (cajon === 'MES') {
      // El mes entero: no se descarta ninguna fila por su cajón.
    } else if (cajon === 'PAGADO') {
      if ((f.pagadoCop ?? 0) <= 0) return false
    } else if (cajon === 'TODAS') {
      if (f.cajon === 'SIN_DEUDA') return false
    } else if (f.cajon !== cajon) return false
    if (q === '') return true
    const campos = [f.inquilino, f.documento, f.contrato, f.contratoDeLeasefy, f.inmueble]
    return campos.some((c) => c && normalizar(c).includes(q))
  })
}

/**
 * Una cifra del resumen del mes, DENTRO de una frase.
 *
 * ── Por qué es una frase y no tres fichas (Nico, 21-09) ────────────────────
 *
 * «Mira arriba hay como filtros, y no se ve a qué hacen parte, debajo hay KPIs
 * y no sé, todo en esta pantalla está como suelto, nada realmente se sabe que
 * es de qué… y abajo más KPIs, eso parece un vómito.»
 *
 * El defecto no era que faltara información: era que el resumen del mes (tres
 * cifras) y el filtro de la tabla (cinco pestañas) estaban pintados IGUAL
 * —rótulo en versalitas, número grande en mono, conteo debajo, cada uno en su
 * cajita—, así que la pantalla mostraba ocho números del mismo peso y ninguno
 * decía qué era. Peor: «Falta por pagar» y «Todo lo que falta» son el MISMO
 * número, y puestos uno encima del otro se leen como dos hechos distintos.
 *
 * Ahora el resumen es UNA frase en prosa —«De los $364.795.650 que se deben en
 * septiembre ya entraron $8.200.000 y faltan $356.595.650»— que además dice la
 * relación entre los tres números, que es justo lo que no se sabía. Las únicas
 * cajitas que quedan son las pestañas, y por eso ahora se leen como el filtro
 * que son.
 *
 * 🔴 Sigue siendo un BOTÓN. Nico, 19-09: «yo debería de poder dar clic a cada
 * una de ellas si es que quiero ampliar información de cada una». Un número en
 * pantalla que no se puede abrir obliga a creerle; poder abrirlo es poder
 * verificarlo. El subrayado punteado es lo que dice que se puede tocar: en una
 * frase, un número sin marca se lee como texto.
 */
function CifraEnLaFrase({
  monto,
  testId,
  tono,
  activa,
  onClick,
  queMuestra,
  formato = formatCurrency,
}: {
  /** La cifra: cuenta desde la anterior al cambiar de mes (`AnimatedNumber`). */
  monto: number
  testId: string
  tono?: 'success' | 'danger'
  activa: boolean
  onClick: () => void
  /** Qué queda en la tabla al tocarla. Va al `title`: un clic no se adivina. */
  queMuestra: string
  /** El formato de la franja (los mismos decimales en todas sus cifras). */
  formato?: (n: number) => string
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      title={queMuestra}
      data-testid={`abrir-${testId}`}
      className={cn(
        'font-mono tabular-nums decoration-dotted decoration-1 underline-offset-[0.2em]',
        'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        activa ? 'underline' : 'hover:underline',
        tono === 'success' ? 'text-success' : tono === 'danger' ? 'text-danger' : 'text-fg',
      )}
      data-activa={activa ? 'si' : 'no'}
    >
      <AnimatedNumber data-testid={testId} value={monto} format={formato} />
    </button>
  )
}

/**
 * Una pestaña de cajón: filtra la tabla.
 *
 * GLOW UP (revisión de Dinero, 22-10-2026): eran cinco pestañas con su plata en
 * mono grande y el conteo debajo —cinco cifras más compitiendo con la del mes—.
 * La plata de cada momento ya está en la leyenda de la cifra de arriba (y
 * también filtra); acá queda lo que una pestaña necesita: el nombre y cuántas
 * cuotas hay. Una pestaña en cero no se pinta (salvo «Todo lo que falta» y la
 * elegida): un cero no se filtra.
 */
function PestanaDeCajon({
  label,
  cuotas,
  activa,
  tono,
  testId,
  onClick,
  marca,
}: {
  label: string
  cuotas: number
  activa: boolean
  tono?: 'warning' | 'danger'
  testId: string
  onClick: () => void
  /** El `layoutId` de la marca de la pestaña elegida (una por tarjeta). */
  marca: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-0.5 text-body-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        activa ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
      )}
    >
      {label}
      <span
        className={cn(
          'font-mono text-caption tabular-nums',
          tono === 'danger' && cuotas > 0
            ? 'text-danger'
            : tono === 'warning' && cuotas > 0
              ? 'text-warning-ink'
              : activa
                ? 'text-fg'
                : 'text-fg-subtle',
        )}
      >
        {numberFormatter.format(cuotas)}
        <span className="sr-only"> {cuotas === 1 ? 'cuota' : 'cuotas'}</span>
      </span>
      {/* La marca de la elegida SE DESLIZA a la nueva (`MotionIndicator`). */}
      {activa ? (
        <MotionIndicator layoutId={marca} className="inset-x-0 bottom-0 h-0.5 bg-primary" />
      ) : null}
    </button>
  )
}

export interface DeudaDelMesPanelProps {
  /** Inyectable para los tests; por defecto, el mes corriente. */
  mesInicial?: string
}

export function DeudaDelMesPanel({ mesInicial }: DeudaDelMesPanelProps) {
  const { t: traducir } = useI18n()
  const marca = `${useId()}-cajon`
  const [mes, setMes] = useState(() => mesInicial ?? mesActual())
  const [busqueda, setBusqueda] = useState('')
  const [cajon, setCajon] = useState<CajonElegido>('TODAS')
  const [reciboAbierto, setReciboAbierto] = useState(false)

  const { datos, cargando, error, recargar } = useCarteraDelMes(mes)
  const puedeHacerRecibo = usePuedeHacerRecibo()

  // PG-R18: los 12 de atrás y hasta el mes en curso + 3.
  const opciones = useMemo(() => mesesRecientes(12, new Date(), MESES_HACIA_ADELANTE), [])
  const titulo = mesEnTitulo(mes)
  // N-02 (QA-PAGOS-95): dentro de una frase el mes va en minúscula («que se
  // deben en octubre de 2026»); `titulo` es para etiquetas sueltas.
  const enFrase = nombreDelMes(mes)

  const todas = useMemo(() => datos?.filas ?? [], [datos])
  const visibles = useMemo(
    () => filtrarCuotas(todas, busqueda, cajon),
    [todas, busqueda, cajon],
  )
  const hayFiltros = busqueda.trim().length > 0 || cajon !== 'TODAS'
  const limpiar = () => {
    setBusqueda('')
    setCajon('TODAS')
  }

  /** Cuántas cuotas hay en cada cajón, para el renglón chico de la pestaña. */
  const cuotasPorCajon = useMemo(() => {
    const cuenta: Record<string, number> = {}
    for (const f of todas) cuenta[f.cajon] = (cuenta[f.cajon] ?? 0) + 1
    return cuenta
  }, [todas])

  /**
   * 🔴 CR-31: la inmobiliaria no ha fijado sus días de plazo. Lo vencido no
   * está «en plazo» (no hay plazo): la pestaña dice «Vencido» y el aviso de
   * arriba dice por qué no es cartera.
   */
  const hayVencidasSinPlazo = useMemo(() => todas.some((f) => f.plazoSinFijar), [todas])

  /** Las que de verdad faltan: los tres momentos, sin las ya saldadas. */
  const cuotasQueFaltan = useMemo(
    () => todas.filter((f) => f.cajon !== 'SIN_DEUDA').length,
    [todas],
  )


  const t = datos?.totales
  const avisos = datos?.avisos ?? []
  /*
   * 🔴 El interés del mes, con la MISMA lectura del back que la cartera por
   * concepto y el estado de cuenta. Va APARTE: «Falta por pagar» y los cajones
   * siguen siendo capital. Todo el interés es de cuotas en cartera (también las
   * ya pagadas que lo siguen debiendo).
   */
  // 🔴 CR-31 (COLA-FRONT, 04-10): con vencidas sin plazo fijado, el interés del
  // mes se suma de las filas (que no cuentan el de esas cuotas: no corre).
  const interesDelMes = hayVencidasSinPlazo ? sumarIntereses(todas) : (t?.interesCop ?? 0)

  /**
   * Emite el recibo. El back reparte la plata por antigüedad sobre las cuotas
   * del cliente, así que después hay que volver a leer el mes: puede haber
   * bajado el saldo de varias filas, no de una.
   */
  const emitirRecibo = async (nuevo: NuevoReciboPorCliente) => {
    const res = await recibosDeCajaApi.crearPorCliente(nuevo)
    void recargar()
    return res
  }

  // Los mismos decimales en toda la franja (revisión 22-10).
  const plata = plataPareja([t?.totalCop, t?.pendienteCop, t?.pagadoCop, t?.porVencerCop, t?.vencidaEnPlazoCop, t?.carteraCop])
  const cuantasCuotas = (n: number) => `${numberFormatter.format(n)} ${n === 1 ? 'cuota' : 'cuotas'}`
  const cuantosInquilinos = (n: number) => `${numberFormatter.format(n)} ${n === 1 ? 'inquilino' : 'inquilinos'}`

  /** Las pestañas: «Todo lo que falta» y la elegida siempre; las demás, sólo con cuotas. */
  const seVe = (c: CajonElegido, n: number) => c === 'TODAS' || c === cajon || n > 0

  return (
    <section className="space-y-3" aria-label={`La deuda de ${titulo}`}>
      {/* 🔴 UNA tarjeta: el mes, la cifra, las pestañas, el buscador y la tabla
          (Nico, 18-09: «esto tiene que hacer parte de la tabla»). */}
      <div
        className="overflow-hidden rounded-2xl border border-border bg-surface"
        data-testid="tarjeta-de-la-deuda"
      >
        {/* 1 · El mes y la única acción que mueve plata. Va FUERA de
            `EstadoDeDatos`: cambiar de mes no puede hacer desaparecer el
            control con el que se cambia de mes. */}
        <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Mes de la deuda">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((m) => (
                <SelectItem key={m} value={m}>
                  {mesEnTitulo(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Sin `cobros:create` queda a la vista y deshabilitado, con el porqué:
              esconder un control se lee como «falta la función». */}
          <span
            className="inline-flex [&>*]:w-full sm:[&>*]:w-auto"
            title={puedeHacerRecibo ? undefined : MOTIVO_SIN_PERMISO_DE_RECIBO}
          >
            <Button
              hideArrow
              size="sm"
              disabled={!puedeHacerRecibo}
              onClick={() => setReciboAbierto(true)}
              data-testid="abrir-recibo-de-caja"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Registrar un pago
            </Button>
          </span>
        </div>

        <EstadoDeDatos
          cargando={cargando && !datos}
          error={error}
          queEs={`la deuda de ${enFrase}`}
          onReintentar={recargar}
          esqueleto={<EsqueletoTabla columnas={6} filas={6} />}
        >
          {/* 2 · LA cifra del mes: cuánto falta, de cuánto, y en qué momento
                 está lo que falta. GLOW UP (revisión de Dinero, 22-10-2026): era
                 una frase con cuatro cifras del mismo peso y cinco pestañas con
                 plata; ahora hay UNA cifra grande y su barra. Cada monto sigue
                 siendo un botón que deja la tabla en sus filas (Nico, 19-09:
                 «yo debería de poder dar clic a cada una»). */}
          <CifraHeroe
            className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
            data-testid="resumen-del-mes"
            rotulo="Falta por pagar"
            cifra={
              <CifraEnLaFrase
                formato={plata}
                testId="mes-falta"
                monto={t?.pendienteCop ?? 0}
                activa={cajon === 'TODAS'}
                onClick={() => setCajon('TODAS')}
                queMuestra="Ver en la tabla todo lo que falta por pagar"
              />
            }
            contexto={
              <>
                de los{' '}
                <CifraEnLaFrase
                  formato={plata}
                  testId="mes-se-debe"
                  monto={t?.totalCop ?? 0}
                  activa={cajon === 'MES'}
                  onClick={() => setCajon('MES')}
                  queMuestra={`Ver las ${numberFormatter.format(t?.cuotas ?? 0)} cuotas del mes en la tabla`}
                />{' '}
                que se deben en {enFrase}
                {/* El interés va aparte del capital, en la misma línea. */}
                {interesDelMes > 0 ? (
                  <span className="text-fg-muted" data-testid="mes-falta-con-intereses">
                    {' ('}
                    {traducir(CLAVE_DE_MORA.conIntereses, {
                      monto: formatCurrency(
                        hayVencidasSinPlazo
                          ? (t?.pendienteCop ?? 0) + interesDelMes
                          : t?.totalConInteresCop ?? (t?.pendienteCop ?? 0) + interesDelMes,
                      ),
                    })}
                    {')'}
                  </span>
                ) : null}
              </>
            }
            total={t?.totalCop ?? 0}
            tramos={[
              {
                clave: 'pagado',
                etiqueta: 'Ya entró',
                monto: t?.pagadoCop ?? 0,
                tono: 'exito',
                'data-testid': 'tramo-pagado',
                cifra: (
                  <CifraEnLaFrase
                    formato={plata}
                    testId="mes-pagado"
                    monto={t?.pagadoCop ?? 0}
                    activa={cajon === 'PAGADO'}
                    onClick={() => setCajon('PAGADO')}
                    queMuestra="Ver en la tabla las cuotas que ya pagaron algo"
                  />
                ),
              },
              {
                clave: 'por-vencer',
                etiqueta: 'Por vencer',
                monto: t?.porVencerCop ?? 0,
                tono: 'neutro',
                cifra: (
                  <CifraEnLaFrase
                    formato={plata}
                    testId="mes-por-vencer"
                    monto={t?.porVencerCop ?? 0}
                    activa={cajon === 'POR_VENCER'}
                    onClick={() => setCajon('POR_VENCER')}
                    queMuestra="Ver en la tabla las cuotas que todavía no vencen"
                  />
                ),
              },
              {
                clave: 'en-plazo',
                etiqueta: hayVencidasSinPlazo ? 'Vencido' : 'Vencido, en plazo',
                monto: t?.vencidaEnPlazoCop ?? 0,
                tono: 'aviso',
                cifra: (
                  <CifraEnLaFrase
                    formato={plata}
                    testId="mes-vencido-en-plazo"
                    monto={t?.vencidaEnPlazoCop ?? 0}
                    activa={cajon === 'VENCIDA_EN_PLAZO'}
                    onClick={() => setCajon('VENCIDA_EN_PLAZO')}
                    queMuestra="Ver en la tabla las cuotas vencidas que siguen en plazo"
                  />
                ),
              },
              {
                clave: 'cartera',
                etiqueta: 'Cartera',
                monto: t?.carteraCop ?? 0,
                tono: 'critico',
                cifra: (
                  <CifraEnLaFrase
                    formato={plata}
                    testId="mes-cartera"
                    monto={t?.carteraCop ?? 0}
                    tono="danger"
                    activa={cajon === 'CARTERA'}
                    onClick={() => setCajon('CARTERA')}
                    queMuestra="Ver en la tabla las cuotas en cartera"
                  />
                ),
                extra:
                  interesDelMes > 0 ? (
                    <span
                      className="block font-mono text-caption tabular-nums text-danger"
                      data-testid="mes-intereses"
                      title={traducir(CLAVE_DE_MORA.explicacion)}
                    >
                      {traducir(CLAVE_DE_MORA.masIntereses, {
                        monto: formatCurrency(interesDelMes),
                      })}
                    </span>
                  ) : null,
              },
            ]}
            pie={
              <div className="flex flex-col gap-2">
                <span>
                  {cuantasCuotas(t?.cuotas ?? 0)} de {cuantosInquilinos(t?.inquilinos ?? 0)}
                </span>
                {/* 🔴 Lo que estos números NO cuentan, en UN renglón junto a la
                    cifra que afectan («N cosas afectan esta cifra · Ver»). Antes
                    eran franjas amarillas apiladas encima de todo. Plegado pero
                    montado: lo que pide arreglarse sigue a un clic. */}
                {avisos.length > 0 ? (
                  <div className="flex items-start gap-2" data-testid="avisos-del-mes">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" />
                    <MasDetalles
                      montadoSiempre
                      etiqueta={`${avisos.length === 1 ? '1 cosa afecta' : `${avisos.length} cosas afectan`} esta cifra`}
                      etiquetaAbierto="Ocultar"
                      classNameDelContenido="space-y-3"
                    >
                      <ul className="space-y-1.5 text-body-sm text-fg">
                        {avisos.map((aviso) => (
                          <li key={aviso}>{aviso}</li>
                        ))}
                      </ul>
                      {/* 🔴 A-04 (QA-PAGOS-95): el mismo enlace que el Tablero y el
                          estado de cuenta, con el foco en el campo. Sin reglas de
                          mora el interés sale en cero y NO porque no haya mora. */}
                      {hayVencidasSinPlazo || datos?.sinReglasDeMora ? (
                        <div className="flex flex-wrap gap-2">
                          {hayVencidasSinPlazo ? (
                            <Button asChild size="sm" variant="secondary">
                              <Link href={RUTA_PARA_FIJAR_EL_PLAZO} data-testid="mes-fijar-el-plazo">
                                Fijar los días de plazo
                              </Link>
                            </Button>
                          ) : null}
                          {datos?.sinReglasDeMora ? (
                            <Button asChild size="sm" variant="secondary">
                              <Link href={RUTA_DE_REGLAS_DE_MORA} data-testid="mes-configurar-reglas">
                                {traducir(CLAVE_DE_MORA.configurarReglas)}
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </MasDetalles>
                  </div>
                ) : null}
              </div>
            }
          />

          {/* 3 · La barra de la tabla: los cajones como pestañas (filtran) y el
                 buscador, en UN renglón. En el orden en que una deuda los
                 recorre —nace futura, vence, y recién después es cartera—, con
                 las palabras de «Cartera por concepto». */}
          <div className="flex flex-col gap-3 border-b border-border px-5 pt-1 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div
              role="tablist"
              aria-label="Qué cuotas ver en la tabla"
              data-testid="cajones-del-mes"
              data-lenis-prevent
              className="-mx-1 flex min-w-0 items-stretch gap-5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {/* 🔴 Los conteos de las pestañas salen de la misma fuente —las
                  filas—, para que cuadren: «todo lo que falta» es la suma de los
                  tres momentos. */}
              <PestanaDeCajon
                marca={marca}
                label="Todo lo que falta"
                cuotas={cuotasQueFaltan}
                activa={cajon === 'TODAS'}
                testId="cajon-todas"
                onClick={() => setCajon('TODAS')}
              />
              {seVe('POR_VENCER', cuotasPorCajon.POR_VENCER ?? 0) ? (
                <PestanaDeCajon
                  marca={marca}
                  label="Por vencer"
                  cuotas={cuotasPorCajon.POR_VENCER ?? 0}
                  activa={cajon === 'POR_VENCER'}
                  testId="cajon-por-vencer"
                  onClick={() => setCajon('POR_VENCER')}
                />
              ) : null}
              {seVe('VENCIDA_EN_PLAZO', cuotasPorCajon.VENCIDA_EN_PLAZO ?? 0) ? (
                <PestanaDeCajon
                  marca={marca}
                  label={hayVencidasSinPlazo ? 'Vencido' : 'Vencido, en plazo'}
                  cuotas={cuotasPorCajon.VENCIDA_EN_PLAZO ?? 0}
                  tono="warning"
                  activa={cajon === 'VENCIDA_EN_PLAZO'}
                  testId="cajon-vencido-en-plazo"
                  onClick={() => setCajon('VENCIDA_EN_PLAZO')}
                />
              ) : null}
              {seVe('CARTERA', cuotasPorCajon.CARTERA ?? 0) ? (
                <PestanaDeCajon
                  marca={marca}
                  label="Cartera"
                  cuotas={cuotasPorCajon.CARTERA ?? 0}
                  tono="danger"
                  activa={cajon === 'CARTERA'}
                  testId="cajon-cartera"
                  onClick={() => setCajon('CARTERA')}
                />
              ) : null}
              {/* 🔴 La pestaña de las saldadas existe para que nadie desaparezca:
                  buscar a un inquilino que YA PAGÓ tiene que encontrarlo. */}
              {seVe('SIN_DEUDA', cuotasPorCajon.SIN_DEUDA ?? 0) ? (
                <PestanaDeCajon
                  marca={marca}
                  label="Pagadas"
                  cuotas={cuotasPorCajon.SIN_DEUDA ?? 0}
                  activa={cajon === 'SIN_DEUDA'}
                  testId="cajon-pagadas"
                  onClick={() => setCajon('SIN_DEUDA')}
                />
              ) : null}
            </div>

            {/* 4 · El buscador, DENTRO de la tarjeta. */}
            <div className="relative w-full pb-3 lg:w-72 lg:shrink-0 lg:pb-0">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-[18px] h-4 w-4 -translate-y-1/2 text-fg-muted lg:top-1/2"
                aria-hidden="true"
              />
              <Input
                className="h-9 pl-9"
                placeholder="Inquilino, documento, contrato o inmueble"
                aria-label="Buscar en las cuotas del mes"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-cuotas"
              />
            </div>
          </div>

          {/* 3b · Qué es lo que se está mirando, en una línea (las palabras de
                  «Cartera por concepto»: sin ellas «vencido, en plazo» y
                  «cartera» se leen como sinónimos). */}
          <p
            className="border-b border-border px-5 py-2.5 text-caption text-fg-muted sm:px-6"
            data-testid="que-es-este-cajon"
          >
            <Appear as="span" key={cajon} direction="none">
            {QUE_ES_ESTE_CAJON[cajon]}
            </Appear>
          </p>

          {/* 5 · La tabla, sin marco propio: el marco es el de la tarjeta. */}
          <CuotasDelMesTabla
            filas={visibles}
            mes={mes}
            hayFiltros={hayFiltros}
            onLimpiarFiltros={limpiar}
            vista={cajon}
            sinMarco
          />

          {/* 🔴 El alcance describe SIEMPRE lo que hay en la tabla, también sin
              filtros: «3 de 4 cuotas de septiembre de 2026». La cifra de arriba
              habla del MES; la tabla, de lo filtrado. */}
          <p
            className="border-t border-border px-5 py-3 text-caption text-fg-muted sm:px-6"
            data-testid="alcance-de-la-tabla"
          >
            {numberFormatter.format(visibles.length)} de{' '}
            {numberFormatter.format(todas.length)}{' '}
            {todas.length === 1 ? 'cuota' : 'cuotas'} de {enFrase}.
            <Presence as="span" show={hayFiltros} initial={false} direction="none">
                {' '}La cifra de arriba es la del mes completo.{' '}
                <button
                  type="button"
                  onClick={limpiar}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="limpiar-filtros"
                >
                  Quitar el filtro
                </button>
            </Presence>
          </p>
        </EstadoDeDatos>
      </div>

      {datos ? (
        <p className="px-1 text-caption text-fg-muted">
          La deuda sale de las cuotas del contrato: existe desde que se firma. Cada fila es
          un mes del <strong className="font-medium text-fg">estado de cuenta</strong> de ese
          cliente. Leído contra el {fechaLarga(datos.hoy)}.
        </p>
      ) : null}

      {/* El recibo de caja: se le hace a un CLIENTE y el back reparte la plata
          por antigüedad sobre sus cuotas (y permite adelantar). */}
      <RegistrarPagoModal
        isOpen={reciboAbierto}
        onClose={() => setReciboAbierto(false)}
        cobro={null}
        onSubmit={emitirRecibo}
      />
    </section>
  )
}
