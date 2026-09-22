'use client';

/**
 * El cobro automático del canon, en el portal del inquilino.
 *
 * 🔴 Esta pantalla decía «Próximamente» sobre un endpoint que no existía. Ya
 * existe (`/portal/autopago`), así que ahora autoriza de verdad.
 *
 * ── Las cuatro cosas que la pantalla NO puede dejar de decir ────────────────
 *
 * Es la única parte del producto donde alguien le da permiso al sistema para
 * sacarle plata sin mirar. Así que, antes de autorizar, se ve: QUIÉN cobra,
 * CUÁNTO como máximo, QUÉ DÍA, y que se puede cancelar cuando quiera. El texto
 * exacto lo manda el SERVIDOR y se muestra literal: si el front pudiera
 * redactarlo, cambiar una palabra acá cambiaría el consentimiento.
 *
 * ── Y el tope no viene sugerido con el canon ────────────────────────────────
 *
 * Se propone, sí, pero la persona lo escribe. Un tope prellenado con el canon
 * exacto se queda corto el primer mes que haya una cuota de administración o un
 * mes prorrateado, y el cobro se cae con «pasa del tope» sin que nadie entienda
 * por qué. La pantalla lo explica en una línea.
 *
 * 🔴 El número de la tarjeta sólo lo ve `tokenizarTarjeta`, que lo manda a Wompi
 * y a nadie más. No pasa por nuestro back ni se guarda acá.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowsClockwise,
  CalendarDots,
  CheckCircle,
  CreditCard,
  Lock,
  WarningCircle,
} from '@phosphor-icons/react';

import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EmptyState } from '@/components/ui/empty-state';
import {
  autopagoApi,
  tokenizarTarjeta,
  type ComoSeTokeniza,
  type EstadoDelAutopago,
} from '@/lib/api/autopago.service';

interface AutopagoSectionProps {
  /** El CONTRATO del arriendo activo. `null` mientras no haya. */
  contractId: string | null;
  /** El canon, sólo para proponer un tope. La persona lo puede cambiar. */
  canonCop?: number | null;
}

const ESTADO_EN_PALABRAS: Record<string, string> = {
  APROBADO: 'Cobrado',
  RECHAZADO: 'Rechazado',
  PENDIENTE: 'En verificación',
  ERROR: 'No se pudo intentar',
};

function pesos(valorCop: number): string {
  return `$${valorCop.toLocaleString('es-CO')}`;
}

