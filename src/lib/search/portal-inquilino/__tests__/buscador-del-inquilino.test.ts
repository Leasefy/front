import { describe, it, expect, beforeEach } from 'vitest';
import type { EstadoDeCuenta, FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import type { SolicitudPqrs } from '@/lib/api/pqrs.types';
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types';
import { buscarEnElPortal, indiceDelInquilino, accesosRapidos } from '../buscador-del-inquilino';
import { guardarReciente, leerRecientes } from '../busquedas-recientes';

/**
 * 🔴🔴 BU-11 (QA del 04-10-2026): el buscador del portal mostraba «Pago
 * Febrero 2026 · $2,500,000 - Pendiente» a cualquier inquilino. Estas pruebas
 * fijan que busca en LO SUYO (el estado de cuenta de Iván en el lab: contrato
 * N.º 3, Calle 45 # 70-12 Apto 301, octubre con $ 1.770.112 por pagar) y que
 * nada inventado sale.
 */

function fila(p: Partial<FilaDelEstadoDeCuenta>): FilaDelEstadoDeCuenta {
  return {
    concepto: 'Canon de arrendamiento. De 01-Oct-2026 hasta 31-Oct-2026',
    estado: 'PENDIENTE',
    fechaDePago: null,
    valorBruto: 0,
    iva: 0,
    retencion: 0,
    reteIva: 0,
    reteIca: 0,
    valorNeto: 0,
    fechaVencimiento: '2026-10-01',
    documentoDePago: null,
    parcial: false,
    ...p,
  } as FilaDelEstadoDeCuenta;
}

const estado = {
  contratos: [
    {
      id: 'c3',
      numero: '3',
      numeroDeLeasefy: 3,
      rol: 'INQUILINO',
      inmueble: { direccion: 'Calle 45 # 70-12 Apto 301' },
      vigente: true,
      secciones: {
        arriendos: [
          fila({ estado: 'ANTERIOR', fechaVencimiento: '2026-02-01', valorNeto: 2_350_000 }),
          fila({ estado: 'CANCELADA', fechaVencimiento: '2026-09-01', valorNeto: 2_350_000, fechaDePago: '2026-09-03', documentoDePago: { numero: '28', tipo: 'INGRESO', descripcion: 'pse · 1' } as never }),
          fila({ estado: 'CANCELADA', valorNeto: 579_888, fechaDePago: '2026-10-02', documentoDePago: { numero: '31', tipo: 'INGRESO', descripcion: 'pse · 2' } as never }),
          fila({ concepto: 'Saldo pendiente por Canon de arrendamiento. De 01-Oct-2026 hasta 31-Oct-2026', estado: 'PENDIENTE', valorNeto: 1_770_112 }),
        ],
        otrosConceptos: [],
      },
      totales: {},
      cortes: [],
    },
  ],
} as unknown as EstadoDeCuenta;

const solicitudes = [
  {
    id: 'p4',
    radicado: 'PQRS-0004',
    tipo: 'reclamo',
    estado: 'resuelta',
    asunto: 'Cobro doble de la administración en octubre',
    descripcion: 'Me cobraron dos veces',
    solicitanteNombre: 'Iván',
    solicitanteTipo: 'inquilino',
    propiedadDireccion: 'Calle 45 # 70-12 Apto 301 · Calle 45 # 70-12 Apto 301',
  },
] as unknown as SolicitudPqrs[];

const acuerdos = [
  { planId: 'a1', status: 'active', totalDueCop: 6_050_000, installments: [{}, {}, {}, {}] },
  { planId: 'a2', status: 'cancelled', totalDueCop: 300_000, installments: [{}] },
] as unknown as AcuerdoDetail[];

const indice = indiceDelInquilino({ estado, solicitudes, acuerdos }, '2026-10-04');
const titulos = (q: string) => buscarEnElPortal(indice, q).map((r) => `${r.titulo} | ${r.detalle}`);

describe('buscador del portal del inquilino (BU-11)', () => {
  it('«pago» trae SUS cuotas y nunca la deuda inventada del mock', () => {
    const r = titulos('pago').join('\n');
    expect(r).toContain('Arriendo de octubre de 2026 | Debes $ 1.770.112 · venció el 1 de octubre de 2026');
    expect(r).toContain('Arriendo de septiembre de 2026 | Pagado · $ 2.350.000');
    expect(r).not.toMatch(/Febrero|2,500,000|2\.500\.000|Chapinero|Nicolás/);
  });

  it('un mes partido en abono y saldo es UNA cuota con lo pagado y lo que falta', () => {
    const octubre = buscarEnElPortal(indice, 'octubre').filter((r) => r.categoria === 'pago');
    expect(octubre).toHaveLength(1);
  });

  it('lo del sistema anterior no sale como cuota de Leasefy', () => {
    expect(titulos('febrero')).toEqual([]);
  });

  it('«Calle 45» y «contrato 3» traen su contrato e inmueble', () => {
    expect(titulos('Calle 45')).toContain('Contrato N.º 3 | Calle 45 # 70-12 Apto 301 · Vigente');
    expect(titulos('contrato 3')[0]).toBe('Contrato N.º 3 | Calle 45 # 70-12 Apto 301 · Vigente');
  });

  it('la solicitud por radicado («PQRS-0004», «0004», «4») y por asunto', () => {
    for (const q of ['PQRS-0004', '0004', '4', 'cobro doble', 'administracion']) {
      expect(titulos(q).some((t) => t.startsWith('PQRS-0004 · Cobro doble'))).toBe(true);
    }
    // «0004», escrito con sus ceros, es el radicado: no las «4 cuotas» del acuerdo.
    expect(titulos('0004')).toEqual(['PQRS-0004 · Cobro doble de la administración en octubre | Reclamo · Resuelta · Calle 45 # 70-12 Apto 301']);
    // «4» no encuentra el «45» de la dirección.
    expect(titulos('4').some((t) => t.startsWith('Contrato'))).toBe(false);
  });

  it('el recibo por su número, con su valor', () => {
    expect(titulos('recibo 31')).toEqual(['Recibo N.º 31 | $ 579.888 · pagado el 2 de octubre de 2026']);
  });

  it('el acuerdo vivo sí, el cancelado no', () => {
    const r = buscarEnElPortal(indice, 'acuerdo').filter((x) => x.categoria === 'acuerdo');
    expect(r).toHaveLength(1);
    expect(r[0].href).toBe('/inquilino/acuerdos/a1');
  });

  it('«paz y salvo» lleva a Documentos', () => {
    expect(buscarEnElPortal(indice, 'paz y salvo').map((r) => r.href)).toContain('/inquilino/documentos');
  });

  it('sin datos (todo falló) sólo quedan las secciones reales, ninguna cifra', () => {
    const vacio = indiceDelInquilino({}, '2026-10-04');
    expect(vacio.every((e) => e.categoria === 'pagina')).toBe(true);
    expect(accesosRapidos().map((a) => a.detalle).join(' ')).not.toMatch(/\d/);
  });
});

describe('búsquedas recientes por persona (BU-11)', () => {
  beforeEach(() => window.localStorage.clear());

  it('son de cada persona y la última va primero, sin repetir', () => {
    expect(leerRecientes('ivan')).toEqual([]);
    guardarReciente('ivan', 'octubre');
    guardarReciente('ivan', 'PQRS-0004');
    guardarReciente('ivan', 'Octubre');
    expect(leerRecientes('ivan')).toEqual(['Octubre', 'PQRS-0004']);
    expect(leerRecientes('otra')).toEqual([]);
  });

  it('sin persona no guarda nada', () => {
    expect(guardarReciente(null, 'octubre')).toEqual([]);
  });
});
