'use client';

/**
 * Un campo de plata que se lee mientras se escribe.
 *
 * Antes eran `<input type="number">`: el navegador **no admite separadores de
 * miles** en un campo numérico —si el valor no parsea como número lo descarta—,
 * así que el usuario tecleaba `3000000` y tenía que contar ceros a ojo. El
 * formato vivía en una ayudita gris debajo, que es justo donde no se está
 * mirando.
 *
 * Acá el campo es de texto (`inputMode="numeric"` para que el teléfono abra el
 * teclado de números) y agrupa a medida que se escribe: `3.000.000`.
 *
 * **Hacia afuera sigue siendo un número.** `onChange` entrega la cadena de
 * dígitos pelada —`"3000000"`—, igual que antes, para no obligar a cada
 * formulario a desformatear. Con centavos entrega punto decimal, la forma que
 * entiende `Number()`: `"1234567.29"`.
 *
 * ── Centavos («centavos en todo», C3-FRONT, 03-10-2026) ──────────────────────
 *
 * En COP el campo acepta coma decimal (hasta DOS decimales) SÓLO si el back
 * dice que el área donde va a parar ese valor ya escribe centavos (`areas`,
 * `GET /config/plata`; ver `lib/plata/con-centavos.ts`). Con varias áreas,
 * todas (la deuda —recibos, el canon— pide las dos: `AREAS_DE_LA_DEUDA`). Sin
 * `areas`, con un back viejo, si la pregunta falla o mientras no contesta:
 * pesos enteros, EXACTAMENTE como hoy. Con centavos se escribe como en
 * Colombia: el punto agrupa (lo pone el campo) y la coma separa los centavos
 * (`1.234.567,29`); el tercer decimal se frena —no se redondea: P14 a— y una
 * pista dentro del campo dice por qué.
 *
 * ⚠️ `moneda` sólo cambia el FORMATO (COP agrupa con punto y no lleva
 * decimales; USD agrupa con coma y admite dos). No existe todavía una columna
 * de moneda en la base —`Lease.monthlyRent` es un `Int` pelado y no hay
 * `currency` en ningún modelo—, así que **nada de lo que se elija acá se
 * guarda**. Mientras eso no exista, el único llamador posible pasa COP.
 */

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Presence } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useOptionalI18n } from '@/lib/i18n/i18n-context';
import type { AreasDePlata } from '@/lib/plata/con-centavos';
import { usePlataConCentavos } from '@/lib/plata/use-plata-con-centavos';

export type Moneda = 'COP' | 'USD';

const CONFIG: Record<Moneda, { locale: string; decimales: number; simbolo: string }> = {
  COP: { locale: 'es-CO', decimales: 0, simbolo: '$' },
  USD: { locale: 'en-US', decimales: 2, simbolo: 'US$' },
};

/** COP cuando el área ya escribe centavos: dos decimales con coma, como en Colombia. */
const COP_CON_CENTAVOS = { ...CONFIG.COP, decimales: 2 };

function formatoDe(moneda: Moneda, conCentavos: boolean) {
  return moneda === 'COP' && conCentavos ? COP_CON_CENTAVOS : CONFIG[moneda];
}

/** Lo que dice la pista cuando se frena el tercer decimal (sin `I18nProvider`). */
const PISTA_DEL_TERCER_DECIMAL = 'Hasta dos decimales';

/**
 * Deja sólo dígitos y —si la moneda los admite— un separador decimal.
 *
 * Cada moneda se lee con SUS convenciones, las mismas con las que se pinta:
 * en COP el punto agrupa (y no hay centavos), en USD la coma agrupa y el punto
 * separa decimales. Aceptar las dos a la vez vuelve ambiguo `1,500`: son mil
 * quinientos o uno con cinco, y adivinar mal cambia el monto por mil.
 *
 * Con centavos (`conCentavos`, la llave del área), en COP la coma separa los
 * centavos y el punto sigue agrupando; los decimales de más se cortan, no se
 * redondean: `1.500,756` → `1500.75`.
 */
export function soloNumero(texto: string, moneda: Moneda = 'COP', conCentavos = false): string {
  const { decimales } = formatoDe(moneda, conCentavos);
  if (decimales === 0) return texto.replace(/\D/g, '');
  if (moneda === 'COP') {
    // El punto agrupa en COP: se descarta con todo lo que no sea dígito o coma.
    const [enteroCop, ...restoCop] = texto.replace(/[^\d,]/g, '').split(',');
    if (restoCop.length === 0) return enteroCop;
    return `${enteroCop}.${restoCop.join('').slice(0, decimales)}`;
  }
  const sinAgrupar = texto.replace(/[^\d.]/g, ''); // la coma agrupa en USD
  const [entero, ...resto] = sinAgrupar.split('.');
  if (resto.length === 0) return entero;
  return `${entero}.${resto.join('').slice(0, decimales)}`;
}

