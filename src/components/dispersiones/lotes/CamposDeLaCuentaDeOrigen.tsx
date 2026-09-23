'use client';

/**
 * La cuenta de la inmobiliaria desde la que sale la plata: tipo y número, con
 * las cuentas de Medios de pago de ESE banco a un clic.
 *
 * La comparten las dos preguntas del «¿desde qué banco?»: el armado del lote
 * (`ElegirBancoDeOrigen`, que además elige el formato del archivo) y «Marcar
 * como girada» (`ElegirCuentaDeOrigenDelGiro`, Nico 23-09). Mismos controles
 * en las dos: quien gira de las dos formas no aprende dos pantallas.
 */

import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import type { CuentaRegistrada, TipoDeCuentaDeOrigen } from '@/lib/api/lotes-de-dispersion.service';
import { cn } from '@/lib/utils';
import { hrefDeSeccion } from '@/app/panel/inmobiliaria/configuracion/secciones';

const TIPOS: TipoDeCuentaDeOrigen[] = ['AHORROS', 'CORRIENTE'];

/** Lo que se escribe a mano: dígitos, con guiones o espacios si los trae. */
export function cuentaEscritaValida(texto: string): boolean {
  const limpio = texto.trim();
  return /^[\d\s.-]+$/.test(limpio) && /\d/.test(limpio);
}

export function CamposDeLaCuentaDeOrigen({
  nombreDelBanco,
  cuentas,
  tipo,
  onTipo,
  numero,
  onNumero,
  idDelNumero = 'numero-de-cuenta-origen',
}: {
  nombreDelBanco: string;
  /** Las cuentas de Medios de pago de ESTE banco. */
  cuentas: CuentaRegistrada[];
  tipo: TipoDeCuentaDeOrigen;
  onTipo: (t: TipoDeCuentaDeOrigen) => void;
  numero: string;
  onNumero: (n: string) => void;
  /** Dos preguntas en la misma página no pueden compartir el `id`. */
  idDelNumero?: string;
}) {
  const { t } = useI18n();
  const numeroValido = cuentaEscritaValida(numero);
  const idDelTipo = `${idDelNumero}-tipo`;

  return (
    <div className="space-y-3">
      {cuentas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-fg-muted">
            {t('inmobiliaria.dispersiones.cuentaDeOrigen.tusCuentas', { banco: nombreDelBanco })}
          </span>
          {cuentas.map((c) => (
            <button
              key={c.medioDePagoId}
              type="button"
              onClick={() => {
                onNumero(c.numeroDeCuenta);
                if (c.tipoDeCuenta) onTipo(c.tipoDeCuenta);
              }}
              className="rounded-full border border-border px-2.5 py-1 text-caption text-fg hover:border-border-strong"
            >
              {c.nombre} · <span className="font-mono">{c.numeroDeCuenta}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="block text-caption text-fg-muted" id={idDelTipo}>
            {t('inmobiliaria.dispersiones.cuentaDeOrigen.tipo')}
          </span>
          <div role="radiogroup" aria-labelledby={idDelTipo} className="flex gap-1">
            {TIPOS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tipo === id}
                onClick={() => onTipo(id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm',
                  tipo === id ? 'border-primary bg-primary-soft text-fg' : 'border-border text-fg-muted',
                )}
              >
                {t(`inmobiliaria.dispersiones.cuentaDeOrigen.tipos.${id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={idDelNumero} className="text-caption text-fg-muted">
            {t('inmobiliaria.dispersiones.cuentaDeOrigen.numero', { banco: nombreDelBanco })}
          </Label>
          <Input
            id={idDelNumero}
            inputMode="numeric"
            value={numero}
            onChange={(e) => onNumero(e.target.value)}
            className="h-10 w-56 font-mono"
            aria-invalid={numero !== '' && !numeroValido}
          />
        </div>
      </div>
      {numero !== '' && !numeroValido && (
        <p className="text-caption text-danger">{t('inmobiliaria.dispersiones.cuentaDeOrigen.soloDigitos')}</p>
      )}
      {cuentas.length === 0 && (
        <p className="text-caption text-fg-muted">
          {t('inmobiliaria.dispersiones.cuentaDeOrigen.laTienesRegistrada')}{' '}
          <Link href={hrefDeSeccion('medios-de-pago')} className="text-primary underline-offset-4 hover:underline">
            {t('inmobiliaria.dispersiones.cuentaDeOrigen.mediosDePago')}
          </Link>{' '}
          {t('inmobiliaria.dispersiones.cuentaDeOrigen.yLaProximaVez')}
        </p>
      )}
    </div>
  );
}
