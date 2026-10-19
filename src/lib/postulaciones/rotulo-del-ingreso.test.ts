import { describe, it, expect } from 'vitest';

import { rotuloDelIngreso } from './rotulo-del-ingreso';

describe('rotuloDelIngreso — cómo se llama lo que gana según su situación', () => {
  it('empleado: salario', () => {
    expect(rotuloDelIngreso('employed')).toEqual({
      label: 'Salario mensual',
      hint: 'Tu salario base mensual antes de deducciones',
      corto: 'Salario',
    });
  });

  // POST-5 (QA 18-10): el paso 3 decía «Ingresos mensuales» y la revisión «Salario».
  it('independiente: ingresos, también en la revisión', () => {
    expect(rotuloDelIngreso('self-employed').label).toBe('Ingresos mensuales');
    expect(rotuloDelIngreso('self-employed').corto).toBe('Ingresos');
  });

  it('pensionado: mesada', () => {
    expect(rotuloDelIngreso('retired').label).toBe('Mesada pensional');
    expect(rotuloDelIngreso('retired').corto).toBe('Mesada');
  });

  it('sin situación todavía: salario, como antes', () => {
    expect(rotuloDelIngreso(undefined).corto).toBe('Salario');
  });
});
