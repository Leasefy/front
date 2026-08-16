/**
 * El registro que hace que las tablas se refresquen solas y que no se pida diez
 * veces lo mismo.
 *
 * Las dos mitades tienen un modo de fallar caro:
 *  · compartir de más → dos pantallas viendo la respuesta de otra sesión;
 *  · compartir para siempre → una tabla que nunca se entera de nada.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  recursoDe,
  compartirGet,
  invalidar,
  alCambiar,
  _enVuelo,
  _reiniciar,
} from './refresco-de-datos';

beforeEach(() => _reiniciar());

describe('recursoDe', () => {
  it('saca el recurso de una ruta con prefijo de área', () => {
    expect(recursoDe('/inmobiliaria/propietarios')).toBe('propietarios');
    expect(recursoDe('/landlord/propietarios')).toBe('propietarios');
  });

  it('ignora los ids: la ficha y la lista son el mismo recurso', () => {
    expect(recursoDe('/inmobiliaria/dispersiones/9f0c2b1a-1111-4222-8333-aaaabbbbcccc')).toBe(
      'dispersiones',
    );
    expect(recursoDe('/inmobiliaria/cobros/42')).toBe('cobros');
  });

  it('ignora la acción al final', () => {
    expect(recursoDe('/inmobiliaria/dispersiones/abc12345/process')).toBe('dispersiones');
  });

  it('ignora el query', () => {
    expect(recursoDe('/inmobiliaria/cobros?month=2026-07&status=PAID')).toBe('cobros');
  });
});

describe('compartirGet', () => {
  it('dos pedidos iguales en vuelo salen UNA vez', async () => {
    const hacer = vi.fn(() => new Promise((r) => setTimeout(() => r('ok'), 10)));

    const [a, b] = await Promise.all([
      compartirGet('/config', hacer),
      compartirGet('/config', hacer),
    ]);

    expect(hacer).toHaveBeenCalledTimes(1);
    expect(a).toBe('ok');
    expect(b).toBe('ok');
  });

  it('rutas distintas no se mezclan', async () => {
    const uno = vi.fn(async () => 'uno');
    const dos = vi.fn(async () => 'dos');

    const [a, b] = await Promise.all([
      compartirGet('/a', uno),
      compartirGet('/b', dos),
    ]);

    expect(a).toBe('uno');
    expect(b).toBe('dos');
  });

  /*
   * Lo que separa esto de un caché. Si la promesa se quedara guardada, la
   * segunda pantalla vería para siempre la respuesta de la primera.
   */
  it('NO es un caché: terminada, el siguiente pedido sale de nuevo', async () => {
    const hacer = vi.fn(async () => 'x');

    await compartirGet('/config', hacer);
    await compartirGet('/config', hacer);

    expect(hacer).toHaveBeenCalledTimes(2);
    expect(_enVuelo()).toBe(0);
  });

  it('un fallo no queda pegado impidiendo el próximo intento', async () => {
    const falla = vi.fn(async () => {
      throw new Error('caído');
    });

    await expect(compartirGet('/config', falla)).rejects.toThrow('caído');
    expect(_enVuelo()).toBe(0);

    const anda = vi.fn(async () => 'ok');
    await expect(compartirGet('/config', anda)).resolves.toBe('ok');
  });

  it('los que comparten un fallo lo reciben todos', async () => {
    const falla = () => Promise.reject(new Error('500'));

    const resultados = await Promise.allSettled([
      compartirGet('/x', falla),
      compartirGet('/x', falla),
    ]);

    expect(resultados.map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });
});

describe('invalidar / alCambiar', () => {
  it('avisa a quien lee ese recurso', () => {
    const oyente = vi.fn();
    alCambiar(['propietarios'], oyente);

    invalidar('propietarios');

    expect(oyente).toHaveBeenCalledTimes(1);
  });

  it('no avisa a quien lee otra cosa', () => {
    const otro = vi.fn();
    alCambiar(['cobros'], otro);

    invalidar('agentes');

    expect(otro).not.toHaveBeenCalled();
  });

  /*
   * Generar dispersiones nace de los cobros. Sin el arrastre, la pantalla de
   * cartera sigue mostrando el número viejo y no hay forma de saber por qué.
   */
  it('arrastra los recursos que la acción también toca', () => {
    const cobros = vi.fn();
    alCambiar(['cobros'], cobros);

    invalidar('dispersiones');

    expect(cobros).toHaveBeenCalledTimes(1);
  });

  it('desuscribirse deja de recibir', () => {
    const oyente = vi.fn();
    const listo = alCambiar(['cobros'], oyente);

    listo();
    invalidar('cobros');

    expect(oyente).not.toHaveBeenCalled();
  });

  it('un oyente que revienta no deja sin avisar a los demás', () => {
    const bueno = vi.fn();
    alCambiar(['cobros'], () => {
      throw new Error('esta pantalla está rota');
    });
    alCambiar(['cobros'], bueno);

    expect(() => invalidar('cobros')).not.toThrow();
    expect(bueno).toHaveBeenCalledTimes(1);
  });

  it('un oyente de varios recursos recibe por cualquiera', () => {
    const oyente = vi.fn();
    alCambiar(['cobros', 'dispersiones'], oyente);

    invalidar('cobros');
    expect(oyente).toHaveBeenCalledTimes(2); // cobros + su arrastre a dispersiones
  });
});
