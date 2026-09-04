import { describe, it, expect } from 'vitest';
import {
  celdaDelFaltanteInmueble,
  etiquetaDeFaltante,
  esPosibleDuplicado,
} from './faltantesInmuebles';

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

describe('celdaDelFaltanteInmueble — qué decía la celda', () => {
  it('un tipo que el catálogo no conoce se muestra tal cual', () => {
    expect(celdaDelFaltanteInmueble({ type: 'APTO' }, 'tipo')).toBe('APTO');
  });

  it('una fecha ilegible se muestra: es lo que hay que corregir en el Excel', () => {
    expect(
      celdaDelFaltanteInmueble({ consignedAt: '31/02/2025' }, 'fecha_consignacion'),
    ).toBe('31/02/2025');
  });

  it('un departamento mal escrito se muestra', () => {
    expect(celdaDelFaltanteInmueble({ department: 'Antioqia' }, 'departamento')).toBe(
      'Antioqia',
    );
  });

  it('una celda vacía no produce comillas vacías', () => {
    expect(celdaDelFaltanteInmueble({ type: '  ' }, 'tipo')).toBeNull();
    expect(celdaDelFaltanteInmueble(null, 'tipo')).toBeNull();
  });

  it('un faltante sin valor que explique nada no muestra nada', () => {
    // Un título vacío es un título vacío: no hay celda que citar.
    expect(celdaDelFaltanteInmueble({ title: '' }, 'titulo')).toBeNull();
  });

  it('una celda enorme se recorta', () => {
    const r = celdaDelFaltanteInmueble({ type: 'X'.repeat(300) }, 'tipo')!;
    expect(r).toHaveLength(61);
  });
});
