'use client'

/**
 * La cartera entera en una pantalla, discriminada por cajón y por edad.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El dato ya se calculaba: `GET /inmobiliaria/reports/cartera` devuelve cada
 * deuda con sus días de mora y, aparte, los casos en siniestro. Pero en
 * pantalla vivía dentro de Reportes → una pestaña avanzada → una sub-pestaña,
 * y ahí el adaptador la cortaba con `.slice(0, 10)`. Con 1.200 contratos se
 * veían diez.
 *
 * ── 🔴 «En mora» dejó de significar «venció» (2026-09-16) ───────────────────
 *
 * Esta pantalla leía un informe que salía de `Cobro` y que contaba los días de
 * mora restando el vencimiento de hoy. Dos consecuencias, las dos medidas en
 * dev el 16-09 sobre la inmobiliaria migrada:
 *
 *   · con 0 cobros y 30.951 cuotas, la pantalla decía CERO teniendo $8.446,8
 *     millones de deuda encima;
 *   · sin los días de plazo del contrato, todo lo vencido se leía como mora.
 *
 * Ahora el informe sale de `contrato_cuotas` y trae la frontera resuelta, así
 * que la franja muestra las MISMAS cuatro cifras, con las MISMAS palabras, que
 * «Cartera por concepto» —son la misma historia contada dos veces y no pueden
 * discrepar—:
 *
 *   · **Deuda total** ....... $8.446,8 M — todo lo pendiente del contrato.
 *   · **Por vencer** ........ $7.682,1 M — todavía no vence. Es deuda, no cartera.
 *   · **Vencido, en plazo** ...  $109,5 M — venció, el plazo sigue corriendo.
 *   · **Cartera** ..........   $655,1 M — pasó el plazo. Esto es lo que la
 *     cobranza persigue, y es 12,9 veces menos que la deuda total.
 *
 * Los tramos por edad (0-30 · 31-60 · 61-90 · +90) sólo se le aplican a la
 * CARTERA, y se miden sobre los días DESPUÉS del plazo: una deuda que ayer
 * decía 30 días hoy puede decir 27.
 *
 * ── Cómo se lee (glow-up, Nico 2026-09-03: «no se entiende, no se ve la
 *    tabla, esos botones Por deuda / Por propietario me imagino que son un
 *    tab para la tabla») ───────────────────────────────────────────────────
 *
 *   1. UNA franja de resumen. Cada cifra es un filtro; «Deuda total» los quita.
 *   2. Cuatro fichas con la edad DE LA CARTERA. Cada una es un filtro.
 *   3. UNA tarjeta con LA tabla de la casa. En su barra: el agrupador
 *      (Por deuda · Por propietario · En siniestro) y la búsqueda. Tocar un
 *      propietario abre sus deudas; el filtro queda como chip.
 *
 * ── 🔴 El interés de mora, aparte del capital (2026-09-16) ──────────────────
 *
 * La prefactura cobraba un interés que esta pantalla no mostraba. Ahora cada
 * deuda trae su interés —liquidado por el back con la MISMA regla que la
 * prefactura y el estado de cuenta— y la franja lo dice debajo de la cifra que
 * corresponde: «+ $X de intereses». Las cifras grandes siguen siendo CAPITAL:
 * los cajones y los tramos son una partición del capital y no se tocan. Medido
 * en QA el 16-09: $3.003,9 M de cartera y $546,6 M de interés encima.
 *
 * ── 🔴 El siniestro es parte de la cartera (bug A, 16-09) ───────────────────
 *
 * «Por edad» decía deuda total $2.687 M y cartera $364,8 M; «Por concepto»,
 * $5.326 M y $3.003,9 M: la diferencia era lo que está en siniestro, restado
 * en silencio. Ahora «Deuda total» y «Cartera» son las MISMAS de «Por
 * concepto» —siniestro incluido—, la cifra de cartera dice cuánto de ella está
 * en siniestro, la edad tiene un quinto tramo «En siniestro» (los cinco suman
 * la cartera), y las filas de «Por deuda» y «Por propietario» incluyen esos
 * casos para que cada cifra se pueda rastrear hasta sus filas.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Sumar en un solo número lo que no vence, lo vencido en plazo y la
 *    cartera.** Son tres cosas distintas y la Ley 2300 las trata distinto:
 *    perseguir las tres sería perseguir 12,9 veces lo perseguible.
 * 2. **Mezclar los siniestros con la cartera viva.** Son cartera, pero ya no
 *    son cobranza: van dentro de la cifra de cartera, dichos aparte, con su
 *    propio tramo, su propio segmento y su propia cifra.
 * 3. **Pintar un error como una cartera vacía.** «Nadie te debe nada» y «no
 *    pudimos preguntar» se ven idénticos si se muestra la misma pantalla.
 * 4. **Decir «sin resultados» cuando lo que hay es un filtro puesto.** Son dos
 *    vacíos distintos y se resuelven distinto.
 * 5. **Callar lo que el número NO cuenta.** Hay contratos vigentes sin tabla de
 *    amortización y cuotas sin agente responsable: el back lo dice en `avisos`
 *    y la pantalla lo muestra. Un cero por omisión es el defecto que este
 *    cambio vino a cerrar.
 */