/**
 * `"3000000"` → `"3.000.000"`; con centavos, `"1234567.29"` →
 * `"1.234.567,29"`. Cadena vacía se queda vacía: cero no es nada.
 */
export function agrupar(crudo: string, moneda: Moneda = 'COP', conCentavos = false): string {
  if (!crudo) return '';
  const { locale, decimales } = formatoDe(moneda, conCentavos);
  const [entero, decimal] = crudo.split('.');
  if (entero === '') return decimal !== undefined ? `0${separadorDecimal(locale)}${decimal}` : '';
  const agrupado = Number(entero).toLocaleString(locale);
  if (decimales === 0 || decimal === undefined) return agrupado;
  return `${agrupado}${separadorDecimal(locale)}${decimal}`;
}

function separadorDecimal(locale: string): string {
  return (1.1).toLocaleString(locale).charAt(1);
}

/** ¿El texto escrito en COP con centavos traía más decimales de los que caben? (para la pista). */
function traiaDecimalesDeMas(texto: string): boolean {
  const i = texto.indexOf(',');
  return i >= 0 && texto.slice(i + 1).replace(/\D/g, '').length > COP_CON_CENTAVOS.decimales;
}

export interface MoneyInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** Dígitos pelados, sin separadores: `"3000000"`. */
  value: string | number | null | undefined;
  /** Recibe dígitos pelados, nunca el texto formateado. */
  onChange: (crudo: string) => void;
  moneda?: Moneda;
  /** Prefijo dentro del campo. `false` lo apaga. */
  simbolo?: boolean;
  /**
   * Admite un valor NEGATIVO: un «-» al principio se conserva y viaja
   * (`"-35000000"`). Opcional (QA de Contabilidad, CB-30, 03-10-2026: el
   * presupuesto de un rubro puede ser negativo). Sin él, como siempre.
   */
  conSigno?: boolean;
  /**
   * El área (o las áreas) de la plata donde va a parar este valor. Con ellas
   * prendidas en el back, el campo en COP acepta centavos; sin `areas`, pesos
   * enteros como siempre. Ver `lib/plata/con-centavos.ts`.
   */
  areas?: AreasDePlata;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, moneda = 'COP', simbolo = true, conSigno = false, areas, className, ...props },
  refExterna,
) {
  // «Centavos en todo»: sólo COP con la llave de `areas` admite centavos.
  const conCentavos = usePlataConCentavos(moneda === 'COP' ? areas : undefined) && moneda === 'COP';
  const i18n = useOptionalI18n();
  /** ¿El último cambio traía un decimal de más? Prende la pista. */
  const [decimalFrenado, setDecimalFrenado] = useState(false);
  const refInterna = useRef<HTMLInputElement | null>(null);
  /**
   * Dígitos antes del cursor: lo único estable cuando el texto se reagrupa.
   * Con centavos cuenta también la coma: sin ella, al teclear la coma el
   * cursor quedaba ANTES y el siguiente dígito caía en los pesos.
   */
  const digitosAntesDelCursor = useRef<number | null>(null);

  const crudo = value === null || value === undefined ? '' : String(value);
  const negativo = conSigno && crudo.startsWith('-');
  const formateado = negativo
    ? `-${agrupar(crudo.slice(1), moneda, conCentavos)}`
    : agrupar(crudo, moneda, conCentavos);

  const manejarCambio = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.target;
      const cursor = el.selectionStart ?? el.value.length;
      // Contar dígitos a la izquierda del cursor ANTES de reformatear: las
      // posiciones absolutas se corren cuando entra o sale un separador.
      digitosAntesDelCursor.current = (
        el.value.slice(0, cursor).match(conCentavos ? /[\d,]/g : /[\d]/g) ?? []
      ).length;
      if (conCentavos) setDecimalFrenado(traiaDecimalesDeMas(el.value));
      const signo = conSigno && /^\s*[-−]/.test(el.value) ? '-' : '';
      onChange(signo + soloNumero(el.value, moneda, conCentavos));
    },
    [onChange, moneda, conSigno, conCentavos],
  );

  // Reponer el cursor después de que React repinta el texto agrupado.
  useLayoutEffect(() => {
    const el = refInterna.current;
    const objetivo = digitosAntesDelCursor.current;
    if (!el || objetivo === null || document.activeElement !== el) return;
    digitosAntesDelCursor.current = null;
    const cuenta = conCentavos ? /[\d,]/ : /\d/;
    let vistos = 0;
    let pos = el.value.length;
    for (let i = 0; i < el.value.length; i++) {
      if (cuenta.test(el.value[i])) {
        vistos++;
        if (vistos === objetivo) {
          pos = i + 1;
          break;
        }
      }
    }
    if (objetivo === 0) pos = 0;
    el.setSelectionRange(pos, pos);
  }, [formateado, conCentavos]);

  // Sin centavos la pista no existe (y si la llave se apaga, se va).
  useEffect(() => {
    if (!conCentavos) setDecimalFrenado(false);
  }, [conCentavos]);

  const traducida = i18n?.t('plata.hastaDosDecimales');
  const pista =
    traducida && traducida !== 'plata.hastaDosDecimales' ? traducida : PISTA_DEL_TERCER_DECIMAL;

  return (
    <div className="relative">
      {simbolo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-fg-subtle"
        >
          {CONFIG[moneda].simbolo}
        </span>
      )}
      <Input
        {...props}
        ref={(nodo) => {
          refInterna.current = nodo;
          if (typeof refExterna === 'function') refExterna(nodo);
          else if (refExterna) refExterna.current = nodo;
        }}
        type="text"
        inputMode={formatoDe(moneda, conCentavos).decimales === 0 ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={formateado}
        onChange={manejarCambio}
        className={cn('font-mono tabular-nums', simbolo && 'pl-10', className)}
      />
      {/*
        La pista del tercer decimal vive DENTRO del campo, a la derecha (como el
        «$» a la izquierda): no empuja nada de lo que hay debajo. Sólo existe con
        centavos; sin ellos el campo es exactamente el de siempre.
      */}
      {conCentavos && (
        <span
          aria-live="polite"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        >
          <Presence show={decimalFrenado} as="span" direction="left" distance="xs" className="block">
            <span
              data-testid="pista-del-tercer-decimal"
              className="rounded-full bg-surface-muted px-2 py-0.5 text-sm text-fg-muted"
            >
              {pista}
            </span>
          </Presence>
        </span>
      )}
    </div>
  );
});

