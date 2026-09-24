/**
 * 🔴 Datos personales (23-09): quien no ve la plata del propietario (sin
 * `dispersiones:view`, el asesor comercial) no ve ni llena su cuenta bancaria.
 *
 * Antes el formulario le pintaba la cuenta VACÍA (el back se la manda en
 * `null` con `datosBancariosOcultos`) y se la EXIGÍA: el asesor no podía ni
 * corregir un teléfono, y si escribía un número el back lo tomaba como un
 * cambio de cuenta. Ahora el bloque no se muestra, no se valida y guardar no
 * manda ningún campo de la cuenta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  permisos: null as null | {
    isAdmin: boolean;
    isLoading: boolean;
    canAccess: (m: string, a: string) => boolean;
  },
}));

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => h.permisos,
}));
vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>;
  const t = (clave: string) => {
    const valor = clave
      .split('.')
      .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es);
    return typeof valor === 'string' ? valor : clave;
  };
  return { useI18n: () => ({ t, locale: 'es' }) };
});

import { PropietarioForm } from './PropietarioForm';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

/** Como llega la ficha a quien no ve la plata: la cuenta en blanco y el porqué. */
const OCULTA = {
  id: 'p1',
  name: 'Jorge Restrepo',
  email: 'jorge@correo.co',
  phone: '3001234567',
  documentType: 'CC',
  documentNumber: '71234567',
  bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' },
  datosBancariosOcultos: true,
  propertyCount: 1,
  activeLeases: 0,
  totalMonthlyRent: 0,
  pendingBalance: 0,
} as unknown as Propietario;

const ASESOR = { isAdmin: false, isLoading: false, canAccess: (m: string) => m !== 'dispersiones' };
const CONTADOR = { isAdmin: false, isLoading: false, canAccess: () => true };

let container: HTMLDivElement;
let root: Root;
let enviado: PropietarioFormData | null;

beforeEach(() => {
  enviado = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar(initialData: Propietario | undefined, mode: 'create' | 'edit') {
  await act(async () => {
    root.render(
      <PropietarioForm
        initialData={initialData}
        mode={mode}
        onSubmit={async (d) => {
          enviado = d;
        }}
        onCancel={() => {}}
      />,
    );
  });
}

async function guardar() {
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

const numeroDeCuenta = () => container.querySelector<HTMLInputElement>('input[placeholder="1234567890"]');

describe('🔴 la cuenta del propietario para quien no la ve', () => {
  it('editar: no se muestra, no se exige, y guardar no manda la cuenta', async () => {
    h.permisos = ASESOR;
    await pintar(OCULTA, 'edit');

    expect(numeroDeCuenta()).toBeNull();
    expect(container.querySelector('[data-testid="cuenta-oculta-por-rol"]')?.textContent).toContain(
      'no ve la cuenta bancaria',
    );

    await guardar();

    expect(enviado).not.toBeNull();
    expect(enviado!.name).toBe('Jorge Restrepo');
    // Nada de la cuenta: ni vacío, ni la pregunta del titular.
    expect(enviado!.accountNumber).toBeUndefined();
    expect(enviado!.accountHolder).toBeUndefined();
    expect(enviado!.accountHolderDocument).toBeUndefined();
    expect(enviado!.titularDeLaCuenta).toBeUndefined();
    expect(enviado!.bankCode).toBe('');
    expect(enviado!.accountType).toBe('');
  });

  it('crear: tampoco se le pide la cuenta a quien no la ve', async () => {
    h.permisos = ASESOR;
    await pintar(undefined, 'create');
    expect(numeroDeCuenta()).toBeNull();
    expect(container.querySelector('[data-testid="cuenta-oculta-por-rol"]')).not.toBeNull();
  });

  it('quien ve la plata sigue viendo y llenando la cuenta', async () => {
    h.permisos = CONTADOR;
    await pintar(undefined, 'create');
    expect(numeroDeCuenta()).not.toBeNull();
    expect(container.querySelector('[data-testid="cuenta-oculta-por-rol"]')).toBeNull();
  });
});
