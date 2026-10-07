/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — CA-06, decisión de Nico (a):
 * en el estado de cuenta del propietario, la cuota de un inmueble en
 * copropiedad que vino de la migración sin el % de cada dueño sale «Sin
 * definir · falta el porcentaje», sin «$ 0» y sin «atrasado» (el back la manda
 * en cero con `sinPorcentaje`). Igual en el PDF.
 */
import * as React from 'react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./AnticipoDelContrato', () => ({ AnticipoDelContratoSeccion: () => <div /> }));
vi.mock('./SaldoAFavorAlTerminar', () => ({ SaldoAFavorAlTerminarSeccion: () => <div /> }));

import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { EstadoDeCuentaPDF } from './estado-de-cuenta-pdf';
import { contrato, estadoDeCuenta, fila } from './ejemplo-de-prueba';

let host: HTMLDivElement | null = null;
let root: Root;
afterEach(() => {
  if (!host) return;
  act(() => root.unmount());
  host.remove();
  host = null;
});

const filaSinPorcentaje = fila({
  concepto: 'Canon de arrendamiento. Del 1 al 30 de septiembre de 2026',
  estado: 'PENDIENTE',
  fechaDePago: null,
  documentoDePago: null,
  valorBruto: 0,
  valorNeto: 0,
  fechaVencimiento: '2026-09-15',
  periodoDesde: '2026-09-01',
  periodoHasta: '2026-09-30',
  sinPorcentaje: true,
});

const doc = () =>
  estadoDeCuenta({
    cliente: { nombre: 'Gloria Propietaria Henao', documento: '43111222', tipo: 'PROPIETARIO' },
    contratos: [
      contrato({
        id: 'ct-9601', numero: '9601', rol: 'PROPIETARIO', inmueble: { direccion: 'Carrera 80 # 33-12 Apto 502' },
        copropiedad: { suParteBps: null, propietarios: 2 },
        secciones: { arriendos: [filaSinPorcentaje], otrosConceptos: [] },
      }),
    ],
  });

function letraDelPdf(nodo: ReactNode): string {
  const salida: string[] = [];
  const recoger = (actual: ReactNode): void => {
    if (actual === null || actual === undefined || typeof actual === 'boolean') return;
    if (typeof actual === 'string' || typeof actual === 'number') return void salida.push(String(actual));
    if (Array.isArray(actual)) return actual.forEach((h) => recoger(h as ReactNode));
    if (!isValidElement(actual)) return;
    const el = actual as ReactElement<{ children?: ReactNode }>;
    if (typeof el.type === 'function') return recoger((el.type as (p: unknown) => ReactNode)(el.props));
    recoger(el.props?.children);
  };
  recoger(nodo);
  return salida.join('\n');
}

describe('la cuota sin el % de cada dueño (CA-06)', () => {
  it('🔴 la fila dice «Sin definir · falta el porcentaje», sin «$ 0» y sin «atrasado»', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<EstadoDeCuentaDocumento doc={doc()} hoy="2026-10-06" />));
    expect(host.querySelector('[data-testid="sin-porcentaje"]')?.textContent).toBe('Sin definir · falta el porcentaje');
    expect(host.querySelector('[data-testid="vence-atrasado"]')).toBeNull();
    // Ni la fila ni la barra del contrato dicen «$ 0»: su parte no está definida.
    const fila = host.querySelector('[data-testid="sin-porcentaje"]')?.closest('tr')?.textContent ?? '';
    expect(fila).not.toMatch(/\$\s?0(?![\d.])/);
    expect(host.querySelector('[data-testid="amortizacion-9601"]')).toBeNull();
  });

  it('🔴 el PDF dice lo mismo', () => {
    const letra = letraDelPdf(EstadoDeCuentaPDF({ doc: doc(), hoy: '2026-10-06' }));
    expect(letra).toContain('Sin definir · falta el porcentaje');
  });
});
