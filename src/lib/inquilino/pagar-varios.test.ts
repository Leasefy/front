import { describe, expect, it } from 'vitest';
import type { ArriendoQueSePuedePagar } from '@/lib/api/pago-en-linea.service';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import {
  cuotasMarcadas,
  deQueSonLasTarjetas,
  estadoDeLosContratos,
  loQueVasAPagar,
  marcarTodo,
  partesDelPago,
  tocarLaCuota,
  totalDeLoMarcado,
} from './pagar-varios';

const cuota = (mes: string, valorCop: number) => ({
  id: `p-${mes}`,
  cuotaId: `c-${mes}`,
  mes,
  vence: `${mes}-01`,
  vencida: true,
  valorCop,
  interesCop: 0,
});

/** Ubermensch (21-10): la oficina en Caldas y la casa en Sabaneta. */
const oficina: ArriendoQueSePuedePagar = {
  leaseId: 'lease-oficina',
  contractId: 'contrato-oficina',
  contratoNumero: 1801,
  inmueble: { titulo: 'Oficina en Centro, Caldas', direccion: 'Calle 130 Sur # 50-23', ciudad: 'Caldas' },
  inmobiliaria: 'victor inmobiliaria8',
  aplica: true,
  cuotas: [cuota('2026-09', 1_271_471), cuota('2026-10', 1_271_471)],
  totalVencidoCop: 2_542_942,
  enVerificacion: null,
  ultimoRechazo: null,
};
const casa: ArriendoQueSePuedePagar = {
  ...oficina,
  leaseId: 'lease-casa',
  contractId: 'contrato-casa',
  contratoNumero: 1820,
  inmueble: { titulo: 'Casa en Sabaneta Barrio, Sabaneta', direccion: 'Carrera 45 # 70 Sur-12', ciudad: 'Sabaneta' },
  cuotas: [cuota('2026-11', 6_200_000)],
  totalVencidoCop: 0,
};

describe('qué se marca en cada inmueble', () => {
  it('🔴 marcar una cuota marca las anteriores de ESE inmueble; quitarla quita las más nuevas', () => {
    let m = tocarLaCuota({}, oficina.leaseId, 1);
    expect(m).toEqual({ [oficina.leaseId]: 2 });
    m = tocarLaCuota(m, casa.leaseId, 0);
    expect(m).toEqual({ [oficina.leaseId]: 2, [casa.leaseId]: 1 });
    m = tocarLaCuota(m, oficina.leaseId, 0);
    expect(m[oficina.leaseId]).toBe(0);
    expect(m[casa.leaseId]).toBe(1);
  });

  it('el total suma lo marcado de los dos inmuebles y las partes van en el orden de la pantalla', () => {
    const m = { [oficina.leaseId]: 1, [casa.leaseId]: 1 };
    expect(totalDeLoMarcado([oficina, casa], m)).toBe(7_471_471);
    expect(cuotasMarcadas([oficina, casa], m)).toBe(2);
    expect(partesDelPago([oficina, casa], m)).toEqual([
      { leaseId: oficina.leaseId, cuotas: 1 },
      { leaseId: casa.leaseId, cuotas: 1 },
    ]);
  });

  it('🔴 un inmueble que se quita del filtro sale del pago aunque tuviera cuotas marcadas', () => {
    const m = { [oficina.leaseId]: 2, [casa.leaseId]: 1 };
    expect(totalDeLoMarcado([casa], m)).toBe(6_200_000);
    expect(partesDelPago([casa], m)).toEqual([{ leaseId: casa.leaseId, cuotas: 1 }]);
  });

  it('con un pago esperando a Wompi, ese inmueble no se marca (ni con «marcar todo»)', () => {
    const enCurso = { ...casa, enVerificacion: { solicitudId: 's', valorCop: 6_200_000, desde: '2026-10-21T10:00:00Z' } };
    expect(marcarTodo([oficina, enCurso])).toEqual({ [oficina.leaseId]: 2 });
    expect(partesDelPago([enCurso], { [casa.leaseId]: 1 })).toEqual([]);
  });

  it('la confirmación dice qué se paga de cada inmueble', () => {
    expect(loQueVasAPagar([oficina, casa], { [oficina.leaseId]: 2, [casa.leaseId]: 1 })).toBe(
      '2 cuotas (septiembre de 2026 a octubre de 2026) de Oficina en Centro, Caldas y la cuota de noviembre de 2026 de Casa en Sabaneta Barrio, Sabaneta',
    );
    expect(loQueVasAPagar([oficina, casa], { [casa.leaseId]: 1 })).toBe('la cuota de noviembre de 2026 de Casa en Sabaneta Barrio, Sabaneta');
  });
});

describe('las tarjetas del inmueble escogido', () => {
  const contrato = (id: string, resta: number) => ({
    id,
    numero: id,
    rol: 'INQUILINO',
    inmueble: { direccion: id },
    vigente: true,
    secciones: { arriendos: [], otrosConceptos: [] },
    totales: { cancelado: 0, pendiente: resta, restaPorPagar: resta },
    cortes: [],
  });
  const doc = {
    contratos: [contrato('contrato-oficina', 15_257_652), contrato('contrato-casa', 13_431_033)],
    totales: { cancelado: 0, pendiente: 28_688_685, restaPorPagar: 28_688_685 },
  } as unknown as EstadoDeCuenta;

  it('🔴 con un inmueble escogido, «Resta por pagar» es sólo la de ese contrato', () => {
    const r = estadoDeLosContratos(doc, ['contrato-casa']);
    expect(r.contratos.map((c) => c.id)).toEqual(['contrato-casa']);
    expect(r.totales.restaPorPagar).toBe(13_431_033);
  });

  it('con todos (o un id que no está en el documento), el documento entero', () => {
    expect(estadoDeLosContratos(doc, ['contrato-oficina', 'contrato-casa'])).toBe(doc);
    expect(estadoDeLosContratos(doc, ['otro'])).toBe(doc);
    expect(estadoDeLosContratos(doc, null)).toBe(doc);
  });

  it('dice de qué son las tarjetas', () => {
    expect(deQueSonLasTarjetas([oficina, casa], [casa.leaseId])).toBe('De Casa en Sabaneta Barrio, Sabaneta');
    expect(deQueSonLasTarjetas([oficina, casa], [oficina.leaseId, casa.leaseId])).toBe('De tus 2 arriendos');
    expect(deQueSonLasTarjetas([oficina], [oficina.leaseId])).toBeNull();
  });
});
