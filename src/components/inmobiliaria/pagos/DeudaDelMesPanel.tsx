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
 * 2. **Cambiar la franja con el filtro.** La franja habla del MES entero; la
 *    tabla muestra lo filtrado y lo dice arriba de ella.
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

import { useMemo, useState } from 'react'
import {
  CurrencyCircleDollar,
  MagnifyingGlass,
  Plus,
  Warning,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import type { FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'
import { formatCurrency } from '@/lib/types/inmobiliaria'
import { mesEnTitulo } from '@/lib/utils/mes'

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
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Las filas que se ven: la búsqueda (inquilino, documento, contrato, inmueble)
 * y el interruptor «Sólo cartera» — el mismo par que ya tiene «Cartera por
 * concepto». Pura y exportada para poder fijarla en un test.
 *
 * 🔴 «Sólo cartera» filtra por el CAJÓN, no por «tiene saldo»: una cuota
 * vencida dentro del plazo no es cartera y no puede aparecer acá.
 */
export function filtrarCuotas(
  filas: readonly FilaDeLaCuotaDelMes[],
  busqueda: string,
  soloCartera: boolean,
): FilaDeLaCuotaDelMes[] {
  const q = normalizar(busqueda.trim())
  return filas.filter((f) => {
    if (soloCartera && f.cajon !== 'CARTERA') return false
    if (q === '') return true
    const campos = [f.inquilino, f.documento, f.contrato, f.contratoDeLeasefy, f.inmueble]
    return campos.some((c) => c && normalizar(c).includes(q))
  })
}

function Cifra({
  label,
  valor,
  detalle,
  tono,
  testId,
}: {
  label: string
  valor: string
  detalle: string
  tono?: 'danger' | 'warning' | 'muted' | 'success'
  testId: string
}) {
  const color =
    tono === 'danger'
      ? 'text-danger'
      : tono === 'warning'
        ? 'text-warning'
        : tono === 'success'
          ? 'text-success'
          : tono === 'muted'
            ? 'text-fg-muted'
            : 'text-fg'
  return (
    <div className="p-4" data-testid="pagos-cifra">
      <p className="text-xs text-fg-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${color}`}
        data-testid={testId}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-fg-muted">{detalle}</p>
    </div>
  )
}

export interface DeudaDelMesPanelProps {
  /** Inyectable para los tests; por defecto, el mes corriente. */
  mesInicial?: string
}

export function DeudaDelMesPanel({ mesInicial }: DeudaDelMesPanelProps) {
  const [mes, setMes] = useState(() => mesInicial ?? mesActual())
  const [busqueda, setBusqueda] = useState('')
  const [soloCartera, setSoloCartera] = useState(false)
  const [reciboAbierto, setReciboAbierto] = useState(false)

  const { datos, cargando, error, recargar } = useCarteraDelMes(mes)
  const puedeHacerRecibo = usePuedeHacerRecibo()

  const opciones = useMemo(() => mesesRecientes(12), [])
  const titulo = mesEnTitulo(mes)

  const todas = useMemo(() => datos?.filas ?? [], [datos])
  const visibles = useMemo(
    () => filtrarCuotas(todas, busqueda, soloCartera),
    [todas, busqueda, soloCartera],
  )
  const hayFiltros = busqueda.trim().length > 0 || soloCartera
  const limpiar = () => {
    setBusqueda('')
    setSoloCartera(false)
  }

  const t = datos?.totales
  const avisos = datos?.avisos ?? []

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
    <section className="space-y-4" aria-label={`La deuda de ${titulo}`}>
      {/* El mes y la acción principal, juntos: el alcance de lo que se ve y
          lo único que de verdad mueve plata en esta pantalla. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        {/* ── El mes: lo que se debe, lo pagado y lo que falta. ─────────── */}
        <div
          className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          data-testid="resumen-del-mes"
        >
          <Cifra
            testId="mes-se-debe"
            label={`Se debe en ${titulo}`}
            valor={formatCurrency(t?.totalCop ?? 0)}
            detalle={`${numberFormatter.format(t?.cuotas ?? 0)} ${
              (t?.cuotas ?? 0) === 1 ? 'cuota' : 'cuotas'
            } · ${numberFormatter.format(t?.inquilinos ?? 0)} ${
              (t?.inquilinos ?? 0) === 1 ? 'inquilino' : 'inquilinos'
            }`}
          />
          <Cifra
            testId="mes-pagado"
            label="Pagado"
            valor={formatCurrency(t?.pagadoCop ?? 0)}
            tono="success"
            detalle="Lo que ya entró de estas cuotas."
          />
          <Cifra
            testId="mes-falta"
            label="Falta por pagar"
            valor={formatCurrency(t?.pendienteCop ?? 0)}
            detalle="Se reparte en los tres cajones de abajo."
          />
        </div>

        {/* ── Dónde está lo que falta. Los tres cajones, en el orden en que
              una deuda los recorre: nace futura, vence, y recién después es
              cartera. Las palabras son las de «Cartera por concepto». ──── */}
        <div
          className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          data-testid="cajones-del-mes"
        >
          <Cifra
            testId="mes-por-vencer"
            label="Por vencer"
            valor={formatCurrency(t?.porVencerCop ?? 0)}
            tono="muted"
            detalle="Todavía no vence. Es deuda, no cartera."
          />
          <Cifra
            testId="mes-vencido-en-plazo"
            label="Vencido, en plazo"
            valor={formatCurrency(t?.vencidaEnPlazoCop ?? 0)}
            tono="warning"
            detalle="Venció, pero el plazo del contrato sigue corriendo."
          />
          <Cifra
            testId="mes-cartera"
            label="Cartera"
            valor={formatCurrency(t?.carteraCop ?? 0)}
            tono="danger"
            detalle={`Pasó el plazo. ${numberFormatter.format(
              t?.cuotasEnCartera ?? 0,
            )} ${(t?.cuotasEnCartera ?? 0) === 1 ? 'cuota' : 'cuotas'}: es lo único que la cobranza persigue.`}
          />
        </div>

        {/* 🔴 Lo que estos números NO cuentan. Un contrato vigente sin tabla de
            amortización no es un contrato sin deuda: es una deuda que todavía
            nadie generó. Callarlo deja la franja mintiendo por omisión. */}
        {avisos.length > 0 && (
          <div
            className="flex gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm text-fg"
            data-testid="avisos-del-mes"
          >
            <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <ul className="space-y-1">
              {avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-fg">
              <Switch
                checked={soloCartera}
                onCheckedChange={setSoloCartera}
                aria-label="Ver sólo las cuotas que ya son cartera"
                data-testid="solo-cartera"
              />
              Sólo cartera
            </label>
            <div className="relative w-full sm:w-72">
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
          </div>

          {/* La franja de arriba habla del MES; la tabla, de lo filtrado. Si
              no se dijera, los dos números parecerían contradecirse. */}
          {hayFiltros && (
            <p className="text-xs text-fg-muted" data-testid="alcance-de-la-tabla">
              <CurrencyCircleDollar
                className="mr-1 inline h-3.5 w-3.5 align-text-bottom"
                aria-hidden="true"
              />
              {numberFormatter.format(visibles.length)} de{' '}
              {numberFormatter.format(todas.length)} cuotas del mes. Las cifras de arriba
              son las del mes completo.
            </p>
          )}

          <CuotasDelMesTabla
            filas={visibles}
            mes={mes}
            hayFiltros={hayFiltros}
            onLimpiarFiltros={limpiar}
          />
        </section>

        {datos ? (
          <p className="text-xs text-fg-muted">
            La deuda sale de las cuotas del contrato, no de los cobros emitidos: existe
            desde que se firma, y el inquilino puede pagarla antes o hasta el día máximo
            de cartera de su contrato. Cada fila es un mes del{' '}
            <strong className="font-medium">estado de cuenta</strong> de ese cliente: haz
            clic en su nombre para verlo completo. Leído contra el {datos.hoy}.
          </p>
        ) : null}
      </EstadoDeDatos>

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
