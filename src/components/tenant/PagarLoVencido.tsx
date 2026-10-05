'use client';

/**
 * «Pagar» lo vencido desde «Pagos» del portal (Nico, 04-10-2026, TAL CUAL):
 * Wompi (PSE, tarjeta, Nequi), todo lo vencido o las cuotas escogidas —siempre
 * de la más vieja a la más nueva: escoger una cuota marca las anteriores y
 * quitar una quita las más nuevas—, el total ANTES de ir a Wompi, sin sumar la
 * comisión de la pasarela (la asume la inmobiliaria). El pago se aplica solo
 * cuando Wompi lo confirma al back (nunca por la URL de vuelta); mientras tanto
 * dice «En verificación», y un rechazo se dice y deja reintentar.
 */
import { useState } from 'react';
import { AnimatedNumber, Presence } from '@leasefy/cadence';
import { CheckSquare, Square, Clock, WarningCircle, CreditCard, ArrowUpRight } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { getAccessToken } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { buildWompiCheckoutUrl } from '@/lib/payments/wompi-rent-session';
import { totalDeLasMasViejas, type LoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «1 de octubre de 2026» (la fecha de la casa). */
export function diaEnPalabras(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  return `${d} de ${MESES[(m || 1) - 1]} de ${a}`;
}
/** Cierra la frase sin el punto doble de «p. m.». */
export function conPunto(texto: string): string {
  return texto.endsWith('.') ? texto : `${texto}.`;
}
/** «6:47 p. m.» en Colombia. */
export function horaEnColombia(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
export function mesEnPalabras(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[(m || 1) - 1]} de ${a}`;
}

interface Props {
  leaseId: string;
  datos: LoQueSePuedePagar;
}

export function PagarLoVencido({ leaseId, datos }: Props) {
  const { formatCurrency } = useI18n();
  const { cuotas } = datos;
  const [cuantas, setCuantas] = useState(cuotas.length);
  const [confirmando, setConfirmando] = useState(false);
  const [yendo, setYendo] = useState(false);
  const total = totalDeLasMasViejas(cuotas, cuantas);
  const hayVencidas = cuotas.some((c) => c.vencida);
  const enVerificacion = datos.enVerificacion;

  const tocar = (i: number) => {
    setConfirmando(false);
    // Marcada → se quita ella y las más nuevas; sin marcar → se marcan hasta ella.
    setCuantas(i < cuantas ? i : i + 1);
  };

  const irAPagar = async () => {
    setYendo(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/inquilino/pagos/vencido/wompi-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ leaseId, cuotas: cuantas }),
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

  const rango =
    cuantas === 0
      ? ''
      : cuantas === 1
      ? `la cuota de ${mesEnPalabras(cuotas[0].mes)}`
      : `${cuantas} cuotas (${mesEnPalabras(cuotas[0].mes)} a ${mesEnPalabras(cuotas[cuantas - 1].mes)})`;

  return (
    <section data-testid="pagar-lo-vencido" className="rounded-xl border border-primary/30 bg-primary-soft p-6">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-sm font-medium text-primary">{hayVencidas ? 'Pagar lo vencido' : 'Pagar tu próxima cuota'}</h2>
      </div>
      <p className="mb-4 text-sm text-fg-muted">
        {hayVencidas ? 'Se paga de la cuota más vieja a la más nueva.' : 'Puedes adelantarla desde ya.'}
      </p>

      <Presence show={Boolean(enVerificacion)} initial={false}>
        {enVerificacion && (
          <div data-testid="pago-en-verificacion" className="mb-4 flex gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-fg">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            {enVerificacion.conTransaccion === false && enVerificacion.puedesReintentarDesde ? (
              /* QA-INQ-95: Wompi todavía no conoce el intento (no hay transacción): no se dice
                 «tu banco lo confirma» de un pago que tal vez nunca se hizo. */
              <span data-testid="pago-sin-terminar">
                Empezaste un pago de <span className="font-mono">{formatCurrency(enVerificacion.valorCop)}</span> y Wompi todavía
                no nos dice si lo terminaste. Si lo pagaste, se aplica solo cuando tu banco lo confirme; si no, podrás intentarlo
                de nuevo desde las {conPunto(horaEnColombia(enVerificacion.puedesReintentarDesde))}
              </span>
            ) : (
              <span>
                Tu pago de <span className="font-mono">{formatCurrency(enVerificacion.valorCop)}</span> está en verificación. Cuando
                tu banco lo confirme se aplica solo y aquí verás tu recibo.
              </span>
            )}
          </div>
        )}
      </Presence>
      <Presence show={!enVerificacion && Boolean(datos.ultimoRechazo)} initial={false}>
        {datos.ultimoRechazo && (
          <div data-testid="pago-rechazado" className="mb-4 flex gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-fg">
            <WarningCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
            <span>
              Tu último pago de <span className="font-mono">{formatCurrency(datos.ultimoRechazo.valorCop)}</span> fue rechazado
              por la pasarela. No se te cobró nada; puedes intentarlo de nuevo.
            </span>
          </div>
        )}
      </Presence>

      <ul className="space-y-1" aria-label="Cuotas que puedes pagar">
        {cuotas.map((c, i) => {
          const marcada = i < cuantas;
          const Icono = marcada ? CheckSquare : Square;
          return (
            <li key={c.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={marcada}
                data-testid={`cuota-${c.mes}`}
                onClick={() => tocar(i)}
                disabled={Boolean(enVerificacion)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  marcada ? 'bg-surface' : 'hover:bg-surface/60',
                  enVerificacion && 'cursor-not-allowed opacity-60',
                )}
              >
                <Icono weight={marcada ? 'fill' : 'regular'} className={cn('h-5 w-5 flex-shrink-0', marcada ? 'text-primary' : 'text-fg-subtle')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Cuota de {mesEnPalabras(c.mes)}</span>
                  <span className={cn('block text-xs', c.vencida ? 'text-danger' : 'text-fg-muted')}>
                    {c.vencida ? `Vencida desde el ${diaEnPalabras(c.vence)}` : `Vence el ${diaEnPalabras(c.vence)}`}
                    {c.interesCop > 0 ? ` · incluye ${formatCurrency(c.interesCop)} de intereses` : ''}
                  </span>
                </span>
                <span className="font-mono text-sm text-fg">{formatCurrency(c.valorCop)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-baseline justify-between border-t border-primary/30 pt-4">
        <span className="text-sm text-fg-muted">Total a pagar</span>
        <span data-testid="total-a-pagar" className="font-mono text-2xl font-bold text-fg">
          <AnimatedNumber value={total} format={(n) => formatCurrency(n)} />
        </span>
      </div>
      <p className="mt-1 text-xs text-fg-muted">Pagas exactamente esto: la comisión de la pasarela la asume la inmobiliaria.</p>

      <Presence show={confirmando && cuantas > 0} initial={false}>
        {confirmando && cuantas > 0 && (
          <div data-testid="confirmar-pago" className="mt-4 rounded-lg bg-surface p-4 text-sm text-fg">
            <p>
              Vas a pagar <span className="font-mono font-semibold">{formatCurrency(total)}</span> por {rango}. Te llevamos a
              Wompi para pagar con PSE, tarjeta o Nequi.
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
        <Button
          className="mt-4 w-full"
          hideArrow
          data-testid="pagar"
          disabled={cuantas === 0 || Boolean(enVerificacion)}
          onClick={() => setConfirmando(true)}
        >
          {cuantas === 0 ? 'Escoge al menos una cuota' : `Pagar ${formatCurrency(total)}`}
        </Button>
      )}
    </section>
  );
}
