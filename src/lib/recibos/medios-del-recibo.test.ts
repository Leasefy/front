import { describe, expect, it } from 'vitest';

import type { MediosDelRecibo } from '@/lib/api/recibos-de-caja.types';
import type { MediosDeRecibo } from '@/lib/api/finanzas.types';
import { desdeElBack, EFECTIVO_APAGADO_POR_DEFECTO, sinElEndpoint } from './medios-del-recibo';

/**
 * PG-01 (QA de Pagos, 03-10-2026). Nico, mirando «¿Por dónde entró?» con dos
 * cuentas configuradas: «aquí puede ser en efectivo también no? y más
 * opciones». El recibo ofrecía SÓLO las cuentas.
 */

const CATALOGO_DEL_BACK = (apagados: string[] = ['EFECTIVO', 'CHEQUE']): MediosDelRecibo['medios'] =>
  [
    ['TRANSFERENCIA', 'Transferencia bancaria', 'TRANSFERENCIA', true],
    ['PSE', 'PSE', 'PASARELA', false],
    ['ENLACE_DE_PAGO', 'Enlace de pago', 'PASARELA', false],
    ['TARJETA', 'Tarjeta', 'PASARELA', false],
    ['NEQUI', 'Nequi', 'TRANSFERENCIA', true],
    ['DAVIPLATA', 'Daviplata', 'TRANSFERENCIA', true],
    ['EFECTIVO', 'Efectivo', 'CAJA', false],
    ['CHEQUE', 'Cheque', 'CAJA', false],
    ['CONSIGNACION', 'Consignación en banco', 'TRANSFERENCIA', true],
    ['OTRO', 'Otro', 'OTRO', false],
  ].map(([medio, nombre, familia, llevaCuenta]) => {
    const habilitado = !apagados.includes(medio as string);
    return {
      medio: medio as string,
      nombre: nombre as string,
      familia: familia as MediosDelRecibo['medios'][number]['familia'],
      habilitado,
      llevaCuenta: llevaCuenta as boolean,
      porQueNo: habilitado
        ? null
        : `Esta inmobiliaria no recibe pagos por ${(nombre as string).toLowerCase()}: ese medio está apagado. Si quieres recibirlo, préndelo en Configuración → Medios de recibo.`,
    };
  });

const DOS_CUENTAS: MediosDelRecibo['cuentas'] = [
  {
    id: 'm1',
    nombre: 'Bancolombia ahorros recaudo',
    tipo: 'TRANSFERENCIA',
    banco: 'Bancolombia',
    cuenta: '•••• 8912',
    habilitado: true,
    porQueNo: null,
  },
  {
    id: 'm2',
    nombre: 'Davivienda corriente pagos',
    tipo: 'TRANSFERENCIA',
    banco: 'Davivienda',
    cuenta: '•••• 0022',
    habilitado: true,
    porQueNo: null,
  },
];

const codigos = (r: ReturnType<typeof desdeElBack>) => r.opciones.map((o) => o.codigo);

