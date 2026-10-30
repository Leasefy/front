/**
 * @vitest-environment happy-dom
 *
 * Una factura en el cajón del contrato (Portofino, 29-10-2026): su corte, cómo cae en el contrato, los cobros del
 * propietario y lo que Servi leyó y propuso (se decide en la Bandeja del Piloto, no aquí).
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/agentes/OrbeDeAgente', () => ({ OrbeDeAgente: () => <span data-testid="orbe" /> }));

import type { FacturaDeServicio } from '@/lib/api/servicios-publicos.service';
import { FacturaDelContrato } from './FacturaDelContrato';

function factura(over: Partial<FacturaDeServicio> = {}): FacturaDeServicio {
  return {
    id: 'f1',
    contractId: 'c1',
    servicio: 'ENERGIA',
    nombreDelServicio: 'Energía',
    empresa: 'EPM',
    periodoDesde: '2026-08-15',
    periodoHasta: '2026-09-15',
    valorCop: 115_260,
    tipo: 'MENSUAL',
    pagadaPor: 'INQUILINO',
    estado: 'POR_REVISAR',
    tieneSoporte: true,
    soporteNombre: 'epm.pdf',
    subidaPor: 'INQUILINO',
    liquidacion: null,
    nota: null,
    motivoDeLaRevision: null,
    creadaAt: '2026-10-05T10:00:00.000Z',
    ...over,
  };
}

let root: Root;
let caja: HTMLUListElement;
const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const acciones = { onVerSoporte: vi.fn(), onAprobar: vi.fn(), onRechazar: vi.fn(async () => true), onPagarConLaGarantia: vi.fn(), onPartirPorDias: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  caja = document.createElement('ul');
  document.body.appendChild(caja);
  root = createRoot(caja);
});
afterEach(async () => {
  await act(async () => root.unmount());
  caja.remove();
});

async function montar(f: FacturaDeServicio, props: { inicio?: string | null; puedeEditar?: boolean } = {}) {
  await act(async () => root.render(<FacturaDelContrato factura={f} inicio={props.inicio} puedeEditar={props.puedeEditar ?? true} guardando={false} {...acciones} />));
}

describe('La factura en el cajón del contrato', () => {
  it('dice su corte y el mes en que se facturó; si es estimado, lo dice discreto', async () => {
    await montar(factura({ corte: { desde: '2026-08-15', hasta: '2026-09-15', dias: 32 }, mesFacturado: '2026-10', mesFacturadoSegun: 'FACTURA' }));
    expect($('corte-f1')!.textContent).toBe('Consumo del 15 ago al 15 sep · 32 días · facturada en octubre');
    await montar(factura({ mesFacturado: '2026-10', mesFacturadoSegun: 'ESTIMADO' }));
    expect($('corte-f1')!.textContent).toContain('se factura en octubre');
    expect($('corte-f1')!.textContent).toContain('(estimado)');
  });

  it('🔴 la que cruza el inicio es de entrada: se parte por días y abre su liquidación', async () => {
    await montar(factura({ comoCaeEnElContrato: 'CRUZA_EL_INICIO' }));
    expect($('cae-f1')!.textContent).toBe('Es de entrada: se parte por días.');
    await act(async () => $('partir-f1')!.click());
    expect(acciones.onPartirPorDias).toHaveBeenCalled();
  });

  it('con un back anterior lo deduce del inicio del contrato; la de antes del inicio lo dice', async () => {
    await montar(factura(), { inicio: '2026-10-01' });
    expect($('cae-f1')!.textContent).toContain('Consumo de antes del contrato');
    expect($('partir-f1')).toBeNull();
  });

  it('los cobros del propietario, con su valor y la regla', async () => {
    await montar(
      factura({
        conceptosDelPropietario: [
          { tipo: 'ACUERDO_DE_PAGO', concepto: 'Cuota 3 de 12', valorCop: 25_000 },
          { tipo: 'REVISION_PERIODICA', concepto: 'Revisión periódica del gas', valorCop: 40_500 },
        ],
      }),
    );
    const bloque = $('propietario-f1')!.textContent!;
    expect(bloque).toContain('$ 65.500');
    expect(bloque).toContain('Acuerdo de pago · Cuota 3 de 12');
    expect(bloque).toContain('No son del inquilino: se le descuentan al propietario.');
  });

  it('lo que Servi propone se explica y se enlaza a la Bandeja: no se decide aquí', async () => {
    await montar(
      factura({
        revisionDeServi: {
          veredicto: 'CUADRA',
          motivos: ['El corte y el valor coinciden con la factura.'],
          leido: { empresa: 'EPM', numeroDeCuenta: '13249728', periodoDesde: '2026-08-15', periodoHasta: '2026-09-15', valorCop: 115_260, mesFacturado: '2026-10', fechaDeEmision: '2026-10-02', pagada: true },
          propuestas: [{ proceso: 'servicios.ajuste', clave: 'entrada:f1', resumen: 'Partir la factura por días con el inicio del contrato', montoCop: 86_445 }],
          revisadaEn: '2026-10-05T11:00:00.000Z',
        },
      }),
    );
    const servi = $('servi-f1')!;
    expect(servi.textContent).toContain('Servi la revisó: cuadra');
    expect(servi.textContent).toContain('Partir la factura por días con el inicio del contrato');
    expect(servi.textContent).toContain('$ 86.445');
    expect($('bandeja-f1')!.getAttribute('href')).toBe('/panel/inmobiliaria/piloto?bandeja=1');
  });

  it('ya revisada, lo de Servi queda como consulta, sin enlace a decidir', async () => {
    await montar(factura({ estado: 'AL_DIA', revisionDeServi: { veredicto: 'CUADRA', motivos: [], propuestas: [{ proceso: 'p', clave: 'k', resumen: 'Aprobar', montoCop: null }] } }));
    expect($('servi-f1')!.textContent).toContain('Propuso:');
    expect($('bandeja-f1')).toBeNull();
  });

  it('sin permiso de editar no se aprueba ni se rechaza', async () => {
    await montar(factura(), { puedeEditar: false });
    expect($('aprobar-f1')).toBeNull();
    expect($('rechazar-f1')).toBeNull();
  });
});
