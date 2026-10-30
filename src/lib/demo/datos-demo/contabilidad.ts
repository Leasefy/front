/**
 * Contabilidad con datos de ejemplo (el modo demo): el libro de asientos de los dos últimos meses, el plan de cuentas
 * que usan, el balance de prueba que sale de esos mismos asientos (cuadra) y el estado del cierre. Inquilinos y
 * propietarios INVENTADOS (los de la demo de Contratos): no son de ningún cliente. Las fechas se cuentan desde hoy.
 *
 * Cada mes, por contrato: la causación del canon (cobro), el recibo de caja cuando el inquilino paga y el giro al
 * propietario con la comisión de la inmobiliaria y su IVA. Más dos gastos de la oficina. Todo asiento cuadra.
 */
import type {
  AsientoContable,
  AsientosFaltantes,
  BalanceDePrueba,
  Cierre,
  CuentaPuc,
  FilaDeBalance,
  MapeoDeRubros,
  MovimientoContable,
  OrigenDelAsiento,
  PaginaDeAsientos,
} from '@/lib/api/contabilidad.service';
import type { LecturaDeLaDemo } from './index';

const AGENCIA = '22222222-2222-4222-8222-222222222222';

const CUENTAS: readonly [string, string, 'DEBITO' | 'CREDITO'][] = [
  ['111005', 'Bancos · cuenta corriente', 'DEBITO'],
  ['130505', 'Clientes · inquilinos', 'DEBITO'],
  ['240810', 'IVA por pagar', 'CREDITO'],
  ['281505', 'Ingresos recibidos para terceros', 'CREDITO'],
  ['415515', 'Comisiones de administración', 'CREDITO'],
  ['513525', 'Acueducto, energía y teléfono', 'DEBITO'],
  ['513595', 'Otros servicios', 'DEBITO'],
];

function cuentas(): CuentaPuc[] {
  return CUENTAS.map(([codigo, nombre, naturaleza]) => ({
    id: `demo-cta-${codigo}`,
    agencyId: AGENCIA,
    codigo,
    nombre,
    naturaleza,
    padreId: null,
    imputable: true,
    activa: true,
    noDeducible: null,
    createdAt: '2025-10-01T00:00:00.000Z',
    updatedAt: '2025-10-01T00:00:00.000Z',
  }));
}
const nombreDe = (codigo: string) => CUENTAS.find((c) => c[0] === codigo)?.[1] ?? codigo;

const CONTRATOS: readonly [string, string, string, number, number][] = [
  // inquilino, propietario, inmueble, canon, día en que paga
  ['Laura Restrepo', 'Carlos Mejía', 'Cra 43A # 18 Sur 135, apto 702', 2_350_000, 4],
  ['Andrés Gómez', 'María Isabel Uribe', 'Cl 10 # 34-21, casa 4', 1_850_000, 6],
  ['Comercializadora El Poblado SAS', 'Inversiones Palmas SAS', 'Cra 37 # 8A-56, local 2', 6_400_000, 3],
  ['Valentina Ríos', 'Jorge Arango', 'Cl 79 Sur # 47E-80, apto 1504', 2_900_000, 5],
  ['Juan Pablo Cardona', 'Luz Marina Henao', 'Cra 70 # 44-10, apto 301', 1_650_000, 9],
];

/** `YYYY-MM-DD` del día `d` del mes que está `n` meses atrás. */
function dia(n: number, d: number): string {
  const h = new Date();
  const f = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - n, d));
  return f.toISOString().slice(0, 10);
}
const hoy = () => new Date().toISOString().slice(0, 10);
const ultimoDia = (n: number) => {
  const h = new Date();
  return new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - n + 1, 0)).toISOString().slice(0, 10);
};

