/**
 * El módulo de plata (§9 del diseño de «centavos en todo»). Las MISMAS pruebas
 * viven en el back (`src/common/plata/plata.spec.ts`) y en el micro
 * (`src/common/plata/plata.test.ts`): si cambias una, cambia las tres. El
 * front no tiene Prisma: `Decimal` es un doble con el mismo `toFixed()` que
 * `Prisma.Decimal` (decimal.js), lo que el módulo usa para leerlo exacto.
 */
import { describe, expect, it } from 'vitest';

class Decimal {
  constructor(private readonly texto: string) {}
  toFixed(): string {
    return this.texto;
  }
}
const Prisma = { Decimal };

import {
  aCentavos,
  aCentavosWompi,
  alCentavo,
  alPeso,
  conDosDecimalesImplicitos,
  mismaPlata,
  pesos,
  PlataInvalida,
  porBps,
  porcentaje,
  porMil,
  repartir,
  restar,
  sumar,
} from './plata';
import { enLetras, formatoPesos } from './formato';

/** Generador determinista (mulberry32): las propiedades se repiten igual en cada corrida. */
function azar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('aCentavos: cualquier valor de plata → centavos enteros', () => {
  it('los casos frontera del flotante', () => {
    expect(aCentavos(1.005)).toBe(101); // no 100: el ruido del flotante no gana
    expect(aCentavos(0.29)).toBe(29); // 0.29 * 100 === 28.999999999999996
    expect(aCentavos(0.1 + 0.2)).toBe(30);
    expect(aCentavos(1234567.89)).toBe(123456789);
    expect(aCentavos(0)).toBe(0);
  });

  it('la mitad se aleja del cero, también en los negativos (P1 a)', () => {
    expect(aCentavos(0.005)).toBe(1);
    expect(aCentavos(-0.005)).toBe(-1);
    expect(aCentavos(2.675)).toBe(268);
    expect(aCentavos(-2.675)).toBe(-268);
    expect(aCentavos(-1500.5)).toBe(-150050);
    expect(Object.is(aCentavos(-0.001), 0)).toBe(true); // nunca −0
  });

  it('texto, bigint y Prisma.Decimal: exacto, sin pasar por el flotante', () => {
    expect(aCentavos('1234567.89')).toBe(123456789);
    expect(aCentavos('-0.5')).toBe(-50);
    expect(aCentavos('.5')).toBe(50);
    expect(aCentavos('1234')).toBe(123400);
    expect(aCentavos('1e3')).toBe(100000);
    expect(aCentavos(BigInt(1234))).toBe(123400);
    expect(aCentavos(new Prisma.Decimal('1234567.89'))).toBe(123456789);
    expect(aCentavos(new Prisma.Decimal('0.29'))).toBe(29);
    expect(aCentavos(new Prisma.Decimal('1.005'))).toBe(101);
    expect(aCentavos(new Prisma.Decimal('-1.005'))).toBe(-101);
  });

  it('«tal cual»: más de dos decimales LANZA en lugar de redondear', () => {
    expect(() => aCentavos(1234.567, { talCual: true })).toThrow(PlataInvalida);
    expect(() => aCentavos('1234.567', { talCual: true })).toThrow(/más de dos decimales/);
    expect(() => aCentavos(new Prisma.Decimal('0.001'), { talCual: true })).toThrow(PlataInvalida);
    // Ceros de más y el ruido del flotante no son «más decimales».
    expect(aCentavos('1234.5600', { talCual: true })).toBe(123456);
    expect(aCentavos(0.1 + 0.2, { talCual: true })).toBe(30);
  });

  it('lo que no es plata LANZA: nunca un «$ 0» callado', () => {
    expect(() => aCentavos(Number.NaN)).toThrow(PlataInvalida);
    expect(() => aCentavos(Number.POSITIVE_INFINITY)).toThrow(PlataInvalida);
    expect(() => aCentavos('')).toThrow(PlataInvalida);
    expect(() => aCentavos('1.234,56')).toThrow(PlataInvalida);
    expect(() => aCentavos('abc')).toThrow(PlataInvalida);
    expect(() => aCentavos(null as unknown as number)).toThrow(PlataInvalida);
    expect(() => aCentavos('99999999999999999')).toThrow(/fuera del rango/);
  });

  it('propiedad: aCentavos(c / 100) === c para todo c hasta 10^15 (≈ $10 billones)', () => {
    const r = azar(20261003);
    for (let i = 0; i < 20_000; i++) {
      const escala = 10 ** Math.floor(r() * 16); // de 1 a 10^15
      const c = Math.floor(r() * escala) * (r() < 0.5 ? -1 : 1);
      if (Math.abs(c) >= 1e15) continue;
      expect(aCentavos(c / 100)).toBe(c === 0 ? 0 : c);
      expect(aCentavos(String(c / 100))).toBe(c === 0 ? 0 : c);
    }
    for (const c of [1, 99, 100, 101, 999_999_999_999_99, 10 ** 15 - 1]) {
      expect(aCentavos(c / 100)).toBe(c);
    }
  });
});

