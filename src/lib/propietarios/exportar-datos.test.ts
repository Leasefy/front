import { describe, expect, it } from 'vitest';
import type { Consignacion, Dispersion, Propietario } from '@/lib/types/inmobiliaria';
import { armarHojasDelPropietario, nombreDelArchivoDelPropietario } from './exportar-datos';

const propietario: Propietario = {
  id: 'p1',
  name: 'Nicolás García',
  email: 'n@tikin.op',
  phone: '3116778899',
  documentType: 'CC',
  documentNumber: '1036656397',
  bankAccount: { bank: 'falabella', accountType: 'savings', accountNumber: '12348989', accountHolder: 'NICOLAS' },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 2_000_000,
  pendingBalance: 0,
  createdAt: '2026-09-02T18:00:00.000Z',
  updatedAt: '2026-09-02T18:00:00.000Z',
};

const consignacion = {
  id: 'c1',
  propertyId: 'i1',
  propietarioId: 'p1',
  agenteId: 'a1',
  propertyTitle: 'Apto 501',
  propertyAddress: 'Cra 1 # 2-3',
  propertyCity: 'Medellín',
  propertyZone: 'Laureles',
  propertyType: 'apartment',
  monthlyRent: 2_000_000,
  listingType: 'rent',
  saleCommissionPercent: null,
  propertyCode: 125,
  commissionPercent: 10,
  contractDate: '2026-01-15T05:00:00.000Z',
  status: 'active',
  availability: 'rented',
  currentTenantName: 'Ana Pérez',
  createdAt: '2026-01-15',
  updatedAt: '2026-01-15',
} as Consignacion;

const dispersion = {
  id: 'd1',
  propietarioId: 'p1',
  propietarioName: 'Nicolás García',
  propietarioBankAccount: null,
  month: '2026-08',
  items: [
    {
      cobroId: 'co1',
      propertyTitle: 'Apto 501',
      rentCollected: 2_000_000,
      commissionPercent: 10,
      commissionAmount: 200_000,
      netAmount: 1_800_000,
      conceptosAFavor: 0,
      conceptosACargo: 0,
      deTerceros: 0,
    },
  ],
  totalCollected: 2_000_000,
  totalCommission: 200_000,
  totalConceptosAFavor: 0,
  totalConceptosACargo: 0,
  totalDeTerceros: 0,
  netToPropietario: 1_800_000,
  status: 'completed',
  transferReference: 'TRX-1',
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
} as Dispersion;

describe('armarHojasDelPropietario', () => {
  it('arma tres hojas con la ficha, los inmuebles y los giros', () => {
    const hojas = armarHojasDelPropietario(propietario, [consignacion], [dispersion]);
    expect(hojas.map((h) => h.nombre)).toEqual(['Propietario', 'Inmuebles', 'Giros']);

    const ficha = Object.fromEntries(hojas[0].filas.slice(1));
    expect(ficha['Nombre']).toBe('Nicolás García');
    expect(ficha['Banco']).toBe('Banco Falabella');
    expect(ficha['Tipo de cuenta']).toBe('Ahorros');
    expect(ficha['Número de cuenta']).toBe('12348989');

    const [encabezado, fila] = hojas[1].filas;
    expect(encabezado[0]).toBe('Código');
    expect(fila).toEqual([
      125, 'Apto 501', 'Cra 1 # 2-3', 'Medellín', 'Arriendo', 2_000_000, 10, '', 'Arrendado', 'Activo', 'Ana Pérez', '2026-01-15',
    ]);

    const [, giro] = hojas[2].filas;
    expect(giro).toEqual(['agosto de 2026', 'Apto 501', 2_000_000, 10, 200_000, 0, 0, 1_800_000, 'Girado', 'TRX-1']);
  });

  it('sin cuenta bancaria deja las celdas del banco vacías, y sin inmuebles ni giros quedan sólo los encabezados', () => {
    const sinCuenta = { ...propietario, bankAccount: { bank: '', accountType: '', accountNumber: '', accountHolder: '' } } as unknown as Propietario;
    const hojas = armarHojasDelPropietario(sinCuenta, [], []);
    const ficha = Object.fromEntries(hojas[0].filas.slice(1));
    expect(ficha['Banco']).toBe('');
    expect(ficha['Número de cuenta']).toBe('');
    expect(hojas[1].filas).toHaveLength(1);
    expect(hojas[2].filas).toHaveLength(1);
  });

  it('un mandato de venta no lleva canon ni comisión de arriendo', () => {
    const venta = { ...consignacion, listingType: 'sale', monthlyRent: null, commissionPercent: 0, saleCommissionPercent: 3 } as Consignacion;
    const [, fila] = armarHojasDelPropietario(propietario, [venta], [])[1].filas;
    expect(fila.slice(4, 8)).toEqual(['Venta', '', '', 3]);
  });
});

describe('nombreDelArchivoDelPropietario', () => {
  it('quita tildes y caracteres raros y fecha el archivo', () => {
    expect(nombreDelArchivoDelPropietario('Nicolás García Ardila', new Date('2026-09-02T12:00:00Z'))).toBe(
      'propietario-nicolas-garcia-ardila-2026-09-02.xlsx',
    );
  });
});
