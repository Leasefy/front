/**
 * «Para tener este inmueble en regla» (revisión de diseño 21-10-2026): cada renglón sale
 * de un dato real; lo que no se pudo revisar no se afirma.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import type { Property } from '@/lib/types/property';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ documentos: vi.fn(), firmas: vi.fn() }));
vi.mock('@/lib/api/crm.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/crm.service')>()),
  captacionApi: { documentos: h.documentos, firmas: h.firmas },
}));
vi.mock('@/components/inmobiliaria/inmueble/UbicarEnElMapaDialog', () => ({ UbicarEnElMapaDialog: () => null }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { LoQueFaltaDelInmueble } from './LoQueFaltaDelInmueble';

const CONSIGNACION = { id: 'c-1', propertyId: 'p-1', propertyAddress: 'Cra 1', propertyCity: 'Caldas', contractEndDate: undefined } as unknown as Consignacion;
const SIN_MAPA = { id: 'p-1', latitude: null, longitude: null, images: [] } as unknown as Property;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  h.documentos.mockResolvedValue({
    yaHuboGiros: false,
    paraPublicar: { completo: false, falta: [{ tipo: 'CEDULA', nombre: 'Cédula', porQue: 'FALTA', detalle: '' }] },
    paraElPrimerGiro: { completo: false, falta: [{ tipo: 'RUT', nombre: 'RUT', porQue: 'FALTA', detalle: '' }] },
    documentos: [],
  });
  h.firmas.mockResolvedValue({ disponible: true, motivo: null, firmas: [] });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar(over: Partial<React.ComponentProps<typeof LoQueFaltaDelInmueble>> = {}) {
  await act(async () => {
    root.render(
      <LoQueFaltaDelInmueble
        consignacion={CONSIGNACION}
        property={SIN_MAPA}
        arrendado
        onEditar={vi.fn()}
        onActualizado={vi.fn()}
        puedeEditar
        {...over}
      />,
    );
  });
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('<LoQueFaltaDelInmueble>', () => {
  it('dice lo que falta con datos reales: vencimiento, firma, papeles y mapa', async () => {
    await pintar();
    const t = container.textContent ?? '';
    expect(t).toContain('Poner la fecha de vencimiento del mandato');
    expect(t).toContain('Firmar el mandato');
    expect(t).toContain('Faltan 2 papeles');
    expect(t).toContain('Ubicar el inmueble en el mapa');
  });

  it('arrendado no pide fotos; disponible sí', async () => {
    await pintar({ arrendado: true });
    expect(container.textContent).not.toContain('Agregar las fotos');
    await pintar({ arrendado: false });
    expect(container.textContent).toContain('Agregar las fotos');
  });

  it('con el enlace de firma mandado, lo dice con el nombre de quien firma', async () => {
    h.firmas.mockResolvedValue({ disponible: true, motivo: null, firmas: [{ id: 'f', forma: 'ELECTRONICA', estado: 'PENDIENTE', firmanteNombre: 'Sandra', firmanteCorreo: null, venceEl: null }] });
    await pintar();
    expect(container.textContent).toContain('Se le mandó el enlace a Sandra');
  });
});
