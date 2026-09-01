/**
 * Las reglas del muro — lo que decide si alguien entra al producto.
 *
 * Cada caso de acá es una manera concreta de dejar a un cliente afuera o de
 * encerrarlo adentro. Por eso se prueban como funciones puras y no a través
 * de la pantalla: acá no hay nada que se pueda tapar con un mock.
 */

import { describe, it, expect } from 'vitest';
import type { PasoDeMigracion } from '@/lib/api/migracion-estado.service';
import {
  estaExentaDelMuro,
  normalizarEstado,
  pasoActual,
  pasoHabilitado,
  pasoQueFrena,
  todoListo,
} from './muro-reglas';

function paso(
  id: PasoDeMigracion['id'],
  estado: PasoDeMigracion['estado'],
  conteo = 0,
): PasoDeMigracion {
  return { id, estado, detalle: null, conteo };
}

/** El estado típico de una inmobiliaria que recién entra. */
const RECIEN_LLEGADA: PasoDeMigracion[] = [
  paso('terceros', 'pendiente'),
  paso('propiedades', 'pendiente'),
  paso('contratos', 'pendiente'),
  paso('puc', 'no_disponible'),
  paso('contables', 'no_disponible'),
];

// ══════════════════════════════════════════════════════════════════════════

describe('estaExentaDelMuro — las pantallas a las que el propio muro manda', () => {
  it.each([
    '/panel/inmobiliaria/migracion',
    '/panel/inmobiliaria/migracion/terceros',
    '/panel/inmobiliaria/inmuebles/importar',
    '/panel/inmobiliaria/contratos/migrar',
  ])('%s NO se tapa', (ruta) => {
    expect(estaExentaDelMuro(ruta)).toBe(true);
  });

  it('la barra final no cambia nada', () => {
    expect(estaExentaDelMuro('/panel/inmobiliaria/migracion/')).toBe(true);
  });

  it.each([
    '/panel/inmobiliaria',
    '/panel/inmobiliaria/dashboard',
    '/panel/inmobiliaria/inmuebles',
    '/panel/inmobiliaria/contratos',
  ])('%s sí se tapa', (ruta) => {
    expect(estaExentaDelMuro(ruta)).toBe(false);
  });

  it('el prefijo es estricto: una ruta que sólo EMPIEZA parecido no se salva', () => {
    // Sin el corte por `/`, `startsWith` dejaría entrar cualquier cosa que
    // arranque igual, y el muro se volvería opcional para quien conozca la URL.
    expect(estaExentaDelMuro('/panel/inmobiliaria/migracion-masiva')).toBe(false);
    expect(estaExentaDelMuro('/panel/inmobiliaria/contratos/migrarlo-todo')).toBe(false);
  });

  it('sin pathname (SSR, primer render) no se considera exenta', () => {
    expect(estaExentaDelMuro(null)).toBe(false);
    expect(estaExentaDelMuro(undefined)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('normalizarEstado — 🔴 ante la duda, NO se bloquea', () => {
  it('bloquea sólo con un estado bien formado que lo pide', () => {
    const r = normalizarEstado({ bloquea: true, resuelta: null, pasos: RECIEN_LLEGADA });
    expect(r).not.toBeNull();
    expect(r?.pasos).toHaveLength(5);
  });

  it.each([
    ['bloquea: false', { bloquea: false, resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea ausente', { resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea como texto', { bloquea: 'true', resuelta: null, pasos: RECIEN_LLEGADA }],
    ['bloquea como 1', { bloquea: 1, resuelta: null, pasos: RECIEN_LLEGADA }],
    ['sin pasos', { bloquea: true, resuelta: null }],
    ['pasos vacío', { bloquea: true, resuelta: null, pasos: [] }],
    ['pasos no es lista', { bloquea: true, resuelta: null, pasos: { terceros: 'listo' } }],
    ['un paso con id desconocido', { bloquea: true, pasos: [paso('terceros', 'listo'), { id: 'otra_cosa', estado: 'listo', detalle: null, conteo: 0 }] }],
    ['un paso con estado desconocido', { bloquea: true, pasos: [{ id: 'terceros', estado: 'a_medias', detalle: null, conteo: 0 }] }],
    ['un paso sin conteo', { bloquea: true, pasos: [{ id: 'terceros', estado: 'listo', detalle: null }] }],
    ['una cadena', 'bloquea'],
    ['null', null],
    ['undefined', undefined],
    ['un HTML de error', '<!doctype html><h1>502</h1>'],
  ])('%s → el panel se ve normal', (_caso, bruto) => {
    expect(normalizarEstado(bruto)).toBeNull();
  });

  it('una `resuelta` que no reconoce no rompe: queda en null y el muro sigue en pie', () => {
    const r = normalizarEstado({ bloquea: true, resuelta: 'algo_nuevo', pasos: RECIEN_LLEGADA });
    expect(r?.resuelta).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('pasoHabilitado — el paso N+1 espera al N', () => {
  it('recién llegada: sólo el primero se puede empezar', () => {
    expect(pasoHabilitado(RECIEN_LLEGADA, 0)).toBe(true);
    expect(pasoHabilitado(RECIEN_LLEGADA, 1)).toBe(false);
    expect(pasoHabilitado(RECIEN_LLEGADA, 2)).toBe(false);
  });

  it('con el primero listo se abre el segundo, y sólo el segundo', () => {
    const pasos = [paso('terceros', 'listo', 42), ...RECIEN_LLEGADA.slice(1)];
    expect(pasoHabilitado(pasos, 1)).toBe(true);
    expect(pasoHabilitado(pasos, 2)).toBe(false);
  });

  it('un paso `no_disponible` nunca se habilita — no hay botón que apretar', () => {
    const pasos = [
      paso('terceros', 'listo'),
      paso('propiedades', 'listo'),
      paso('contratos', 'listo'),
      paso('puc', 'no_disponible'),
    ];
    expect(pasoHabilitado(pasos, 3)).toBe(false);
  });

  it('un `no_disponible` intercalado NO congela a los de abajo', () => {
    // Si PUC —que nadie puede hacer— frenara lo que viene después, el muro
    // sería una cárcel: nadie podría terminar nunca.
    const pasos = [
      paso('terceros', 'listo'),
      paso('puc', 'no_disponible'),
      paso('propiedades', 'pendiente'),
    ];
    expect(pasoHabilitado(pasos, 2)).toBe(true);
  });
});

describe('pasoQueFrena — el porqué que se muestra bajo el candado', () => {
  it('nombra el paso inmediatamente anterior que falta, no el primero de la lista', () => {
    const pasos = [
      paso('terceros', 'pendiente'),
      paso('propiedades', 'pendiente'),
      paso('contratos', 'pendiente'),
    ];
    expect(pasoQueFrena(pasos, 2)?.id).toBe('propiedades');
  });

  it('el primer paso no lo frena nadie', () => {
    expect(pasoQueFrena(RECIEN_LLEGADA, 0)).toBeNull();
  });
});

describe('pasoActual — dónde parás hoy', () => {
  it('es el primer exigible sin terminar', () => {
    const pasos = [paso('terceros', 'listo'), ...RECIEN_LLEGADA.slice(1)];
    expect(pasoActual(pasos)).toBe(1);
  });

  it('con todo listo no se queda colgado fuera de rango', () => {
    const pasos = [paso('terceros', 'listo'), paso('propiedades', 'listo')];
    expect(pasoActual(pasos)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('todoListo — la puerta de «Ya terminé»', () => {
  it('con algo pendiente, no', () => {
    expect(todoListo(RECIEN_LLEGADA)).toBe(false);
  });

  it('con los tres exigibles listos, sí — los `no_disponible` no cuentan', () => {
    const pasos = [
      paso('terceros', 'listo', 42),
      paso('propiedades', 'listo', 30),
      paso('contratos', 'listo', 28),
      paso('puc', 'no_disponible'),
      paso('contables', 'no_disponible'),
    ];
    expect(todoListo(pasos)).toBe(true);
  });

  it('todos `no_disponible` NO es «todo listo»', () => {
    // Sería ofrecer la salida sin que la persona haya hecho nada, que es
    // justo el cartel que había antes de este trabajo.
    expect(todoListo([paso('puc', 'no_disponible'), paso('contables', 'no_disponible')])).toBe(
      false,
    );
  });
});
