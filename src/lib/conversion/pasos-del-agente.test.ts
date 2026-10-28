import { describe, expect, it } from 'vitest';

import type { AgencyProfile } from '@/lib/types/inmobiliaria';
import type { MedioDePago } from '@/lib/api/medios-de-pago.types';
import {
  cuentaDelAgente,
  errorDeLaCedula,
  errorDeLaCuenta,
  errorDelCelular,
  errorDelCorreo,
  errorDelNit,
  errorDelNombre,
  nitDeLaCedula,
  pasosQueFaltan,
  tocaPedirLosPasos,
} from './pasos-del-agente';

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
    expect(cuentaDelAgente([medio({ tipo: 'NEQUI' })])).toBeNull();
    expect(cuentaDelAgente([medio({ activo: false })])).toBeNull();
    expect(cuentaDelAgente([medio({ numeroDeCuenta: '  ' })])).toBeNull();
    expect(cuentaDelAgente([medio({ tipo: 'EFECTIVO' }), medio({ id: 'm2' })])?.id).toBe('m2');
  });

  it('sólo se piden a la cuenta de agente, pagada, y a su administrador', () => {
    expect(tocaPedirLosPasos({ cuentaDeAgente: true, rol: 'ADMIN', estado: 'pagado' })).toBe(true);
    expect(tocaPedirLosPasos({ cuentaDeAgente: true, rol: 'ADMIN', estado: 'gratis' })).toBe(false);
    expect(tocaPedirLosPasos({ cuentaDeAgente: true, rol: 'ADMIN', estado: 'prueba' })).toBe(false);
    expect(tocaPedirLosPasos({ cuentaDeAgente: true, rol: 'AGENTE', estado: 'pagado' })).toBe(false);
    expect(tocaPedirLosPasos({ cuentaDeAgente: false, rol: 'ADMIN', estado: 'pagado' })).toBe(false);
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
