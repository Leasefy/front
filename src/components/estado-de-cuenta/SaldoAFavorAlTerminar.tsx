'use client';

/**
 * 🔴 EL SALDO A FAVOR DEL INQUILINO AL TERMINAR EL CONTRATO (Juan Camilo,
 * 16-09: «se le devuelve (cuenta por pagar al inquilino + comprobante de
 * egreso), descontando lo que deba»; ola E, 03-10-2026).
 *
 * Vive en el estado de cuenta del contrato, en el PANEL (endpoint de la
 * inmobiliaria), debajo del anticipo. Sólo aparece con el contrato TERMINADO y
 * algo que decir: saldo a favor, o una devolución ya registrada.
 *
 *   · dice lo que tiene a favor (anticipo sin consumir + saldo suelto), lo que
 *     debe (se descuenta primero) y lo que se le devolvería;
 *   · «Registrar la devolución» abre un formulario corto (la cuenta del
 *     inquilino es opcional: se completa en el egreso antes de pagarlo) y deja
 *     la CUENTA POR PAGAR: un egreso pendiente a su nombre, que sale por el lote
 *     de egresos y numera su comprobante al pagarse;
 *   · con la devolución registrada, dice en qué va;
 *   · 🔴 ARREGLOS-3 (03-10-2026): si después de registrarla llegó deuda nueva
 *     (la cuota de cierre del acta, una reparación…), la devolución queda EN
 *     REVISIÓN: se avisa con el porqué, el lote de egresos no la deja salir, y
 *     «Revisado» la recalcula (descuenta lo que debe y deja el egreso nuevo).
 *
 * Si la lectura falla, lo dice (callarse haría creer que no tiene nada a favor).
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  numeroDeCuentaValido,
  saldoAFavorApi,
  type DevolucionRegistrada,
  type DevolucionRevisada,
  type LiquidacionDelSaldoAFavor,
} from '@/lib/api/saldo-a-favor';
import { useAparecer } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import { useRefrescarElEstado } from './refrescar-el-estado';

type Lectura =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; liquidacion: LiquidacionDelSaldoAFavor };

/** ¿Hay algo que mostrar? Sólo terminado, y con saldo o con una devolución. */
export function haySaldoAFavorQueMostrar(l: LiquidacionDelSaldoAFavor): boolean {
  return l.contrato.terminado && (l.aFavor.totalCop > 0 || l.devolucion !== null);
}

/** La clave del estado de la devolución (pagada sin número: sin el «N.º»). */
export function claveDelEstadoDeLaDevolucion(estado: string, numero: number | null): string {
  switch (estado) {
    case 'PAGADO':
      return numero !== null ? 'estadoPagado' : 'estadoPagadoSinNumero';
    case 'EN_LOTE':
      return 'estadoEnLote';
    case 'ANULADO':
      return 'estadoAnulado';
    default:
      return 'estadoPendiente';
  }
}

