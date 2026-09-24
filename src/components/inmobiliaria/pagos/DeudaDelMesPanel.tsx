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

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { MagnifyingGlass, Plus, Warning } from '@phosphor-icons/react'

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
import { useI18n } from '@/lib/i18n'
import { CLAVE_DE_MORA, RUTA_DE_REGLAS_DE_MORA } from '@/components/cartera/interes-de-mora'
import { mesEnTitulo } from '@/lib/utils/mes'
import { cn } from '@/lib/utils'

const numberFormatter = new Intl.NumberFormat('es-CO')

/** El mes corriente en 'YYYY-MM', en hora LOCAL (no UTC: ver lib/utils/mes). */
export function mesActual(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

/** Los últimos `cantidad` meses hasta hoy, del más reciente al más viejo. */
export function mesesRecientes(cantidad = 12, hoy: Date = new Date()): string[] {
  const meses: string[] = []
  for (let i = 0; i < cantidad; i += 1) {
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
  valor,
  testId,
  tono,
  activa,
  onClick,
  queMuestra,
}: {
  valor: string
  testId: string
  tono?: 'success' | 'danger'
  activa: boolean
  onClick: () => void
  /** Qué queda en la tabla al tocarla. Va al `title`: un clic no se adivina. */
  queMuestra: string
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      title={queMuestra}
      data-testid={`abrir-${testId}`}
      className={cn(
        'font-mono font-semibold tabular-nums decoration-dotted underline-offset-4',
        'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        activa ? 'underline' : 'hover:underline',
        tono === 'success' ? 'text-success' : tono === 'danger' ? 'text-danger' : 'text-fg',
      )}
      data-activa={activa ? 'si' : 'no'}
    >
      <span data-testid={testId}>{valor}</span>
    </button>
  )
}

/**
 * Una pestaña de cajón: el número ES el filtro.
 *
 * El monto que muestra es lo que FALTA en ese cajón —la misma medida en las
 * cuatro—, así que las tres de la derecha suman la primera. El conteo va
 * debajo, chico: es el dato secundario.
 */
function PestanaDeCajon({
  label,
  monto,
  cuotas,
  activa,
  tono,
  testId,
  testIdCifra,
  onClick,
  extra,
}: {
  label: string
  monto: number
  cuotas: number
  activa: boolean
  tono?: 'warning' | 'danger' | 'muted'
  testId: string
  testIdCifra: string
  onClick: () => void
  extra?: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        'relative flex shrink-0 flex-col gap-0.5 px-4 py-3 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        activa ? 'bg-surface' : 'hover:bg-surface-muted',
      )}
    >
      <span className={cn('text-xs', activa ? 'font-medium text-fg' : 'text-fg-muted')}>
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-base font-semibold tabular-nums',
          tono === 'danger'
            ? 'text-danger'
            : tono === 'warning'
              ? 'text-warning'
              : tono === 'muted'
                ? 'text-fg-muted'
                : 'text-fg',
        )}
        data-testid={testIdCifra}
      >
        {formatCurrency(monto)}
      </span>
      <span className="text-caption text-fg-subtle">
        {numberFormatter.format(cuotas)} {cuotas === 1 ? 'cuota' : 'cuotas'}
      </span>
      {extra}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 bottom-0 h-0.5 bg-primary transition-opacity',
          activa ? 'opacity-100' : 'opacity-0',
        )}
      />
    </button>
  )
}

export interface DeudaDelMesPanelProps {
  /** Inyectable para los tests; por defecto, el mes corriente. */
  mesInicial?: string
}

