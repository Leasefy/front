'use client'

/**
 * El rango: qué hay por generar de acá hasta una fecha.
 *
 * ── El pedido, con las palabras del CEO (2026-09-13) ────────────────────────
 *
 * «Yo ya tengo **prefacturado** 10 facturas de un millón: te las genero cada
 * mes.» «Funciona como una **tabla de amortización**.»
 *
 * «Si quiero mirar qué facturas tengo por generar **hasta el 31 de diciembre**,
 * revisa los estados de cuenta de los contratos y muestra todas las posibles
 * facturas hasta esa fecha; los contratos que finalicen antes se van eliminando
 * de la prefactura. Lo que **NO** se puede es enviarlas [antes de tiempo].»
 *
 * ── Qué pinta este bloque, y qué NO ─────────────────────────────────────────
 *
 * Pinta el RANGO: los totales, el mes a mes y el agrupado por contrato — que es
 * literalmente la primera frase del CEO, «10 facturas de un millón». Cada mes se
 * puede abrir para ver sus filas.
 *
 * 🔴 Y el mes a mes dice DÓNDE se cae cada contrato que termina dentro del
 * rango. Sin eso, el total de un mes baja respecto al anterior y la única
 * lectura posible es «faltan facturas».
 *
 * 🔴 Y no emite. Acá no hay casillas ni botón: emitir sigue siendo del mes
 * elegido arriba. El mes que todavía no empieza se ve con su motivo a la vista
 * («Diciembre de 2026 todavía no empieza») en vez de con una casilla apagada que
 * no explica nada — y si alguien lo intentara igual, el back responde 400.
 *
 * ── De dónde salen los números ──────────────────────────────────────────────
 *
 * De `GET /inmobiliaria/facturacion/por-generar?desde=&hasta=`, que los lee de
 * `contrato_cuotas`: la tabla de amortización del contrato. Acá no se suma ni se
 * agrupa nada que el back no haya mandado ya resuelto (`meses`, `porContrato`,
 * `totales`) — dos cuentas de la misma plata es exactamente el defecto que este
 * circuito vino a cerrar.
 */

import { CaretDown, Warning } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import {
  fechaLegible,
  mesLegible,
  type ContratoQueTermina,
  type FacturaDelMes,
  type FacturasPorGenerar,
  type MesDelRango,
} from '@/lib/api/facturacion-por-mes.service'

/** El aviso del CEO, en un solo lugar: se muestra y además se prueba. */
export const AVISO_SE_GENERAN_POR_MES =
  'Se muestran todas las facturas hasta esa fecha; se emiten mes a mes, y sólo cuando el mes ya empezó.'

/**
 * Lo que el back YA hizo por nosotros, dicho en pantalla.
 *
 * «Los contratos que finalicen antes se van eliminando de la prefactura»: si no
 * se dice, el total se lee como una proyección que ignora los vencimientos.
 */
export const AVISO_CONTRATOS_QUE_TERMINAN =
  'Los contratos que terminan antes de esa fecha dejan de prefacturarse: sus meses posteriores no aparecen.'

/**
 * El tope que propone el botón: el 31 de diciembre del año en curso.
 *
 * Es la fecha que el CEO dijo, y es el corte con el que una inmobiliaria mira
 * «qué me queda del año». Se arma con los campos locales del `Date` —no con
 * ISO— porque `new Date('2026-12-31')` se lee como UTC y en Bogotá (UTC−5) cae
 * el 30.
 */
