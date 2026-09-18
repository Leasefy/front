/**
 * page.test.tsx — Facturación.
 *
 * Nico (2026-09-03): «esas tabs ¿por qué están fuera de la tabla? sabes que
 * deben quedar dentro». Lo que fija esta prueba es la forma de la tarjeta:
 * las pestañas ADENTRO, el vacío en el cuerpo con los encabezados visibles, y
 * ningún control sin comportamiento (la leyenda de estados que no filtraba y
 * «Nueva factura», que sólo mostraba un toast).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

/*
 * «Nueva factura» es la pestaña por defecto desde 2026-09-12 y pide el listado
 * del mes al back. Acá se prueba la TARJETA —las pestañas adentro, el vacío en
 * el cuerpo, ningún control sin comportamiento—, así que se reemplaza por un
 * marcador: su propio comportamiento vive en `NuevaFactura.test.tsx`.
 */
vi.mock('@/components/facturacion/NuevaFactura', () => ({
  NuevaFactura: () => <div data-testid="nueva-factura-simulada" />,
}));

/*
 * «Ventas» y «Notas» ya listan de verdad (`GET /facturacion/emitidas`) y desde
 * ahí se anula con nota crédito. Ese comportamiento tiene su propia prueba
 * (`FacturasEmitidas.test.tsx`); acá se reemplaza por un marcador, igual que
 * «Nueva factura», porque lo que esta prueba fija es la TARJETA.
 */
vi.mock('@/components/facturacion/FacturasEmitidas', () => ({
  FacturasEmitidas: ({ vista }: { vista: string }) => (
    <div data-testid={`emitidas-simulada-${vista}`} />
  ),
}));

/*
 * 🔴 Y los cinco de la facturación electrónica (17-09-2026), por lo mismo:
 * cada uno pide datos al back y tiene su propia prueba. Acá se reemplazan por
 * un marcador para que lo que se fije siga siendo la TARJETA.
 */
vi.mock('@/components/facturacion/ColaDeTransmision', () => ({
  ColaDeTransmision: () => <div data-testid="cola-simulada" />,
}));
vi.mock('@/components/facturacion/EntregasYAcuse', () => ({
  EntregasYAcuse: () => <div data-testid="entregas-simulada" />,
}));
vi.mock('@/components/facturacion/DocumentoSoporte', () => ({
  DocumentoSoporte: () => <div data-testid="soporte-simulado" />,
}));
vi.mock('@/components/facturacion/CertificacionDelMandatario', () => ({
  CertificacionDelMandatario: () => <div data-testid="certificacion-simulada" />,
}));
vi.mock('@/components/facturacion/TercerosSinCorreo', () => ({
  TercerosSinCorreo: () => <div data-testid="sin-correo-simulado" />,
}));

import FacturacionPage from './page';

const K = 'inmobiliaria.facturacion.';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<FacturacionPage />);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

const q = (s: string) => host.querySelector(s);
const qa = (s: string) => Array.from(host.querySelectorAll(s));

/** Radix Tabs cambia de pestaña en `mousedown`, no en `click`. */
async function activarPestana(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    (el as HTMLElement).click();
  });
}