describe('pesos, alCentavo y alPeso', () => {
  it('pesos lee una columna de cualquier tipo y deja pasar null/undefined', () => {
    expect(pesos(new Prisma.Decimal('1234.50'))).toBe(1234.5);
    expect(pesos(BigInt(1234))).toBe(1234);
    expect(pesos('1500000.00')).toBe(1500000);
    expect(pesos(1500000)).toBe(1500000);
    expect(pesos(null)).toBeNull();
    expect(pesos(undefined)).toBeUndefined();
  });

  it('alCentavo redondea al centavo; alPeso al peso (la mitad lejos del cero)', () => {
    expect(alCentavo(1234.5678)).toBe(1234.57);
    expect(alCentavo(-1234.5650)).toBe(-1234.57);
    expect(alPeso(1234.5)).toBe(1235);
    expect(alPeso(-1234.5)).toBe(-1235);
    expect(alPeso(1234.49)).toBe(1234);
    expect(Object.is(alPeso(-0.4), 0)).toBe(true);
  });

  it('alPeso redondea UNA sola vez, sobre el valor tal cual (C4: antes 5,495 daba 6)', () => {
    expect(alPeso(5.495)).toBe(5);
    expect(alPeso('5.495')).toBe(5);
    expect(alPeso({ toFixed: () => '5.495' })).toBe(5);
    expect(alPeso(-5.495)).toBe(-5);
    // La retefuente del 3,5 % de $1.000.157 = 35.005,495 → $35.005 (como hoy con Math.round).
    expect(alPeso((1_000_157 * 3.5) / 100)).toBe(35_005);
    expect(alPeso('35005.5')).toBe(35_006);
    expect(alPeso('-2.5')).toBe(-3);
    expect(alPeso(2.5)).toBe(3);
    expect(alPeso(BigInt(1234))).toBe(1234);
    expect(Object.is(alPeso('-0.4'), 0)).toBe(true);
    expect(() => alPeso(Number.NaN)).toThrow();
    expect(() => alPeso('1,5')).toThrow();
  });
});

describe('sumar, restar y mismaPlata', () => {
  it('suman exacto al centavo', () => {
    expect(sumar(0.1, 0.2)).toBe(0.3);
    expect(sumar(1234567.89, 0.11, new Prisma.Decimal('100'), BigInt(5))).toBe(1234673);
    expect(sumar()).toBe(0);
    expect(restar(0.3, 0.1)).toBe(0.2);
    expect(restar(100, 100.01)).toBe(-0.01);
    expect(mismaPlata(1234.5, new Prisma.Decimal('1234.50'))).toBe(true);
    expect(mismaPlata(0.1 + 0.2, 0.3)).toBe(true);
    expect(mismaPlata(1234.5, 1234.51)).toBe(false);
  });

  it('propiedad: sumar es asociativa al centavo', () => {
    const r = azar(7);
    for (let i = 0; i < 5_000; i++) {
      const [a, b, c] = [0, 0, 0].map(() => Math.round((r() - 0.5) * 2e9) / 100);
      expect(sumar(sumar(a, b), c)).toBe(sumar(a, sumar(b, c)));
      expect(aCentavos(sumar(a, b, c))).toBe(aCentavos(a) + aCentavos(b) + aCentavos(c));
    }
  });
});

describe('porcentaje, porMil y porBps (al centavo)', () => {
  it('casos', () => {
    expect(porcentaje(1_000_000, 19)).toBe(190_000);
    expect(porcentaje(1_234_567.89, 19)).toBe(234_567.9); // 234.567,8991 → ,90
    expect(porcentaje(100, 3.5)).toBe(3.5);
    expect(porMil(1_000_000, 4)).toBe(4_000); // el 4×1000
    expect(porMil(1_234_567, 9.66)).toBe(11_925.92); // 11.925,917… → ,92
    expect(porBps(1_000_000, 100)).toBe(10_000);
    expect(porBps(-1_000_000, 250)).toBe(-25_000);
  });
});

