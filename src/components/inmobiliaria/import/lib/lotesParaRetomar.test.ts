/**
 * lotesParaRetomar.test.ts — la tarjeta de «tienes una importación sin
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
  /**
   * 🔴 T-0130 (`5409c377`, 01-10-2026) cambió esta regla a propósito: el back
   * guarda las filas, así que un lote FALLIDO ya no es «un job muerto sin nada
   * que retomar» sino una carga que se retoma con «Reintentar». Esconderlo era
   * justo lo que obligaba a empezar de cero. La prueba seguía con la regla vieja.
   */
  it('🔴 un FALLIDO también se ofrece: se retoma con «Reintentar», no se empieza de cero', () => {
    const r = lotesParaRetomar([
      lote({ lote: 'vivo', creadoEn: '2026-09-01T10:00:00.000Z' }),
      lote({ lote: 'fallido', estado: 'FALLIDO', creadoEn: '2026-09-01T09:00:00.000Z' }),
    ]);
    expect(r.map((l) => l.lote)).toEqual(['vivo', 'fallido']);
  });

  it('no filtra nada de lo que el back lista: el back ya sólo manda lo no terminado', () => {
    const estados = ['ENCOLADO', 'PROCESANDO', 'LISTO', 'FALLIDO'] as const;
    const r = lotesParaRetomar(
      estados.map((estado, i) => lote({ lote: estado, estado, creadoEn: `2026-09-0${i + 1}T00:00:00.000Z` })),
    );
    expect(r).toHaveLength(estados.length);
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
