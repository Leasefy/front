'use client'

/**
 * El cajón de una prefactura — todo lo que la fila no puede decir.
 *
 * ── 🔴 Nico, 22-09 ─────────────────────────────────────────────────────────
 *
 * «Y al dar clic se debería abrir detalle de ese en un drawer y ahí quizás ver
 * y accionar más cosas.»
 *
 * La fila de «Por facturar» tiene once columnas en una tabla que ya no cabe:
 * el tercero, el inmueble y el concepto se recortan con «…» —«Canon de
 * arrendamient…», «CR 50 CL 132 SUR -…»— y el aviso de mora se corta a dos
 * renglones. Todo eso vive en un `title`, que en un teléfono no existe y con el
 * mouse hay que adivinar que está.
 *
 * Acá no se recorta nada: el desglose por línea, los impuestos con su base, las
 * notas tributarias, la mora con su origen, y la acción («Generar esta») al pie
 * — que es lo que se venía a hacer.
 *
 * 🔴 Y como en el resto del panel: **el cajón no le pide nada al back**. Lee la
 * MISMA fila que la tabla, así que no puede decir algo distinto de lo que se
 * acaba de ver ni dejar a alguien esperando.
 */

import Link from 'next/link'
import { Receipt, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  mesLegible,
  type FacturaDelMes,
} from '@/lib/api/facturacion-por-mes.service'

export interface CajonDeLaFacturaProps {
  /** `null` = cerrado. Es la misma fila que pinta la tabla. */
  factura: FacturaDelMes | null
  onCerrar: () => void
  /** Emitir sólo ésta. */
  onGenerarUna: (clave: string) => void
  /** Por qué no se puede emitir nada ahora (resolución vencida, corrida en curso). */
  motivoParaNoEmitir: string | null
  ocupado: boolean
}

/** Un dato con su rótulo. Los números en `font-mono`, por regla del DS. */
function Dato({
  rotulo,
  children,
  mono = false,
}: {
  rotulo: string
  children: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-caption uppercase tracking-wide text-fg-muted">{rotulo}</dt>
      <dd className={cn('text-body text-fg', mono && 'font-mono tabular-nums')}>
        {children}
      </dd>
    </div>
  )
}

