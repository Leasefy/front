import { describe, expect, it } from 'vitest';

import { conCandadoDelPlan, faltaActivarParaVerTodo, precioDelMes, type AccesoDeLaCuenta } from './acceso';
import { mensajeDeLaBarra } from '@/components/inmobiliaria/plan/BarraDelMesGratis';
import { momentoDelModal } from '@/components/inmobiliaria/plan/ModalDelPlan';

const prueba = (dias: number, vencida = false) => ({
  aliado: 'Fenalco',
  empieza: '2026-10-01T00:00:00.000Z',
  termina: '2026-10-31T00:00:00.000Z',
  diasQueQuedan: dias,
  vencida,
});
const acceso = (a: Partial<AccesoDeLaCuenta>): AccesoDeLaCuenta => ({ estado: 'cliente', veTodo: true, faltaActivar: false, prueba: null, ...a });

describe('Qué ve cada cuenta en el panel (Nico, 27-10-2026)', () => {
  it('el candado: con acceso, sólo en lo gratis; sin él (back anterior), el modo comercial de siempre', () => {
    expect(conCandadoDelPlan({ acceso: acceso({ estado: 'gratis', veTodo: false }) })).toBe(true);
    expect(conCandadoDelPlan({ modoComercial: true, acceso: acceso({ estado: 'prueba', faltaActivar: true, prueba: prueba(20) }) })).toBe(false);
    expect(conCandadoDelPlan({ acceso: acceso({ estado: 'cliente' }) })).toBe(false);
    expect(conCandadoDelPlan({ modoComercial: true })).toBe(true);
    expect(conCandadoDelPlan({ modoComercial: false })).toBe(false);
    expect(faltaActivarParaVerTodo({ acceso: acceso({ estado: 'prueba', faltaActivar: true, prueba: prueba(20) }) })).toBe(true);
    expect(faltaActivarParaVerTodo({ acceso: acceso({ estado: 'gratis', veTodo: false, faltaActivar: false }) })).toBe(false);
  });

  it('la barra: cuenta los días, se pone seria desde 10 antes, invita al terminar; nada a quien paga', () => {
    expect(mensajeDeLaBarra(acceso({ estado: 'prueba', prueba: prueba(20) }))).toMatchObject({ tono: 'regalo', sePuedeCerrar: false });
    expect(mensajeDeLaBarra(acceso({ estado: 'prueba', prueba: prueba(20) }))?.texto).toContain('Fenalco te regaló un mes de Leasefy completo: te quedan 20 días');
    expect(mensajeDeLaBarra(acceso({ estado: 'prueba', prueba: prueba(10) }))).toMatchObject({ tono: 'urgente', boton: 'Dejar mi plan activo' });
    expect(mensajeDeLaBarra(acceso({ estado: 'prueba', prueba: prueba(1) }))?.texto).toBe('Mañana termina tu mes gratis. Deja tu plan activo y no se apaga nada de lo que montaste.');
    expect(mensajeDeLaBarra(acceso({ estado: 'gratis', veTodo: false, prueba: prueba(0, true) }))).toMatchObject({ tono: 'urgente', boton: 'Seguir con todo' });
    expect(mensajeDeLaBarra(acceso({ estado: 'gratis', veTodo: false }))).toMatchObject({ tono: 'gratis', sePuedeCerrar: true });
    expect(mensajeDeLaBarra(acceso({ estado: 'pagado' }))).toBeNull();
    expect(mensajeDeLaBarra(acceso({ estado: 'cliente' }))).toBeNull();
    expect(mensajeDeLaBarra(null)).toBeNull();
  });

  it('el modal: una vez por hito del mes gratis (10, 7, 3, 1), una vez al día al terminar, una vez por semana en lo gratis', () => {
    const hoy = new Date('2026-10-28T15:00:00Z');
    expect(momentoDelModal(acceso({ estado: 'prueba', prueba: prueba(20) }), hoy)).toBeNull();
    expect(momentoDelModal(acceso({ estado: 'prueba', prueba: prueba(9) }), hoy)).toMatchObject({ clave: 'faltan-10', tipo: 'faltan', dias: 9 });
    expect(momentoDelModal(acceso({ estado: 'prueba', prueba: prueba(5) }), hoy)?.clave).toBe('faltan-7');
    expect(momentoDelModal(acceso({ estado: 'prueba', prueba: prueba(1) }), hoy)?.clave).toBe('faltan-1');
    expect(momentoDelModal(acceso({ estado: 'gratis', veTodo: false, prueba: prueba(0, true) }), hoy)).toMatchObject({ clave: 'termino-2026-10-28', tipo: 'termino' });
    const semana = momentoDelModal(acceso({ estado: 'gratis', veTodo: false }), hoy);
    expect(semana?.tipo).toBe('gratis');
    expect(momentoDelModal(acceso({ estado: 'gratis', veTodo: false }), new Date('2026-10-27T15:00:00Z'))?.clave).toBe(semana?.clave);
    expect(momentoDelModal(acceso({ estado: 'pagado' }), hoy)).toBeNull();
  });

  it('el precio del mes con espacio duro y sin centavos', () => {
    expect(precioDelMes(99_000)).toBe('$ 99.000');
    expect(precioDelMes(630_000)).toBe('$ 630.000');
  });
});