/** Todo el libro, del más viejo al más nuevo. */
function libro(): AsientoContable[] {
  const lista: AsientoContable[] = [];
  let numero = 812;
  const asiento = (fecha: string, descripcion: string, origen: OrigenDelAsiento, rotulo: string, lineas: [string, number, number, string | null][]) => {
    if (fecha > hoy()) return;
    numero += 1;
    const id = `demo-as-${numero}`;
    const movimientos: MovimientoContable[] = lineas.map(([codigo, debito, credito, tercero], i) => ({
      id: `${id}-m${i + 1}`,
      asientoId: id,
      cuentaId: `demo-cta-${codigo}`,
      debitoCop: debito,
      creditoCop: credito,
      terceroTipo: tercero ? 'TERCERO' : null,
      terceroId: null,
      descripcion: null,
      orden: i + 1,
      cuenta: { codigo, nombre: nombreDe(codigo) },
      terceroNombre: tercero,
      terceroDocumento: null,
    }));
    const cerrado = fecha <= ultimoDia(2);
    lista.push({
      id,
      agencyId: AGENCIA,
      numero,
      fecha,
      descripcion,
      origen,
      origenId: null,
      cerrado,
      creadoPorUserId: null,
      createdAt: `${fecha}T14:00:00.000Z`,
      movimientos,
      reversaDe: null,
      reversadoPor: null,
      origenLegible: { tipo: origen, rotulo, id: null },
      sePuedeReversar: !cerrado,
      porQueNoSeReversa: cerrado ? 'El mes está cerrado.' : null,
    });
  };
  for (const n of [1, 0]) {
    for (const [inquilino, propietario, inmueble, canon] of CONTRATOS) {
      asiento(dia(n, 1), `Canon de ${inquilino} · ${inmueble}`, 'COBRO', 'Cobro del canon', [
        ['130505', canon, 0, inquilino],
        ['281505', 0, canon, propietario],
      ]);
    }
    for (const [inquilino, , inmueble, canon, paga] of CONTRATOS) {
      // Juan Pablo no ha pagado este mes: es la cuota en mora de la demo de Facturación.
      if (n === 0 && inquilino === 'Juan Pablo Cardona') continue;
      asiento(dia(n, paga), `Recibo de caja de ${inquilino} · ${inmueble}`, 'RECIBO_DE_CAJA', 'Recibo de caja', [
        ['111005', canon, 0, inquilino],
        ['130505', 0, canon, inquilino],
      ]);
    }
    for (const [inquilino, propietario, , canon] of CONTRATOS) {
      if (n === 0 && inquilino === 'Juan Pablo Cardona') continue;
      const comision = Math.round(canon * 0.1);
      const iva = Math.round(comision * 0.19);
      asiento(dia(n, 12), `Giro a ${propietario}, menos la comisión`, 'DISPERSION', 'Giro al propietario', [
        ['281505', canon, 0, propietario],
        ['111005', 0, canon - comision - iva, propietario],
        ['415515', 0, comision, propietario],
        ['240810', 0, iva, null],
      ]);
    }
    asiento(dia(n, 15), 'Servicios de la oficina (energía e internet)', 'MANUAL', 'Asiento manual', [
      ['513525', 486_300, 0, null],
      ['111005', 0, 486_300, null],
    ]);
    asiento(dia(n, 20), 'Aseo y cafetería de la oficina', 'MANUAL', 'Asiento manual', [
      ['513595', 312_000, 0, null],
      ['111005', 0, 312_000, null],
    ]);
  }
  return lista;
}

function pagina(camino: string): PaginaDeAsientos {
  const q = (k: string) => new RegExp(`[?&]${k}=([^&]+)`).exec(camino)?.[1];
  const desde = q('desde');
  const hasta = q('hasta');
  const origen = q('origen');
  const cuentaId = q('cuentaId');
  const limite = Math.min(200, Number(q('limite') ?? 50));
  const desplazamiento = Number(q('desplazamiento') ?? 0);
  const todos = libro()
    .filter((a) => (!desde || a.fecha >= desde) && (!hasta || a.fecha <= hasta) && (!origen || a.origen === origen))
    .filter((a) => !cuentaId || a.movimientos.some((m) => m.cuentaId === decodeURIComponent(cuentaId)))
    .reverse();
  return { total: todos.length, limite, desplazamiento, asientos: todos.slice(desplazamiento, desplazamiento + limite) };
}

