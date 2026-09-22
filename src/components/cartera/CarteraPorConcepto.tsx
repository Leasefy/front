'use client'

/**
 * La cartera de los inquilinos, por mes y por concepto.
 *
 * ── El pedido, textual (Nico, 2026-09-12) ───────────────────────────────────
 *
 * «Nicolás debe 3 meses; esos meses ya generaron intereses y gasto
 * administrativo según la regla de cobro. Quiero ver cuánto debe POR MES,
 * cuánto EN TOTAL, y dividido por CONCEPTO: canon, intereses, gasto
 * administrativo.»
 *
 * Por eso la tabla tiene dos niveles y no dos tablas: la fila del inquilino es
 * el TOTAL (por concepto), y al abrirla aparecen sus MESES (por concepto). Los
 * tres números que pidió están en la misma línea de lectura, uno debajo del
 * otro, sin cambiar de pantalla.
 *
 * ── Qué dicen las columnas ──────────────────────────────────────────────────
 *
 * Lo que se DEBE, no lo facturado: un abono ya imputado (intereses primero,
 * después el capital — art. 1653 C. C.) baja la columna que pagó. Lo facturado
 * y lo abonado van aparte, a la derecha, para que el número grande no se
 * confunda con «lo que se le cobró».
 *
 * Las columnas son «las que existan» (Nico): el back manda sólo los conceptos
 * que aparecen en alguna fila. Una inmobiliaria sin gasto administrativo no ve
 * una columna vacía.
 *
 * ── 🔴 Los TRES números que no se pueden mezclar (Nico, 2026-09-15) ─────────
 *
 * «Desde que él comience el contrato ya debe. Otra cosa es que se tarde en
 * pagar sobre los días máximos de mora, y ahí ya es **cartera** como tal, y
 * entra el agente de cobranza.»
 *
 * De ahí salen tres cifras distintas, que la franja muestra por separado y que
 * NINGUNA pantalla puede volver a sumar en una sola:
 *
 *   · **Por vencer** — deuda del contrato que todavía no vence. Medido en dev
 *     el 15-09: $7.739,6 M.
 *   · **Vencido, en plazo** — venció, pero los días de plazo del contrato
 *     siguen corriendo. Es deuda, NO es cartera: no le corre interés y la
 *     cobranza no la toca. $92,1 M.
 *   · **Cartera** — pasó el vencimiento MÁS el plazo. Es lo único que la
 *     cobranza puede perseguir. $615,1 M.
 *
 * Un solo «total pendiente» de $8.447 M haría salir a la cobranza a perseguir
 * plata que nadie debe todavía, con la Ley 2300 de por medio.
 *
 * ── Lo que la pantalla se niega a hacer ─────────────────────────────────────
 *
 * 1. **Cuadrar a la fuerza.** Si las columnas no suman el saldo, la diferencia
 *    se muestra en «Sin desglose» y la fila se marca. En la agencia de QA hay
 *    un cobro con la línea de interés escrita dos veces (3.202 + 3.202 contra
 *    un `lateFee` de 3.202): la cartera tiene que delatarlo, no promediarlo.
 * 2. **Sumar lo que no vence a la cartera.** Plata que va a entrar no es plata
 *    que hay que ir a buscar; van en cifras distintas de la franja.
 * 3. **Pintar un error como una cartera vacía.** «Nadie te debe nada» y «no
 *    pudimos preguntar» se ven idénticos si se muestra la misma pantalla.
 * 4. **Cambiar el pie cuando hay filtro.** El pie suma LO QUE SE VE; la franja
 *    de arriba habla de toda la cartera. Si el pie repitiera el total general
 *    dejaría de corresponder a las filas de encima.
 * 5. **Callar lo que el número NO cuenta.** Hay contratos vigentes sin tabla de
 *    amortización (195 en dev): su deuda no está en estas cifras, y un cero por
 *    omisión es exactamente el defecto que este cambio vino a arreglar.
 *
 * ── 🔴 El interés de mora, en su columna (2026-09-16) ───────────────────────
 *
 * Los conceptos de la cuota son lo PACTADO: canon, administración, impuestos.
 * El interés de mora no está en la cuota —es una lectura del día— y por eso no
 * salía en ninguna columna, mientras la prefactura sí lo cobraba. Ahora va en
 * «Intereses», liquidado por el back con la misma regla que la prefactura y el
 * estado de cuenta, y «Debe» (capital) dice debajo cuánto es con intereses.
 * Una cuota pagada en mora aparece con capital en cero y su interés.
 *
 * ── 🔴 De cada fila se sale al ESTADO DE CUENTA (Nico, 2026-09-16) ──────────
 *
 * «Todo funciona alrededor del estado de cuenta del contrato.» La pantalla del
 * estado de cuenta existía desde el 13-09 y sólo se llegaba a ella desde las
 * fichas (contrato, propietario, inquilino); ninguna pantalla de Pagos llevaba
 * a ella. Una fila de cartera ES un pedazo del estado de cuenta de alguien, así
 * que desde acá se abre el documento completo del cliente.
 *
 * Con quién se abre sale de la `clave` con la que el back agrupó al inquilino
 * (`refDesdeLaClave`). Los agrupados por CONTRATO —sin cuenta y sin documento—
 * no tienen con qué identificarse y no llevan enlace.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CaretDown,
  CaretRight,
  CurrencyCircleDollar,
  DotsThreeVertical,
  MagnifyingGlass,
  Warning,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { useCarteraDeInquilinos } from '@/lib/hooks/use-cartera'
import { refDesdeLaClave } from '@/lib/estado-de-cuenta/con-quien-se-abre'
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'
import type {
  FilaDeCarteraDelInquilino,
  InquilinoEnCartera,
  PorConcepto,
  TipoDeConcepto,
  TotalesDeCartera,
} from '@/lib/api/cartera.types'
import {
  NOMBRE_DEL_CONCEPTO,
  cuadra,
  filtrarInquilinos,
  type CajonDeLaCartera,
  rotuloDelContrato,
  saldoDe,
  sumarTotales,
} from '@/lib/cartera/conceptos'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  RUTA_DE_REGLAS_DE_MORA,
  CLAVE_DE_MORA,
  faltanReglasDeMora,
  interesDe,
  sumarIntereses,
} from '@/components/cartera/interes-de-mora'
import { InquilinoEnCarteraCajon } from './InquilinoEnCarteraCajon'

/**
 * La columna del saldo queda PEGADA al borde derecho.
 *
 * Con cinco o seis conceptos la tabla mide más que el ancho útil del panel y
 * scrollea; medido en el navegador con los datos de QA, «Debe» —el número por
 * el que se abre la pantalla— quedaba fuera de la vista. Pegada, el desglose
 * se recorre y la respuesta nunca se va. Necesita fondo OPACO propio: si no,
 * las columnas pasan por debajo y se leen encima.
 */
