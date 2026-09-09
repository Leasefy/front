/**
 * El aviso de invitaciones pendientes.
 *
 * Tres invariantes que impiden repetir el 8 de septiembre de 2026 —1.470
 * cuentas de inquilino creadas, 24 correos entregados—:
 *
 *  1. el aviso NO existe cuando no hay deuda (ni cuando no se puede saber);
 *  2. el número que muestra es el TOTAL, no lo que cabe en pantalla;
 *  3. mandar sigue llamando por tandas hasta agotar, y corta si una tanda no
 *     manda nada — decir «listo» con 1.400 personas afuera es exactamente el
 *     defecto original.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

// Sin esto React avisa «no configured to support act(...)» en cada render y el
// ruido tapa los fallos de verdad.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { pendientes, enviar, toastOk, toastError } = vi.hoisted(() => ({
  pendientes: vi.fn(),
  enviar: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api/invitaciones.service', () => ({
  invitacionesApi: { pendientes, enviar },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: toastOk, error: toastError },
}));

/*
 * El cajón real es un portal de Radix con animación; acá lo único que importa
 * es qué contiene y qué hacen sus botones, así que se renderiza en línea.
 */
vi.mock('@/components/ui/cajon', () => ({
  Cajon: ({ abierto, children }: { abierto: boolean; children: React.ReactNode }) =>
    abierto ? <div data-testid="cajon">{children}</div> : null,
  CajonCabecera: ({ titulo, descripcion }: { titulo: React.ReactNode; descripcion?: React.ReactNode }) => (
    <div>{titulo}{descripcion}</div>
  ),
  CajonCuerpo: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children, ayuda }: { children: React.ReactNode; ayuda?: React.ReactNode }) => (
    <div>{ayuda}{children}</div>
  ),
}));

import { InvitacionesPendientes } from './InvitacionesPendientes';

const persona = (n: number) => ({
  id: `u-${n}`,
  correo: `persona${n}@correo.co`,
  nombre: `Persona ${n}`,
  creada: '2026-09-08T10:00:00.000Z',
  ultimoEnvio: null,
});

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<InvitacionesPendientes />);
  });
}

async function clic(testid: string) {
  const boton = host.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
  expect(boton, `no existe [data-testid="${testid}"]`).not.toBeNull();
  await act(async () => {
    boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  pendientes.mockReset();
  enviar.mockReset();
  toastOk.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('InvitacionesPendientes', () => {
  it('sin deuda no se pinta nada: no es una sección, es algo que se salda', async () => {
    pendientes.mockResolvedValue({ total: 0, personas: [] });

    await montar();

    expect(host.querySelector('[data-testid="invitaciones-pendientes"]')).toBeNull();
  });

  it('sin permiso tampoco: el error no se vuelve un cartel rojo permanente', async () => {
    pendientes.mockRejectedValue(new Error('403'));

    await montar();

    expect(host.querySelector('[data-testid="invitaciones-pendientes"]')).toBeNull();
  });

  it('🔴 el número del aviso es el TOTAL, no las que caben en pantalla', async () => {
    pendientes.mockResolvedValue({ total: 1446, personas: [persona(1), persona(2)] });

    await montar();

    // Decir «2» sobre 1.446 personas sin portal es exactamente cómo esto pasó
    // desapercibido durante un día entero.
    const aviso = host.querySelector('[data-testid="invitaciones-pendientes"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('A 1446 inquilinos no les ha llegado');
  });

  it('🔴 «enviar a todos» sigue llamando por tandas hasta agotar', async () => {
    pendientes.mockResolvedValue({ total: 250, personas: [persona(1)] });
    enviar
      .mockResolvedValueOnce({ enviadas: 100, omitidas: 0, resultados: [], restantes: 150 })
      .mockResolvedValueOnce({ enviadas: 100, omitidas: 0, resultados: [], restantes: 50 })
      .mockResolvedValueOnce({ enviadas: 50, omitidas: 0, resultados: [], restantes: 0 });

    await montar();
    await clic('ver-invitaciones-pendientes');
    await clic('enviar-todas-las-invitaciones');

    expect(enviar).toHaveBeenCalledTimes(3);
    expect(toastOk).toHaveBeenCalledWith(
      'Salieron 250 invitaciones',
      expect.objectContaining({ description: 'Ya no queda ninguna pendiente.' }),
    );
  });

  it('si una tanda no manda ninguna, se corta en vez de repetirla para siempre', async () => {
    pendientes.mockResolvedValue({ total: 30, personas: [persona(1)] });
    enviar.mockResolvedValue({ enviadas: 0, omitidas: 30, resultados: [], restantes: 30 });

    await montar();
    await clic('ver-invitaciones-pendientes');
    await clic('enviar-todas-las-invitaciones');

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalled();
    expect(toastOk).not.toHaveBeenCalled();
  });

  it('el reenvío de una fila manda SÓLO ese id', async () => {
    pendientes.mockResolvedValue({ total: 2, personas: [persona(1), persona(2)] });
    enviar.mockResolvedValue({
      enviadas: 1,
      omitidas: 0,
      resultados: [{ userId: 'u-2', enviada: true }],
      restantes: 1,
    });

    await montar();
    await clic('ver-invitaciones-pendientes');

    const botones = Array.from(
      host.querySelectorAll<HTMLElement>('button'),
    ).filter((b) => b.textContent?.trim() === 'Enviar');
    expect(botones).toHaveLength(2);
    await act(async () => {
      botones[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(enviar).toHaveBeenCalledWith({ userIds: ['u-2'] });
    expect(toastOk).toHaveBeenCalledWith('Invitación enviada a persona2@correo.co');
  });
});
