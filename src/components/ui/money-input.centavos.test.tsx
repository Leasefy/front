/**
 * El campo de plata con y sin centavos («centavos en todo», C3-FRONT).
 *
 * Lo que se protege:
 *   · SIN la llave del área (o sin `areas`, o con un back viejo) el campo es
 *     el de siempre: pesos enteros, la coma se descarta;
 *   · CON la llave, coma decimal como se escribe en Colombia, hasta DOS
 *     decimales —el tercero se frena, no se redondea— y hacia afuera punto
 *     decimal (`"1234567.29"`, lo que entiende `Number()`);
 *   · la pista del tercer decimal entra con su movimiento y sólo con centavos.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AREAS_DE_LA_DEUDA, AREAS_DE_PLATA, fijarConfigDePlataParaPruebas } from '@/lib/plata/con-centavos';
import * as servicio from '@/lib/api/config-de-plata.service';
import { MoneyInput, MoneyInputNumerico, agrupar, soloNumero } from './money-input';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DEUDA_PRENDIDA = {
  conCentavos: { ...Object.fromEntries(AREAS_DE_PLATA.map((a) => [a, false])), contratos_y_cuotas: true, cobros_recibos_y_cartera: true },
};

/** React lleva su propio rastreador: hay que pasar por el setter nativo. */
function escribir(input: HTMLInputElement, texto: string, cursor = texto.length) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, texto);
  input.setSelectionRange(cursor, cursor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('soloNumero y agrupar en COP', () => {
  it('sin centavos: los centavos escritos se frenan (CE-04), quedan los pesos', () => {
    // 🔴 CE-04 (QA-PAGOS-95, 05-10-2026): antes «1.500,75» daba 150075 —los
    // centavos se volvían pesos, cien veces más—. Ahora quedan los pesos.
    expect(soloNumero('1.500,75')).toBe('1500');
    expect(soloNumero('1.500,75', 'COP', false)).toBe('1500');
    expect(agrupar('1500.75')).toBe('1.500');
  });

  it('con centavos: el punto agrupa, la coma separa, hacia afuera punto decimal', () => {
    expect(soloNumero('1.234.567,29', 'COP', true)).toBe('1234567.29');
    expect(soloNumero('$ 2.350.000,5', 'COP', true)).toBe('2350000.5');
    expect(soloNumero('1.500,', 'COP', true)).toBe('1500.');
    expect(soloNumero('3.000.000', 'COP', true)).toBe('3000000');
    expect(agrupar('1234567.29', 'COP', true)).toBe('1.234.567,29');
    expect(agrupar('1500.', 'COP', true)).toBe('1.500,');
    expect(agrupar('.5', 'COP', true)).toBe('0,5');
  });

  it('el tercer decimal se FRENA: no se redondea', () => {
    expect(soloNumero('1.234.567,295', 'COP', true)).toBe('1234567.29');
    expect(soloNumero('0,999', 'COP', true)).toBe('0.99');
  });

  it('USD no cambia', () => {
    expect(soloNumero('1,500.756', 'USD')).toBe('1500.75');
    expect(agrupar('1500.5', 'USD')).toBe('1,500.5');
  });
});

describe('MoneyInput según la llave del área', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    fijarConfigDePlataParaPruebas(null);
  });

  /** Un campo controlado, como lo usan los formularios. */
  function Controlado({ inicial = '', alCambiar }: { inicial?: string; alCambiar: (c: string) => void }) {
    const [valor, setValor] = React.useState(inicial);
    return (
      <MoneyInput
        aria-label="Canon"
        areas={AREAS_DE_LA_DEUDA}
        value={valor}
        onChange={(crudo) => {
          alCambiar(crudo);
          setValor(crudo);
        }}
      />
    );
  }

  async function montar(cuerpo: unknown | Error, inicial = '') {
    if (cuerpo instanceof Error) vi.spyOn(servicio, 'pedirConfigDePlata').mockRejectedValue(cuerpo);
    else vi.spyOn(servicio, 'pedirConfigDePlata').mockResolvedValue(cuerpo);
    const alCambiar = vi.fn();
    await act(async () => root.render(<Controlado inicial={inicial} alCambiar={alCambiar} />));
    const input = host.querySelector('input') as HTMLInputElement;
    input.focus();
    return { input, alCambiar };
  }

  it('apagada (o back viejo): pesos enteros, los centavos se frenan con su pista, teclado numérico', async () => {
    const { input, alCambiar } = await montar(new Error('404'));
    expect(input.inputMode).toBe('numeric');
    await act(async () => escribir(input, '1.500,75'));
    // CE-04: antes '150075' (cien veces más).
    expect(alCambiar).toHaveBeenLastCalledWith('1500');
    expect(host.querySelector('[data-testid="pista-del-tercer-decimal"]')).toBeNull();
    expect(host.querySelector('[data-testid="pista-sin-centavos"]')).not.toBeNull();
  });

  it('🔴 CE-04 al TECLEAR: después de la coma los dígitos no caen en los pesos (antes 1.500 + «,75» = 150.075)', async () => {
    const { input, alCambiar } = await montar(new Error('404'));
    for (const c of '1500') await act(async () => escribir(input, input.value + c));
    expect(input.value).toBe('1.500');
    await act(async () => escribir(input, input.value + ','));
    for (const c of '75') await act(async () => escribir(input, input.value + c));
    expect(alCambiar).toHaveBeenLastCalledWith('1500');
    expect(input.value).toBe('1.500');
    expect(host.querySelector('[data-testid="pista-sin-centavos"]')).not.toBeNull();
    // Borrar suelta el freno: se sigue escribiendo pesos.
    await act(async () => escribir(input, '1.50'));
    for (const c of '00') await act(async () => escribir(input, input.value + c));
    expect(alCambiar).toHaveBeenLastCalledWith('15000');
  });

  it('sin `areas` no pregunta nada y es el campo de siempre', async () => {
    const pedir = vi.spyOn(servicio, 'pedirConfigDePlata').mockResolvedValue(DEUDA_PRENDIDA);
    const onChange = vi.fn();
    await act(async () => root.render(<MoneyInput aria-label="X" value="" onChange={onChange} />));
    const input = host.querySelector('input') as HTMLInputElement;
    await act(async () => escribir(input, '2.350.000,29'));
    expect(pedir).not.toHaveBeenCalled();
    // CE-04: los centavos se frenan (antes '235000029').
    expect(onChange).toHaveBeenLastCalledWith('2350000');
  });

  it('prendida: coma decimal y $1.234.567,29 viaja como "1234567.29"', async () => {
    const { input, alCambiar } = await montar(DEUDA_PRENDIDA);
    expect(input.inputMode).toBe('decimal');
    await act(async () => escribir(input, '1.234.567,29'));
    expect(alCambiar).toHaveBeenLastCalledWith('1234567.29');
    expect(input.value).toBe('1.234.567,29');
    expect(Number('1234567.29')).toBe(1_234_567.29);
  });

  it('prendida: el tercer decimal se frena y la pista dice por qué', async () => {
    const { input, alCambiar } = await montar(DEUDA_PRENDIDA, '1234567.29');
    expect(input.value).toBe('1.234.567,29');
    await act(async () => escribir(input, '1.234.567,295'));
    expect(alCambiar).toHaveBeenLastCalledWith('1234567.29');
    expect(input.value).toBe('1.234.567,29');
    const pista = host.querySelector('[data-testid="pista-del-tercer-decimal"]');
    expect(pista?.textContent).toBe('Hasta dos decimales');
    // La pista vive en una región que se anuncia, sin robar el foco.
    expect(pista?.closest('[aria-live="polite"]')).not.toBeNull();
  });

  it('prendida: al teclear la coma el cursor queda DESPUÉS de ella', async () => {
    const { input } = await montar(DEUDA_PRENDIDA, '1500');
    await act(async () => escribir(input, '1.500,'));
    expect(input.value).toBe('1.500,');
    expect(input.selectionStart).toBe(6);
    await act(async () => escribir(input, '1.500,5', 7));
    expect(input.value).toBe('1.500,5');
  });

  it('una sola de las dos áreas de la deuda no alcanza: pesos enteros', async () => {
    const soloUna = { conCentavos: { contratos_y_cuotas: true } };
    const { input, alCambiar } = await montar(soloUna);
    await act(async () => escribir(input, '2.350.000,29'));
    // CE-04: los centavos se frenan (antes '235000029').
    expect(alCambiar).toHaveBeenLastCalledWith('2350000');
  });
});

