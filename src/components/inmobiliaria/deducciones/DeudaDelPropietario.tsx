'use client';

/**
 * Lo que el propietario le DEBE a la inmobiliaria, en su ficha.
 *
 * Nico y Juan Camilo (2026-09-16): «propietario con deducción o saldo en contra
 * que ya no tiene más liquidaciones (se le terminó el único contrato o
 * consignación): se le cobra». Cuándo es deuda lo decide el back
 * (`deuda-del-propietario.ts`): acá no se suma nada, se pinta lo que llega.
 *
 * Sólo aparece cuando debe algo o cuando ya tiene cuentas de cobro: a un
 * propietario al día no se le pone un bloque en $0 que se lea como alarma.
 * Generar la cuenta de cobro pide `dispersiones:create`, como registrar un
 * descuento.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Receipt } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { deduccionesApi } from '@/lib/api/deducciones.service';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { DeudaDelPropietario as Deuda } from '@/lib/types/deducciones';
import { mesEnTitulo } from '@/lib/utils/mes';

export function rutaDeLaCuentaDeCobro(propietarioId: string, cuentaId: string): string {
  return `/panel/inmobiliaria/propietarios/${propietarioId}/cuenta-de-cobro/${cuentaId}`;
}

export function DeudaDelPropietario({ propietarioId }: { propietarioId: string }) {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.deducciones.deuda.${s}`;
  const { canAccess } = usePermissions();
  const puedeGenerar = canAccess('dispersiones', 'create');

  const [deuda, setDeuda] = useState<Deuda | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDeuda(await deduccionesApi.deuda(propietarioId));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [propietarioId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const generar = async () => {
    setGenerando(true);
    try {
      const cuenta = await deduccionesApi.generarCuentaDeCobro(propietarioId);
      toast.success(t(k('generada'), { numero: cuenta.numero }));
      await cargar();
    } catch (e) {
      toast.error(t(k('noSeGenero')), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGenerando(false);
    }
  };

  // Sin deuda y sin cuentas no hay nada que decir; un error sí se dice.
  const hayQueMostrar =
    Boolean(error) ||
    (deuda?.disponible === true &&
      (deuda.debeCop > 0 || deuda.cuentasDeCobro.length > 0));
  if (!cargando && !hayQueMostrar) return null;
  if (cargando && !deuda) return null;

  const idioma = locale === 'en' ? 'en' : 'es';

  return (
    <div
      className="rounded-lg border border-warning/40 bg-warning-soft p-4"
      data-testid="deuda-del-propietario"
    >
      <EstadoDeDatos
        cargando={false}
        error={error}
        queEs={t(k('queEs'))}
        onReintentar={cargar}
      >
        {deuda && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Receipt className="h-4 w-4 text-warning" aria-hidden="true" />
                  {t(k('titulo'))}
                </p>
                <p className="max-w-xl text-xs text-fg-muted">{t(k('descripcion'))}</p>
              </div>
              <div className="text-right">
                <p
                  className="font-mono text-2xl font-semibold tabular-nums text-fg"
                  data-testid="deuda-total"
                >
                  {formatCurrency(deuda.debeCop)}
                </p>
                {deuda.desde && (
                  <p className="text-xs text-fg-muted">
                    {t(k('desde'), { mes: mesEnTitulo(deuda.desde, idioma) })}
                  </p>
                )}
              </div>
            </div>

            {deuda.renglones.length > 0 && (
              <ul className="space-y-1 text-sm" data-testid="deuda-renglones">
                {deuda.renglones.map((r) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-4">
                    <span className="text-fg">
                      {t(`inmobiliaria.deducciones.origen.${r.origen}`)}
                      {r.origen !== 'SALDO_ANTERIOR' && `: ${r.motivo}`}
                      {/* 🔴 Lo viejo que es cada renglón, con el MISMO reloj con
                          que la cartera lo mete en su tramo: el back manda
                          `dias`, acá no se resta nada. */}
                      <span className="ml-2 text-xs text-fg-muted" data-testid="edad-del-renglon">
                        {r.dias === 1 ? t(k('diaUno')) : t(k('dias'), { dias: r.dias })}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums text-fg">
                      {formatCurrency(r.valorCop)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 border-t border-warning/30 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {deuda.cuentasDeCobro.map((c) => (
                  <Link
                    key={c.id}
                    href={rutaDeLaCuentaDeCobro(propietarioId, c.id)}
                    className="text-primary underline-offset-4 hover:underline"
                    data-testid={`cuenta-de-cobro-${c.numero}`}
                  >
                    {t(k('verCuenta'), { numero: c.numero })}
                  </Link>
                ))}
                {deuda.sinCuentaDeCobroCop > 0 && deuda.cuentasDeCobro.length > 0 && (
                  <span className="text-fg-muted">
                    {t(k('sinCuentaDeCobro'), {
                      valor: formatCurrency(deuda.sinCuentaDeCobroCop),
                    })}
                  </span>
                )}
                {!deuda.cuentaDeCobroDisponible && (
                  <span className="text-fg-muted" data-testid="cuenta-de-cobro-sin-migrar">
                    {t(k('sinMigrar'))}
                  </span>
                )}
              </div>
              {puedeGenerar &&
                deuda.cuentaDeCobroDisponible &&
                deuda.sinCuentaDeCobroCop > 0 && (
                  <Button
                    hideArrow
                    size="sm"
                    onClick={() => void generar()}
                    isLoading={generando}
                    data-testid="generar-cuenta-de-cobro"
                  >
                    {generando ? t(k('generando')) : t(k('generar'))}
                  </Button>
                )}
            </div>
          </div>
        )}
      </EstadoDeDatos>
    </div>
  );
}