export function DeudaDelMesPanel({ mesInicial }: DeudaDelMesPanelProps) {
  const { t: traducir } = useI18n()
  const [mes, setMes] = useState(() => mesInicial ?? mesActual())
  const [busqueda, setBusqueda] = useState('')
  const [cajon, setCajon] = useState<CajonElegido>('TODAS')
  const [reciboAbierto, setReciboAbierto] = useState(false)

  const { datos, cargando, error, recargar } = useCarteraDelMes(mes)
  const puedeHacerRecibo = usePuedeHacerRecibo()

  const opciones = useMemo(() => mesesRecientes(12), [])
  const titulo = mesEnTitulo(mes)

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

  /** Las que de verdad faltan: los tres momentos, sin las ya saldadas. */
  const cuotasQueFaltan = useMemo(
    () => todas.filter((f) => f.cajon !== 'SIN_DEUDA').length,
    [todas],
  )

  /**
   * Lo que entró por las cuotas YA SALDADAS. No es el «Pagado» del resumen:
   * ése incluye los abonos parciales de cuotas que todavía deben, así que
   * usarlo acá pondría en la pestaña una plata que no es la de sus filas.
   */
  const pagadoDeLasSaldadas = useMemo(
    () =>
      todas
        .filter((f) => f.cajon === 'SIN_DEUDA')
        .reduce((suma, f) => suma + (f.pagadoCop ?? 0), 0),
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
  const interesDelMes = t?.interesCop ?? 0

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

  return (
    <section className="space-y-3" aria-label={`La deuda de ${titulo}`}>
      {/* 🔴 UNA tarjeta: el mes, las cifras, las pestañas, el buscador y la
          tabla. Antes eran cinco bloques sueltos encima de la tabla y ninguno
          se leía como parte de ella (Nico, 18-09). */}
      <div
        className="overflow-hidden rounded-lg border border-border bg-surface"
        data-testid="tarjeta-de-la-deuda"
      >
        {/* 1 · El mes y la única acción que mueve plata. Va FUERA de
            `EstadoDeDatos`: cambiar de mes no puede hacer desaparecer el
            control con el que se cambia de mes. */}
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-fg">La deuda de</h2>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-[190px]" aria-label="Mes de la deuda">
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
          </div>
          {/* Sin `cobros:create` queda a la vista y deshabilitado, con el porqué:
              esconder un control se lee como «falta la función». */}
          <span
            className="inline-flex"
            title={puedeHacerRecibo ? undefined : MOTIVO_SIN_PERMISO_DE_RECIBO}
          >
            <Button
              hideArrow
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
          queEs={`la deuda de ${titulo}`}
          onReintentar={recargar}
          esqueleto={<EsqueletoTabla columnas={6} filas={6} />}
        >
          {/* 2 · El mes en UNA FRASE, que dice la relación entre los tres
                 números. Eran tres fichas idénticas a las pestañas de abajo, y
                 por eso «no se sabía qué era de qué». Las tres cifras siguen
                 abriendo la tabla en sus filas. */}
          <p
            className="border-b border-border bg-surface-muted/40 px-4 py-3 text-sm leading-relaxed text-fg-muted"
            data-testid="resumen-del-mes"
          >
            De los{' '}
            <CifraEnLaFrase
              testId="mes-se-debe"
              valor={formatCurrency(t?.totalCop ?? 0)}
              activa={cajon === 'MES'}
              onClick={() => setCajon('MES')}
              queMuestra={`Ver las ${numberFormatter.format(t?.cuotas ?? 0)} cuotas del mes en la tabla`}
            />{' '}
            que se deben en {titulo} —{numberFormatter.format(t?.cuotas ?? 0)}{' '}
            {(t?.cuotas ?? 0) === 1 ? 'cuota' : 'cuotas'} de{' '}
            {numberFormatter.format(t?.inquilinos ?? 0)}{' '}
            {(t?.inquilinos ?? 0) === 1 ? 'inquilino' : 'inquilinos'}— ya entraron{' '}
            <CifraEnLaFrase
              testId="mes-pagado"
              valor={formatCurrency(t?.pagadoCop ?? 0)}
              tono="success"
              activa={cajon === 'PAGADO'}
              onClick={() => setCajon('PAGADO')}
              queMuestra="Ver en la tabla las cuotas que ya pagaron algo"
            />{' '}
            y faltan{' '}
            {/* «Falta por pagar» y la pestaña «Todo lo que falta» son el MISMO
                número, así que son el mismo filtro: al tocar cualquiera de los
                dos se encienden los dos. */}
            <CifraEnLaFrase
              testId="mes-falta"
              valor={formatCurrency(t?.pendienteCop ?? 0)}
              activa={cajon === 'TODAS'}
              onClick={() => setCajon('TODAS')}
              queMuestra="Ver en la tabla todo lo que falta por pagar"
            />
            {/* El interés va DENTRO de la misma oración, entre paréntesis.
                Suelto después del punto se leía como un fragmento —«$366.919.750
                con intereses.»— sin verbo ni sujeto. */}
            {interesDelMes > 0 ? (
              <span className="text-fg-muted" data-testid="mes-falta-con-intereses">
                {' ('}
                {traducir(CLAVE_DE_MORA.conIntereses, {
                  monto: formatCurrency(
                    t?.totalConInteresCop ?? (t?.pendienteCop ?? 0) + interesDelMes,
                  ),
                })}
                {')'}
              </span>
            ) : null}
            .
          </p>

          {/* 🔴 Lo que estos números NO cuentan. Un contrato vigente sin tabla de
              amortización no es un contrato sin deuda: es una deuda que todavía
              nadie generó. Callarlo deja el resumen mintiendo por omisión. */}
          {avisos.length > 0 && (
            <div
              className="flex gap-2 border-b border-border bg-warning-soft px-4 py-3 text-sm text-fg"
              data-testid="avisos-del-mes"
            >
              <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div className="space-y-2">
                <ul className="space-y-1">
                  {avisos.map((aviso) => (
                    <li key={aviso}>{aviso}</li>
                  ))}
                </ul>
                {/* Sin reglas de mora el interés sale en cero y NO porque no haya
                    mora: se lleva a donde se arregla. */}
                {datos?.sinReglasDeMora ? (
                  <Link
                    href={RUTA_DE_REGLAS_DE_MORA}
                    className="inline-block font-medium underline underline-offset-4"
                    data-testid="mes-configurar-reglas"
                  >
                    {traducir(CLAVE_DE_MORA.configurarReglas)}
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          {/* 3 · Los tres cajones COMO PESTAÑAS, pegadas a la tabla: el número
                 es el filtro. En el orden en que una deuda los recorre —nace
                 futura, vence, y recién después es cartera—, con las palabras
                 de «Cartera por concepto». */}
          <div
            role="tablist"
            aria-label="Qué cuotas ver en la tabla"
            data-testid="cajones-del-mes"
            data-lenis-prevent
            className="flex items-stretch divide-x divide-border overflow-x-auto border-b border-border bg-surface-muted/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* 🔴 «Ver en la tabla» es la palabra que faltaba. Nico, 21-09:
                «arriba hay como filtros, y no se ve a qué hacen parte». Las
                pestañas ya filtraban la tabla desde el 18-09, pero nada en
                pantalla lo DECÍA: se leían como cinco indicadores más. Un
                control que cambia una lista tiene que nombrar la lista. */}
            <span className="flex shrink-0 items-center whitespace-nowrap px-4 text-caption uppercase tracking-wide text-fg-subtle">
              Ver en la tabla
            </span>
            {/* 🔴 Los conteos de las CUATRO pestañas salen de la misma fuente
                —las filas—, para que la franja cuadre consigo misma: «todo lo
                que falta» es, por definición, la suma de los tres momentos que
                tiene al lado. Antes el primero contaba el mes entero (`t.cuotas`)
                y el último la cartera del back (`t.cuotasEnCartera`), y nada
                obligaba a que 0 + 8 + 93 diera lo que decía el primero. */}
            <PestanaDeCajon
              label="Todo lo que falta"
              monto={t?.pendienteCop ?? 0}
              cuotas={cuotasQueFaltan}
              activa={cajon === 'TODAS'}
              testId="cajon-todas"
              testIdCifra="mes-falta-pestana"
              onClick={() => setCajon('TODAS')}
            />
            <PestanaDeCajon
              label="Por vencer"
              monto={t?.porVencerCop ?? 0}
              cuotas={cuotasPorCajon.POR_VENCER ?? 0}
              tono="muted"
              activa={cajon === 'POR_VENCER'}
              testId="cajon-por-vencer"
              testIdCifra="mes-por-vencer"
              onClick={() => setCajon('POR_VENCER')}
            />
            <PestanaDeCajon
              label="Vencido, en plazo"
              monto={t?.vencidaEnPlazoCop ?? 0}
              cuotas={cuotasPorCajon.VENCIDA_EN_PLAZO ?? 0}
              tono="warning"
              activa={cajon === 'VENCIDA_EN_PLAZO'}
              testId="cajon-vencido-en-plazo"
              testIdCifra="mes-vencido-en-plazo"
              onClick={() => setCajon('VENCIDA_EN_PLAZO')}
            />
            <PestanaDeCajon
              label="Cartera"
              monto={t?.carteraCop ?? 0}
              cuotas={cuotasPorCajon.CARTERA ?? 0}
              tono="danger"
              activa={cajon === 'CARTERA'}
              testId="cajon-cartera"
              testIdCifra="mes-cartera"
              onClick={() => setCajon('CARTERA')}
              extra={
                interesDelMes > 0 ? (
                  <span
                    className="font-mono text-caption tabular-nums text-danger"
                    data-testid="mes-intereses"
                    title={traducir(CLAVE_DE_MORA.explicacion)}
                  >
                    {traducir(CLAVE_DE_MORA.masIntereses, {
                      monto: formatCurrency(interesDelMes),
                    })}
                  </span>
                ) : null
              }
            />
            {/* 🔴 La quinta pestaña existe para que nadie desaparezca. Sacar las
                saldadas de «todo lo que falta» era correcto, pero sin este
                cajón esas cuotas no se podían ver en ninguna parte y buscar a
                un inquilino que YA PAGÓ devolvía «ningún resultado» — la
                pantalla afirmaría que no existe. Con esto, las cuatro
                pestañas de deuda más ésta suman las cuotas del mes que dice
                el resumen, y el número se puede conciliar a ojo. */}
            <PestanaDeCajon
              label="Pagadas"
              monto={pagadoDeLasSaldadas}
              cuotas={cuotasPorCajon.SIN_DEUDA ?? 0}
              tono="muted"
              activa={cajon === 'SIN_DEUDA'}
              testId="cajon-pagadas"
              testIdCifra="mes-pagadas"
              onClick={() => setCajon('SIN_DEUDA')}
            />
          </div>

          {/* 3b · Qué es el cajón elegido, en una línea. Es lo que antes vivía
                  debajo de cada ficha; acá acompaña a la tabla que se mira. */}
          <p
            className="border-b border-border px-4 py-2 text-xs text-fg-muted"
            data-testid="que-es-este-cajon"
          >
            {QUE_ES_ESTE_CAJON[cajon]}
          </p>

          {/* 4 · El buscador, DENTRO de la tarjeta, con el alcance a su lado.
                 La cifra de arriba habla del MES; la tabla, de lo filtrado. */}
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Inquilino, documento, contrato o inmueble"
                aria-label="Buscar en las cuotas del mes"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-cuotas"
              />
            </div>
            {/*
              🔴 El alcance describe SIEMPRE lo que hay en la tabla, también sin
              filtros puestos. Antes el caso «sin filtros» cantaba `todas.length`
              —las cuotas del mes— y desde que «Todo lo que falta» dejó fuera las
              saldadas, eso era falso: decía «105 cuotas en Septiembre de 2026»
              encima de una tabla de 101. Un renglón que cuenta una cosa y
              muestra otra es peor que no tener renglón.
            */}
            <p className="text-xs text-fg-muted" data-testid="alcance-de-la-tabla">
              {numberFormatter.format(visibles.length)} de{' '}
              {numberFormatter.format(todas.length)}{' '}
              {todas.length === 1 ? 'cuota' : 'cuotas'} de {titulo}.
              {hayFiltros ? (
                <>
                  {' '}Las cifras de arriba son las del mes completo.{' '}
                  <button
                    type="button"
                    onClick={limpiar}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    data-testid="limpiar-filtros"
                  >
                    Quitar el filtro
                  </button>
                </>
              ) : null}
            </p>
          </div>

          {/* 5 · La tabla, sin marco propio: el marco es el de la tarjeta. */}
          <CuotasDelMesTabla
            filas={visibles}
            mes={mes}
            hayFiltros={hayFiltros}
            onLimpiarFiltros={limpiar}
            sinMarco
          />
        </EstadoDeDatos>
      </div>

      {datos ? (
        <p className="text-xs text-fg-muted">
          La deuda sale de las cuotas del contrato, no de los cobros emitidos: existe
          desde que se firma, y el inquilino puede pagarla antes o hasta el día máximo
          de cartera de su contrato. Cada fila es un mes del{' '}
          <strong className="font-medium">estado de cuenta</strong> de ese cliente: haz
          clic en su nombre para verlo completo. Leído contra el {datos.hoy}.
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
