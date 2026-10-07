/**
 * 🔴 #2 LA CAPTACIÓN EN EL LEAD (FALTANTES, 05-10-2026).
 *
 *   · la casilla «Es propietario» llama al back y muestra que el Piloto prepara;
 *   · el «Borrador de captación» dice propietario, inmueble, tarea y respuesta, y
 *     que no cuenta en ninguna otra parte;
 *   · convertir pide confirmación y, hecho, ofrece «Crear su inmueble» con el
 *     propietario escogido; sin `propietarios:create` no se ofrece.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, puede } = vi.hoisted(() => ({
  api: { delLead: vi.fn(), marcar: vi.fn(), descartar: vi.fn(), convertir: vi.fn() },
  puede: { propietarios: true },
}));

vi.mock('@/lib/api/captacion-del-lead.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/captacion-del-lead.service')>()),
  captacionDelLeadApi: api,
}));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ canAccess: (m: string) => (m === 'propietarios' ? puede.propietarios : true) }),
}));

import { CaptacionDelLead, instanteEnPalabras } from './CaptacionDelLead';

const BORRADOR = {
  disponible: true,
  motivo: null,
  captacion: {
    id: 'cap-1',
    origen: 'CASILLA',
    estado: 'BORRADOR',
    frase: null,
    propietario: { nombre: 'Marta Lucía Restrepo', correo: 'marta@example.test', telefono: '+573001112233' },
    inmueble: { tipo: 'Apartamento', loQueDijo: 'quiero arrendar mi apartamento de laureles' },
    tareaId: 'tarea-1',
    propietarioId: null,
    respuesta: { estado: 'programada', cuando: '2026-10-05T12:00:00.000Z', resultado: null },
    creadaEl: '2026-10-05T14:00:00.000Z',
  },
};

let host: HTMLDivElement;
let root: Root;
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  puede.propietarios = true;
  for (const f of Object.values(api)) f.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('CaptacionDelLead', () => {
  it('la hora de la casa de un instante', () => {
    expect(instanteEnPalabras('2026-10-05T12:00:00.000Z')).toBe('el 5 de octubre de 2026 a las 7:00 a. m.');
  });

  it('sin captación: la casilla apagada; al marcarla, el Piloto prepara', async () => {
    api.delLead.mockResolvedValue({ disponible: true, motivo: null, captacion: null });
    api.marcar.mockResolvedValue({ ...BORRADOR, captacion: { ...BORRADOR.captacion, estado: 'DETECTADA' } });
    await act(async () => root.render(<CaptacionDelLead pipelineItemId="lead-1" puedeEditar />));
    await esperar();
    const casilla = host.querySelector('[data-testid="captacion-casilla"]') as HTMLElement;
    expect(casilla.getAttribute('aria-checked') ?? casilla.getAttribute('data-state')).toMatch(/false|unchecked/);
    await act(async () => casilla.click());
    await esperar();
    expect(api.marcar).toHaveBeenCalledWith('lead-1', true);
    expect(host.querySelector('[data-testid="captacion-preparando"]')?.textContent).toMatch(/El Piloto está preparando el borrador/);
  });

  it('el borrador dice qué hay y que no cuenta en ninguna otra parte', async () => {
    api.delLead.mockResolvedValue(BORRADOR);
    await act(async () => root.render(<CaptacionDelLead pipelineItemId="lead-1" puedeEditar />));
    await esperar();
    const b = host.querySelector('[data-testid="captacion-borrador"]')!;
    expect(b.textContent).toMatch(/Borrador de captación/);
    expect(host.querySelector('[data-testid="captacion-propietario"]')!.textContent).toBe('Marta Lucía Restrepo · +573001112233 · marta@example.test');
    expect(host.querySelector('[data-testid="captacion-inmueble"]')!.textContent).toMatch(/^Apartamento/);
    expect(host.querySelector('[data-testid="captacion-respuesta"]')!.textContent).toBe(
      'Sale el 5 de octubre de 2026 a las 7:00 a. m., cuando abre el horario de contacto',
    );
    expect(b.textContent).toMatch(/no cuenta en Propietarios, Inmuebles ni en los indicadores hasta que lo conviertas/);
  });

  it('convertir pide confirmación y deja «Crear su inmueble» con el propietario escogido', async () => {
    api.delLead.mockResolvedValueOnce(BORRADOR).mockResolvedValue({
      ...BORRADOR,
      captacion: { ...BORRADOR.captacion, estado: 'CONVERTIDA', propietarioId: 'prop-1' },
    });
    api.convertir.mockResolvedValue({ propietarioId: 'prop-1', yaExistia: false, crearInmueble: '/panel/inmobiliaria/inmuebles/nuevo?propietarioId=prop-1&volver=/panel/inmobiliaria/pipeline' });
    await act(async () => root.render(<CaptacionDelLead pipelineItemId="lead-1" puedeEditar />));
    await esperar();
    await act(async () => (host.querySelector('[data-testid="captacion-convertir"]') as HTMLElement).click());
    await esperar();
    expect(api.convertir).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="captacion-confirmar"]')!.textContent).toMatch(/sin documento \(lo completas antes del mandato\)/);
    await act(async () => (host.querySelector('[data-testid="captacion-convertir-si"]') as HTMLElement).click());
    await esperar();
    expect(api.convertir).toHaveBeenCalledWith('cap-1');
    const crear = host.querySelector('[data-testid="captacion-crear-inmueble"]') as HTMLAnchorElement;
    expect(crear.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/nuevo?propietarioId=prop-1&volver=/panel/inmobiliaria/pipeline');
    // Convertida ya no dice que es un borrador (navegador, 05-10).
    expect(host.querySelector('[data-testid="captacion-nota"]')!.textContent).toMatch(/^Ya es una ficha de Propietarios/);
    expect(host.textContent).not.toMatch(/hasta que lo conviertas/);
  });

  it('una respuesta retenida por el interruptor de correos del ambiente lo dice, no sólo «Enviada»', async () => {
    api.delLead.mockResolvedValue({
      ...BORRADOR,
      captacion: {
        ...BORRADOR.captacion,
        respuesta: { estado: 'enviada', cuando: '2026-10-05T16:53:29.000Z', resultado: 'Enviada (el interruptor de correos de este ambiente la retuvo).' },
      },
    });
    await act(async () => root.render(<CaptacionDelLead pipelineItemId="lead-1" puedeEditar />));
    await esperar();
    expect(host.querySelector('[data-testid="captacion-respuesta-detalle"]')!.textContent).toBe(
      'Enviada (el interruptor de correos de este ambiente la retuvo).',
    );
  });

  it('sin permiso de crear propietarios no se ofrece convertir', async () => {
    puede.propietarios = false;
    api.delLead.mockResolvedValue(BORRADOR);
    await act(async () => root.render(<CaptacionDelLead pipelineItemId="lead-1" puedeEditar />));
    await esperar();
    expect(host.querySelector('[data-testid="captacion-convertir"]')).toBeNull();
    expect(host.textContent).toMatch(/Lo convierte quien puede crear propietarios/);
  });

  it('sin la migración lo dice y no muestra la casilla', async () => {
    api.delLead.mockResolvedValue({ disponible: false, motivo: 'La captación todavía no está disponible en esta base.', captacion: null });
    await act(async () => root.render(<CaptacionDelLead pipelineItemId="lead-1" puedeEditar />));
    await esperar();
    expect(host.querySelector('[data-testid="captacion-casilla"]')).toBeNull();
    expect(host.querySelector('[data-testid="captacion-no-disponible"]')!.textContent).toMatch(/no está disponible/);
  });
});