describe('repartir: la suma de las partes es SIEMPRE el total', () => {
  it('casos', () => {
    expect(repartir(100, [1, 1, 1])).toEqual([33.34, 33.33, 33.33]);
    expect(repartir(0.01, [1, 1])).toEqual([0.01, 0]);
    expect(repartir(1_000_000, [6000, 4000])).toEqual([600_000, 400_000]);
    expect(repartir(-100, [1, 1, 1])).toEqual([-33.34, -33.33, -33.33]);
    expect(repartir(100, [0, 1])).toEqual([0, 100]);
  });

  it('lo que no se puede repartir LANZA', () => {
    expect(() => repartir(100, [])).toThrow(PlataInvalida);
    expect(() => repartir(100, [0, 0])).toThrow(PlataInvalida);
    expect(() => repartir(100, [1, -1])).toThrow(PlataInvalida);
  });

  it('propiedad: suma exacta y cada parte a menos de un centavo de su proporción', () => {
    const r = azar(42);
    for (let i = 0; i < 3_000; i++) {
      const total = Math.round((r() - 0.3) * 1e10) / 100;
      const n = 1 + Math.floor(r() * 7);
      const pesosDeLasPartes = Array.from({ length: n }, () => Math.floor(r() * 10_000));
      if (!pesosDeLasPartes.some((p) => p > 0)) pesosDeLasPartes[0] = 1;
      const partes = repartir(total, pesosDeLasPartes);
      expect(partes.reduce((s, p) => s + aCentavos(p), 0)).toBe(aCentavos(total));
      const suma = pesosDeLasPartes.reduce((a, b) => a + b, 0);
      partes.forEach((p, k) => {
        const ideal = (aCentavos(total) * pesosDeLasPartes[k]) / suma;
        expect(Math.abs(aCentavos(p) - ideal)).toBeLessThan(1 + 1e-6);
      });
    }
  });
});

describe('los bordes: bancos, Wompi y Prisma', () => {
  it('conDosDecimalesImplicitos', () => {
    expect(conDosDecimalesImplicitos(1234.56)).toBe('123456');
    expect(conDosDecimalesImplicitos(1_500_000)).toBe('150000000');
    expect(conDosDecimalesImplicitos(0.29)).toBe('29');
    expect(() => conDosDecimalesImplicitos(-1)).toThrow(PlataInvalida);
  });

  it('aCentavosWompi es exacto (nunca pesos * 100 en flotante)', () => {
    expect(aCentavosWompi(1_234_567.29)).toBe(123_456_729);
    expect(aCentavosWompi(0.29)).toBe(29);
    expect(() => aCentavosWompi(0)).toThrow(PlataInvalida);
    expect(() => aCentavosWompi(-5)).toThrow(PlataInvalida);
  });
});

describe('formatoPesos (P8 a)', () => {
  it('en pantalla: decimales sólo si los hay', () => {
    expect(formatoPesos(2_500_000)).toBe('$ 2.500.000');
    expect(formatoPesos(1_234_567.89)).toBe('$ 1.234.567,89');
    expect(formatoPesos(1_234_567.8)).toBe('$ 1.234.567,80');
    expect(formatoPesos(0)).toBe('$ 0');
    expect(formatoPesos(-1500.5)).toBe('-$ 1.500,50');
    expect(formatoPesos(new Prisma.Decimal('999.99'))).toBe('$ 999,99');
  });

  it('en documentos: siempre dos decimales', () => {
    expect(formatoPesos(2_500_000, { decimales: 'siempre' })).toBe('$ 2.500.000,00');
    expect(formatoPesos(0.05, { decimales: 'siempre' })).toBe('$ 0,05');
  });

  it('un texto que no es plata LANZA (el «$ 0» callado del front)', () => {
    expect(() => formatoPesos('$ 1.000')).toThrow(PlataInvalida);
  });
});

describe('enLetras (P9 a)', () => {
  it('con y sin centavos', () => {
    expect(enLetras(1_200_000.5)).toBe('UN MILLÓN DOSCIENTOS MIL PESOS CON CINCUENTA CENTAVOS');
    expect(enLetras(2_500_000)).toBe('DOS MILLONES QUINIENTOS MIL PESOS');
    expect(enLetras(0.01)).toBe('CERO PESOS CON UN CENTAVO');
    expect(enLetras(1)).toBe('UN PESO');
    expect(enLetras(21.21)).toBe('VEINTIÚN PESOS CON VEINTIÚN CENTAVOS');
    expect(enLetras(1_000_000)).toBe('UN MILLÓN PESOS'); // igual que `pesosEnLetras` de las plantillas
    expect(enLetras(101_000_000)).toBe('CIENTO UN MILLONES PESOS');
    expect(enLetras(-150.75)).toBe('CIENTO CINCUENTA PESOS CON SETENTA Y CINCO CENTAVOS');
  });

  it('nada o fuera de rango → null', () => {
    expect(enLetras(null)).toBeNull();
    expect(enLetras(undefined)).toBeNull();
    expect(enLetras(1_000_000_000_000)).toBeNull();
  });
});
