import { describe, expect, it } from 'vitest';
import { fragmentoDelEncabezado, porQueDelMapeo } from './por-que-del-mapeo';

describe('«Por qué» del mapeo en palabras (MC-30, MIG-C 04-10)', () => {
  it('🔴 nunca el alias crudo («codigo», «maneja tercero»)', () => {
    const texto = porQueDelMapeo({ columna: 'Maneja Tercero (S/N)', porque: 'maneja tercero', exacto: false, campo: 'manejaTercero' });
    expect(texto).toBe('Su nombre incluye «Maneja Tercero»');
    expect(texto).not.toContain('maneja tercero');
  });

  it('el nombre exacto, a mano y sin reconocer', () => {
    expect(porQueDelMapeo({ columna: 'Código', porque: 'codigo', exacto: true, campo: 'codigo' })).toBe('Por el nombre de la columna');
    expect(porQueDelMapeo({ columna: 'Código cuenta', porque: 'codigo', campo: 'codigo', isManual: true })).toBe('Lo elegiste a mano');
    expect(porQueDelMapeo({ columna: 'Otra', porque: '', campo: null })).toBe('No la reconocimos: elige el campo o déjala sin usar');
  });

  it('el pedazo sale con sus tildes', () => {
    expect(fragmentoDelEncabezado('Código de la cuenta', 'codigo')).toBe('Código');
    expect(porQueDelMapeo({ columna: 'Código de la cuenta', porque: 'codigo', exacto: false, campo: 'codigo' })).toBe('Su nombre incluye «Código»');
  });
});
