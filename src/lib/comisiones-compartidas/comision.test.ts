import { describe, expect, it } from 'vitest';

import type { ComisionCompartida } from '@/lib/api/comisiones-compartidas.service';
import { estadoDeLaComision, filtrarComisiones, porResponder, precioDelInmueble, repartoParaQuienMira } from './comision';

const comision = (o: Partial<ComisionCompartida>): ComisionCompartida => ({
  id: 'c1',
  lado: 'trae',
  estado: 'propuesta',
  porcentajeCapta: 60,
  tuParte: 40,
  suParte: 60,
  nota: null,
  motivo: null,
  acciones: [],
  creadaEn: '2026-10-28T15:00:00Z',
  editadaEn: null,
  respondidaEn: null,
  retiradaEn: null,
  quienPropone: null,
  quienResponde: null,
  inmueble: { id: 'p1', titulo: 'Apartamento en Laureles', barrio: 'Laureles', ciudad: 'Medellín', canon: 2_500_000, venta: null, foto: null, disponible: true, codigo: null },
  otra: { id: 'a2', nombre: 'Inmobiliaria Nogal', logo: null, ciudad: 'Medellín' },
  ...o,
});

describe('Comisión compartida: lo que dice la pantalla', () => {
  it('la propuesta se lee distinto según el lado: «Por responder» para quien la recibe', () => {
    expect(estadoDeLaComision({ estado: 'propuesta', lado: 'trae' })).toEqual({ texto: 'Por responder', tono: 'warning' });
    expect(estadoDeLaComision({ estado: 'propuesta', lado: 'capta' })).toEqual({ texto: 'Esperando respuesta', tono: 'info' });
    expect(estadoDeLaComision({ estado: 'aceptada', lado: 'capta' }).texto).toBe('Aceptada');
    expect(estadoDeLaComision({ estado: 'rechazada', lado: 'trae' }).texto).toBe('No aceptada');
    expect(estadoDeLaComision({ estado: 'retirada', lado: 'trae' }).texto).toBe('Retirada');
  });

  it('filtra por lado, estado y lo buscado (sin tildes, también por la otra inmobiliaria)', () => {
    const lista = [
      comision({ id: 'a' }),
      comision({ id: 'b', estado: 'aceptada' }),
      comision({ id: 'c', lado: 'capta', otra: { id: 'x', nombre: 'Rivera Inmobiliaria', logo: null, ciudad: null } }),
      comision({ id: 'd', estado: 'retirada', inmueble: { ...comision({}).inmueble, titulo: 'Casa en Envigado', barrio: 'Zúñiga' } }),
    ];
    expect(filtrarComisiones(lista, { lado: 'trae', buscar: '', estado: 'todas' }).map((c) => c.id)).toEqual(['a', 'b', 'd']);
    expect(filtrarComisiones(lista, { lado: 'trae', buscar: '', estado: 'por-responder' }).map((c) => c.id)).toEqual(['a']);
    expect(filtrarComisiones(lista, { lado: 'trae', buscar: '', estado: 'cerradas' }).map((c) => c.id)).toEqual(['d']);
    expect(filtrarComisiones(lista, { lado: 'trae', buscar: 'zuniga', estado: 'todas' }).map((c) => c.id)).toEqual(['d']);
    expect(filtrarComisiones(lista, { lado: 'capta', buscar: 'rivera', estado: 'todas' }).map((c) => c.id)).toEqual(['c']);
    expect(porResponder(lista)).toBe(1);
  });

  it('el reparto se dice con lo de quien mira primero, y el precio con el espacio duro de la plata', () => {
    expect(repartoParaQuienMira(40, 'Nogal')).toBe('Tú 40 % · Nogal 60 %');
    expect(precioDelInmueble({ canon: 2_500_000, venta: null })).toBe('$ 2.500.000 al mes');
    expect(precioDelInmueble({ canon: null, venta: 450_000_000 })).toBe('$ 450.000.000');
    expect(precioDelInmueble({ canon: null, venta: null })).toBeNull();
  });
});
