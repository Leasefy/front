'use client';

/**
 * El cajón de UNA liquidación: el desglose del mes de un propietario.
 *
 * 🔴 El molde (regla 5): la fila abre cajón, el kebab actúa. En Liquidaciones
 * la fila no hacía nada y el único camino era el kebab «Ver en dispersiones»,
 * que ni siquiera abre a ese propietario. El cajón NO le pide nada al back:
 * pinta lo que la fila ya trae (la vista previa del mes), inmueble por inmueble.
 *
 * Mismas reglas que la tabla: con deducciones, lo que se gira es `aGirarCop`
 * (entero o $0) y lo que sobra pasa a la siguiente liquidación; sin ellas, el
 * neto puede ser negativo y se dice «queda debiendo».
 */

import { Cajon, CajonCabecera, CajonCuerpo } from '@/components/ui/cajon';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';
import { titularEnUnaLinea } from '@/lib/propietarios/titular-de-la-cuenta';

type Propietario = VistaPreviaDeDispersiones['propietarios'][number];

function Renglon({
  etiqueta,
  valor,
  signo = '',
  tono,
  fuerte = false,
  testid,
}: {
  etiqueta: string;
  valor: number;
  signo?: '' | '−' | '+';
  tono?: string;
  fuerte?: boolean;
  testid?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5" data-testid={testid}>
      <span className={cn('text-sm', fuerte ? 'font-semibold text-fg' : 'text-fg-muted')}>{etiqueta}</span>
      <span className={cn('font-mono tabular-nums', fuerte ? 'font-semibold' : '', tono ?? 'text-fg')}>
        {signo}
        {formatCurrency(valor)}
      </span>
    </div>
  );
}

export function CajonDeLaLiquidacion({
  propietario: p,
  mes,
  base,
  onCerrar,
}: {
  propietario: Propietario | null;
  /** «septiembre de 2026». */
  mes: string;
  base: 'CAUSADO' | 'RECAUDADO';
  onCerrar: () => void;
}) {
  const d = p?.conDeducciones;
  return (
    <Cajon abierto={p !== null} onOpenChange={(abierto) => !abierto && onCerrar()} data-testid="cajon-liquidacion">
      {p && (
        <>
          <CajonCabecera
            titulo={p.propietarioName}
            descripcion={`Liquidación de ${mes} · ${p.yaExiste ? 'dispersión generada' : 'pendiente de generar'}`}
          />
          <CajonCuerpo className="space-y-6">
            <section>
              <h3 className="mb-1 text-sm font-semibold text-fg">El mes, en plata</h3>
              <div className="divide-y divide-border-faint">
                <Renglon
                  etiqueta={base === 'RECAUDADO' ? 'Canon recaudado' : 'Canon causado'}
                  valor={p.totalCollected}
                />
                <Renglon etiqueta="Comisión" valor={p.totalCommission} signo="−" tono="text-danger" />
                {/* 🔴 22-09 (Nico: «no estás teniendo en cuenta el IVA en la
                    comisión»): el IVA va entre la comisión y el neto, en su
                    línea. El back ya no lo esconde en los conceptos a cargo. */}
                {(p.totalIvaComision ?? 0) > 0 && (
                  <Renglon
                    etiqueta="IVA de la comisión"
                    valor={p.totalIvaComision ?? 0}
                    signo="−"
                    tono="text-danger"
                    testid="cajon-liquidacion-iva"
                  />
                )}
                {(p.totalRetencionesComision ?? 0) > 0 && (
                  <Renglon
                    etiqueta="Retenido sobre la comisión"
                    valor={p.totalRetencionesComision ?? 0}
                    signo="+"
                    testid="cajon-liquidacion-retenido"
                  />
                )}
                {p.totalConceptosAFavor > 0 && (
                  <Renglon etiqueta="Conceptos a su favor" valor={p.totalConceptosAFavor} signo="+" />
                )}
                {p.totalConceptosACargo > 0 && (
                  <Renglon etiqueta="Conceptos a su cargo" valor={p.totalConceptosACargo} signo="−" tono="text-danger" />
                )}
                <Renglon
                  etiqueta="Neto del mes"
                  valor={d ? d.netoDelMesCop : p.netToPropietario}
                  fuerte
                  tono={(d ? d.netoDelMesCop : p.netToPropietario) < 0 ? 'text-danger' : 'text-fg'}
                  testid="cajon-liquidacion-neto"
                />
                {d && d.deduccionesCop > 0 && (
                  <>
                    {d.deducciones.map((x) => (
                      <Renglon key={x.id} etiqueta={x.motivo} valor={x.valorCop} signo="−" tono="text-danger" />
                    ))}
                    <Renglon
                      etiqueta="A girar"
                      valor={d.aGirarCop}
                      fuerte
                      tono="text-success"
                      testid="cajon-liquidacion-a-girar"
                    />
                    {d.saldoEnContraCop > 0 && (
                      <p className="pt-1.5 text-sm text-warning" data-testid="cajon-liquidacion-en-contra">
                        {formatCurrency(d.saldoEnContraCop)} quedan en contra y pasan a la siguiente liquidación.
                      </p>
                    )}
                  </>
                )}
                {!d && p.netToPropietario < 0 && (
                  <p className="pt-1.5 text-sm text-danger">
                    Queda debiendo: lo que paga supera {base === 'RECAUDADO' ? 'lo recaudado' : 'su canon causado'}.
                  </p>
                )}
              </div>
            </section>

            {p.items.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-fg">Inmueble por inmueble</h3>
                <ul className="divide-y divide-border-faint" data-testid="cajon-liquidacion-inmuebles">
                  {p.items.map((i, n) => (
                    <li key={i.cuotaId ?? i.cobroId ?? `${i.propertyTitle}-${n}`} className="py-2">
                      <p className="truncate text-sm text-fg" title={i.propertyTitle}>
                        {i.propertyTitle}
                      </p>
                      <p className="font-mono text-caption tabular-nums text-fg-muted">
                        canon {formatCurrency(i.rentCollected)} · comisión {formatCurrency(i.commissionAmount)}
                        {(i.ivaComisionAmount ?? 0) > 0 && ` · IVA ${formatCurrency(i.ivaComisionAmount ?? 0)}`} · neto{' '}
                        {formatCurrency(i.netAmount)}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-1 text-sm font-semibold text-fg">A dónde se gira</h3>
              <p className="text-sm text-fg-muted">
                {p.propietarioBankAccount
                  ? `${p.propietarioBankName ?? ''} ${p.propietarioBankAccount}`.trim()
                  : 'Sin cuenta bancaria: no se le puede girar hasta que la cargues en su ficha.'}
              </p>
              {/* 🔴 22-09: la cuenta puede ser de otra persona; se dice de quién. */}
              {p.propietarioBankAccount && p.titularDeLaCuenta && !p.titularDeLaCuenta.esElPropietario ? (
                <p className="text-sm text-fg" data-testid="cajon-liquidacion-titular">
                  A nombre de {titularEnUnaLinea(p.titularDeLaCuenta) || 'otra persona, sin datos'} (otra persona)
                </p>
              ) : null}
            </section>
          </CajonCuerpo>
        </>
      )}
    </Cajon>
  );
}
