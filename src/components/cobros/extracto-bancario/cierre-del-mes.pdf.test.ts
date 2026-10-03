/**
 * 🔴 03-10-2026 (PRUEBAS-CONCILIACION, el PDF bajado del laboratorio): la letra
 * estándar de jsPDF (Helvetica, WinAnsi) no trae el «−» tipográfico. Cada cifra
 * negativa del cierre y la etiqueta «Diferencia (extracto − libros)» salían con
 * un `"` en vez del menos y la línea espaciada letra por letra; una partida
 * larga se salía de la hoja. El PDF lleva el guion de siempre.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const textos: string[] = [];

vi.mock('jspdf', () => {
  class JsPdfFalso {
    internal = { pageSize: { getWidth: () => 612, getHeight: () => 792 } };
    setFontSize() {}
    addPage() {}
    save() {}
    splitTextToSize(t: string) {
      return [t];
    }
    text(t: string | string[]) {
      for (const linea of Array.isArray(t) ? t : [t]) textos.push(linea);
    }
  }
  return { default: JsPdfFalso };
});

import { exportarElCierreAPdf, textoParaElPdf } from './cierre-del-mes';
import type { CierreConFoto } from '@/lib/api/cierre-de-conciliacion';

const cierre = {
  id: 'c1',
  cuentaId: 'cta',
  mes: '2026-09',
  version: 1,
  estado: 'CERRADO',
  huella: 'a'.repeat(64),
  firma: { userId: 'u', nombre: 'Carla', rol: 'CONTADOR', tarjetaProfesional: null, firmadoAt: '2026-10-02T15:00:00.000Z' },
  reapertura: null,
  foto: {
    formato: 1,
    cuenta: { id: 'cta', nombre: 'Bancolombia ahorros recaudo •••• 5678', numeroEnmascarado: '•••• 5678', banco: 'Bancolombia' },
    mes: '2026-09',
    mesEnPalabras: 'septiembre de 2026',
    periodo: { desde: '2026-09-01', hasta: '2026-09-30' },
    saldos: {
      extracto: { valorCop: 65_961_820, fuente: 'calculado', detalle: '' },
      libros: { valorCop: 50_000_000, cuentaPuc: { id: 'p', codigo: '111005', nombre: 'Moneda nacional' }, compartida: false, detalle: '' },
      diferenciaCop: 15_961_820,
      efectoDeLasPartidasCop: 14_529_650,
      diferenciaSinExplicarCop: -1_432_170,
    },
    partidas: {
      lista: [
        {
          id: 'l',
          fecha: '2026-09-16',
          tipo: 'SALIDA_SIN_IDENTIFICAR',
          valorCop: -2_070_350,
          dias: 14,
          rango: '0-30',
          descripcion: 'PAGO A PROVEEDOR PAULA PROPIETARIA RUIZ',
          referencia: null,
        },
      ],
      porTipoYRango: [{ tipo: 'SALIDA_SIN_IDENTIFICAR', rango: '0-30', n: 1, valorCop: -2_070_350 }],
      total: { n: 1, valorCop: -2_070_350, valorAbsolutoCop: 2_070_350 },
    },
    conciliado: { lineasDelMes: 6, conciliadas: 2, pendientes: 4, porNumeroPct: 33.33, valorDelMesCop: 1, conciliadoCop: 1, porValorPct: 0.16 },
    quien: [],
    ignoradas: { n: 0, valorCop: 0, entradas: 0, entradasCop: 0 },
    terceros: null,
    avisos: [],
    armadaAt: '2026-10-02T15:00:00.000Z',
    firma: { userId: 'u', nombre: 'Carla', email: null, rol: 'CONTADOR', tarjetaProfesional: null, firmadoAt: '2026-10-02T15:00:00.000Z' },
  },
} as unknown as CierreConFoto;

describe('el PDF del cierre escribe el menos con el guion', () => {
  beforeEach(() => {
    textos.length = 0;
  });

  it('ninguna línea lleva el «−» tipográfico; las cifras negativas salen con «-»', async () => {
    await exportarElCierreAPdf(cierre);
    expect(textos.length).toBeGreaterThan(5);
    expect(textos.filter((t) => t.includes('−'))).toEqual([]);
    expect(textos.some((t) => t.includes('-$1.432.170'))).toBe(true);
    expect(textos.some((t) => t.includes('-$2.070.350'))).toBe(true);
    expect(textos.some((t) => t.includes('Diferencia (extracto - libros)'))).toBe(true);
  });

  it('textoParaElPdf sólo cambia el menos', () => {
    expect(textoParaElPdf('Diferencia (extracto − libros) · −$5')).toBe('Diferencia (extracto - libros) · -$5');
    expect(textoParaElPdf('Bancolombia •••• 5678 — 4×1000')).toBe('Bancolombia •••• 5678 — 4×1000');
  });
});