function balance(camino: string): BalanceDePrueba {
  const desde = /[?&]desde=([^&]+)/.exec(camino)?.[1] ?? null;
  const hasta = /[?&]hasta=([^&]+)/.exec(camino)?.[1] ?? null;
  const asientos = libro();
  const filas: FilaDeBalance[] = CUENTAS.map(([codigo, nombre, naturaleza]) => {
    const suma = (filtro: (f: string) => boolean, k: 'debitoCop' | 'creditoCop') =>
      asientos.filter((a) => filtro(a.fecha)).flatMap((a) => a.movimientos).filter((m) => m.cuenta?.codigo === codigo).reduce((s, m) => s + m[k], 0);
    const antes = (f: string) => !!desde && f < desde;
    const dentro = (f: string) => (!desde || f >= desde) && (!hasta || f <= hasta);
    const signo = naturaleza === 'DEBITO' ? 1 : -1;
    const saldoAnterior = signo * (suma(antes, 'debitoCop') - suma(antes, 'creditoCop'));
    const debitos = suma(dentro, 'debitoCop');
    const creditos = suma(dentro, 'creditoCop');
    return { cuentaId: `demo-cta-${codigo}`, codigo, nombre, naturaleza, saldoAnteriorCop: saldoAnterior, debitosCop: debitos, creditosCop: creditos, saldoFinalCop: saldoAnterior + signo * (debitos - creditos) };
  }).filter((f) => f.debitosCop || f.creditosCop || f.saldoAnteriorCop);
  const totalDebitos = filas.reduce((s, f) => s + f.debitosCop, 0);
  const totalCreditos = filas.reduce((s, f) => s + f.creditosCop, 0);
  return { desde, hasta, filas, totalDebitosCop: totalDebitos, totalCreditosCop: totalCreditos, cuadra: totalDebitos === totalCreditos, diferenciaCop: totalDebitos - totalCreditos };
}

function cierre(): Cierre {
  return { cerradaHasta: ultimoDia(2), sePuedeCerrarHasta: ultimoDia(1), sinAsentar: { recibos: 0, lotes: 0, cobros: 0, total: 0, valorCop: 0 } };
}

function faltantes(): AsientosFaltantes {
  return { recibos: 0, lotes: 0, cobros: 0, total: 0, mapeoCompleto: true, eventosSinCuenta: [] };
}

function rubros(): MapeoDeRubros {
  return { disponible: true, motivo: null, completo: true, faltantes: [], rubros: [], avisos: [] };
}

export const CONTABILIDAD_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/inmobiliaria\/contabilidad\/puc(\?|$)/, respuesta: cuentas },
  { patron: /^\/inmobiliaria\/contabilidad\/asientos\/cierre(\?|$)/, respuesta: cierre },
  { patron: /^\/inmobiliaria\/contabilidad\/asientos\/faltantes(\?|$)/, respuesta: faltantes },
  { patron: /^\/inmobiliaria\/contabilidad\/asientos\/reaperturas(\?|$)/, respuesta: () => ({ disponible: true, motivo: null, reaperturas: [] }) },
  { patron: /^\/inmobiliaria\/contabilidad\/asientos\/demo-as-[^/?]+$/, respuesta: (camino) => libro().find((a) => camino.endsWith(a.id)) ?? null },
  { patron: /^\/inmobiliaria\/contabilidad\/asientos(\?|$)/, respuesta: pagina },
  { patron: /^\/inmobiliaria\/contabilidad\/reportes\/balance-de-prueba(\?|$)/, respuesta: balance },
  { patron: /^\/inmobiliaria\/contabilidad\/mapeo\/rubros(\?|$)/, respuesta: rubros },
  { patron: /^\/inmobiliaria\/contabilidad\/diferencias\/por-asentar(\?|$)/, respuesta: () => ({ total: 0, valorCop: 0 }) },
  {
    patron: /^\/inmobiliaria\/contabilidad\/gastos\/facturas(\?|$)/,
    respuesta: () => ({ disponible: true, motivo: null, total: 0, limite: 20, desplazamiento: 0, totales: { subtotalCop: 0, ivaCop: 0, retencionesCop: 0, totalCop: 0, netoCop: 0 }, facturas: [] }),
  },
  { patron: /^\/inmobiliaria\/contabilidad\/egresos\/lotes(\?|$)/, respuesta: () => ({ disponible: true, motivo: null, total: 0, lotes: [] }) },
  { patron: /^\/inmobiliaria\/contabilidad\/exogena(\?|$)/, respuesta: (camino) => ({ anio: Number(/anio=(\d{4})/.exec(camino)?.[1] ?? new Date().getFullYear() - 1), formatos: [], disponible: true, cuantiasMenores: null }) },
];
