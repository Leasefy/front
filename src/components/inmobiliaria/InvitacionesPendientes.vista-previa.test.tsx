/**
 * QA-INQ-95 (IV-11, R-22 del CEO: «la invitación es manual, por lote y con
 * vista previa»): el cajón de invitaciones deja ver el correo antes de «Enviar
 * a todos».
 */
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

const { pendientes, enviar, vistaPrevia, toastOk, toastError, permisos } = vi.hoisted(() => ({
  pendientes: vi.fn(),
  enviar: vi.fn(),
  vistaPrevia: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
  permisos: { valor: null as null | { canAccess: (m: string, a: string) => boolean } },
}));

vi.mock('@/lib/api/invitaciones.service', () => ({ invitacionesApi: { pendientes, enviar, vistaPrevia } }));
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

describe('IV-11 · ver el correo antes de mandarlo', () => {
  it('«Ver el correo» pide la vista previa con el nombre de la primera persona y la muestra', async () => {
    pendientes.mockResolvedValue({ total: 2, vencidas: 0, personas: [persona(1, { nombre: 'Gloria Úsuga' }), persona(2)] });
    vistaPrevia.mockResolvedValue({ asunto: 'Tu acceso al portal de Inmobiliaria Lab', html: '<p>Hola, Gloria:</p>', vigencia: '7 días' });
    await montar();
    await clic(porTestId('ver-invitaciones-pendientes')!);
    const ver = porTestId('ver-correo-de-invitacion') as HTMLButtonElement;
    expect(ver).not.toBeNull();
    await clic(ver);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(vistaPrevia).toHaveBeenCalledWith('Gloria Úsuga');
    const dialogo = document.querySelector('[data-testid="vista-previa-de-la-invitacion"]');
    expect(dialogo?.textContent).toContain('Tu acceso al portal de Inmobiliaria Lab');
    expect(dialogo?.querySelector('iframe')?.getAttribute('srcdoc')).toContain('Hola, Gloria:');
    expect(enviar).not.toHaveBeenCalled();
  });
});
