/**
 * CopropietariosField.test.tsx — un inmueble puede tener más de un dueño
 * (Nico, 2026-09-03).
 *
 * Lo que este archivo protege, y por qué cada regla importa:
 *
 *  * El porcentaje del PRINCIPAL es EL RESTO, nunca un cuarto input. Por eso
 *    «las participaciones suman 100 %» es cierto por construcción y no una
 *    validación que se pueda violar. Si alguien lo "simplifica" a un input
 *    más, vuelve a ser posible guardar un 99 % y dejar plata sin dueño.
 *  * Con cero copropietarios NO se manda lista: la forma vieja del cable
 *    (`propietarioId` suelto) tiene que seguir saliendo intacta, o se rompen
 *    el wizard, la importación por lote y la migración de cartera.
 *  * Todo va en puntos básicos. Con decimales, tres dueños en partes iguales
 *    no suman 100 nunca.
 */

import { describe, it, expect } from 'vitest';
import {
  aListaDelCable,
  bpsDelPrincipal,
  motivoInvalido,
  porcentajeABps,
  type FilaCopropietario,
} from './CopropietariosField';

describe('porcentajeABps', () => {
  it('lee coma y punto por igual — en Colombia se escribe con coma', () => {
    expect(porcentajeABps('33,5')).toBe(3350);
    expect(porcentajeABps('33.5')).toBe(3350);
  });

  it('vacío o basura es 0, nunca NaN', () => {
    expect(porcentajeABps('')).toBe(0);
    expect(porcentajeABps('abc')).toBe(0);
    expect(porcentajeABps('-10')).toBe(0);
  });
});

describe('bpsDelPrincipal', () => {
  it('sin copropietarios el principal se lleva el 100 %', () => {
    expect(bpsDelPrincipal([])).toBe(10000);
  });

  it('el resto es exacto con tercios — el motivo de usar enteros', () => {
    const filas: FilaCopropietario[] = [
      { propietarioId: 'p-2', participacionBps: 3333 },
      { propietarioId: 'p-3', participacionBps: 3333 },
    ];
    expect(bpsDelPrincipal(filas)).toBe(3334);
  });

  it('devuelve negativo cuando se pasaron del 100 %, sin topearlo en 0', () => {
    // Topearlo escondería por cuánto se pasaron, que es justo lo que hay que
    // poder decirle a la persona.
    expect(bpsDelPrincipal([{ propietarioId: 'p-2', participacionBps: 12000 }])).toBe(-2000);
  });
});

describe('motivoInvalido', () => {
  it('sin copropietarios no hay nada que validar', () => {
    expect(motivoInvalido([], 'p-1')).toBeNull();
  });

  it('una fila sin propietario elegido no se puede guardar', () => {
    expect(
      motivoInvalido([{ propietarioId: null, participacionBps: 5000 }], 'p-1'),
    ).toMatch(/Falta elegir/);
  });

  it('un copropietario en 0 % no es un copropietario', () => {
    expect(
      motivoInvalido([{ propietarioId: 'p-2', participacionBps: 0 }], 'p-1'),
    ).toMatch(/mayor a 0/);
  });

  it('el principal repetido como copropietario se ataja acá, no en el 400 del back', () => {
    expect(
      motivoInvalido([{ propietarioId: 'p-1', participacionBps: 5000 }], 'p-1'),
    ).toMatch(/repetido/);
  });

  it('dos copropietarios iguales también', () => {
    expect(
      motivoInvalido(
        [
          { propietarioId: 'p-2', participacionBps: 3000 },
          { propietarioId: 'p-2', participacionBps: 3000 },
        ],
        'p-1',
      ),
    ).toMatch(/repetido/);
  });

  it('si al principal no le queda nada, dice cuánto se llevaron', () => {
    expect(
      motivoInvalido([{ propietarioId: 'p-2', participacionBps: 10000 }], 'p-1'),
    ).toMatch(/100 %/);
  });

  it('un reparto legítimo pasa', () => {
    expect(
      motivoInvalido([{ propietarioId: 'p-2', participacionBps: 4000 }], 'p-1'),
    ).toBeNull();
  });
});

describe('aListaDelCable', () => {
  it('sin copropietarios devuelve null — se manda la forma vieja del cable', () => {
    expect(aListaDelCable([], 'p-1')).toBeNull();
  });

  it('suma el principal con el resto y ordena de mayor a menor', () => {
    const lista = aListaDelCable(
      [
        { propietarioId: 'p-2', participacionBps: 2000 },
        { propietarioId: 'p-3', participacionBps: 5000 },
      ],
      'p-1',
    );
    expect(lista).toEqual([
      { propietarioId: 'p-3', participacionBps: 5000 },
      { propietarioId: 'p-1', participacionBps: 3000 },
      { propietarioId: 'p-2', participacionBps: 2000 },
    ]);
  });

  it('la lista SIEMPRE suma 10000 bps — la invariante que el back verifica', () => {
    // Tres en tercios: el caso que con decimales nunca cierra.
    const lista = aListaDelCable(
      [
        { propietarioId: 'p-2', participacionBps: 3333 },
        { propietarioId: 'p-3', participacionBps: 3333 },
      ],
      'p-1',
    );
    expect(lista!.reduce((a, c) => a + c.participacionBps, 0)).toBe(10000);
    // Y el principal se queda con el peso de más, no con uno de menos.
    expect(lista![0]).toEqual({ propietarioId: 'p-1', participacionBps: 3334 });
  });
});
