'use client';

/**
 * «¿Desde qué cuenta salió?» — la pregunta que le faltaba a «Marcar como
 * girada».
 *
 * Nico (23-09): «que "Marcar como girada" pregunte el banco de origen». El
 * correo «Te giramos» le dice al propietario desde qué cuenta de la
 * inmobiliaria salió su plata —lo que busca en el extracto de su banco para
 * reconocerla—. El lote ya lo preguntaba al armarse (`ElegirBancoDeOrigen`);
 * el giro suelto no, y el correo decía «No quedó registrado desde qué banco
 * salió».
 *
 * A diferencia del lote, acá no hay archivo: la persona ya transfirió desde el
 * portal del banco. Por eso no hay formatos ni avisos de archivo, sólo el
 * banco, el tipo y el número —con los mismos controles del lote
 * (`CamposDeLaCuentaDeOrigen`)—. Se propone la última cuenta de la agencia,
 * venga de un lote o de otro giro suelto.
 *
 * Sin la migración del back (`disponible: false`) no se pregunta nada: se
 * marca girada como antes y se dice por qué.
 */

import { useEffect, useMemo, useState } from 'react';

import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { dispersionesApi } from '@/lib/api/inmobiliaria.service';
import type {
  OpcionesDelOrigenDelGiro,
  OrigenPedido,
  TipoDeCuentaDeOrigen,
} from '@/lib/api/lotes-de-dispersion.types';

import { CamposDeLaCuentaDeOrigen, cuentaEscritaValida } from './lotes/CamposDeLaCuentaDeOrigen';

/** Lo que «Marcar como girada» necesita para habilitar el botón. */
export interface EleccionDelOrigenDelGiro {
  /** `null` = no hay nada que mandar (sin elegir, o sin la migración). */
  origen: OrigenPedido | null;
  /** `true` = se puede marcar girada con esto. */
  listo: boolean;
}

export function ElegirCuentaDeOrigenDelGiro({
  onCambio,
  deshabilitado = false,
}: {
  onCambio: (e: EleccionDelOrigenDelGiro) => void;
  /** Quien aprobó no marca girada: los controles se ven, apagados. */
  deshabilitado?: boolean;
}) {
  const { t } = useI18n();
  const [datos, setDatos] = useState<OpcionesDelOrigenDelGiro | null>(null);
  /** `mensaje: null` = falló sin decir por qué: se dice con la frase de siempre. */
  const [error, setError] = useState<{ mensaje: string | null } | null>(null);
  const [banco, setBanco] = useState<string>('');
  const [tipo, setTipo] = useState<TipoDeCuentaDeOrigen>('AHORROS');
  const [numero, setNumero] = useState('');

  useEffect(() => {
    let vigente = true;
    dispersionesApi
      .origenDelGiro()
      .then((r) => {
        if (!vigente) return;
        setDatos(r);
        // La última cuenta de la agencia; si nunca giró con origen, la primera
        // registrada en Medios de pago de un banco que conocemos.
        if (r.ultima) {
          setBanco(r.ultima.banco);
          setTipo(r.ultima.tipoDeCuenta);
          setNumero(r.ultima.numeroDeCuenta);
          return;
        }
        const registrada = r.cuentas.find((c) => c.banco);
        if (registrada?.banco) {
          setBanco(registrada.banco);
          if (registrada.tipoDeCuenta) setTipo(registrada.tipoDeCuenta);
          setNumero(registrada.numeroDeCuenta);
        }
      })
      .catch((e: unknown) => {
        if (vigente) setError({ mensaje: e instanceof Error && e.message ? e.message : null });
      });
    return () => {
      vigente = false;
    };
  }, []);

  const elegido = useMemo(() => datos?.bancos.find((b) => b.id === banco) ?? null, [datos, banco]);
  const cuentasDelBanco = useMemo(() => (datos?.cuentas ?? []).filter((c) => c.banco === banco), [datos, banco]);
  const numeroValido = cuentaEscritaValida(numero);

  useEffect(() => {
    // Sin poder leer las opciones, el back es el que decide: si exige el
    // origen responde 400 con el motivo, y la pantalla lo muestra.
    if (error) {
      onCambio({ origen: null, listo: true });
      return;
    }
    if (!datos) {
      onCambio({ origen: null, listo: false });
      return;
    }
    if (!datos.disponible) {
      onCambio({ origen: null, listo: true });
      return;
    }
    if (!elegido || !numeroValido) {
      onCambio({ origen: null, listo: false });
      return;
    }
    onCambio({
      origen: { banco: elegido.id, tipoDeCuenta: tipo, numeroDeCuenta: numero.trim() },
      listo: true,
    });
  }, [datos, error, elegido, tipo, numero, numeroValido, onCambio]);

  if (error) {
    return (
      <p role="alert" className="text-caption text-danger" data-testid="origen-del-giro-error">
        {error.mensaje ?? t('inmobiliaria.dispersiones.origenDelGiro.errorAlCargar')}
      </p>
    );
  }

  if (!datos) {
    return (
      <p className="flex items-center gap-2 text-caption text-fg-muted">
        <Spinner size="sm" variant="current" />
        {t('inmobiliaria.dispersiones.origenDelGiro.cargando')}
      </p>
    );
  }

  if (!datos.disponible) {
    return (
      <p className="text-caption text-fg-muted" data-testid="origen-del-giro-sin-migracion">
        {datos.motivo}
      </p>
    );
  }

  const elegirBanco = (id: string) => {
    setBanco(id);
    // Al cambiar de banco, la cuenta escrita era de OTRO banco: se propone la
    // última si era de éste, o la registrada de éste, o se deja vacía.
    const ultima = datos.ultima?.banco === id ? datos.ultima : null;
    const registrada = datos.cuentas.find((c) => c.banco === id);
    setNumero(ultima?.numeroDeCuenta ?? registrada?.numeroDeCuenta ?? '');
    setTipo(ultima?.tipoDeCuenta ?? registrada?.tipoDeCuenta ?? 'AHORROS');
  };

  return (
    <fieldset className="space-y-3" disabled={deshabilitado} data-testid="origen-del-giro">
      <div className="space-y-1.5">
        <label htmlFor="origen-del-giro-banco" className="block text-sm font-medium text-fg">
          {t('inmobiliaria.dispersiones.origenDelGiro.pregunta')}
        </label>
        <select
          id="origen-del-giro-banco"
          data-testid="origen-del-giro-banco"
          value={banco}
          onChange={(e) => elegirBanco(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="" disabled>
            {t('inmobiliaria.dispersiones.origenDelGiro.elegirBanco')}
          </option>
          {datos.bancos.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
        <p className="text-caption text-fg-muted">
          {t('inmobiliaria.dispersiones.origenDelGiro.ayuda')}
          {/* 🔴 23-09 (QA): «Te proponemos la última cuenta desde la que
              giraste» salía aunque la agencia nunca hubiera girado. */}
          {datos.ultima ? ` ${t('inmobiliaria.dispersiones.origenDelGiro.teProponemosLaUltima')}` : null}
        </p>
      </div>
      {elegido && (
        <CamposDeLaCuentaDeOrigen
          nombreDelBanco={elegido.nombre}
          cuentas={cuentasDelBanco}
          tipo={tipo}
          onTipo={setTipo}
          numero={numero}
          onNumero={setNumero}
          idDelNumero="numero-de-cuenta-origen-del-giro"
        />
      )}
    </fieldset>
  );
}
