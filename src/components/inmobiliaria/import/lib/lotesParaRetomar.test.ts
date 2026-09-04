/**
 * lotesParaRetomar.test.ts — la tarjeta de «tenés una importación sin
 * terminar» del asistente de inmuebles: qué se ofrece y en qué orden.
 */

import { describe, it, expect } from 'vitest';
import { lotesParaRetomar } from './lotesParaRetomar';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

function lote(over: Partial<EstadoDeLoteInmuebles>): EstadoDeLoteInmuebles {
  return {
    lote: 'l', estado: 'LISTO', total: 10, procesadas: 10, pendientes: 2,
    listos: 8, activados: 0, descartados: 0, jobId: null, error: null,
    creadoEn: '2026-09-01T10:00:00.000Z',
    ...over,
  };
}

describe('lotesParaRetomar', () => {
  it('un FALLIDO no se ofrece: no hay nada que retomar en un job muerto', () => {
    const r = lotesParaRetomar([
      lote({ lote: 'vivo' }),
      lote({ lote: 'muerto', estado: 'FALLIDO' }),
    ]);
    expect(r.map((l) => l.lote)).toEqual(['vivo']);
  });

  it('ordena del más reciente al más viejo: el que se dejó recién va primero', () => {
    const r = lotesParaRetomar([
      lote({ lote: 'viejo', creadoEn: '2026-08-01T00:00:00.000Z' }),
      lote({ lote: 'nuevo', creadoEn: '2026-09-01T00:00:00.000Z' }),
    ]);
    expect(r.map((l) => l.lote)).toEqual(['nuevo', 'viejo']);
  });

  it('los que siguen procesándose también se ofrecen — retomarlos muestra el progreso', () => {
    const r = lotesParaRetomar([lote({ lote: 'en-curso', estado: 'PROCESANDO' })]);
    expect(r).toHaveLength(1);
  });

  it('sin lotes, sin tarjeta', () => {
    expect(lotesParaRetomar([])).toEqual([]);
  });
});
