/**
 * El publicador rápido con muchos inmuebles (Nico, 20-10-2026: «si llegan a
 * ser muchísimos inmuebles, ¿cómo escala esto?»): el Excel se vuelve
 * tarjetas, las carpetas se acomodan solas, lo que se repite se completa en
 * bloque y publicar no duplica nada.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, hoja } = vi.hoisted(() => ({
  api: {
    create: vi.fn(),
    uploadImage: vi.fn(),
    getImages: vi.fn(),
    update: vi.fn(async () => ({})),
  },
  hoja: { headers: [] as string[], rows: [] as Array<Record<string, unknown>> },
}));

vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: api }));
vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({
  ESPERA_ENTRE_BUSQUEDAS_MS: 0,
  ubicarDireccion: vi.fn(async ({ direccion }: { direccion: string }) =>
    direccion.startsWith('Calle 33') ? { precision: 'ninguna' } : { precision: 'direccion', lat: 6.25, lng: -75.58 },
  ),
}));
vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(async () => ({ headers: hoja.headers, rows: hoja.rows, sheetNames: ['Hoja1'] })),
}));
vi.mock('@/components/publicar/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) => (
    <input value={value} onChange={(e) => onChangeText(e.target.value)} />
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { ubicarDireccion } from '@/lib/inmuebles/ubicar-direccion';
import { PublicadorRapido } from './PublicadorRapido';

let raiz: Root;
let caja: HTMLDivElement;

beforeEach(() => {
  window.localStorage.clear();
  api.create.mockReset();
  api.uploadImage.mockReset();
  let n = 0;
  api.create.mockImplementation(async () => ({ id: `prop-${(n += 1)}` }));
  api.uploadImage.mockImplementation(async () => ({ id: 'img', url: 'u', order: 0 }));
  // El servidor «tiene» las fotos que subieron bien, por inmueble.
  vi.mocked(ubicarDireccion).mockImplementation(async ({ direccion }) =>
    String(direccion).startsWith('Calle 33') ? { precision: 'ninguna' } : { precision: 'direccion', lat: 6.25, lng: -75.58 },
  );
  api.update.mockClear();
  api.getImages.mockReset();
  api.getImages.mockImplementation(async (id: string) =>
    api.uploadImage.mock.calls
      .map((c, k) => ({ id: c[0] as string, ok: api.uploadImage.mock.settledResults[k]?.type === 'fulfilled' }))
      .filter((x) => x.id === id && x.ok),
  );
  if (!URL.createObjectURL) Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined });
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
});

afterEach(() => {
  act(() => raiz.unmount());
  caja.remove();
});

const por = (id: string) => caja.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const todos = (prefijo: string) => caja.querySelectorAll(`[data-testid^="${prefijo}"]`);

async function esperar(vueltas = 6) {
  for (let k = 0; k < vueltas; k += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

async function tocar(el: Element | null) {
  expect(el).not.toBeNull();
  await act(async () => {
    (el as HTMLElement).click();
  });
}

async function elegirArchivos(input: HTMLInputElement, archivos: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: archivos });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const foto = (ruta: string) => {
  const f = new File(['x'], ruta.split('/').pop() as string, { type: 'image/jpeg' });
  Object.defineProperty(f, 'webkitRelativePath', { value: ruta });
  return f;
};

function cargarHoja(filas: Array<[string, string, string, string, string, number, number]>) {
  hoja.headers = ['Código', 'Dirección', 'Ciudad', 'Barrio', 'Tipo', 'Canon', 'Habitaciones'];
  hoja.rows = filas.map(([codigo, dir, ciudad, barrio, tipo, canon, habs], k) => ({
    _rowIndex: k + 1,
    Código: codigo,
    Dirección: dir,
    Ciudad: ciudad,
    Barrio: barrio,
    Tipo: tipo,
    Canon: canon,
    Habitaciones: habs,
  }));
}

async function montar(paginaPublica: string | null = null) {
  await act(async () => {
    raiz.render(<PublicadorRapido usuario="u1" alTerminar={{ href: '/panel', texto: 'Entrar a mi cuenta' }} paginaPublica={paginaPublica} />);
  });
  await esperar();
}

async function subirExcel() {
  await tocar(por('camino-excel'));
  await elegirArchivos(por('excel-entrada') as HTMLInputElement, [new File(['x'], 'inmuebles.xlsx')]);
  await esperar();
}

describe('el publicador con muchos inmuebles (20-10-2026)', () => {
  it('cada fila del Excel es una tarjeta plegada; el tipo y la ciudad que faltan se completan en bloque', async () => {
    cargarHoja([
      ['INM-1', 'Cra 76 # 34-21 apto 301', 'Medellín', 'Laureles', 'Apartamento', 2_800_000, 3],
      ['INM-2', 'Calle 10 # 43-21', 'Medellín', 'Poblado', '', 3_500_000, 2],
      ['INM-3', 'Cra 43A # 1-50', 'Medellín', 'Poblado', '', 4_200_000, 3],
      ['INM-4', 'Calle 33 # 65-20', 'Medellín', 'Conquistadores', 'Casa', 5_000_000, 4],
      ['INM-5', 'Cra 70 # 44-10', '', 'Estadio', 'Apartaestudio', 1_600_000, 1],
      ['INM-6', 'Cra 70 # 44-12', '', 'Estadio', 'Apartaestudio', 1_700_000, 1],
    ]);
    await montar();
    await subirExcel();

    expect(por('titulo-publicador')?.textContent).toBe('Tus 6 inmuebles');
    expect(todos('fila-inmueble-')).toHaveLength(6);
    expect(por('traer-muchos')?.textContent).toContain('Leímos 6 filas: 6 inmuebles más abajo.');
    expect(por('traer-muchos')?.textContent).toContain('A 4 les falta un dato además de las fotos');

    const bloque = por('completar-en-bloque') as HTMLElement;
    expect(bloque.textContent).toContain('A 2 les falta el tipo');
    expect(bloque.textContent).toContain('A 2 les falta la ciudad');
    await tocar(por('bloque-tipo-APARTMENT'));
    const ciudad = por('bloque-ciudad') as HTMLInputElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      set?.call(ciudad, 'Medellín');
      ciudad.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      (ciudad.form as HTMLFormElement).requestSubmit();
    });
    expect(por('completar-en-bloque')).toBeNull();
    expect(por('fila-inmueble-2')?.textContent).toContain('Apartamento en arriendo en Poblado');
  });

  it('las carpetas se acomodan con su fila por el código o la dirección; las demás son inmuebles nuevos', async () => {
    cargarHoja([
      ['INM-1', 'Cra 76 # 34-21 apto 301', 'Medellín', 'Laureles', 'Apartamento', 2_800_000, 3],
      ['INM-2', 'Calle 10 # 43-21', 'Medellín', 'Poblado', 'Apartamento', 3_500_000, 2],
      ['INM-3', 'Cra 43A # 1-50', 'Medellín', 'Poblado', 'Casa', 4_200_000, 3],
      ['INM-4', 'Calle 33 # 65-20', 'Medellín', 'Conquistadores', 'Casa', 5_000_000, 4],
    ]);
    await montar();
    await subirExcel();
    await tocar(por('camino-carpetas'));
    await elegirArchivos(por('carpetas-entrada') as HTMLInputElement, [
      foto('Fotos/INM-1/2.jpg'),
      foto('Fotos/INM-1/1.jpg'),
      foto('Fotos/inm 2/sala.jpg'),
      foto('Fotos/Cra 43A # 1-50/a.jpg'),
      foto('Fotos/Otra casa/a.jpg'),
    ]);
    await esperar(10);

    expect(por('traer-muchos')?.textContent).toContain('4 carpetas: 3 se acomodaron con su inmueble y 1 es un inmueble nuevo');
    expect(por('titulo-publicador')?.textContent).toBe('Tus 5 inmuebles');
    expect(por('fila-inmueble-1')?.textContent).toContain('Listo para publicar');
    expect(por('fila-inmueble-4')?.textContent).toContain('Falta al menos una foto');
    expect(por('fila-inmueble-5')?.textContent).toContain('Carpeta «Otra casa»');
  });

  it('publica cada uno con SU llave, las fotos en orden, y termina con el resumen y un solo enlace', async () => {
    cargarHoja([
      ['A', 'Cra 76 # 34-21 apto 301', 'Medellín', 'Laureles', 'Apartamento', 2_800_000, 3],
      ['B', 'Calle 10 # 43-21', 'Medellín', 'Poblado', 'Apartamento', 3_500_000, 2],
      ['C', 'Cra 43A # 1-50', 'Medellín', 'Poblado', 'Casa', 4_200_000, 3],
      ['D', 'Calle 33 # 65-20', 'Medellín', 'Conquistadores', 'Casa', 5_000_000, 4],
    ]);
    await montar('https://leasefy.co/i/agencia-1');
    await subirExcel();
    await tocar(por('camino-carpetas'));
    await elegirArchivos(por('carpetas-entrada') as HTMLInputElement, [
      foto('F/A/2.jpg'),
      foto('F/A/1.jpg'),
      foto('F/A/10.jpg'),
      foto('F/B/1.jpg'),
      foto('F/C/1.jpg'),
      foto('F/D/1.jpg'),
    ]);
    await esperar(10);
    expect(por('publicar-todos')?.textContent).toBe('Publicar los 4');

    await tocar(por('publicar-todos'));
    await esperar(12);

    expect(api.create).toHaveBeenCalledTimes(4);
    // El punto en el mapa viaja al crear; la que no se encontró, sin punto (nunca uno inventado).
    const cuerpos = api.create.mock.calls.map((c) => c[0] as { address: string; latitude?: number; longitude?: number });
    expect(cuerpos.find((b) => b.address.startsWith('Cra 76'))).toMatchObject({ latitude: 6.25, longitude: -75.58 });
    expect('latitude' in (cuerpos.find((b) => b.address.startsWith('Calle 33')) ?? {})).toBe(false);
    const llaves = api.create.mock.calls.map((c) => (c[1] as { idempotencyKey: string }).idempotencyKey);
    expect(new Set(llaves).size).toBe(4);
    for (const llave of llaves) expect(llave).toMatch(/^[A-Za-z0-9-]{8,64}$/);
    const deA = api.uploadImage.mock.calls.filter((c) => c[0] === 'prop-1').map((c) => (c[1] as File).name);
    expect(deA).toEqual(['1.jpg', '2.jpg', '10.jpg']);

    expect(por('cuantos-publicados')?.textContent).toBe('Ya están en el marketplace: 4');
    expect(por('mosaico-publicados')).not.toBeNull();
    expect(por('compartir-pagina')?.textContent).toContain('leasefy.co/i/agencia-1');
    expect(por('ver-la-lista')?.textContent).toContain('Ver la lista (4)');
  });

  it('al volver (pestaña recargada), recupera las tarjetas y sus fotos; una tarjeta en blanco no pisa el borrador', async () => {
    cargarHoja([
      ['A', 'Cra 76 # 34-21 apto 301', 'Medellín', 'Laureles', 'Apartamento', 2_800_000, 3],
      ['B', 'Calle 10 # 43-21', 'Medellín', 'Poblado', 'Apartamento', 3_500_000, 2],
      ['C', 'Cra 43A # 1-50', 'Medellín', 'Poblado', 'Casa', 4_200_000, 3],
      ['D', 'Calle 33 # 65-20', 'Medellín', 'Conquistadores', 'Casa', 5_000_000, 4],
    ]);
    await montar();
    await subirExcel();
    await tocar(por('camino-carpetas'));
    await elegirArchivos(por('carpetas-entrada') as HTMLInputElement, [foto('F/A/1.jpg'), foto('F/A/2.jpg'), foto('F/B/1.jpg')]);
    await esperar(10);

    // «Recargar»: se desmonta y se monta de nuevo, con el mismo navegador.
    act(() => raiz.unmount());
    raiz = createRoot(caja);
    await montar();
    expect(por('titulo-publicador')?.textContent).toBe('Tus 4 inmuebles');
    expect(caja.textContent).toContain('Recuperamos lo que dejaste: 4 inmuebles y 3 fotos.');
    expect(por('fila-inmueble-1')?.textContent).toContain('Listo para publicar');
  });

  it('el mapa no hace esperar: se publica sin punto y el punto se le pone después', async () => {
    let soltar: (v: { precision: 'direccion'; lat: number; lng: number }) => void = () => undefined;
    const lento = new Promise<{ precision: 'direccion'; lat: number; lng: number }>((r) => (soltar = r));
    vi.mocked(ubicarDireccion).mockImplementation(() => lento as never);
    cargarHoja([
      ['A', 'Cra 76 # 34-21 apto 301', 'Medellín', 'Laureles', 'Apartamento', 2_800_000, 3],
      ['B', 'Calle 10 # 43-21', 'Medellín', 'Poblado', 'Apartamento', 3_500_000, 2],
      ['C', 'Cra 43A # 1-50', 'Medellín', 'Poblado', 'Casa', 4_200_000, 3],
      ['D', 'Cra 70 # 44-10', 'Medellín', 'Estadio', 'Casa', 5_000_000, 4],
    ]);
    await montar();
    await subirExcel();
    await tocar(por('camino-carpetas'));
    await elegirArchivos(por('carpetas-entrada') as HTMLInputElement, [foto('F/A/1.jpg'), foto('F/B/1.jpg'), foto('F/C/1.jpg'), foto('F/D/1.jpg')]);
    await esperar(10);
    await tocar(por('publicar-todos'));
    await esperar(12);

    expect(api.create).toHaveBeenCalledTimes(4);
    for (const c of api.create.mock.calls) expect('latitude' in (c[0] as object)).toBe(false);
    expect(por('ubicando-en-el-mapa')?.textContent).toContain('Poniendo 4 en el mapa');

    await act(async () => soltar({ precision: 'direccion', lat: 6.25, lng: -75.58 }));
    await esperar(12);
    expect(api.update).toHaveBeenCalledTimes(4);
    expect(api.update).toHaveBeenCalledWith('prop-1', { latitude: 6.25, longitude: -75.58 });
    expect(por('ubicando-en-el-mapa')).toBeNull();
    vi.mocked(ubicarDireccion).mockReset();
  });

  it('si se corta después de crear, publicar otra vez NO crea de nuevo: sólo sube lo que faltó', async () => {
    cargarHoja([
      ['A', 'Cra 76 # 34-21 apto 301', 'Medellín', 'Laureles', 'Apartamento', 2_800_000, 3],
      ['B', 'Calle 10 # 43-21', 'Medellín', 'Poblado', 'Apartamento', 3_500_000, 2],
      ['C', 'Cra 43A # 1-50', 'Medellín', 'Poblado', 'Casa', 4_200_000, 3],
      ['D', 'Calle 33 # 65-20', 'Medellín', 'Conquistadores', 'Casa', 5_000_000, 4],
    ]);
    let primera = true;
    api.uploadImage.mockImplementation(async (_id: string, f: File) => {
      if (f.name === 'b2.jpg' && primera) {
        primera = false;
        throw new Error('se cayó la red');
      }
      return { id: 'img', url: 'u', order: 0 };
    });
    await montar();
    await subirExcel();
    await tocar(por('camino-carpetas'));
    await elegirArchivos(por('carpetas-entrada') as HTMLInputElement, [
      foto('F/A/a1.jpg'),
      foto('F/B/b1.jpg'),
      foto('F/B/b2.jpg'),
      foto('F/C/c1.jpg'),
      foto('F/D/d1.jpg'),
    ]);
    await esperar(10);
    await tocar(por('publicar-todos'));
    await esperar(12);

    expect(api.create).toHaveBeenCalledTimes(4);
    expect(por('filtro-error')?.getAttribute('aria-selected')).toBe('true');
    expect(caja.textContent).toContain('Ya está publicado, pero 1 foto no subió');

    await tocar(por('publicar-todos'));
    await esperar(12);
    expect(api.create).toHaveBeenCalledTimes(4);
    expect(api.uploadImage.mock.calls.filter((c) => (c[1] as File).name === 'b1.jpg')).toHaveLength(1);
    expect(api.uploadImage.mock.calls.filter((c) => (c[1] as File).name === 'b2.jpg')).toHaveLength(2);
    expect(por('cuantos-publicados')?.textContent).toBe('Ya están en el marketplace: 4');
  });
});
