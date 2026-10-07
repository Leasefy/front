/**
 * QA-MIGRACION-95 (MP-07, 06-10-2026). El resumen de lectura de contratos
 * decía «4 filas traen el propietario sin cédula ni NIT…» de C10, un archivo
 * SIN columna de propietario (salidas/EN31.txt): afirmaba un dato que el
 * archivo no trae. Sin propietario en la fila, el back lo toma del mandato del
 * inmueble al cruzarlo (C10: «4 de 4 · quedaron con propietario»). Y con UNA
 * fila, «1 filas … traen» no es decirlo en palabras.
 */
import { describe, it, expect } from 'vitest';
import { mapearColumnas } from './columnas-de-contrato';
import { resumenDeLectura } from './vista-previa-de-migracion';

const base = (extra: Record<string, string>, i: number) => ({
  Inquilino: `Inquilina ${i}`,
  'Cédula inquilino': `103611122${i}`,
  'Código inmueble': `900${i}`,
  'Valor arriendo': '2500000',
  'Fecha inicio': '01/02/2026',
  'Fecha fin': '31/01/2027',
  ...extra,
});
const propietario = (r: ReturnType<typeof resumenDeLectura>) =>
  r.renglones.find((x) => x.que === 'Propietario con documento')!;

describe('el propietario en el resumen de lectura de contratos (MP-07)', () => {
  it('sin columna de propietario no dice que viene «sin cédula ni NIT»: dice que no la trae y de dónde sale', () => {
    const filas = [base({}, 1), base({}, 2), base({}, 3), base({}, 4)];
    const r = resumenDeLectura(filas, mapearColumnas(Object.keys(filas[0])));
    expect(propietario(r).con).toBe(0);
    expect(propietario(r).porque).not.toMatch(/sin cédula ni NIT/);
    expect(propietario(r).porque).toMatch(/no trae el propietario/);
    expect(propietario(r).porque).toMatch(/mandato/);
  });

  it('con el nombre y sin documento sí lo dice; la fila sin nada, aparte', () => {
    const filas = [
      base({ Propietario: 'Jorge Iván Restrepo', 'Cédula propietario': '' }, 1),
      base({ Propietario: '', 'Cédula propietario': '' }, 2),
      base({ Propietario: 'Ana Gómez', 'Cédula propietario': '43987654' }, 3),
    ];
    const r = resumenDeLectura(filas, mapearColumnas(Object.keys(filas[0])));
    expect(propietario(r).con).toBe(1);
    expect(propietario(r).porque).toMatch(/^1 fila trae el propietario sin cédula ni NIT/);
    expect(propietario(r).porque).toMatch(/1 fila no trae propietario/);
  });

  it('una sola fila sin el dato se dice en singular en los demás renglones', () => {
    const filas = [
      base({ Correo: 'a@x.co', Consecutivo: '501' }, 1),
      base({ Correo: '', Consecutivo: '', 'Cédula inquilino': '' }, 2),
    ];
    const r = resumenDeLectura(filas, mapearColumnas(Object.keys(filas[0])));
    const porque = (que: string) => r.renglones.find((x) => x.que === que)!.porque;
    expect(porque('Inquilino con documento')).toMatch(/^1 fila trae al inquilino sin documento\./);
    expect(porque('Inquilino con correo')).toMatch(/^1 fila no trae correo:/);
    expect(porque('Consecutivo del sistema anterior')).toMatch(/^1 fila no trae consecutivo:/);
  });
});
