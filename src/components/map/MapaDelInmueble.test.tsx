/**
 * El mapa de la ficha que NO carga (Nico, 03-10-2026: «el mapa no carga y le
 * doy a cómo llegar y sí carga afuera, pero ahí mira que se ve como gris»).
 *
 * Sin su worker, MapLibre no pinta ni una tesela y la tarjeta quedaba gris,
 * muda, con el pin y los controles flotando. Ahora dice que el mapa no cargó y
 * deja «Abrir en Google Maps» a la mano; si el mapa termina de cargar, nada.
 *
 * MapLibre necesita WebGL (happy-dom no lo tiene): `react-map-gl/maplibre` va
 * con un doble que guarda sus props para disparar `onLoad` / `onError` a mano.
 * Convención del repo: createRoot + act + happy-dom (sin RTL).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type PropsDelMapa = { onLoad?: () => void; onError?: (e: { error: unknown }) => void; children?: React.ReactNode };
let ultimasProps: PropsDelMapa = {};

vi.mock('react-map-gl/maplibre', () => ({
  __esModule: true,
  default: (props: PropsDelMapa) => {
    ultimasProps = props;
    return <div data-testid="mock-map">{props.children}</div>;
  },
  Marker: (props: { children?: React.ReactNode }) => <div data-testid="mock-marker">{props.children}</div>,
  NavigationControl: () => null,
  AttributionControl: () => null,
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('./trabajador-de-maplibre', () => ({}));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

import { ESPERA_DEL_MAPA_MS, MapaDelInmueble, esFalloDelTrabajador, urlDeGoogleMaps } from './MapaDelInmueble';

const ERROR_DEL_WORKER = new Error('Worker failed to load. Check that the worker URL is correct.');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  ultimasProps = {};
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

async function pintar() {
  await act(async () => {
    root.render(<MapaDelInmueble latitude={6.2442} longitude={-75.5812} titulo="LAB-001" direccion="Calle 10 # 43-12, Medellín" />);
  });
}
const aviso = () => container.querySelector<HTMLElement>('[data-testid="mapa-no-cargo"]');
const enlacesAGoogleMaps = () =>
  Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).filter((a) => a.href === urlDeGoogleMaps(6.2442, -75.5812));

describe('esFalloDelTrabajador', () => {
  it('reconoce el error del worker de MapLibre', () => {
    expect(esFalloDelTrabajador(ERROR_DEL_WORKER)).toBe(true);
  });
  it('una tesela que falla no tumba el mapa', () => {
    expect(esFalloDelTrabajador(new Error('AJAXError: Not Found (404): https://tiles.openfreemap.org/x/1/2/3.pbf'))).toBe(false);
    expect(esFalloDelTrabajador(undefined)).toBe(false);
  });
});

describe('<MapaDelInmueble> cuando el mapa no carga', () => {
  it('sin worker: dice que el mapa no cargó y deja «Abrir en Google Maps» (una sola vez)', async () => {
    await pintar();
    expect(aviso()).toBeNull();
    await act(async () => ultimasProps.onError?.({ error: ERROR_DEL_WORKER }));
    const a = aviso();
    expect(a).not.toBeNull();
    expect(a!.getAttribute('role')).toBe('status');
    expect(a!.textContent).toContain('El mapa no cargó');
    const enlaces = enlacesAGoogleMaps();
    expect(enlaces).toHaveLength(1);
    expect(a!.contains(enlaces[0]!)).toBe(true);
    expect(enlaces[0]!.getAttribute('target')).toBe('_blank');
    // «Cómo llegar» sigue abajo.
    expect(container.textContent).toContain('Cómo llegar');
  });

  it('un error de tesela no muestra el aviso', async () => {
    await pintar();
    await act(async () => ultimasProps.onError?.({ error: new Error('AJAXError: Not Found (404)') }));
    expect(aviso()).toBeNull();
  });

  it(`si a los ${ESPERA_DEL_MAPA_MS / 1000} s el mapa no cargó, lo dice`, async () => {
    await pintar();
    await act(async () => vi.advanceTimersByTime(ESPERA_DEL_MAPA_MS - 1));
    expect(aviso()).toBeNull();
    await act(async () => vi.advanceTimersByTime(1));
    expect(aviso()).not.toBeNull();
  });

  it('si carga a tiempo, nunca aparece', async () => {
    await pintar();
    await act(async () => ultimasProps.onLoad?.());
    await act(async () => vi.advanceTimersByTime(ESPERA_DEL_MAPA_MS * 2));
    expect(aviso()).toBeNull();
    expect(enlacesAGoogleMaps()).toHaveLength(1);
    expect(container.querySelector('[data-testid="mapa-del-inmueble"]')?.getAttribute('data-estado')).toBe('listo');
  });

  it('un `load` tardío (red lenta) gana: el mapa queda «listo»', async () => {
    await pintar();
    await act(async () => vi.advanceTimersByTime(ESPERA_DEL_MAPA_MS));
    expect(container.querySelector('[data-testid="mapa-del-inmueble"]')?.getAttribute('data-estado')).toBe('fallo');
    await act(async () => ultimasProps.onLoad?.());
    expect(container.querySelector('[data-testid="mapa-del-inmueble"]')?.getAttribute('data-estado')).toBe('listo');
  });
});