import { useId, useMemo, useState } from 'react'
import { useFilasMarcadas } from '@/lib/hooks/use-filas-marcadas'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import { CarteraMarcada } from '@/components/cartera/CarteraMarcada'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MasDetalles } from '@/components/pantalla/MasDetalles'
import { useRouter } from 'next/navigation'
import {
  CurrencyCircleDollar,
  MagnifyingGlass,
  Scales,
  ShieldWarning,
  Users,
  Warning,
  X,
} from '@phosphor-icons/react'
import { Appear, MotionIndicator, Presence, SegmentedControl, type SegmentedOption } from '@leasefy/cadence'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  CarteraTable,
  ORDEN_POR_DEFECTO,
  aDondeLleva,
  ordenarCartera,
  type OrdenDeCartera,
} from '@/components/cartera/CarteraTable'
import { TablaDeSiniestros } from '@/components/cartera/EnSiniestro'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useCarteraReport } from '@/lib/hooks/useInmobiliaria'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { estiloDeLaFranja } from '@/lib/plata/cifra-que-cabe'
import type { CarteraItem } from '@/lib/types/inmobiliaria'
import {
  discriminar,
  filtrarCartera,
  filtrarPropietarios,
  porPropietario,
  EDADES,
  NOMBRE_DEL_CAJON,
  NOMBRE_DE_EDAD,
  NOMBRE_DE_GRAVEDAD,
  QUE_SIGNIFICA,
  QUE_SIGNIFICA_EL_CAJON,
  type Cajon,
  type DeudaDePropietario,
  type Edad,
  type Gravedad,
} from '@/lib/cartera/edades'
import { cn } from '@/lib/utils'
import { plataPareja } from '@/lib/format'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_MORA,
  RUTA_DE_REGLAS_DE_MORA,
  faltanReglasDeMora,
  interesDe,
  sumarIntereses,
  totalConInteres,
} from '@/components/cartera/interes-de-mora'

type Vista = 'deudas' | 'propietarios' | 'siniestros'

/**
 * El color dice gravedad, y por eso lo que no venció NO puede ir en rojo: es
 * plata que va a entrar, no plata que hay que ir a buscar.
 */
const TONO: Record<Gravedad, string> = {
  POR_VENCER: 'text-fg-muted',
  VENCIDA_EN_PLAZO: 'text-warning',
  '0-30': 'text-fg',
  '31-60': 'text-warning',
  '61-90': 'text-warning',
  '90+': 'text-danger',
  SINIESTRO: 'text-danger',
}

/** Propietario · deudas · inmuebles · lo peor · capital · intereses · total. */
const COLUMNAS_POR_PROPIETARIO = 7

interface PropietarioElegido {
  id: string | null
  nombre: string
}

