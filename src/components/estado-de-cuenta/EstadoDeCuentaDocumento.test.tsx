/**
 * El documento en pantalla.
 *
 * Lo que se fija: que agrupe por contrato, que la fila partida por un abono
 * parcial se lea como saldo, que el punto de quiebre aparezca fechado, que los
 * totales salgan, que «Sistema anterior» se diga con esas palabras, y que un
 * cliente sin contratos reciba un vacío honesto en vez de un documento con
 * ceros.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// El documento no usa `useI18n`: sus palabras viven en `textos.ts` (ver el
// porqué allá). No hay nada que mockear.
import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { contrato, contratoConImpuestos, estadoDeCuenta, fila } from './ejemplo-de-prueba';

const HOY = '2026-09-13';

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

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('EstadoDeCuentaDocumento', () => {
  it('pinta la cabecera de la inmobiliaria y el cliente', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta()} hoy={HOY} />);
    const texto = host.textContent ?? '';
    expect(texto).toContain('PORTOFINO PROPIEDAD RAIZ S.A.S');
    expect(texto).toContain('901548190');
    expect(texto).toContain('J Y C PAPAS S.A.S');
    expect(texto).toContain('Caldas');
  });

  it('🔴 sin «Leasefy #…» (16-09): «Contrato 1298» en un migrado, «Contrato #14» en un nativo', () => {
    montar(
      <EstadoDeCuentaDocumento
        doc={estadoDeCuenta({
          contratos: [
            contrato({ numeroDeLeasefy: 1839 }),
            contrato({ id: 'ct-14', numero: '14', numeroDeLeasefy: 14 }),
          ],
        })}
        hoy={HOY}
      />,
    );
    const migrado = host.querySelector('[data-testid="contrato-1298"]')!;
    expect(migrado.textContent).toContain('Contrato 1298');
    expect(migrado.querySelector('[data-testid="numero-de-leasefy"]')).toBeNull();
    expect(migrado.textContent).not.toContain('Leasefy #');
    const nativo = host.querySelector('[data-testid="contrato-14"]')!;
    expect(nativo.textContent).toContain('Contrato #14');
    expect(nativo.querySelector('[data-testid="numero-de-leasefy"]')).toBeNull();
  });

  it('agrupa por contrato: una sección por cada uno, con su dirección', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta()} hoy={HOY} />);
    expect(host.querySelector('[data-testid="contrato-1298"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="contrato-1659"]')).not.toBeNull();
    expect(host.textContent).toContain('CL 129 SUR 56 53 LC 01 MEZANINE');
  });

  it('la fila partida por un abono parcial se lee como SALDO, no como otra cuota', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />);
    expect(host.textContent).toContain('Saldo pendiente');
  });

  it('el punto de quiebre sale fechado, con quién entró y quién salió', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />);
    const quiebre = host.querySelector('[data-testid="quiebre-2024-03-01"]');
    expect(quiebre).not.toBeNull();
    expect(quiebre?.textContent).toContain('Venta del inmueble');
    expect(quiebre?.textContent).toContain('CONSTRUCTORA ALEJANDRIA');
    expect(quiebre?.textContent).toContain('INVERSIONES EL PORTAL');
  });

  it('«Sistema anterior» se dice con esas palabras, no con «Contrato terminado»', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />);
    expect(host.textContent).toContain('Sistema anterior');
  });

  it('el total del contrato y el general salen, y el general es el número del CEO', () => {
    const doc = estadoDeCuenta();
    montar(<EstadoDeCuentaDocumento doc={doc} hoy={HOY} />);
    expect(
      host.querySelector('[data-testid="total-contrato-1298"]')?.textContent,
    ).toContain('1.407.098');
    expect(host.querySelector('[data-testid="total-general"]')?.textContent).toContain(
      '1.407.098',
    );
    expect(host.querySelector('[data-testid="resta-por-pagar"]')?.textContent).toContain(
      '1.407.098',
    );
  });

  it('con UN solo contrato no repite el total general debajo del total del contrato', () => {
    montar(
      <EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />,
    );
    expect(host.querySelector('[data-testid="total-general"]')).toBeNull();
  });

  it('un contrato sin impuestos no gasta columnas de ceros, y lo dice al pie', () => {
    montar(
      <EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />,
    );
    const encabezados = Array.from(host.querySelectorAll('th')).map((th) => th.textContent);
    expect(encabezados).not.toContain('IVA');
    expect(host.textContent).toContain(
      'No se muestran IVA, Retención, ReteIVA, ReteICA',
    );
  });

  it('un contrato CON IVA y retención sí pinta esas dos columnas', () => {
    montar(
      <EstadoDeCuentaDocumento
        doc={estadoDeCuenta({ contratos: [contratoConImpuestos()] })}
        hoy={HOY}
      />,
    );
    const encabezados = Array.from(host.querySelectorAll('th')).map((th) => th.textContent);
    expect(encabezados).toContain('IVA');
    expect(encabezados).toContain('Retención');
  });

  it('una cuota pendiente ya vencida lo dice con la palabra, no sólo con el color', () => {
    const c = contrato({
      secciones: {
        arriendos: [fila({ estado: 'PENDIENTE', fechaVencimiento: '2026-01-01', documentoDePago: null })],
        otrosConceptos: [],
      },
      cortes: [],
    });
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [c] })} hoy={HOY} />);
    expect(host.textContent).toContain('vencida');
  });

  it('un cliente SIN contratos recibe un vacío honesto, no un documento con ceros', () => {
    const doc = estadoDeCuenta({
      contratos: [],
      totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
    });
    montar(<EstadoDeCuentaDocumento doc={doc} hoy={HOY} />);
    expect(host.querySelector('[data-testid="estado-sin-contratos"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="contrato-1298"]')).toBeNull();
  });

  it('la barra de amortización dice cuántas cuotas van de cuántas', () => {
    montar(
      <EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [contrato()] })} hoy={HOY} />,
    );
    expect(host.querySelector('[data-testid="amortizacion-1298"]')).not.toBeNull();
    expect(host.textContent).toContain('1 de 4 cuotas');
    expect(host.textContent).toContain('1 del sistema anterior');
  });

  it('la nota de los filtros sale cuando hay filtros puestos', () => {
    montar(
      <EstadoDeCuentaDocumento doc={estadoDeCuenta()} hoy={HOY} nota="Ojo: filtrado" />,
    );
    expect(host.textContent).toContain('Ojo: filtrado');
  });

  it('lleva el CSS de impresión adentro: quien lo monte en otra pantalla se lo lleva', () => {
    montar(<EstadoDeCuentaDocumento doc={estadoDeCuenta()} hoy={HOY} />);
    const estilo = host.querySelector('style')?.textContent ?? '';
    expect(estilo).toContain('A4 landscape');
    // Un contrato por hoja, y el <thead> repetido por el navegador.
    expect(estilo).toContain('break-before: page');
    expect(estilo).toContain('table-header-group');
  });
});
