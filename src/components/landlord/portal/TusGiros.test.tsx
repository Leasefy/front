/**
 * La franja de la plata del propietario (GLOW UP, 21-10-2026): cada cifra sale
 * de lo que el back ya manda, con su misma definición, y lo que no viene no se
 * inventa.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ giros: vi.fn() }));
vi.mock('@/lib/api/portal-del-propietario.service', () => ({ portalDelPropietarioApi: api }));
vi.mock('@leasefy/cadence', () => ({
  FranjaDeCifras: ({ children, ...p }: { children: React.ReactNode }) => <div {...p}>{children}</div>,
  Cifra: ({ etiqueta, valor, detalle, ...p }: { etiqueta: string; valor: React.ReactNode; detalle?: React.ReactNode }) => (
    <div data-testid={(p as { 'data-testid'?: string })['data-testid']}>
      <span>{etiqueta}</span> <span>{valor}</span> <span>{detalle}</span>
    </div>
  ),
}));

import { TusGiros } from './TusGiros';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

const contrato = (id: string, estadoDelContrato: 'VIGENTE' | 'TERMINADO') =>
  ({ id, numero: id, rol: 'PROPIETARIO', vigente: estadoDelContrato === 'VIGENTE', estadoDelContrato, inmueble: { direccion: 'Calle 1' } }) as unknown as EstadoDeCuenta['contratos'][number];

function doc(extra: Partial<EstadoDeCuenta> = {}): EstadoDeCuenta {
  return {
    contratos: [contrato('c1', 'VIGENTE'), contrato('c2', 'VIGENTE'), contrato('c3', 'TERMINADO')],
    ...extra,
  } as unknown as EstadoDeCuenta;
}

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  api.giros.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function montar(d: EstadoDeCuenta) {
  await act(async () => {
    root.render(<TusGiros doc={d} />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}
const cifra = (t: string) => container.querySelector(`[data-testid="${t}"]`)?.textContent ?? null;

describe('TusGiros', () => {
  it('el último giro es el del mes más reciente, con su estado', async () => {
    api.giros.mockResolvedValue({
      giros: [
        { id: 'g1', mes: '2026-08', valorCop: 1_000_000, estado: 'GIRADO', giradoEl: '2026-08-10' },
        { id: 'g2', mes: '2026-09', valorCop: 1_200_000, estado: 'GIRADO', giradoEl: '2026-09-10' },
      ],
    });
    await montar(doc());
    expect(cifra('cifra-ultimo-giro')).toMatch(/1\.200\.000/);
    expect(cifra('cifra-ultimo-giro')).toContain('septiembre de 2026');
    expect(cifra('cifra-ultimo-giro')).toContain('Girado el 10 sep 2026');
  });

  it('próximo giro y por girar salen del documento; vigentes cuenta sólo los vigentes', async () => {
    api.giros.mockResolvedValue({ giros: [] });
    await montar(
      doc({
        proximaCuota: { fecha: '2026-11-05', monto: 3_400_000, contratos: 2 },
        porGirar: { hastaMes: '2026-10', porGirarCop: 2_466_800, cuotas: 2, deduccionesCop: 0, proximosGirosCop: 0, proximosGirosHastaMes: '2026-11' },
      }),
    );
    expect(cifra('cifra-ultimo-giro')).toContain('Todavía no te han girado');
    expect(cifra('cifra-proximo-giro')).toMatch(/3\.400\.000/);
    expect(cifra('cifra-proximo-giro')).toContain('El 5 nov 2026');
    expect(cifra('cifra-por-girar')).toMatch(/2\.466\.800/);
    expect(cifra('cifra-por-girar')).toContain('Hasta octubre de 2026');
    expect(cifra('cifra-contratos-vigentes')).toContain('2');
    expect(cifra('cifra-contratos-vigentes')).toContain('De 3 contratos');
  });

  it('revisora r25: «Por girar» en $ 0 no sale, y los contratos no son una cifra más de la leyenda', async () => {
    api.giros.mockResolvedValue({ giros: [] });
    await montar(
      doc({
        proximaCuota: null,
        porGirar: { hastaMes: '2026-10', porGirarCop: 0, cuotas: 0, deduccionesCop: 0, proximosGirosCop: 0, proximosGirosHastaMes: '2026-11' },
      }),
    );
    expect(document.querySelector('[data-testid="cifra-por-girar"]')).toBeNull();
    expect(document.querySelectorAll('[data-testid="tus-giros"] li').length).toBe(2);
  });

  it('con deducciones lo dice; sin próximo giro dice «Nada por vencer»', async () => {
    api.giros.mockResolvedValue({ giros: [] });
    await montar(
      doc({
        proximaCuota: null,
        porGirar: { hastaMes: '2026-10', porGirarCop: 900_000, cuotas: 1, deduccionesCop: 180_000, proximosGirosCop: 0, proximosGirosHastaMes: '2026-11' },
      }),
    );
    expect(cifra('cifra-proximo-giro')).toContain('Nada por vencer');
    expect(cifra('cifra-por-girar')).toMatch(/Con \$\s?180\.000 descontados/);
  });

  it('un back anterior (sin proximaCuota ni porGirar) no inventa esas cifras; los giros caídos dicen «—»', async () => {
    api.giros.mockRejectedValue(new Error('caído'));
    await montar(doc());
    expect(cifra('cifra-proximo-giro')).toBeNull();
    expect(cifra('cifra-por-girar')).toBeNull();
    expect(cifra('cifra-ultimo-giro')).toContain('—');
    expect(cifra('cifra-ultimo-giro')).toContain('No se pudo consultar ahora');
  });
});