describe('«¿Por dónde entró?» con el endpoint del recibo', () => {
  it('🔴 las cuentas MÁS los otros medios habilitados (antes: sólo las dos cuentas)', () => {
    const r = desdeElBack({ medios: CATALOGO_DEL_BACK(), cuentas: DOS_CUENTAS });
    expect(r.opciones.filter((o) => o.grupo === 'CUENTA').map((o) => o.etiqueta)).toEqual([
      'Bancolombia ahorros recaudo',
      'Davivienda corriente pagos',
    ]);
    expect(r.opciones.find((o) => o.etiqueta === 'Bancolombia ahorros recaudo')?.detalle).toBe('•••• 8912');
    // Lo demás que la inmobiliaria tiene prendido.
    expect(codigos(r)).toEqual(
      expect.arrayContaining(['TARJETA', 'PSE', 'ENLACE_DE_PAGO', 'NEQUI', 'DAVIPLATA', 'OTRO']),
    );
    // Las cuentas ya dicen a cuál entró una transferencia o una consignación.
    expect(r.opciones.filter((o) => o.grupo === 'OTRO').map((o) => o.codigo)).not.toContain('TRANSFERENCIA');
    expect(codigos(r)).not.toContain('CONSIGNACION');
  });

  it('🔴 Nico: el efectivo NO sale con el interruptor apagado, y se dice dónde prenderlo', () => {
    const r = desdeElBack({ medios: CATALOGO_DEL_BACK(), cuentas: DOS_CUENTAS });
    expect(codigos(r)).not.toContain('EFECTIVO');
    expect(codigos(r)).not.toContain('CHEQUE');
    expect(r.efectivoApagado).toContain('Medios de recibo');
  });

  it('con el efectivo prendido sale, y no hay línea de «dónde prenderlo»', () => {
    const r = desdeElBack({ medios: CATALOGO_DEL_BACK([]), cuentas: DOS_CUENTAS });
    expect(codigos(r)).toContain('EFECTIVO');
    expect(codigos(r)).toContain('CHEQUE');
    expect(r.efectivoApagado).toBeNull();
  });

  it('una cuenta de un tipo apagado no se ofrece («Caja de la oficina» con el efectivo apagado)', () => {
    const r = desdeElBack({
      medios: CATALOGO_DEL_BACK(),
      cuentas: [
        ...DOS_CUENTAS,
        { id: 'm3', nombre: 'Caja de la oficina', tipo: 'EFECTIVO', banco: null, cuenta: null, habilitado: false, porQueNo: 'x' },
      ],
    });
    expect(r.opciones.map((o) => o.etiqueta)).not.toContain('Caja de la oficina');
  });

  it('sin cuentas configuradas, la transferencia y la consignación salen del catálogo', () => {
    const r = desdeElBack({ medios: CATALOGO_DEL_BACK(), cuentas: [] });
    expect(codigos(r)).toEqual(expect.arrayContaining(['TRANSFERENCIA', 'CONSIGNACION']));
  });

  it('lo que viaja es el TIPO; el nombre de la cuenta va a las notas, recortado a 40', () => {
    const largo = 'Transferencia a la cuenta de ahorros número dos de Bancolombia';
    const r = desdeElBack({
      medios: CATALOGO_DEL_BACK(),
      cuentas: [{ ...DOS_CUENTAS[0]!, nombre: largo }],
    });
    const cuenta = r.opciones.find((o) => o.grupo === 'CUENTA')!;
    expect(cuenta.codigo).toBe('TRANSFERENCIA');
    expect(cuenta.nombre).toBe(largo.slice(0, 40));
  });
});

describe('«¿Por dónde entró?» con un back anterior (sin el endpoint)', () => {
  const catalogo = (apagados: string[]): MediosDeRecibo => ({
    medios: CATALOGO_DEL_BACK(apagados).map(({ medio, nombre, familia, habilitado }) => ({
      medio,
      nombre,
      familia,
      habilitado,
    })),
    apagados,
    esElPreset: false,
  });

  it('las cuentas activas MÁS el catálogo prendido de Configuración', () => {
    const r = sinElEndpoint(
      [
        { id: 'm1', nombre: 'Bancolombia ahorros recaudo', tipo: 'TRANSFERENCIA', activo: true, banco: 'Bancolombia', numeroDeCuenta: '20345678912' },
        { id: 'm9', nombre: 'Cuenta vieja', tipo: 'TRANSFERENCIA', activo: false },
      ],
      catalogo(['EFECTIVO', 'CHEQUE']),
    );
    expect(r.opciones[0]).toMatchObject({ etiqueta: 'Bancolombia ahorros recaudo', detalle: '•••• 8912' });
    expect(r.opciones.map((o) => o.etiqueta)).not.toContain('Cuenta vieja');
    expect(codigos(r)).toEqual(expect.arrayContaining(['TARJETA', 'PSE', 'NEQUI']));
    expect(codigos(r)).not.toContain('EFECTIVO');
    expect(r.efectivoApagado).toBe(EFECTIVO_APAGADO_POR_DEFECTO);
  });

  it('sin poder leer Configuración falla ABIERTO con la lista fija y sus valores de siempre', () => {
    const r = sinElEndpoint([], null);
    expect(codigos(r)).toEqual(['transferencia', 'efectivo', 'tarjeta', 'pse', 'cheque', 'otro']);
    expect(r.efectivoApagado).toBeNull();
  });
});
