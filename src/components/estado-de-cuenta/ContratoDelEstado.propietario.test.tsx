/**
 * El estado de cuenta del PROPIETARIO cabe en escritorio (P-19, QA-PROP 03-10).
 *
 * A 1440 px decía «Esta tabla no cabe entera: se corre a los lados» en todos
 * los contratos: el lado del propietario lleva, además del canon, la comisión
 * y sus impuestos —hasta cinco columnas más (1.464 px en una caja de 1.052)—.
 * Del lado del propietario esas columnas se pliegan en UNA («Comisión e
 * impuestos») con cada valor que no es cero, y el vencimiento atrasado baja a
 * su línea («atrasado», en ámbar: es un giro que la inmobiliaria debe, no una
 * deuda suya). El encabezado dice el TIPO de documento, no «NIT/CC».
 *
 * El lado del INQUILINO queda igual: una columna por impuesto y «vencida».
 */

import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./AnticipoDelContrato', () => ({ AnticipoDelContratoSeccion: () => null }));
vi.mock('./SaldoAFavorAlTerminar', () => ({ SaldoAFavorAlTerminarSeccion: () => null }));

import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { contrato, contratoConImpuestos, estadoDeCuenta, fila } from './ejemplo-de-prueba';
import { documentoDelCliente } from './filas';

const HOY = '2026-10-03';

let host: HTMLDivElement;
let root: Root;

function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(nodo);
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

/** Un contrato del lado PROPIETARIO con canon, IVA, retención y la comisión con su IVA y su retención. */
function contratoDelPropietario() {
  return contrato({
    id: 'ct-7',
    numero: '7',
    rol: 'PROPIETARIO',
    cortes: [],
    secciones: {
      arriendos: [
        fila({
          concepto: 'Canon de arrendamiento',
          estado: 'PENDIENTE',
          fechaDePago: null,
          documentoDePago: null,
          fechaVencimiento: '2026-09-01',
          valorBruto: 4_500_000,
          iva: 855_000,
          retencion: 157_500,
          comision: 360_000,
          ivaComision: 68_400,
          retencionComision: 39_600,
          valorNeto: 4_966_200,
        }),
        fila({
          concepto: 'Canon de arrendamiento',
          estado: 'PENDIENTE',
          fechaDePago: null,
          documentoDePago: null,
          fechaVencimiento: '2026-11-01',
          valorBruto: 4_500_000,
          iva: 855_000,
          retencion: 0,
          comision: 360_000,
          ivaComision: 68_400,
          retencionComision: 39_600,
          valorNeto: 4_966_200,
        }),
      ],
      otrosConceptos: [],
    },
  });
}

const tablaDe = (numero: string) =>
  host.querySelector(`[data-testid="arriendos-${numero}"] [data-tabla] table`) as HTMLTableElement;

describe('Estado de cuenta del propietario — cabe en escritorio (P-19)', () => {
  it('🔴 las columnas de impuestos se pliegan en UNA, «Comisión e impuestos»', () => {
    montar(
      <EstadoDeCuentaDocumento
        doc={estadoDeCuenta({ cliente: { nombre: 'Inversiones', documento: '901222333', tipo: 'PROPIETARIO' }, contratos: [contratoDelPropietario()] })}
        hoy={HOY}
      />,
    );
    const encabezados = Array.from(tablaDe('7').querySelectorAll('th')).map((th) => th.textContent);
    expect(encabezados).toEqual(['Concepto', 'Vence', 'Estado', 'Valor bruto', 'Comisión e impuestos', 'Valor neto', 'Pago']);
    expect(encabezados).not.toContain('IVA comisión');
  });

  it('cada fila dice sus impuestos con nombre y monto entero, sólo los que no son cero', () => {
    montar(
      <EstadoDeCuentaDocumento
        doc={estadoDeCuenta({ cliente: { nombre: 'Inversiones', documento: '901222333', tipo: 'PROPIETARIO' }, contratos: [contratoDelPropietario()] })}
        hoy={HOY}
      />,
    );
    const [primera, segunda] = Array.from(tablaDe('7').querySelectorAll('[data-testid="impuestos-plegados"]'));
    const nombres = (dl: Element) => Array.from(dl.querySelectorAll('dt')).map((dt) => dt.textContent);
    expect(nombres(primera)).toEqual(['IVA', 'Retención', 'Comisión', 'IVA comisión', 'Ret. comisión']);
    // La segunda no tiene retención: no sale un «$ 0».
    expect(nombres(segunda)).toEqual(['IVA', 'Comisión', 'IVA comisión', 'Ret. comisión']);
    // El monto no se parte.
    for (const dd of Array.from(primera.querySelectorAll('dd'))) expect(dd.className).toContain('whitespace-nowrap');
  });

  it('🔴 lo vencido del propietario dice «atrasado» en ámbar y en su línea, no «vencida» en rojo', () => {
    montar(
      <EstadoDeCuentaDocumento
        doc={estadoDeCuenta({ cliente: { nombre: 'Inversiones', documento: '901222333', tipo: 'PROPIETARIO' }, contratos: [contratoDelPropietario()] })}
        hoy={HOY}
      />,
    );
    const atrasado = tablaDe('7').querySelector('[data-testid="vence-atrasado"]')!;
    expect(atrasado.textContent).toBe('atrasado');
    expect(atrasado.className).toContain('text-warning');
    expect(atrasado.className).toContain('block');
    expect(tablaDe('7').textContent).not.toContain('vencida');
  });

  it('el lado del INQUILINO queda igual: una columna por impuesto', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contratoConImpuestos()] })} hoy="2026-09-13" />);
    const encabezados = Array.from(tablaDe('1659').querySelectorAll('th')).map((th) => th.textContent);
    expect(encabezados).toContain('IVA');
    expect(encabezados).toContain('Retención');
    expect(encabezados).not.toContain('Comisión e impuestos');
    expect(tablaDe('1659').querySelector('[data-testid="impuestos-plegados"]')).toBeNull();
  });

  it('el inquilino sigue viendo «vencida»', () => {
    const c = contrato({
      secciones: {
        arriendos: [fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-01-01', documentoDePago: null, fechaDePago: null })],
        otrosConceptos: [],
      },
    });
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [c] })} hoy="2026-09-13" />);
    expect(tablaDe('1298').textContent).toContain('vencida');
    expect(tablaDe('1298').querySelector('[data-testid="vence-atrasado"]')).toBeNull();
  });
});

describe('El encabezado dice el tipo de documento (P-19)', () => {
  it('🔴 con el tipo: «CC 52123456», no «NIT/CC»', () => {
    montar(
      <EstadoDeCuentaDocumento
        doc={estadoDeCuenta({
          cliente: { nombre: 'Paula', documento: '52123456', tipoDocumento: 'CC', tipo: 'PROPIETARIO' },
          contratos: [contratoDelPropietario()],
        })}
        hoy={HOY}
      />,
    );
    const linea = host.querySelector('[data-testid="estado-resumen"] p')!.textContent;
    expect(linea).toContain('CC 52123456');
    expect(linea).not.toContain('NIT/CC');
  });

  it('sin el tipo (un back anterior) queda como antes', () => {
    expect(documentoDelCliente({ documento: '52123456' })).toBe('NIT/CC 52123456');
    expect(documentoDelCliente({ documento: '900555006', tipoDocumento: 'NIT' })).toBe('NIT 900555006');
    expect(documentoDelCliente({ documento: null, tipoDocumento: 'CC' })).toBeNull();
  });
});
