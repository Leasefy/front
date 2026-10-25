import { describe, it, expect } from 'vitest';
import { loQueFaltaDelMes, type EntradaDelMes } from './lo-que-falta-del-mes';
import type { LiquidacionDelMesCompleto, FilaDeLaLiquidacion } from '@/lib/liquidaciones/liquidacion-del-mes';

const plata = (n: number) => `$ ${n.toLocaleString('es-CO')}`;
const bloque = (aGirarCop: number) => ({
  canonCop: 0, comisionCop: 0, ivaComisionCop: 0, retencionesComisionCop: 0, conceptosAFavorCop: 0,
  conceptosACargoCop: 0, netoCop: aGirarCop, deduccionesCop: 0, aGirarCop, saldoEnContraCop: 0,
});
const fila = (f: Partial<FilaDeLaLiquidacion>): FilaDeLaLiquidacion => ({
  propietarioId: 'p', propietarioName: 'Ana', estado: 'GENERADA', mes: bloque(0), generado: null, pendiente: null,
  dispersiones: [], cuentaDeDestino: { banco: null, cuenta: null }, ...f,
});
const liquidacion = (propietarios: FilaDeLaLiquidacion[]) => ({ propietarios }) as unknown as LiquidacionDelMesCompleto;
const entrada = (e: Partial<EntradaDelMes>): EntradaDelMes => ({
  liquidacion: liquidacion([]), candidatos: { cantidad: 0, totalCop: 0 }, lotes: [], plata, ...e,
});

describe('Giros — lo que falta del mes (decisión 17 de Nico)', () => {
  it('con un giro por aprobar: falta su plata, el paso 2 es el que toca y dice cuántos', () => {
    const r = loQueFaltaDelMes(
      entrada({
        liquidacion: liquidacion([
          fila({ propietarioId: 'a', dispersiones: [{ id: '1', status: 'DISP_PENDING', aGirarCop: 2_371_800 }] }),
          fila({ propietarioId: 'b', estado: 'GIRADA', dispersiones: [{ id: '2', status: 'DISP_COMPLETED', aGirarCop: 900_000 }] }),
        ]),
      }),
    );
    expect(r.faltaCop).toBe(2_371_800);
    expect(r.faltanPropietarios).toBe(1);
    expect(r.completo).toBe(false);
    expect(r.siguiente).toBe('revisar');
    const revisar = r.pasos.find((p) => p.id === 'revisar')!;
    expect(revisar.detalle).toBe('1 giro por aprobar ($ 2.371.800)');
    expect(revisar.accion).toBe('Revisar 1 giro');
    expect(r.pasos.find((p) => p.id === 'liquidar')!.estado).toBe('hecho');
  });

  it('🔴 un lote pagado NO basta: si queda plata sin girar, el mes no está completo (era el riel ✓✓✓✓)', () => {
    const r = loQueFaltaDelMes(
      entrada({
        liquidacion: liquidacion([fila({ estado: 'POR_GENERAR', pendiente: bloque(500_000) })]),
        lotes: [{ month: '2026-10', estado: 'PAGADO' }],
      }),
    );
    expect(r.completo).toBe(false);
    expect(r.faltaCop).toBe(500_000);
    expect(r.siguiente).toBe('liquidar');
    expect(r.pasos[0].accion).toBe('Generar los giros');
  });

  it('todo girado y marcado: completo, sin acciones', () => {
    const r = loQueFaltaDelMes(
      entrada({
        liquidacion: liquidacion([fila({ estado: 'GIRADA', dispersiones: [{ id: '1', status: 'DISP_COMPLETED', aGirarCop: 10 }] })]),
        lotes: [{ month: '2026-10', estado: 'PAGADO' }],
      }),
    );
    expect(r.completo).toBe(true);
    expect(r.faltaCop).toBe(0);
    expect(r.siguiente).toBeNull();
    expect(r.pasos.every((p) => !p.accion)).toBe(true);
  });

  it('aprobados sin lote y lotes en el banco: pasos 3 y 4 con su número', () => {
    const r = loQueFaltaDelMes(
      entrada({
        liquidacion: liquidacion([fila({ dispersiones: [{ id: '1', status: 'PROCESSING', aGirarCop: 300 }] })]),
        candidatos: { cantidad: 2, totalCop: 600 },
        lotes: [{ month: '2026-10', estado: 'ARCHIVO_GENERADO' }],
      }),
    );
    expect(r.pasos.find((p) => p.id === 'banco')!.detalle).toBe('2 giros aprobados esperan lote ($ 600)');
    expect(r.pasos.find((p) => p.id === 'pagado')!.detalle).toBe('1 lote está en el banco y falta marcarlo pagado');
    expect(r.siguiente).toBe('banco');
  });

  it('lo que no llegó no se inventa: sin liquidación, «no se pudo leer» y la plata en null', () => {
    const r = loQueFaltaDelMes(entrada({ liquidacion: null, candidatos: null, lotes: null }));
    expect(r.faltaCop).toBeNull();
    expect(r.pasos.every((p) => p.estado === 'sin-dato')).toBe(true);
    expect(r.completo).toBe(false);
  });
});
