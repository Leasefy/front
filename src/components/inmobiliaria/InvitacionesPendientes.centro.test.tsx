/**
 * QA-INQ (03-10-2026) · el aviso y el cajón de invitaciones al portal.
 *
 *  · I-24: nunca el código crudo (`DOMINIO_NO_ENTREGABLE`…): una frase con qué hacer.
 *  · E-13: «no salió ninguna» dice POR QUÉ, leído de lo que contestó el back.
 *  · E-15: un 5xx o la red no se ven como «no hay pendientes».
 *  · I-26: sin `clientes:edit` no se ofrece mandar; se dice a quién pedírselo.
 *  · E-12 (Nico): cuándo vence cada una, la vencida marcada, «Reenviar» y 7 días en el pie.
 *  · I-23: `version` vuelve a leer el aviso.
 *  · Nico (03-10): la tabla va A SANGRE dentro del cajón.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { pendientes, enviar, toastOk, toastError, permisos } = vi.hoisted(() => ({
  pendientes: vi.fn(),
  enviar: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
  permisos: { valor: null as null | { canAccess: (m: string, a: string) => boolean } },
}));

vi.mock('@/lib/api/invitaciones.service', () => ({ invitacionesApi: { pendientes, enviar } }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: toastOk, error: toastError } }));
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => permisos.valor }));
vi.mock('@/components/ui/cajon', () => ({
  Cajon: ({ abierto, children }: { abierto: boolean; children: React.ReactNode }) =>
    abierto ? <div data-testid="cajon">{children}</div> : null,
  CajonCabecera: ({ titulo }: { titulo: React.ReactNode }) => <div>{titulo}</div>,
  CajonCuerpo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children, ayuda }: { children: React.ReactNode; ayuda?: React.ReactNode }) => (
    <div data-testid="pie">
      {ayuda}
      {children}
    </div>
  ),
}));

const correr = vi.hoisted(() => vi.fn());
vi.mock('@/lib/procesos/en-el-centro', () => ({ correrEnElNavegador: correr }));

import { ApiError } from '@/lib/api/client';
import { InvitacionesPendientes, fraseDelMotivo, porQueNoSalioNinguna } from './InvitacionesPendientes';

const persona = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `u-${n}`,
  correo: `persona${n}@correo.co`,
  nombre: `Persona ${n}`,
  creada: '2026-09-08T10:00:00.000Z',
  ultimoEnvio: null,
  ...extra,
});

let host: HTMLDivElement;
let root: Root | undefined;

async function montar(version = 0) {
  host = document.createElement('div');
  document.body.appendChild(host);
  const r = createRoot(host);
  root = r;
  await act(async () => {
    r.render(<InvitacionesPendientes version={version} />);
  });
}
async function clic(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}
const porTestId = (id: string) => host.querySelector(`[data-testid="${id}"]`);
const boton = (texto: string) =>
  Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);

beforeEach(() => {
  correr.mockReset();
  pendientes.mockReset();
  enviar.mockReset();
  toastOk.mockReset();
  toastError.mockReset();
  permisos.valor = null;
});
afterEach(() => {
  // Los casos de las funciones puras no montan nada.
  const r = root;
  if (r) act(() => r.unmount());
  host?.remove();
  root = undefined;
});

const CODIGOS = ['RECIEN_ENVIADA', 'DOMINIO_NO_ENTREGABLE', 'CORREO_NO_CONFIGURADO', 'ENVIO_FALLIDO', 'ERROR', 'OTRO_CODIGO'];


describe('QA-INQ-95 E-28 · «Enviar a todos» va por el centro de procesos', () => {
  it('abre un proceso ENVIO_MASIVO, cuenta el avance y manda las tandas adentro', async () => {
    permisos.valor = { canAccess: () => true };
    pendientes.mockResolvedValue({ total: 3, vencidas: 0, personas: [persona(1), persona(2), persona(3)] });
    enviar
      .mockResolvedValueOnce({ enviadas: 2, omitidas: 0, resultados: [], restantes: 1 })
      .mockResolvedValueOnce({ enviadas: 1, omitidas: 0, resultados: [], restantes: 0 });
    const avances: Array<[number, unknown]> = [];
    correr.mockImplementation(async ({ trabajo }: { trabajo: (ctx: unknown) => Promise<unknown> }) => {
      const resultado = await trabajo({
        procesoId: 'p-1',
        avanzar: async (n: number, extra: unknown) => { avances.push([n, extra]); return true; },
        debeParar: () => false,
      });
      return { procesoId: 'p-1', enElCentro: true, detenido: false, resultado };
    });
    await montar();
    const ver = host.querySelector('[data-testid="ver-invitaciones-pendientes"]') as HTMLButtonElement;
    await act(async () => { ver.click(); });
    const todos = host.querySelector('[data-testid="enviar-todas-las-invitaciones"]') as HTMLButtonElement;
    await act(async () => { todos.click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    expect(correr).toHaveBeenCalledTimes(1);
    expect(correr.mock.calls[0][0]).toMatchObject({ tipo: 'ENVIO_MASIVO', titulo: 'Mandar 3 invitaciones al portal', total: 3 });
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(avances.map(([n]) => n)).toEqual([2, 3]);
    expect(toastOk).toHaveBeenCalledWith('Salieron 3 invitaciones', expect.anything());
  });

  it('«Detener» desde el centro corta entre dos tandas', async () => {
    permisos.valor = { canAccess: () => true };
    pendientes.mockResolvedValue({ total: 5, vencidas: 0, personas: [persona(1)] });
    enviar.mockResolvedValue({ enviadas: 1, omitidas: 0, resultados: [], restantes: 4 });
    correr.mockImplementation(async ({ trabajo }: { trabajo: (ctx: unknown) => Promise<unknown> }) => ({
      procesoId: 'p-2', enElCentro: true, detenido: true,
      resultado: await trabajo({ procesoId: 'p-2', avanzar: async () => false, debeParar: () => true }),
    }));
    await montar();
    await act(async () => { (host.querySelector('[data-testid="ver-invitaciones-pendientes"]') as HTMLButtonElement).click(); });
    await act(async () => { (host.querySelector('[data-testid="enviar-todas-las-invitaciones"]') as HTMLButtonElement).click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});