const FIJA = 'sticky right-0 z-10 border-l border-border';

/** Un cero no se escribe `$0` en cada celda: la tabla se vuelve ilegible. */
function Peso({ valor, className }: { valor: number; className?: string }) {
  if (valor === 0) {
    return (
      <span className="text-fg-subtle" aria-label="cero">
        —
      </span>
    )
  }
  return (
    <span className={cn('font-mono tabular-nums', valor < 0 && 'text-fg-muted', className)}>
      {formatCurrency(valor)}
    </span>
  )
}

/**
 * Lo abonado, debajo del saldo y no en columna propia.
 *
 * Es el mismo criterio de `CarteraTable`: un dato que explica a otro viaja
 * dentro de su celda. Con once conceptos posibles, cada columna que se ahorra
 * es una que no obliga a scrollear horizontalmente para llegar a lo que la
 * pantalla vino a responder. Lo facturado del total está en la franja.
 */
function Abono({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return (
    <span className="mt-0.5 block text-xs font-normal text-fg-muted">
      abonó <span className="font-mono tabular-nums">{formatCurrency(valor)}</span>
    </span>
  )
}

/** El interés de la fila o del total. Sin mora, un guion; sin reglas, se dice. */
function Interes({ valor, sinReglas, pagadaEnMora }: {
  valor: number
  sinReglas?: boolean
  pagadaEnMora?: boolean
}) {
  const { t } = useI18n()
  if (valor > 0) {
    return (
      <>
        <span className="font-mono tabular-nums text-danger">{formatCurrency(valor)}</span>
        {pagadaEnMora ? (
          <span className="mt-0.5 block text-xs font-normal text-fg-muted">
            {t(CLAVE_DE_MORA.pagadaEnMora)}
          </span>
        ) : null}
      </>
    )
  }
  if (sinReglas) {
    return <span className="whitespace-nowrap text-xs text-warning">{t(CLAVE_DE_MORA.sinReglas)}</span>
  }
  return (
    <span className="text-fg-subtle" aria-label="cero">
      —
    </span>
  )
}

/** «$X con intereses», debajo del capital, sólo si hay intereses. */
function ConIntereses({ capital, interes }: { capital: number; interes: number }) {
  const { t } = useI18n()
  if (interes <= 0) return null
  return (
    <span className="mt-0.5 block text-xs font-normal text-fg-muted">
      {t(CLAVE_DE_MORA.conIntereses, { monto: formatCurrency(capital + interes) })}
    </span>
  )
}

export function CarteraPorConcepto() {
  const { t } = useI18n()
  const { datos, cargando, error, recargar } = useCarteraDeInquilinos()
  const [busqueda, setBusqueda] = useState('')
  /**
   * Qué momento de la deuda se está mirando. Era el interruptor «Sólo cartera»,
   * que sólo podía expresar dos estados de cuatro (Nico, 21-09).
   */
  const [cajon, setCajon] = useState<CajonDeLaCartera>('TODAS')
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())
  /** El deudor abierto en el cajón. `null` = cerrado. */
  const [enElCajon, setEnElCajon] = useState<InquilinoEnCartera | null>(null)

  const conceptos = useMemo<TipoDeConcepto[]>(() => datos?.conceptos ?? [], [datos])
  const inquilinos = useMemo(
    () => filtrarInquilinos(datos?.inquilinos ?? [], busqueda, cajon),
    [datos, busqueda, cajon],
  )
  const totalesDeLoVisible = useMemo(() => sumarTotales(inquilinos), [inquilinos])
  /* El interés de lo visible, de las MISMAS filas que el pie. */
  const interesDeLoVisible = useMemo(
    () => sumarIntereses(inquilinos.flatMap((i) => i.filas)),
    [inquilinos],
  )
  const interesTotal = (datos?.totales as { interesCop?: number } | undefined)?.interesCop ?? 0
  const sinReglasDeMora =
    (datos as { sinReglasDeMora?: boolean } | undefined)?.sinReglasDeMora === true ||
    faltanReglasDeMora((datos?.inquilinos ?? []).flatMap((i) => i.filas))

  const hayFiltros = busqueda.trim().length > 0 || cajon !== 'TODAS'
  const paginado = useTablePagination(inquilinos, {
    resetKey: `${busqueda}|${cajon}`,
  })

  // La columna sólo existe si alguien la necesita: es la diferencia que no
  // cuadra, y en una cartera sana no hay ninguna.
  const haySinDesglose = (datos?.totales.sinDesgloseCop ?? 0) !== 0

  /* `cobros` quedó como alias deprecado del back: la unidad es la CUOTA. */
  const cuotas = datos?.totales.cuotas ?? datos?.totales.cobros ?? 0
  const avisos = datos?.avisos ?? []

  const alternar = (clave: string) =>
    setAbiertos((previos) => {
      const siguiente = new Set(previos)
      if (siguiente.has(clave)) siguiente.delete(clave)
      else siguiente.add(clave)
      return siguiente
    })

  const limpiar = () => {
    setBusqueda('')
    setCajon('TODAS')
  }

  /** Inquilino + conceptos + (sin desglose) + «Intereses» + «Debe» + kebab. */
  const columnas = conceptos.length + (haySinDesglose ? 5 : 4)

  return (
    <EstadoDeDatos
      cargando={cargando && !datos}
      error={error}
      queEs="la cartera por concepto"
      onReintentar={recargar}
      esqueleto={
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <div className="space-y-6">
        {/* ── 🔴 EL RESUMEN ES UNA FRASE (21-09) ────────────────────────────
              Nico: «hay filtros arriba que no se sabe a qué le aplican… hay más
              vómito ahí también». Eran cuatro tarjetas de sólo lectura con el
              mismo peso visual que todo lo demás, y el filtro era un
              interruptor aparte a 300 px. Ahora la frase dice el total y la
              relación, y los tres momentos son las PESTAÑAS que filtran la
              tabla — el número ES el filtro. Mismo patrón que «Deuda del mes».
        */}
        <p
          className="rounded-lg border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-fg-muted"
          data-testid="resumen-por-concepto"
        >
          Te deben{' '}
          <span
            className="font-mono font-semibold tabular-nums text-fg"
            data-testid="total-deuda"
          >
            {formatCurrency(datos?.totales.saldoCop ?? 0)}
          </span>{' '}
          en {cuotas} {cuotas === 1 ? 'cuota' : 'cuotas'} de{' '}
          {datos?.inquilinos.length ?? 0}{' '}
          {datos?.inquilinos.length === 1 ? 'inquilino' : 'inquilinos'}
          {interesTotal > 0 ? (
            <span data-testid="total-deuda-con-intereses">
              {' ('}
              {t(CLAVE_DE_MORA.conIntereses, {
                monto: formatCurrency((datos?.totales.saldoCop ?? 0) + interesTotal),
              })}
              {')'}
            </span>
          ) : null}
          . De lo pactado ({formatCurrency(datos?.totales.facturadoCop ?? 0)}) ya
          abonaron {formatCurrency(datos?.totales.abonadoCop ?? 0)}.
        </p>

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
              {sinReglasDeMora ? (
                <Link
                  href={RUTA_DE_REGLAS_DE_MORA}
                  className="inline-block font-medium underline underline-offset-4"
                  data-testid="por-concepto-configurar-reglas"
                >
                  {t(CLAVE_DE_MORA.configurarReglas)}
                </Link>
              ) : null}
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          {/* 🔴 Las pestañas, DENTRO de la tarjeta de la tabla que gobiernan, y
              con «Ver en la tabla» adelante: un control que cambia una lista
              tiene que nombrar la lista. En el orden en que una deuda los
              recorre —nace futura, vence, y recién después es cartera— y con
              las palabras de «Deuda del mes», que es el mismo hecho. */}
          <div
            role="tablist"
            aria-label="Qué deuda ver en la tabla"
            data-testid="cajones-de-la-cartera"
            data-lenis-prevent
            className="flex items-stretch divide-x divide-border overflow-x-auto border-b border-border bg-surface-muted/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <span className="flex shrink-0 items-center whitespace-nowrap px-4 text-caption uppercase tracking-wide text-fg-subtle">
              Ver en la tabla
            </span>
            <PestanaDeLaCartera
              label="Toda la deuda"
              monto={datos?.totales.saldoCop ?? 0}
              detalle="Los tres momentos juntos."
              activa={cajon === 'TODAS'}
              testId="cajon-todas"
              onClick={() => setCajon('TODAS')}
            />
            <PestanaDeLaCartera
              label="Por vencer"
              monto={datos?.totales.porVencerCop ?? 0}
              detalle="Todavía no vence. Es deuda, no cartera."
              tono="muted"
              activa={cajon === 'POR_VENCER'}
              testId="cajon-por-vencer"
              onClick={() => setCajon('POR_VENCER')}
            />
            <PestanaDeLaCartera
              label="Vencido, en plazo"
              monto={datos?.totales.vencidaEnPlazoCop ?? 0}
              detalle="Venció, pero el plazo del contrato sigue corriendo."
              tono="warning"
              activa={cajon === 'VENCIDA_EN_PLAZO'}
              testId="cajon-vencido-en-plazo"
              onClick={() => setCajon('VENCIDA_EN_PLAZO')}
            />
            <PestanaDeLaCartera
              label="Cartera"
              monto={datos?.totales.enMoraCop ?? 0}
              detalle="Pasó el plazo. Es lo único que la cobranza persigue."
              tono="danger"
              activa={cajon === 'CARTERA'}
              testId="cajon-cartera"
              onClick={() => setCajon('CARTERA')}
              extra={
                interesTotal > 0 ? (
                  <span
                    className="font-mono text-caption tabular-nums text-danger"
                    data-testid="total-intereses"
                    title={t(CLAVE_DE_MORA.explicacion)}
                  >
                    {t(CLAVE_DE_MORA.masIntereses, {
                      monto: formatCurrency(interesTotal),
                    })}
                  </span>
                ) : null
              }
            />
          </div>

          {/* Qué es el cajón elegido, en una línea, pegado a la tabla que se
              mira. Eran las cuatro frases debajo de cada tarjeta. */}
          <p
            className="border-b border-border px-4 py-2 text-xs text-fg-muted"
            data-testid="que-es-este-cajon"
          >
            {QUE_ES_ESTE_CAJON[cajon]}
          </p>

          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Inquilino, documento, contrato o inmueble"
                aria-label="Buscar en la cartera"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="buscar-por-concepto"
              />
            </div>
          </div>

          <Table data-testid="tabla-por-concepto">
            <TableHeader>
              <TableRow>
                {/* 🔴 Ancho mínimo para el nombre. Sin esto la tabla reparte el
                    ancho entre nueve columnas y «Fabián Correa Gallego» se
                    parte en tres renglones, que es exactamente el amontonamiento
                    que Nico señaló. */}
                <TableHead className="min-w-[14rem] whitespace-nowrap">Inquilino</TableHead>
                {conceptos.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap text-right">
                    {NOMBRE_DEL_CONCEPTO[c]}
                  </TableHead>
                ))}
                {haySinDesglose ? (
                  <TableHead className="whitespace-nowrap text-right">Sin desglose</TableHead>
                ) : null}
                <TableHead className="whitespace-nowrap text-right" title={t(CLAVE_DE_MORA.explicacion)}>
                  {t(CLAVE_DE_MORA.columnaMoraLiquidadaHoy)}
                </TableHead>
                <TableHead className={cn('whitespace-nowrap text-right', FIJA, 'bg-bg dark:bg-surface-muted')}>
                  Debe
                </TableHead>
                {/* La del kebab. Sin rótulo: «Acciones» gasta ancho para decir
                    lo que el icono ya dice. */}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginado.pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnas} className="p-0">
                    <SinDatos
                      hayFiltros={hayFiltros}
                      queSon="inquilinos con deuda"
                      icono={CurrencyCircleDollar}
                      titulo="Nadie te debe nada"
                      descripcion="Ningún contrato tiene cuotas pendientes: ni vencidas, ni dentro del plazo, ni por vencer."
                      onLimpiarFiltros={hayFiltros ? limpiar : undefined}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginado.pageItems.map((inquilino) => (
                  <FilasDelInquilino
                    key={inquilino.clave}
                    inquilino={inquilino}
                    conceptos={conceptos}
                    haySinDesglose={haySinDesglose}
                    abierto={abiertos.has(inquilino.clave)}
                    onAlternar={() => alternar(inquilino.clave)}
                    onAbrirDetalle={() => setEnElCajon(inquilino)}
                  />
                ))
              )}
            </TableBody>
            {paginado.pageItems.length > 0 ? (
              <TableFooter>
                <TotalesEnPie
                  totales={totalesDeLoVisible}
                  interes={interesDeLoVisible}
                  conceptos={conceptos}
                  haySinDesglose={haySinDesglose}
                  /* 🔴 Sin filtros el pie suma TODA la deuda —por vencer y en
                     plazo incluidos—, no la cartera: llamarlo «Total de la
                     cartera» ponía $5.318 M debajo de la cifra «Cartera» de
                     $2.996 M, dos números con el mismo nombre. */
                  etiqueta={hayFiltros ? 'Total de lo filtrado' : 'Total de la deuda'}
                />
              </TableFooter>
            ) : null}
          </Table>

          {paginado.shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={paginado.total}
                page={paginado.page}
                pageSize={paginado.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={paginado.setPage}
                onPageSizeChange={paginado.setPageSize}
              />
            </div>
          )}
        </section>

        {datos ? (
          <p className="text-xs text-fg-muted">
            La deuda sale de las cuotas del contrato, no de los cobros emitidos: existe desde que
            se firma. Los conceptos salen de las líneas de cada cuota, y lo que se abona se imputa
            primero a los intereses y después al capital. Leído contra el {datos.hoy}.
          </p>
        ) : null}

        {/* Todo lo que se sabe del deudor, sin salir de la lista. Lee el MISMO
            objeto que la tabla: no puede contradecirla. */}
        <InquilinoEnCarteraCajon
          inquilino={enElCajon}
          conceptos={conceptos}
          onCerrar={() => setEnElCajon(null)}
          volverA={VOLVER_A}
        />
      </div>
    </EstadoDeDatos>
  )
}

