/**
 * La configuración de exógena: lo puro.
 *
 * 🔴 Lo que este archivo clava: un `null` del back NO es un cero. El tope
 * propio en `null` es «hereda», el del año publicado en `null` es «no se
 * agrupa nada», y un campo vacío tiene que viajar como `null` para BORRAR el
 * override. Si alguna de las tres se convirtiera a `0`, todo tercero quedaría
 * agrupado bajo el NIT 222222222 y la exógena se presentaría sin la mitad de
 * los terceros.
 */

import { describe, expect, it } from 'vitest';

import type { ConfiguracionDeExogena } from '@/lib/api/exogena.service';
import {
  borradorDe,
  cuerpoDeConfiguracion,
  estadoDelInterruptor,
  fraseDelTope,
  hayCambios,
  problemaDeLaConfiguracion,
  topeDelBorrador,
  topeVigente,
} from './configuracion-de-exogena';

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

const config = (extra: Partial<ConfiguracionDeExogena> = {}): ConfiguracionDeExogena => ({
  disponible: true,
  motivo: null,
  girosAPropietariosEn1001: false,
  saldo2815En1009: false,
  topeCuantiasMenoresCop: null,
  delAnioDeLaPlataforma: {
    anio: 2026,
    resolucion: 'Resolución 000162 de 2023',
    topeCuantiasMenoresCop: 1_000_000,
    nitCuantiasMenores: '222222222',
  },
  decididoPorNico: {
    girosAPropietariosEn1001: 'Los giros a propietarios van SÓLO en el 1647 (decidido el 18-09).',
  },
  esperaAlContador: {
    saldo2815En1009: 'El saldo de 2815 al 31 de diciembre es un pasivo real, pero…',
  },
  ...extra,
});

describe('topeVigente', () => {
  it('el override propio gana', () => {
    expect(topeVigente(config({ topeCuantiasMenoresCop: 500_000 }))).toEqual({
      valorCop: 500_000,
      origen: 'PROPIO',
    });
  });

  it('sin override hereda el del año publicado', () => {
    expect(topeVigente(config())).toEqual({ valorCop: 1_000_000, origen: 'PLATAFORMA' });
  });

  it('🔴 sin año publicado no hay tope, y eso NO es cero', () => {
    const r = topeVigente(config({ delAnioDeLaPlataforma: null }));
    expect(r).toEqual({ valorCop: null, origen: 'NINGUNO' });
    expect(r.valorCop).not.toBe(0);
  });

  it('🔴 el año publicado sin tope tampoco es cero', () => {
    const r = topeVigente(
      config({
        delAnioDeLaPlataforma: {
          anio: 2026,
          resolucion: null,
          topeCuantiasMenoresCop: null,
          nitCuantiasMenores: null,
        },
      }),
    );
    expect(r).toEqual({ valorCop: null, origen: 'NINGUNO' });
  });
});

describe('fraseDelTope', () => {
  it('con override dice qué está pisando', () => {
    const frase = fraseDelTope(config({ topeCuantiasMenoresCop: 500_000 }), pesos);
    expect(frase).toContain('Rige el tuyo');
    expect(frase).toContain('Pisa el que Leasefy publicó para 2026');
  });

  it('heredado nombra el año y dice cómo seguir heredándolo', () => {
    expect(fraseDelTope(config(), pesos)).toContain('Deja el campo vacío');
  });

  it('🔴 sin tope dice que no se agrupa nada, no «$0»', () => {
    const frase = fraseDelTope(config({ delAnioDeLaPlataforma: null }), pesos);
    expect(frase).toContain('NO se agrupa nada');
    expect(frase).not.toContain('$0');
  });
});

describe('estadoDelInterruptor', () => {
  it('🔴 el de los giros está DECIDIDO, con el texto del back', () => {
    const i = estadoDelInterruptor(config(), 'girosAPropietariosEn1001');
    expect(i.estado).toBe('DECIDIDO');
    expect(i.explicacion).toContain('SÓLO en el 1647');
  });

  it('🔴 el del 2815 ESPERA AL CONTADOR, y son dos interruptores iguales', () => {
    const i = estadoDelInterruptor(config(), 'saldo2815En1009');
    expect(i.estado).toBe('ESPERA_AL_CONTADOR');
    expect(i.explicacion).toContain('pasivo real');
  });

  it('un back viejo sin los textos no inventa ninguno', () => {
    const i = estadoDelInterruptor(
      config({ decididoPorNico: {}, esperaAlContador: {} }),
      'saldo2815En1009',
    );
    expect(i.estado).toBe('SIN_NOTA');
    expect(i.explicacion).toBeNull();
  });
});

describe('topeDelBorrador', () => {
  it('vacío es heredar, no cero', () => {
    expect(topeDelBorrador('')).toBeNull();
    expect(topeDelBorrador('   ')).toBeNull();
  });

  it('un entero positivo pasa', () => {
    expect(topeDelBorrador('1000000')).toBe(1_000_000);
  });

  it('cero, negativos y texto no pasan (el DTO es @Min(1))', () => {
    expect(topeDelBorrador('0')).toBe('INVALIDO');
    expect(topeDelBorrador('-5')).toBe('INVALIDO');
    expect(topeDelBorrador('1.000.000')).toBe('INVALIDO');
    expect(topeDelBorrador('mucho')).toBe('INVALIDO');
  });
});

describe('cuerpoDeConfiguracion', () => {
  it('🔴 manda las TRES claves del DTO y ninguna más (forbidNonWhitelisted)', () => {
    const cuerpo = cuerpoDeConfiguracion({
      girosAPropietariosEn1001: true,
      saldo2815En1009: false,
      tope: '750000',
    });
    expect(Object.keys(cuerpo).sort()).toEqual([
      'girosAPropietariosEn1001',
      'saldo2815En1009',
      'topeCuantiasMenoresCop',
    ]);
    expect(cuerpo.topeCuantiasMenoresCop).toBe(750_000);
  });

  it('🔴 el campo vacío viaja como null: es lo que BORRA el override', () => {
    const cuerpo = cuerpoDeConfiguracion({
      girosAPropietariosEn1001: false,
      saldo2815En1009: false,
      tope: '',
    });
    expect(cuerpo.topeCuantiasMenoresCop).toBeNull();
    expect('topeCuantiasMenoresCop' in cuerpo).toBe(true);
  });
});

describe('borradorDe / hayCambios / problemaDeLaConfiguracion', () => {
  it('el borrador arranca igual a lo guardado y no reporta cambios', () => {
    const c = config({ topeCuantiasMenoresCop: 900_000 });
    const b = borradorDe(c);
    expect(b.tope).toBe('900000');
    expect(hayCambios(c, b)).toBe(false);
  });

  it('🔴 un tope heredado arranca VACÍO, no en «0»', () => {
    expect(borradorDe(config()).tope).toBe('');
  });

  it('prender un interruptor es un cambio', () => {
    const c = config();
    expect(hayCambios(c, { ...borradorDe(c), saldo2815En1009: true })).toBe(true);
  });

  it('un tope mal escrito frena el guardado acá', () => {
    expect(
      problemaDeLaConfiguracion({
        girosAPropietariosEn1001: false,
        saldo2815En1009: false,
        tope: '1.000.000',
      }),
    ).toContain('pesos enteros');
  });
});
