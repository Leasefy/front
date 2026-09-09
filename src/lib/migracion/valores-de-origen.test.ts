/**
 * Las celdas empaquetadas de los exports reales.
 *
 * 🔴 Los valores de acá tienen la MISMA FORMA que los archivos reales de la
 * inmobiliaria, pero las personas y las direcciones son inventadas: los
 * archivos con datos de gente viva no entran al repo.
 */

import { describe, expect, it } from 'vitest';
import {
  banderaDeOrigen,
  codigoYDireccion,
  documentoYNombre,
  enteroDeOrigen,
  estratoDePalabras,
  fechaDeOrigen,
  listaDePersonas,
  plataDeOrigen,
  porcentajeDeOrigen,
} from './valores-de-origen';

describe('estratoDePalabras', () => {
  it('lee el estrato escrito con letras', () => {
    expect(estratoDePalabras('Tres')).toBe(3);
    expect(estratoDePalabras('CINCO')).toBe(5);
    expect(estratoDePalabras('  seis ')).toBe(6);
    expect(estratoDePalabras('Estrato Cuatro')).toBe(4);
  });

  it('lee el estrato en dígito, por si otro sistema lo manda así', () => {
    expect(estratoDePalabras('3')).toBe(3);
    expect(estratoDePalabras(2)).toBe(2);
  });

  it('lo que no es un estrato queda vacío, nunca en 1', () => {
    expect(estratoDePalabras('No Estratificada')).toBeUndefined();
    expect(estratoDePalabras('Comentario')).toBeUndefined();
    expect(estratoDePalabras('')).toBeUndefined();
    expect(estratoDePalabras('Siete')).toBeUndefined();
    expect(estratoDePalabras('9')).toBeUndefined();
  });
});

describe('documentoYNombre', () => {
  it('parte «documento - nombre»', () => {
    expect(documentoYNombre('901111111 - INVERSIONES DEL SUR S.A.S')).toEqual({
      documento: '901111111',
      nombre: 'INVERSIONES DEL SUR S.A.S',
      orden: undefined,
    });
  });

  it('acepta el documento con puntos', () => {
    expect(documentoYNombre('43.090.971 - LUZ MARINA PEREZ').documento).toBe('43090971');
  });

  it('sin documento a la izquierda, todo es el nombre', () => {
    expect(documentoYNombre('CONSTRUCTORA A - B S.A.S')).toEqual({
      documento: undefined,
      nombre: 'CONSTRUCTORA A - B S.A.S',
      orden: undefined,
    });
  });

  it('lee el orden que el archivo declara con [n]', () => {
    expect(documentoYNombre('[2] 42979803 - MARIA VICTORIA PEREZ')).toEqual({
      documento: '42979803',
      nombre: 'MARIA VICTORIA PEREZ',
      orden: 2,
    });
  });

  it('vacío es vacío', () => {
    expect(documentoYNombre('')).toEqual({});
    expect(documentoYNombre(null)).toEqual({});
  });
});

describe('listaDePersonas', () => {
  it('lee los dos copropietarios en orden', () => {
    expect(
      listaDePersonas('[1] 43090971 - LUZ ADRIANA PEREZ, [2] 42979803 - MARIA VICTORIA PEREZ'),
    ).toEqual([
      { documento: '43090971', nombre: 'LUZ ADRIANA PEREZ', orden: 1 },
      { documento: '42979803', nombre: 'MARIA VICTORIA PEREZ', orden: 2 },
    ]);
  });

  it('una sola persona con marcador sigue siendo una lista de uno', () => {
    expect(listaDePersonas('[1] 71211270 - JORGE ANDRES LONDONO')).toEqual([
      { documento: '71211270', nombre: 'JORGE ANDRES LONDONO', orden: 1 },
    ]);
  });

  it('sin marcador, todo el texto es UNA persona: las comas de un nombre no la parten', () => {
    expect(listaDePersonas('900111222 - PORTOFINO S.A.S, BIC')).toEqual([
      { documento: '900111222', nombre: 'PORTOFINO S.A.S, BIC', orden: undefined },
    ]);
  });

  it('la coma que separa personas no se pega al nombre', () => {
    const lista = listaDePersonas('[1] 900111222 - ALFA S.A.S, [2] 900333444 - BETA S.A.S');
    expect(lista.map((p) => p.nombre)).toEqual(['ALFA S.A.S', 'BETA S.A.S']);
  });

  it('vacío es lista vacía', () => {
    expect(listaDePersonas('')).toEqual([]);
  });
});