export function SaldoAFavorAlTerminarSeccion({ contractId }: { contractId: string }) {
  const { t } = useI18n();
  const k = (s: string) => `recibos.saldoAFavorAlTerminar.${s}`;
  const permisos = usePermissionsContextSafe();
  const puedeRegistrar = permisos ? permisos.canAccess('cobros', 'create') : false;
  const aparecer = useAparecer();
  /** Los totales del documento de alrededor (ARREGLOS-7); `null` fuera de la pantalla. */
  const refrescarElEstado = useRefrescarElEstado();

  const [lectura, setLectura] = React.useState<Lectura>({ estado: 'cargando' });
  const [abierto, setAbierto] = React.useState(false);
  const [banco, setBanco] = React.useState('');
  const [tipo, setTipo] = React.useState<'' | 'AHORROS' | 'CORRIENTE'>('');
  const [numero, setNumero] = React.useState('');
  const [notas, setNotas] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [registrada, setRegistrada] = React.useState<DevolucionRegistrada | null>(null);
  // ARREGLOS-3: «Revisado» (la devolución en revisión se recalcula).
  const [revisando, setRevisando] = React.useState(false);
  const [errorDeLaRevision, setErrorDeLaRevision] = React.useState<string | null>(null);
  const [revisada, setRevisada] = React.useState<DevolucionRevisada | null>(null);

  // La lectura que llega tarde (otro contrato, o la sección ya se fue) no pinta.
  const vigente = React.useRef(0);
  const leer = React.useCallback(async () => {
    const esta = ++vigente.current;
    try {
      const liquidacion = await saldoAFavorApi.liquidacion(contractId);
      if (esta === vigente.current) setLectura({ estado: 'listo', liquidacion });
    } catch {
      if (esta === vigente.current) setLectura({ estado: 'error' });
    }
  }, [contractId]);

  React.useEffect(() => {
    setLectura({ estado: 'cargando' });
    void leer();
    return () => {
      vigente.current += 1;
    };
  }, [leer]);

  if (lectura.estado === 'cargando') return null;
  if (lectura.estado === 'error') {
    return (
      <p role="alert" className="text-caption text-danger" data-testid="saldo-a-favor-error">
        {t(k('errorAlLeer'))}
      </p>
    );
  }
  const l = lectura.liquidacion;
  // 🔴 ARREGLOS-3: lo que acaba de pasar se dice aunque ya no quede nada a favor
  // («Revisado» aplicó todo el saldo a la deuda): si no, la sección desaparecía
  // con su aviso y la persona no sabía qué había pasado.
  if (!haySaldoAFavorQueMostrar(l) && !revisada && !registrada) return null;

  const numeroMalo = numero.trim() !== '' && !numeroDeCuentaValido(numero);

  async function registrar() {
    if (numeroMalo) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await saldoAFavorApi.devolver(contractId, {
        ...(banco.trim() ? { banco: banco.trim() } : {}),
        ...(tipo ? { tipoDeCuenta: tipo } : {}),
        ...(numero.trim() ? { numeroDeCuenta: numero.trim() } : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });
      setRegistrada(r);
      setAbierto(false);
      await leer();
      // ARREGLOS-7: la deuda cambió; los totales del documento también.
      void refrescarElEstado?.();
    } catch (e) {
      setError(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos registrar la devolución.',
          accion: 'registrar la devolución',
        }),
      );
    } finally {
      setEnviando(false);
    }
  }

  async function marcarRevisada() {
    setRevisando(true);
    setErrorDeLaRevision(null);
    try {
      const r = await saldoAFavorApi.revisado(contractId);
      setRevisada(r);
      setRegistrada(null);
      await leer();
      // ARREGLOS-7: «Revisado» recalcula con la deuda de hoy; los totales también.
      void refrescarElEstado?.();
    } catch (e) {
      setErrorDeLaRevision(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos recalcular la devolución.',
          accion: 'recalcular la devolución',
        }),
      );
    } finally {
      setRevisando(false);
    }
  }

  const revision = l.revision ?? null;

  return (
    <section
      className="space-y-3 rounded-md border border-border px-4 py-3"
      data-testid="saldo-a-favor-al-terminar"
      aria-label={t(k('titulo'))}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fg">{t(k('titulo'))}</h3>
        <p className="text-caption text-fg-muted">{t(k('ayuda'))}</p>
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {l.aFavor.anticipoDelContratoCop > 0 && (
          <div>
            <dt className="text-caption text-fg-subtle">{t(k('anticipo'))}</dt>
            <dd className="tabular-nums text-fg">{formatCurrency(l.aFavor.anticipoDelContratoCop)}</dd>
          </div>
        )}
        {l.aFavor.sueltoIncluido && l.aFavor.saldoSueltoCop > 0 && (
          <div>
            <dt className="text-caption text-fg-subtle">{t(k('suelto'))}</dt>
            <dd className="tabular-nums text-fg">{formatCurrency(l.aFavor.saldoSueltoCop)}</dd>
          </div>
        )}
        {l.debeCop > 0 && (
          <div>
            <dt className="text-caption text-fg-subtle">{t(k('debe'))}</dt>
            <dd className="tabular-nums text-fg-muted">{formatCurrency(l.debeCop)}</dd>
          </div>
        )}
        {!l.devolucion && (
          <div>
            <dt className="text-caption text-fg-subtle">{t(k('aDevolver'))}</dt>
            <dd className="font-semibold tabular-nums text-fg" data-testid="saldo-a-devolver">
              {formatCurrency(l.aDevolverCop)}
            </dd>
          </div>
        )}
        {l.devolucion && (
          <div>
            <dt className="text-caption text-fg-subtle">{t(k('devolucion'))}</dt>
            <dd className="text-fg" data-testid="estado-de-la-devolucion">
              <span className="font-semibold tabular-nums">{formatCurrency(l.devolucion.valorCop)}</span>{' '}
              · {t(k(claveDelEstadoDeLaDevolucion(l.devolucion.estado, l.devolucion.numero)), {
                numero: l.devolucion.numero ?? '',
              })}
            </dd>
          </div>
        )}
      </dl>

      <AnimatePresence initial={false}>
        {revision && (
          <motion.div
            key="en-revision"
            {...aparecer}
            role="alert"
            className="space-y-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2"
            data-testid="devolucion-en-revision"
          >
            <p className="text-sm font-semibold text-fg">{t(k('enRevisionTitulo'))}</p>
            <p className="text-sm text-fg-muted">{revision.motivo}</p>
            <p className="text-caption text-fg-muted">
              {t(k('enRevisionValores'), {
                debe: formatCurrency(revision.debeCop),
                valor: formatCurrency(revision.valorDelEgresoCop),
              })}
            </p>
            {puedeRegistrar ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                hideArrow
                isLoading={revisando}
                disabled={revisando}
                onClick={() => void marcarRevisada()}
                data-testid="marcar-revisada"
              >
                {t(k('revisar'))}
              </Button>
            ) : (
              <p className="text-caption text-fg-subtle">{t(k('revisarSinPermiso'))}</p>
            )}
            <AnimatePresence initial={false}>
              {errorDeLaRevision && (
                <motion.p
                  key="error-de-la-revision"
                  {...aparecer}
                  role="alert"
                  className="text-sm text-danger"
                  data-testid="revision-error"
                >
                  {errorDeLaRevision}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {revisada && !revision && (
          <motion.p
            key="revisada"
            {...aparecer}
            role="status"
            className="text-sm text-success"
            data-testid="devolucion-revisada"
          >
            {revisada.egreso
              ? t(k('revisadoListo'), {
                  anterior: formatCurrency(revisada.anterior.valorCop),
                  valor: formatCurrency(revisada.aDevolverCop),
                })
              : t(k('revisadoSinNada'), { anterior: formatCurrency(revisada.anterior.valorCop) })}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {registrada && (
          <motion.p
            key="registrada"
            {...aparecer}
            role="status"
            className="text-sm text-success"
            data-testid="devolucion-registrada"
          >
            {registrada.egreso
              ? t(k('registrada'), { valor: formatCurrency(registrada.aDevolverCop) })
              : t(k('nadaQueDevolver'))}
            {registrada.aplicadoCop > 0
              ? ` ${t(k('aplicadoALaDeuda'), { valor: formatCurrency(registrada.aplicadoCop) })}`
              : ''}
          </motion.p>
        )}
      </AnimatePresence>

      {!l.devolucion && !l.sePuedeDevolver && l.porQueNo && (
        <p className="text-sm text-fg-muted" data-testid="saldo-a-favor-por-que-no">
          {l.porQueNo}
        </p>
      )}

      {l.sePuedeDevolver && puedeRegistrar && !abierto && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          hideArrow
          onClick={() => {
            setError(null);
            setAbierto(true);
          }}
          data-testid="registrar-devolucion"
        >
          {t(k('registrar'))}
        </Button>
      )}

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            key="formulario"
            {...aparecer}
            className="space-y-3 rounded-md border border-border bg-surface-muted p-3"
            data-testid="formulario-de-la-devolucion"
          >
            <p className="text-sm text-fg-muted">{t(k('cuentaDespues'))}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="devolucion-banco">{t(k('banco'))}</Label>
                <Input
                  id="devolucion-banco"
                  value={banco}
                  maxLength={80}
                  onChange={(e) => setBanco(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="devolucion-tipo">{t(k('tipoDeCuenta'))}</Label>
                <select
                  id="devolucion-tipo"
                  className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as '' | 'AHORROS' | 'CORRIENTE')}
                >
                  <option value="">{t(k('sinTipo'))}</option>
                  <option value="AHORROS">{t(k('ahorros'))}</option>
                  <option value="CORRIENTE">{t(k('corriente'))}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="devolucion-numero">{t(k('numeroDeCuenta'))}</Label>
                <Input
                  id="devolucion-numero"
                  inputMode="numeric"
                  className="font-mono"
                  value={numero}
                  maxLength={30}
                  aria-invalid={numeroMalo || undefined}
                  aria-describedby={numeroMalo ? 'devolucion-numero-error' : undefined}
                  onChange={(e) => setNumero(e.target.value)}
                />
                {numeroMalo && (
                  <p id="devolucion-numero-error" className="text-sm text-danger">
                    {t(k('numeroInvalido'))}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="devolucion-notas">{t(k('notas'))}</Label>
              <Input
                id="devolucion-notas"
                value={notas}
                maxLength={300}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger" data-testid="devolucion-error">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                hideArrow
                isLoading={enviando}
                disabled={enviando || numeroMalo}
                onClick={() => void registrar()}
                data-testid="confirmar-devolucion"
              >
                {t(k('confirmar'))}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                hideArrow
                disabled={enviando}
                onClick={() => setAbierto(false)}
              >
                {t(k('cancelar'))}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