describe('MoneyInputNumerico (el reemplazo del CurrencyInput con centavos)', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    fijarConfigDePlataParaPruebas(DEUDA_PRENDIDA);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    fijarConfigDePlataParaPruebas(null);
  });

  function Numerico({ inicial, alCambiar }: { inicial: number; alCambiar: (n: number) => void }) {
    const [valor, setValor] = React.useState(inicial);
    return (
      <>
        <MoneyInputNumerico
          aria-label="Monto"
          areas={AREAS_DE_LA_DEUDA}
          value={Number.isFinite(valor) ? valor : undefined}
          onChange={(v) => {
            alCambiar(v);
            setValor(v);
          }}
        />
        <button type="button" onClick={() => setValor(2_350_000.29)}>
          Pagar lo vencido
        </button>
      </>
    );
  }

  it('el número entra con centavos y la coma no se pierde bajo el dedo', async () => {
    const alCambiar = vi.fn();
    await act(async () => root.render(<Numerico inicial={Number.NaN} alCambiar={alCambiar} />));
    const input = host.querySelector('input') as HTMLInputElement;
    input.focus();
    await act(async () => escribir(input, '1.500,'));
    expect(input.value).toBe('1.500,');
    expect(alCambiar).toHaveBeenLastCalledWith(1500);
    await act(async () => escribir(input, '1.500,50'));
    expect(input.value).toBe('1.500,50');
    expect(alCambiar).toHaveBeenLastCalledWith(1500.5);
  });

  it('un atajo que cambia el número desde afuera se ve en el campo', async () => {
    await act(async () => root.render(<Numerico inicial={Number.NaN} alCambiar={() => {}} />));
    await act(async () => (host.querySelector('button') as HTMLButtonElement).click());
    expect((host.querySelector('input') as HTMLInputElement).value).toBe('2.350.000,29');
  });
});
