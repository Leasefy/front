/**
 * 🔴 N-31 (QA-FACT-CONTA-95 r3, Nico 06-10-2026): la pantalla de terminar dice
 * qué facturas ya emitidas se corrigen con nota crédito, y a quien no emite
 * notas crédito (Q12) que quedan listas para el administrador o el contador.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// `vi.mock` se iza sobre todo lo demás del módulo: los mocks se crean DENTRO
// de la fábrica y se leen después, importando el módulo ya mockeado.
vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    motivosDeTerminacion: vi.fn(),
    vistaPreviaDeTerminacion: vi.fn(),
    terminar: vi.fn(),
    vencidos: vi.fn(),
    registrarCesion: vi.fn(),
  },
}));
// `vi.mock` se iza sobre las constantes: el objeto se crea DENTRO de la
// fábrica y se lee después con `vi.mocked`.
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service';
import { toast } from '@/components/ui/toast';
import { TerminarContrato } from './TerminarContrato';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const toastMock = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  api.motivosDeTerminacion.mockResolvedValue({
    motivos: [
      { codigo: 'MUTUO_ACUERDO', nombre: 'Mutuo acuerdo', exigeNota: false },
      { codigo: 'OTRO', nombre: 'Otro', exigeNota: true },
      // QA-CONT-95: un motivo con la penalidad por defecto (CR-10 · A-08).
      { codigo: 'ENTREGA_ANTICIPADA_DEL_INQUILINO', nombre: 'Entrega anticipada del inquilino', exigeNota: false },
      { codigo: 'VENTA_DEL_INMUEBLE', nombre: 'Venta del inmueble', exigeNota: false },
    ],
  });
  api.vistaPreviaDeTerminacion.mockResolvedValue({
    puedeTerminarse: true,
    razon: null,
    finPactado: '2026-12-31',
    disponible: true,
    prorrateoDelUltimoMes: {
      mes: '2026-09',
      diasOcupados: 12,
      diasDelMes: 30,
      valorCop: 1200000,
      canonMensualCop: 3000000,
    },
  });
  api.terminar.mockResolvedValue({
    contractId: 'c1',
    terminadoEn: '2026-09-12',
    motivo: 'MUTUO_ACUERDO',
    motivoLegible: 'Mutuo acuerdo',
    finPactadoOriginal: '2026-12-31',
    inmuebleLiberado: true,
    prorrateoDelUltimoMes: null,
  });
});

afterEach(async () => {
  await act(async () => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
});

async function montar(onTerminado = vi.fn()) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <TerminarContrato
        contractId="c1"
        abierto
        onCerrar={vi.fn()}
        onTerminado={onTerminado}
      />,
    );
  });
  return document.body;
}

const conFacturas = (lasNotasLasEmite: 'TU' | 'ADMIN_O_CONTADOR') => ({
  puedeTerminarse: true,
  razon: null,
  finPactado: '2027-09-14',
  disponible: true,
  prorrateoDelUltimoMes: { mes: '2026-10', diasOcupados: 6, diasDelMes: 30, valorCop: 480000, canonMensualCop: 2400000 },
  facturasQueSeCorrigen: [
    { facturaId: 'f-oct', mes: '2026-10', numeroDian: 'LABQA-7', que: 'ANULAR_Y_REHACER' },
    { facturaId: 'f-nov', mes: '2026-11', numeroDian: 'LABQA-9', que: 'ANULAR' },
  ],
  lasNotasLasEmite,
});

describe('N-31 · terminar dice qué facturas se corrigen', () => {
  it('a un asesor: las dos facturas y que la nota queda lista para el administrador o el contador', async () => {
    api.vistaPreviaDeTerminacion.mockResolvedValue(conFacturas('ADMIN_O_CONTADOR'));
    const body = await montar();
    const caja = body.querySelector('[data-testid="facturas-que-se-corrigen"]');
    expect(caja?.textContent).toContain('2 facturas ya emitidas se corrigen');
    const filas = [...body.querySelectorAll('[data-testid="factura-que-se-corrige"]')].map((f) => f.textContent);
    expect(filas[0]).toContain('LABQA-7 de octubre de 2026');
    expect(filas[0]).toContain('sale otra por los días que el contrato cubrió');
    expect(filas[1]).toContain('LABQA-9 de noviembre de 2026');
    expect(filas[1]).toContain('el contrato ya no cubre ese mes');
    expect(body.querySelector('[data-testid="quien-emite-las-notas"]')?.textContent).toBe(
      'La nota crédito queda lista para que el administrador o el contador la emita desde Facturación → Notas.',
    );
  });

  it('al administrador: las notas salen al terminar, a su nombre', async () => {
    api.vistaPreviaDeTerminacion.mockResolvedValue(conFacturas('TU'));
    const body = await montar();
    expect(body.querySelector('[data-testid="quien-emite-las-notas"]')?.textContent).toContain(
      'Las notas crédito salen al terminar, a tu nombre.',
    );
  });

  it('sin facturas que corregir (o un back viejo), no aparece nada', async () => {
    const body = await montar();
    expect(body.querySelector('[data-testid="facturas-que-se-corrigen"]')).toBeNull();
  });
});
