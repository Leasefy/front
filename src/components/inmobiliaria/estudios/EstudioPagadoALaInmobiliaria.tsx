'use client';

/**
 * 🔴 El estudio del inquilino, pagado a la INMOBILIARIA (17-09-2026).
 *
 * Nico y Juan Camilo: «el solicitante le paga a la inmobiliaria → recibo de
 * caja + factura»; «no se devuelve, pero el resultado le sirve durante su
 * vigencia para postularse a cualquier inmueble de la inmobiliaria».
 *
 * En la ficha del candidato:
 *   · si ya pagó un estudio VIGENTE en esta inmobiliaria, se dice con el recibo
 *     y hasta cuándo — no se le vuelve a cobrar (lo ve también el asesor, sin
 *     la plata);
 *   · si no, quien hace caja (`cobros:create`) registra el pago: sale el recibo
 *     con el consecutivo de la agencia y la factura queda generada.
 */

import { useCallback, useEffect, useState } from 'react';
import { Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { formatCurrency } from '@/lib/format';
import { estudiosApi, type EstudioVigente } from '@/lib/api/estudios.service';

function dia(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function EstudioPagadoALaInmobiliaria({ applicationId }: { applicationId: string }) {
  const permisos = usePermissionsContextSafe();
  const [estado, setEstado] = useState<EstudioVigente | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState('');
  const [medio, setMedio] = useState('transferencia');
  const [referencia, setReferencia] = useState('');

  const cargar = useCallback(async () => {
    try {
      setEstado(await estudiosApi.vigente(applicationId));
    } catch {
      setEstado(null);
    }
  }, [applicationId]);

  useEffect(() => {
    if (permisos) void cargar();
  }, [cargar, permisos]);

  // Fuera del panel de la inmobiliaria (el propietario directo) no hay caja.
  if (!permisos) return null;
  const puedeCobrar = permisos.canAccess('cobros', 'create');

  const registrar = async () => {
    const valorCop = Number(valor.replace(/\D/g, ''));
    if (!valorCop || registrando) return;
    setRegistrando(true);
    try {
      const pago = await estudiosApi.registrarPago({
        applicationId,
        valorCop,
        medio,
        referencia: referencia.trim() || undefined,
      });
      toast.success(`Recibo #${pago.numeroRecibo} del estudio`, {
        description: `Factura generada por ${formatCurrency(pago.factura.totalCop)}. Le sirve ${pago.diasQueLeQuedan} días, hasta el ${dia(pago.vigenteHasta)}.`,
      });
      setAbierto(false);
      await cargar();
    } catch (error) {
      toast.error('No se pudo registrar el pago del estudio', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-surface-muted p-3 space-y-2" data-testid="estudio-pagado">
      <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
        Estudio pagado a la inmobiliaria
      </p>
      {estado?.vigente ? (
        <p className="text-xs text-fg-muted" data-testid="estudio-vigente">
          Ya pagó el estudio (recibo #{estado.numeroRecibo}, el {dia(estado.pagadoEl)}). Le sirve hasta el{' '}
          {dia(estado.vigenteHasta)} para cualquier inmueble de la inmobiliaria: no se le vuelve a cobrar.
        </p>
      ) : (
        <p className="text-xs text-fg-muted" data-testid="estudio-sin-pago">
          No tiene un estudio pagado y vigente acá. El estudio lo paga el solicitante, no se devuelve y le sirve{' '}
          {estado?.vigenciaDias ?? 60} días para cualquier inmueble de la inmobiliaria.
        </p>
      )}
      {!estado?.vigente && puedeCobrar && !abierto && (
        <Button size="sm" variant="outline" hideArrow onClick={() => setAbierto(true)} data-testid="estudio-registrar">
          Registrar el pago del estudio
        </Button>
      )}
      {abierto && (
        <div className="space-y-2" data-testid="estudio-formulario">
          <input
            className="w-full rounded-md border border-border bg-surface p-2 text-sm"
            inputMode="numeric"
            placeholder="Valor pagado"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            data-testid="estudio-valor"
          />
          <select
            className="w-full rounded-md border border-border bg-surface p-2 text-sm"
            value={medio}
            onChange={(e) => setMedio(e.target.value)}
            data-testid="estudio-medio"
          >
            <option value="transferencia">Transferencia</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="pse">PSE</option>
            <option value="cheque">Cheque</option>
            <option value="otro">Otro</option>
          </select>
          <input
            className="w-full rounded-md border border-border bg-surface p-2 text-sm"
            placeholder="Referencia (opcional)"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" hideArrow onClick={() => void registrar()} disabled={registrando} data-testid="estudio-confirmar">
              {registrando ? 'Registrando…' : 'Emitir recibo y factura'}
            </Button>
            <Button size="sm" variant="ghost" hideArrow onClick={() => setAbierto(false)} disabled={registrando}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
