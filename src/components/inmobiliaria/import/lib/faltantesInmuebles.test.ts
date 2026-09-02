import { describe, it, expect } from 'vitest';
import { etiquetaDeFaltante, esPosibleDuplicado } from './faltantesInmuebles';

describe('etiquetaDeFaltante — the full wu-4-report.md §6 vocabulary', () => {
  const casos: Array<[string, string]> = [
    ['titulo', 'título'],
    ['direccion', 'dirección'],
    ['ciudad', 'ciudad'],
    ['barrio', 'barrio'],
    ['tipo', 'tipo de inmueble'],
    ['area', 'área'],
    ['canon', 'canon mensual'],
    ['precio_venta', 'precio de venta'],
    ['precio_inconsistente', 'canon y precio de venta juntos (elegí uno)'],
    ['tipo_de_negocio', 'tipo de operación (arriendo/venta)'],
    ['departamento', 'departamento'],
    ['fecha_consignacion', 'fecha de consignación'],
    ['posible_duplicado', 'posible duplicado — revisar antes de continuar'],
  ];

  it.each(casos)('%s -> %s', (faltante, esperado) => {
    expect(etiquetaDeFaltante(faltante)).toBe(esperado);
  });

  it('an unrecognised string degrades to a generic label — never dropped', () => {
    expect(etiquetaDeFaltante('algo_que_todavia_no_existe')).toBe('falta un dato');
  });
});

describe('esPosibleDuplicado', () => {
  it('is true when the faltantes list carries posible_duplicado', () => {
    expect(esPosibleDuplicado(['canon', 'posible_duplicado'])).toBe(true);
  });

  it('is false otherwise', () => {
    expect(esPosibleDuplicado(['canon'])).toBe(false);
    expect(esPosibleDuplicado([])).toBe(false);
  });
});
