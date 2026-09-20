/**
 * Las tres piezas del mandato que viven en la ficha del contrato:
 *
 *   · el interruptor de «comisionable» — qué entra en la base de la comisión de
 *     administración, que nunca incluye la administración de la copropiedad;
 *   · los cobros al PROPIETARIO por arrendar, que se descuentan de su primera
 *     liquidación;
 *   · la bitácora del mandato con sus anexos.
 *
 * Ninguna puede pintar una sección vacía ni ofrecer un botón que el back va a
 * rechazar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  marcarComisionable: vi.fn(),
  cobrosAlArrendar: vi.fn(),
  aplicarCobrosAlArrendar: vi.fn(),
  bitacora: vi.fn(),
  anexoDeLaBitacora: vi.fn(),
}));

vi.mock('@/lib/api/mandato.service', () => ({ mandatoApi: h }));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { BitacoraDelContrato } from './BitacoraDelContrato';
import { CobrosAlArrendarDelContrato } from './CobrosAlArrendarDelContrato';
import { ComisionableDelConcepto } from './ComisionableDelConcepto';
import { porQueNoEsComisionable } from '@/lib/mandato/comisionable';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.marcarComisionable.mockReset().mockResolvedValue({ id: 'c1', comisionable: true });
  h.cobrosAlArrendar.mockReset();
  h.aplicarCobrosAlArrendar.mockReset().mockResolvedValue({ aplicados: [], yaEstaban: [] });
  h.bitacora.mockReset();
  h.anexoDeLaBitacora.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar(nodo: React.ReactNode) {
  await act(async () => {
    root.render(nodo);
  });
}

describe('la base de la comisión', () => {
  it('la administración de la copropiedad nunca se comisiona', () => {
    expect(
      porQueNoEsComisionable({
        nombre: 'Administración',
        base: 'NO_GRAVADO',
        paga: 'INQUILINO',
        recibe: 'PROPIETARIO',
      }),
    ).toContain('copropiedad');
  });

  it('un concepto que no va del inquilino al propietario tampoco', () => {
    expect(
      porQueNoEsComisionable({
        nombre: 'Parqueadero',
        base: 'ARRENDAMIENTO',
        paga: 'PROPIETARIO',
        recibe: 'INMOBILIARIA',
      }),
    ).toContain('el inquilino le paga al propietario');
  });

  it('el concepto que no se puede comisionar muestra el motivo, no un interruptor', async () => {
    await pintar(
      <ComisionableDelConcepto
        contractId="k1"
        puedeEditar
        concepto={{
          id: 'c9',
          nombre: 'Administración',
          base: 'NO_GRAVADO',
          paga: 'INQUILINO',
          recibe: 'PROPIETARIO',
        }}
      />,
    );
    expect(container.querySelector('[data-testid="no-es-comisionable"]')).not.toBeNull();
    expect(container.querySelector('input,button[role="checkbox"]')).toBeNull();
  });

  it('marcar comisionable se lo manda al back tal cual', async () => {
    await pintar(
      <ComisionableDelConcepto
        contractId="k1"
        puedeEditar
        concepto={{
          id: 'c1',
          nombre: 'Parqueadero',
          base: 'ARRENDAMIENTO',
          paga: 'INQUILINO',
          recibe: 'PROPIETARIO',
          comisionable: false,
        }}
      />,
    );
    const casilla = container.querySelector<HTMLElement>('[role="checkbox"], input[type="checkbox"]');
    expect(casilla).not.toBeNull();
    await act(async () => {
      casilla!.click();
    });
    expect(h.marcarComisionable).toHaveBeenCalledWith('k1', 'c1', true);
  });
});

describe('cobros al arrendar del contrato', () => {
  const DATOS = {
    disponible: true,
    motivo: null,
    primerCanonCop: 1_650_000,
    propietarioName: 'Ana',
    cobros: [
      {
        id: 'colocacion',
        nombre: 'Comisión de colocación',
        tipo: 'PORCENTAJE_PRIMER_CANON' as const,
        valor: 50,
        opcional: false,
        activo: true,
        valorCop: 825_000,
        aplicado: true,
        motivo: 'Comisión de colocación (50 % del primer canon) · contrato N.º 12',
      },
      {
        id: 'poliza',
        nombre: 'Póliza',
        tipo: 'VALOR_FIJO' as const,
        valor: 120_000,
        opcional: true,
        activo: true,
        valorCop: 120_000,
        aplicado: false,
        motivo: 'Póliza · contrato N.º 12',
      },
    ],
  };

  it('sin cobros configurados la sección no se pinta', async () => {
    h.cobrosAlArrendar.mockResolvedValue({ ...DATOS, cobros: [] });
    await pintar(<CobrosAlArrendarDelContrato contractId="k1" puedeAplicar />);
    expect(container.querySelector('[data-testid="cobros-al-arrendar"]')).toBeNull();
  });

  it('dice cuál ya se descontó y cuál no, y sólo aplica los escogidos', async () => {
    h.cobrosAlArrendar.mockResolvedValue(DATOS);
    await pintar(<CobrosAlArrendarDelContrato contractId="k1" puedeAplicar />);
    expect(container.querySelector('[data-testid="estado-colocacion"]')?.textContent).toBe(
      'ya descontado',
    );
    expect(container.querySelector('[data-testid="estado-poliza"]')?.textContent).toBe('sin aplicar');

    const casilla = container.querySelector<HTMLElement>('[role="checkbox"], input[type="checkbox"]');
    await act(async () => {
      casilla!.click();
    });
    const boton = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Aplicar'),
    );
    await act(async () => {
      boton!.click();
    });
    expect(h.aplicarCobrosAlArrendar).toHaveBeenCalledWith('k1', ['poliza']);
  });
});

describe('bitácora del mandato', () => {
  it('sin entradas no se pinta', async () => {
    h.bitacora.mockResolvedValue({ disponible: true, motivo: null, entradas: [] });
    await pintar(<BitacoraDelContrato contractId="k1" />);
    expect(container.querySelector('[data-testid="bitacora-del-contrato"]')).toBeNull();
  });

  it('pinta la entrada y ofrece su anexo', async () => {
    h.bitacora.mockResolvedValue({
      disponible: true,
      motivo: null,
      entradas: [
        {
          id: 'b1',
          tipo: 'cambio_de_cuenta_aprobado',
          titulo: 'Cambio de cuenta aprobado',
          detalle: 'Bancolombia ···1234',
          tieneAnexo: true,
          anexoNombre: 'certificacion.pdf',
          actorUserId: 'u1',
          actorNombre: 'Camila',
          metadata: {},
          createdAt: '2026-09-17T15:00:00.000Z',
        },
      ],
    });
    h.anexoDeLaBitacora.mockResolvedValue({ url: 'https://x/y.pdf', nombre: 'certificacion.pdf' });
    await pintar(<BitacoraDelContrato contractId="k1" />);
    expect(container.textContent).toContain('Cambio de cuenta aprobado');
    expect(container.textContent).toContain('Camila');

    const abrir = vi.fn();
    vi.stubGlobal('open', abrir);
    const boton = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('certificacion.pdf'),
    );
    await act(async () => {
      boton!.click();
    });
    expect(h.anexoDeLaBitacora).toHaveBeenCalledWith('k1', 'b1');
    expect(abrir).toHaveBeenCalledWith('https://x/y.pdf', '_blank', 'noopener,noreferrer');
    vi.unstubAllGlobals();
  });
});
