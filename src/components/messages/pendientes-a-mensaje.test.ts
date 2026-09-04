/**
 * Las reglas de formato del mensaje que se arma desde un pendiente.
 *
 * Están probadas aparte porque son puras y porque los dos errores que pueden
 * cometer son silenciosos: una fecha corrida un día y una plata mal separada
 * no rompen nada, se mandan.
 */

import { describe, it, expect } from 'vitest';

import {
  formatearFecha,
  formatearPesos,
  mensajeDeCobro,
  mensajeDeDispersion,
  mensajeDeDocumento,
  mesEnCurso,
  mesEnPalabras,
} from './pendientes-a-mensaje';

describe('formatearPesos', () => {
  it('separa los miles con punto, como se escribe en Colombia', () => {
    expect(formatearPesos(2_400_000)).toBe('$2.400.000');
    expect(formatearPesos(1_234)).toBe('$1.234');
    expect(formatearPesos(999)).toBe('$999');
    expect(formatearPesos(0)).toBe('$0');
  });

  it('el signo va antes del peso, no metido entre los dígitos', () => {
    expect(formatearPesos(-1_500_000)).toBe('-$1.500.000');
  });
});

describe('formatearFecha', () => {
  it('🔴 NO pasa por `new Date`: en UTC-5 el 05 se leería como el 04', () => {
    expect(formatearFecha('2026-09-05')).toBe('05/09/2026');
    expect(formatearFecha('2026-01-01')).toBe('01/01/2026');
  });

  it('aguanta un timestamp completo sin corromperse', () => {
    expect(formatearFecha('2026-09-05T00:00:00.000Z')).toBe('05/09/2026');
  });

  it('lo que no reconoce lo devuelve tal cual, no lo inventa', () => {
    expect(formatearFecha('mañana')).toBe('mañana');
  });
});

describe('mesEnPalabras', () => {
  it("'2026-09' es septiembre de 2026", () => {
    expect(mesEnPalabras('2026-09')).toBe('septiembre de 2026');
    expect(mesEnPalabras('2026-01')).toBe('enero de 2026');
    expect(mesEnPalabras('2026-12')).toBe('diciembre de 2026');
  });

  it('un mes fuera de rango se devuelve crudo antes que mentir', () => {
    expect(mesEnPalabras('2026-13')).toBe('2026-13');
    expect(mesEnPalabras('nada')).toBe('nada');
  });
});

describe('mesEnCurso', () => {
  it('es el nombre del mes, sin año — es lo que pide la variable {{mes}}', () => {
    expect(mesEnCurso(new Date(2026, 8, 4))).toBe('septiembre');
  });
});

const COBRO = {
  id: 'c-1',
  mes: '2026-08',
  totalCop: 2_400_000,
  pendienteCop: 2_400_000,
  vencimiento: '2026-08-05',
  diasDeMora: 12,
  estado: 'OVERDUE',
  contractId: 'ct-1',
  inmueble: 'Apto 301',
};

describe('mensajeDeCobro', () => {
  it('nombra a la persona, el mes, el inmueble, la plata y la fecha', () => {
    const texto = mensajeDeCobro(COBRO, 'Ana');
    expect(texto).toContain('Hola Ana');
    expect(texto).toContain('agosto de 2026');
    expect(texto).toContain('Apto 301');
    expect(texto).toContain('$2.400.000');
    expect(texto).toContain('05/08/2026');
  });

  it('dice los días de mora cuando los hay, y en singular cuando es uno', () => {
    expect(mensajeDeCobro(COBRO, 'Ana')).toContain('12 días de mora');
    expect(mensajeDeCobro({ ...COBRO, diasDeMora: 1 }, 'Ana')).toContain('1 día de mora');
  });

  it('sin mora no la menciona: no se inventa un atraso', () => {
    expect(mensajeDeCobro({ ...COBRO, diasDeMora: 0 }, 'Ana')).not.toContain('mora');
  });

  it('🔴 con un abono, habla del SALDO y aclara sobre qué total', () => {
    const texto = mensajeDeCobro({ ...COBRO, pendienteCop: 900_000 }, 'Ana');
    expect(texto).toContain('quedan $900.000');
    expect(texto).toContain('de $2.400.000');
  });

  it('sin inmueble no deja el hueco de un «de undefined»', () => {
    const texto = mensajeDeCobro({ ...COBRO, inmueble: null }, 'Ana');
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('null');
  });
});

describe('mensajeDeDispersion', () => {
  it('el tono se invierte: acá el que debe es la inmobiliaria', () => {
    const texto = mensajeDeDispersion(
      { id: 'd-1', mes: '2026-09', netoCop: 3_600_000, estado: 'PENDING', inmueble: 'Casa 12' },
      'Ana',
    );
    expect(texto).toContain('Hola Ana');
    expect(texto).toContain('septiembre de 2026');
    expect(texto).toContain('$3.600.000');
    expect(texto).toContain('Casa 12');
    expect(texto).not.toContain('mora');
  });
});

describe('mensajeDeDocumento', () => {
  it('el enlace va tal cual viene del back: acá no se arma ninguna URL', () => {
    const texto = mensajeDeDocumento(
      { id: 'doc-1', tipo: 'CONTRATO', nombre: 'Contrato 2026', url: 'https://x.test/c.pdf' },
      'Ana',
    );
    expect(texto).toContain('el contrato');
    expect(texto).toContain('Contrato 2026');
    expect(texto).toContain('https://x.test/c.pdf');
  });

  it('sin enlace no deja un «: .» colgando', () => {
    const texto = mensajeDeDocumento(
      { id: 'doc-2', tipo: 'ACTA', nombre: 'Acta de entrega', url: '' },
      'Ana',
    );
    expect(texto).toBe('Hola Ana, te comparto el acta «Acta de entrega».');
  });
});
