/**
 * Sistema de errores (02-10-2026): lo que el back rechaza por campo se pinta
 * bajo SU campo del formulario real, con `ErrorDelCampo`, y el primero recibe
 * el foco. Antes `PropietarioForm` sólo sabía pintar UN error del servidor y
 * el resto se amontonaba en un aviso arriba.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ isAdmin: true, isLoading: false, canAccess: () => true }),
}));
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
import { errorAlGuardarPropietario } from '@/lib/propietarios/errores-del-propietario';
import { ApiError } from '@/lib/api/client';
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
    accountType: 'savings',
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

const CUATROCIENTOS = new ApiError(400, ['Revisa el teléfono.', 'Revisa la cuenta.'], 'DATOS_INVALIDOS', {
  code: 'DATOS_INVALIDOS',
  campos: [
    { campo: 'phone', regla: 'formato', mensaje: 'Revisa el teléfono.' },
    { campo: 'bankAccountNumber', regla: 'formato', mensaje: 'Revisa la cuenta.' },
  ],
});

async function pintarConError(e: unknown) {
  const error = errorAlGuardarPropietario(e);
  await act(async () => {
    root.render(
      <PropietarioForm
        initialData={JORGE}
        // P-14 (QA de Propietarios, 03-10): en «Editar» la cuenta que ya existe
        // es de sólo lectura y no viaja, así que un 400 sobre la cuenta sólo
        // puede volver al CREAR (con los datos prellenados, como «Crear con IA»).
        mode="create"
        onSubmit={async () => {}}
        onCancel={() => {}}
        serverError={error.campo}
        serverErrors={error.porCampo}
      />,
    );
  });
  return error;
}

/** El control que nombra este error en `aria-describedby`. */
function controlDelError(texto: string): HTMLElement | null {
  const error = Array.from(container.querySelectorAll<HTMLElement>('[role="alert"]')).find(
    (n) => n.textContent === texto,
  );
  if (!error?.id) return null;
  return container.querySelector<HTMLElement>(`[aria-describedby="${error.id}"]`);
}

describe('PropietarioForm — los errores del servidor van a SU campo', () => {
  it('🔴 un 400 con dos `campos`: cada uno bajo su campo, marcado inválido', async () => {
    await pintarConError(CUATROCIENTOS);

    const telefono = controlDelError('Revisa el teléfono.');
    const cuenta = controlDelError('Revisa la cuenta.');
    expect(telefono).not.toBeNull();
    expect(cuenta).not.toBeNull();
    expect((telefono as HTMLInputElement).type).toBe('tel');
    expect((cuenta as HTMLInputElement).value).toBe('0012344521');
    expect(telefono!.getAttribute('aria-invalid')).toBe('true');
    expect(cuenta!.getAttribute('aria-invalid')).toBe('true');
  });

  it('el primero que mandó el servidor recibe el foco', async () => {
    await pintarConError(CUATROCIENTOS);
    expect(document.activeElement).toBe(controlDelError('Revisa el teléfono.'));
  });

  it('el duplicado del 409 va al documento y lo enfoca', async () => {
    await pintarConError(new ApiError(409, 'Ya existe un propietario con el documento 71234567'));
    const documento = controlDelError('Ese documento ya está cargado');
    expect(documento).not.toBeNull();
    expect(document.activeElement).toBe(documento);
  });

  it('al corregir el campo, su error se va', async () => {
    await pintarConError(CUATROCIENTOS);
    const telefono = controlDelError('Revisa el teléfono.') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(telefono, '3009998877');
      telefono.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(telefono.getAttribute('aria-invalid')).toBeNull();
    // `ErrorDelCampo` sale con su animación: el control ya no lo nombra inválido
    // y el de la cuenta sigue.
    expect(controlDelError('Revisa la cuenta.')).not.toBeNull();
  });
});
