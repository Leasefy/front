/**
 * 🔴 Auditoría de seguridad (23-09): el correo de un propietario es por donde
 * confirma los cambios de su cuenta bancaria y con el que entra a su portal
 * (donde aprueba reparaciones que se le descuentan). Cambiar uno que YA estaba
 * es cosa de un administrador: el back responde 403 `CORREO_SOLO_ADMINISTRADOR`
 * a cualquier otro rol. La pantalla no deja escribir lo que el back va a
 * rechazar, y dice por qué.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ permisos: null as null | { isAdmin: boolean } }));

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => h.permisos,
}));
/* El traductor con el es.json REAL: una clave que falta sale cruda y se ve. */
vi.mock('@/lib/i18n', async () => {
  const es = (await import('@/lib/i18n/locales/es.json')).default as Record<string, unknown>;
  const t = (clave: string, params: Record<string, string | number> = {}) => {
    const valor = clave.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es);
    if (typeof valor !== 'string') return clave;
    return valor.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? ''));
  };
  return { useI18n: () => ({ t, locale: 'es' }) };
});

import { PropietarioForm } from './PropietarioForm';
import type { Propietario } from '@/lib/types/inmobiliaria';

const JORGE = {
  id: 'p1',
  name: 'Jorge Restrepo',
  email: 'jorge@correo.co',
  phone: '3001234567',
  documentType: 'CC',
  documentNumber: '71234567',
  bankAccount: {
    bank: 'bancolombia',
    accountType: 'SAVINGS',
    accountNumber: '0012344521',
    accountHolder: '',
    accountHolderDocument: '',
    accountHolderDocumentType: '',
  },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 0,
} as unknown as Propietario;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar(initialData: Propietario, mode: 'create' | 'edit' = 'edit') {
  await act(async () => {
    root.render(
      <PropietarioForm initialData={initialData} mode={mode} onSubmit={async () => {}} onCancel={() => {}} />,
    );
  });
}

const correo = () => container.querySelector<HTMLInputElement>('[data-testid="correo-del-propietario"]');
const MOTIVO = 'Sólo un administrador cambia el correo de un propietario';

describe('el correo del propietario en la ficha', () => {
  it('🔴 a quien no es administrador el correo le sale apagado, con el porqué', async () => {
    h.permisos = { isAdmin: false };
    await pintar(JORGE);
    expect(correo()?.disabled).toBe(true);
    expect(container.textContent).toContain(MOTIVO);
  });

  it('un administrador lo edita', async () => {
    h.permisos = { isAdmin: true };
    await pintar(JORGE);
    expect(correo()?.disabled).toBe(false);
    expect(container.textContent).not.toContain(MOTIVO);
  });

  it('registrar el PRIMER correo de una ficha sin correo sigue abierto', async () => {
    h.permisos = { isAdmin: false };
    await pintar({ ...JORGE, email: null });
    expect(correo()?.disabled).toBe(false);
  });

  it('al crear un propietario el correo se escribe como siempre', async () => {
    h.permisos = { isAdmin: false };
    await pintar(JORGE, 'create');
    expect(correo()?.disabled).toBe(false);
  });
});
