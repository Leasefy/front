/**
 * El cajón de renovación. Nico (2026-09-08): «un glow up de esto».
 *
 * Lo que se protege acá es que el cajón no MIENTA ni se quede trabado:
 *   - «enviar» dice por dónde le llega al inquilino, y a quien no tiene cuenta
 *     no le promete un panel;
 *   - el IPC se sugiere sólo si es el del año pasado; si no, se pide;
 *   - el mensaje sigue a los datos hasta que alguien lo toca, y se restaura;
 *   - el historial sale del detalle (la lista no lo trae);
 *   - un contrato migrado no se queda esperando una aceptación que nunca
 *     puede llegar: la inmobiliaria la registra;
 *   - «Guardar borrador» guarda; «No renovar» pide motivo.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Renovacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string | Date) => String(d).slice(0, 10),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}));

const getById = vi.fn();
const getDocumentUrl = vi.fn();
const getMyAgency = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  renovacionesApi: {
    getById: (...args: unknown[]) => getById(...args),
    getDocumentUrl: (...args: unknown[]) => getDocumentUrl(...args),
  },
  agencyApi: { getMyAgency: (...args: unknown[]) => getMyAgency(...args) },
}));

import { CuerpoDeRenovacion } from './RenovacionWorkflow';

const HOY = new Date(2026, 8, 8);

const base: Renovacion = {
  id: 'renov-1',
  consignacionId: 'consig-1',
  leaseId: 'lease-1',
  propertyId: 'prop-1',
  propietarioId: 'owner-1',
  tenantId: 'tenant-1',
  agenteId: 'agent-1',
  propertyTitle: 'Apartamento en El Golf',
  propertyAddress: 'Carrera 17 # 83-96 Apto 1502',
  tenantName: 'Mateo Pérez Jaramillo',
  tenantPhone: '3132543924',
  tenantEmail: 'mateo.perez@example.com',
  tenantUserId: 'user-1',
  propietarioName: 'Ana Ruiz',
  contractId: 'contrato-1',
  contractCode: 99,
  currentRent: 1_550_000,
  leaseStartDate: '2025-10-01',
  leaseEndDate: '2026-10-01',
  daysUntilExpiry: 23,
  urgencyBucket: '0-30',
  currentAdminFee: 0,
  status: 'pending',
  history: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  getById.mockReset().mockResolvedValue({ ...base, history: [] });
  getDocumentUrl.mockReset().mockResolvedValue({ url: 'https://firmada/doc.pdf', name: 'doc.pdf' });
  getMyAgency.mockReset().mockResolvedValue({
    razonSocial: 'Portofino Inmobiliaria',
    name: 'Portofino',
    email: 'hola@portofino.co',
  });
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
});

type Props = Partial<React.ComponentProps<typeof CuerpoDeRenovacion>>;

async function montar(props: Props = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<CuerpoDeRenovacion renovacion={base} hoy={HOY} {...props} />);
  });
  // Los dos pedidos del arranque (agencia + detalle).
  await act(async () => {
    await Promise.resolve();
  });
  return container;
}

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const porTestId = <T extends Element = HTMLElement>(id: string) => q<T>(`[data-testid="${id}"]`);
const texto = () => document.body.textContent ?? '';

async function clic(el: Element | null) {
  if (!el) throw new Error('no hay elemento para el clic');
  await act(async () => {
    (el as HTMLElement).click();
  });
}

async function escribir(el: HTMLInputElement | HTMLTextAreaElement | null, valor: string) {
  if (!el) throw new Error('no hay campo');
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function elegirArchivo(input: HTMLInputElement | null, archivo: File) {
  if (!input) throw new Error('no hay input de archivo');
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('la cabecera', () => {
  it('nombra el contrato, su estado y cuánto falta para que venza', async () => {
    await montar();
    expect(texto()).toContain('Apartamento en El Golf');
    expect(porTestId('renovacion-estado')?.textContent).toBe('Pendiente');
    expect(porTestId('renovacion-vence')?.textContent).toContain('Vence el 1 de octubre de 2026 · en 23 días');
    expect(porTestId('renovacion-pasos')).not.toBeNull();
  });
});

describe('la propuesta', () => {
  it('sugiere el IPC del año pasado, lo aplica al canon y muestra la variación', async () => {
    await montar();
    expect(porTestId('renovacion-usar-ipc')?.textContent).toContain('5,10 %');
    await clic(porTestId('renovacion-usar-ipc'));

    expect(porTestId<HTMLInputElement>('renovacion-ipc')?.value).toBe('5.1');
    expect(porTestId('renovacion-aplicar-ipc')?.textContent).toContain('$1.629.050');
    await clic(porTestId('renovacion-aplicar-ipc'));

    expect(porTestId<HTMLInputElement>('renovacion-canon')?.value).toBe('1.629.050');
    expect(texto()).toContain('+$79.050 (+5,1 %)');
    // Ya está en el tope: no hay nada que aplicar.
    expect(porTestId('renovacion-aplicar-ipc')).toBeNull();
  });

  it('avisa cuando el canon pasa el tope del IPC, sin frenar', async () => {
    await montar();
    await escribir(porTestId<HTMLInputElement>('renovacion-ipc'), '5.1');
    await escribir(porTestId<HTMLInputElement>('renovacion-canon'), '1700000');
    expect(porTestId('renovacion-ipc-ayuda')?.textContent).toContain('Supera el tope del IPC (5,10 %) por $70.950');
    expect(porTestId<HTMLButtonElement>('renovacion-enviar')?.disabled).toBe(false);
  });

  it('cuando la tabla del IPC se quedó vieja no sugiere nada: pide el del DANE', async () => {
    await montar({ hoy: new Date(2028, 0, 15) });
    expect(porTestId('renovacion-usar-ipc')).toBeNull();
    expect(porTestId('renovacion-ipc-ayuda')?.textContent).toContain('Ver en el DANE');
  });

  it('el mensaje sigue al canon y a la firma de la inmobiliaria hasta que alguien lo toca; y se restaura', async () => {
    await montar();
    const mensaje = porTestId<HTMLTextAreaElement>('renovacion-mensaje');
    expect(mensaje?.value).toContain('Estimado/a Mateo Pérez Jaramillo');
    expect(mensaje?.value).toContain('$1.550.000');
    expect(mensaje?.value).toContain('Atentamente,\nPortofino Inmobiliaria');
    expect(porTestId('renovacion-restaurar')).toBeNull();

    await escribir(porTestId<HTMLInputElement>('renovacion-canon'), '1600000');
    expect(porTestId<HTMLTextAreaElement>('renovacion-mensaje')?.value).toContain('$1.600.000');

    await escribir(porTestId<HTMLTextAreaElement>('renovacion-mensaje'), 'Hola Mateo, te escribo yo.');
    await escribir(porTestId<HTMLInputElement>('renovacion-canon'), '1650000');
    expect(porTestId<HTMLTextAreaElement>('renovacion-mensaje')?.value).toBe('Hola Mateo, te escribo yo.');

    await clic(porTestId('renovacion-restaurar'));
    expect(porTestId<HTMLTextAreaElement>('renovacion-mensaje')?.value).toContain('$1.650.000');
    expect(porTestId('renovacion-restaurar')).toBeNull();
  });

  it('dice por dónde le llega la propuesta: panel y correo con cuenta', async () => {
    await montar();
    expect(porTestId('renovacion-canal')?.textContent).toContain('Le llega a su panel de Leasefy y a su correo (mateo.perez@example.com)');
    expect(porTestId('renovacion-enviar')?.textContent).toContain('Enviar propuesta');
  });

  it('sin cuenta pero con correo en el contrato: no promete un panel', async () => {
    await montar({ renovacion: { ...base, tenantUserId: null } });
    expect(porTestId('renovacion-canal')?.textContent).toContain('no tiene cuenta en Leasefy');
    expect(porTestId('renovacion-canal')?.textContent).toContain('mateo.perez@example.com');
    expect(porTestId('renovacion-canal')?.textContent).toContain('te responde contestándolo');
  });

  it('sin cuenta ni correo: lo dice, y el botón sólo «marca como enviada»', async () => {
    await montar({ renovacion: { ...base, tenantUserId: null, tenantEmail: null } });
    expect(porTestId('renovacion-canal')?.textContent).toContain('Sin cuenta ni correo en el contrato');
    expect(porTestId('renovacion-enviar')?.textContent).toContain('Marcar como enviada');
  });

  it('WhatsApp abre el chat con el mensaje listo; sin teléfono, el botón está apagado', async () => {
    await montar();
    const enlace = porTestId<HTMLAnchorElement>('renovacion-whatsapp');
    expect(enlace?.getAttribute('href')).toContain('https://wa.me/573132543924?text=');
    expect(enlace?.getAttribute('href')).toContain(encodeURIComponent('$1.550.000'));

    await act(async () => {
      root?.unmount();
    });
    await montar({ renovacion: { ...base, tenantPhone: null } });
    expect(porTestId<HTMLButtonElement>('renovacion-whatsapp')?.disabled).toBe(true);
  });

  it('«Enviar propuesta» manda el mensaje con los números y pasa a Aceptación', async () => {
    const onSendNotification = vi.fn().mockResolvedValue(undefined);
    await montar({ onSendNotification });
    await escribir(porTestId<HTMLInputElement>('renovacion-ipc'), '5.1');
    await clic(porTestId('renovacion-aplicar-ipc'));
    await clic(porTestId('renovacion-enviar'));

    expect(onSendNotification).toHaveBeenCalledWith(
      expect.stringContaining('$1.629.050'),
      1_629_050,
      0,
      5.1,
    );
    expect(porTestId('paso-aceptacion')).not.toBeNull();
    expect(porTestId('paso-propuesta')).toBeNull();
  });

  it('si el envío falla, se queda en la propuesta', async () => {
    const onSendNotification = vi.fn().mockRejectedValue(new Error('500'));
    await montar({ onSendNotification });
    await clic(porTestId('renovacion-enviar'));
    expect(porTestId('paso-propuesta')).not.toBeNull();
    expect(porTestId<HTMLButtonElement>('renovacion-enviar')?.disabled).toBe(false);
  });

  it('«Guardar borrador» guarda precio, IPC y administración sin enviar', async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);
    const onSendNotification = vi.fn();
    await montar({ onSaveDraft, onSendNotification });
    await escribir(porTestId<HTMLInputElement>('renovacion-canon'), '1600000');
    await escribir(porTestId<HTMLInputElement>('renovacion-admin'), '250000');
    await escribir(porTestId<HTMLInputElement>('renovacion-ipc'), '5.1');
    await clic(porTestId('renovacion-guardar'));

    expect(onSaveDraft).toHaveBeenCalledWith({
      proposedRent: 1_600_000,
      negotiatedAdminFee: 250_000,
      ipcRate: 5.1,
    });
    expect(onSendNotification).not.toHaveBeenCalled();
    expect(porTestId('paso-propuesta')).not.toBeNull();
  });

  it('una propuesta ya enviada lo dice y ofrece enviarla otra vez', async () => {
    await montar({
      renovacion: { ...base, status: 'notified', notifiedAt: '2026-09-02T10:00:00.000Z' },
    });
    // Arranca en Aceptación; «Anterior» vuelve a la propuesta.
    await clic(porTestId('renovacion-anterior'));
    expect(porTestId('propuesta-ya-enviada')?.textContent).toContain('Salió el 2026-09-02');
    expect(porTestId('renovacion-enviar')?.textContent).toContain('Enviar otra vez');
    expect(porTestId('renovacion-guardar')).toBeNull();
  });
});

describe('no renovar', () => {
  it('pide un motivo y lo manda', async () => {
    const onTerminate = vi.fn().mockResolvedValue(undefined);
    await montar({ onTerminate });
    await clic(porTestId('renovacion-no-renovar'));
    expect(porTestId('dialogo-no-renovar')).not.toBeNull();
    expect(porTestId<HTMLButtonElement>('no-renovar-confirmar')?.disabled).toBe(true);

    await escribir(porTestId<HTMLTextAreaElement>('no-renovar-motivo'), 'Se muda en diciembre.');
    await clic(porTestId('no-renovar-confirmar'));
    expect(onTerminate).toHaveBeenCalledWith('Se muda en diciembre.');
  });

  it('una renovación cerrada muestra el motivo y sólo deja cerrar', async () => {
    getById.mockResolvedValue({
      ...base,
      status: 'terminated',
      history: [
        {
          id: 'h1',
          action: 'RENOV_TERMINATED',
          description: 'Se muda en diciembre.',
          createdAt: '2026-09-03T10:00:00.000Z',
        },
      ],
    });
    await montar({ renovacion: { ...base, status: 'terminated' } });
    expect(porTestId('paso-no-renovada')?.textContent).toContain('Se muda en diciembre.');
    expect(porTestId('renovacion-pasos')).toBeNull();
    expect(porTestId('renovacion-no-renovar')).toBeNull();
    expect(porTestId('renovacion-cerrar')).not.toBeNull();
  });
});

describe('la aceptación', () => {
  it('sin cuenta no espera un panel que no existe: la inmobiliaria registra la respuesta', async () => {
    const onStepComplete = vi.fn().mockResolvedValue(undefined);
    await montar({
      renovacion: { ...base, status: 'notified', tenantUserId: null, notifiedAt: '2026-09-02T10:00:00.000Z' },
      onStepComplete,
    });
    expect(porTestId('aceptacion-estado')?.textContent).toContain('no acepta desde ningún panel');
    expect(porTestId<HTMLButtonElement>('renovacion-continuar')?.disabled).toBe(true);

    await clic(porTestId('aceptacion-acepto'));
    expect(onStepComplete).toHaveBeenCalledWith(
      'approved',
      1_550_000,
      0,
      undefined,
      expect.stringContaining('registró la inmobiliaria'),
    );
  });

  it('con cuenta espera al panel, pero también deja registrar la respuesta', async () => {
    await montar({ renovacion: { ...base, status: 'notified' } });
    expect(porTestId('aceptacion-estado')?.textContent).toContain('Puede aceptar desde su panel');
    expect(porTestId('aceptacion-acepto')).not.toBeNull();
  });

  it('cuando ya aceptó, lo dice y deja seguir a la firma', async () => {
    const onStepComplete = vi.fn().mockResolvedValue(undefined);
    await montar({
      renovacion: { ...base, status: 'notified', tenantAcceptedAt: '2026-09-04T10:00:00.000Z' },
      onStepComplete,
    });
    expect(porTestId('aceptacion-estado')?.textContent).toContain('Desde su panel, el 2026-09-04');
    expect(porTestId('aceptacion-acepto')).toBeNull();
    await clic(porTestId('renovacion-continuar'));
    expect(onStepComplete).toHaveBeenCalledWith('signed', 1_550_000, 0);
    expect(porTestId('paso-firma')).not.toBeNull();
  });
});

describe('la firma', () => {
  it('necesita el contrato firmado; al registrarla sube el archivo y completa', async () => {
    const onUploadDocument = vi.fn().mockResolvedValue(undefined);
    const onStepComplete = vi.fn().mockResolvedValue(undefined);
    await montar({ renovacion: { ...base, status: 'signed' }, onUploadDocument, onStepComplete });
    expect(porTestId('paso-firma')?.textContent).toContain('Nuevo vencimiento');
    expect(porTestId('paso-firma')?.textContent).toContain('1 de octubre de 2027');
    expect(porTestId<HTMLButtonElement>('renovacion-registrar-firma')?.disabled).toBe(true);

    const archivo = new File(['pdf'], 'contrato-firmado.pdf', { type: 'application/pdf' });
    await elegirArchivo(porTestId<HTMLInputElement>('firma-archivo'), archivo);
    expect(porTestId<HTMLButtonElement>('renovacion-registrar-firma')?.disabled).toBe(false);

    await clic(porTestId('renovacion-registrar-firma'));
    expect(onUploadDocument).toHaveBeenCalledWith(archivo);
    expect(onStepComplete).toHaveBeenCalledWith('completed', 1_550_000, 0);
    expect(porTestId('paso-completada')).not.toBeNull();
  });
});

describe('el riel', () => {
  it('lee el historial del detalle, lo traduce y le quita el prefijo a la notificación', async () => {
    getById.mockResolvedValue({
      ...base,
      history: [
        { id: 'h1', action: 'notified', description: 'Notificación al inquilino: Hola Mateo', createdAt: '2026-09-02T10:00:00.000Z' },
        { id: 'h2', action: 'note', description: 'Llamé y no contestó', actorName: 'Laura', createdAt: '2026-09-03T10:00:00.000Z' },
      ],
    });
    await montar();
    const riel = porTestId('riel-actividad');
    expect(riel?.textContent).toContain('Propuesta enviada');
    expect(riel?.textContent).toContain('Hola Mateo');
    expect(riel?.textContent).not.toContain('Notificación al inquilino:');
    expect(riel?.textContent).toContain('Nota');
    expect(riel?.textContent).toContain('Llamé y no contestó');
    expect(riel?.textContent).toContain('Laura');
    // Lo más reciente arriba.
    expect(riel?.textContent?.indexOf('Nota')).toBeLessThan(riel?.textContent?.indexOf('Propuesta enviada') ?? -1);
  });

  it('sin movimientos lo dice, y el contrato actual apunta a su ficha', async () => {
    await montar();
    expect(porTestId('riel-vacio')).not.toBeNull();
    expect(porTestId<HTMLAnchorElement>('riel-contrato')?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/contrato-1');
    expect(porTestId('riel-contrato')?.textContent).toBe('Ver el contrato #99');
  });

  it('agrega una nota y limpia el campo', async () => {
    const onNoteAdd = vi.fn().mockResolvedValue(undefined);
    await montar({ onNoteAdd });
    expect(porTestId<HTMLButtonElement>('riel-agregar-nota')?.disabled).toBe(true);
    await escribir(porTestId<HTMLTextAreaElement>('riel-nota'), 'Quedó de responder el lunes.');
    await clic(porTestId('riel-agregar-nota'));
    expect(onNoteAdd).toHaveBeenCalledWith('Quedó de responder el lunes.');
    expect(porTestId<HTMLTextAreaElement>('riel-nota')?.value).toBe('');
  });
});