export interface MoneyInputNumericoProps extends Omit<MoneyInputProps, 'value' | 'onChange'> {
  /** La plata como número; `undefined` o `NaN` = vacío. */
  value: number | undefined;
  /** Recibe el número (`NaN` si el campo quedó vacío o a medio escribir). */
  onChange: (valor: number) => void;
}

/**
 * El mismo campo para quien guarda la plata como NÚMERO, igual que el
 * `CurrencyInput` de Cadence (`NaN` = vacío). Por dentro guarda el TEXTO que
 * se escribe: con centavos, «1.500,» o «1.500,50» no son todavía un número
 * distinto de 1500 o 1500.5, y si el campo se pintara desde el número la coma
 * o el cero final desaparecerían bajo el dedo.
 *
 * Si el número cambia desde afuera (un atajo como «Pagar lo vencido»), el
 * texto lo sigue; si es el mismo número que ya dice el texto, el texto se
 * queda como se escribió.
 */
export const MoneyInputNumerico = forwardRef<HTMLInputElement, MoneyInputNumericoProps>(
  function MoneyInputNumerico({ value, onChange, ...props }, ref) {
    const comoTexto = (v: number | undefined) => (v !== undefined && Number.isFinite(v) ? String(v) : '');
    const [texto, setTexto] = useState(() => comoTexto(value));
    const textoActual = useRef(texto);

    useEffect(() => {
      const delTexto = textoActual.current === '' ? NaN : Number(textoActual.current);
      const vacio = value === undefined || Number.isNaN(value);
      const mismo = vacio ? Number.isNaN(delTexto) : delTexto === value;
      if (!mismo) {
        textoActual.current = comoTexto(value);
        setTexto(textoActual.current);
      }
    }, [value]);

    return (
      <MoneyInput
        {...props}
        ref={ref}
        value={texto}
        onChange={(crudo) => {
          textoActual.current = crudo;
          setTexto(crudo);
          onChange(crudo === '' ? NaN : Number(crudo));
        }}
      />
    );
  },
);
