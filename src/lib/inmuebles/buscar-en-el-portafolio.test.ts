/**
 * IN-09 (QA 04-10): «24» (el código), «Paula» (propietaria) y «Bello» (ciudad)
 * daban «Ningún resultado» porque el buscador sólo miraba título y dirección.
 */
import { describe, it, expect } from 'vitest';
import type { PortafolioRow } from '@/lib/types/inmobiliaria';
import { coincideConLaBusqueda, normalizarParaBuscar } from './buscar-en-el-portafolio';

const conMandato = {
  kind: 'consignacion',
  id: 'c1',
  propertyId: 'p1',
  propietarioId: 'prop-1',
  copropietarios: [
    { propietarioId: 'prop-1', participacionBps: 7000, propietario: { id: 'prop-1', name: 'Paula Restrepo' } },
    { propietarioId: 'prop-2', participacionBps: 3000 },
  ],
  agenteId: 'a1',
  propertyTitle: 'Calle 12 # 42-12 Apto 102',
  propertyAddress: 'Calle 12 # 42-12 Apto 102',
  propertyCity: 'Bello',
  propertyZone: 'Niquía',
  propertyType: 'apartment',
  monthlyRent: 1500000,
  listingType: 'rent',
  saleCommissionPercent: null,
  propertyCode: 24,
  propertyExternalId: 'PORT-0024',
  commissionPercent: 10,
  contractDate: '2026-01-01',
  status: 'active',
  availability: 'rented',
  inquilino: {
    contractId: 'k1',
    nombre: 'Andrés Gómez',
    documento: null,
    correo: null,
    telefono: null,
    cuentaDePortalId: null,
  },
} as unknown as PortafolioRow;

const sinMandato = {
  kind: 'sinMandato',
  propertyId: 'p2',
  propertyTitle: 'Bodega 7',
  propertyAddress: 'Carrera 50 # 10-20',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'warehouse',
  propertyThumbnail: null,
  monthlyRent: 3000000,
  adminFee: 0,
  status: 'draft',
  createdAt: '2026-10-01',
  department: 'Cundinamarca',
  code: 7,
} as unknown as PortafolioRow;

const nombres = { 'prop-2': 'Óscar Peláez' };

describe('coincideConLaBusqueda (IN-09)', () => {
  it('encuentra por el código, con y sin «#»', () => {
    expect(coincideConLaBusqueda(conMandato, '24', nombres)).toBe(true);
    expect(coincideConLaBusqueda(conMandato, '#24', nombres)).toBe(true);
    expect(coincideConLaBusqueda(conMandato, '# 24', nombres)).toBe(true);
    expect(coincideConLaBusqueda(sinMandato, '#7', nombres)).toBe(true);
    expect(coincideConLaBusqueda(sinMandato, '7', nombres)).toBe(true);
  });

  it('«#2» no trae el 24: con numeral el código es exacto', () => {
    expect(coincideConLaBusqueda(conMandato, '#2', nombres)).toBe(false);
    // «#12» tampoco calza con «Calle 12 # 42-12»: con numeral sólo cuenta el código.
    expect(coincideConLaBusqueda(conMandato, '#12', nombres)).toBe(false);
  });

  it('encuentra por el código propio de la inmobiliaria', () => {
    expect(coincideConLaBusqueda(conMandato, 'port-0024', nombres)).toBe(true);
  });

  it('encuentra por propietario (también el copropietario que sólo trae id) e inquilino', () => {
    expect(coincideConLaBusqueda(conMandato, 'Paula', nombres)).toBe(true);
    expect(coincideConLaBusqueda(conMandato, 'oscar', nombres)).toBe(true);
    expect(coincideConLaBusqueda(conMandato, 'andres gomez', nombres)).toBe(true);
  });

  it('encuentra por barrio, ciudad y departamento, sin importar tildes ni mayúsculas', () => {
    expect(coincideConLaBusqueda(conMandato, 'bello', nombres)).toBe(true);
    expect(coincideConLaBusqueda(conMandato, 'NIQUIA', nombres)).toBe(true);
    expect(coincideConLaBusqueda(sinMandato, 'bogota', nombres)).toBe(true);
    expect(coincideConLaBusqueda(sinMandato, 'cundinamarca', nombres)).toBe(true);
  });

  it('sigue encontrando por título y dirección', () => {
    expect(coincideConLaBusqueda(conMandato, 'calle 12', nombres)).toBe(true);
    expect(coincideConLaBusqueda(sinMandato, 'bodega', nombres)).toBe(true);
  });

  it('lo que no está, no sale; vacío deja todo', () => {
    expect(coincideConLaBusqueda(conMandato, 'Envigado', nombres)).toBe(false);
    expect(coincideConLaBusqueda(sinMandato, 'Paula', nombres)).toBe(false);
    expect(coincideConLaBusqueda(conMandato, '   ', nombres)).toBe(true);
  });

  it('normaliza tildes y mayúsculas', () => {
    expect(normalizarParaBuscar('  Medellín ÁREA ')).toBe('medellin area');
  });
});
