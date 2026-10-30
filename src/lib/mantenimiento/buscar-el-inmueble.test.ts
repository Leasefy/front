import { describe, it, expect } from 'vitest';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { buscarElInmueble, type ContratoParaBuscar } from './buscar-el-inmueble';

function inmueble(o: Partial<Consignacion>): Consignacion {
  return {
    id: 'c',
    propertyId: 'p',
    propertyTitle: 'Apto',
    propertyAddress: 'Cra 1',
    propertyZone: '',
    propertyCity: 'Medellín',
    copropietarios: [],
    ...o,
  } as Consignacion;
}

const LAURELES = inmueble({
  id: 'c1',
  propertyId: 'p1',
  propertyCode: 24,
  propertyTitle: 'Apto 402 — Laureles',
  propertyAddress: 'Cra 76 #34-24',
  propertyExternalId: 'PF-0099',
  copropietarios: [
    {
      propietarioId: 'o1',
      participacionBps: 10000,
      propietario: { id: 'o1', name: 'Ana Gómez', documentNumber: '43123456', phone: '+57 300 111 2233' },
    },
  ],
  inquilino: { contractId: 'k1', nombre: 'Iván Ríos', documento: '1017000111', correo: null, telefono: null, cuentaDePortalId: null },
});
const ENVIGADO = inmueble({ id: 'c2', propertyId: 'p2', propertyCode: 240, propertyTitle: 'Casa 12 — Envigado', propertyAddress: 'Cl 40 Sur #25-10' });

const CONTRATOS: ContratoParaBuscar[] = [
  { id: 'k1', propertyId: 'p1', code: 1839, externalId: '1686', tenantName: 'Iván Ríos', tenantDocument: null, tenantEmail: null, tenantPhone: null, propertyAddress: null },
];

const ids = (r: ReturnType<typeof buscarElInmueble>) => r.map((x) => x.consignacion.id);

describe('buscarElInmueble — las alternativas del buscador del panel (Portofino 29-10)', () => {
  it('sin nada escrito, todos', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], '  '))).toEqual(['c1', 'c2']);
  });

  it('«#24» e «inmueble 24» son ESE código, no el 240 ni la dirección', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], '#24'))).toEqual(['c1']);
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], 'inmueble 24'))).toEqual(['c1']);
  });

  it('«240» suelto pone primero el código exacto', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], '240'))[0]).toBe('c2');
  });

  it('por el código de la inmobiliaria', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], 'pf-0099'))).toEqual(['c1']);
  });

  it('por el propietario, su documento o su celular escrito como sea', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], 'ana gomez'))).toEqual(['c1']);
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], '43123456'))).toEqual(['c1']);
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], '300-111-2233'))).toEqual(['c1']);
  });

  it('por el inquilino', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], 'ivan rios'))).toEqual(['c1']);
  });

  it('por el número del contrato (el de la inmobiliaria o el de Leasefy) y dice cuál', () => {
    const r = buscarElInmueble([LAURELES, ENVIGADO], '1686', CONTRATOS);
    expect(ids(r)).toEqual(['c1']);
    expect(r[0].contrato).toBe('1686');
    expect(buscarElInmueble([LAURELES, ENVIGADO], 'contrato 1839', CONTRATOS)[0].contrato).toBe('Leasefy #1839');
  });

  it('sin los contratos, busca igual por lo demás', () => {
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], '1686'))).toEqual([]);
    expect(ids(buscarElInmueble([LAURELES, ENVIGADO], 'envigado'))).toEqual(['c2']);
  });
});
