/**
 * 🔴 SO-09 (QA 04-10): el estado de cuenta del propietario muestra cada
 * descuento de sus giros (concepto, inmueble, soporte, mes, valor y estado) y
 * «Por descontar» es la cifra que el giro resta.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { DeduccionesDelEstado, type DeduccionesDelEstadoDto } from './DeduccionesDelEstado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const PAULA: DeduccionesDelEstadoDto = {
  porDescontarCop: 230_000,
  aplicadasCop: 0,
  filas: [
    {
      id: 'fb08d0ad',
      origen: 'REPARACION',
      concepto: 'QA DÍA: fuga en el lavamanos del baño · Plomería QA Día S.A.S.',
      inmueble: 'Calle 45 # 70-12 Apto 301',
      mes: '2026-10',
      valorCop: 180_000,
      estado: 'EN_LIQUIDACION',
      tieneSoporte: false,
      soporteNombre: null,
      fecha: '2026-10-04',
      solicitudMantenimientoId: 'sol-1',
    },
    {
      id: 'a95cac15',
      origen: 'MANUAL',
      concepto: 'Arreglo de la llave del baño (prueba QA)',
      inmueble: 'Calle 45 # 70-12 Apto 301',
      mes: '2026-10',
      valorCop: 50_000,
      estado: 'EN_LIQUIDACION',
      tieneSoporte: true,
      soporteNombre: 'soporte.pdf',
      fecha: '2026-10-03',
      solicitudMantenimientoId: null,
    },
  ],
};

describe('🔴 SO-09 — los descuentos en el estado de cuenta del propietario', () => {
  it('cada descuento con concepto, inmueble, mes, estado y valor; «Por descontar» cuadra con el giro', () => {
    act(() => root.render(<DeduccionesDelEstado deducciones={PAULA} />));
    const bloque = document.body.querySelector('[data-testid="estado-deducciones"]')!;
    expect(bloque.textContent).toContain('Reparación: QA DÍA: fuga en el lavamanos del baño');
    expect(bloque.textContent).toContain('Descuento: Arreglo de la llave del baño');
    expect(bloque.textContent).toContain('Calle 45 # 70-12 Apto 301');
    expect(bloque.textContent).toContain('En la liquidación de octubre de 2026');
    expect(bloque.textContent).toMatch(/180\.000/);
    expect(document.body.querySelector('[data-testid="estado-deducciones-por-descontar"]')!.textContent).toMatch(/230\.000/);
  });

  it('el soporte se abre con su URL firmada', async () => {
    const abrirSoporte = vi.fn().mockResolvedValue('https://firmada/soporte.pdf');
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    act(() => root.render(<DeduccionesDelEstado deducciones={PAULA} abrirSoporte={abrirSoporte} />));
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="estado-deduccion-soporte-a95cac15"]')!.click();
    });
    expect(abrirSoporte).toHaveBeenCalledWith('a95cac15');
    expect(open).toHaveBeenCalledWith('https://firmada/soporte.pdf', '_blank', 'noopener,noreferrer');
    // La reparación no tiene soporte: no ofrece abrir nada.
    expect(document.body.querySelector('[data-testid="estado-deduccion-soporte-fb08d0ad"]')).toBeNull();
  });

  it('sin descuentos (o sin el bloque del back) no dibuja nada', () => {
    act(() => root.render(<DeduccionesDelEstado deducciones={null} />));
    expect(document.body.querySelector('[data-testid="estado-deducciones"]')).toBeNull();
  });
});
