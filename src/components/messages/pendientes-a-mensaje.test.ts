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
  mensajeDeCuota,
  mensajeDeDocumento,
  mensajeDeGiro,
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

const CUOTA = {
  id: 'cu-1',
  mes: '2026-08',
  totalCop: 2_400_000,
  pendienteCop: 2_400_000,
  vencimiento: '2026-08-05',
  cajon: 'CARTERA' as const,
  diasDeMora: 12,
  diasDePlazo: 5,
  contractId: 'ct-1',
  inmueble: 'Apto 301',
  cobroId: null,
};

describe('mensajeDeCuota', () => {
  it('nombra a la persona, la cuota del mes, el inmueble, la plata y la fecha', () => {
    const texto = mensajeDeCuota(CUOTA, 'Ana');
    expect(texto).toContain('Hola Ana');
    expect(texto).toContain('la cuota de agosto de 2026');
    expect(texto).toContain('Apto 301');
    expect(texto).toContain('$2.400.000');
    expect(texto).toContain('Venció el 05/08/2026');
    // Es la cuota del contrato: no habla de un cobro que puede no existir.
    expect(texto).not.toContain('cobro');
  });

  it('en cartera dice los días de mora, y en singular cuando es uno', () => {
    expect(mensajeDeCuota(CUOTA, 'Ana')).toContain('12 días de mora');
    expect(mensajeDeCuota({ ...CUOTA, diasDeMora: 1 }, 'Ana')).toContain('1 día de mora');
  });

  it('🔴 vencida dentro del plazo NO habla de mora: el plazo se lo dio la inmobiliaria', () => {
    const texto = mensajeDeCuota({ ...CUOTA, cajon: 'VENCIDA_EN_PLAZO', diasDeMora: 0 }, 'Ana');
    expect(texto).toContain('Venció el 05/08/2026');
    expect(texto).not.toContain('mora');
  });

  it('una cuota por vencer dice «vence», no «venció»', () => {
    const texto = mensajeDeCuota(
      { ...CUOTA, cajon: 'POR_VENCER', diasDeMora: 0, vencimiento: '2026-10-05' },
      'Ana',
    );
    expect(texto).toContain('Vence el 05/10/2026');
    expect(texto).not.toContain('Venció');
    expect(texto).not.toContain('mora');
  });

  it('🔴 con un abono, habla del SALDO y aclara sobre qué total', () => {
    const texto = mensajeDeCuota({ ...CUOTA, pendienteCop: 900_000 }, 'Ana');
    expect(texto).toContain('quedan $900.000');
    expect(texto).toContain('de $2.400.000');
  });

  it('sin inmueble no deja el hueco de un «de undefined»', () => {
    const texto = mensajeDeCuota({ ...CUOTA, inmueble: null }, 'Ana');
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('null');
  });
});

describe('mensajeDeGiro', () => {
  it('el tono se invierte: acá el que debe es la inmobiliaria', () => {
    const texto = mensajeDeGiro(
      {
        id: 'cp-1',
        mes: '2026-09',
        pendienteCop: 3_600_000,
        vencimiento: '2026-09-05',
        contractId: 'ct-9',
        inmueble: 'Casa 12',
        dispersionId: null,
      },
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
