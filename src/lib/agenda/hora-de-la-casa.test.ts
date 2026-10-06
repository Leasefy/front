import { describe, expect, it } from 'vitest';
import { diaDeLaCasa, horaDeLaCasa, lunesDe } from './hora-de-la-casa';
import { origenDelEvento } from './origen-del-evento';
import { nombreDelOrigen } from '@/lib/pipeline/nombre-del-origen';
import { notasSinMarcas } from '@/lib/api/embudo.service';

describe('las horas y las fechas de la casa (PL-22, AG-05)', () => {
  it('«9:00 a. m.» y «2:30 p. m.», no «9:00am»', () => {
    expect(horaDeLaCasa('09:00')).toBe('9:00 a. m.');
    expect(horaDeLaCasa('12:00')).toBe('12:00 p. m.');
    expect(horaDeLaCasa('14:30')).toBe('2:30 p. m.');
    expect(horaDeLaCasa('00:15')).toBe('12:15 a. m.');
  });
  it('«3 de octubre de 2026», sin cero ni mes abreviado', () => {
    expect(diaDeLaCasa(new Date(2026, 9, 3))).toBe('3 de octubre de 2026');
  });
  it('la semana empieza el lunes', () => {
    expect(lunesDe(new Date(2026, 9, 4)).getDate()).toBe(28); // domingo 4 → lunes 28 de septiembre
    expect(lunesDe(new Date(2026, 9, 5)).getDate()).toBe(5);
  });
});

describe('AG-13: «Tú» sólo para quien creó la tarea', () => {
  const rotulo = (o: string) => (o === 'usuario' ? 'Tú' : 'Sistema');
  it('a la asesora, la tarea del administrador sale con su nombre', () => {
    const t = { tipo: 'tarea' as const, origen: 'usuario' as const, creadaPorId: 'admin', creadaPorNombre: 'Admin Lab' };
    expect(origenDelEvento(t, 'sara', rotulo)).toBe('Admin Lab');
    expect(origenDelEvento(t, 'admin', rotulo)).toBe('Tú');
  });
  it('lo del sistema sigue diciendo «Sistema»', () => {
    expect(origenDelEvento({ tipo: 'visita', origen: 'sistema' }, 'sara', rotulo)).toBe('Sistema');
  });
});

describe('PL-19: los orígenes con su nombre', () => {
  it('«Fincaraíz», «Mercado Libre», «Sitio propio»', () => {
    expect(nombreDelOrigen('FINCARAIZ')).toBe('Fincaraíz');
    expect(nombreDelOrigen('MERCADO_LIBRE')).toBe('Mercado Libre');
    expect(nombreDelOrigen('SITIO_PROPIO')).toBe('Sitio propio');
    expect(nombreDelOrigen('FERIA_DE_VIVIENDA')).toBe('Feria de vivienda');
  });
});

describe('PL-13: las marcas de la sincronización no son notas', () => {
  it('quita `application:` y `visit:` y deja lo escrito', () => {
    expect(
      notasSinMarcas('application:11111111-1111-4111-8111-111111111111\nLlamar el lunes\nvisit:22222222-2222-4222-8222-222222222222'),
    ).toBe('Llamar el lunes');
  });
});
