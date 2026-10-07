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

describe('I-24 · el motivo en palabras', () => {
  it.each(CODIGOS)('%s nunca sale crudo', (codigo) => {
    const frase = fraseDelMotivo(codigo);
    expect(frase).not.toContain(codigo);
    expect(frase).not.toMatch(/[A-Z]{3,}_[A-Z]/);
    expect(frase.length).toBeGreaterThan(20);
  });

  it('🔴 reenviar a un correo de dominio reservado dice qué pasa y qué hacer, no «DOMINIO_NO_ENTREGABLE»', async () => {
    pendientes.mockResolvedValue({ total: 1, personas: [persona(1)] });
    enviar.mockResolvedValue({
      enviadas: 0,
      omitidas: 1,
      resultados: [{ userId: 'u-1', enviada: false, motivo: 'DOMINIO_NO_ENTREGABLE' }],
      restantes: 1,
    });
    await montar();
    await clic(porTestId('ver-invitaciones-pendientes')!);
    await clic(boton('Enviar')!);
    const [, { description }] = toastError.mock.calls[0] as [string, { description: string }];
    expect(description).not.toContain('DOMINIO_NO_ENTREGABLE');
    expect(description).toContain('dominio que no recibe mensajes');
  });

  it('🔴 E-13: si no salió ninguna, dice el motivo que dio el back (no siempre «el correo del servidor»)', () => {
    expect(
      porQueNoSalioNinguna([
        { userId: 'a', enviada: false, motivo: 'RECIEN_ENVIADA' },
        { userId: 'b', enviada: false, motivo: 'RECIEN_ENVIADA' },
        { userId: 'c', enviada: false, motivo: 'ENVIO_FALLIDO' },
      ]),
    ).toContain('hace menos de 10 minutos');
    expect(porQueNoSalioNinguna([{ userId: 'a', enviada: false, motivo: 'CORREO_NO_CONFIGURADO' }])).toContain(
      'no está disponible',
    );
  });
});

describe('E-15 · un fallo no se ve como «no hay pendientes»', () => {
  it('🔴 un 500 al leer lo dice, con reintentar', async () => {
    pendientes.mockRejectedValueOnce(new ApiError(500, 'x', 'ERROR_INTERNO'));
    pendientes.mockResolvedValueOnce({ total: 3, personas: [persona(1)] });
    await montar();
    expect(porTestId('invitaciones-sin-leer')!.textContent).toContain('No pudimos revisar');
    await clic(boton('Reintentar')!);
    expect(porTestId('invitaciones-pendientes')).not.toBeNull();
  });

  it('sin respuesta (la red) también se dice', async () => {
    pendientes.mockRejectedValue(new TypeError('Failed to fetch'));
    await montar();
    expect(porTestId('invitaciones-sin-leer')).not.toBeNull();
  });

  it('un 403 sigue callado: el aviso no le corresponde', async () => {
    pendientes.mockRejectedValue(new ApiError(403, 'No', 'SIN_PERMISO_DE_MODULO'));
    await montar();
    expect(porTestId('invitaciones-sin-leer')).toBeNull();
    expect(porTestId('invitaciones-pendientes')).toBeNull();
  });
});

describe('I-26 · sin clientes:edit no se ofrece mandar', () => {
  it('🔴 el contador ve el aviso, sin «Ver y enviar», y sabe a quién pedírselo', async () => {
    permisos.valor = { canAccess: (m, a) => !(m === 'clientes' && a === 'edit') };
    pendientes.mockResolvedValue({ total: 2, personas: [persona(1), persona(2)] });
    await montar();
    expect(porTestId('invitaciones-pendientes')).not.toBeNull();
    expect(porTestId('ver-invitaciones-pendientes')).toBeNull();
    expect(porTestId('invitaciones-sin-permiso')!.textContent).toContain('administrador');
  });

  it('el administrador sí lo ve', async () => {
    permisos.valor = { canAccess: () => true };
    pendientes.mockResolvedValue({ total: 2, personas: [persona(1)] });
    await montar();
    expect(porTestId('ver-invitaciones-pendientes')).not.toBeNull();
    expect(porTestId('invitaciones-sin-permiso')).toBeNull();
  });
});