export function CajonDeLaFactura({
  factura,
  onCerrar,
  onGenerarUna,
  motivoParaNoEmitir,
  ocupado,
}: CajonDeLaFacturaProps) {
  const emitida = factura?.estado === 'EMITIDA'
  const bloqueada = factura ? !emitida && !factura.emitible : false

  return (
    <Cajon
      abierto={factura !== null}
      onOpenChange={(v) => {
        if (!v) onCerrar()
      }}
      ancho="sm:max-w-2xl"
      data-testid="cajon-de-la-factura"
    >
      {factura && (
        <>
          <CajonCabecera
            titulo={factura.terceroNombre}
            descripcion={`${factura.destinatario === 'PROPIETARIO' ? 'Comisión al propietario' : 'Canon del inquilino'} · ${mesLegible(factura.mes)}`}
          >
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {emitida ? (
                <Badge variant="success">
                  Emitida · {factura.numeroDian ?? `N° ${factura.numero}`}
                </Badge>
              ) : bloqueada ? (
                <Badge variant="secondary">Todavía no se puede emitir</Badge>
              ) : (
                <Badge variant="outline">Por emitir</Badge>
              )}
              {factura.terceroDocumento && (
                <span className="font-mono text-caption tabular-nums text-fg-muted">
                  {factura.terceroDocumento}
                </span>
              )}
            </div>
          </CajonCabecera>

          <CajonCuerpo className="space-y-6">
            {/* 🔴 Lo que bloquea, arriba: es la respuesta a «¿por qué no puedo
                generar ésta?», que es lo que trae a alguien a abrir la fila. */}
            {bloqueada && factura.motivoNoEmitible && (
              <p
                className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted p-3 text-sm text-fg"
                data-testid="cajon-motivo-no-emitible"
              >
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                {factura.motivoNoEmitible}
              </p>
            )}

            {factura.avisos.length > 0 && (
              <div
                className="space-y-1.5 rounded-lg border border-warning/30 bg-warning-soft p-3"
                data-testid="cajon-avisos"
              >
                {factura.avisos.map((a) => (
                  <p key={a} className="flex items-start gap-2 text-sm text-fg">
                    <Warning
                      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                      weight="fill"
                      aria-hidden="true"
                    />
                    {a}
                  </p>
                ))}
              </div>
            )}

            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato rotulo="Contrato">
                <Link
                  href={`/panel/inmobiliaria/contratos/${factura.contractId}`}
                  className="text-primary hover:underline"
                  data-testid="cajon-ir-al-contrato"
                >
                  {factura.numeroExterno ?? `#${factura.codigo ?? '—'}`}
                </Link>
                {factura.numeroExterno && factura.codigo !== null && (
                  <span className="text-fg-muted"> · Leasefy #{factura.codigo}</span>
                )}
              </Dato>
              <Dato rotulo="Período">
                {factura.diasFacturados === factura.diasDelMes
                  ? 'Mes completo'
                  : `${factura.diasFacturados} de ${factura.diasDelMes} días`}
              </Dato>
              {/* 🔴 El inmueble ENTERO. En la tabla es «CR 50 CL 132 SUR -…». */}
              <div className="sm:col-span-2">
                <Dato rotulo="Inmueble">{factura.inmueble}</Dato>
              </div>
            </dl>

            <section className="space-y-2">
              <h3 className="text-caption uppercase tracking-wide text-fg-muted">
                Qué se factura
              </h3>
              <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
                {factura.lineas.map((l, i) => (
                  <li
                    key={`${l.tipo}-${l.nombre}-${i}`}
                    className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm"
                    data-testid="cajon-linea"
                  >
                    <span className="min-w-0 text-fg">{l.nombre}</span>
                    <span
                      className={cn(
                        'shrink-0 font-mono tabular-nums',
                        l.resta ? 'text-fg-muted' : 'text-fg',
                      )}
                    >
                      {l.resta ? '−' : ''}
                      {formatCurrency(l.valorCop)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {factura.impuestos.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-caption uppercase tracking-wide text-fg-muted">
                  Impuestos
                </h3>
                <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
                  {factura.impuestos.map((imp, i) => (
                    <li
                      key={`${imp.tipo}-${imp.sobre}-${i}`}
                      className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm"
                      data-testid="cajon-impuesto"
                    >
                      <span className="min-w-0 text-fg">
                        {imp.tipo}{' '}
                        <span className="text-fg-muted">
                          sobre {imp.sobre.toLowerCase().replace(/_/g, ' ')}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-fg">
                        {formatCurrency(imp.valorCop)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* La plata, con el mismo orden del documento: base, IVA,
                retenciones, total, y lo que de verdad se paga. */}
            <dl className="space-y-2 rounded-lg border border-border bg-surface-muted p-4">
              {[
                ['Base', formatCurrency(factura.baseCop)],
                ['IVA', factura.ivaCop > 0 ? formatCurrency(factura.ivaCop) : '—'],
                ...(factura.retencionesCop > 0
                  ? [['Retenciones', `−${formatCurrency(factura.retencionesCop)}`] as const]
                  : []),
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-fg-muted">{rotulo}</dt>
                  <dd className="font-mono text-sm tabular-nums text-fg-muted">{valor}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                <dt className="text-body font-medium text-fg">Total de la factura</dt>
                <dd
                  className="font-mono text-lg font-semibold tabular-nums text-fg"
                  data-testid="cajon-total"
                >
                  {formatCurrency(factura.totalCop)}
                </dd>
              </div>
              {factura.retencionesCop > 0 && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-fg-muted">Lo que se paga</dt>
                  <dd className="font-mono text-sm tabular-nums text-fg-muted">
                    {formatCurrency(factura.netoCop)}
                  </dd>
                </div>
              )}
              {factura.deduccionAlEgresoCop > 0 && (
                <p className="border-t border-border pt-2 text-caption text-fg-muted">
                  {formatCurrency(factura.deduccionAlEgresoCop)} van a deducción del
                  egreso del propietario, no a esta factura.
                </p>
              )}
            </dl>

            {factura.escenario && (
              <Dato rotulo="Escenario tributario">
                {factura.escenario.codigo} · {factura.escenario.nombre}
                {factura.escenario.certeza !== 'CONFIRMADO' && (
                  <span className="text-warning">
                    {' '}
                    · {factura.escenario.certeza === 'DEDUCIDO' ? 'deducido' : 'sin definir'}
                  </span>
                )}
              </Dato>
            )}

            {factura.notasTributarias.length > 0 && (
              <section className="space-y-1.5">
                <h3 className="text-caption uppercase tracking-wide text-fg-muted">
                  Notas tributarias
                </h3>
                {factura.notasTributarias.map((n) => (
                  <p key={n} className="text-sm text-fg-muted">
                    {n}
                  </p>
                ))}
              </section>
            )}

            {factura.mora && factura.mora.esCartera && (
              <section
                className="space-y-1 rounded-lg border border-border bg-surface-muted p-3"
                data-testid="cajon-mora"
              >
                <h3 className="text-caption uppercase tracking-wide text-fg-muted">
                  Mora de esta cuota
                </h3>
                <p className="text-sm text-fg">
                  {factura.mora.diasDeMora} días.{' '}
                  {factura.mora.recargosCop > 0
                    ? `La factura lleva ${formatCurrency(factura.mora.recargosCop)} de recargos.`
                    : (factura.mora.motivo ?? 'Sin recargos.')}
                </p>
              </section>
            )}
          </CajonCuerpo>

          <CajonPie
            ayuda={
              emitida
                ? 'Una factura emitida no se borra: se netea con una nota crédito desde «Ventas».'
                : bloqueada
                  ? factura.motivoNoEmitible
                  : (motivoParaNoEmitir ??
                    'Se emite sólo ésta: no toca lo que tengas marcado en la tabla.')
            }
          >
            <Button variant="outline" hideArrow onClick={onCerrar} data-testid="cajon-cerrar">
              Cerrar
            </Button>
            {!emitida && (
              <Button
                hideArrow
                disabled={bloqueada || ocupado || motivoParaNoEmitir !== null}
                onClick={() => {
                  onGenerarUna(factura.clave)
                  onCerrar()
                }}
                data-testid="cajon-generar-esta"
              >
                <Receipt className="h-4 w-4" weight="bold" />
                Generar esta factura
              </Button>
            )}
          </CajonPie>
        </>
      )}
    </Cajon>
  )
}
