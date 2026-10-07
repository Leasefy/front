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
 * 🔴 02-10-2026 (Nico): el error del reparto va EN SU CAMPO, debajo del input
 * que está mal (`<ErrorDelCampo>`, `aria-invalid`, `aria-describedby`), nunca
 * en un aviso de bloque. También los del conjunto (ver `errorDelConjunto`) y
 * los que manda el back (ver `erroresDelServidorEnElReparto`).
 *
 * Vive dentro del cambio controlado de cuenta: agregar una cuenta al reparto es
 * mandar plata a una cuenta nueva, y eso pasa por certificación, confirmación
 * del propietario y aprobación de un administrador.
 */

import type { ReactNode } from 'react';
import { Presence, RadioGroup, RadioGroupItem } from '@leasefy/cadence';
import { Plus, Trash } from '@phosphor-icons/react';

import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TitularDeLaCuentaCampos,
  type ErroresDelTitular,
  type ValorDelTitular,
} from '@/components/inmobiliaria/TitularDeLaCuentaCampos';
import { COLOMBIAN_BANKS, type BankCode } from '@/lib/types/payment-accounts';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  MAXIMO_DE_CUENTAS,
  fraseDeLaSuma,
  porcentajeEntero,
  problemaDelReparto,
  sumaDePorcentajes,
  type CuentaParaRevisar,
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
  tipo?: string;
  numero?: string;
  porcentaje?: string;
  /** La certificación de ESA cuenta: la pinta quien pone el `pieDeCuenta`. */
  certificacion?: string;
}

/** Un campo de una cuenta del reparto, para ubicar un error y enfocarlo. */
export type CampoDeLaCuenta =
  | 'banco'
  | 'tipo'
  | 'numero'
  | 'porcentaje'
  | 'certificacion'
  | 'titular.nombre'
  | 'titular.tipo'
  | 'titular.numero';

/** El `id` del control de ese campo (el `id` de su error es éste + `-error`). */
export function idDelCampoDeLaCuenta(indice: number, campo: CampoDeLaCuenta): string {
  return `reparto-${indice}-${campo.replace('.', '-')}`;
}

/**
 * Pone el foco en el campo. El tipo de cuenta es un grupo de radios: el foco va
 * al radio marcado, que es el que el teclado recorre.
 */
export function enfocarCampoDeLaCuenta(indice: number, campo: CampoDeLaCuenta): void {
  const el = document.getElementById(idDelCampoDeLaCuenta(indice, campo));
  const destino =
    campo === 'tipo'
      ? (el?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]') ??
        el?.querySelector<HTMLElement>('[role="radio"]'))
      : el;
  destino?.focus();
}

/** Escribe el mensaje en `errores` en el lugar del campo (sin pisar uno que ya esté). */
function ponerError(errores: ErroresDeLaCuenta, campo: CampoDeLaCuenta, mensaje: string): boolean {
  if (campo.startsWith('titular.')) {
    const sub = campo.slice('titular.'.length) as keyof ErroresDelTitular;
    if (errores.titular?.[sub]) return false;
    errores.titular = { ...errores.titular, [sub]: mensaje };
    return true;
  }
  const llave = campo as Exclude<CampoDeLaCuenta, `titular.${string}`>;
  if (errores[llave]) return false;
  errores[llave] = mensaje;
  return true;
}

/**
 * Un error del CONJUNTO del reparto, pegado al campo que lo resuelve:
 *
 *  · La suma: en el porcentaje de la ÚLTIMA cuenta que ya tiene porcentaje.
 *    Es donde la persona termina de escribir (se llena de arriba abajo), lo
 *    que queda por repartir va naturalmente en la última, y no salta de fila
 *    mientras escribe en orden. Es error cuando ya están todos escritos y no
 *    dan 100, o cuando lo escrito ya pasa de 100; antes, la frase de abajo
 *    dice cuánto falta, sin rojo (lo vacío no se marca antes de tiempo).
 *  · La cuenta repetida: en el número de la que repite (la de abajo).
 */
export interface ErrorDelConjunto {
  indice: number;
  campo: 'porcentaje' | 'numero';
  mensaje: string;
}

export function errorDelConjunto(cuentas: readonly CuentaParaRevisar[]): ErrorDelConjunto | null {
  const suma = sumaDePorcentajes(cuentas);
  const escritas = cuentas.flatMap((c, i) => (porcentajeEntero(c.porcentaje) === null ? [] : [i]));
  if (suma !== 100 && escritas.length > 0 && (escritas.length === cuentas.length || suma > 100)) {
    return { indice: escritas[escritas.length - 1], campo: 'porcentaje', mensaje: fraseDeLaSuma(suma) };
  }
  const problema = problemaDelReparto(cuentas);
  if (problema?.tipo === 'repetida') {
    return { indice: problema.indice, campo: 'numero', mensaje: problema.mensaje };
  }
  return null;
}

/**
 * El nombre de cada dato de una cuenta en el back (`CuentaDelRepartoPedida`,
 * `back/src/inmobiliaria/mandato/cambio-de-cuenta.ts`) → el campo de acá.
 */
