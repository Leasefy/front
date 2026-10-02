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
 *
 * Sistema de errores (02-10-2026): el valor se revisa antes de mandar con el
 * tope y la frase del back; lo que el back rechace va debajo de su campo, y lo
 * demás a un toast por el traductor (un 5xx con la referencia; «conexión»
 * sólo sin respuesta). Antes el toast pintaba `error.message` crudo.
 */

import { useCallback, useEffect, useState } from 'react';
import { Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import {
  MAX_LARGO_REFERENCIA_DEL_PAGO,
  revisarValorDelEstudio,
} from '@/lib/estudios/limites-del-pago-del-estudio';
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
  const [erroresDelServidor, setErroresDelServidor] = useState<
    Partial<Record<'valorCop' | 'referencia', string>>
  >({});

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

  const digitos = valor.replace(/\D/g, '');
  const valorCop = digitos ? Number(digitos) : null;
  const errorDelValor = revisarValorDelEstudio(valorCop) ?? erroresDelServidor.valorCop;

  const registrar = async () => {
    if (!valorCop || revisarValorDelEstudio(valorCop) || registrando) return;
    setErroresDelServidor({});
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
      const reparto = repartirErroresDelServidor(error, {
        campos: ['valorCop', 'referencia'],
        porDefecto: 'Prueba de nuevo en un momento.',
        accion: 'registrar el pago del estudio',
      });
      setErroresDelServidor(reparto.porCampo);
      const primero = reparto.orden[0];
      if (primero) document.getElementById(primero === 'valorCop' ? 'estudio-valor' : 'estudio-referencia')?.focus();
      if (reparto.sueltos.length) {
        toast.error('No se pudo registrar el pago del estudio', {
          description: reparto.sueltos.join(' · '),
        });
      }
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
          <div>
            <input
              id="estudio-valor"
              className="w-full rounded-md border border-border bg-surface p-2 text-sm"
              inputMode="numeric"
              placeholder="Valor pagado"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value);
                setErroresDelServidor((prev) => ({ ...prev, valorCop: undefined }));
              }}
              aria-invalid={errorDelValor ? true : undefined}
              aria-describedby={errorDelValor ? 'estudio-valor-error' : undefined}
              data-testid="estudio-valor"
            />
            <ErrorDelCampo id="estudio-valor-error" mensaje={errorDelValor} />
          </div>
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
          <div>
            <input
              id="estudio-referencia"
              className="w-full rounded-md border border-border bg-surface p-2 text-sm"
              placeholder="Referencia (opcional)"
              value={referencia}
              maxLength={MAX_LARGO_REFERENCIA_DEL_PAGO}
              onChange={(e) => {
                setReferencia(e.target.value);
                setErroresDelServidor((prev) => ({ ...prev, referencia: undefined }));
              }}
              aria-invalid={erroresDelServidor.referencia ? true : undefined}
              aria-describedby={erroresDelServidor.referencia ? 'estudio-referencia-error' : undefined}
            />
            <ErrorDelCampo id="estudio-referencia-error" mensaje={erroresDelServidor.referencia} />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              hideArrow
              onClick={() => void registrar()}
              disabled={registrando || Boolean(revisarValorDelEstudio(valorCop))}
              data-testid="estudio-confirmar"
            >
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
