import { describe, expect, it } from 'vitest';

import type { CarteraDeInquilinos } from '@/lib/api/cartera.types';
import {
  armarFilasDeCartera,
  claveDeContrato,
  cruzarConLosContratos,
  filaParaElMicro,
  ponerVencimientoEscrito,
  resumenDeLaCartera,
} from '../cartera-del-archivo';

const MAPEO = {
  contrato: 'Contrato',
  documento: 'Documento Inquilino',
  nombre: 'Inquilino',
  deuda: 'Valor adeudado a la fecha',
  telefono: 'Contacto',
} as const;

function fila(n: number, contrato: unknown, documento: unknown, nombre: unknown, deuda: unknown, contacto: unknown) {
  return {
    _rowIndex: n,
    Contrato: contrato,
    'Documento Inquilino': documento,
    Inquilino: nombre,
    'Valor adeudado a la fecha': deuda,
    Contacto: contacto,
  };
}

describe('armar las filas del archivo', () => {
  it('lee las cinco columnas del cliente y no reporta faltantes', () => {
    const [f] = armarFilasDeCartera([fila(1, '101', '71234567', 'ANA MARIA RESTREPO', '2227182', '3001234567')], MAPEO);
    expect(f).toMatchObject({
      fila: 2,
      contrato: '101',
      documento: '71234567',
      nombre: 'ANA MARIA RESTREPO',
      deuda: 2227182,
      telefono: '3001234567',
      vencimiento: null,
      problemas: [],
    });
  });

  it('dice en español qué falta, fila por fila', () => {
    const filas = armarFilasDeCartera(
      [fila(1, '101', '', 'ANA', '1000', ''), fila(2, '102', '43111222', '', '1000', 'llamar después')],
      MAPEO,
    );
    expect(filas[0].problemas).toEqual(['Falta el documento', 'Falta el teléfono']);
    expect(filas[1].problemas).toEqual(['Falta el nombre', 'El teléfono «llamar después» no es un número de Colombia']);
  });

  it('dos teléfonos y un correo en «Contacto»', () => {
    const [f] = armarFilasDeCartera(
      [fila(1, '1', '71234567', 'Ana', '1', '300 123 4567 / 300 111 0002 · ana@correo.co')],
      MAPEO,
    );
    expect(f).toMatchObject({ telefono: '3001234567', telefono2: '3001110002', correo: 'ana@correo.co' });
  });

  it('se salta las filas vacías y la que repite los encabezados', () => {
    const filas = armarFilasDeCartera(
      [
        fila(1, '101', '71234567', 'Ana', '1', '3001234567'),
        fila(2, '', '', '', '', ''),
        fila(3, 'Contrato', 'Documento Inquilino', 'Inquilino', 'Valor adeudado a la fecha', 'Contacto'),
      ],
      MAPEO,
    );
    expect(filas).toHaveLength(1);
  });

  it('nombres y apellidos separados se juntan', () => {
    const [f] = armarFilasDeCartera(
      [{ _rowIndex: 1, Doc: '71234567', N: 'Ana María', A: 'Restrepo', Cel: '3001234567' }],
      { documento: 'Doc', nombres: 'N', apellidos: 'A', telefono: 'Cel' },
    );
    expect(f.nombre).toBe('Ana María Restrepo');
  });
});

function cartera(): Pick<CarteraDeInquilinos, 'inquilinos'> {
  const cuota = (contrato: string, vence: string, saldoCop: number, inmueble = 'Cra 1 # 2-3') =>
    ({ contrato, vence, saldoCop, inmueble }) as unknown as CarteraDeInquilinos['inquilinos'][number]['filas'][number];
  return {
    inquilinos: [
      {
        clave: 'a',
        nombre: 'Ana',
        documento: '71.234.567',
        telefono: null,
        contratos: [{ contractId: 'c1', contrato: '101', contratoDeLeasefy: 'Leasefy #9', inmueble: 'Cra 1 # 2-3' }],
        filas: [cuota('101', '2026-09-05', 0), cuota('101', '2026-10-05', 1350000), cuota('101', '2026-11-05', 1350000)],
        totales: {} as never,
      },
      {
        clave: 'b',
        nombre: 'Luz',
        documento: '43111222',
        telefono: null,
        contratos: [{ contractId: 'c2', contrato: '#55', inmueble: 'Calle 9 # 8-7' }],
        filas: [cuota('#55', '2026-08-20', 900000, 'Calle 9 # 8-7')],
        totales: {} as never,
      },
    ],
  };
}