const CAMPOS_DE_LA_CUENTA_EN_EL_BACK: Record<string, CampoDeLaCuenta> = {
  bankCode: 'banco',
  bankName: 'banco',
  bankAccountType: 'tipo',
  bankAccountNumber: 'numero',
  porcentaje: 'porcentaje',
  bankAccountHolder: 'titular.nombre',
  bankAccountHolderDocumentType: 'titular.tipo',
  bankAccountHolderDocument: 'titular.numero',
  certificacion: 'certificacion',
};

/** `cuenta`, `campo` y `code` del cuerpo del error, donde sea que estén. */
function ubicacionDelError(error: unknown): { cuenta?: number; campo?: string; code?: string } {
  const comoObjeto = (v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  const directo = comoObjeto(error);
  const sitios = [comoObjeto(directo?.detalle), comoObjeto(directo?.body), directo].filter(
    (s): s is Record<string, unknown> => s !== null,
  );
  const leer = <T,>(clave: string, es: (v: unknown) => v is T): T | undefined => {
    for (const sitio of sitios) if (es(sitio[clave])) return sitio[clave] as T;
    return undefined;
  };
  const esIndice = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
  const esTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  return { cuenta: leer('cuenta', esIndice), campo: leer('campo', esTexto), code: leer('code', esTexto) };
}

export interface ErroresDelServidorEnElReparto {
  /** Por posición, como `errores` de `RepartoDeCuentasCampos`. */
  porCuenta: ErroresDeLaCuenta[];
  /** El primero que llegó: recibe el foco. */
  primero: { indice: number; campo: CampoDeLaCuenta } | null;
  /** Lo que no tiene campo (un 5xx, la red, un problema del pedido entero): al aviso del diálogo. */
  sueltos: string[];
}

/**
 * Lo que el back rechazó del reparto, en el campo de la cuenta que toca.
 *
 * El back lo dice de dos maneras y se leen las dos:
 *  · `campos[]` del sobre, con la ruta (`reparto.1.porcentaje`, o el archivo
 *    `certificacion_1`) — por `repartirErroresDelServidor`;
 *  · el 400 del cambio de cuenta (`cambio-de-cuenta.service.ts`), que valida el
 *    reparto cuenta por cuenta y devuelve el PRIMER problema con `cuenta`
 *    (desde 0) y `campo` (el nombre del back) junto a `code` y `message`. La
 *    certificación de una cuenta llega con `cuenta` y sin `campo`
 *    (`CERTIFICACION_*`, `ARCHIVO_*`), y la suma que no da 100 sin `cuenta`:
 *    va en el porcentaje de la última, la misma regla que `errorDelConjunto`.
 *
 * Lo demás (sin cuenta, un 5xx, la red) queda en `sueltos` con el mensaje del
 * traductor: «de nuestro lado» con la referencia, «conexión» sólo sin respuesta.
 */
export function erroresDelServidorEnElReparto(
  error: unknown,
  cuantas: number,
  opciones: { porDefecto?: string; accion?: string } = {},
): ErroresDelServidorEnElReparto {
  type Clave = `${number}|${CampoDeLaCuenta}`;
  const mapa: Record<string, Clave> = {};
  for (let i = 0; i < cuantas; i++) {
    for (const [delBack, campo] of Object.entries(CAMPOS_DE_LA_CUENTA_EN_EL_BACK)) {
      mapa[`reparto.${i}.${delBack}`] = `${i}|${campo}`;
    }
    mapa[`certificacion_${i}`] = `${i}|certificacion`;
  }
  const reparto = repartirErroresDelServidor<Clave>(error, {
    mapa,
    campos: Object.values(mapa),
    ...opciones,
  });

  const porCuenta: ErroresDeLaCuenta[] = Array.from({ length: cuantas }, () => ({}));
  let primero: ErroresDelServidorEnElReparto['primero'] = null;
  const poner = (indice: number, campo: CampoDeLaCuenta, mensaje: string) => {
    if (ponerError(porCuenta[indice], campo, mensaje) && !primero) primero = { indice, campo };
  };

  if (reparto.delServidor.length > 0) {
    for (const clave of reparto.orden) {
      const [indice, campo] = clave.split('|') as [string, CampoDeLaCuenta];
      poner(Number(indice), campo, reparto.porCampo[clave]!);
    }
    return { porCuenta, primero, sueltos: reparto.sueltos };
  }

  const { cuenta, campo, code } = ubicacionDelError(error);
  const enRango = cuenta !== undefined && cuenta < cuantas;
  const destino: { indice: number; campo: CampoDeLaCuenta } | null =
    enRango && campo && CAMPOS_DE_LA_CUENTA_EN_EL_BACK[campo]
      ? { indice: cuenta, campo: CAMPOS_DE_LA_CUENTA_EN_EL_BACK[campo] }
      : enRango && !campo && code && /^(CERTIFICACION|ARCHIVO)_/.test(code)
        ? { indice: cuenta, campo: 'certificacion' }
        : cuenta === undefined && campo === 'porcentaje' && code === 'REPARTO_NO_SUMA_100' && cuantas > 0
          ? { indice: cuantas - 1, campo: 'porcentaje' }
          : null;
  if (!destino) return { porCuenta, primero, sueltos: reparto.sueltos };
  poner(destino.indice, destino.campo, mensajeParaLaPersona(error, opciones));
  return { porCuenta, primero, sueltos: [] };
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
  /**
   * Por posición: lo escrito que está mal y lo que rechazó el back. Los del
   * conjunto (la suma, la cuenta repetida) los pone este componente.
   */
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
  const conjunto = errorDelConjunto(cuentas);
  const cambiar = (i: number, parcial: Partial<CuentaDelFormulario>) =>
    onCambiar(cuentas.map((c, j) => (j === i ? { ...c, ...parcial } : c)));
  /** El control con error: `aria-invalid` y `aria-describedby` a su mensaje. */
  const conError = (id: string, mensaje: string | undefined) =>
    mensaje ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};

  return (
    <div className="space-y-4" data-testid="reparto-de-cuentas">
      {cuentas.map((c, i) => {
        const e: ErroresDeLaCuenta = { ...errores[i] };
        // El del conjunto, sólo si el campo no trae ya uno propio.
        if (conjunto?.indice === i) ponerError(e, conjunto.campo, conjunto.mensaje);
        const prefijo = `reparto-${i}-`;
        const id = (campo: CampoDeLaCuenta) => idDelCampoDeLaCuenta(i, campo);
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
                <Label htmlFor={id('banco')}>Banco</Label>
                <select
                  id={id('banco')}
                  className={cn(
                    'h-11 w-full rounded-md border border-border bg-surface px-3 text-sm',
                    e.banco && 'border-danger/30',
                  )}
                  value={c.banco}
                  {...conError(id('banco'), e.banco)}
                  onChange={(ev) => cambiar(i, { banco: ev.target.value as BankCode })}
                >
                  <option value="">Escoge el banco</option>
                  {COLOMBIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ErrorDelCampo id={`${id('banco')}-error`} mensaje={e.banco} className="mt-0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={id('porcentaje')}>Porcentaje</Label>
                <div className="relative">
                  <Input
                    id={id('porcentaje')}
                    inputMode="numeric"
                    maxLength={3}
                    className={cn('pr-8 font-mono', e.porcentaje && 'border-danger/30')}
                    value={c.porcentaje}
                    {...conError(id('porcentaje'), e.porcentaje)}
                    onChange={(ev) => cambiar(i, { porcentaje: ev.target.value.replace(/\D/g, '') })}
                    data-testid={`${prefijo}porcentaje`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            </div>
            {/* El porcentaje vive en una columna de 120 px: su error va a lo
                ancho, justo debajo de la fila del banco y el porcentaje. */}
            <ErrorDelCampo id={`${id('porcentaje')}-error`} mensaje={e.porcentaje} className="mt-0" />

            <RadioGroup
              id={id('tipo')}
              className="flex gap-x-5 gap-y-2"
              value={c.tipo}
              onValueChange={(v) => cambiar(i, { tipo: v as CuentaDelFormulario['tipo'] })}
              aria-label={`Tipo de la cuenta ${i + 1}`}
              {...conError(id('tipo'), e.tipo)}
            >
              {(['AHORROS', 'CORRIENTE'] as const).map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2.5 text-body-sm text-fg">
                  <RadioGroupItem value={t} />
                  <span>{t === 'AHORROS' ? 'Ahorros' : 'Corriente'}</span>
                </label>
              ))}
            </RadioGroup>
            <ErrorDelCampo id={`${id('tipo')}-error`} mensaje={e.tipo} className="mt-0" />

            <div className="space-y-1.5">
              <Label htmlFor={id('numero')}>Número de cuenta</Label>
              <Input
                id={id('numero')}
                inputMode="numeric"
                className={cn('font-mono', e.numero && 'border-danger/30')}
                value={c.numero}
                {...conError(id('numero'), e.numero)}
                onChange={(ev) => cambiar(i, { numero: ev.target.value.replace(/[^0-9]/g, '') })}
              />
              <ErrorDelCampo id={`${id('numero')}-error`} mensaje={e.numero} className="mt-0" />
            </div>
            {pieDeCuenta ? pieDeCuenta(c, i) : null}
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* La cuenta de lo repartido, sin rojo: dice cuánto falta mientras se
            escribe. Cuando la suma ya es un error, la frase se va al
            porcentaje que la resuelve (arriba) y acá no se repite. */}
        <Presence
          as="p"
          show={conjunto?.campo !== 'porcentaje'}
          initial={false}
          direction="down"
          distance="xs"
          className={cn('font-mono text-sm', suma === 100 ? 'text-success' : 'text-muted-foreground')}
          data-testid="suma-del-reparto"
          aria-live="polite"
        >
          {fraseDeLaSuma(suma)}
        </Presence>
        {cuentas.length < MAXIMO_DE_CUENTAS ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            hideArrow
            className="ml-auto"
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
