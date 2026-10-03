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
    seguras: vi.fn(),
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
import { plata } from './formato';

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
    api.seguras.mockResolvedValue(VISTA);
    api.aplicarSeguras.mockResolvedValue({ aplicadas: 2, totalCop: 14_500, errores: [], yaNoSonSeguras: [], quedanParaUnaPersona: 2 });
    await act(async () => q('[data-testid="conciliar-salidas-seguras"]')!.click());
    await act(async () => {});
    await act(async () => (document.querySelector('[data-testid="confirmar-salidas-seguras"]') as HTMLButtonElement).click());
    expect(api.aplicarSeguras).toHaveBeenCalledTimes(1);
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining('Se conciliaron 2 salidas seguras'));
    expect(onCambio).toHaveBeenCalled();
  });
});

const VISTA = {
  sePuedeAplicar: true,
  cantidad: 2,
  totalCop: 14_500,
  quedanParaUnaPersona: 3,
  desde: '2026-06-01',
  salidas: [
    { movimientoId: 'g-1', fecha: '2026-09-14', descripcion: 'GMF 4X1000', valorCop: 6_000, tipo: 'GASTO_BANCARIO', clase: 'GMF_4X1000', etiqueta: '4×1000 (gravamen a los movimientos financieros)', regla: { id: 'x', nombre: 'El 4×1000 con su nombre en la línea' } },
    { movimientoId: 'c-1', fecha: '2026-09-15', descripcion: 'COMISION TRANSFERENCIA ACH', valorCop: 8_500, tipo: 'GASTO_BANCARIO', clase: 'COMISION', etiqueta: 'Comisión del banco', regla: { id: 'y', nombre: 'Una comisión' } },
  ],
};

/**
 * 🔴 Seguimiento 6 (Nico, C2-SALIDAS Q3): «Conciliar las salidas seguras»
 * también lo aprieta una persona, CON CONFIRMACIÓN: el diálogo dice cuántas
 * son, cuánto suman y cuáles, y confirmar manda ESA lista.
 */
describe('🔴 «Conciliar las salidas seguras» con confirmación: cuántas, cuánto y cuáles', () => {
  const abrir = async () => {
    await act(async () => {
      raiz.render(<AvisosDeLasSalidas puedeConciliar onCambio={vi.fn()} />);
    });
    await act(async () => {});
    await act(async () => q('[data-testid="conciliar-salidas-seguras"]')!.click());
    await act(async () => {});
  };
  const enElDialogo = (sel: string) => document.querySelector(sel) as HTMLElement | null;

  it('el diálogo pregunta al back y muestra cuántas son, cuánto suman y cuáles', async () => {
    api.seguras.mockResolvedValue(VISTA);
    await abrir();
    expect(api.seguras).toHaveBeenCalledTimes(1);
    expect(enElDialogo('[data-testid="seguras-resumen"]')!.textContent).toBe(`2 salidas por ${plata(14_500)}`);
    expect(enElDialogo('[data-testid="segura-g-1"]')!.textContent).toContain('GMF 4X1000');
    expect(enElDialogo('[data-testid="segura-c-1"]')!.textContent).toContain('Comisión del banco');
    expect(enElDialogo('[data-testid="confirmar-salidas-seguras"]')!.textContent).toContain('Conciliar 2 salidas');
    expect(document.body.textContent).toContain('Quedan 3 sin respuesta segura');
  });

  it('🔴 confirmar manda EXACTAMENTE lo que la persona vio, y el toast dice lo que ya no era seguro', async () => {
    api.seguras.mockResolvedValue(VISTA);
    api.aplicarSeguras.mockResolvedValue({
      aplicadas: 1,
      totalCop: 6_000,
      errores: [],
      yaNoSonSeguras: [{ movimientoId: 'c-1', mensaje: 'Ya no es segura' }],
      quedanParaUnaPersona: 4,
    });
    await abrir();
    await act(async () => enElDialogo('[data-testid="confirmar-salidas-seguras"]')!.click());
    expect(api.aplicarSeguras).toHaveBeenCalledWith(VISTA);
    const frase = toastMock.success.mock.calls[0][0] as string;
    expect(frase).toContain(`Se concilió 1 salida segura por ${plata(6_000)}`);
    expect(frase).toContain('1 ya no era segura');
  });

  it('sin salidas seguras: lo dice y «Conciliar» no se aprieta', async () => {
    api.seguras.mockResolvedValue({ ...VISTA, cantidad: 0, totalCop: 0, salidas: [] });
    await abrir();
    expect(enElDialogo('[data-testid="seguras-ninguna"]')!.textContent).toContain('No hay salidas seguras');
    expect((enElDialogo('[data-testid="confirmar-salidas-seguras"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sin la migración del back: se ve cuántas hay, pero no se concilia', async () => {
    api.seguras.mockResolvedValue({ ...VISTA, sePuedeAplicar: false });
    await abrir();
    expect(enElDialogo('[data-testid="seguras-sin-tabla"]')!.textContent).toContain('2 salidas');
    expect((enElDialogo('[data-testid="confirmar-salidas-seguras"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('si no se pudo mirar, lo dice y deja volver a intentar (nunca concilia a ciegas)', async () => {
    api.seguras.mockRejectedValueOnce(new Error('caído')).mockResolvedValueOnce(VISTA);
    await abrir();
    expect(enElDialogo('[data-testid="seguras-error"]')).not.toBeNull();
    expect((enElDialogo('[data-testid="confirmar-salidas-seguras"]') as HTMLButtonElement).disabled).toBe(true);
    const reintentar = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Volver a intentar')!;
    await act(async () => reintentar.click());
    await act(async () => {});
    expect(enElDialogo('[data-testid="seguras-resumen"]')).not.toBeNull();
  });
});
