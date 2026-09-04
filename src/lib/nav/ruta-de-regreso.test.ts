import { describe, expect, it } from 'vitest';
import { conRegreso, lugarDeRegreso, rutaDeRegreso } from './ruta-de-regreso';

const LISTA = '/panel/inmobiliaria/propietarios';

describe('rutaDeRegreso', () => {
  it('sin ?volver vuelve al lugar por defecto', () => {
    expect(rutaDeRegreso(null, LISTA)).toBe(LISTA);
    expect(rutaDeRegreso(undefined, LISTA)).toBe(LISTA);
    expect(rutaDeRegreso('', LISTA)).toBe(LISTA);
  });

  it('respeta una ruta adentro del panel', () => {
    expect(rutaDeRegreso('/panel/inmobiliaria/contratos/abc', LISTA)).toBe(
      '/panel/inmobiliaria/contratos/abc',
    );
  });

  it('no sale del panel: otro dominio o protocolo relativo caen al defecto', () => {
    expect(rutaDeRegreso('https://evil.example/x', LISTA)).toBe(LISTA);
    expect(rutaDeRegreso('//evil.example/panel/x', LISTA)).toBe(LISTA);
    expect(rutaDeRegreso('/inquilino', LISTA)).toBe(LISTA);
  });
});

describe('conRegreso', () => {
  it('agrega ?volver= codificado', () => {
    expect(conRegreso('/panel/inmobiliaria/propietarios/p1', '/panel/inmobiliaria/contratos/c1')).toBe(
      '/panel/inmobiliaria/propietarios/p1?volver=%2Fpanel%2Finmobiliaria%2Fcontratos%2Fc1',
    );
  });

  it('usa & si el destino ya lleva query', () => {
    expect(conRegreso('/panel/inmobiliaria/inmuebles/nuevo?propietarioId=p1', '/panel/x')).toBe(
      '/panel/inmobiliaria/inmuebles/nuevo?propietarioId=p1&volver=%2Fpanel%2Fx',
    );
  });
});

describe('lugarDeRegreso', () => {
  it('nombra la ficha de la que se vino', () => {
    expect(lugarDeRegreso('/panel/inmobiliaria/contratos/c1')).toBe('contrato');
    expect(lugarDeRegreso('/panel/inmobiliaria/inmuebles/i1')).toBe('inmueble');
    expect(lugarDeRegreso('/panel/inmobiliaria/cobros/co1')).toBe('cobro');
    expect(lugarDeRegreso('/panel/inmobiliaria/propietarios/p1?tab=pagos')).toBe('propietario');
    expect(lugarDeRegreso('/panel/inmobiliaria/pagos/dispersiones')).toBe('dispersiones');
  });

  it('una lista es «lista», y lo desconocido es «otro»', () => {
    expect(lugarDeRegreso('/panel/inmobiliaria/propietarios')).toBe('lista');
    expect(lugarDeRegreso('/panel/inmobiliaria/contratos')).toBe('lista');
    expect(lugarDeRegreso('/panel/inmobiliaria/hoy')).toBe('otro');
  });
});