export function CarteraCompleta() {
  const { t } = useI18n()
  const { report, isLoading, error, errorCrudo, refetch } = useCarteraReport()
  // `undefined` = todavía nadie eligió: ver `cajon` más abajo.
  const [cajonElegido, setCajon] = useState<Cajon | null | undefined>(undefined)
  const [edad, setEdad] = useState<Edad | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('deudas')
  const [propietario, setPropietario] = useState<PropietarioElegido | null>(null)
  const router = useRouter()

  const items = useMemo<CarteraItem[]>(() => report?.items ?? [], [report])
  const siniestros = report?.siniestros ?? null
  /*
   * 🔴 La cartera CASTIGADA (21-09-2026). NO es un segmento más de esta tabla:
   * sus filas no están en `items` —salen del informe activo a propósito— y por
   * eso la cifra ENLAZA a su pantalla en vez de filtrar acá. Se pinta siempre
   * que el back la mande, aunque venga en cero: que exista la figura es lo que
   * hace que el número de arriba cuadre con sus partes.
   */
  const castigada = report?.castigada ?? null
  /*
   * Los tramos por edad que NO PUEDEN llenarse con esta configuración: los que
   * arrancan en o después del umbral de siniestro, porque esa cartera sale de
   * los tramos y se va a su propio cajón.
   */
  const tramosQueNoSeLlenan = useMemo<Edad[]>(() => {
    const umbral = siniestros?.diasParaSiniestro
    if (umbral === undefined) return []
    const DESDE: Record<Edad, number> = { '0-30': 1, '31-60': 31, '61-90': 61, '90+': 91 }
    return EDADES.filter((e) => DESDE[e] >= umbral)
  }, [siniestros])
  const casosEnSiniestro = useMemo<CarteraItem[]>(() => siniestros?.items ?? [], [siniestros])
  /** 🔴 TODA la deuda: los tres cajones y los casos en siniestro. */
  const todas = useMemo(() => [...items, ...casosEnSiniestro], [items, casosEnSiniestro])
  const avisos = report?.avisos ?? []

  // Las fichas y la franja hablan de TODA la cartera, no de lo filtrado: si
  // se achicaran con el filtro, dejarían de servir para elegir el filtro.
  const cartera = useMemo(() => discriminar(items, casosEnSiniestro), [items, casosEnSiniestro])
  // 22-10 (revisión): «no se llena» sólo si de verdad está vacío; con plata adentro sería falso.
  // Los mismos decimales en toda la franja (revisión 22-10).
  const plataDeLaFranja = plataPareja([
    cartera.deudaTotal,
    ...(['POR_VENCER', 'VENCIDA_EN_PLAZO', 'CARTERA'] as const).map((c) => cartera.cajones.find((x) => x.cajon === c)?.monto ?? 0),
    siniestros?.totalCop,
    castigada?.totalCop,
    ...cartera.tramos.map((t) => t.monto),
    cartera.enSiniestro.monto,
    // Ronda 11: la tabla habla con el mismo formato que la franja (antes «,00»
    // arriba y sin decimales abajo en la misma página).
    ...todas.flatMap((i) => [i.pendingAmount, i.paidAmount, interesDe(i)?.pendienteCop, interesDe(i)?.abonadoCop, totalConInteres(i, i.pendingAmount)]),
  ])
  const tramosVaciosPorElSiniestro = tramosQueNoSeLlenan.filter(
    (e) => (cartera.tramos.find((t) => t.edad === e)?.monto ?? 0) === 0,
  )
  /*
   * 15-10-2026 (Nico, con Juan de Portofino: «la que deberíamos ver es lo que
   * está vencido como cartera»): si hay cartera, la pantalla ENTRA en ella. La
   * deuda total y lo por vencer (decisión del CEO del 16-09) siguen arriba, a un
   * clic. Sin cartera entra en toda la deuda: abrir en un filtro vacío diría
   * «sin resultados» cuando lo cierto es que nadie está en mora.
   */
  const hayCartera = (cartera.cajones.find((c) => c.cajon === 'CARTERA')?.items.length ?? 0) > 0
  const cajon: Cajon | null = cajonElegido === undefined ? (hayCartera ? 'CARTERA' : null) : cajonElegido
  /** 🔴 CR-31: la inmobiliaria no ha fijado su plazo: lo vencido no está «en plazo». */
  const hayVencidasSinPlazo = useMemo(() => items.some((i) => i.plazoSinFijar), [items])
  const nombreDelCajon = (cual: Cajon) =>
    cual === 'VENCIDA_EN_PLAZO' && hayVencidasSinPlazo ? 'Vencido' : NOMBRE_DEL_CAJON[cual]
  const queSignificaElCajon = (cual: Cajon) =>
    cual === 'VENCIDA_EN_PLAZO' && hayVencidasSinPlazo
      ? 'Venció. Sin plazo fijado no es cartera ni corre mora.'
      : QUE_SIGNIFICA_EL_CAJON[cual]
  const montoDelCajon = (cual: Cajon) =>
    cartera.cajones.find((c) => c.cajon === cual)!
  /*
   * El interés, de las MISMAS filas que la franja, igual que los montos: así
   * la cifra y las filas que se ven al tocarla no pueden discrepar.
   */
  const interesDeLaCartera = useMemo(
    () => sumarIntereses(cartera.cajones.find((c) => c.cajon === 'CARTERA')?.items ?? []),
    [cartera],
  )
  const interesTotal = useMemo(() => sumarIntereses(todas), [todas])
  const interesEnSiniestro = useMemo(
    () => sumarIntereses(siniestros?.items ?? []),
    [siniestros],
  )
  const sinReglasDeMora = report?.sinReglasDeMora === true || faltanReglasDeMora(todas)

  /*
   * 🔴 El orden va ANTES del paginado (prueba en navegador, 16-09): la tabla
   * ordenaba sólo las diez filas de su página y `todas` pone los siniestros al
   * final, así que la página 1 decía «lo más vencido arriba» con cuotas de 27
   * días mientras las de 253 quedaban en la página 74 —y una misma cuota de
   * julio de un contrato caía en la página 2, detrás de su cuota por vencer de
   * noviembre—.
   */
  const [orden, setOrden] = useState<OrdenDeCartera>(ORDEN_POR_DEFECTO)
  const deudas = useMemo(
    () =>
      ordenarCartera(
        filtrarCartera(todas, {
          cajon,
          edad,
          busqueda,
          propietarioId: propietario ? propietario.id : undefined,
        }),
        orden.campo,
        orden.sentido,
      ),
    [todas, cajon, edad, busqueda, propietario, orden],
  )
  const propietarios = useMemo(
    () => filtrarPropietarios(porPropietario(filtrarCartera(todas, { cajon, edad })), busqueda),
    [todas, cajon, edad, busqueda],
  )
  const casos = useMemo(
    () => filtrarCartera(siniestros?.items ?? [], { busqueda }),
    [siniestros, busqueda],
  )

  /*
   * Paginado en cliente, con el hook que ya usan Agenda e Inquilinos: el
   * reporte llega entero (una fila por cuota) y el recorte es de presentación.
   * `resetKey` manda a la página 1 cuando cambia un filtro — sin eso, elegir
   * un tramo estando en la página 4 deja la tabla en blanco y se lee como
   * «no hay nada». Tres hooks porque son tres listas de forma distinta.
   */
  const clave = `${vista}|${cajon ?? ''}|${edad ?? ''}|${busqueda}|${propietario ? (propietario.id ?? 'null') : ''}|${orden.campo}|${orden.sentido}`
  const pagDeudas = useTablePagination(deudas, { resetKey: clave })
  // Acciones masivas (Nico, 10-10-2026). Con otro filtro, lo marcado se suelta (el orden no).
  const { marcadas, marcar, quitar: quitarLaSeleccion } = useFilasMarcadas(
    `${vista}|${cajon ?? ''}|${edad ?? ''}|${busqueda}|${propietario ? (propietario.id ?? 'null') : ''}`,
  )
  const cuotasMarcadas = useMemo(() => deudas.filter((d) => marcadas.has(d.cuotaId)), [deudas, marcadas])
  const permisosMasivos = usePermissionsContextSafe()
  const pagPropietarios = useTablePagination(propietarios, { resetKey: clave })
  const pagCasos = useTablePagination(casos, { resetKey: clave })
  const pag =
    vista === 'deudas' ? pagDeudas : vista === 'propietarios' ? pagPropietarios : pagCasos
  /*
   * Movimiento (ola 2, 03-10-2026): el cuerpo de la tabla se monta de nuevo
   * con cada filtro, orden o página (las filas nuevas entran escalonadas, sin
   * esperar a que salgan las viejas); la búsqueda NO está en la clave: al
   * escribir, las que ya no coinciden salen en su lugar.
   */
  const claveDelCuerpo = `${vista}|${cajon ?? ''}|${edad ?? ''}|${propietario ? (propietario.id ?? 'null') : ''}|${orden.campo}|${orden.sentido}|${pag.page}|${pag.pageSize}`
  const marca = useId()

  const hayBusqueda = busqueda.trim().length > 0
  const hayFiltros =
    vista === 'siniestros'
      ? hayBusqueda
      : vista === 'propietarios'
        ? hayBusqueda || Boolean(cajon) || Boolean(edad)
        : hayBusqueda || Boolean(cajon) || Boolean(edad) || propietario !== null

  const limpiar = () => {
    setCajon(null)
    setEdad(null)
    setBusqueda('')
    setPropietario(null)
  }

  /** Una cifra de la franja: filtra por su cajón y suelta el tramo de edad. */
  const elegirCajon = (cual: Cajon) => {
    const mismo = cajon === cual
    setCajon(mismo ? null : cual)
    if (!mismo || edad) setEdad(null)
    if (vista === 'siniestros') setVista('deudas')
  }

  /** Una ficha de edad: la edad SÓLO existe dentro de la cartera. */
  const elegirTramo = (t: Edad) => {
    const mismo = edad === t
    setEdad(mismo ? null : t)
    setCajon(mismo ? null : 'CARTERA')
    if (vista === 'siniestros') setVista('deudas')
  }

  const abrirPropietario = (p: DeudaDePropietario) => {
    setPropietario({ id: p.propietarioId, nombre: p.propietarioName })
    setVista('deudas')
  }

  const segmentos: SegmentedOption<Vista>[] = [
    { value: 'deudas', label: 'Por deuda' },
    { value: 'propietarios', label: 'Por propietario' },
    ...(siniestros
      ? [
          {
            value: 'siniestros' as const,
            label: siniestros.cantidad > 0 ? `En siniestro · ${siniestros.cantidad}` : 'En siniestro',
          },
        ]
      : []),
  ]

  /*
   * Cargando → falló → contenido, en ese orden y con el componente de la casa.
   *
   * Va por FUERA de los tramos a propósito: una cartera pintada en $0 mientras
   * todavía se está preguntando afirma «nadie te debe nada», que es lo
   * contrario de «no pudimos preguntar». `isLoading && !report` deja pasar el
   * refresco de fondo sin blanquear lo que ya se está viendo.
   */
  return (
    <EstadoDeDatos
      cargando={isLoading && !report}
      error={error ? (errorCrudo ?? new Error(error)) : null}
      queEs="la cartera"
      onReintentar={refetch}
      esqueleto={
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── La cartera: UNA cifra grande y su barra. Cada monto es un filtro. ──
            GLOW UP (revisión de Dinero, 22-10-2026: «6 cifras del mismo peso»): la
            cifra que se persigue —la cartera— va grande; de cuánta deuda es parte,
            al lado; la barra dice cómo se reparte la deuda (por vencer · vencido en
            plazo · cartera) y, debajo de la cartera, qué parte ya es siniestro o
            está castigada. Las palabras siguen siendo las de «Cartera por concepto». */}
        <div
          className="grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-surface"
          data-testid="resumen-de-cartera"
          // 15-10: con centavos la cifra no cabía; cada ficha la achica a su ancho (`cifra-que-cabe`).
          style={estiloDeLaFranja([
            plataDeLaFranja(cartera.deudaTotal),
            ...(['POR_VENCER', 'VENCIDA_EN_PLAZO', 'CARTERA'] as const).map((c) => plataDeLaFranja(montoDelCajon(c).monto)),
            ...(siniestros ? [plataDeLaFranja(siniestros.totalCop)] : []),
            ...(castigada ? [plataDeLaFranja(castigada.totalCop)] : []),
          ])}
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <p className="font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">{nombreDelCajon('CARTERA')}</p>
            <div className="flex flex-col gap-x-4 gap-y-2 lg:flex-row lg:items-end lg:justify-between">
              {/* La cartera: la cifra grande. Tocarla deja la tabla en la cartera. */}
              <button
                type="button"
                onClick={() => elegirCajon('CARTERA')}
                aria-pressed={cajon === 'CARTERA'}
                data-testid="resumen-cartera"
                className="ficha-con-cifra w-full min-w-0 rounded-lg lg:flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  className={cn(
                    'cifra-que-cabe block font-mono text-[32px] font-medium leading-none tracking-[-0.02em] tabular-nums text-danger sm:text-[40px]',
                    cajon === 'CARTERA' && 'underline decoration-dotted decoration-1 underline-offset-[0.2em]',
                  )}
                >
                  {plataDeLaFranja(montoDelCajon('CARTERA').monto)}
                </span>
                <span className="mt-2 block text-body-sm text-fg-muted">{queSignificaElCajon('CARTERA')}</span>
                {/* El interés corre SÓLO sobre la cartera. */}
                {interesDeLaCartera > 0 ? (
                  <span
                    className="mt-0.5 block font-mono text-caption tabular-nums text-danger"
                    data-testid="resumen-intereses-cartera"
                    title={t(CLAVE_DE_MORA.explicacion)}
                  >
                    {t(CLAVE_DE_MORA.masIntereses, { monto: plataDeLaFranja(interesDeLaCartera) })}
                  </span>
                ) : null}
                {/* 🔴 La cartera INCLUYE el siniestro, y lo dice. */}
                {cartera.enSiniestro.monto > 0 ? (
                  <span
                    className="mt-0.5 block font-mono text-caption tabular-nums text-fg-muted"
                    data-testid="resumen-cartera-en-siniestro"
                  >
                    {t('cartera.porEdad.deLaCualEnSiniestro', {
                      monto: plataDeLaFranja(cartera.enSiniestro.monto),
                    })}
                  </span>
                ) : null}
              </button>

              {/* La deuda entera, de la que la cartera es una parte. Tocarla quita los filtros. */}
              <button
                type="button"
                onClick={limpiar}
                aria-pressed={cajon === null && edad === null}
                className="ficha-con-cifra w-full min-w-0 shrink-0 rounded-lg lg:w-[18rem] text-left lg:text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="resumen-deuda-total"
              >
                <span className="block text-caption text-fg-muted">Deuda total · nace con el contrato</span>
                <span className="cifra-que-cabe block font-mono text-[17px] tabular-nums text-fg" data-testid="cifra-deuda-total">
                  {plataDeLaFranja(cartera.deudaTotal)}
                </span>
                <span className="block text-caption text-fg-muted">
                  {todas.length.toLocaleString('es-CO')} {todas.length === 1 ? 'cuota' : 'cuotas'}
                </span>
                {interesTotal > 0 ? (
                  <span
                    className="block font-mono text-caption tabular-nums text-fg-muted"
                    data-testid="resumen-deuda-con-intereses"
                  >
                    {t(CLAVE_DE_MORA.conIntereses, {
                      monto: plataDeLaFranja(cartera.deudaTotal + interesTotal),
                    })}
                  </span>
                ) : null}
              </button>
            </div>

            {/* Cómo se reparte la deuda: por vencer · vencido en plazo · cartera. */}
            {cartera.deudaTotal > 0 ? (
              <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label="Cómo se reparte la deuda" data-testid="barra-de-la-deuda">
                {(['POR_VENCER', 'VENCIDA_EN_PLAZO', 'CARTERA'] as const).map((cual) => {
                  const monto = Math.max(0, montoDelCajon(cual).monto)
                  if (monto <= 0) return null
                  return (
                    <span
                      key={cual}
                      className={cn(
                        'h-full first:rounded-l-full last:rounded-r-full',
                        cual === 'POR_VENCER' ? 'bg-sand-300 dark:bg-neutral-600' : cual === 'VENCIDA_EN_PLAZO' ? 'bg-warning-500' : 'bg-error-500',
                      )}
                      style={{ width: `${(monto / cartera.deudaTotal) * 100}%` }}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* La leyenda: lo que NO es cartera (por vencer, vencido en plazo) y qué parte
              de la cartera ya no se persigue igual (siniestro, castigada). */}
          <div
            className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
            data-testid="leyenda-de-la-cartera"
          >
            {(['POR_VENCER', 'VENCIDA_EN_PLAZO'] as const).map((cual) => {
              const suyo = montoDelCajon(cual)
              const activo = cajon === cual
              return (
                <button
                  key={cual}
                  type="button"
                  onClick={() => elegirCajon(cual)}
                  aria-pressed={activo}
                  data-testid={`resumen-${cual.toLowerCase()}`}
                  className="ficha-con-cifra relative isolate bg-surface px-5 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-6"
                >
                  {activo ? (
                    <MotionIndicator layoutId={`${marca}-cajon`} className="inset-0 -z-10 bg-surface-muted" />
                  ) : null}
                  <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', cual === 'POR_VENCER' ? 'bg-sand-300 dark:bg-neutral-600' : 'bg-warning-500')} />
                    {nombreDelCajon(cual)}
                  </span>
                  <span className={cn('cifra-que-cabe mt-1 block font-mono text-[17px] tabular-nums', TONO[cual])}>
                    {plataDeLaFranja(suyo.monto)}
                  </span>
                  <span className="mt-0.5 block text-caption text-fg-muted">{queSignificaElCajon(cual)}</span>
                </button>
              )
            })}

            {siniestros ? (
              /* La cifra abre el segmento: es el mismo dato, visto de cerca. */
              <button
                type="button"
                onClick={() => setVista('siniestros')}
                className="ficha-con-cifra bg-surface px-5 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-6"
                data-testid="resumen-en-siniestro"
              >
                <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                  <ShieldWarning className="h-3.5 w-3.5" aria-hidden="true" />
                  En siniestro
                </span>
                <span className="cifra-que-cabe mt-1 block font-mono text-[17px] tabular-nums text-fg">
                  {plataDeLaFranja(siniestros.totalCop)}
                </span>
                <span className="mt-0.5 block text-caption text-fg-muted">
                  {siniestros.cantidad === 0
                    ? 'Ningún caso'
                    : `${siniestros.cantidad} ${siniestros.cantidad === 1 ? 'caso' : 'casos'}`}
                  {' · '}a los {siniestros.diasParaSiniestro} días de mora
                </span>
                {interesEnSiniestro > 0 ? (
                  <span className="mt-0.5 block font-mono text-caption tabular-nums text-danger">
                    {t(CLAVE_DE_MORA.masIntereses, { monto: plataDeLaFranja(interesEnSiniestro) })}
                  </span>
                ) : null}
              </button>
            ) : null}

            {castigada ? (
              /*
               * Enlace y no botón: lo castigado vive en otra pantalla porque el
               * pedido es que SALGA de la cartera activa.
               */
              <Link
                href="/panel/inmobiliaria/pagos/cartera/castigada"
                className="ficha-con-cifra block bg-surface px-5 py-3.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-6"
                data-testid="resumen-castigada"
              >
                <span className="flex items-center gap-1.5 text-caption text-fg-muted">
                  <Scales className="h-3.5 w-3.5" aria-hidden="true" />
                  Castigada
                </span>
                <span className="cifra-que-cabe mt-1 block font-mono text-[17px] tabular-nums text-fg-muted">
                  {plataDeLaFranja(castigada.totalCop)}
                </span>
                <span className="mt-0.5 block text-caption text-fg-muted">
                  {castigada.cantidad === 0
                    ? 'Ninguna'
                    : `${castigada.cantidad} ${castigada.cantidad === 1 ? 'cuota' : 'cuotas'}`}
                  {' · '}ya no se persigue
                </span>
              </Link>
            ) : null}
          </div>
        </div>

        {/*
          🔴 Lo que estos números NO cuentan. Un contrato vigente sin tabla de
          amortización no es un contrato sin deuda: es una deuda que todavía
          nadie generó. Callarlo deja la franja mintiendo por omisión.
        */}
        {/* GLOW UP (21-10): los avisos son lo que falta para que la cartera esté completa → UNA lista con
            su paso siguiente («Sigue») y, en las reglas de mora, su botón. Se pliega cuando no falta nada. */}
        {/* GLOW UP (22-10, revisión de Dinero: «lista 0/3 → una línea»): lo que estos
            números no cuentan, en UN renglón junto a la cifra, plegado con su salida. */}
        {avisos.length > 0 ? (
          <div className="flex items-start gap-2.5 text-body-sm text-fg" data-testid="avisos-de-la-cartera" role="status">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-warning-500" aria-hidden="true" />
            <MasDetalles
              montadoSiempre
              etiqueta={(() => {
                const n = avisos.length + (sinReglasDeMora && !avisos.some((a) => /reglas de mora/i.test(a)) ? 1 : 0)
                return n === 1 ? '1 cosa afecta estas cifras' : `${n} cosas afectan estas cifras`
              })()}
              etiquetaAbierto="Ocultar"
              classNameDelContenido="space-y-3"
            >
              <ul className="list-disc space-y-1 pl-4 text-fg-muted marker:text-fg-subtle">
                {avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
                {sinReglasDeMora && !avisos.some((a) => /reglas de mora/i.test(a)) ? (
                  <li>{t(CLAVE_DE_MORA.configurarReglas)}</li>
                ) : null}
              </ul>
              {sinReglasDeMora ? (
                <Button asChild size="sm" variant="secondary">
                  <Link href={RUTA_DE_REGLAS_DE_MORA} data-testid="cartera-configurar-reglas">
                    {t(CLAVE_DE_MORA.configurarReglas)}
                  </Link>
                </Button>
              ) : null}
            </MasDetalles>
          </div>
        ) : null}


        {/* ── LA tabla, sin título encima: no se nombran las tablas. ───── */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          {/* GLOW UP (21-10): la edad de la cartera es un FILTRO de esta tabla → vive dentro de su tarjeta,
              arriba, como una franja (no como tarjetas sueltas encima). */}
          {/* ── La edad DE LA CARTERA. Cada ficha es un filtro. ──────────── */}
          <div className="border-b border-border" data-testid="edad-en-la-tabla">
            <p className="px-4 pt-3 text-xs text-fg-muted">{t('cartera.porEdad.edadDeLaCartera')}</p>
            {/*
              🔴 21-09-2026, abriendo esta pantalla con la agencia migrada:
              «31 a 60», «61 a 90» y «Más de 90 días» salían en $0 con 788 casos
              de 259 días de mora al lado. No es un error de la cuenta: con el
              siniestro a los 30 días, TODA la cartera de más de 30 días sale de
              los tramos y se va a «En siniestro», así que esos tres tramos no
              pueden llenarse nunca. Tres ceros permanentes sin explicación se
              leen como «no hay mora vieja», que es lo contrario de la verdad.
            */}
            {tramosVaciosPorElSiniestro.length > 0 ? (
              <p className="px-4 pt-1 text-xs text-fg-muted" data-testid="tramos-que-no-se-llenan">
                Con el siniestro a los {siniestros!.diasParaSiniestro} días, la cartera viva
                no llega a {tramosVaciosPorElSiniestro.map((e) => NOMBRE_DE_EDAD[e]).join(', ')}:
                esa mora está en «En siniestro».
              </p>
            ) : null}
            <div
              className="mt-2 flex divide-x divide-border overflow-x-auto border-t border-border"
              role="group"
              aria-label="Edad de la cartera"
              data-testid="tramos-de-la-cartera"
            >
              {cartera.tramos.map((tramo) => {
                const activa = edad === tramo.edad && vista !== 'siniestros'
                return (
                  <button
                    key={tramo.edad}
                    type="button"
                    onClick={() => elegirTramo(tramo.edad)}
                    aria-pressed={activa}
                    data-testid={`tramo-${tramo.edad}`}
                    className={cn(
                      'relative isolate min-w-[150px] flex-1 px-4 py-3 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                      activa ? '' : 'hover:bg-surface-muted',
                    )}
                  >
                    {/* El marco de la ficha elegida SE DESLIZA a la nueva. */}
                    {activa ? (
                      <MotionIndicator layoutId={`${marca}-tramo`} className="inset-0 -z-10 bg-primary-soft" />
                    ) : null}
                    <p className="text-xs text-fg-muted">{NOMBRE_DE_EDAD[tramo.edad]}</p>
                    {/* COLA-01: a 390 px la ficha deja ≈149 px; text-base cabe una cifra de diez dígitos. */}
                    <p className={cn('mt-1 font-mono text-base font-semibold tabular-nums sm:text-lg', TONO[tramo.edad])}>
                      {plataDeLaFranja(tramo.monto)}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {tramo.items.length} {tramo.items.length === 1 ? 'deuda' : 'deudas'}
                    </p>
                  </button>
                )
              })}
              {/* 🔴 El quinto tramo: la cartera que ya es reclamación. Sin él,
                  los tramos no sumaban la cartera y nadie sabía por qué. */}
              {siniestros ? (
                <button
                  type="button"
                  onClick={() => setVista('siniestros')}
                  aria-pressed={vista === 'siniestros'}
                  data-testid="tramo-siniestro"
                  className={cn(
                    'relative isolate min-w-[150px] flex-1 px-4 py-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                    vista === 'siniestros' ? '' : 'hover:bg-surface-muted',
                  )}
                >
                  {vista === 'siniestros' ? (
                    <MotionIndicator layoutId={`${marca}-tramo`} className="inset-0 -z-10 bg-primary-soft" />
                  ) : null}
                  <p className="text-xs text-fg-muted">{t('cartera.porEdad.tramoEnSiniestro')}</p>
                  <p className="mt-1 font-mono text-base font-semibold tabular-nums text-danger sm:text-lg">
                    {plataDeLaFranja(cartera.enSiniestro.monto)}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {t('cartera.porEdad.desdeLosDias', { dias: siniestros.diasParaSiniestro })}
                  </p>
                </button>
              ) : null}
            </div>
          </div>

          {(edad || cajon) && vista !== 'siniestros' ? (
            // Entra con un fundido; al cambiar de filtro, la frase nueva también.
            <Appear
              as="p"
              key={edad ?? cajon ?? ''}
              direction="none"
              className="border-b border-border px-4 py-2.5 text-sm text-fg-muted"
              data-testid="que-significa"
            >
              {edad ? QUE_SIGNIFICA[edad] : queSignificaElCajon(cajon!)}{' '}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-fg"
                onClick={() => {
                  setEdad(null)
                  setCajon(null)
                }}
              >
                Ver toda la deuda
              </button>
            </Appear>
          ) : null}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Ronda 11 (390): cada etiqueta en UN renglón; si no caben, el riel se
                desplaza de lado en vez de partirlas en dos. */}
            <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
              <SegmentedControl<Vista>
                size="sm"
                aria-label="Agrupar la cartera"
                value={vista}
                onChange={setVista}
                options={segmentos}
                className="w-max [&>button]:whitespace-nowrap"
              />
            </div>
            <div className="flex items-center gap-2">
              {propietario && vista === 'deudas' ? (
                <Appear
                  as="span"
                  key={propietario.id ?? 'sin-propietario'}
                  direction="none"
                  className="inline-flex"
                >
                <button
                  type="button"
                  onClick={() => setPropietario(null)}
                  className="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-fg hover:border-fg-subtle"
                  data-testid="chip-propietario"
                >
                  <span className="truncate">{propietario.nombre}</span>
                  <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">Quitar el filtro por propietario</span>
                </button>
                </Appear>
              ) : null}
              <div className="relative w-full sm:w-72">
                <MagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Inquilino, inmueble, propietario o contrato"
                  aria-label="Buscar en la cartera"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  data-testid="buscar-cartera"
                />
              </div>
            </div>
          </div>

          {vista === 'deudas' ? (
            <>
            <CarteraTable
              formato={plataDeLaFranja}
              marcadas={marcadas}
              onMarcar={marcar}
              items={pagDeudas.pageItems}
              clave={claveDelCuerpo}
              orden={orden}
              onOrdenar={setOrden}
              /* La fila lleva a donde lleva el botón: al cobro si existe, y si
                 no al contrato, que es de donde nace la deuda. */
              onVerCobro={(i) => router.push(aDondeLleva(i))}
              vacio={
                /* Dos vacíos distintos: no deber nada es una buena noticia; no
                   encontrar nada con un filtro puesto se arregla quitándolo. Lo
                   decide `hayFiltros`, que sale del estado real de los filtros
                   y no de que la lista haya quedado corta. */
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="cuotas"
                  icono={CurrencyCircleDollar}
                  titulo="Nadie te debe nada"
                  descripcion="Ningún contrato vigente tiene cuotas con saldo."
                  onLimpiarFiltros={hayFiltros ? limpiar : undefined}
                />
              }
            />
            {/* Acciones masivas: el pie de la MISMA tabla donde se marca. */}
            {deudas.length > 0 && (
              <CarteraMarcada
                marcadas={cuotasMarcadas}
                onQuitar={quitarLaSeleccion}
                puedeCompartir={permisosMasivos ? permisosMasivos.canAccess('cobros', 'view') : true}
                puedeRecordar={permisosMasivos ? permisosMasivos.canAccess('cobros', 'edit') : true}
              />
            )}
            </>
          ) : vista === 'propietarios' ? (
            <TablaPorPropietario
              formato={plataDeLaFranja}
              propietarios={pagPropietarios.pageItems}
              clave={claveDelCuerpo}
              onAbrir={abrirPropietario}
              vacio={
                <SinDatos
                  hayFiltros={hayFiltros}
                  queSon="propietarios con deuda"
                  icono={Users}
                  titulo="Nadie te debe nada"
                  descripcion="Ningún propietario tiene cuotas con saldo."
                  onLimpiarFiltros={hayFiltros ? limpiar : undefined}
                />
              }
            />
          ) : siniestros ? (
            <TablaDeSiniestros
              items={pagCasos.pageItems}
              clave={claveDelCuerpo}
              diasParaSiniestro={siniestros.diasParaSiniestro}
              hayFiltros={hayFiltros}
              onLimpiarFiltros={hayFiltros ? limpiar : undefined}
            />
          ) : null}

          {/* Pie: sólo si hay filas. */}
          {pag.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={pag.total}
                page={pag.page}
                pageSize={pag.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={pag.setPage}
                onPageSizeChange={pag.setPageSize}
              />
            </div>
          )}
        </section>
      </div>
    </EstadoDeDatos>
  )
}

/**
 * La cartera por propietario.
 *
 * Es la pregunta que la inmobiliaria hace de verdad: no «cuánto se debe», sino
 * «a quién le estoy quedando mal». Un propietario con cuatro inmuebles en
 * cartera se va — y eso no se ve en una lista ordenada por monto de cada
 * deuda. Tocar la fila abre SUS deudas en «Por deuda».
 */
function TablaPorPropietario({
  propietarios,
  onAbrir,
  vacio,
  clave,
  formato = formatCurrency,
}: {
  /** El formato de la plata de la página. */
  formato?: (n: number) => string
  propietarios: readonly DeudaDePropietario[]
  onAbrir: (p: DeudaDePropietario) => void
  vacio: React.ReactNode
  /** Filtros y página: al cambiar, el cuerpo entra de nuevo. */
  clave?: string
}) {
  const { t } = useI18n()
  const k = (x: string) => `cartera.porPropietario.${x}`
  return (
    <Table data-testid="propietarios-tabla">
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">{t(k('propietario'))}</TableHead>
          <TableHead className="whitespace-nowrap text-right">{t(k('deudas'))}</TableHead>
          <TableHead className="whitespace-nowrap text-right">{t(k('inmuebles'))}</TableHead>
          <TableHead className="whitespace-nowrap">{t(k('loPeor'))}</TableHead>
          <TableHead className="whitespace-nowrap text-right">{t(k('capital'))}</TableHead>
          {/* 🔴 El interés, APARTE del capital, con la misma lectura del back
              que el resto de la cartera. */}
          <TableHead className="whitespace-nowrap text-right" title={t(CLAVE_DE_MORA.explicacion)}>
            {t(k('intereses'))}
          </TableHead>
          <TableHead className="whitespace-nowrap text-right">{t(k('total'))}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBodyAnimado key={clave}>
        {propietarios.length === 0 ? (
          <TableRowAnimada key="vacio">
            <TableCell colSpan={COLUMNAS_POR_PROPIETARIO} className="p-0">
              {vacio}
            </TableCell>
          </TableRowAnimada>
        ) : (
          propietarios.map((p) => (
            <TableRowAnimada
              key={p.propietarioId ?? '__sin_propietario__'}
              onClick={() => onAbrir(p)}
              className="cursor-pointer"
              data-testid="propietario-fila"
            >
              <TableCell className={cn('font-medium', p.propietarioId ? 'text-fg' : 'text-warning')}>
                {p.propietarioName}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-fg-muted">{p.deudas}</TableCell>
              <TableCell className="text-right font-mono tabular-nums text-fg-muted">{p.inmuebles}</TableCell>
              <TableCell className="whitespace-nowrap">
                {/* «Lo peor» compara un cajón con una edad en la misma escala:
                    sin eso, una deuda futura y una de 95 días se verían igual. */}
                <span className={cn('text-sm', TONO[p.peor])}>{NOMBRE_DE_GRAVEDAD[p.peor]}</span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-fg">
                {formato(p.monto)}
              </TableCell>
              <TableCell
                className="text-right font-mono tabular-nums text-danger"
                data-testid="propietario-intereses"
              >
                {p.interes > 0 ? formato(p.interes) : <span className="text-fg-subtle">—</span>}
              </TableCell>
              <TableCell
                className="text-right font-mono font-medium tabular-nums text-fg"
                data-testid="propietario-total"
              >
                {formato(p.totalConInteres)}
              </TableCell>
            </TableRowAnimada>
          ))
        )}
      </TableBodyAnimado>
    </Table>
  )
}

export { EDADES }
