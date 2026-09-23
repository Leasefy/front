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

import { useMemo, useState } from 'react'
import Link from 'next/link'
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
import { SegmentedControl, type SegmentedOption } from '@leasefy/cadence'

import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DE_MORA,
  RUTA_DE_REGLAS_DE_MORA,
  faltanReglasDeMora,
  sumarIntereses,
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
  const [cajon, setCajon] = useState<Cajon | null>(null)
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
  const pagPropietarios = useTablePagination(propietarios, { resetKey: clave })
  const pagCasos = useTablePagination(casos, { resetKey: clave })
  const pag =
    vista === 'deudas' ? pagDeudas : vista === 'propietarios' ? pagPropietarios : pagCasos

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
        {/* ── UNA franja de resumen. Cada cifra es un filtro. ──────────── */}
        <div
          className={cn(
            'grid grid-cols-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface',
            'lg:divide-x lg:divide-y-0',
            castigada && siniestros
              ? 'lg:grid-cols-6'
              : castigada || siniestros
                ? 'lg:grid-cols-5'
                : 'lg:grid-cols-4',
          )}
          data-testid="resumen-de-cartera"
        >
          {/* La deuda entera. Tocarla quita los filtros: es «ver todo». */}
          <button
            type="button"
            onClick={limpiar}
            aria-pressed={cajon === null && edad === null}
            className="p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            data-testid="resumen-deuda-total"
          >
            <p className="text-xs text-fg-muted">Deuda total</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {formatCurrency(cartera.deudaTotal)}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {todas.length} {todas.length === 1 ? 'cuota' : 'cuotas'} · nace con el contrato
            </p>
            {interesTotal > 0 ? (
              <p
                className="mt-0.5 font-mono text-xs tabular-nums text-fg-muted"
                data-testid="resumen-deuda-con-intereses"
              >
                {t(CLAVE_DE_MORA.conIntereses, {
                  monto: formatCurrency(cartera.deudaTotal + interesTotal),
                })}
              </p>
            ) : null}
          </button>

          {/*
            🔴 Los tres cajones, en el orden en que una deuda los recorre: nace
            futura, vence, y recién después es cartera. Cada uno con su propia
            cifra: el que quiera el total lo tiene a la izquierda, ya sumado.
            Las mismas palabras que «Cartera por concepto».
          */}
          {(['POR_VENCER', 'VENCIDA_EN_PLAZO', 'CARTERA'] as const).map((cual) => {
            const suyo = montoDelCajon(cual)
            const activo = cajon === cual
            return (
              <button
                key={cual}
                type="button"
                onClick={() => elegirCajon(cual)}
                aria-pressed={activo}
                data-testid={`resumen-${cual.toLowerCase()}`}
                className={cn(
                  'p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                  activo ? 'bg-surface-muted' : 'hover:bg-surface-muted',
                )}
              >
                <p className="text-xs text-fg-muted">{NOMBRE_DEL_CAJON[cual]}</p>
                <p
                  className={cn(
                    'mt-1 font-mono text-2xl font-semibold tabular-nums',
                    cual === 'CARTERA' ? 'text-danger' : TONO[cual],
                  )}
                >
                  {formatCurrency(suyo.monto)}
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">{QUE_SIGNIFICA_EL_CAJON[cual]}</p>
                {/* 🔴 La cartera INCLUYE el siniestro, y lo dice: restarlo en
                    silencio es lo que hacía que esta cifra no fuera la de «Por
                    concepto». */}
                {cual === 'CARTERA' && cartera.enSiniestro.monto > 0 ? (
                  <p
                    className="mt-0.5 font-mono text-xs tabular-nums text-fg-muted"
                    data-testid="resumen-cartera-en-siniestro"
                  >
                    {t('cartera.porEdad.deLaCualEnSiniestro', {
                      monto: formatCurrency(cartera.enSiniestro.monto),
                    })}
                  </p>
                ) : null}
                {/* El interés corre SÓLO sobre la cartera: los otros dos cajones
                    no lo llevan, y un «+ $0» ahí sería ruido. */}
                {cual === 'CARTERA' && interesDeLaCartera > 0 ? (
                  <p
                    className="mt-0.5 font-mono text-xs tabular-nums text-danger"
                    data-testid="resumen-intereses-cartera"
                    title={t(CLAVE_DE_MORA.explicacion)}
                  >
                    {t(CLAVE_DE_MORA.masIntereses, { monto: formatCurrency(interesDeLaCartera) })}
                  </p>
                ) : null}
              </button>
            )
          })}

          {siniestros ? (
            /* La cifra abre el segmento: es el mismo dato, visto de cerca. */
            <button
              type="button"
              onClick={() => setVista('siniestros')}
              className="p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              data-testid="resumen-en-siniestro"
            >
              <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                <ShieldWarning className="h-3.5 w-3.5" aria-hidden="true" />
                En siniestro
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-danger">
                {formatCurrency(siniestros.totalCop)}
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {siniestros.cantidad === 0
                  ? 'Ningún caso'
                  : `${siniestros.cantidad} ${siniestros.cantidad === 1 ? 'caso' : 'casos'}`}
                {' · '}a los {siniestros.diasParaSiniestro} días de mora
              </p>
              {interesEnSiniestro > 0 ? (
                <p className="mt-0.5 font-mono text-xs tabular-nums text-danger">
                  {t(CLAVE_DE_MORA.masIntereses, { monto: formatCurrency(interesEnSiniestro) })}
                </p>
              ) : null}
            </button>
          ) : null}

          {castigada ? (
            /*
             * Enlace y no botón: lo castigado vive en otra pantalla porque el
             * pedido es que SALGA de la cartera activa. Filtrar acá la
             * volvería a poner en la lista de a quién llamar.
             */
            <Link
              href="/panel/inmobiliaria/pagos/cartera/castigada"
              className="block p-4 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              data-testid="resumen-castigada"
            >
              <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Scales className="h-3.5 w-3.5" aria-hidden="true" />
                Castigada
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg-muted">
                {formatCurrency(castigada.totalCop)}
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {castigada.cantidad === 0
                  ? 'Ninguna'
                  : `${castigada.cantidad} ${castigada.cantidad === 1 ? 'cuota' : 'cuotas'}`}
                {' · '}ya no se persigue
              </p>
            </Link>
          ) : null}
        </div>

        {/*
          🔴 Lo que estos números NO cuentan. Un contrato vigente sin tabla de
          amortización no es un contrato sin deuda: es una deuda que todavía
          nadie generó. Callarlo deja la franja mintiendo por omisión.
        */}
        {avisos.length > 0 && (
          <div
            className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
            data-testid="avisos-de-la-cartera"
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
              {sinReglasDeMora ? (
                <Link
                  href={RUTA_DE_REGLAS_DE_MORA}
                  className="inline-block font-medium underline underline-offset-4"
                  data-testid="cartera-configurar-reglas"
                >
                  {t(CLAVE_DE_MORA.configurarReglas)}
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {/* ── La edad DE LA CARTERA. Cada ficha es un filtro. ──────────── */}
        <div>
          <p className="mb-2 text-xs text-fg-muted">{t('cartera.porEdad.edadDeLaCartera')}</p>
          {/*
            🔴 21-09-2026, abriendo esta pantalla con la agencia migrada:
            «31 a 60», «61 a 90» y «Más de 90 días» salían en $0 con 788 casos
            de 259 días de mora al lado. No es un error de la cuenta: con el
            siniestro a los 30 días, TODA la cartera de más de 30 días sale de
            los tramos y se va a «En siniestro», así que esos tres tramos no
            pueden llenarse nunca. Tres ceros permanentes sin explicación se
            leen como «no hay mora vieja», que es lo contrario de la verdad.
          */}
          {tramosQueNoSeLlenan.length > 0 ? (
            <p className="mb-2 text-xs text-fg-muted" data-testid="tramos-que-no-se-llenan">
              Con el siniestro a los {siniestros!.diasParaSiniestro} días, la cartera viva
              no llega a {tramosQueNoSeLlenan.map((e) => NOMBRE_DE_EDAD[e]).join(', ')}:
              esa mora está en «En siniestro».
            </p>
          ) : null}
          <div
            className={cn('grid grid-cols-2 gap-3', siniestros ? 'lg:grid-cols-5' : 'lg:grid-cols-4')}
            role="group"
            aria-label="Edad de la cartera"
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
                    'rounded-lg border bg-surface p-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    activa
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border hover:border-fg-subtle',
                  )}
                >
                  <p className="text-xs text-fg-muted">{NOMBRE_DE_EDAD[tramo.edad]}</p>
                  <p className={cn('mt-1 font-mono text-lg font-semibold tabular-nums', TONO[tramo.edad])}>
                    {formatCurrency(tramo.monto)}
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
                  'rounded-lg border bg-surface p-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  vista === 'siniestros'
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:border-fg-subtle',
                )}
              >
                <p className="text-xs text-fg-muted">{t('cartera.porEdad.tramoEnSiniestro')}</p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-danger">
                  {formatCurrency(cartera.enSiniestro.monto)}
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  {t('cartera.porEdad.desdeLosDias', { dias: siniestros.diasParaSiniestro })}
                </p>
              </button>
            ) : null}
          </div>
        </div>

        {(edad || cajon) && vista !== 'siniestros' ? (
          <p className="text-sm text-fg-muted" data-testid="que-significa">
            {edad ? QUE_SIGNIFICA[edad] : QUE_SIGNIFICA_EL_CAJON[cajon!]}{' '}
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
          </p>
        ) : null}

        {/* ── LA tabla, sin título encima: no se nombran las tablas. ───── */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl<Vista>
              size="sm"
              aria-label="Agrupar la cartera"
              value={vista}
              onChange={setVista}
              options={segmentos}
            />
            <div className="flex items-center gap-2">
              {propietario && vista === 'deudas' ? (
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
            <CarteraTable
              items={pagDeudas.pageItems}
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
          ) : vista === 'propietarios' ? (
            <TablaPorPropietario
              propietarios={pagPropietarios.pageItems}
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
}: {
  propietarios: readonly DeudaDePropietario[]
  onAbrir: (p: DeudaDePropietario) => void
  vacio: React.ReactNode
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
      <TableBody>
        {propietarios.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMNAS_POR_PROPIETARIO} className="p-0">
              {vacio}
            </TableCell>
          </TableRow>
        ) : (
          propietarios.map((p) => (
            <TableRow
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
                {formatCurrency(p.monto)}
              </TableCell>
              <TableCell
                className="text-right font-mono tabular-nums text-danger"
                data-testid="propietario-intereses"
              >
                {p.interes > 0 ? formatCurrency(p.interes) : <span className="text-fg-subtle">—</span>}
              </TableCell>
              <TableCell
                className="text-right font-mono font-medium tabular-nums text-fg"
                data-testid="propietario-total"
              >
                {formatCurrency(p.totalConInteres)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

export { EDADES }
