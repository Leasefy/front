/**
 * exogena.service — la ruta, el año y el cuerpo exactos.
 *
 * ── Lo que este archivo protege ─────────────────────────────────────────────
 *
 * 1. **El año viaja SIEMPRE**, en las seis llamadas: la exógena es anual y un
 *    formato sin año no significa nada. Un `PUT` de conceptos sin `anio`
 *    sobreescribiría el mapeo del año equivocado.
 * 2. **Cada cuerpo filtrado al DTO**, porque el back corre con
 *    `forbidNonWhitelisted` y una clave de más es 400.
 * 3. **El texto del aviso del Prevalidador**, palabra por palabra. No es copy
 *    decorativo: es la diferencia entre creer que la exógena está presentada y
 *    saber que falta cargarla en el Prevalidador de la DIAN. Si alguien lo
 *    suaviza, este test se pone rojo.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { clienteMock } = vi.hoisted(() => ({
  clienteMock: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), getBlob: vi.fn() },
}));

vi.mock('./client', () => ({ apiClient: clienteMock }));

import {
  exogenaApi,
  AVISO_DEL_PREVALIDADOR,
  CLAVES_DE_APROBAR,
  CLAVES_DE_ANULAR_EXOGENA,
  CLAVES_DE_CONCEPTO,
  FORMATOS_DE_EXOGENA,
  PENDIENTES_DEL_CONTADOR,
  DE_DONDE_SALE,
} from './exogena.service';

const BASE = '/inmobiliaria/contabilidad/exogena';

beforeEach(() => {
  clienteMock.get.mockReset().mockResolvedValue({});
  clienteMock.post.mockReset().mockResolvedValue({});
  clienteMock.put.mockReset().mockResolvedValue({});
  clienteMock.getBlob.mockReset().mockResolvedValue(new Blob());
});

describe('los seis formatos', () => {
  it('son los del contrato, en orden y sin repetidos', () => {
    expect([...FORMATOS_DE_EXOGENA]).toEqual(['1001', '1003', '1007', '1008', '1009', '1647']);
    expect(new Set(FORMATOS_DE_EXOGENA).size).toBe(6);
  });

  it('cada uno dice de dónde sale: seis números sueltos no son una pantalla', () => {
    for (const f of FORMATOS_DE_EXOGENA) {
      expect(DE_DONDE_SALE[f]?.length ?? 0).toBeGreaterThan(20);
    }
  });
});

describe('lecturas', () => {
  it('el resumen lleva el año', async () => {
    await exogenaApi.resumen(2026);
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}?anio=2026`);
  });

  it('un formato lleva el año y, si se pide, el detalle', async () => {
    await exogenaApi.formato('1001', 2026, true);
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/1001?anio=2026&incluirDetalle=true`);
  });

  it('sin detalle no manda la clave (traer el detalle son miles de filas)', async () => {
    await exogenaApi.formato('1647', 2025);
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/1647?anio=2025`);
  });

  it('el archivo baja como blob, no como JSON', async () => {
    await exogenaApi.archivo('1007', 2026);
    expect(clienteMock.getBlob).toHaveBeenCalledWith(`${BASE}/1007/archivo?anio=2026`);
    expect(clienteMock.get).not.toHaveBeenCalled();
  });

  it('los conceptos son por año', async () => {
    await exogenaApi.conceptos(2026);
    expect(clienteMock.get).toHaveBeenCalledWith(`${BASE}/conceptos?anio=2026`);
  });
});

describe('escrituras', () => {
  it('guardarConceptos manda el año y cada entrada filtrada al DTO', async () => {
    await exogenaApi.guardarConceptos(2026, [
      // @ts-expect-error `codigo` y `nombre` son de la lectura, no del DTO.
      { cuentaId: 'c1', formato: '1001', concepto: '5008', codigo: '513595', nombre: 'Otros' },
    ]);
    expect(clienteMock.put).toHaveBeenCalledWith(`${BASE}/conceptos`, {
      anio: 2026,
      conceptos: [{ cuentaId: 'c1', formato: '1001', concepto: '5008' }],
    });
  });

  it('aprobar manda año y observaciones', async () => {
    await exogenaApi.aprobar('1001', 2026, 'Revisado contra la resolución 000162.');
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/1001/aprobar`, {
      anio: 2026,
      observaciones: 'Revisado contra la resolución 000162.',
    });
  });

  it('aprobar sin observaciones no manda la clave vacía', async () => {
    await exogenaApi.aprobar('1009', 2026);
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/1009/aprobar`, { anio: 2026 });
  });

  it('anular exige motivo, además del año', async () => {
    await exogenaApi.anular('1001', 2026, 'cambió el mapeo de conceptos');
    expect(clienteMock.post).toHaveBeenCalledWith(`${BASE}/1001/anular`, {
      anio: 2026,
      motivo: 'cambió el mapeo de conceptos',
    });
  });

  it('las listas de claves son las del contrato', () => {
    expect([...CLAVES_DE_APROBAR]).toEqual(['anio', 'observaciones']);
    expect([...CLAVES_DE_ANULAR_EXOGENA]).toEqual(['anio', 'motivo']);
    expect([...CLAVES_DE_CONCEPTO]).toEqual(['cuentaId', 'formato', 'concepto']);
  });
});

describe('🔴 el aviso del Prevalidador', () => {
  it('dice que el CSV es la plantilla y que Leasefy NO transmite', () => {
    expect(AVISO_DEL_PREVALIDADOR).toContain('plantilla del Prevalidador');
    expect(AVISO_DEL_PREVALIDADOR).toContain('Leasefy NO transmite');
    expect(AVISO_DEL_PREVALIDADOR).toContain('XML firmado');
  });
});

describe('lo que necesita el visto bueno del contador', () => {
  it('son los cinco puntos del contrato', () => {
    expect(PENDIENTES_DEL_CONTADOR).toHaveLength(5);
  });

  it('el de los giros a propietarios nombra el mandato y el 1647 por defecto', () => {
    const giros = PENDIENTES_DEL_CONTADOR.find((p) => p.includes('giros a propietarios'));
    expect(giros).toBeDefined();
    expect(giros).toContain('mandato');
    expect(giros).toContain('1647');
  });
});