describe('codigoYDireccion', () => {
  it('parte por el PRIMER guion, no por el de la dirección', () => {
    expect(codigoYDireccion('218 - 126 SUR 42 - 37 AP 504')).toEqual({
      codigo: '218',
      direccion: '126 SUR 42 - 37 AP 504',
    });
  });

  it('lee el caso simple', () => {
    expect(codigoYDireccion('3 - CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO')).toEqual({
      codigo: '3',
      direccion: 'CR 50 127 SUR 61 OF 502 ED. PUNTO CENTRO',
    });
  });

  it('sin código, todo es dirección', () => {
    expect(codigoYDireccion('CR 50 127 SUR 61')).toEqual({ direccion: 'CR 50 127 SUR 61' });
  });

  it('vacío es vacío', () => {
    expect(codigoYDireccion('')).toEqual({});
  });
});

describe('fechaDeOrigen', () => {
  it('parte la fecha de la hora', () => {
    expect(fechaDeOrigen('2026-09-08 10:10:08')).toBe('2026-09-08');
  });

  it('acepta el ISO pelado', () => {
    expect(fechaDeOrigen('2023-03-31')).toBe('2023-03-31');
  });

  it('en Colombia el día va primero', () => {
    expect(fechaDeOrigen('03/04/2026')).toBe('2026-04-03');
  });

  it('una fecha que no existe no se corrige: queda vacía', () => {
    expect(fechaDeOrigen('2026-02-31')).toBeUndefined();
    expect(fechaDeOrigen('2026-13-01')).toBeUndefined();
  });

  it('lo que no es una fecha queda vacío', () => {
    expect(fechaDeOrigen('15 de marzo de 2025')).toBeUndefined();
    expect(fechaDeOrigen('')).toBeUndefined();
  });
});

describe('plataDeOrigen', () => {
  it('lee el formato del export: $1,900,000.00', () => {
    expect(plataDeOrigen('$1,900,000.00')).toBe(1900000);
    expect(plataDeOrigen('$0.00')).toBe(0);
    expect(plataDeOrigen('$608,910.00')).toBe(608910);
  });

  it('lee también la convención colombiana', () => {
    expect(plataDeOrigen('$1.900.000,50')).toBe(1900000.5);
  });

  it('un número pelado es un número', () => {
    expect(plataDeOrigen('1900000')).toBe(1900000);
    expect(plataDeOrigen(1900000)).toBe(1900000);
  });

  it('el saldo negativo conserva el signo', () => {
    expect(plataDeOrigen('$-4,500.00')).toBe(-4500);
  });

  it('una LISTA de montos no es un monto', () => {
    expect(plataDeOrigen('$451,000.00, $649,000.00')).toBeUndefined();
  });

  it('vacío y basura quedan vacíos', () => {
    expect(plataDeOrigen('')).toBeUndefined();
    expect(plataDeOrigen('N/A')).toBeUndefined();
  });
});

describe('enteroDeOrigen', () => {
  it('lee el consecutivo con miles con coma', () => {
    expect(enteroDeOrigen('26,766')).toBe(26766);
    expect(enteroDeOrigen('1')).toBe(1);
  });
});

describe('porcentajeDeOrigen', () => {
  it('lee «7 %» y «7.5 %»', () => {
    expect(porcentajeDeOrigen('7 %')).toBe(7);
    expect(porcentajeDeOrigen('7.5 %')).toBe(7.5);
    expect(porcentajeDeOrigen('10 %')).toBe(10);
  });

  it('el 0 % es un porcentaje real', () => {
    expect(porcentajeDeOrigen('0 %')).toBe(0);
  });

  it('fuera de [0, 100] no es un porcentaje', () => {
    expect(porcentajeDeOrigen('180 %')).toBeUndefined();
  });
});

describe('banderaDeOrigen', () => {
  it('lee SI y NO', () => {
    expect(banderaDeOrigen('SI')).toBe(true);
    expect(banderaDeOrigen('Sí')).toBe(true);
    expect(banderaDeOrigen('NO')).toBe(false);
  });

  it('lo que no es ni SI ni NO queda sin decidir', () => {
    expect(banderaDeOrigen('')).toBeUndefined();
    expect(banderaDeOrigen('tal vez')).toBeUndefined();
  });
});
