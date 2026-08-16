/**
 * `lista()` — la forma de la respuesta no puede volver a vaciar una tabla.
 *
 * El back devuelve la mayoría de las listas PELADAS (`[...]`) y unas pocas
 * envueltas (`{ data: [...] }`). El front hacía `res.data` en las catorce, así
 * que en las peladas leía `undefined` y la pantalla decía «todavía no tenés
 * nada» con los datos ahí. Cinco tablas del panel.
 *
 * Ninguna se cayó nunca: se veía igual que la verdad.
 */

import { describe, expect, it } from 'vitest';

import { propietariosApi, agentesApi } from './inmobiliaria.service';

/** Sustituye a `apiClient.get` para controlar la forma de la respuesta. */
async function conRespuesta<T>(forma: unknown, leer: () => Promise<T>): Promise<T> {
  const cliente = await import('./client');
  const original = cliente.apiClient.get;
  (cliente.apiClient as { get: unknown }).get = async () => forma;
  try {
    return await leer();
  } finally {
    (cliente.apiClient as { get: unknown }).get = original;
  }
}

const UNO = { id: 'p1', name: 'Jorge Restrepo' };

describe('la lista llega venga como venga', () => {
  it('pelada: `[...]` — el caso que rompía el CRM de Propietarios', async () => {
    const r = await conRespuesta([UNO], () => propietariosApi.getAll());
    expect(r).toHaveLength(1);
  });

  it('envuelta: `{ data: [...] }` — el caso de agentes', async () => {
    const r = await conRespuesta({ data: [UNO] }, () => agentesApi.getAll());
    expect(r).toHaveLength(1);
  });

  it('vacía pelada sigue siendo vacía', async () => {
    expect(await conRespuesta([], () => propietariosApi.getAll())).toEqual([]);
  });

  it('vacía envuelta sigue siendo vacía', async () => {
    expect(await conRespuesta({ data: [] }, () => agentesApi.getAll())).toEqual([]);
  });

  /*
   * Sin cuerpo (204, o un endpoint que no devuelve nada) no puede reventar la
   * pantalla: es «no hay», no «se rompió».
   */
  it('sin cuerpo no explota', async () => {
    expect(await conRespuesta(undefined, () => propietariosApi.getAll())).toEqual([]);
    expect(await conRespuesta(null, () => agentesApi.getAll())).toEqual([]);
  });

  /*
   * La prueba que evita el error que YA cometí escribiendo esto: un
   * `return lista(res)` dentro de `lista` compila igual y se lleva la pila
   * puesta en la primera respuesta envuelta.
   */
  it('una respuesta envuelta no se llama a sí misma para siempre', async () => {
    const grande = { data: Array.from({ length: 200 }, (_, i) => ({ id: `p${i}` })) };
    const r = await conRespuesta(grande, () => agentesApi.getAll());
    expect(r).toHaveLength(200);
  });
});
