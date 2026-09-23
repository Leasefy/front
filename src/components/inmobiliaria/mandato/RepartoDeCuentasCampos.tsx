'use client';

/**
 * 🔴 El reparto de la plata del propietario entre VARIAS cuentas (22-09).
 *
 * «Mi dinero me lo ponen, ejemplo, el 50 % en Bancolombia, otro 20 % en Nubank
 * y otro 30 % en Banco de Occidente» (Nico).
 *
 * Un bloque por cuenta con las MISMAS preguntas que una cuenta sola (de quién
 * es, banco, tipo, número) más su porcentaje, y abajo la suma dicha en una
 * frase: «falta repartir 20 %». El botón de enviar no se prende hasta que
 * sumen exactamente 100 (la regla es `lib/propietarios/reparto-de-cuentas.ts`,
 * espejo del back, que vuelve a validar todo).
 *
 * Vive dentro del cambio controlado de cuenta: agregar una cuenta al reparto es
 * mandar plata a una cuenta nueva, y eso pasa por certificación, confirmación
 * del propietario y aprobación de un administrador.
 */

import type { ReactNode } from 'react';
import { RadioGroup, RadioGroupItem } from '@leasefy/cadence';
import { Plus, Trash } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TitularDeLaCuentaCampos,
  type ErroresDelTitular,
  type ValorDelTitular,
} from '@/components/inmobiliaria/TitularDeLaCuentaCampos';
import { COLOMBIAN_BANKS, type BankCode } from '@/lib/types/payment-accounts';
import {
  MAXIMO_DE_CUENTAS,
  fraseDeLaSuma,
  sumaDePorcentajes,
} from '@/lib/propietarios/reparto-de-cuentas';
import { cn } from '@/lib/utils';

/** Una cuenta del reparto mientras se escribe. */
export interface CuentaDelFormulario {
  /** Llave estable para React: el orden puede cambiar al quitar una. */
  llave: string;
  titular: ValorDelTitular;
  banco: BankCode | '';
  tipo: 'AHORROS' | 'CORRIENTE';
  numero: string;
  /** Lo que la persona escribió. `''` = vacío. */
  porcentaje: string;
}

export interface ErroresDeLaCuenta {
  titular?: ErroresDelTitular;
  banco?: string;
  numero?: string;
  porcentaje?: string;
}

let contador = 0;
export function cuentaVacia(parcial: Partial<CuentaDelFormulario> = {}): CuentaDelFormulario {
  contador += 1;
  return {
    llave: `cuenta-${contador}`,
    titular: { titular: 'PROPIETARIO', nombre: '', tipo: '', numero: '' },
    banco: '',
    tipo: 'AHORROS',
    numero: '',
    porcentaje: '',
    ...parcial,
  };
}

export function RepartoDeCuentasCampos({
  cuentas,
  onCambiar,
  errores,
  nombreDelPropietario,
  pieDeCuenta,
}: {
  cuentas: CuentaDelFormulario[];
  onCambiar: (cuentas: CuentaDelFormulario[]) => void;
  /** Por posición. */
  errores: ErroresDeLaCuenta[];
  nombreDelPropietario: string;
  /**
   * Lo que va al final de cada cuenta. 23-09: la certificación de ESA cuenta
   * (o «ya certificada»), junto a la cuenta que certifica y no en un campo
   * suelto abajo del formulario.
   */
  pieDeCuenta?: (cuenta: CuentaDelFormulario, indice: number) => ReactNode;
}) {
  const suma = sumaDePorcentajes(cuentas);
  const cambiar = (i: number, parcial: Partial<CuentaDelFormulario>) =>
    onCambiar(cuentas.map((c, j) => (j === i ? { ...c, ...parcial } : c)));

  return (
    <div className="space-y-4" data-testid="reparto-de-cuentas">
      {cuentas.map((c, i) => {
        const e = errores[i] ?? {};
        const prefijo = `reparto-${i}-`;
        return (
          <fieldset
            key={c.llave}
            className="space-y-3 rounded-lg border border-border p-4"
            data-testid={`cuenta-del-reparto-${i}`}
          >
            <div className="flex items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-foreground">Cuenta {i + 1}</legend>
              {cuentas.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  hideArrow
                  onClick={() => onCambiar(cuentas.filter((_, j) => j !== i))}
                  aria-label={`Quitar la cuenta ${i + 1}`}
                >
                  <Trash className="w-4 h-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>

            <TitularDeLaCuentaCampos
              prefijo={prefijo}
              valor={c.titular}
              onCambiar={(v) => cambiar(i, { titular: v })}
              errores={e.titular}
              nombreDelPropietario={nombreDelPropietario}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label htmlFor={`${prefijo}banco`}>Banco</Label>
                <select
                  id={`${prefijo}banco`}
                  className={cn(
                    'h-11 w-full rounded-md border border-border bg-surface px-3 text-sm',
                    e.banco && 'border-danger/30',
                  )}
                  value={c.banco}
                  onChange={(ev) => cambiar(i, { banco: ev.target.value as BankCode })}
                >
                  <option value="">Escoge el banco</option>
                  {COLOMBIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {e.banco ? (
                  <p className="text-sm text-danger" role="alert">
                    {e.banco}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${prefijo}porcentaje`}>Porcentaje</Label>
                <div className="relative">
                  <Input
                    id={`${prefijo}porcentaje`}
                    inputMode="numeric"
                    maxLength={3}
                    className={cn('pr-8 font-mono', e.porcentaje && 'border-danger/30')}
                    value={c.porcentaje}
                    onChange={(ev) => cambiar(i, { porcentaje: ev.target.value.replace(/\D/g, '') })}
                    data-testid={`${prefijo}porcentaje`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
            {e.porcentaje ? (
              <p className="text-sm text-danger" role="alert">
                {e.porcentaje}
              </p>
            ) : null}

            <RadioGroup
              className="flex gap-x-5 gap-y-2"
              value={c.tipo}
              onValueChange={(v) => cambiar(i, { tipo: v as CuentaDelFormulario['tipo'] })}
              aria-label={`Tipo de la cuenta ${i + 1}`}
            >
              {(['AHORROS', 'CORRIENTE'] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg">
                  <RadioGroupItem value={t} />
                  <span>{t === 'AHORROS' ? 'Ahorros' : 'Corriente'}</span>
                </label>
              ))}
            </RadioGroup>

            <div className="space-y-1.5">
              <Label htmlFor={`${prefijo}numero`}>Número de cuenta</Label>
              <Input
                id={`${prefijo}numero`}
                inputMode="numeric"
                className={cn('font-mono', e.numero && 'border-danger/30')}
                value={c.numero}
                onChange={(ev) => cambiar(i, { numero: ev.target.value.replace(/[^0-9]/g, '') })}
              />
              {e.numero ? (
                <p className="text-sm text-danger" role="alert">
                  {e.numero}
                </p>
              ) : null}
            </div>
            {pieDeCuenta ? pieDeCuenta(c, i) : null}
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={cn('font-mono text-sm', suma === 100 ? 'text-success' : 'text-danger')}
          data-testid="suma-del-reparto"
          aria-live="polite"
        >
          {fraseDeLaSuma(suma)}
        </p>
        {cuentas.length < MAXIMO_DE_CUENTAS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            hideArrow
            onClick={() => onCambiar([...cuentas, cuentaVacia()])}
            data-testid="agregar-cuenta-al-reparto"
          >
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Agregar otra cuenta
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Los pesos que el redondeo deja sueltos van a la cuenta de mayor porcentaje.
      </p>
    </div>
  );
}
