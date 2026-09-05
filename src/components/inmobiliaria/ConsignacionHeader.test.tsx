/**
 * ConsignacionHeader.test.tsx — property thumbnail + "Ver en Portal" button.
 *
 * T-0022 WU-1: `consignacion.propertyThumbnail` is never populated by the
 * back (see ledger §2.1) — the real photos live on the `Property` entity and
 * reach this component through a new `propertyThumbnailUrl` prop, resolved
 * by the page from `useProperty(consignacion.propertyId)`. These tests lock
 * the three honest states (has photo / zero photos / prop not passed yet)
 * and the "Ver en Portal" enable/disable contract that depends on
 * `consignacion.propertyId` being present.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    formatDate: (d: string) => d,
  }),
}));

import { ConsignacionHeader } from './ConsignacionHeader';

const BASE_CONSIGNACION: Consignacion = {
  id: 'c1',
  propertyId: 'prop-1',
  propietarioId: 'own-1',
  // Un solo dueño al 100 % — la forma que dejó el backfill de la migración.
  copropietarios: [{ propietarioId: 'own-1', participacionBps: 10000 }],
  agenteId: 'agent-1',
  propertyTitle: 'Apto Chapinero',
  propertyAddress: 'Cra 1 # 2-3',
  propertyCity: 'Bogotá',
  propertyZone: 'Chapinero',
  propertyType: 'apartment',
  monthlyRent: 2000000,
  commissionPercent: 10,
  listingType: 'rent',
  saleCommissionPercent: null,
  propertyCode: null,
  contractDate: '2026-01-01',
  status: 'active',
  availability: 'available',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => { root.unmount(); });
  container.remove();
  vi.restoreAllMocks();
});

function render(props: Partial<React.ComponentProps<typeof ConsignacionHeader>> = {}) {
  act(() => {
    root.render(<ConsignacionHeader consignacion={BASE_CONSIGNACION} {...props} />);
  });
}

function findViewPortalButton(): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('inmobiliaria.consignaciones.header.viewOnPortal'),
  );
}

describe('<ConsignacionHeader> — property thumbnail', () => {
  it('shows the placeholder icon when no photo is available yet', () => {
    render();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the property photo when propertyThumbnailUrl is provided', () => {
    render({ propertyThumbnailUrl: 'https://cdn.test/foto.jpg' });
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://cdn.test/foto.jpg');
  });

  it('falls back to the placeholder when the property has zero photos', () => {
    render({ propertyThumbnailUrl: '' });
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('<ConsignacionHeader> — Ver en Portal', () => {
  it('is enabled and fires onViewPortal when propertyId is present', () => {
    const onViewPortal = vi.fn();
    render({ onViewPortal });
    const button = findViewPortalButton();
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(false);
    act(() => { button?.click(); });
    expect(onViewPortal).toHaveBeenCalledTimes(1);
  });

  it('is disabled when propertyId is missing, and does not fire onViewPortal', () => {
    const onViewPortal = vi.fn();
    render({
      consignacion: { ...BASE_CONSIGNACION, propertyId: '' },
      onViewPortal,
    });
    const button = findViewPortalButton();
    expect(button?.disabled).toBe(true);
    act(() => { button?.click(); });
    expect(onViewPortal).not.toHaveBeenCalled();
  });
});

describe('<ConsignacionHeader> — abrir las fotos desde la portada', () => {
  // Nico (2026-09-02): «en la imagen me debería dejar ver todas las imágenes
  // que tenga el inmueble». Con fotos, la portada es un botón y hay una
  // píldora que dice cuántas hay; las dos abren el visor.
  it('con fotos, la portada y la píldora «Ver N fotos» abren el visor', () => {
    const onVerFotos = vi.fn();
    render({
      propertyThumbnailUrl: 'https://cdn.test/1.jpg',
      fotos: ['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg', 'https://cdn.test/3.jpg'],
      onVerFotos,
    });
    const portada = container.querySelector<HTMLButtonElement>('[data-testid="portada-abrir"]');
    const pildora = container.querySelector<HTMLButtonElement>('[data-testid="portada-ver-fotos"]');
    expect(portada).not.toBeNull();
    expect(pildora?.textContent).toContain('inmobiliaria.consignaciones.header.verFotos');
    act(() => { portada?.click(); });
    act(() => { pildora?.click(); });
    expect(onVerFotos).toHaveBeenCalledTimes(2);
  });

  it('sin fotos, la portada es una imagen a secas y no hay píldora', () => {
    render({ propertyThumbnailUrl: 'https://cdn.test/1.jpg', fotos: [], onVerFotos: vi.fn() });
    expect(container.querySelector('[data-testid="portada-abrir"]')).toBeNull();
    expect(container.querySelector('[data-testid="portada-ver-fotos"]')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });
});

/**
 * 🔴 «Renovar consignación» no renovaba nada.
 *
 * El ítem del menú llamaba a `onRenew`, y el único `onRenew` del panel
 * (`/inmuebles/[id]`) hacía `toast.info('Renovar consignación próximamente')`.
 * No hay endpoint: `consignacionesApi` no lo tiene, y el `RenovacionesService`
 * del back renueva CONTRATOS, que es otra cosa —el mandato con el propietario
 * no pasa por ahí—. Un renglón que sólo se disculpa ocupa el lugar de la
 * acción real y hace perder un clic cada vez que alguien lo busca.
 *
 * Se comprueba sobre la FUENTE y no sobre el DOM a propósito: el menú de los
 * tres puntos es un `DropdownList` de Radix, que en happy-dom no llega a
 * abrirse (necesita mediciones y capturas de puntero que el entorno no tiene),
 * así que un test de render pasaría por vacío —diría «no está» porque no hay
 * menú, no porque se haya quitado el ítem— y no mordería nada. La otra mitad
 * de la garantía la da el compilador: la prop `onRenew` ya no existe en el
 * tipo, así que volver a cablear el ítem rompe `tsc`.
 */
describe('<ConsignacionHeader> — el menú no ofrece lo que no existe', () => {
  it('ya no hay «Renovar consignación», y «Terminar» sigue estando', () => {
    const fuente = readFileSync(
      resolve(process.cwd(), 'src/components/inmobiliaria/ConsignacionHeader.tsx'),
      'utf8',
    );
    // El renglón muerto y su ícono se fueron…
    expect(fuente).not.toContain('renewConsignment');
    expect(fuente).not.toContain('onRenew?.()');
    expect(fuente).not.toContain('ArrowCounterClockwise');
    // …y la acción que sí funciona sigue ahí.
    expect(fuente).toContain('terminateConsignment');
    expect(fuente).toContain('onTerminate?.()');
  });
});