/**
 * Qué es cada cajón, en una línea. Las palabras son las de «Deuda del mes»
 * (`DeudaDelMesPanel`), no unas nuevas: el mismo hecho tiene que llamarse igual
 * en las dos pantallas, o la inmobiliaria aprende dos vocabularios.
 */
const QUE_ES_ESTE_CAJON: Record<CajonDeLaCartera, string> = {
  TODAS:
    'Toda la deuda de los inquilinos, en los tres momentos por los que pasa: por vencer, vencida dentro del plazo, y cartera.',
  POR_VENCER:
    'Deuda que todavía no vence. Es deuda, no cartera: no le corre interés y la cobranza no la toca.',
  VENCIDA_EN_PLAZO:
    'Venció, pero los días de plazo del contrato siguen corriendo. Tampoco es cartera, y llamar a alguien acá es llamarlo por usar el plazo que la inmobiliaria misma le dio.',
  CARTERA:
    'Pasó el vencimiento MÁS el plazo del contrato. Es lo único que la cobranza puede perseguir, y lo único que genera interés de mora.',
}

/**
 * Una pestaña de cajón: el número ES el filtro.
 *
 * Eran cuatro tarjetas de sólo lectura arriba y un interruptor de dos estados
 * abajo — el número y la forma de ver ese número, dos controles distintos a 300
 * px de distancia (Nico, 21-09). Es la misma pieza que `PestanaDeCajon` en
 * «Deuda del mes»; vive duplicada a propósito por ahora, porque las dos
 * pantallas tienen columnas y tonos distintos y unificarlas antes de que el
 * patrón esté aprobado es adivinar.
 */
