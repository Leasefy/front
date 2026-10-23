import { describe, it, expect } from 'vitest';
import {
  conteosDeLasPestanas,
  estadoDelBack,
  filasDeLaPestana,
  laListaCuentaLosSinArriendo,
} from './pestanas';

const con = { tenantId: 'a', arriendos: [{ contractId: 'c1' }] } as never as { tenantId: string; arriendos: unknown[] };
const sin = { tenantId: 'b', arriendos: [] } as { tenantId: string; arriendos: unknown[] };

describe('pestañas de Inquilinos (Nico, 22-10)', () => {
  it('«Sin arriendo» se le pide al back como «activos»', () => {
    expect(estadoDelBack('sinArriendo')).toBe('activos');
    expect(estadoDelBack('terminados')).toBe('terminados');
  });

  it('«Activos» ya no trae a quien no tiene arriendo; «Sin arriendo» trae sólo a esos', () => {
    expect(filasDeLaPestana([con, sin] as never[], 'activos').map((p: { tenantId: string }) => p.tenantId)).toEqual(['a']);
    expect(filasDeLaPestana([con, sin] as never[], 'sinArriendo').map((p: { tenantId: string }) => p.tenantId)).toEqual(['b']);
    expect(filasDeLaPestana([con, sin] as never[], 'todos')).toHaveLength(2);
  });

  it('el número de «Activos» resta a los que no tienen arriendo; sin saberlo, no se inventa', () => {
    const conteos = { activos: 10, terminados: 4, todos: 13 };
    expect(conteosDeLasPestanas(conteos, 3)).toEqual({ activos: 7, sinArriendo: 3, terminados: 4, todos: 13 });
    expect(conteosDeLasPestanas(conteos, null)).toEqual({ activos: null, sinArriendo: null, terminados: 4, todos: 13 });
    expect(conteosDeLasPestanas(null, 3)).toEqual({ activos: null, sinArriendo: 3, terminados: null, todos: null });
  });

  it('la lista de «terminados» no sirve para contar a los que no tienen arriendo', () => {
    expect(laListaCuentaLosSinArriendo('terminados')).toBe(false);
    expect(laListaCuentaLosSinArriendo('todos')).toBe(true);
  });
});
