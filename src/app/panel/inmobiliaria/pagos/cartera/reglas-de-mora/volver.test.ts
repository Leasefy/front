import { describe, it, expect } from 'vitest';
import { destinoDeVolver } from './volver';

describe('destinoDeVolver — el «Volver» de Reglas de mora devuelve a donde estaba la persona', () => {
  it('sin `volver` va a Cobros', () => {
    expect(destinoDeVolver(null)).toEqual({ href: '/panel/inmobiliaria/pagos/cartera/cobros', label: 'Volver a cobros' });
    expect(destinoDeVolver('')).toEqual({ href: '/panel/inmobiliaria/pagos/cartera/cobros', label: 'Volver a cobros' });
  });

  it('desde la ficha de un contrato vuelve al contrato', () => {
    expect(destinoDeVolver('/panel/inmobiliaria/contratos/c-1')).toEqual({
      href: '/panel/inmobiliaria/contratos/c-1',
      label: 'Volver al contrato',
    });
  });

  it('FACT-2: desde «Por facturar» vuelve a Facturación (sólo esa ruta exacta)', () => {
    expect(destinoDeVolver('/panel/inmobiliaria/facturacion')).toEqual({
      href: '/panel/inmobiliaria/facturacion',
      label: 'Volver a Facturación',
    });
    expect(destinoDeVolver('/panel/inmobiliaria/facturacion/../x')).toEqual({
      href: '/panel/inmobiliaria/pagos/cartera/cobros',
      label: 'Volver a cobros',
    });
  });

  it('r25: desde el aviso de la Cartera vuelve a la Cartera (sólo esa ruta exacta)', () => {
    expect(destinoDeVolver('/panel/inmobiliaria/pagos/cartera')).toEqual({
      href: '/panel/inmobiliaria/pagos/cartera',
      label: 'Volver a Cartera',
    });
    expect(destinoDeVolver('/panel/inmobiliaria/pagos/cartera/x').label).toBe('Volver a cobros');
  });

  it('otra ruta del panel que no es un contrato sigue yendo a Cobros', () => {
    expect(destinoDeVolver('/panel/inmobiliaria/inquilinos')).toEqual({
      href: '/panel/inmobiliaria/pagos/cartera/cobros',
      label: 'Volver a cobros',
    });
  });

  it('nunca sale del panel: un destino externo o de otro panel se ignora', () => {
    for (const malo of ['https://evil.example', '//evil.example/panel/inmobiliaria/contratos/x', '/panel/propiedades', 'panel/inmobiliaria/contratos/x']) {
      expect(destinoDeVolver(malo)).toEqual({ href: '/panel/inmobiliaria/pagos/cartera/cobros', label: 'Volver a cobros' });
    }
  });
});
