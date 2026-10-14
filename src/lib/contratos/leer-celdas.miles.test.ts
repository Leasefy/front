/**
 * 🔴 QA de Portofino (14-10-2026), Nico: «crea miles de casos de uso… que no
 * pasen cosas extrañas con números inventados… que para TODOS funcione».
 *
 * Banco generado (semilla fija: siempre los mismos casos) contra los lectores
 * de celdas de la migración. La regla es UNA: una celda se lee EXACTA o no se
 * lee (`undefined`, la fila pide el dato) — nunca otro valor.
 */
import { describe, expect, it } from 'vitest';

import { comoEntero, comoFecha, comoPorcentaje } from './leer-celdas';

function semilla(n: number) {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = semilla(20261014);
const entre = (min: number, max: number) => Math.floor(azar() * (max - min + 1)) + min;
const uno = <T,>(xs: readonly T[]): T => xs[entre(0, xs.length - 1)];
const N = 5000;

const conMiles = (n: number, sep: string) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

describe('🔴 miles de celdas de plata: exacta o ilegible, nunca otro número', () => {
  const formatos: Array<(n: number) => string> = [
    (n) => String(n),
    (n) => conMiles(n, '.'),
    (n) => conMiles(n, ','),
    (n) => `$ ${conMiles(n, '.')}`,
    (n) => `$${conMiles(n, ',')}.00`,
    (n) => `${conMiles(n, '.')},00`,
    (n) => `  ${conMiles(n, '.')}  `,
    (n) => `COP ${conMiles(n, '.')}`,
    (n) => `${n}.0`,
    (n) => `$ ${conMiles(n, '.')} COP`,
  ];
  it(`${N} celdas`, () => {
    const malas: string[] = [];
    for (let i = 0; i < N; i++) {
      const verdad = uno([entre(0, 999), entre(1_000, 999_999), entre(1_000_000, 2_000_000_000)]);
      const negativo = azar() < 0.1;
      let celda = uno(formatos)(verdad);
      if (negativo) celda = `${uno(['-', '−'])}${celda.trimStart()}`;
      const leido = comoEntero(celda);
      const esperado = negativo ? -verdad : verdad;
      if (leido !== undefined && leido !== esperado && !(verdad === 0 && leido === 0)) {
        malas.push(`«${celda}» → ${leido} (era ${esperado})`);
      }
    }
    expect(malas.slice(0, 10)).toEqual([]);
  });
});

describe('🔴 miles de fechas: el día que escribió el archivo o ninguna', () => {
  const dos = (n: number) => String(n).padStart(2, '0');
  it(`${N} celdas`, () => {
    const malas: string[] = [];
    for (let i = 0; i < N; i++) {
      const a = entre(1990, 2035);
      const m = entre(1, 12);
      const d = entre(1, 31);
      const existe = new Date(Date.UTC(a, m - 1, d)).getUTCDate() === d;
      const iso = `${a}-${dos(m)}-${dos(d)}`;
      const celda = uno([
        iso,
        `${iso} 00:00:00`,
        `${iso}T10:30:00`,
        `${dos(d)}/${dos(m)}/${a}`,
        `${d}/${m}/${a}`,
        `${dos(d)}-${dos(m)}-${a}`,
        `${dos(d)}.${dos(m)}.${a}`,
        `${dos(d)}/${dos(m)}/${a} 08:30`,
        `${a}/${dos(m)}/${dos(d)}`,
      ]);
      const leido = comoFecha(celda);
      if (existe ? leido !== iso && leido !== undefined : leido !== undefined) {
        malas.push(`«${celda}» → ${leido} (era ${existe ? iso : 'una fecha que no existe'})`);
      }
      if (existe && leido === undefined) malas.push(`«${celda}» no se leyó (era ${iso})`);
    }
    expect(malas.slice(0, 10)).toEqual([]);
  });
});

describe('🔴 miles de porcentajes: el mismo o ninguno', () => {
  it(`${N} celdas`, () => {
    const malas: string[] = [];
    for (let i = 0; i < N; i++) {
      const verdad = azar() < 0.5 ? entre(0, 100) : Math.round(azar() * 10000) / 100;
      const txt = String(verdad);
      const celda = uno([txt, `${txt}%`, `${txt} %`, txt.replace('.', ','), ` ${txt.replace('.', ',')} % `]);
      const leido = comoPorcentaje(celda);
      if (leido !== verdad) malas.push(`«${celda}» → ${leido} (era ${verdad})`);
    }
    for (const fuera of ['101', '-5', '150%', 'diez', '10%%x']) {
      const leido = comoPorcentaje(fuera);
      if (leido !== undefined) malas.push(`«${fuera}» → ${leido} (no es un porcentaje)`);
    }
    expect(malas.slice(0, 10)).toEqual([]);
  });
});
