/**
 * 🔴 P-14 / QA-PROP (03-10): el lápiz de la tarjeta «Cuenta bancaria» abría
 * «Editar», que dejaba cambiar banco y número y al guardar el back respondía
 * 409 «no se cambia desde la ficha». Con cuenta, el lápiz pide «Cambiar
 * cuenta» (`pedirCambio` sube): se abre el pedido controlado. Si ya hay un
 * cambio en curso, no se abre un segundo: la sección lo dice.
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
  archivoDelCambio: vi.fn(),
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

const CUENTA = {
  bankName: 'Bancolombia',
  bankAccountType: 'Ahorros',
  bankAccountNumber: '0012344521',
  bankAccountHolder: null,
  bankAccountHolderDocument: null,
  bankAccountHolderDocumentType: null,
};

const SIN_CAMBIOS = {
  disponible: true,
  motivo: null,
  cambios: [],
  cuentasVigentes: [],
  repartoDisponible: true,
  motivoDelReparto: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.cambiosDeCuenta.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar(pedirCambio: number, props: { tieneCuenta?: boolean; puedeEditar?: boolean } = {}) {
  await act(async () => {
    root.render(
      <CambioDeCuentaBancaria
        propietarioId="p1"
        propietario={{ nombre: 'Paula Ruiz', documento: '52123456' }}
        tieneCuenta={props.tieneCuenta ?? true}
        puedeEditar={props.puedeEditar ?? true}
        onCuentaCambiada={() => {}}
        pedirCambio={pedirCambio}
      />,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const pedido = () => document.body.querySelector('[data-testid="pedir-cambio"]');

describe('«Cambiar cuenta» pedido desde afuera (el lápiz de la cuenta)', () => {
  it('sin pedido no se abre nada', async () => {
    h.cambiosDeCuenta.mockResolvedValue(SIN_CAMBIOS);
    await pintar(0);
    expect(pedido()).toBeNull();
  });

  it('🔴 cuando el lápiz pide el cambio, se abre el pedido controlado', async () => {
    h.cambiosDeCuenta.mockResolvedValue(SIN_CAMBIOS);
    await pintar(0);
    await pintar(1);
    expect(pedido()).not.toBeNull();
  });

  it('con un cambio ya en curso no se abre un segundo pedido', async () => {
    h.cambiosDeCuenta.mockResolvedValue({
      ...SIN_CAMBIOS,
      cambios: [
        {
          id: 'c1',
          propietarioId: 'p1',
          estado: 'PENDIENTE_CONFIRMACION',
          cuentaAnterior: CUENTA,
          cuentaNueva: { ...CUENTA, bankAccountNumber: '0099991111' },
          certificacionNombre: 'certificacion.pdf',
          canal: 'EMAIL',
          destinoEnmascarado: 'p***@example.test',
          envioEstado: 'SIMULADO',
          expiraAt: '2026-10-04T10:00:00Z',
          intentos: 0,
          confirmadoAt: null,
          confirmadoPor: null,
          aprobadoAt: null,
          aprobadoPorUserId: null,
          tieneSoporteDeAprobacion: false,
          cerradoAt: null,
          motivoDeCierre: null,
          solicitadoPorUserId: 'u-admin',
          createdAt: '2026-10-03T10:00:00Z',
          retieneElGiro: false,
        },
      ],
    });
    await pintar(0);
    await pintar(1);
    expect(pedido()).toBeNull();
  });

  it('sin permiso de editar tampoco se abre', async () => {
    h.cambiosDeCuenta.mockResolvedValue(SIN_CAMBIOS);
    await pintar(0, { puedeEditar: false });
    await pintar(1, { puedeEditar: false });
    expect(pedido()).toBeNull();
  });
});
