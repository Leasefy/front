/**
 * La exógena: qué bloquea, qué avisa y qué se puede aprobar.
 *
 * 🔴 Lo que más se cuida acá es que NO haya forma de aprobar un formato con
 * bloqueos. El back devuelve 409 `EXOGENA_CON_BLOQUEOS` y esa es la autoridad,
 * pero una pantalla que ofrece el botón y después muestra el error enseña a
 * insistir. `sePuedeAprobar` devuelve `false` con el bloqueo TEXTUAL del back
 * como motivo — el que trae el número de movimientos y la plata.
 */

import { describe, it, expect } from 'vitest';

import {
  aniosDeExogena,
  avisoDelPreset,
  conceptosDelPreset,
  cuentasSinConceptoQueImportan,
  formatosBloqueados,
  formatosConFilas,
  formatosSinVistoBueno,
  frasesDeCuantiasMenores,
  nombreDelArchivoDeExogena,
  sePuedeAprobar,
  totalesDelAnio,
} from './exogena';
import type {
  ConceptosDeExogena,
  ResumenDeExogena,
  ResumenDeFormato,
} from '@/lib/api/exogena.service';

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

const formato = (extra: Partial<ResumenDeFormato> = {}): ResumenDeFormato => ({
  formato: '1001',
  nombre: 'Pagos y abonos en cuenta y retenciones practicadas',
  filas: 128,
  totalCop: 740_000_000,
  estado: 'GENERADA',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  observaciones: null,
  bloqueos: [],
  avisos: [],
  necesitaContador: true,
  ...extra,
});

const resumen = (formatos: ResumenDeFormato[]): ResumenDeExogena => ({
  anio: 2026,
  formatos,
  disponible: true,
  cuantiasMenores: { activa: false, topeCop: 1_000_000, nit: '222222222', filas: 0 },
});

const conceptos = (extra: Partial<ConceptosDeExogena> = {}): ConceptosDeExogena => ({
  anio: 2026,
  disponible: true,
  conceptos: [
    {
      cuentaId: 'c1',
      codigo: '513595',
      nombre: 'Otros servicios',
      formato: '1001',
      concepto: '5008',
      fuente: 'PRESET',
    },
    {
      cuentaId: 'c2',
      codigo: '511580',
      nombre: 'Gravamen financiero',
      formato: '1001',
      concepto: '5016',
      fuente: 'AGENCIA',
    },
  ],
  sinConcepto: [{ cuentaId: 'c3', codigo: '519595', movimientosCop: 3_400_000 }],
  avisoLegal:
    'Los códigos de concepto los fija la resolución de la DIAN de cada año y cambian.',
  ...extra,
});

describe('los grupos de formatos', () => {
  it('separa los bloqueados de los limpios', () => {
    const r = resumen([
      formato({ formato: '1001', bloqueos: ['12 movimientos sin tercero.'] }),
      formato({ formato: '1007', bloqueos: [] }),
    ]);
    expect(formatosBloqueados(r).map((f) => f.formato)).toEqual(['1001']);
  });

  it('un formato con avisos pero sin bloqueos no cuenta como bloqueado', () => {
    const r = resumen([formato({ avisos: ['3 cuentas sin concepto.'], bloqueos: [] })]);
    expect(formatosBloqueados(r)).toEqual([]);
  });

  it('lista los que todavía no tienen visto bueno, incluidos los anulados', () => {
    const r = resumen([
      formato({ formato: '1001', estado: 'APROBADA' }),
      formato({ formato: '1007', estado: 'GENERADA' }),
      formato({ formato: '1009', estado: 'ANULADA' }),
    ]);
    expect(formatosSinVistoBueno(r).map((f) => f.formato)).toEqual(['1007', '1009']);
  });

  it('los formatos vacíos se pueden separar: no se presentan', () => {
    const r = resumen([formato({ formato: '1001', filas: 12 }), formato({ formato: '1003', filas: 0 })]);
    expect(formatosConFilas(r).map((f) => f.formato)).toEqual(['1001']);
  });
});

describe('🔴 sePuedeAprobar', () => {
  it('un formato limpio con filas se puede aprobar', () => {
    expect(sePuedeAprobar(formato(), true)).toEqual({ puede: true, motivo: null });
  });

  it('con bloqueos NO, y el motivo es el bloqueo TEXTUAL del back', () => {
    const bloqueo = '12 movimientos por $4.300.000 no tienen tercero: la exógena no se puede presentar así.';
    const permiso = sePuedeAprobar(formato({ bloqueos: [bloqueo] }), true);
    expect(permiso.puede).toBe(false);
    expect(permiso.motivo).toBe(bloqueo);
  });

  it('un formato vacío no se aprueba: sería constancia de nada', () => {
    const permiso = sePuedeAprobar(formato({ filas: 0 }), true);
    expect(permiso.puede).toBe(false);
    expect(permiso.motivo).toContain('no tiene filas');
  });

  it('el ya aprobado no se vuelve a aprobar', () => {
    const permiso = sePuedeAprobar(formato({ estado: 'APROBADA' }), true);
    expect(permiso.puede).toBe(false);
    expect(permiso.motivo).toContain('ya tiene el visto bueno');
  });

  it('sin la migración 52 no se aprueba, pero se dice que igual se descarga', () => {
    const permiso = sePuedeAprobar(formato(), false);
    expect(permiso.puede).toBe(false);
    expect(permiso.motivo).toContain('se calcula y se descarga igual');
  });

  it('el bloqueo manda sobre el «ya aprobado» sólo si no está aprobado', () => {
    // Orden: aprobado gana, porque un formato aprobado que después junta
    // bloqueos ya tiene su constancia y lo que toca es anularlo, no aprobarlo.
    const permiso = sePuedeAprobar(
      formato({ estado: 'APROBADA', bloqueos: ['algo'] }),
      true,
    );
    expect(permiso.motivo).toContain('ya tiene el visto bueno');
  });
});

