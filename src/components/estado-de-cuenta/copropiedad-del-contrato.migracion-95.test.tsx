/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — CA-05: «el propietario
 * migrado ve su inmueble y su mandato (y su % en copropiedad)».
 *
 * Pedro Pablo Henao (50 % de 9004 con Gloria) veía en su estado de cuenta
 * $ 675.000 por cuota —la mitad del canon— sin que nada dijera que es
 * copropietario ni de cuánto. Ahora el encabezado del contrato lo dice, en la
 * pantalla y en el PDF; con un solo dueño no se dice nada (el 100 % sobra).
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
import { contrato, estadoDeCuenta } from './ejemplo-de-prueba';
import type { ContratoDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

let host: HTMLDivElement | null = null;
let root: Root;
afterEach(() => {
  if (!host) return;
  act(() => root.unmount());
  host.remove();
  host = null;
});

const delPropietario = (copropiedad?: ContratoDelEstadoDeCuenta['copropiedad']) =>
  estadoDeCuenta({
    cliente: { nombre: 'Pedro Pablo Henao', documento: '98765432', tipo: 'PROPIETARIO' },
    contratos: [contrato({ id: 'ct-4', numero: '4', rol: 'PROPIETARIO', inmueble: { direccion: 'CL 10 32 15 AP 302' }, ...(copropiedad ? { copropiedad } : {}) })],
  });

function pintar(doc: ReturnType<typeof estadoDeCuenta>) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<EstadoDeCuentaDocumento doc={doc} hoy="2026-10-06" />));
  return host;
}

/** Todas las cadenas del árbol del PDF (los componentes del documento son funciones puras). */
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

describe('el % del propietario en copropiedad (CA-05)', () => {
  it('la pantalla dice «Copropiedad entre 2 propietarios · su parte: 50 %»', () => {
    const h = pintar(delPropietario({ suParteBps: 5000, propietarios: 2 }));
    expect(h.querySelector('[data-testid="copropiedad-del-contrato"]')?.textContent).toBe('Copropiedad entre 2 propietarios · su parte: 50 %');
  });

  it('una parte con decimales se escribe con coma: 33,33 %', () => {
    const h = pintar(delPropietario({ suParteBps: 3333, propietarios: 3 }));
    expect(h.querySelector('[data-testid="copropiedad-del-contrato"]')?.textContent).toBe('Copropiedad entre 3 propietarios · su parte: 33,33 %');
  });

  it('🔴 sin el porcentaje de cada dueño (migración) no dice «50 %»: dice que falta y que el giro no sale', () => {
    const h = pintar(delPropietario({ suParteBps: null, propietarios: 2 }));
    const linea = h.querySelector('[data-testid="copropiedad-del-contrato"]')?.textContent ?? '';
    expect(linea).toBe('Copropiedad entre 2 propietarios · falta el porcentaje de cada propietario: el giro no sale hasta que la inmobiliaria lo ponga');
    expect(linea).not.toMatch(/%/);
    expect(letraDelPdf(EstadoDeCuentaPDF({ doc: delPropietario({ suParteBps: null, propietarios: 2 }), hoy: '2026-10-06' }))).toContain('falta el porcentaje de cada propietario');
  });

  it('con un solo dueño no se dice nada', () => {
    const h = pintar(delPropietario());
    expect(h.textContent).toContain('CL 10 32 15 AP 302');
    expect(h.querySelector('[data-testid="copropiedad-del-contrato"]')).toBeNull();
  });

  it('el PDF lo dice igual, y sin copropiedad no', () => {
    expect(letraDelPdf(EstadoDeCuentaPDF({ doc: delPropietario({ suParteBps: 5000, propietarios: 2 }), hoy: '2026-10-06' }))).toMatch(/Copropiedad entre 2 propietarios · su parte: 50\s%/);
    expect(letraDelPdf(EstadoDeCuentaPDF({ doc: delPropietario(), hoy: '2026-10-06' }))).not.toContain('Copropiedad');
  });
});
