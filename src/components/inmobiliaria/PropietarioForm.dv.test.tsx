/**
 * P-06 (QA-PROP, SEGUIMIENTO-FRONT 03-10-2026): un NIT escrito con un dígito
 * de verificación que no cuadra se dice BAJO el campo y no se manda (antes se
 * guardaba en silencio; el back ahora responde 400
 * `DIGITO_DE_VERIFICACION_NO_CUADRA`). Preparación copiada de
 * `PropietarioForm.qa-prop.test.tsx`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { permisos, politica } = vi.hoisted(() => ({
  permisos: { valor: null as null | Record<string, unknown> },
  politica: { exigido: false, llamadas: 0 },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
  }),
}));

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));

vi.mock('@/lib/api/facturacion-electronica.service', () => ({
  facturacionElectronicaService: {
    tercerosSinCorreo: async () => {
      politica.llamadas += 1;
      return { exigido: politica.exigido };
    },
  },
}));

import { PropietarioForm } from './PropietarioForm';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

let container: HTMLDivElement;
let root: Root;
let scrollOriginal: typeof Element.prototype.scrollIntoView;
let traidos: Element[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  permisos.valor = null;
  politica.exigido = false;
  politica.llamadas = 0;
  traidos = [];
  scrollOriginal = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (this: Element) {
    traidos.push(this);
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Element.prototype.scrollIntoView = scrollOriginal;
});

const JORGE: Propietario = {
  id: 'p1',
  name: 'Jorge Restrepo',
  email: 'jorge@example.com',
  phone: '3101234567',
  documentType: 'CC',
  documentNumber: '71234567',
  bankAccount: {
    bank: 'bancolombia',
    accountType: 'savings',
    accountNumber: '0012344521',
    accountHolder: 'Carlos Restrepo',
  },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  createdAt: '2026-09-07',
  updatedAt: '2026-09-07',
};

/** La misma ficha sin cuenta: así la deja `normalizePropietario` (banco vacío, «Ahorros» por defecto). */
const SIN_CUENTA = {
  ...JORGE,
  bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' },
} as unknown as Propietario;

async function render(props: Partial<React.ComponentProps<typeof PropietarioForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    root.render(<PropietarioForm mode="create" onSubmit={onSubmit} onCancel={() => {}} {...props} />);
  });
  return onSubmit;
}

/** El control de un campo: su `id` termina en el nombre del campo. */
const control = (campo: string) => container.querySelector<HTMLElement>(`[id$="${campo}"]`);

async function escribir(campo: string, valor: string) {
  const input = control(campo) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function enviar() {
  const form = container.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('P-06 — el dígito de verificación del NIT', () => {
  const EMPRESA = { ...SIN_CUENTA, documentType: 'NIT', documentNumber: '901.222.333-5', name: 'Inversiones Laboratorio S.A.S.' } as Propietario;

  it('🔴 «901.222.333-5»: el DV es 9; se dice bajo el documento y no se manda', async () => {
    const onSubmit = await render({ mode: 'edit', initialData: EMPRESA });
    await enviar();
    expect(container.textContent).toContain('El dígito de verificación de este NIT es 9, no 5.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con el DV correcto (o sin DV) se manda', async () => {
    const onSubmit = await render({ mode: 'edit', initialData: { ...EMPRESA, documentNumber: '901222333-9' } as Propietario });
    await enviar();
    expect(container.textContent).not.toContain('El dígito de verificación de este NIT');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
