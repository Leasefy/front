import { describe, expect, it } from 'vitest';

import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import type { MedioDePago } from '@/lib/api/medios-de-pago.types';
import {
  cuentaDondeRecibe,
  errorDeLaCedula,
  errorDeLaCuenta,
  errorDelCelular,
  errorDelCorreo,
  errorDelNit,
  errorDelNombre,
  nitDeLaCedula,
  pasosQueFaltan,
  quienSeActiva,
} from './pasos-para-activar';

const agencia = (extra: Partial<AgencyProfile> = {}) => ({ id: 'a1', name: 'Laura Gómez', ...extra }) as AgencyProfile;

const medio = (extra: Partial<MedioDePago> = {}): MedioDePago => ({
  id: 'm1',
  agencyId: 'a1',
  tipo: 'TRANSFERENCIA',
  nombre: 'Mi cuenta',
  instrucciones: null,
  banco: 'Bancolombia',
  tipoDeCuenta: 'AHORROS',
  numeroDeCuenta: '12345678901',
  titular: 'Laura Gómez',
  documentoTitular: '1020304050',
  enlace: null,
  visibleAlInquilino: true,
  activo: true,
  orden: 0,
  createdAt: '2026-10-27T00:00:00Z',
  updatedAt: '2026-10-27T00:00:00Z',
  ...extra,
});

describe('los tres pasos del agente', () => {
  it('a la cuenta recién pagada le faltan los tres', () => {
    expect(pasosQueFaltan(agencia(), [])).toEqual(['datos', 'cuenta', 'factura']);
  });

  it('con sus datos, una cuenta y lo de la factura, no falta nada', () => {
    const a = agencia({
      legalRepresentative: 'Laura Gómez',
      legalDocumentNumber: '1020304050',
      phone: '3001234567',
      nit: '1020304050-7',
      razonSocial: 'Laura Gómez',
      email: 'laura@correo.co',
      address: 'Cra 43A # 1-50',
      city: 'Medellín',
      responsableIva: false,
    });
    expect(pasosQueFaltan(a, [medio()])).toEqual([]);
  });

  it('el IVA sin declarar (null) deja pendiente la factura; «no» cuenta como respuesta', () => {
    const base = { nit: '1', razonSocial: 'x', email: 'x', address: 'x', city: 'x' };
    expect(pasosQueFaltan(agencia({ ...base, responsableIva: null }), [medio()])).toContain('factura');
    expect(pasosQueFaltan(agencia({ ...base, responsableIva: false }), [medio()])).not.toContain('factura');
  });

  it('la cuenta es una TRANSFERENCIA activa con número; Nequi, apagada o sin número no cuentan', () => {
    expect(cuentaDondeRecibe([medio({ tipo: 'NEQUI' })])).toBeNull();
    expect(cuentaDondeRecibe([medio({ activo: false })])).toBeNull();
    expect(cuentaDondeRecibe([medio({ numeroDeCuenta: '  ' })])).toBeNull();
    expect(cuentaDondeRecibe([medio({ tipo: 'EFECTIVO' }), medio({ id: 'm2' })])?.id).toBe('m2');
  });

  it('a la inmobiliaria le pide también la razón social; con la cuenta en modo comercial la factura no está lista', () => {
    const a = agencia({ legalRepresentative: 'Laura Gómez', legalDocumentNumber: '1020304050', phone: '3001234567' });
    expect(pasosQueFaltan(a, [medio()], 'inmobiliaria')).toContain('datos');
    expect(pasosQueFaltan({ ...a, razonSocial: 'Arriendos S.A.S.' } as AgencyProfile, [medio()], 'inmobiliaria')).not.toContain('datos');
    const facturaLista = { nit: '900123456-8', email: 'x@y.co', address: 'x', city: 'y', responsableIva: true };
    expect(pasosQueFaltan(agencia(facturaLista), [medio()], 'agente', true)).toContain('factura');
    expect(pasosQueFaltan(agencia(facturaLista), [medio()], 'agente', false)).not.toContain('factura');
  });

  it('se abre sola sólo al pagar; a pedido también en el mes gratis del aliado; sólo al administrador', () => {
    expect(quienSeActiva({ cuentaDeAgente: true, rol: 'ADMIN', estado: 'pagado' })).toBe('agente');
    expect(quienSeActiva({ vinoDelMarketplace: true, rol: 'ADMIN', estado: 'pagado' })).toBe('inmobiliaria');
    expect(quienSeActiva({ vinoDelMarketplace: true, rol: 'ADMIN', estado: 'prueba' })).toBeNull();
    expect(quienSeActiva({ vinoDelMarketplace: true, rol: 'ADMIN', estado: 'prueba' }, 'aPedido')).toBe('inmobiliaria');
    expect(quienSeActiva({ cuentaDeAgente: true, rol: 'ADMIN', estado: 'gratis' }, 'aPedido')).toBeNull();
    expect(quienSeActiva({ cuentaDeAgente: true, rol: 'AGENTE', estado: 'pagado' })).toBeNull();
    // La inmobiliaria de siempre (no vino del marketplace) ya se registró con el asistente: nada que activar.
    expect(quienSeActiva({ rol: 'ADMIN', estado: 'pagado' })).toBeNull();
  });
});

describe('validaciones del agente', () => {
  it('cédula de 6 a 10 dígitos, aunque la escriba con puntos', () => {
    expect(errorDeLaCedula('1.020.304.050')).toBeNull();
    expect(errorDeLaCedula('12345')).toMatch(/entre 6 y 10/);
    expect(errorDeLaCedula('')).toMatch(/Escribe/);
  });

  it('celular de 10 dígitos que empieza por 3', () => {
    expect(errorDelCelular('300 123 4567')).toBeNull();
    expect(errorDelCelular('6041234567')).toMatch(/empieza por 3/);
  });

  it('nombre y apellido', () => {
    expect(errorDelNombre('Laura')).toMatch(/apellido/);
    expect(errorDelNombre(' Laura  Gómez ')).toBeNull();
  });

  it('el NIT como lo pide el back', () => {
    expect(errorDelNit('1020304050-7')).toBeNull();
    expect(errorDelNit('1020304050')).toBeNull();
    expect(errorDelNit('10.203.040.50')).not.toBeNull();
  });

  it('correo y número de cuenta', () => {
    expect(errorDelCorreo('laura@correo.co')).toBeNull();
    expect(errorDelCorreo('laura@correo')).not.toBeNull();
    expect(errorDeLaCuenta('123-456789-01')).toBeNull();
    expect(errorDeLaCuenta('123')).not.toBeNull();
  });

  it('el NIT de la persona natural es su cédula con el dígito de la DIAN', () => {
    // 900.123.456 → DV 8 (ejemplo de la DIAN usado en todo Leasefy).
    expect(nitDeLaCedula('900123456')).toBe('900123456-8');
    expect(nitDeLaCedula('123')).toBe('');
  });
});
