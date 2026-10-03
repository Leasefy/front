/**
 * 🔴 Seguimiento 6 (pendiente técnico: «el cajón del front no muestra "por el
 * alias" ni las salidas del agente»). El cajón del movimiento lee lo que
 * propone el agente SÓLO al abrirlo; marca «Por el alias» (con cuántas veces se
 * confirmó), muestra las salidas que propone (el gasto del banco se concilia
 * por la ruta del back), «No es esta» / «No es esta persona», y dice cuando el
 * agente está apagado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import type { AnalisisDelAgente, PropuestaDelAgente } from '@/lib/api/agente-de-conciliacion';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { agente, conciliacion, salidas, toastMock } = vi.hoisted(() => ({
  agente: { leerLoQuePropone: vi.fn(), rechazarLoQuePropone: vi.fn() },
  conciliacion: { conciliar: vi.fn(), conciliarConRecibos: vi.fn() },
  salidas: { conciliar: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/agente-de-conciliacion', async (original) => ({
  ...(await original<typeof import('@/lib/api/agente-de-conciliacion')>()),
  leerLoQuePropone: agente.leerLoQuePropone,
  rechazarLoQuePropone: agente.rechazarLoQuePropone,
}));
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({ conciliacionBancariaApi: conciliacion }));
vi.mock('@/lib/api/salidas-del-extracto', async (original) => ({
  ...(await original<typeof import('@/lib/api/salidas-del-extracto')>()),
  salidasDelExtractoApi: salidas,
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { LoQueProponeElAgente, fraseDelAlias } from './LoQueProponeElAgente';
import { vinoDelAlias, claseDelGastoDelBanco } from '@/lib/api/agente-de-conciliacion';

const mov = (sobre: Partial<MovimientoBancario> = {}) =>
  ({
    id: 'm-1',
    agencyId: 'a-1',
    fecha: '2026-09-15T00:00:00.000Z',
    valorCop: 1_800_000,
    descripcion: 'TRANSF JUAN P',
    referencia: null,
    estado: 'PENDIENTE',
    candidatos: [],
    ...sobre,
  }) as MovimientoBancario;

const propuesta = (sobre: Partial<PropuestaDelAgente> = {}): PropuestaDelAgente => ({
  ref: 'p1',
  tipo: 'contrato',
  ids: ['k-1'],
  titulo: 'El contrato del Apto 301',
  persona: 'J*** P***',
  sumaCop: 1_800_000,
  diferenciaCop: 0,
  calza: true,
  seAplicaSola: true,
  porQueNoSeAplicaSola: null,
  frases: ['El texto del pago ya se confirmó con este contrato.'],
  porQue: [{ tipo: 'alias', texto: '«TRANSF JUAN P» confirmado 3 veces' }],
  avisos: [],
  verificadaPorElBack: true,
  accion: { tipo: 'conciliar_uno', body: { tenantId: 't-1' } },
  rechazar: { tipo: 'contrato', ids: ['k-1'] },
  destino: { tipo: 'contrato', id: 'k-1' },
  comoSeAplicaSola: 'alias',
  contractId: 'k-1',
  cuotaIds: ['q-1'],
  tenantId: 't-1',
  alias: { muestra: 'TRANSF JUAN P', senalLlave: 'x', personas: 3, piloto: 1, confirmaciones: 3.5 },
  ...sobre,
});

const analisis = (sobre: Partial<AnalisisDelAgente> = {}): AnalisisDelAgente => ({
  movimientoId: 'm-1',
  estado: 'PENDIENTE',
  valorCop: 1_800_000,
  fecha: '2026-09-15',
  propuestas: [propuesta()],
  descartadas: [],
  memoria: { disponible: true, aliasUsados: 1 },
  razonador: 'determinista',
  libros: [],
  resumen: 'Es el pago de siempre de este inquilino.',
  sentido: 'entrada',
  ...sobre,
});

let raiz: Root;
let contenedor: HTMLDivElement;
const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  for (const f of [...Object.values(agente), ...Object.values(conciliacion), ...Object.values(salidas)]) f.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
});

async function abrir(m = mov(), onCambio = vi.fn()) {
  await act(async () => {
    raiz.render(<LoQueProponeElAgente movimiento={m} puedeConciliar puedeEditar ocupado={false} onCambio={onCambio} />);
  });
  expect(agente.leerLoQuePropone).not.toHaveBeenCalled();
  await act(async () => (contenedor.querySelector(`[data-testid="lo-que-propone-el-agente-${m.id}"]`) as HTMLElement).click());
  await act(async () => {});
  return onCambio;
}

describe('🔴 el cajón del movimiento: lo que propone el agente', () => {
  it('sólo lee al abrir, y marca «Por el alias» con cuántas veces se confirmó', async () => {
    agente.leerLoQuePropone.mockResolvedValue({ estado: 'listo', analisis: analisis() });
    await abrir();
    expect(agente.leerLoQuePropone).toHaveBeenCalledWith('a-1', 'm-1', expect.anything());
    expect($('[data-testid="por-el-alias-p1"]')?.textContent).toBe('Por el alias');
    expect($('[data-testid="frase-del-alias-p1"]')?.textContent).toBe(
      '«TRANSF JUAN P» ya se confirmó: lo confirmaron 3 personas y el Piloto 1 vez.',
    );
    expect(document.body.textContent).toContain('Es el pago de siempre de este inquilino.');
  });

  it('«Conciliar» va por la ruta del back (contra el cliente) y avisa el cambio', async () => {
    agente.leerLoQuePropone.mockResolvedValue({ estado: 'listo', analisis: analisis() });
    conciliacion.conciliar.mockResolvedValue({});
    const onCambio = await abrir();
    await act(async () => $('[data-testid="conciliar-lo-del-agente-p1"]')!.click());
    expect(conciliacion.conciliar).toHaveBeenCalledWith('m-1', { tenantId: 't-1' });
    expect(onCambio).toHaveBeenCalled();
  });

  it('una propuesta sin alias no dice «Por el alias» ni ofrece «No es esta persona»', async () => {
    agente.leerLoQuePropone.mockResolvedValue({
      estado: 'listo',
      analisis: analisis({
        propuestas: [propuesta({ alias: null, comoSeAplicaSola: 'exacto', porQue: [{ tipo: 'back', texto: 'La referencia' }] })],
      }),
    });
    await abrir();
    expect($('[data-testid="por-el-alias-p1"]')).toBeNull();
    expect($('[data-testid="no-es-esta-persona-p1"]')).toBeNull();
    expect($('[data-testid="no-es-esta-p1"]')).not.toBeNull();
  });

  it('🔴 en una SALIDA muestra las salidas que propone; el 4×1000 se concilia como gasto del banco por el back', async () => {
    agente.leerLoQuePropone.mockResolvedValue({
      estado: 'listo',
      analisis: analisis({
        sentido: 'salida',
        valorCop: -6_000,
        propuestas: [
          propuesta({
            ref: 'g1',
            tipo: 'gasto_bancario',
            ids: ['GMF_4X1000'],
            titulo: 'Gasto bancario: el 4×1000 (gravamen a los movimientos financieros)',
            persona: null,
            sumaCop: 6_000,
            alias: null,
            comoSeAplicaSola: null,
            seAplicaSola: false,
            accion: null,
            porQue: [{ tipo: 'regla', texto: 'El 0,4 % del giro del mismo día' }],
            rechazar: { tipo: 'gasto_bancario', ids: ['GMF_4X1000'] },
          }),
          propuesta({
            ref: 'gi1',
            tipo: 'giro',
            ids: ['sin-lote'],
            titulo: 'Parece un giro a un propietario',
            alias: null,
            comoSeAplicaSola: null,
            accion: null,
            porQue: [],
          }),
        ],
      }),
    });
    salidas.conciliar.mockResolvedValue({});
    await abrir(mov({ valorCop: -6_000, descripcion: 'IMPTO GOBIERNO' }));
    expect(document.body.textContent).toContain('Salidas que propone el agente');
    expect($('[data-testid="conciliar-lo-del-agente-g1"]')?.textContent).toContain('Conciliar como gasto del banco');
    // Un giro se concilia en la fila (allí el back verifica el pago).
    expect($('[data-testid="conciliar-lo-del-agente-gi1"]')).toBeNull();
    expect($('[data-testid="propuesta-del-agente-gi1"]')?.textContent).toContain('Concílialo en la fila');
    await act(async () => $('[data-testid="conciliar-lo-del-agente-g1"]')!.click());
    expect(salidas.conciliar).toHaveBeenCalledWith('m-1', { tipo: 'GASTO_BANCARIO', clase: 'GMF_4X1000' });
  });

  it('«No es esta persona» bloquea el alias en el agente y vuelve a leer', async () => {
    agente.leerLoQuePropone.mockResolvedValue({ estado: 'listo', analisis: analisis() });
    agente.rechazarLoQuePropone.mockResolvedValue({ ok: true });
    await abrir();
    await act(async () => $('[data-testid="no-es-esta-persona-p1"]')!.click());
    await act(async () => {});
    expect(agente.rechazarLoQuePropone).toHaveBeenCalledWith('a-1', 'm-1', { tipo: 'contrato', ids: ['k-1'] }, true);
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('ya no se asocia a esa persona'));
    expect(agente.leerLoQuePropone).toHaveBeenCalledTimes(2);
  });

  it('con el agente apagado lo dice (y la fila sigue con lo del extracto)', async () => {
    agente.leerLoQuePropone.mockResolvedValue({ estado: 'apagado' });
    await abrir();
    expect($('[data-testid="agente-apagado"]')?.textContent).toContain('no está prendido');
  });

  it('si la lectura falla, lo dice y deja volver a intentar', async () => {
    agente.leerLoQuePropone
      .mockResolvedValueOnce({ estado: 'error', fallo: new Error('caído') })
      .mockResolvedValueOnce({ estado: 'listo', analisis: analisis() });
    await abrir();
    expect($('[data-testid="agente-error"]')).not.toBeNull();
    const boton = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Volver a intentar')!;
    await act(async () => boton.click());
    await act(async () => {});
    expect($('[data-testid="propuesta-del-agente-p1"]')).not.toBeNull();
  });

  it('las piezas: cuándo vino del alias y qué gasto del banco entiende el back', () => {
    expect(vinoDelAlias(propuesta())).toBe(true);
    expect(vinoDelAlias(propuesta({ alias: null, comoSeAplicaSola: null, porQue: [] }))).toBe(false);
    expect(vinoDelAlias(propuesta({ alias: null, comoSeAplicaSola: null, porQue: [{ tipo: 'alias', texto: 'x' }] }))).toBe(true);
    expect(claseDelGastoDelBanco({ tipo: 'gasto_bancario', ids: ['COMISION'] })).toBe('COMISION');
    expect(claseDelGastoDelBanco({ tipo: 'gasto_bancario', ids: ['INTERESES'] })).toBeNull();
    expect(claseDelGastoDelBanco({ tipo: 'giro', ids: ['x'] })).toBeNull();
    expect(fraseDelAlias({ muestra: 'X', senalLlave: 'k', personas: 1, piloto: 0, confirmaciones: 1 })).toBe(
      '«X» ya se confirmó: lo confirmaron 1 persona.',
    );
  });
});
