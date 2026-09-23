/**
 * 🔴 Repartir la plata del propietario entre varias cuentas, desde el cambio
 * controlado de cuenta (22-09).
 *
 * «Mi dinero me lo ponen, ejemplo, el 50 % en Bancolombia, otro 20 % en Nubank
 * y otro 30 % en Banco de Occidente» (Nico).
 *
 * Lo que fija: el botón no se prende hasta que los porcentajes sumen 100, y
 * mientras tanto la pantalla dice cuánto falta; lo que sale al back es el
 * reparto entero; sin la migración, «Repartido en varias» está apagado con el
 * porqué; y el reparto vigente se ve en la tarjeta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  cambiosDeCuenta: vi.fn(),
  solicitarCambioDeCuenta: vi.fn(),
}));

vi.mock('@/lib/api/mandato.service', () => ({ mandatoApi: h }));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ isAdmin: true }) }));
/*
 * El traductor con el es.json REAL: una clave que falta sale cruda y la prueba
 * la ve. Doblar `t` para que devuelva la clave hace que «clave» y «texto» sean
 * lo mismo del lado de la prueba.
 */
vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>;
  const t = (clave: string, params: Record<string, string | number> = {}) => {
    const valor = clave.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es);
    if (typeof valor !== 'string') return clave;
    return valor.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''));
  };
  return { useI18n: () => ({ t, locale: 'es' }) };
});

import { CambioDeCuentaBancaria } from './CambioDeCuentaBancaria';

const FICHA = {
  bankName: 'Bancolombia',
  bankAccountType: 'Ahorros',
  bankAccountNumber: '0012344521',
  bankAccountHolder: null,
  bankAccountHolderDocument: null,
  bankAccountHolderDocumentType: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.cambiosDeCuenta.mockReset();
  h.solicitarCambioDeCuenta.mockReset().mockResolvedValue({
    cambio: { envioEstado: 'SIMULADO', destinoEnmascarado: null },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const porTestId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`);

async function pintar() {
  await act(async () => {
    root.render(
      <CambioDeCuentaBancaria
        propietarioId="p1"
        propietario={{ nombre: 'Jorge Restrepo', documento: '71234567' }}
        tieneCuenta
        puedeEditar
        onCuentaCambiada={() => {}}
      />,
    );
  });
}

async function clic(el: HTMLElement | null) {
  if (!el) throw new Error('no existe el elemento');
  await act(async () => {
    el.click();
  });
}

async function escribir(el: HTMLInputElement | HTMLSelectElement | null, valor: string) {
  if (!el) throw new Error('no existe el campo');
  await act(async () => {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

async function adjuntar() {
  const input = document.body.querySelector<HTMLInputElement>('[data-testid="archivo-certificacion"]')!;
  const archivo = new File(['%PDF'], 'certificaciones.pdf', { type: 'application/pdf' });
  await act(async () => {
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const campo = <T extends HTMLElement>(id: string) => document.body.querySelector<T>(`#${id}`);

describe('repartir en varias cuentas', () => {
  it('el botón espera a que sumen 100 y dice cuánto falta; lo que sale es el reparto entero', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [{ ...FICHA, porcentaje: 100 }],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    await clic(porTestId('modo-varias-cuentas'));

    // La cuenta 1 arranca con la de la ficha; la 2, vacía.
    expect(campo<HTMLSelectElement>('reparto-0-banco')?.value).toBe('bancolombia');
    expect(campo<HTMLInputElement>('reparto-0-numero')?.value).toBe('0012344521');

    await escribir(campo('reparto-0-porcentaje'), '50');
    await escribir(campo('reparto-1-banco'), 'nu');
    await escribir(campo('reparto-1-numero'), '77001234');
    await escribir(campo('reparto-1-porcentaje'), '20');
    await adjuntar();

    expect(porTestId('suma-del-reparto')?.textContent).toBe('Los porcentajes suman 70 %: falta repartir 30 %.');
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(true);

    await clic(porTestId('agregar-cuenta-al-reparto'));
    await escribir(campo('reparto-2-banco'), 'occidente');
    await escribir(campo('reparto-2-numero'), '990001234');
    await escribir(campo('reparto-2-porcentaje'), '30');

    expect(porTestId('suma-del-reparto')?.textContent).toBe('Suman 100 %.');
    expect((porTestId('enviar-cambio') as HTMLButtonElement).disabled).toBe(false);

    await clic(porTestId('enviar-cambio'));
    expect(h.solicitarCambioDeCuenta).toHaveBeenCalledTimes(1);
    const [propietarioId, solicitud] = h.solicitarCambioDeCuenta.mock.calls[0];
    expect(propietarioId).toBe('p1');
    expect(solicitud.reparto).toEqual([
      expect.objectContaining({ bankCode: 'BANCOLOMBIA', bankAccountNumber: '0012344521', porcentaje: 50 }),
      expect.objectContaining({ bankCode: 'NU_COLOMBIA', bankAccountNumber: '77001234', porcentaje: 20 }),
      expect.objectContaining({ bankCode: 'BANCO_OCCIDENTE', bankAccountNumber: '990001234', porcentaje: 30 }),
    ]);
    // Una sola cuenta por arriba NO viaja: manda el reparto.
    expect(solicitud.bankAccountNumber).toBeUndefined();
  });

  it('sin la migración del reparto, «Repartido en varias» está apagado y dice por qué', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [{ ...FICHA, porcentaje: 100 }],
      repartoDisponible: false,
      motivoDelReparto: 'falta aplicar la migración 20260922220000_reparto_de_cuentas.',
    });
    await pintar();
    await clic(porTestId('pedir-cambio-de-cuenta'));
    expect((porTestId('modo-varias-cuentas') as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('20260922220000_reparto_de_cuentas');
  });

  it('con reparto vigente, la tarjeta lo muestra y el formulario arranca con sus cuentas', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      disponible: true,
      motivo: null,
      cambios: [],
      cuentasVigentes: [
        { ...FICHA, porcentaje: 60 },
        { ...FICHA, bankName: 'Banco de Occidente', bankAccountNumber: '990001234', porcentaje: 40 },
      ],
      repartoDisponible: true,
      motivoDelReparto: null,
    });
    await pintar();
    const vigente = porTestId('reparto-vigente');
    expect(vigente?.textContent).toContain('Recibe en 2 cuentas');
    expect(vigente?.textContent).toContain('60 % · Bancolombia · Ahorros · •••• 4521');

    await clic(porTestId('pedir-cambio-de-cuenta'));
    expect(campo<HTMLInputElement>('reparto-0-porcentaje')?.value).toBe('60');
    expect(campo<HTMLSelectElement>('reparto-1-banco')?.value).toBe('occidente');
    expect(porTestId('suma-del-reparto')?.textContent).toBe('Suman 100 %.');
  });
});