export function finDeAnio(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-12-31`
}

/** Las filas de un mes, los dos lados juntos y en orden de contrato. */
export function filasDelMes(
  datos: FacturasPorGenerar,
  mes: string,
): FacturaDelMes[] {
  return [...datos.inquilinos, ...datos.propietarios]
    .filter((f) => f.mes === mes)
    .sort(
      (a, b) =>
        (a.codigo ?? 0) - (b.codigo ?? 0) ||
        a.destinatario.localeCompare(b.destinatario),
    )
}

/** Cuántas facturas y cuánta plata trae un mes, de los dos lados. */
export function totalDelMes(mes: MesDelRango): {
  cantidad: number
  totalCop: number
} {
  return {
    cantidad:
      mes.inquilinos.porEmitir +
      mes.inquilinos.emitidas +
      mes.propietarios.porEmitir +
      mes.propietarios.emitidas,
    totalCop: mes.inquilinos.totalCop + mes.propietarios.totalCop,
  }
}

function Totales({ datos }: { datos: FacturasPorGenerar }) {
  const t = datos.totales
  const celdas: { rotulo: string; valor: string; testid: string }[] = [
    {
      rotulo: 'Facturas',
      valor: String(datos.inquilinos.length + datos.propietarios.length),
      testid: 'facturas',
    },
    { rotulo: 'Meses', valor: String(t.meses), testid: 'meses' },
    { rotulo: 'Contratos', valor: String(t.contratos), testid: 'contratos' },
    {
      rotulo: 'Total del rango',
      valor: formatCurrency(t.inquilinos.totalCop + t.propietarios.totalCop),
      testid: 'total',
    },
    {
      rotulo: 'Se puede emitir hoy',
      valor: `${t.emitiblesHoy} · ${formatCurrency(t.totalEmitibleHoyCop)}`,
      testid: 'emitibles',
    },
  ]

  return (
    <div
      className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3 lg:grid-cols-5"
      data-testid="rango-totales"
    >
      {celdas.map((c) => (
        <div key={c.testid}>
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {c.rotulo}
          </p>
          <p
            className="mt-1 font-mono text-lg font-medium tabular-nums text-fg"
            data-testid={`rango-total-${c.testid}`}
          >
            {c.valor}
          </p>
        </div>
      ))}
    </div>
  )
}

/** Las filas de un mes, sólo para mirar: sin casillas y sin botón. */
function FilasDelMes({ filas }: { filas: FacturaDelMes[] }) {
  if (filas.length === 0) {
    return (
      <p className="px-4 py-3 text-caption text-fg-muted">
        Ninguna factura de este mes.
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">Contrato</TableHead>
          <TableHead className="whitespace-nowrap">Tercero</TableHead>
          <TableHead className="whitespace-nowrap">Inmueble</TableHead>
          <TableHead className="whitespace-nowrap">Para</TableHead>
          <TableHead className="whitespace-nowrap text-right">Base</TableHead>
          <TableHead className="whitespace-nowrap text-right">IVA</TableHead>
          <TableHead className="whitespace-nowrap text-right">Total</TableHead>
          <TableHead className="whitespace-nowrap">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={f.clave} data-testid={`rango-fila-${f.clave}`}>
            <TableCell className="whitespace-nowrap tabular-nums font-medium text-fg">
              {f.numeroExterno ?? `#${f.codigo ?? '—'}`}
            </TableCell>
            <TableCell className="max-w-[200px]">
              <p className="truncate text-fg">{f.terceroNombre}</p>
            </TableCell>
            <TableCell className="max-w-[200px]">
              <p className="truncate text-fg-muted">{f.inmueble}</p>
            </TableCell>
            <TableCell className="whitespace-nowrap text-fg-muted">
              {f.destinatario === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
              {formatCurrency(f.baseCop)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
              {f.ivaCop > 0 ? formatCurrency(f.ivaCop) : '—'}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums font-medium text-fg">
              {formatCurrency(f.totalCop)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              {f.estado === 'EMITIDA' ? (
                <span className="text-caption text-fg-muted">
                  {f.numeroDian ?? `N° ${f.numero}`}
                </span>
              ) : f.estado === 'GENERADA' ? (
                <span
                  className="text-caption text-primary"
                  data-testid={`rango-generada-${f.clave}`}
                  title="La factura ya existe, sin número: se numera al emitirla."
                >
                  Generada · sin emitir
                </span>
              ) : f.emitible ? (
                <span className="text-caption text-primary">Por emitir</span>
              ) : (
                <span
                  className="text-caption text-fg-subtle"
                  title={f.motivoNoEmitible ?? undefined}
                  data-testid={`rango-todavia-no-${f.clave}`}
                >
                  Todavía no
                </span>
              )}
              {/* Abono y saldo de la factura: los ponen al día los recibos. */}
              {f.estado !== 'POR_EMITIR' &&
                typeof f.abonadoCop === 'number' &&
                typeof f.saldoCop === 'number' && (
                  <span
                    className="block text-caption text-fg-muted tabular-nums"
                    data-testid={`rango-abono-${f.clave}`}
                  >
                    {f.saldoCop === 0
                      ? `Pagada · abonado ${formatCurrency(f.abonadoCop)}`
                      : f.abonadoCop === 0
                        ? `Sin abonos · saldo ${formatCurrency(f.saldoCop)}`
                        : `Abonado ${formatCurrency(f.abonadoCop)} · saldo ${formatCurrency(f.saldoCop)}`}
                  </span>
                )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** El mes a mes: cuánto pesa cada uno, si ya se puede emitir, y sus filas. */
/**
 * 🔴 Los contratos que se CAEN en este mes.
 *
 * El CEO: «los contratos que finalicen antes se van eliminando de la
 * prefactura.» Eso el back ya lo hacía —las cuotas posteriores de un contrato
 * terminado ni aparecen—, pero el mes a mes no lo mostraba: el total de
 * noviembre bajaba respecto al de octubre y no había forma de saber por qué.
 * Acá se ve DÓNDE se cae cada uno, con nombre y fecha.
 */
function ContratosQueTerminan({
  mes,
  contratos,
}: {
  mes: string
  contratos: ContratoQueTermina[]
}) {
  if (contratos.length === 0) return null
  return (
    <div
      className="mx-4 mb-3 rounded-md border border-border-faint bg-surface-muted px-3 py-2"
      data-testid={`rango-terminan-${mes}`}
    >
      <p className="text-caption font-medium text-fg">
        {contratos.length}{' '}
        {contratos.length === 1
          ? 'contrato termina acá'
          : 'contratos terminan acá'}
        : de este mes en adelante dejan de prefacturarse.
      </p>
      <ul className="mt-1 space-y-0.5">
        {contratos.map((c) => (
          <li
            key={`${c.contractId}-${c.destinatario}`}
            className="text-caption text-fg-muted"
            data-testid={`rango-termina-${mes}-${c.contractId}-${c.destinatario}`}
          >
            <span className="tabular-nums text-fg">
              {c.numeroExterno ?? `#${c.codigo ?? '—'}`}
            </span>{' '}
            · {c.terceroNombre} ·{' '}
            {c.destinatario === 'INQUILINO' ? 'inquilino' : 'propietario'}
            {c.terminaEl && ` · termina el ${fechaLegible(c.terminaEl)}`}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MesAMes({ datos }: { datos: FacturasPorGenerar }) {
  return (
    <div
      className="rounded-lg border border-border bg-surface overflow-hidden"
      data-testid="rango-mes-a-mes"
    >
      <div className="border-b border-border px-4 py-3">
        <h4 className="text-body font-semibold text-fg">Mes a mes</h4>
        <p className="text-caption text-fg-muted">
          Abre un mes para ver sus facturas. Emitir sigue siendo del mes que
          elegiste arriba.
        </p>
      </div>
      <ul>
        {datos.meses.map((m) => {
          const { cantidad, totalCop } = totalDelMes(m)
          return (
            <li key={m.mes} className="border-b border-border-faint last:border-0">
              <details data-testid={`rango-mes-${m.mes}`}>
                <summary className="flex cursor-pointer flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2">
                    <CaretDown className="h-3.5 w-3.5 text-fg-subtle" weight="bold" />
                    <span className="text-body-sm font-medium text-fg">
                      {mesLegible(m.mes)}
                    </span>
                    {m.emitible ? (
                      <span
                        className="rounded-full bg-primary-soft px-2 py-0.5 text-caption text-primary"
                        data-testid={`rango-emitible-${m.mes}`}
                      >
                        Se puede emitir
                      </span>
                    ) : (
                      <span
                        className="rounded-full bg-surface-muted px-2 py-0.5 text-caption text-fg-subtle"
                        data-testid={`rango-no-emitible-${m.mes}`}
                      >
                        Todavía no se emite
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-caption text-fg-muted">
                    {cantidad} {cantidad === 1 ? 'factura' : 'facturas'} ·{' '}
                    {formatCurrency(totalCop)}
                    {(m.terminan?.length ?? 0) > 0 && (
                      <span
                        className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-fg-subtle"
                        data-testid={`rango-terminan-pildora-${m.mes}`}
                      >
                        {m.terminan?.length} terminan acá
                      </span>
                    )}
                  </span>
                </summary>
                {/* 🔴 El motivo con las palabras del back: «Diciembre de 2026
                    todavía no empieza…». Una casilla apagada sin explicación es
                    cómo alguien concluye que el sistema está roto. */}
                {!m.emitible && m.motivoNoEmitible && (
                  <p
                    className="mx-4 mb-3 rounded-md bg-surface-muted px-3 py-2 text-caption text-fg-muted"
                    data-testid={`rango-motivo-${m.mes}`}
                  >
                    {m.motivoNoEmitible}
                  </p>
                )}
                <ContratosQueTerminan mes={m.mes} contratos={m.terminan ?? []} />
                <div className="overflow-x-auto border-t border-border-faint">
                  <FilasDelMes filas={filasDelMes(datos, m.mes)} />
                </div>
              </details>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * El agrupado por contrato: «10 facturas de un millón».
 *
 * `valorTipicoCop` es el total que MÁS se repite entre los meses del contrato,
 * no un promedio: un contrato de doce meses con el primero prorrateado son once
 * de un millón y uno de seiscientos mil, y un promedio mentiría sobre los doce.
 */
function PorContrato({ datos }: { datos: FacturasPorGenerar }) {
  if (datos.porContrato.length === 0) return null
  return (
    <details
      className="rounded-lg border border-border bg-surface"
      data-testid="rango-por-contrato"
    >
      <summary className="cursor-pointer px-4 py-3 text-body-sm text-fg">
        Por contrato · {datos.porContrato.length}{' '}
        {datos.porContrato.length === 1 ? 'línea' : 'líneas'}
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Contrato</TableHead>
              <TableHead className="whitespace-nowrap">Tercero</TableHead>
              <TableHead className="whitespace-nowrap">Para</TableHead>
              <TableHead className="whitespace-nowrap">Meses</TableHead>
              <TableHead className="whitespace-nowrap text-right">
                Facturas
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">
                Cada una
              </TableHead>
              <TableHead className="whitespace-nowrap text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datos.porContrato.map((c) => (
              <TableRow
                key={`${c.contractId}-${c.destinatario}`}
                data-testid={`rango-contrato-${c.contractId}-${c.destinatario}`}
              >
                <TableCell className="whitespace-nowrap tabular-nums font-medium text-fg">
                  {c.numeroExterno ?? `#${c.codigo ?? '—'}`}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-fg">{c.terceroNombre}</p>
                  <p className="truncate text-caption text-fg-muted">
                    {c.inmueble}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-fg-muted">
                  {c.destinatario === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
                </TableCell>
                <TableCell className="whitespace-nowrap text-caption text-fg-muted">
                  {mesLegible(c.primerMes)}
                  {c.ultimoMes !== c.primerMes && ` → ${mesLegible(c.ultimoMes)}`}
                  {/* 🔴 «Los contratos que finalicen antes se van eliminando de
                      la prefactura»: acá se ve POR QUÉ este contrato tiene menos
                      meses que los demás. */}
                  {c.terminaEnElRango && c.terminaEl && (
                    <span
                      className="block text-fg-subtle"
                      data-testid={`rango-termina-${c.contractId}`}
                    >
                      Termina el {fechaLegible(c.terminaEl)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-fg">
                  {c.cantidad}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                  {formatCurrency(c.valorTipicoCop)}
                  {!c.valorParejo && (
                    <span className="block text-caption text-fg-subtle">
                      no todos iguales
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums font-medium text-fg">
                  {formatCurrency(c.totalCop)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  )
}

export function PrefacturasDelRango({ datos }: { datos: FacturasPorGenerar }) {
  return (
    <div className="space-y-4" data-testid="prefacturas-del-rango">
      <div className="rounded-lg bg-surface-muted border border-border p-3 flex items-start gap-2.5">
        <Warning
          className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5"
          weight="fill"
        />
        <div className="space-y-0.5">
          <p className="text-caption text-fg-muted">{AVISO_SE_GENERAN_POR_MES}</p>
          <p className="text-caption text-fg-subtle">
            {AVISO_CONTRATOS_QUE_TERMINAN}
          </p>
        </div>
      </div>
      <Totales datos={datos} />
      <MesAMes datos={datos} />
      <PorContrato datos={datos} />
    </div>
  )
}
