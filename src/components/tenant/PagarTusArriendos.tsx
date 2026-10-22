'use client';

/**
 * 🔴 «Selecciona qué vas a pagar» (Nico, 21-10-2026): las cuotas de cada
 * inmueble del inquilino, agrupadas bajo su inmueble (nombre, dirección,
 * contrato), cada una con de qué es (canon, IVA, retención…), y UN solo pago
 * de Wompi con lo que se marque, de uno o de varios inmuebles.
 *
 * Reglas de siempre (`PagarLoVencido`): en cada inmueble se paga de la cuota
 * más vieja a la más nueva; el monto lo decide el back; la comisión de la
 * pasarela la asume la inmobiliaria; un pago se aplica sólo cuando Wompi lo
 * confirma al back.
 */
import { useId, useMemo, useState } from 'react';
import { AnimatedNumber, Collapse, Presence } from '@leasefy/cadence';
import { ArrowUpRight, CaretDown, Clock, CreditCard, House, WarningCircle } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { getAccessToken } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { buildWompiCheckoutUrl } from '@/lib/payments/wompi-rent-session';
import {
  nombreDelInmueble,
  type ArriendoQueSePuedePagar,
  type CuotaQueSePuedePagar,
} from '@/lib/api/pago-en-linea.service';
import {
  cuotasMarcadas,
  loQueVasAPagar,
  marcarTodo,
  partesDelPago,
  sePuedeMarcar,
  tocarLaCuota,
  totalDeLoMarcado,
  type LoMarcado,
} from '@/lib/inquilino/pagar-varios';
import { conPunto, diaEnPalabras, horaEnColombia, mesEnPalabras } from './PagarLoVencido';

interface Props {
  /** Los arriendos que se ven (ya filtrados por el inmueble escogido arriba). */
  arriendos: ArriendoQueSePuedePagar[];
}