function PestanaDeLaCartera({
  label,
  monto,
  detalle,
  activa,
  tono,
  testId,
  onClick,
  extra,
}: {
  label: string
  monto: number
  /** Va al `title`: qué queda en la tabla al tocarla. */
  detalle: string
  activa: boolean
  tono?: 'warning' | 'danger' | 'muted'
  testId: string
  onClick: () => void
  extra?: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      title={detalle}
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
      >
        {formatCurrency(monto)}
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

/** La fila del inquilino (su total) y, si está abierta, la de cada mes. */
const VOLVER_A = '/panel/inmobiliaria/pagos/cartera/conceptos'

/**
 * A dónde lleva el estado de cuenta del inquilino, cuando se le puede
 * identificar. Los agrupados por CONTRATO —sin cuenta y sin documento— no
 * tienen con qué, y entonces la acción no se ofrece: un enlace que da 404
 * enseña que la pantalla no sirve.
 */
function hrefDelEstadoDeCuenta(clave: string): string | null {
  const ref = refDesdeLaClave(clave)
  if (!ref) return null
  return `${rutaDelEstadoDeCuenta('inquilino', ref)}?volver=${encodeURIComponent(VOLVER_A)}`
}

function FilasDelInquilino({
  inquilino,
  conceptos,
  haySinDesglose,
  abierto,
  onAlternar,
  onAbrirDetalle,
}: {
  inquilino: InquilinoEnCartera
  conceptos: readonly TipoDeConcepto[]
  haySinDesglose: boolean
  abierto: boolean
  onAlternar: () => void
  onAbrirDetalle: () => void
}) {
  const Caret = abierto ? CaretDown : CaretRight
  const interesDelInquilino = sumarIntereses(inquilino.filas)
  const href = hrefDelEstadoDeCuenta(inquilino.clave)
  return (
    <>
      {/* `group`: la celda fija tiene fondo propio y si no, no se entera del
          hover de su fila y queda un rectángulo blanco al pasar el mouse.

          🔴 TRES blancos con tres trabajos (Nico, 21-09): el caret despliega
          los meses ahí mismo, el resto de la fila abre el cajón con todo, y el
          kebab son las acciones. El caret corta la propagación para que abrir
          los meses no abra además el cajón. */}
      <TableRow
        className="group cursor-pointer"
        data-testid="fila-inquilino"
        onClick={onAbrirDetalle}
        tabIndex={0}
        role="button"
        aria-label={`Ver todo lo que debe ${inquilino.nombre ?? 'este inquilino'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onAbrirDetalle()
          }
        }}
      >
        <TableCell>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAlternar()
            }}
            aria-expanded={abierto}
            aria-label={`Ver los meses de ${inquilino.nombre ?? 'este inquilino'} en la tabla`}
            className="flex items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Caret className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <span>
              <span className="block font-medium text-fg">
                {inquilino.nombre ?? 'Sin nombre en el contrato'}
              </span>
              <span className="block text-xs text-fg-muted">
                {inquilino.documento ? `CC ${inquilino.documento} · ` : ''}
                {inquilino.filas.length} {inquilino.filas.length === 1 ? 'mes' : 'meses'}
                {inquilino.contratos.length > 1
                  ? ` · ${inquilino.contratos.length} contratos`
                  : inquilino.contratos[0]?.contrato
                    ? rotuloDelContrato(inquilino.contratos[0])
                    : ''}
              </span>
              {/* 🔴 «En jurídico» se ve en la cartera (17-09-2026): quién lo
                  lleva, para que nadie le escriba por otro lado. */}
              {inquilino.contratos.some((c) => c.enJuridico) && (
                <span
                  className="mt-1 inline-block rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-xs text-fg"
                  data-testid="en-juridico"
                >
                  En jurídico ·{' '}
                  {inquilino.contratos.find((c) => c.enJuridico)?.enJuridico?.abogado}
                </span>
              )}
            </span>
          </button>
        </TableCell>
        <CeldasDeConceptos
          porConcepto={inquilino.totales.saldoPorConcepto}
          conceptos={conceptos}
          fuerte
        />
        {haySinDesglose ? (
          <TableCell className="text-right">
            <Peso valor={inquilino.totales.sinDesgloseCop} />
          </TableCell>
        ) : null}
        <TableCell className="text-right" data-testid="intereses-del-inquilino">
          <Interes
            valor={interesDelInquilino}
            sinReglas={inquilino.filas.some((f) => interesDe(f)?.sinReglas)}
          />
        </TableCell>
        <TableCell
          className={cn(
            'bg-surface text-right font-medium text-fg group-hover:bg-surface-muted',
            FIJA,
          )}
        >
          <Peso valor={inquilino.totales.saldoCop} />
          <Abono valor={inquilino.totales.abonadoCop} />
          <ConIntereses capital={inquilino.totales.saldoCop} interes={interesDelInquilino} />
        </TableCell>

        {/* 🔴 El kebab (Nico, 21-09: «¿por qué no usas al lado derecho el kebab
            menu para agregar acciones?»). Era un enlace azul suelto debajo del
            nombre, y ahí la segunda acción no tiene dónde ponerse.
            `stopPropagation` en la celda: sin eso, abrir el menú abre también el
            cajón y el menú queda detrás. */}
        <TableCell className="w-10 align-top" onClick={(e) => e.stopPropagation()}>
          <DropdownList>
            <DropdownListTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                hideArrow
                className="h-8 w-8"
                aria-label={`Acciones de ${inquilino.nombre ?? 'este inquilino'}`}
                data-testid="inquilino-kebab"
              >
                <DotsThreeVertical className="h-4 w-4" weight="bold" aria-hidden="true" />
              </Button>
            </DropdownListTrigger>
            <DropdownListContent align="end" className="w-56">
              <DropdownListItem onClick={onAbrirDetalle}>
                Ver todo lo que debe
              </DropdownListItem>
              <DropdownListItem onClick={onAlternar}>
                {abierto ? 'Cerrar sus meses' : 'Ver sus meses acá'}
              </DropdownListItem>
              {href ? (
                <DropdownListItem asChild>
                  <Link href={href} data-testid="inquilino-estado-de-cuenta">
                    Estado de cuenta del cliente
                  </Link>
                </DropdownListItem>
              ) : null}
            </DropdownListContent>
          </DropdownList>
        </TableCell>
      </TableRow>

      {/*
        🔴 `key={fila.cuotaId}`, NO `cobroId`. Desde que la cartera se lee de
        `contrato_cuotas`, `cobroId` viene en `null` en TODA fila migrada: como
        llave de React eso son claves duplicadas, y React reusa la fila
        equivocada en silencio al abrir y cerrar inquilinos.
      */}
      {abierto
        ? inquilino.filas.map((fila) => (
            <FilaDelMes
              key={fila.cuotaId}
              fila={fila}
              conceptos={conceptos}
              haySinDesglose={haySinDesglose}
            />
          ))
        : null}
    </>
  )
}

function FilaDelMes({
  fila,
  conceptos,
  haySinDesglose,
}: {
  fila: FilaDeCarteraDelInquilino
  conceptos: readonly TipoDeConcepto[]
  haySinDesglose: boolean
}) {
  const { t } = useI18n()
  return (
    <TableRow className="bg-surface-muted" data-testid="fila-mes">
      <TableCell className="pl-10">
        <span className="block text-sm text-fg">{mesEnTitulo(fila.month)}</span>
        <span className="block text-xs text-fg-muted">
          {fila.inmueble}
          {fila.contrato ? rotuloDelContrato(fila) : ''}
        </span>
        {/*
          🔴 Los tres cajones, dichos con palabras distintas. «Vencida dentro
          del plazo» no es mora: no le corre interés y la cobranza no la toca.
          Pintar las dos igual es cómo se termina llamando a alguien que está
          usando el plazo que la inmobiliaria misma le dio.
        */}
        <span className="mt-0.5 block text-xs">
          {interesDe(fila)?.pagadaEnMora ? (
            <span className="text-danger">
              {t(CLAVE_DE_MORA.pagadaEnMora)} · {fila.diasDeMora}{' '}
              {fila.diasDeMora === 1 ? 'día' : 'días'} de mora
            </span>
          ) : fila.enSiniestro ? (
            <span className="text-danger">En siniestro</span>
          ) : fila.enMora ? (
            <span className="text-danger">
              Cartera · {fila.diasDeMora} {fila.diasDeMora === 1 ? 'día' : 'días'} de mora
            </span>
          ) : fila.esVencida ? (
            <span className="text-warning">
              Venció el {fila.vence} · dentro del plazo de {fila.diasDePlazo}{' '}
              {fila.diasDePlazo === 1 ? 'día' : 'días'}
            </span>
          ) : (
            <span className="text-fg-muted">Todavía no vence · vence el {fila.vence}</span>
          )}
          {!cuadra(fila) ? (
            <span className="ml-2 inline-flex items-center gap-1 text-warning">
              <Warning className="h-3 w-3" aria-hidden="true" />
              Las líneas de este cobro no suman su saldo
            </span>
          ) : null}
        </span>
      </TableCell>
      <CeldasDeConceptos porConcepto={fila.saldoPorConcepto} conceptos={conceptos} />
      {haySinDesglose ? (
        <TableCell className="text-right">
          <Peso valor={fila.sinDesgloseCop} />
        </TableCell>
      ) : null}
      <TableCell className="text-right" data-testid="intereses-del-mes" title={interesDe(fila)?.motivo ?? undefined}>
        <Interes
          valor={interesDe(fila)?.pendienteCop ?? 0}
          sinReglas={interesDe(fila)?.sinReglas}
        />
      </TableCell>
      <TableCell className={cn('bg-surface-muted text-right text-fg', FIJA)}>
        <Peso valor={fila.saldoCop} />
        <Abono valor={fila.abonadoCop} />
        <ConIntereses capital={fila.saldoCop} interes={interesDe(fila)?.pendienteCop ?? 0} />
      </TableCell>
    </TableRow>
  )
}

function CeldasDeConceptos({
  porConcepto,
  conceptos,
  fuerte = false,
}: {
  porConcepto: PorConcepto
  conceptos: readonly TipoDeConcepto[]
  fuerte?: boolean
}) {
  return (
    <>
      {conceptos.map((c) => (
        <TableCell key={c} className="text-right">
          <Peso valor={saldoDe(porConcepto, c)} className={fuerte ? 'text-fg' : undefined} />
        </TableCell>
      ))}
    </>
  )
}

function TotalesEnPie({
  totales,
  interes,
  conceptos,
  haySinDesglose,
  etiqueta,
}: {
  totales: TotalesDeCartera
  interes: number
  conceptos: readonly TipoDeConcepto[]
  haySinDesglose: boolean
  etiqueta: string
}) {
  return (
    <TableRow data-testid="totales-por-concepto">
      <TableCell className="font-medium text-fg">{etiqueta}</TableCell>
      <CeldasDeConceptos porConcepto={totales.saldoPorConcepto} conceptos={conceptos} fuerte />
      {haySinDesglose ? (
        <TableCell className="text-right">
          <Peso valor={totales.sinDesgloseCop} />
        </TableCell>
      ) : null}
      <TableCell className="text-right font-semibold" data-testid="intereses-en-pie">
        <Interes valor={interes} />
      </TableCell>
      <TableCell className={cn('text-right font-semibold text-fg', FIJA, 'bg-bg dark:bg-surface-muted')}>
        <Peso valor={totales.saldoCop} />
        <Abono valor={totales.abonadoCop} />
        <ConIntereses capital={totales.saldoCop} interes={interes} />
      </TableCell>
    </TableRow>
  )
}
