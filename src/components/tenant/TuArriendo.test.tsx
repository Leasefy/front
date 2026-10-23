/**
 * QA de agentes 17-10 (Nico, «Inicio de arrendatario»): «Tu arriendo» no
 * afirma nada mientras carga, dice la falla con reintento, y con deuda muestra
 * lo vencido, el próximo pago (la suma del día) y «Pagar».
 */
import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children?: React.ReactNode; href: string }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', formatCurrency: (n: number) => `$ ${n}` }),
}));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ queEs }: { queEs: string }) => <div data-testid="fallo">No pudimos cargar {queEs}</div>,
}));

import { TuArriendo } from './TuArriendo';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import type { EstadoDeCuentaConEstado } from '@/lib/hooks/useResumenDelPortal';

const fila = (mes: string, vence: string, valor: number, cajon: string, diasDeMora = 0) => ({
  concepto: `Canon ${mes}`,
  estado: 'PENDIENTE',
  fechaDePago: null,
  valorBruto: valor,
  iva: 0,
  retencion: 0,
  reteIva: 0,
  reteIca: 0,
  valorNeto: valor,
  fechaVencimiento: vence,
  documentoDePago: null,
  parcial: false,
  cajon,
  diasDeMora,
});

const doc = (filas: ReturnType<typeof fila>[]) =>
  ({
    cliente: { nombre: 'John', documento: '1' },
    inmobiliaria: { nombre: 'Portofino' },
    fecha: '2026-10-17',
    contratos: [
      {
        id: 'contrato-10',
        numero: '10',
        rol: 'INQUILINO',
        inmueble: { direccion: 'Calle 50 # 12-30' },
        vigente: true,
        estadoDelContrato: 'VIGENTE',
        secciones: { arriendos: filas, otrosConceptos: [] },
        totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
      },
    ],
    totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
  }) as unknown as EstadoDeCuenta;

const estado = (over: Partial<EstadoDeCuentaConEstado>): EstadoDeCuentaConEstado => ({
  doc: null,
  cargando: false,
  fallo: null,
  reintentar: () => {},
  ...over,
});

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});
function montar(e: EstadoDeCuentaConEstado) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<TuArriendo estado={e} hoy="2026-10-17" titulos={{ 'contrato-10': 'Local en La Playita' }} />));
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`);

describe('<TuArriendo>', () => {
  it('mientras carga no afirma nada (ni «al día» ni un pago)', () => {
    montar(estado({ cargando: true }));
    expect(q('tu-arriendo-cargando')).not.toBeNull();
    expect(host.textContent).not.toContain('al día');
    expect(q('tu-arriendo-pagar')).toBeNull();
  });

  it('si la lectura falla, lo dice', () => {
    montar(estado({ fallo: new Error('caído') }));
    expect(q('fallo')?.textContent).toContain('tu estado de cuenta');
  });

  it('🔴 con deuda: lo vencido en mora, el próximo pago del día y «Pagar»', () => {
    montar(
      estado({
        doc: doc([
          fila('2026-09', '2026-09-01', 1_524_971.91, 'CARTERA', 31),
          fila('2026-10', '2026-11-01', 1_640_500.5, 'POR_VENCER'),
          fila('2026-11', '2026-11-01', 1_524_971.91, 'POR_VENCER'),
        ]),
      }),
    );
    expect(q('tu-arriendo-inmuebles')?.textContent).toContain('Local en La Playita · Calle 50 # 12-30');
    expect(q('tu-arriendo-vencido')?.getAttribute('data-en-mora')).toBe('si');
    // Glow up 22-10: LA RESPUESTA en una cifra («Vencido, en mora · $ X»), antes «Tienes $ X vencidos».
    expect(q('tu-arriendo-vencido')?.textContent).toContain('Vencido, en mora');
    expect(q('tu-arriendo-vencido')?.textContent).toContain('$ 1524971.91');
    expect(q('tu-arriendo-pagar')?.textContent).toBe('Pagar lo vencido');
    expect(q('tu-arriendo-vencido')?.textContent).toContain('1 cuota; la más vieja venció el 1 de septiembre de 2026. Lleva 31 días de mora.');
    expect(q('tu-arriendo-proximo')?.textContent).toContain('$ 3165472.41');
    expect(q('tu-arriendo-proximo')?.textContent).toContain('Vence el 1 de noviembre de 2026 · 2 cuotas ese día');
    expect(q('tu-arriendo-pagar')?.getAttribute('href')).toBe('/inquilino/pagos');
    expect(q('tu-arriendo-al-dia')).toBeNull();
  });

  it('sin nada pendiente: «Estás al día» y sin «Pagar»', () => {
    montar(estado({ doc: doc([]) }));
    expect(q('tu-arriendo-al-dia')?.textContent).toContain('Estás al día');
    expect(q('tu-arriendo-pagar')).toBeNull();
    expect(host.querySelector('a[href="/inquilino/estado-de-cuenta"]')).not.toBeNull();
  });
});
