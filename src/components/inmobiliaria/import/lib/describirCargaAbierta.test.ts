/**
 * describirCargaAbierta.test.ts — «¿cuál de esos retomo?» (Nico, 2026-09-11).
 *
 * Cinco cargas del MISMO archivo, cinco líneas que empiezan igual. La prueba
 * fija lo que las separa: cuándo se subió cada una, cuántos inmuebles entraron
 * por ella, y si frena el paso o no.
 */

import { describe, it, expect } from 'vitest';
import { describirCargaAbierta } from './describirCargaAbierta';
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

function lote(over: Partial<EstadoDeLoteInmuebles>): EstadoDeLoteInmuebles {
  return {
    lote: 'lote-x',
    estado: 'LISTO',
    total: 2_864,
    procesadas: 2_864,
    pendientes: 0,
    listos: 0,
    activados: 0,
    descartados: 0,
    jobId: null,
    error: null,
    creadoEn: '2026-09-11T17:29:00',
    ...over,
  };
}

const AHORA = new Date('2026-09-11T19:15:00');

describe('describirCargaAbierta — qué hacer con cada carga', () => {
  /* Las cinco cargas REALES que Nico tenía en pantalla. */
  it('la que ya activó todo queda como «terminada»: no frena, retomarla sólo sirve para corregir', () => {
    const d = describirCargaAbierta(
      lote({ activados: 2_824, pendientes: 40, listos: 0 }),
      AHORA,
    );
    expect(d.queHacer).toBe('terminada');
    expect(d.frena).toBe(0);
    expect(d.yaEntraron).toBe(2_824);
  });

  it('la que tiene filas listas sin activar es la que FRENA', () => {
    const d = describirCargaAbierta(
      lote({ activados: 2_145, pendientes: 40, listos: 679 }),
      AHORA,
    );
    expect(d.queHacer).toBe('frena');
    expect(d.frena).toBe(679);
  });

  /*
   * 🔴 El caso que la tarjeta vieja pintaba igual de alarmante y no lo era:
   * 2.864 filas «por revisar» y CERO listas. No frena nada — sólo las LISTO
   * dejan el paso en «pendiente».
   */
  it('2.864 por revisar y cero listas NO frena', () => {
    const d = describirCargaAbierta(
      lote({ activados: 0, pendientes: 2_864, listos: 0 }),
      AHORA,
    );
    expect(d.queHacer).toBe('sin-frenar');
    expect(d.frena).toBe(0);
    expect(d.porRevisar).toBe(2_864);
  });

  it('una que el worker todavía procesa no se toca', () => {
    const d = describirCargaAbierta(lote({ estado: 'PROCESANDO' }), AHORA);
    expect(d.queHacer).toBe('procesando');
    expect(d.enVuelo).toBe(true);
  });

  describe('cuándo se subió', () => {
    it('hoy', () => {
      expect(
        describirCargaAbierta(lote({ creadoEn: '2026-09-11T17:29:00' }), AHORA).cuando,
      ).toContain('hoy');
    });

    it('ayer', () => {
      expect(
        describirCargaAbierta(lote({ creadoEn: '2026-09-10T18:23:00' }), AHORA).cuando,
      ).toContain('ayer');
    });

    /*
     * Por DÍA CALENDARIO, no por horas: algo de las 23:52 de ayer es «ayer» a
     * las 00:30 de hoy, aunque hayan pasado 38 minutos.
     */
    it('38 minutos atrás pero del día anterior sigue siendo «ayer»', () => {
      const d = describirCargaAbierta(
        lote({ creadoEn: '2026-09-10T23:52:00' }),
        new Date('2026-09-11T00:30:00'),
      );
      expect(d.cuando).toContain('ayer');
    });

    it('más viejo que ayer lleva la fecha', () => {
      const d = describirCargaAbierta(
        lote({ creadoEn: '2026-09-08T09:00:00' }),
        AHORA,
      );
      expect(d.cuando).not.toContain('hoy');
      expect(d.cuando).not.toContain('ayer');
      expect(d.cuando).toContain('8');
    });

    it('una fecha que no se puede leer no inventa nada', () => {
      expect(describirCargaAbierta(lote({ creadoEn: 'no-es-fecha' }), AHORA).cuando).toBe('');
    });
  });
});
