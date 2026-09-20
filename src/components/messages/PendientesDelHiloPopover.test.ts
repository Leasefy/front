/**
 * Las dos reglas puras del panel de pendientes del hilo.
 *
 * 🔴 `normalizarPendientes`: una respuesta sin `cuotas`/`giros`/`totales` —la
 * de un back anterior al 2026-09-16, que armaba la deuda con cobros— NO puede
 * convertirse en listas vacías, porque eso se pinta «no debe nada».
 *
 * `detalleDeCuota`: vencido no es mora. Sólo la cartera habla de días de mora.
 */
import { describe, it, expect } from 'vitest';

import { detalleDeCuota, normalizarPendientes } from './PendientesDelHiloPopover';
import type { CuotaPendienteDelHilo } from '@/lib/api/messages.types';

const TOTALES = { debeCop: 0, vencidoCop: 0, enCarteraCop: 0, porGirarCop: 0 };

describe('normalizarPendientes', () => {
  it('🔴 la forma vieja { cobros, dispersiones } no es «no debe nada»: es null', () => {
    expect(normalizarPendientes({ cobros: [], dispersiones: [], documentos: [] })).toBeNull();
    expect(normalizarPendientes(null)).toBeNull();
    expect(normalizarPendientes({ cuotas: [], giros: [], documentos: [] })).toBeNull();
  });

  it('la forma de hoy pasa, y una lista de documentos ausente queda vacía', () => {
    expect(normalizarPendientes({ cuotas: [], giros: [], totales: TOTALES })).toEqual({
      cuotas: [],
      giros: [],
      documentos: [],
      totales: TOTALES,
    });
  });
});

describe('detalleDeCuota', () => {
  const cuota: CuotaPendienteDelHilo = {
    id: 'cu-1',
    mes: '2026-08',
    totalCop: 1,
    pendienteCop: 1,
    vencimiento: '2026-08-05',
    cajon: 'CARTERA',
    diasDeMora: 37,
    diasDePlazo: 5,
    contractId: 'ct-1',
    inmueble: null,
    cobroId: null,
  };

  it('en cartera: venció, y los días de mora pasado el plazo', () => {
    expect(detalleDeCuota(cuota, true)).toBe('Venció el 05/08/2026 · en cartera, 37 días de mora');
    expect(detalleDeCuota({ ...cuota, diasDeMora: 1 }, true)).toContain('1 día de mora');
  });

  it('🔴 vencida dentro del plazo: venció, pero NO es mora', () => {
    const texto = detalleDeCuota({ ...cuota, cajon: 'VENCIDA_EN_PLAZO', diasDeMora: 0 }, true);
    expect(texto).toBe('Venció el 05/08/2026 · dentro del plazo');
    expect(texto).not.toContain('mora');
  });

  it('por vencer: «vence», en futuro', () => {
    expect(
      detalleDeCuota({ ...cuota, cajon: 'POR_VENCER', diasDeMora: 0, vencimiento: '2026-10-05' }, true),
    ).toBe('Vence el 05/10/2026');
  });
});
