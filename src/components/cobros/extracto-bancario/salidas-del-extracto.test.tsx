/**
 * 🔴 LAS SALIDAS DEL EXTRACTO en la pantalla (C2-SALIDAS; Nico, P5): la fila
 * de una salida muestra lo que puede ser (con su regla y «Segura»), concilia
 * la propuesta, marca un gasto del banco, dice contra qué quedó conciliada y
 * se deshace con motivo (sólo administrador o contador); la tarjeta avisa el
 * giro que no salió o salió dos veces.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { MovimientoBancario } from '@/lib/api/conciliacion-bancaria.types';
import type { SalidasDeLaPagina as Pagina } from '@/lib/api/salidas-del-extracto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    propuestas: vi.fn(),
    avisos: vi.fn(),
    conciliar: vi.fn(),
    aplicarSeguras: vi.fn(),
    desvincular: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  permisos: {
    canAccess: vi.fn((_m: string, _a: string) => true),
    isLoading: false,
    isAdmin: true,
    agencyRole: 'ADMIN' as string | null,
  },
}));

vi.mock('@/lib/api/salidas-del-extracto', async (original) => ({
  ...(await original<typeof import('@/lib/api/salidas-del-extracto')>()),
  salidasDelExtractoApi: api,
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));

import { Table, TableBody } from '@/components/ui/table';
import { hayQuePreguntarPorLaLinea } from '@/lib/api/salidas-del-extracto';
import { MovimientoFila } from './MovimientoFila';
import { AvisosDeLasSalidas, SalidasDeLaPagina } from './SalidasDelExtracto';

function movimiento(sobre: Partial<MovimientoBancario> = {}): MovimientoBancario {
  return {
    id: 'm-1',
    agencyId: 'a-1',
    fecha: '2026-09-15T00:00:00.000Z',
    valorCop: -1_500_000,
    descripcion: 'TRANSF A JUAN PEREZ',
    referencia: null,
    extractoNombre: 'sep.csv',
    estado: 'PENDIENTE',
    cobroId: null,
    reciboId: null,
    motivoIgnorado: null,
    conciliadoPorUserId: null,
    conciliadoAt: null,
    cargadoPorUserId: 'u-1',
    createdAt: '2026-09-16T00:00:00.000Z',
    candidatos: [],
    recibo: null,
    cuenta: null,
    deLaPasarela: false,
    pasarela: null,
    ...sobre,
  } as MovimientoBancario;
}

const propuesta = (sobre: Record<string, unknown> = {}) => ({
  tipo: 'GIRO',
  destinoId: 'g-1',
  clase: null,
  valorCop: 1_500_000,
  destino: { etiqueta: 'Giro a Juan Carlos Pérez', fecha: '2026-09-15', beneficiario: 'Juan Carlos Pérez', cantidad: 1 },
  regla: { id: 'nombre-del-beneficiario', nombre: 'El nombre y el apellido de quien recibió vienen en la línea', orden: 3 },
  nivel: 'alta',
  unica: true,
  sePuedeAplicarSola: true,
  porQue: ['La línea trae el nombre de Juan Carlos Pérez.'],
  llave: 'GIRO:g-1',
  ...sobre,
});

let raiz: Root;
let contenedor: HTMLDivElement;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  for (const f of Object.values(api)) f.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.agencyRole = 'ADMIN';
  api.avisos.mockResolvedValue({ avisos: [], hasta: null });
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function pintar(movs: MovimientoBancario[], pagina: Pagina, onCambio = vi.fn()) {
  api.propuestas.mockResolvedValue(pagina);
  await act(async () => {
    raiz.render(
      <SalidasDeLaPagina movimientos={movs}>
        <Table>
          <TableBody>
            {movs.map((m) => (
              <MovimientoFila
                key={m.id}
                movimiento={m}
                ocupado={false}
                puedeConciliar
                puedeEditar
                onConciliar={() => {}}
                onConciliarConCliente={() => {}}
                onIgnorar={() => {}}
                onReabrir={() => {}}
                onCambio={onCambio}
              />
            ))}
          </TableBody>
        </Table>
      </SalidasDeLaPagina>,
    );
  });
  await act(async () => {});
  return onCambio;
}

const q = (sel: string) => contenedor.querySelector(sel) as HTMLElement | null;

describe('qué líneas se le preguntan al back', () => {
  it('todas las salidas, y las entradas que hablan de un reverso o una devolución', () => {
    expect(hayQuePreguntarPorLaLinea({ valorCop: -5, descripcion: 'X', estado: 'PENDIENTE' })).toBe(true);
    expect(hayQuePreguntarPorLaLinea({ valorCop: 5, descripcion: 'DEVOLUCIÓN TRANSF RECHAZADA', estado: 'PENDIENTE' })).toBe(true);
    expect(hayQuePreguntarPorLaLinea({ valorCop: 5, descripcion: 'REVERSO TRASLADO', estado: 'CONCILIADO' })).toBe(true);
    expect(hayQuePreguntarPorLaLinea({ valorCop: 5, descripcion: 'CONSIGNACION CORRESPONSAL', estado: 'PENDIENTE' })).toBe(false);
  });
});

describe('🔴 una salida pendiente en su fila', () => {
  it('muestra la propuesta con su regla y «Segura», y «Conciliar» manda ESA propuesta', async () => {
    const m = movimiento();
    const onCambio = await pintar([m], {
      sePuedeAplicar: true,
      porMovimiento: { 'm-1': { evaluacion: { movimientoId: 'm-1', propuestas: [propuesta()] as never, ambigua: false }, vinculos: [] } },
    });
    expect(api.propuestas).toHaveBeenCalledWith(['m-1']);
    const li = q('[data-testid="propuesta-de-salida-m-1-GIRO:g-1"]')!;
    expect(li.dataset.segura).toBe('true');
    expect(li.textContent).toContain('Giro a Juan Carlos Pérez');
    expect(li.textContent).toContain('Segura');
    expect(li.textContent).toContain('El nombre y el apellido de quien recibió vienen en la línea');
    api.conciliar.mockResolvedValue({ movimientoId: 'm-1', estado: 'CONCILIADO' });
    await act(async () => (li.querySelector('button') as HTMLButtonElement).click());
    expect(api.conciliar).toHaveBeenCalledWith('m-1', { tipo: 'GIRO', destinoId: 'g-1', clase: null });
    expect(onCambio).toHaveBeenCalled();
  });

  it('sin propuesta: lo dice y ofrece marcarla como gasto del banco (4×1000, comisión, IVA o cuota)', async () => {
    const m = movimiento({ descripcion: 'ND 0001234', valorCop: -6_000 });
    await pintar([m], {
      sePuedeAplicar: true,
      porMovimiento: { 'm-1': { evaluacion: { movimientoId: 'm-1', propuestas: [], ambigua: false }, vinculos: [] } },
    });
    expect(q('[data-testid="salida-sin-propuesta-m-1"]')).not.toBeNull();
    await act(async () => q('[data-testid="gasto-del-banco-m-1"]')!.click());
    api.conciliar.mockResolvedValue({ movimientoId: 'm-1', estado: 'CONCILIADO' });
    await act(async () => (document.querySelector('[data-testid="gasto-GMF_4X1000-m-1"]') as HTMLButtonElement).click());
    expect(api.conciliar).toHaveBeenCalledWith('m-1', { tipo: 'GASTO_BANCARIO', clase: 'GMF_4X1000' });
  });

  it('sin la migración del back: se ve, pero «Conciliar» no se aprieta', async () => {
    await pintar([movimiento()], {
      sePuedeAplicar: false,
      porMovimiento: { 'm-1': { evaluacion: { movimientoId: 'm-1', propuestas: [propuesta()] as never, ambigua: false }, vinculos: [] } },
    });
    const boton = q('[data-testid="propuesta-de-salida-m-1-GIRO:g-1"] button') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(contenedor.textContent).toContain('falta un paso del equipo de Leasefy');
  });

  it('un back sin la ruta: la fila queda como antes (se puede ignorar)', async () => {
    api.propuestas.mockRejectedValue(new Error('404'));
    await act(async () => {
      raiz.render(
        <SalidasDeLaPagina movimientos={[movimiento()]}>
          <Table>
            <TableBody>
              <MovimientoFila
                movimiento={movimiento()}
                ocupado={false}
                puedeConciliar
                puedeEditar
                onConciliar={() => {}}
                onConciliarConCliente={() => {}}
                onIgnorar={() => {}}
                onReabrir={() => {}}
              />
            </TableBody>
          </Table>
        </SalidasDeLaPagina>,
      );
    });
    await act(async () => {});
    expect(contenedor.textContent).toContain('Una salida no se concilia contra una cuota; se puede ignorar.');
  });
});

describe('🔴 una salida conciliada', () => {
  const pagina: Pagina = {
    sePuedeAplicar: true,
    porMovimiento: {
      'm-1': {
        evaluacion: null,
        vinculos: [
          {
            id: 'v-1',
            tipo: 'GASTO_BANCARIO',
            destinoId: null,
            clase: 'GMF_4X1000',
            valorCop: 6_000,
            regla: 'cuatro-por-mil-por-la-descripcion',
            etiqueta: '4×1000 (gravamen a los movimientos financieros)',
            porQue: ['La línea dice «GMF».'],
            conciliadoPor: 'piloto',
            conciliadoAt: '2026-09-16T00:00:00.000Z',
          },
        ],
      },
    },
  };

  it('dice contra qué quedó y que la concilió el Piloto; un administrador la deshace con motivo', async () => {
    const onCambio = await pintar([movimiento({ estado: 'CONCILIADO', valorCop: -6_000, descripcion: 'GMF 4X1000' })], pagina);
    const celda = q('[data-testid="salida-conciliada-m-1"]')!;
    expect(celda.textContent).toContain('Gasto del banco: 4×1000');
    expect(celda.textContent).toContain('La concilió el Piloto');
    await act(async () => q('[data-testid="deshacer-salida-m-1"]')!.click());
    const confirmar = document.querySelector('[data-testid="confirmar-deshacer-salida-m-1"]') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    const motivo = document.getElementById('motivo-salida-m-1') as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(motivo, 'No era el 4×1000, era una comisión');
      motivo.dispatchEvent(new Event('input', { bubbles: true }));
    });
    api.desvincular.mockResolvedValue({ movimientoIds: ['m-1'], estado: 'PENDIENTE' });
    await act(async () => (document.querySelector('[data-testid="confirmar-deshacer-salida-m-1"]') as HTMLButtonElement).click());
    expect(api.desvincular).toHaveBeenCalledWith('m-1', 'No era el 4×1000, era una comisión');
    expect(onCambio).toHaveBeenCalled();
  });

  it('un asesor (AGENTE) no ve «Deshacer»', async () => {
    permisos.agencyRole = 'AGENTE';
    await pintar([movimiento({ estado: 'CONCILIADO', valorCop: -6_000 })], pagina);
    expect(q('[data-testid="deshacer-salida-m-1"]')).toBeNull();
  });
});

describe('🔴 la tarjeta de las salidas', () => {
  it('avisa el giro que no salió y el que salió dos veces, y concilia lo seguro tras confirmar', async () => {
    api.avisos.mockResolvedValue({
      hasta: '2026-09-30',
      avisos: [
        { tipo: 'NO_SALIO', destinoTipo: 'GIRO', destinoId: 'g-1', etiqueta: 'Giro a Ana', valorCop: 900_000, fecha: '2026-09-10', movimientoIds: [], mensaje: 'Giro a Ana por $900.000 quedó como pagado el 2026-09-10, pero no aparece en el extracto.' },
        { tipo: 'SALIO_DOS_VECES', destinoTipo: 'GIRO', destinoId: 'g-2', etiqueta: 'Giro a Luis', valorCop: 1_200_000, fecha: '2026-09-12', movimientoIds: ['x', 'y'], mensaje: 'Giro a Luis por $1.200.000 aparece 2 veces en el extracto.' },
      ],
    });
    const onCambio = vi.fn();
    await act(async () => {
      raiz.render(<AvisosDeLasSalidas puedeConciliar onCambio={onCambio} />);
    });
    await act(async () => {});
    expect(q('[data-testid="aviso-NO_SALIO-g-1"]')!.textContent).toContain('No aparece en el extracto');
    expect(q('[data-testid="aviso-SALIO_DOS_VECES-g-2"]')!.textContent).toContain('Salió dos veces');
    api.aplicarSeguras.mockResolvedValue({ aplicadas: 3, errores: [], quedanParaUnaPersona: 2 });
    await act(async () => q('[data-testid="conciliar-salidas-seguras"]')!.click());
    await act(async () => (document.querySelector('[data-testid="confirmar-salidas-seguras"]') as HTMLButtonElement).click());
    expect(api.aplicarSeguras).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('Se conciliaron 3 salidas seguras'));
    expect(onCambio).toHaveBeenCalled();
  });
});