export function PagarTusArriendos({ arriendos }: Props) {
  const { formatCurrency } = useI18n();
  const [marcado, setMarcado] = useState<LoMarcado>({});
  const [confirmando, setConfirmando] = useState(false);
  const [yendo, setYendo] = useState(false);

  const total = totalDeLoMarcado(arriendos, marcado);
  const cuantas = cuotasMarcadas(arriendos, marcado);
  const todas = useMemo(() => marcarTodo(arriendos), [arriendos]);
  const cuantasHay = Object.values(todas).reduce((s, n) => s + n, 0);
  const estanTodas = cuantasHay > 0 && cuantas === cuantasHay;
  const variasInmobiliarias = new Set(arriendos.map((a) => a.inmobiliaria ?? '')).size > 1;

  const tocar = (leaseId: string, i: number) => {
    setConfirmando(false);
    setMarcado((m) => tocarLaCuota(m, leaseId, i));
  };

  const irAPagar = async () => {
    setYendo(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/inquilino/pagos/varios/wompi-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ arriendos: partesDelPago(arriendos, marcado) }),
      });
      const cuerpo = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const m = cuerpo.message;
        toast.error(
          (Array.isArray(m) ? m.join(' ') : typeof m === 'string' ? m : null) ??
            'No pudimos iniciar el pago. Prueba de nuevo en un momento.',
        );
        setYendo(false);
        return;
      }
      window.location.href = buildWompiCheckoutUrl({
        publicKey: String(cuerpo.publicKey),
        currency: String(cuerpo.currency),
        amountInCents: Number(cuerpo.amountInCents),
        reference: String(cuerpo.reference),
        integrity: String(cuerpo.integrity),
        redirectUrl: window.location.origin + '/inquilino/pagos',
      });
    } catch (err) {
      toast.error(mensajeParaLaPersona(err, { accion: 'iniciar el pago', porDefecto: 'No pudimos iniciar el pago. Prueba de nuevo en un momento.' }));
      setYendo(false);
    }
  };

  const hayVencidas = arriendos.some((a) => a.cuotas.some((c) => c.vencida));

  return (
    <section data-testid="pagar-tus-arriendos" className="rounded-xl border border-primary/30 bg-primary-soft p-4 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-sm font-medium text-primary">Selecciona qué vas a pagar</h2>
        </div>
        {cuantasHay > 1 && (
          <button
            type="button"
            data-testid="marcar-todo"
            onClick={() => {
              setConfirmando(false);
              setMarcado(estanTodas ? {} : todas);
            }}
            className="text-sm text-primary hover:underline"
          >
            {estanTodas ? 'Quitar todo' : 'Marcar todo'}
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-fg-muted">
        {arriendos.length > 1
          ? 'Puedes pagar cuotas de varios inmuebles en un solo pago. En cada uno se paga de la cuota más vieja a la más nueva.'
          : hayVencidas
            ? 'Se paga de la cuota más vieja a la más nueva.'
            : 'Puedes adelantarla desde ya.'}
      </p>

      <ul className="space-y-3" aria-label="Tus inmuebles y lo que puedes pagar de cada uno">
        {arriendos.map((a) => (
          <li key={a.leaseId}>
            <InmuebleConSusCuotas
              arriendo={a}
              cuantas={Math.min(marcado[a.leaseId] ?? 0, a.cuotas.length)}
              onTocar={(i) => tocar(a.leaseId, i)}
              mostrarInmobiliaria={variasInmobiliarias}
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-primary/30 pt-4">
        <span className="text-sm text-fg-muted">
          Total a pagar
          {cuantas > 0 && <span className="ml-1 whitespace-nowrap font-mono text-xs">· {cuantas} {cuantas === 1 ? 'cuota' : 'cuotas'}</span>}
        </span>
        <span data-testid="total-a-pagar" className="font-mono text-2xl font-bold text-fg">
          <AnimatedNumber value={total} format={(n) => formatCurrency(n)} />
        </span>
      </div>
      <p className="mt-1 text-xs text-fg-muted">Pagas exactamente esto: la comisión de la pasarela la asume la inmobiliaria.</p>

      <Presence show={confirmando && cuantas > 0} initial={false}>
        {confirmando && cuantas > 0 && (
          <div data-testid="confirmar-pago" className="mt-4 rounded-lg bg-surface p-4 text-sm text-fg">
            <p>
              Vas a pagar <span className="font-mono font-semibold">{formatCurrency(total)}</span> por{' '}
              {loQueVasAPagar(arriendos, marcado)}. Te llevamos a Wompi para pagar con PSE, tarjeta o Nequi.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={irAPagar} disabled={yendo} hideArrow data-testid="ir-a-wompi">
                {yendo ? 'Abriendo Wompi…' : 'Ir a pagar'}
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={() => setConfirmando(false)} disabled={yendo}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Presence>

      {!confirmando && (
        <Button className="mt-4 w-full" hideArrow data-testid="pagar" disabled={cuantas === 0} onClick={() => setConfirmando(true)}>
          {cuantas === 0 ? 'Escoge al menos una cuota' : `Pagar ${formatCurrency(total)}`}
        </Button>
      )}
    </section>
  );
}

function InmuebleConSusCuotas({
  arriendo: a,
  cuantas,
  onTocar,
  mostrarInmobiliaria,
}: {
  arriendo: ArriendoQueSePuedePagar;
  cuantas: number;
  onTocar: (i: number) => void;
  mostrarInmobiliaria: boolean;
}) {
  const { formatCurrency } = useI18n();
  const enVerificacion = a.enVerificacion;
  const direccion = [a.inmueble.direccion, a.inmueble.ciudad].filter(Boolean).join(', ');
  return (
    <div data-testid={`inmueble-${a.leaseId}`} className="rounded-lg bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft">
          <House className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{nombreDelInmueble(a)}</p>
          <p className="text-xs text-fg-muted">
            {a.inmueble.titulo && direccion ? <span className="break-words">{direccion}</span> : null}
            {a.contratoNumero !== null && (
              <span className="whitespace-nowrap">
                {a.inmueble.titulo && direccion ? ' · ' : ''}Contrato N.º <span className="font-mono">{a.contratoNumero}</span>
              </span>
            )}
            {mostrarInmobiliaria && a.inmobiliaria ? <span> · {a.inmobiliaria}</span> : null}
          </p>
        </div>
      </div>

      <Presence show={Boolean(enVerificacion)} initial={false}>
        {enVerificacion && (
          <div data-testid="pago-en-verificacion" className="mt-3 flex gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-fg">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            {enVerificacion.conTransaccion === false && enVerificacion.puedesReintentarDesde ? (
              <span data-testid="pago-sin-terminar">
                Empezaste un pago de <span className="font-mono">{formatCurrency(enVerificacion.valorCop)}</span> y Wompi todavía no nos
                dice si lo terminaste. Si lo pagaste, se aplica solo cuando tu banco lo confirme; si no, podrás intentarlo de nuevo desde
                las {conPunto(horaEnColombia(enVerificacion.puedesReintentarDesde))}
              </span>
            ) : (
              <span>
                Tu pago de <span className="font-mono">{formatCurrency(enVerificacion.valorCop)}</span> está en verificación. Cuando tu banco
                lo confirme se aplica solo y aquí verás tu recibo.
              </span>
            )}
          </div>
        )}
      </Presence>
      <Presence show={!enVerificacion && Boolean(a.ultimoRechazo)} initial={false}>
        {a.ultimoRechazo && (
          <div data-testid="pago-rechazado" className="mt-3 flex gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-fg">
            <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
            <span>
              Tu último pago de <span className="font-mono">{formatCurrency(a.ultimoRechazo.valorCop)}</span> fue rechazado por la pasarela. No
              se te cobró nada; puedes intentarlo de nuevo.
            </span>
          </div>
        )}
      </Presence>

      {a.cuotas.length === 0 ? (
        <p className="mt-3 text-sm text-fg-muted">De este inmueble no tienes cuotas por pagar ahora.</p>
      ) : (
        <ul className="mt-3 space-y-1" aria-label={`Cuotas de ${nombreDelInmueble(a)}`}>
          {a.cuotas.map((c, i) => (
            <FilaDeCuota
              key={c.id}
              cuota={c}
              marcada={i < cuantas}
              deshabilitada={!sePuedeMarcar(a)}
              onTocar={() => onTocar(i)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilaDeCuota({
  cuota: c,
  marcada,
  deshabilitada,
  onTocar,
}: {
  cuota: CuotaQueSePuedePagar;
  marcada: boolean;
  deshabilitada: boolean;
  onTocar: () => void;
}) {
  const { formatCurrency } = useI18n();
  const id = useId();
  const [abierta, setAbierta] = useState(false);
  const lineas = c.lineas ?? [];
  const abonado = c.abonadoCop ?? 0;
  const conDesglose = lineas.length > 0 || abonado > 0 || c.interesCop > 0;
  return (
    <li data-testid={`cuota-${c.mes}`} className={cn('rounded-lg px-3 py-2 transition-colors', marcada ? 'bg-primary-soft/60' : 'hover:bg-surface-muted')}>
      <div className="flex items-center gap-3">
        <Checkbox
          id={id}
          checked={marcada}
          disabled={deshabilitada}
          onCheckedChange={onTocar}
          aria-describedby={`${id}-vence`}
        />
        <label htmlFor={id} className={cn('min-w-0 flex-1', deshabilitada ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
          <span className="block text-sm font-medium text-fg">Cuota de {mesEnPalabras(c.mes)}</span>
          <span id={`${id}-vence`} className={cn('block text-xs', c.vencida ? 'text-danger' : 'text-fg-muted')}>
            {c.vencida ? `Vencida desde el ${diaEnPalabras(c.vence)}` : `Vence el ${diaEnPalabras(c.vence)}`}
            {c.interesCop > 0 ? ` · incluye ${formatCurrency(c.interesCop)} de intereses` : ''}
          </span>
        </label>
        <span className="font-mono text-sm text-fg">{formatCurrency(c.valorCop)}</span>
      </div>
      {conDesglose && (
        <>
          <button
            type="button"
            onClick={() => setAbierta((v) => !v)}
            aria-expanded={abierta}
            aria-controls={`${id}-desglose`}
            data-testid={`ver-desglose-${c.mes}`}
            className="ml-8 mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {abierta ? 'Ocultar de qué es' : 'Ver de qué es'}
            <CaretDown className={cn('h-3 w-3 transition-transform duration-fast ease-enter', abierta && 'rotate-180')} />
          </button>
          <Collapse open={abierta}>
            <dl id={`${id}-desglose`} data-testid={`desglose-${c.mes}`} className="ml-8 mt-2 space-y-1 border-l border-border pl-3 text-xs">
              {lineas.map((l, k) => (
                <div key={`${l.nombre}-${k}`} className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0 text-fg-muted">{l.nombre}</dt>
                  <dd className="whitespace-nowrap font-mono text-fg">
                    {l.resta ? '−' : ''}
                    {formatCurrency(l.valorCop)}
                  </dd>
                </div>
              ))}
              {abonado > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-fg-muted">Ya abonaste</dt>
                  <dd className="whitespace-nowrap font-mono text-fg">−{formatCurrency(abonado)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1">
                <dt className="font-medium text-fg">Lo que pagas de esta cuota</dt>
                <dd className="whitespace-nowrap font-mono font-medium text-fg">{formatCurrency(c.valorCop)}</dd>
              </div>
            </dl>
          </Collapse>
        </>
      )}
    </li>
  );
}
