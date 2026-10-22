/**
 * Portofino 22-10-2026: «subir un Excel en Proveedores», tal como venga.
 * Lo que fijan estas pruebas:
 *   - se leen las columnas que el lector reconoció y viaja el TEXTO de cada celda;
 *   - nada se registra hasta «Registrar N proveedores» (antes sólo se revisa);
 *   - lo que le falta a una fila se corrige AQUÍ y se vuelve a revisar;
 *   - cambiar una columna vuelve a revisar con la columna nueva;
 *   - al registrar se vuelve a leer la lista y se ve qué quedó.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  importar: vi.fn(),
  leerPlanilla: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api/proveedores-de-mantenimiento.service', () => ({
  proveedoresDeMantenimientoApi: { importar: h.importar },
}));
vi.mock('@/lib/importar/leer-planilla', () => ({ leerPlanilla: h.leerPlanilla }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('@/components/ui/cajon', () => ({
  Cajon: ({ abierto, children }: { abierto: boolean; children: React.ReactNode }) => (abierto ? <div>{children}</div> : null),
  CajonCabecera: ({ titulo }: { titulo: React.ReactNode }) => <h2>{titulo}</h2>,
  CajonCuerpo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children, ayuda }: { children: React.ReactNode; ayuda?: React.ReactNode }) => (
    <footer>
      {ayuda}
      {children}
    </footer>
  ),
}));
// El Select de Radix no se abre en happy-dom: cada opción es un botón.
vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<(v: string) => void>(() => {});
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
      <Ctx.Provider value={onValueChange}>
        <div data-valor={value}>{children}</div>
      </Ctx.Provider>
    ),
    SelectTrigger: ({ children, ...p }: { children: React.ReactNode; 'data-testid'?: string }) => <span data-testid={p['data-testid']}>{children}</span>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const elegir = React.useContext(Ctx);
      return (
        <button type="button" data-opcion={value} onClick={() => elegir(value)}>
          {children}
        </button>
      );
    },
  };
});
vi.mock('@/components/inmobiliaria/mantenimiento/TipoDeDocumentoDelProveedor', () => ({
  TipoDeDocumentoDelProveedor: ({ id, valor, onCambiar }: { id: string; valor: string; onCambiar: (t: string) => void }) => (
    <select id={id} value={valor} onChange={(e) => onCambiar(e.target.value)}>
      <option value="">—</option>
      <option value="CC">CC</option>
      <option value="NIT">NIT</option>
    </select>
  ),
}));

import { ImportarProveedores } from './ImportarProveedores';

const PLANILLA = {
  archivo: 'proveedores.xlsx',
  hoja: 'Proveedores',
  hojas: ['Proveedores'],
  filaDeEncabezado: 0,
  sinEncabezados: false,
  encabezados: ['Razón social', 'NIT/CC', 'Celular', 'Servicio'],
  filas: [
    { _rowIndex: 1, 'Razón social': 'Plomería El Rayo S.A.S.', 'NIT/CC': '900123456', Celular: '3001112233', Servicio: 'Plomería' },
    { _rowIndex: 2, 'Razón social': 'Juan Pérez', 'NIT/CC': 71234567, Celular: '', Servicio: 'Pintura' },
    { _rowIndex: 3, 'Razón social': '', 'NIT/CC': '', Celular: '', Servicio: '' },
  ],
  filasDeTotales: 0,
  mapeo: { nombre: 'Razón social', documento: 'NIT/CC', telefono: 'Celular', especialidades: 'Servicio' },
  puntajes: {},
};

const fila = (f: Partial<Record<string, unknown>>) => ({
  nombre: '',
  tipoDocumento: null,
  documento: '',
  telefono: null,
  correo: null,
  especialidades: [],
  notas: null,
  problemas: [],
  avisos: [],
  ...f,
});

const REVISION = {
  disponible: true,
  soloRevisar: true,
  total: 2,
  nuevos: 1,
  yaEstaban: 0,
  conProblema: 1,
  creados: 0,
  noSeCrearon: 0,
  filas: [
    fila({ fila: 2, estado: 'NUEVO', nombre: 'Plomería El Rayo S.A.S.', tipoDocumento: 'NIT', documento: '900123456-8', especialidades: ['PLUMBING'], avisos: ['El archivo no traía el tipo: se tomó como NIT porque el nombre es de una empresa. Revísalo.'] }),
    fila({ fila: 3, estado: 'CON_PROBLEMA', nombre: 'Juan Pérez', documento: '71234567', especialidades: ['PAINTING'], problemas: ['Falta el tipo de documento: elige CC, NIT, CE, PPT o pasaporte.'] }),
  ],
};

let container: HTMLDivElement;
let root: Root;
const onImportado = vi.fn();

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  h.importar.mockReset();
  h.leerPlanilla.mockReset();
  h.leerPlanilla.mockResolvedValue(PLANILLA);
  h.importar.mockResolvedValue(REVISION);
  onImportado.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel);
async function clic(el: Element | null) {
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await esperar();
}

async function montarYSubir() {
  await act(async () => {
    root.render(<ImportarProveedores abierto onCerrar={() => {}} onImportado={onImportado} />);
  });
  const input = q<HTMLInputElement>('[data-testid="archivo-de-proveedores"]')!;
  const f = new File(['x'], 'proveedores.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  Object.defineProperty(input, 'files', { value: [f], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await esperar();
  await esperar();
  await esperar();
}

describe('ImportarProveedores', () => {
  it('revisa sin registrar: viaja el texto de cada celda y se ve qué pasará', async () => {
    await montarYSubir();
    expect(h.importar).toHaveBeenCalledTimes(1);
    const [filas, soloRevisar] = h.importar.mock.calls[0];
    expect(soloRevisar).toBe(true);
    // La fila vacía no viaja; el número de Excel viaja como texto.
    expect(filas).toEqual([
      { fila: 2, nombre: 'Plomería El Rayo S.A.S.', documento: '900123456', telefono: '3001112233', especialidades: 'Plomería' },
      { fila: 3, nombre: 'Juan Pérez', documento: '71234567', especialidades: 'Pintura' },
    ]);
    expect(q('[data-testid="pestana-NUEVO"]')?.textContent).toContain('1');
    expect(q('[data-testid="pestana-CON_PROBLEMA"]')?.textContent).toContain('1');
    expect(q('[data-testid="fila-importada-2"]')?.textContent).toContain('Se registra');
    expect(q('[data-testid="registrar-proveedores-del-archivo"]')?.textContent).toContain('Registrar 1 proveedor');
  });

  it('la fila con algo por corregir se corrige aquí y se vuelve a revisar', async () => {
    await montarYSubir();
    await clic(q('[data-testid="pestana-CON_PROBLEMA"]'));
    expect(q('[data-testid="fila-importada-3"]')?.textContent).toContain('Falta el tipo de documento');
    await clic(q('[data-testid="corregir-fila-3"]'));
    const tipo = q<HTMLSelectElement>('#tipo-3')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(tipo, 'CC');
      tipo.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await clic(q('[data-testid="listo-fila-3"]'));
    const [filas, soloRevisar] = h.importar.mock.calls[h.importar.mock.calls.length - 1];
    expect(soloRevisar).toBe(true);
    expect(filas[1]).toMatchObject({ fila: 3, nombre: 'Juan Pérez', tipoDocumento: 'CC', documento: '71234567' });
  });

  it('cambiar una columna vuelve a revisar con la columna nueva', async () => {
    await montarYSubir();
    const antes = h.importar.mock.calls.length;
    await clic(q('[data-testid="columna-telefono"]')!.parentElement!.querySelector('[data-opcion="—"]'));
    expect(h.importar.mock.calls.length).toBe(antes + 1);
    const [filas] = h.importar.mock.calls[h.importar.mock.calls.length - 1];
    expect(filas[0].telefono).toBeUndefined();
  });

  it('registrar: sólo entonces escribe, avisa y vuelve a leer la lista', async () => {
    await montarYSubir();
    h.importar.mockResolvedValueOnce({
      ...REVISION,
      soloRevisar: false,
      nuevos: 0,
      creados: 1,
      filas: [{ ...REVISION.filas[0], estado: 'CREADO', proveedorId: 'p-1' }, REVISION.filas[1]],
    });
    await clic(q('[data-testid="registrar-proveedores-del-archivo"]'));
    const [, soloRevisar] = h.importar.mock.calls[h.importar.mock.calls.length - 1];
    expect(soloRevisar).toBe(false);
    expect(onImportado).toHaveBeenCalledTimes(1);
    expect(h.toast.success).toHaveBeenCalledWith('Quedó 1 proveedor registrado', undefined);
    expect(q('[data-testid="fila-importada-2"]')?.textContent).toContain('Registrado');
    expect(q('[data-testid="registrar-proveedores-del-archivo"]')).toBeNull();
  });
});