describe('el vencimiento sale del contrato en Leasefy (Nico, 20-10)', () => {
  it('por contrato y documento: la cuota MÁS VIEJA con saldo (la pagada no cuenta)', () => {
    const filas = armarFilasDeCartera([fila(1, '101', '71234567', 'Ana', '2700000', '3001234567')], MAPEO);
    const r = cruzarConLosContratos(filas, cartera(), new Date('2026-10-20T12:00:00Z'));
    expect(r.filas[0]).toMatchObject({ vencimiento: '2026-10-05', origenDelVencimiento: 'contrato', inmueble: 'Cra 1 # 2-3' });
    expect(r).toMatchObject({ encontradas: 1, sinEncontrar: 0 });
  });

  it('una cuota que todavía no vence no es «desde cuándo debe»', () => {
    const filas = armarFilasDeCartera([fila(1, '101', '71234567', 'Ana', '1', '3001234567')], MAPEO);
    const r = cruzarConLosContratos(filas, cartera(), new Date('2026-09-30T12:00:00Z'));
    expect(r.filas[0].vencimiento).toBeNull();
    expect(r.sinEncontrar).toBe(1);
  });

  it('por el consecutivo de Leasefy o por «#55»', () => {
    expect(claveDeContrato('Leasefy #9')).toBe('9');
    expect(claveDeContrato('#0055')).toBe('55');
    const filas = armarFilasDeCartera([fila(1, '55', '43111222', 'Luz', '900000', '3157778899')], MAPEO);
    expect(cruzarConLosContratos(filas, cartera()).filas[0].vencimiento).toBe('2026-08-20');
  });

  it('sin contrato en el archivo, por el documento', () => {
    const filas = armarFilasDeCartera([fila(1, '', '43111222', 'Luz', '900000', '3157778899')], MAPEO);
    expect(cruzarConLosContratos(filas, cartera()).filas[0].vencimiento).toBe('2026-08-20');
  });

  it('un contrato que no es de ese documento no se toma', () => {
    const filas = armarFilasDeCartera([fila(1, '101', '99999999', 'Otra', '1', '3001234567')], MAPEO);
    const r = cruzarConLosContratos(filas, cartera());
    expect(r.filas[0].vencimiento).toBeNull();
    expect(r.sinEncontrar).toBe(1);
  });

  it('el vencimiento que trae el archivo manda', () => {
    const [f] = armarFilasDeCartera(
      [{ ...fila(1, '101', '71234567', 'Ana', '1', '3001234567'), Vence: '01/09/2026' }],
      { ...MAPEO, vencimiento: 'Vence' },
    );
    expect(f).toMatchObject({ vencimiento: '2026-09-01', origenDelVencimiento: 'archivo' });
    expect(cruzarConLosContratos([f], cartera()).filas[0].vencimiento).toBe('2026-09-01');
  });

  it('a los que no aparecen, la fecha que escribe la persona', () => {
    const filas = armarFilasDeCartera([fila(1, '7', '1', 'X Y', '1', '3001234567')], MAPEO);
    expect(ponerVencimientoEscrito(filas, '2026-10-01')[0]).toMatchObject({
      vencimiento: '2026-10-01',
      origenDelVencimiento: 'escrito',
    });
  });
});

describe('lo que viaja al micro y el resumen', () => {
  it('las claves que el micro ya conoce, sin vacíos', () => {
    const [f] = armarFilasDeCartera([fila(1, '101', '71234567', 'Ana', '2227182', '3001234567')], MAPEO);
    expect(filaParaElMicro({ ...f, vencimiento: '2026-10-05' })).toEqual({
      documento: '71234567',
      nombre: 'Ana',
      telefono: '3001234567',
      monto: 2227182,
      vencimiento: '2026-10-05',
      referencia: '101',
    });
  });

  it('cuenta las que se importan y las que entran a cobranza', () => {
    const filas = armarFilasDeCartera(
      [fila(1, '101', '71234567', 'Ana', '1000', '3001234567'), fila(2, '102', '', 'Sin doc', '1000', '3001234567')],
      MAPEO,
    );
    const conFecha = ponerVencimientoEscrito(filas.slice(0, 1), '2026-10-01').concat(filas.slice(1));
    expect(resumenDeLaCartera(conFecha)).toMatchObject({ total: 2, seImportan: 1, conProblemas: 1, entranACobranza: 1 });
  });
});
