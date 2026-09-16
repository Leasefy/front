/**
 * Deducciones del propietario en pantalla.
 *
 * Lo que estos tests fijan, porque mueven lo que se le gira a un propietario:
 * - un descuento sin soporte NO se manda: se dice al lado del campo;
 * - lo que se manda es lo que se escribió (motivo sin espacios, valor en número);
 * - la ficha sólo ofrece registrar y anular a quien el back se lo va a dejar;
 * - sin la tabla en la base, se dice que no está disponible y no se ofrece registrar;
 * - el bloque de la liquidación pinta los números del back, y el saldo en contra
 *   se dice con palabras.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  DeduccionDelListado,
  DeduccionesDeLaLiquidacion,
  ListadoDeDeducciones,
} from '@/lib/types/deducciones';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast }));

const negadas = vi.hoisted(() => new Set<string>());
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: (modulo: string, accion: string) => !negadas.has(`${modulo}:${accion}`),
  }),
}));

const api = vi.hoisted(() => ({
  listar: vi.fn(),
  registrar: vi.fn(),
  anular: vi.fn(),
  urlDelSoporte: vi.fn(),
}));
vi.mock('@/lib/api/deducciones.service', () => ({ deduccionesApi: api }));

import { RegistrarDescuentoDialog } from './RegistrarDescuentoDialog';
import { DeduccionesDelPropietario } from './DeduccionesDelPropietario';
import { BloqueDeDeducciones } from './BloqueDeDeducciones';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  negadas.clear();
  api.listar.mockReset();
  api.registrar.mockReset();
  api.anular.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.clearAllMocks();
});

async function montar(elemento: React.ReactElement) {
  await act(async () => {
    raiz.render(elemento);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const texto = () => document.body.textContent ?? '';

function porTestId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.body.querySelector<T>(`[data-testid="${id}"]`);
  if (!el) throw new Error(`No está ${id}`);
  return el;
}

async function escribir(el: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function adjuntar(archivo: File) {
  const input = porTestId<HTMLInputElement>('descuento-soporte');
  await act(async () => {
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<RegistrarDescuentoDialog> — motivo y soporte obligatorios', () => {
  async function llenar(onGuardar: (d: unknown) => Promise<void>) {
    await montar(
      <RegistrarDescuentoDialog
        abierto
        onOpenChange={() => {}}
        inmuebles={[{ consignacionId: 'c1', titulo: 'Apto 402' }]}
        onGuardar={onGuardar}
      />,
    );
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-motivo')!, '  Predial 2026  ');
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-valor')!, '350000');
  }

  it('🔴 sin soporte no se manda nada y se dice por qué', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    await llenar(onGuardar);

    await clic(porTestId('descuento-guardar'));

    expect(onGuardar).not.toHaveBeenCalled();
    expect(texto()).toContain('Adjunta el soporte: sin él no se puede registrar el descuento.');
  });

  it('un soporte que no es PDF ni imagen tampoco se manda', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    await llenar(onGuardar);
    await adjuntar(new File(['x'], 'planilla.xlsx', { type: 'application/vnd.ms-excel' }));

    await clic(porTestId('descuento-guardar'));

    expect(onGuardar).not.toHaveBeenCalled();
    expect(texto()).toContain('El soporte tiene que ser un PDF o una imagen');
  });

  it('sin motivo no se manda', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    await montar(
      <RegistrarDescuentoDialog abierto onOpenChange={() => {}} inmuebles={[]} onGuardar={onGuardar} />,
    );
    await clic(porTestId('descuento-guardar'));
    expect(onGuardar).not.toHaveBeenCalled();
    expect(texto()).toContain('Escribe el motivo del descuento.');
  });

  it('con todo, manda lo que se escribió: motivo limpio, valor en número y el archivo', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    await montar(
      <RegistrarDescuentoDialog
        abierto
        onOpenChange={onOpenChange}
        inmuebles={[]}
        onGuardar={onGuardar}
      />,
    );
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-motivo')!, '  Predial 2026  ');
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-valor')!, '350000');
    const soporte = new File(['%PDF'], 'predial.pdf', { type: 'application/pdf' });
    await adjuntar(soporte);

    await clic(porTestId('descuento-guardar'));

    expect(onGuardar).toHaveBeenCalledWith({
      motivo: 'Predial 2026',
      valorCop: 350_000,
      consignacionId: null,
      soporte,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('si el back rechaza, el diálogo no se cierra', async () => {
    const onGuardar = vi.fn().mockRejectedValue(new Error('400'));
    const onOpenChange = vi.fn();
    await montar(
      <RegistrarDescuentoDialog abierto onOpenChange={onOpenChange} inmuebles={[]} onGuardar={onGuardar} />,
    );
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-motivo')!, 'Predial');
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-valor')!, '1000');
    await adjuntar(new File(['%PDF'], 'p.pdf', { type: 'application/pdf' }));

    await clic(porTestId('descuento-guardar'));

    expect(onGuardar).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

function deduccion(extra: Partial<DeduccionDelListado> = {}): DeduccionDelListado {
  return {
    id: 'ded-1',
    propietarioId: 'p1',
    origen: 'MANUAL',
    motivo: 'Predial 2026',
    valorCop: 350_000,
    mesDesde: '2026-09',
    fecha: '2026-09-02',
    grupoId: 'g-1',
    valorTotalCop: 350_000,
    participacionBps: 10_000,
    consignacionId: null,
    solicitudMantenimientoId: null,
    tieneSoporte: true,
    soporteNombre: 'predial.pdf',
    estado: 'EN_LIQUIDACION',
    mesDeLaLiquidacion: '2026-09',
    loteId: null,
    aplicadaAt: null,
    anuladaAt: null,
    motivoDeAnulacion: null,
    createdAt: '2026-09-02T15:00:00.000Z',
    ...extra,
  };
}

function listado(extra: Partial<ListadoDeDeducciones> = {}): ListadoDeDeducciones {
  return {
    disponible: true,
    motivo: null,
    deducciones: [
      deduccion(),
      deduccion({
        id: 'ded-2',
        grupoId: 'g-2',
        origen: 'REPARACION',
        motivo: 'Cambio de calentador',
        valorCop: 210_000,
        valorTotalCop: 300_000,
        participacionBps: 7_000,
        estado: 'APLICADA',
        mesDeLaLiquidacion: '2026-08',
        tieneSoporte: false,
        soporteNombre: null,
      }),
      deduccion({
        id: 'ded-3',
        grupoId: 'g-3',
        origen: 'SALDO_ANTERIOR',
        motivo: 'Saldo en contra de agosto',
        estado: 'PENDIENTE',
        mesDeLaLiquidacion: null,
        tieneSoporte: false,
        soporteNombre: null,
      }),
    ],
    totales: { pendienteCop: 350_000, enLiquidacionCop: 350_000, saldoEnContraCop: 350_000 },
    ...extra,
  };
}

describe('<DeduccionesDelPropietario> — en la ficha', () => {
  it('lista cada deducción con su estado, su parte y su soporte', async () => {
    api.listar.mockResolvedValue(listado());
    await montar(<DeduccionesDelPropietario propietarioId="p1" inmuebles={[]} />);

    expect(api.listar).toHaveBeenCalledWith('p1');
    const manual = porTestId('deduccion-ded-1');
    expect(manual.textContent).toContain('Descuento: Predial 2026');
    expect(manual.textContent).toContain('En la liquidación de');
    expect(manual.querySelector('[data-testid="soporte-ded-1"]')).not.toBeNull();

    const reparacion = porTestId('deduccion-ded-2');
    expect(reparacion.textContent).toContain('Reparación: Cambio de calentador');
    expect(reparacion.textContent).toContain('Su parte (70 %)');
    expect(reparacion.textContent).toContain('Descontada en');

    // El saldo del mes anterior no repite su motivo: el rótulo ya lo dice.
    expect(porTestId('deduccion-ded-3').textContent).toContain('Saldo en contra del mes anterior');
  });

  it('se anula sólo lo que todavía no se aplicó, y nunca un saldo en contra', async () => {
    api.listar.mockResolvedValue(listado());
    await montar(<DeduccionesDelPropietario propietarioId="p1" inmuebles={[]} />);

    expect(document.body.querySelector('[data-testid="anular-ded-1"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="anular-ded-2"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="anular-ded-3"]')).toBeNull();
  });

  it('anular manda el grupo con el motivo escrito y vuelve a leer', async () => {
    api.listar.mockResolvedValue(listado());
    api.anular.mockResolvedValue(undefined);
    await montar(<DeduccionesDelPropietario propietarioId="p1" inmuebles={[]} />);

    await clic(porTestId('anular-ded-1'));
    await escribir(document.body.querySelector<HTMLInputElement>('#anular-motivo')!, 'Lo pagó el propietario');
    const confirmar = [...porTestId('anular-deduccion').querySelectorAll('button')].find(
      (b) => b.textContent === 'Anular descuento',
    )!;
    await clic(confirmar);

    expect(api.anular).toHaveBeenCalledWith('p1', 'g-1', 'Lo pagó el propietario');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });

  it('🔴 sin `dispersiones:create` no ofrece registrar; sin `dispersiones:edit` no ofrece anular', async () => {
    negadas.add('dispersiones:create');
    negadas.add('dispersiones:edit');
    api.listar.mockResolvedValue(listado());
    await montar(<DeduccionesDelPropietario propietarioId="p1" inmuebles={[]} />);

    expect(document.body.querySelector('[data-testid="registrar-descuento-abrir"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="anular-ded-1"]')).toBeNull();
    // Ver, sí.
    expect(document.body.querySelector('[data-testid="deduccion-ded-1"]')).not.toBeNull();
  });

  it('sin la tabla en la base dice que no está disponible y no ofrece registrar', async () => {
    api.listar.mockResolvedValue(
      listado({ disponible: false, motivo: 'Falta la migración', deducciones: [] }),
    );
    await montar(<DeduccionesDelPropietario propietarioId="p1" inmuebles={[]} />);

    expect(document.body.querySelector('[data-testid="deducciones-sin-tabla"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="registrar-descuento-abrir"]')).toBeNull();
    expect(texto()).not.toContain('Este propietario no tiene deducciones.');
  });

  it('registrar abre el diálogo y, al guardar, manda al back y vuelve a leer', async () => {
    api.listar.mockResolvedValue(listado({ deducciones: [] }));
    api.registrar.mockResolvedValue({});
    await montar(
      <DeduccionesDelPropietario propietarioId="p1" inmuebles={[{ consignacionId: 'c1', titulo: 'Apto 402' }]} />,
    );
    expect(texto()).toContain('Este propietario no tiene deducciones.');

    await clic(porTestId('registrar-descuento-abrir'));
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-motivo')!, 'Servicios de agosto');
    await escribir(document.body.querySelector<HTMLInputElement>('#descuento-valor')!, '120000');
    const soporte = new File(['%PDF'], 'epm.pdf', { type: 'application/pdf' });
    await adjuntar(soporte);
    await clic(porTestId('descuento-guardar'));

    expect(api.registrar).toHaveBeenCalledWith('p1', {
      motivo: 'Servicios de agosto',
      valorCop: 120_000,
      consignacionId: null,
      soporte,
    });
    expect(toast.success).toHaveBeenCalledWith('Descuento registrado');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });
});

function bloque(extra: Partial<DeduccionesDeLaLiquidacion> = {}): DeduccionesDeLaLiquidacion {
  const d = deduccion({ estado: 'EN_LIQUIDACION' });
  return {
    netoDelMesCop: 900_000,
    deducciones: [d],
    deduccionesCop: 350_000,
    saldoAnteriorCop: 0,
    netoCop: 550_000,
    aGirarCop: 550_000,
    saldoEnContraCop: 0,
    compensadoCop: 350_000,
    renglones: [{ concepto: 'Descuento: Predial 2026', valorCop: -350_000, motivo: 'Predial 2026' }],
    ...extra,
  };
}

describe('<BloqueDeDeducciones> — la liquidación con sus deducciones', () => {
  it('sin deducciones no pinta nada: la liquidación se lee como siempre', async () => {
    await montar(<BloqueDeDeducciones bloque={bloque({ deducciones: [], renglones: [] })} />);
    expect(document.body.querySelector('[data-testid="bloque-de-deducciones"]')).toBeNull();
    await montar(<BloqueDeDeducciones bloque={undefined} />);
    expect(document.body.querySelector('[data-testid="bloque-de-deducciones"]')).toBeNull();
  });

  it('pinta el neto del mes, cada deducción y el neto a girar que manda el back', async () => {
    await montar(<BloqueDeDeducciones bloque={bloque()} propietarioId="p1" />);

    const b = porTestId('bloque-de-deducciones');
    expect(b.textContent).toContain('Neto del mes');
    expect(b.textContent).toContain('Descuento: Predial 2026');
    expect(porTestId('bloque-a-girar').textContent).toBe('$550.000');
    expect(document.body.querySelector('[data-testid="bloque-saldo-en-contra"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="soporte-ded-1"]')).not.toBeNull();
  });

  it('🔴 si las deducciones superan el neto: gira $0 y dice cuánto pasa a la siguiente liquidación', async () => {
    await montar(
      <BloqueDeDeducciones
        bloque={bloque({
          netoDelMesCop: 200_000,
          netoCop: -150_000,
          aGirarCop: 0,
          saldoEnContraCop: 150_000,
          compensadoCop: 200_000,
        })}
      />,
    );

    expect(porTestId('bloque-a-girar').textContent).toBe('$0');
    expect(porTestId('bloque-saldo-en-contra').textContent).toContain(
      '$150.000 pasan a su siguiente liquidación',
    );
  });
});
