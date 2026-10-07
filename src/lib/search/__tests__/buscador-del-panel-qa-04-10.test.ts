import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/api/client', () => ({ getAccessToken: () => 'jwt' }));
vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'http://back.test');

import type { BackendContract } from '@/lib/api/contracts.types';
import type { AgencyProperty } from '@/lib/types/property';
import { numeroDeLaConsulta, telefonoDeLaConsulta, esElMismoTelefono } from '../consulta-del-buscador';
import { matchesQuery as contratoCoincide } from '../sources/contratos-source';
import { matchesQuery as inmuebleCoincide, estadoEnPalabras } from '../sources/propiedades-source';
import { etiquetaDeLaEtapa, etiquetaDelCanal } from '../sources/debtors-source';
import { accionesDelRol } from '../acciones-rapidas-por-rol';
import { auditEventLabel } from '../audit-event-labels';

/**
 * QA del buscador del panel (04-10-2026): BU-01, BU-03, BU-05, BU-08, BU-09 y
 * BU-12. Cada bloque falla con el código de antes.
 */

const contrato = (p: Partial<BackendContract>) =>
  ({ id: 'c', code: 3, externalId: null, tenantName: 'Iván Inquilino Pérez Gómez', propertyAddress: 'Calle 45 # 70-12 Apto 301', tenantDocument: '1037111222', tenantEmail: 'inquilino@example.test', tenantPhone: '+573001112233', ...p }) as BackendContract;
const inmueble = (p: Partial<AgencyProperty>) =>
  ({ id: 'i', code: 24, title: 'Apartamento', address: 'Calle 10 # 40-10', city: 'Medellín', neighborhood: null, status: 'RENTED', ...p }) as unknown as AgencyProperty;

describe('BU-01: el código con «#» y con la palabra', () => {
  it('«#24», «# 24», «24», «inmueble 24» son el 24; «Contrato 3» y «#3» son el 3', () => {
    expect(numeroDeLaConsulta('#24')).toBe('24');
    expect(numeroDeLaConsulta('# 24')).toBe('24');
    expect(numeroDeLaConsulta('Inmueble 24', ['inmueble'])).toBe('24');
    expect(numeroDeLaConsulta('Contrato 3', ['contrato'])).toBe('3');
    expect(numeroDeLaConsulta('contrato #3', ['contrato'])).toBe('3');
    expect(numeroDeLaConsulta('Calle 45', ['contrato'])).toBeNull();
  });

  it('el inmueble #24 se encuentra con «#24» y con «#1» no sale el 24', () => {
    expect(inmuebleCoincide(inmueble({}), '#24')).toBe(true);
    expect(inmuebleCoincide(inmueble({}), '#1')).toBe(false);
    expect(inmuebleCoincide(inmueble({ code: 1 }), '#1')).toBe(true);
  });

  it('el contrato 3 con «Contrato 3» y «#3», pero no el 13 ni el 30', () => {
    expect(contratoCoincide(contrato({}), 'Contrato 3')).toBe(true);
    expect(contratoCoincide(contrato({}), '#3')).toBe(true);
    expect(contratoCoincide(contrato({ code: 13 }), '#3')).toBe(false);
    expect(contratoCoincide(contrato({ code: 30 }), 'Contrato 3')).toBe(false);
  });
});

describe('BU-09: el contrato por el celular del inquilino, escrito como sea', () => {
  it('«3001112233», «+57 300 111 2233» y «300-111-2233» encuentran el contrato de Iván', () => {
    for (const q of ['3001112233', '+57 300 111 2233', '300-111-2233']) {
      expect(contratoCoincide(contrato({}), q)).toBe(true);
    }
    expect(contratoCoincide(contrato({ tenantPhone: '3109998877' }), '3001112233')).toBe(false);
  });

  it('un número corto o con letras no es un teléfono', () => {
    expect(telefonoDeLaConsulta('24')).toBeNull();
    expect(telefonoDeLaConsulta('Calle 45')).toBeNull();
    expect(esElMismoTelefono('+57 300 111 2233', '3001112233')).toBe(true);
  });
});

describe('BU-08: nada técnico en los resultados', () => {
  it('«RENTED» y «AVAILABLE» se dicen en español; lo desconocido no sale', () => {
    expect(estadoEnPalabras('RENTED')).toBe('Arrendado');
    expect(estadoEnPalabras('available')).toBe('Disponible');
    expect(estadoEnPalabras('WEIRD_STATE')).toBeNull();
  });

  it('«S0 mixed» del deudor → «Al día» y sin canal', () => {
    expect(etiquetaDeLaEtapa('S0')).toBe('Al día');
    expect(etiquetaDeLaEtapa('S1')).toBe('Mora temprana');
    expect(etiquetaDelCanal('mixed')).toBeNull();
    expect(etiquetaDelCanal('whatsapp')).toBe('WhatsApp');
  });

  it('Novedades: «pricing_config.update» no sale como «Pricing config update»', () => {
    expect(auditEventLabel('pricing_config.update', 'es')).toBe('Leasefy cambió el modelo de cobro de tu plan');
  });
});

describe('BU-12: acciones rápidas según el rol', () => {
  it('contador: Facturación, Contabilidad, Conciliación', () => {
    expect(accionesDelRol(false, 'CONTADOR')).toEqual(['qa-facturacion', 'qa-contabilidad', 'qa-conciliacion']);
  });
  it('asesora: lo comercial, sin Cobranza ni Reportes', () => {
    const a = accionesDelRol(false, 'AGENTE');
    expect(a).toContain('qa-nueva-consignacion');
    expect(a).not.toContain('qa-cobranza');
    expect(a).not.toContain('qa-reportes');
  });
  it('administrador: lo de hoy', () => {
    expect(accionesDelRol(true, 'ADMIN')).toEqual([
      'qa-nueva-consignacion',
      'qa-cobranza',
      'qa-cotizador',
      'qa-reportes',
      'qa-portafolio',
    ]);
  });
});

describe('BU-07: PQRS, mantenimientos, proveedores y facturas desde el back, en UNA petición', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    const { olvidarLasBusquedasDelPanel } = await import('../sources/operacion-source');
    olvidarLasBusquedasDelPanel();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        resultados: [
          { tipo: 'pqrs', id: 'p4', titulo: 'PQRS-0004 · Cobro doble', detalle: 'Reclamo · Resuelta', href: '/panel/inmobiliaria/solicitudes?pqrs=p4' },
          { tipo: 'factura', id: 'f9', titulo: 'Factura LABQA-9', detalle: 'Natalia · $ 2.000.000', href: '/panel/inmobiliaria/facturacion' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('cada fuente toma lo suyo y se pide una sola vez', async () => {
    const { pqrsSource, facturasSource, mantenimientosSource } = await import('../sources/operacion-source');
    const signal = new AbortController().signal;
    const [p, f, m] = await Promise.all([
      pqrsSource.run('PQRS-0004', { agencyId: 'a' }, signal),
      facturasSource.run('PQRS-0004', { agencyId: 'a' }, signal),
      mantenimientosSource.run('PQRS-0004', { agencyId: 'a' }, signal),
    ]);
    expect(p.map((r) => r.title)).toEqual(['PQRS-0004 · Cobro doble']);
    expect(p[0].href).toBe('/panel/inmobiliaria/solicitudes?pqrs=p4');
    expect(f.map((r) => r.title)).toEqual(['Factura LABQA-9']);
    expect(m).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://back.test/inmobiliaria/busqueda?q=PQRS-0004');
  });
});
