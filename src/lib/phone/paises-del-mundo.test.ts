import { describe, expect, it } from 'vitest';

import { buscarPaises, celularEnE164, errorDelCelular, paisesDelMundo } from './paises-del-mundo';

describe('los países del mundo para el celular (Nico, 28-10-2026)', () => {
  it('están todos, con Colombia primero y bandera e indicativo', () => {
    const todos = paisesDelMundo();
    expect(todos.length).toBeGreaterThan(220);
    expect(todos[0]).toMatchObject({ iso: 'CO', indicativo: '57', bandera: '🇨🇴' });
    expect(new Set(todos.map((p) => p.iso)).size).toBe(todos.length);
  });

  it('se buscan por nombre sin tildes o por indicativo', () => {
    expect(buscarPaises('espana').map((p) => p.iso)).toContain('ES');
    expect(buscarPaises('+52').map((p) => p.iso)).toContain('MX');
    expect(buscarPaises('alemania').map((p) => p.iso)).toEqual(['DE']);
  });

  it('Colombia como siempre; otro país con su indicativo', () => {
    expect(celularEnE164('300 123 4567', 'CO')).toBe('+573001234567');
    expect(celularEnE164('6012345678', 'CO')).toBeNull();
    expect(celularEnE164('55 1234 5678', 'MX')).toBe('+525512345678');
    expect(celularEnE164('612 34 56 78', 'ES')).toBe('+34612345678');
    expect(celularEnE164('0612345678', 'FR')).toBe('+33612345678');
    expect(celularEnE164('202 555 0123', 'US')).toBe('+12025550123');
    expect(celularEnE164('123', 'US')).toBeNull();
  });

  it('dice por qué no sirve', () => {
    expect(errorDelCelular('', 'CO')).toBe('Escribe tu WhatsApp.');
    expect(errorDelCelular('300123', 'CO')).toBe('El celular en Colombia tiene 10 dígitos.');
    expect(errorDelCelular('6001234567', 'CO')).toBe('Un celular en Colombia empieza por 3.');
    expect(errorDelCelular('12', 'MX')).toMatch(/sin el \+52/);
  });
});
