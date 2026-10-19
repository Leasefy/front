/**
 * Nico (QA de agentes 17-10, «Desde el contrato, uno por uno»): la cuenta de
 * cada dueño y «Cambiar cuenta» sin salir del contrato.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const permisos = vi.hoisted(() => ({ valor: null as null | { canAccess: (m: string, a: string) => boolean } }));
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => permisos.valor }));
const api = vi.hoisted(() => ({ cambiosDeCuenta: vi.fn() }));
vi.mock('@/lib/api/mandato.service', () => ({ mandatoApi: api }));
// El flujo del cambio es el de la ficha: aquí sólo importa que se monte.
vi.mock('@/components/inmobiliaria/mandato/CambioDeCuentaBancaria', () => ({
  CambioDeCuentaBancaria: (p: { propietarioId: string; pedirCambio: number }) => (
    <div data-testid="flujo-del-cambio" data-propietario={p.propietarioId} data-pedido={p.pedirCambio} />
  ),
}));

import { CuentaDelDueno } from './CuentaDelDueno';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  api.cambiosDeCuenta.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    cambios: [],
    cuentasVigentes: [
      { bankName: 'Bancolombia', bankAccountType: 'Ahorros', bankAccountNumber: '10060231153', bankAccountHolder: null, bankAccountHolderDocument: '21436689', bankAccountHolderDocumentType: 'CC', porcentaje: 100 },
    ],
  });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<CuentaDelDueno propietarioId="p-erika" nombre="Erika Andrea Agudelo Atehortua" documento="43710006" />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<CuentaDelDueno>', () => {
  it('con permiso: la cuenta, a nombre de quién y «Cambiar cuenta» abre el mismo flujo de la ficha', async () => {
    permisos.valor = { canAccess: () => true };
    await pintar();
    const texto = host.textContent ?? '';
    expect(texto).toContain('Bancolombia Ahorros •••• 1153');
    expect(texto).toContain('A nombre de otra persona (CC 21436689)');
    expect(host.querySelector('[data-testid="flujo-del-cambio"]')).toBeNull();
    await act(async () => {
      (host.querySelector('[data-testid="cambiar-cuenta-del-dueno"]') as HTMLButtonElement).click();
    });
    const flujo = host.querySelector('[data-testid="flujo-del-cambio"]');
    expect(flujo?.getAttribute('data-propietario')).toBe('p-erika');
    expect(flujo?.getAttribute('data-pedido')).toBe('1');
    // Abierto, el botón de afuera se va: la sección trae sus acciones y su estado al día.
    expect(host.querySelector('[data-testid="cambiar-cuenta-del-dueno"]')).toBeNull();
  });

  it('sin permiso de ver la plata (o fuera del panel): no muestra ni pide nada', async () => {
    permisos.valor = { canAccess: (m) => m !== 'dispersiones' };
    await pintar();
    expect(host.textContent).toBe('');
    permisos.valor = null;
    await pintar();
    expect(host.textContent).toBe('');
    expect(api.cambiosDeCuenta).not.toHaveBeenCalled();
  });

  it('con un cambio en curso: lo dice y ofrece «Ver el cambio», sin pedir otro', async () => {
    permisos.valor = { canAccess: () => true };
    api.cambiosDeCuenta.mockResolvedValue({ disponible: true, motivo: null, cambios: [{ id: 'c1', estado: 'PENDIENTE_CONFIRMACION' }], cuentasVigentes: [{ bankName: 'Bancolombia', bankAccountType: 'Ahorros', bankAccountNumber: '1153', bankAccountHolder: null, bankAccountHolderDocument: null, bankAccountHolderDocumentType: null, porcentaje: 100 }] });
    await pintar();
    expect(host.textContent).toContain('Cambio de cuenta: esperando la confirmación del propietario');
    const boton = host.querySelector('[data-testid="cambiar-cuenta-del-dueno"]') as HTMLButtonElement;
    expect(boton.textContent).toContain('Ver el cambio');
    await act(async () => boton.click());
    expect(host.querySelector('[data-testid="flujo-del-cambio"]')?.getAttribute('data-pedido')).toBe('0');
    // La sección abierta dice el estado al día (aprobar no relee lo de afuera).
    expect(host.querySelector('[data-testid="cambio-en-curso-del-dueno"]')).toBeNull();
  });
});