describe('/panel/inmobiliaria/facturacion', () => {
  /** La tarjeta abre en «Nueva factura»; las columnas se ven en «Ventas». */
  async function irAVentas() {
    const ventas = qa('[role="tab"]').find((t) => t.textContent === `${K}tab_ventas`)!;
    await activarPestana(ventas);
  }

  it('abre en «Nueva factura»: es el pedido de Nico, no un listado de lo ya emitido', () => {
    const activa = qa('[role="tab"]').find((t) => t.getAttribute('aria-selected') === 'true');
    expect(activa!.textContent).toBe(`${K}tab_nueva`);
    expect(q('[data-testid="nueva-factura-simulada"]')).not.toBeNull();
    // El banner del M2 no se pinta encima de una pestaña que sí tiene motor.
    expect(host.textContent ?? '').not.toContain(`${K}m2BannerTitle`);
  });

  it('las pestañas viven dentro de la tarjeta de la tabla, antes de la tabla', async () => {
    /*
     * 🔴 En «Compras», que desde el 17-09 es la ÚNICA que sigue dibujando la
     * tabla acá dentro: «Electrónica» ya tiene motor (la cola de transmisión y
     * las entregas) y pinta sus propias tablas.
     */
    const compras = qa('[role="tab"]').find(
      (t) => t.textContent === `${K}tab_compras`,
    )!;
    await activarPestana(compras);
    const tarjeta = q('[data-testid="facturacion-tarjeta"]');
    expect(tarjeta).not.toBeNull();

    const listas = qa('[role="tablist"]');
    expect(listas).toHaveLength(1);
    expect(tarjeta!.contains(listas[0])).toBe(true);

    const tabla = tarjeta!.querySelector('table');
    expect(tabla).not.toBeNull();
    // La lista de pestañas precede a la tabla dentro de la misma tarjeta.
    expect(listas[0].compareDocumentPosition(tabla!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(qa('[role="tab"]').map((t) => t.textContent)).toEqual([
      `${K}tab_nueva`,
      `${K}tab_ventas`,
      `${K}tab_compras`,
      `${K}tab_electronica`,
      `${K}tab_notas`,
      // El documento soporte y el mandato: no listan documentos de
      // `FacturacionTab`, hacen otra cosa (17-09-2026).
      `${K}tab_soporte`,
      `${K}tab_mandato`,
      // La resolución de la DIAN: el permiso con el que se numera. Va última
      // porque se toca una vez al año, no todos los meses.
      `${K}tab_resolucion`,
    ]);
  });

  it('🔴 «Electrónica», «Documento soporte» y «Mandato» tienen motor: ya no hay vacío', async () => {
    const ir = async (tab: string) =>
      activarPestana(
        qa('[role="tab"]').find((t) => t.textContent === `${K}tab_${tab}`)!,
      );

    await ir('electronica');
    // La cola de transmisión Y las entregas: son dos estados distintos y las
    // dos viven en la misma pestaña.
    expect(q('[data-testid="cola-simulada"]')).not.toBeNull();
    expect(q('[data-testid="entregas-simulada"]')).not.toBeNull();

    await ir('soporte');
    expect(q('[data-testid="soporte-simulado"]')).not.toBeNull();

    await ir('mandato');
    expect(q('[data-testid="certificacion-simulada"]')).not.toBeNull();
    expect(q('[data-testid="sin-correo-simulado"]')).not.toBeNull();
  });

  it('los encabezados se ven y el vacío va en el cuerpo, en una celda que los abarca', async () => {
    // Se mira en «Compras»: desde el 17-09 es la única sin listado propio.
    const compras = qa('[role="tab"]').find(
      (t) => t.textContent === `${K}tab_compras`,
    )!;
    await activarPestana(compras);
    expect(qa('thead th')).toHaveLength(7);

    const celda = q('tbody td');
    expect(celda).not.toBeNull();
    expect(celda!.getAttribute('colspan')).toBe('7');

    const vacio = celda!.querySelector('[data-testid="sin-datos"]');
    expect(vacio).not.toBeNull();
    // La descripción de la pestaña vive en el vacío, no en una franja aparte.
    expect(vacio!.textContent).toContain(`${K}desc_compras`);
  });

  it('🔴 «Ventas» y «Notas» listan lo emitido, con su selector de mes', async () => {
    await irAVentas();
    expect(q('[data-testid="emitidas-simulada-ventas"]')).not.toBeNull();
    expect(q('[data-testid="facturacion-mes-emitidas"]')).not.toBeNull();

    const notas = qa('[role="tab"]').find((t) => t.textContent === `${K}tab_notas`)!;
    await activarPestana(notas);
    expect(q('[data-testid="emitidas-simulada-notas"]')).not.toBeNull();
  });

  it('cambiar de pestaña cambia las columnas y el vacío', async () => {
    const compras = qa('[role="tab"]').find((t) => t.textContent === `${K}tab_compras`)!;
    await activarPestana(compras);

    expect(compras.getAttribute('aria-selected')).toBe('true');
    expect(qa('thead th')).toHaveLength(7);
    expect(q('tbody td')!.getAttribute('colspan')).toBe('7');
    expect(q('[data-testid="sin-datos"]')!.textContent).toContain(`${K}desc_compras`);
  });

  it('no queda ningún control sin comportamiento; el banner del M2 sigue', async () => {
    await irAVentas();
    const texto = host.textContent ?? '';
    // «Nueva factura» sólo mostraba un toast «llega con M2».
    expect(texto).not.toContain(`${K}new`);
    // La leyenda de estados no filtraba nada.
    expect(texto).not.toContain(`${K}estadosLabel`);
    expect(texto).not.toContain(`${K}estadoAceptada`);
    // Las ocho pestañas y, en el vacío, la salida a lo ya emitido (F4): un
    // botón que hace algo, no uno decorativo.
    const botones = qa('button');
    expect(botones.filter((b) => b.getAttribute('role') === 'tab')).toHaveLength(8);
    // En «Ventas» ya no hay botón suelto: la pestaña lista de verdad.
    expect(
      botones
        .filter((b) => b.getAttribute('role') !== 'tab')
        .map((b) => b.getAttribute('data-testid')),
    ).toEqual([]);

    expect(texto).toContain(`${K}m2BannerTitle`);
  });

  /**
   * F4 (auditoría 13-09): no hay ruta en el back que liste documentos
   * emitidos, y el vacío decía «Todavía no tienes facturas de venta» después
   * de emitir 800. Una pantalla que no puede leer no afirma nada sobre los
   * datos de la persona: dice que el listado no existe todavía y a dónde ir.
   */
  describe('F4 — las pestañas sin listado no dicen «no tienes»', () => {
    async function ir(tab: string) {
      const pestana = qa('[role="tab"]').find((t) => t.textContent === `${K}tab_${tab}`)!;
      await activarPestana(pestana);
    }

    it('Compras tampoco dice «no tienes»: manda a cuentas por pagar, que es donde viven', async () => {
      await ir('compras');
      const vacio = q('[data-testid="sin-datos"]')!;
      expect((vacio.textContent ?? '').toLowerCase()).not.toContain('no tienes');
      expect(vacio.querySelector('a[href="/panel/inmobiliaria/pagos/cxp"]')).not.toBeNull();
    });
  });
});