describe('E-12 · la vigencia de cada invitación', () => {
  it('🔴 dice cuándo vence, marca la vencida, ofrece «Reenviar» y el pie dice 7 días', async () => {
    pendientes.mockResolvedValue({
      total: 3,
      personas: [
        persona(1, { ultimoEnvio: '2026-10-01T10:00:00.000Z', vence: '2026-10-08T10:00:00.000Z', vencida: false, diasDeVigencia: 7 }),
        persona(2, { ultimoEnvio: '2026-09-01T10:00:00.000Z', vence: '2026-09-08T10:00:00.000Z', vencida: true, diasDeVigencia: 7 }),
        persona(3, { vence: null, vencida: false, diasDeVigencia: 7 }),
      ],
    });
    await montar();
    await clic(porTestId('ver-invitaciones-pendientes')!);
    const filas = Array.from(host.querySelectorAll('[data-testid="invitacion-fila"]'));
    expect(filas[0].querySelector('[data-testid="invitacion-vence"]')!.textContent).toMatch(/^Vence el 8 de octubre/);
    expect(filas[1].querySelector('[data-testid="invitacion-vencida"]')!.textContent).toMatch(/^Venció el 8 de septiembre/);
    expect(filas[2].querySelector('[data-testid="invitacion-vence"]')).toBeNull();
    expect(filas[0].textContent).toContain('Reenviar');
    expect(filas[1].textContent).toContain('Reenviar');
    expect(filas[2].textContent).toContain('Enviar');
    expect(porTestId('pie')!.textContent).toContain('Vence en 7 días');
    expect(porTestId('pie')!.textContent).not.toContain('24 horas');
  });
});

describe('E-12 · las vencidas aparte', () => {
  it('🔴 «no les ha llegado» cuenta total − vencidas, y las vencidas se dicen aparte', async () => {
    pendientes.mockResolvedValue({ total: 5, vencidas: 2, personas: [persona(1)] });
    await montar();
    const aviso = porTestId('invitaciones-pendientes')!;
    expect(aviso.textContent).toContain('A 3 inquilinos no les ha llegado');
    expect(porTestId('invitaciones-vencidas')!.textContent).toContain('Y a 2 se les venció');
    await clic(porTestId('ver-invitaciones-pendientes')!);
    expect(porTestId('enviar-todas-las-invitaciones')!.textContent).toContain('Enviar a todos (3)');
  });

  it('sólo vencidas: el aviso lo dice y «Enviar a todos» queda apagado (se reenvían una por una)', async () => {
    pendientes.mockResolvedValue({ total: 2, vencidas: 2, personas: [persona(1, { vencida: true })] });
    await montar();
    expect(porTestId('invitaciones-pendientes')!.textContent).toContain('A 2 inquilinos se les venció la invitación');
    await clic(porTestId('ver-invitaciones-pendientes')!);
    expect((porTestId('enviar-todas-las-invitaciones') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('I-23 y el cajón a sangre', () => {
  it('🔴 subir `version` vuelve a leer el aviso', async () => {
    pendientes.mockResolvedValue({ total: 2, personas: [persona(1)] });
    await montar(0);
    expect(pendientes).toHaveBeenCalledTimes(1);
    await act(async () => {
      root!.render(<InvitacionesPendientes version={1} />);
    });
    expect(pendientes).toHaveBeenCalledTimes(2);
  });

  it('🔴 la tabla toca los bordes del cajón y la primera y la última celda llevan su padding (px-6)', async () => {
    pendientes.mockResolvedValue({ total: 1, personas: [persona(1)] });
    await montar();
    await clic(porTestId('ver-invitaciones-pendientes')!);
    const tabla = porTestId('invitaciones-tabla')!;
    expect(tabla.className).toContain('-mx-6');
    const ths = Array.from(tabla.querySelectorAll('th'));
    expect(ths[0].className).toContain('pl-6');
    expect(ths.at(-1)!.className).toContain('pr-6');
    const tds = Array.from(tabla.querySelectorAll('[data-testid="invitacion-fila"] td'));
    expect(tds[0].className).toContain('pl-6');
    expect(tds.at(-1)!.className).toContain('pr-6');
  });
});