describe('las cuentas sin concepto', () => {
  it('deja afuera las que no movieron: no van a salir en ningún formato', () => {
    const c = conceptos({
      sinConcepto: [
        { cuentaId: 'a', codigo: '1', movimientosCop: 0 },
        { cuentaId: 'b', codigo: '2', movimientosCop: 1_000 },
      ],
    });
    expect(cuentasSinConceptoQueImportan(c).map((x) => x.cuentaId)).toEqual(['b']);
  });

  it('ordena por plata, de mayor a menor: la primera es la que hay que resolver', () => {
    const c = conceptos({
      sinConcepto: [
        { cuentaId: 'a', codigo: '1', movimientosCop: 100 },
        { cuentaId: 'b', codigo: '2', movimientosCop: 9_000 },
        { cuentaId: 'c', codigo: '3', movimientosCop: -50_000 },
      ],
    });
    expect(cuentasSinConceptoQueImportan(c).map((x) => x.cuentaId)).toEqual(['c', 'b', 'a']);
  });

  it('no muta la lista del back', () => {
    const c = conceptos({
      sinConcepto: [
        { cuentaId: 'a', codigo: '1', movimientosCop: 100 },
        { cuentaId: 'b', codigo: '2', movimientosCop: 9_000 },
      ],
    });
    cuentasSinConceptoQueImportan(c);
    expect(c.sinConcepto.map((x) => x.cuentaId)).toEqual(['a', 'b']);
  });
});

describe('🔴 el aviso del preset', () => {
  it('cuenta las cuentas que usan el concepto propuesto', () => {
    expect(conceptosDelPreset(conceptos())).toBe(1);
  });

  it('lleva el número y el aviso legal del back, sin recortarlo', () => {
    const aviso = avisoDelPreset(conceptos())!;
    expect(aviso).toContain('1 cuenta usa el concepto propuesto');
    expect(aviso).toContain('resolución de la DIAN');
  });

  it('no avisa cuando el contador ya los fijó todos', () => {
    const todosDeLaAgencia = conceptos({
      conceptos: conceptos().conceptos.map((c) => ({ ...c, fuente: 'AGENCIA' as const })),
    });
    expect(avisoDelPreset(todosDeLaAgencia)).toBeNull();
  });

  it('pluraliza', () => {
    const dos = conceptos({
      conceptos: conceptos().conceptos.map((c) => ({ ...c, fuente: 'PRESET' as const })),
    });
    expect(avisoDelPreset(dos)).toContain('2 cuentas usan');
  });
});

describe('cuantías menores', () => {
  it('desactivada no dice nada', () => {
    expect(
      frasesDeCuantiasMenores(
        { activa: false, topeCop: 1_000_000, nit: '222222222', filas: 43 },
        pesos,
      ),
    ).toBeNull();
  });

  it('activa dice el tope, el NIT y que lo fija la resolución', () => {
    const frase = frasesDeCuantiasMenores(
      { activa: true, topeCop: 1_000_000, nit: '222222222', filas: 43 },
      pesos,
    )!;
    expect(frase).toContain('43 filas se agrupan');
    expect(frase).toContain(pesos(1_000_000));
    expect(frase).toContain('222222222');
    expect(frase).toContain('resolución de la DIAN');
  });
});

describe('el archivo y los años', () => {
  it('el nombre lleva formato y año', () => {
    expect(nombreDelArchivoDeExogena('1647', 2026)).toBe('exogena-1647-2026.csv');
  });

  it('🔴 los años van del actual hacia atrás: nunca el próximo', () => {
    const anios = aniosDeExogena(2026, 3);
    expect(anios).toEqual([2026, 2025, 2024]);
    expect(anios).not.toContain(2027);
  });
});

describe('totalesDelAnio', () => {
  it('suma filas y plata de los seis formatos', () => {
    const r = resumen([
      formato({ formato: '1001', filas: 128, totalCop: 740_000_000 }),
      formato({ formato: '1647', filas: 1_733, totalCop: 13_700_000_000 }),
      formato({ formato: '1003', filas: 0, totalCop: 0 }),
    ]);
    expect(totalesDelAnio(r)).toEqual({ filas: 1_861, totalCop: 14_440_000_000 });
  });

  it('sin formatos es cero, no NaN', () => {
    expect(totalesDelAnio(resumen([]))).toEqual({ filas: 0, totalCop: 0 });
  });
});
