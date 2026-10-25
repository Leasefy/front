import { describe, expect, it } from 'vitest';
import { tiempoHastaElFin } from './tiempo-hasta-el-fin';

// 21-10-2026 a media tarde en Bogotá: el día de la revisión de la ficha.
const HOY = new Date(2026, 9, 21, 15, 30);

describe('tiempoHastaElFin', () => {
  it('el caso de la revisión: 28 feb 2027 es «en 4 meses»', () => {
    expect(tiempoHastaElFin('2027-02-28', 'es', HOY)).toMatchObject({ texto: 'en 4 meses', tono: 'normal' });
  });

  it('la medianoche UTC del back cuenta como ese día, no el anterior', () => {
    expect(tiempoHastaElFin('2026-10-31T00:00:00.000Z', 'es', HOY)?.dias).toBe(10);
  });

  it('menos de 60 días se dice en días, y desde 30 pide atención', () => {
    expect(tiempoHastaElFin('2026-11-30', 'es', HOY)).toMatchObject({ texto: 'en 40 días', tono: 'normal' });
    expect(tiempoHastaElFin('2026-11-20', 'es', HOY)).toMatchObject({ texto: 'en 30 días', tono: 'pronto' });
    expect(tiempoHastaElFin('2026-10-22', 'es', HOY)).toMatchObject({ texto: 'en 1 día', tono: 'pronto' });
  });

  it('hoy y lo que ya pasó', () => {
    expect(tiempoHastaElFin('2026-10-21', 'es', HOY)).toMatchObject({ texto: 'termina hoy', tono: 'pronto' });
    expect(tiempoHastaElFin('2026-10-18', 'es', HOY)).toMatchObject({ texto: 'terminó hace 3 días', tono: 'vencido' });
  });

  it('más de un año: años y meses, sin redondear', () => {
    expect(tiempoHastaElFin('2028-02-28', 'es', HOY)?.texto).toBe('en 1 año y 4 meses');
    expect(tiempoHastaElFin('2028-10-21', 'es', HOY)?.texto).toBe('en 2 años');
  });

  it('en inglés', () => {
    expect(tiempoHastaElFin('2027-02-28', 'en', HOY)?.texto).toBe('in 4 months');
    expect(tiempoHastaElFin('2026-10-18', 'en', HOY)?.texto).toBe('ended 3 days ago');
  });

  it('una fecha que no se entiende no inventa nada', () => {
    expect(tiempoHastaElFin('no es fecha', 'es', HOY)).toBeNull();
  });
});