export function AutopagoSection({ contractId, canonCop }: AutopagoSectionProps) {
  const [estado, setEstado] = useState<EstadoDelAutopago | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tokenizacion, setTokenizacion] = useState<ComoSeTokeniza | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  // Un tope PROPUESTO con holgura, no el canon exacto: ver el encabezado.
  const topePropuesto = useMemo(
    () => (canonCop && canonCop > 0 ? Math.ceil((canonCop * 1.3) / 10_000) * 10_000 : 0),
    [canonCop],
  );

  const [dia, setDia] = useState('5');
  const [tope, setTope] = useState('');
  const [numero, setNumero] = useState('');
  const [cvc, setCvc] = useState('');
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState('');
  const [nombre, setNombre] = useState('');
  const [acepta, setAcepta] = useState(false);

  useEffect(() => {
    if (topePropuesto > 0 && tope === '') setTope(String(topePropuesto));
  }, [topePropuesto, tope]);

  const cargar = useCallback(async () => {
    if (!contractId) return;
    setError(null);
    try {
      const [e, t] = await Promise.all([
        autopagoApi.estado(contractId),
        autopagoApi.comoSeTokeniza(),
      ]);
      setEstado(e);
      setTokenizacion(t);
    } catch (e) {
      // El error ENTERO: `EstadoDeDatos` necesita status y code para saber si
      // fue la sesión, el segundo factor o nosotros.
      setError(e);
    }
  }, [contractId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const autorizar = useCallback(async () => {
    if (!contractId || !tokenizacion?.llavePublica || !tokenizacion.ambiente) return;
    const topeNumero = Number(tope.replace(/[^\d]/g, ''));
    if (!topeNumero) {
      toast.error('Escribe hasta cuánto autorizas por mes.');
      return;
    }
    setTrabajando(true);
    try {
      const token = await tokenizarTarjeta(
        tokenizacion.llavePublica,
        tokenizacion.ambiente,
        {
          numero,
          cvc,
          mesDeVencimiento: mes.padStart(2, '0'),
          anioDeVencimiento: anio.slice(-2),
          nombreEnLaTarjeta: nombre,
        },
      );
      const nuevo = await autopagoApi.activar({
        contractId,
        token,
        metodo: 'CARD',
        diaDelMes: Number(dia),
        topeCop: topeNumero,
        // El texto que se autoriza va tal como lo mandó el servidor.
        autorizacionTexto: tokenizacion.textoDeAutorizacion,
      });
      setEstado(nuevo);
      setFormulario(false);
      // Los datos de la tarjeta se borran de memoria en cuanto dejan de servir.
      setNumero('');
      setCvc('');
      setMes('');
      setAnio('');
      setNombre('');
      setAcepta(false);
      toast.success('Cobro automático activado');
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : 'No pudimos activar el cobro automático.',
      );
    } finally {
      setTrabajando(false);
    }
  }, [contractId, tokenizacion, tope, numero, cvc, mes, anio, nombre, dia]);

  const cambiarEstado = useCallback(
    async (activar: boolean) => {
      if (!contractId) return;
      setTrabajando(true);
      try {
        setEstado(await autopagoApi.pausarOReactivar(contractId, activar));
        toast.success(activar ? 'Cobro automático activo' : 'Cobro automático pausado');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo cambiar.');
      } finally {
        setTrabajando(false);
      }
    },
    [contractId],
  );

  const cancelar = useCallback(async () => {
    if (!contractId) return;
    setTrabajando(true);
    try {
      setEstado(await autopagoApi.cancelar(contractId));
      toast.success('Cobro automático cancelado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar.');
    } finally {
      setTrabajando(false);
    }
  }, [contractId]);

  const cobrarAhora = useCallback(async () => {
    if (!contractId) return;
    setTrabajando(true);
    try {
      const r = await autopagoApi.cobrarAhora(contractId);
      if (r.cobrado) toast.success('Pago realizado');
      else toast.error(r.motivo ?? 'No se pudo cobrar.');
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cobrar.');
    } finally {
      setTrabajando(false);
    }
  }, [contractId, cargar]);

  if (!contractId) return null;

  const puedeAutorizar =
    acepta && numero.length >= 12 && cvc.length >= 3 && mes !== '' && anio !== '' && nombre !== '';

  return (
    <section
      data-testid="autopago"
      className="rounded-xl border border-border dark:border-border-strong bg-surface dark:bg-[#1a1a1c] p-6 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-muted dark:bg-[#2a2a2c] flex items-center justify-center flex-shrink-0">
          <ArrowsClockwise className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-fg dark:text-white">
            Cobro automático del canon
          </h2>
          <p className="text-sm text-fg-muted dark:text-fg-subtle">
            Tu arriendo se paga solo el día que elijas, hasta el tope que autorices.
          </p>
        </div>
      </div>

      <EstadoDeDatos
        cargando={estado === null && !error}
        error={error}
        queEs="el cobro automático"
        onReintentar={cargar}
      >
        {estado && !estado.disponible && (
          <EmptyState
            icon={WarningCircle}
            title="Todavía no disponible"
            description={estado.motivo ?? 'Vuelve a intentar más adelante.'}
          />
        )}

        {estado?.disponible && estado.autopago && (
          <div className="space-y-4" data-testid="autopago-activo">
            <div className="rounded-lg border border-border dark:border-border-strong p-4 space-y-2">
              <p className="flex items-center gap-2 font-medium text-fg dark:text-white">
                {estado.activo ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <WarningCircle className="w-4 h-4 text-warning" />
                )}
                {estado.activo ? 'Activo' : 'Pausado'}
              </p>
              <p className="flex items-center gap-2 text-sm text-fg-muted dark:text-fg-subtle">
                <CreditCard className="w-4 h-4" />
                {estado.autopago.marca ?? estado.autopago.metodo}{' '}
                {estado.autopago.medioEnmascarado ?? ''}
              </p>
              <p className="flex items-center gap-2 text-sm text-fg-muted dark:text-fg-subtle">
                <CalendarDots className="w-4 h-4" />
                Cada día {estado.autopago.diaDelMes}, hasta {pesos(estado.autopago.topeCop)}
                {estado.activo && estado.autopago.proximoCobro
                  ? ` · próximo: ${estado.autopago.proximoCobro}`
                  : ''}
              </p>
              {estado.autopago.fallosSeguidos > 0 && (
                <p className="text-sm text-warning">
                  {estado.autopago.fallosSeguidos} intento
                  {estado.autopago.fallosSeguidos === 1 ? '' : 's'} sin éxito. Revisa tu medio de
                  pago.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                hideArrow
                disabled={trabajando}
                onClick={() => void cambiarEstado(!estado.activo)}
              >
                {estado.activo ? 'Pausar' : 'Reactivar'}
              </Button>
              {estado.activo && (
                <Button variant="secondary" hideArrow disabled={trabajando} onClick={() => void cobrarAhora()}>
                  Pagar ahora con este medio
                </Button>
              )}
              <Button variant="secondary" hideArrow disabled={trabajando} onClick={() => void cancelar()}>
                Cancelar
              </Button>
            </div>

            {estado.cobros.length > 0 && (
              <ul className="space-y-1.5" data-testid="autopago-cobros">
                {estado.cobros.map((c) => (
                  <li key={c.id} className="text-sm text-fg-muted dark:text-fg-subtle">
                    {c.mes} · {pesos(c.montoCop)} ·{' '}
                    {ESTADO_EN_PALABRAS[c.estado] ?? c.estado}
                    {c.motivo ? ` — ${c.motivo}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {estado?.disponible && !estado.autopago && !formulario && (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              Todavía no tienes cobro automático. Puedes activarlo con una tarjeta y cancelarlo
              cuando quieras.
            </p>
            <Button
              variant="secondary"
              hideArrow
              disabled={!tokenizacion?.disponible}
              title={tokenizacion?.motivo ?? undefined}
              onClick={() => setFormulario(true)}
            >
              Activar cobro automático
            </Button>
            {tokenizacion && !tokenizacion.disponible && (
              <p className="text-sm text-fg-muted dark:text-fg-subtle">{tokenizacion.motivo}</p>
            )}
          </div>
        )}

        {estado?.disponible && !estado.autopago && formulario && tokenizacion?.disponible && (
          <div className="space-y-4" data-testid="autopago-formulario">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm text-fg-muted dark:text-fg-subtle">Día del cobro</span>
                <Input
                  id="autopago-dia"
                  inputMode="numeric"
                  value={dia}
                  onChange={(e) => setDia(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                />
                <span className="text-xs text-fg-subtle">
                  Del 1 al 28. No hay 29, 30 ni 31 porque no todos los meses los tienen.
                </span>
              </label>
              <label className="space-y-1">
                <span className="text-sm text-fg-muted dark:text-fg-subtle">
                  Hasta cuánto autorizas por mes
                </span>
                <Input
                  id="autopago-tope"
                  inputMode="numeric"
                  value={tope}
                  onChange={(e) => setTope(e.target.value.replace(/[^\d]/g, ''))}
                />
                <span className="text-xs text-fg-subtle">
                  Déjalo un poco por encima de tu canon: si un mes se cobra administración o un
                  ajuste, un tope justo lo dejaría por fuera y no se cobraría nada.
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-fg-muted dark:text-fg-subtle">Nombre en la tarjeta</span>
                <Input id="autopago-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-fg-muted dark:text-fg-subtle">Número</span>
                <Input
                  id="autopago-numero"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/[^\d\s]/g, ''))}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-fg-muted dark:text-fg-subtle">Vence (MM / AAAA)</span>
                <div className="flex gap-2">
                  <Input
                    id="autopago-mes"
                    inputMode="numeric"
                    value={mes}
                    onChange={(e) => setMes(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  />
                  <Input
                    id="autopago-anio"
                    inputMode="numeric"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-sm text-fg-muted dark:text-fg-subtle">CVC</span>
                <Input
                  id="autopago-cvc"
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                />
              </label>
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-surface-muted dark:bg-[#2a2a2c] px-4 py-3 text-xs text-fg-muted dark:text-fg-subtle">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Los datos de tu tarjeta viajan directo a la pasarela de pagos. No pasan por
                Leasefy ni quedan guardados acá: sólo guardamos los cuatro últimos dígitos para
                que reconozcas tu medio.
              </span>
            </p>

            {/* 🔴 El texto que se autoriza lo manda el SERVIDOR y se muestra literal. */}
            <label className="flex items-start gap-3 text-sm text-fg dark:text-white">
              <Checkbox id="autopago-acepta" checked={acepta} onCheckedChange={(marcada: boolean) => setAcepta(marcada)} className="mt-1" />
              <span data-testid="autopago-autorizacion">{tokenizacion.textoDeAutorizacion}</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                hideArrow
                disabled={!puedeAutorizar || trabajando}
                onClick={() => void autorizar()}
              >
                {trabajando ? <Spinner size="sm" /> : 'Autorizar'}
              </Button>
              <Button variant="secondary" hideArrow disabled={trabajando} onClick={() => setFormulario(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </EstadoDeDatos>
    </section>
  );
}
