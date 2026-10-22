/**
 * Las pestañas por tarea de Propietarios (Nico, 22-10-2026): «Por girar · Por
 * completar · Con inmuebles · Todos». Cada pestaña es un trabajo; sus números
 * cuentan lo que verías al tocarla, con la búsqueda y el tipo puestos.
 */
import { describe, it, expect } from 'vitest';
import type { Propietario } from '@/lib/types/inmobiliaria';
import {
  FILTROS_INICIALES,
  conteosDeLasVistas,
  estaPorCompletar,
  filtrarPropietarios,
  hayFiltros,
  tieneInmuebles,
} from './filtrar-propietarios';

function propietario(over: Partial<Propietario> & { name: string }): Propietario {
  return {
    id: over.name,
    email: null,
    phone: null,
    documentType: 'CC',
    documentNumber: '1',
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as Propietario;
}

const ATRASADA = propietario({ name: 'Ana', pendingBalance: 900_000, propertyCount: 1 });
const SIN_CUENTA = propietario({ name: 'Beto', datosPendientes: ['cuentaBancaria'], propertyCount: 2 });
const SIN_PORCENTAJE = propietario({
  name: 'Carla',
  copropiedadesCount: 1,
  inmueblesSinPorcentaje: [{ id: 'i1' } as never],
});
const SIN_NADA = propietario({ name: 'Dora' });
const LISTA = [ATRASADA, SIN_CUENTA, SIN_PORCENTAJE, SIN_NADA];
const nombres = (l: Propietario[]) => l.map((p) => p.name);

describe('las pestañas por tarea', () => {
  it('«Por girar» son los que tienen un giro atrasado', () => {
    expect(nombres(filtrarPropietarios(LISTA, { ...FILTROS_INICIALES, vista: 'porGirar' }))).toEqual(['Ana']);
  });

  it('«Por completar» son los que tienen un dato pendiente o un inmueble sin su porcentaje', () => {
    expect(estaPorCompletar(SIN_CUENTA)).toBe(true);
    expect(estaPorCompletar(SIN_PORCENTAJE)).toBe(true);
    expect(estaPorCompletar(SIN_NADA)).toBe(false);
    expect(nombres(filtrarPropietarios(LISTA, { ...FILTROS_INICIALES, vista: 'porCompletar' }))).toEqual(['Beto', 'Carla']);
  });

  it('«Con inmuebles» cuenta los consignados como principal y en copropiedad', () => {
    expect(tieneInmuebles(SIN_PORCENTAJE)).toBe(true);
    expect(tieneInmuebles(SIN_NADA)).toBe(false);
    expect(nombres(filtrarPropietarios(LISTA, { ...FILTROS_INICIALES, vista: 'conInmuebles' }))).toEqual(['Ana', 'Beto', 'Carla']);
  });

  it('«Todos» y los filtros sin vista (armados a mano) no quitan a nadie', () => {
    expect(filtrarPropietarios(LISTA, FILTROS_INICIALES)).toHaveLength(4);
    const { vista: _sinVista, ...sinVista } = FILTROS_INICIALES;
    void _sinVista;
    expect(filtrarPropietarios(LISTA, sinVista)).toHaveLength(4);
  });

  it('los números cuentan lo que verías al tocarla, con la búsqueda puesta', () => {
    expect(conteosDeLasVistas(LISTA, FILTROS_INICIALES)).toEqual({ porGirar: 1, porCompletar: 2, conInmuebles: 3, todos: 4 });
    expect(conteosDeLasVistas(LISTA, { ...FILTROS_INICIALES, busqueda: 'beto', vista: 'porGirar' })).toEqual({
      porGirar: 0,
      porCompletar: 1,
      conInmuebles: 1,
      todos: 1,
    });
  });

  it('la pestaña no es un filtro: «Limpiar» no aparece por elegir una', () => {
    expect(hayFiltros({ ...FILTROS_INICIALES, vista: 'porGirar' })).toBe(false);
  });
});
