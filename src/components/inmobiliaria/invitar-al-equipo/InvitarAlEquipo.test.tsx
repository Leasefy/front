/**
 * «Invitar a tu equipo» — el modal que reemplaza al popover del encabezado
 * (02-10-2026).
 *
 * Se monta la primitiva `Dialog` DE VERDAD (Radix, portal a `document.body`):
 * lo que se prueba es lo que ve quien invita. Sólo se aplanan el selector de
 * rol y el menú de cada invitación (también Radix, con portal y puntero), que
 * no son el objeto de estas pruebas.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ── Mocks ───────────────────────────────────────────────────────────────────

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

// El selector de rol, plano: un <select> nativo con las mismas opciones.
vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<{ value: string; onValueChange: (v: string) => void } | null>(null);
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => (
      <Ctx.Provider value={{ value, onValueChange }}>{children}</Ctx.Provider>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ children }: { children: React.ReactNode }) => <span data-testid="rol-elegido">{children}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => {
      const ctx = React.useContext(Ctx)!;
      return (
        <select data-testid="rol" value={ctx.value} onChange={(e) => ctx.onValueChange(e.target.value)}>
          {children}
        </select>
      );
    },
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
      <option value={value}>{typeof children === 'string' ? children : value}</option>
    ),
  };
});

// El menú de cada invitación, plano: los ítems siempre a la vista.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownListTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownListContent: ({ children }: { children: React.ReactNode }) => <div role="menu">{children}</div>,
  DropdownListItem: ({ children, onSelect, className }: { children: React.ReactNode; onSelect?: () => void; className?: string }) => (
    <button type="button" role="menuitem" className={className} onClick={() => onSelect?.()}>
      {children}
    </button>
  ),
  DropdownListSeparator: () => <hr />,
}));

import { ApiError } from '@/lib/api/client';
import type { AgencyInviteResult, AgencyUser } from '@/lib/types/inmobiliaria';
import { InvitarAlEquipo, type AccionesDelEquipo } from './InvitarAlEquipo';

// ── Datos ───────────────────────────────────────────────────────────────────

const AHORA = new Date().toISOString();
const EN_UNA_SEMANA = new Date(Date.now() + 7 * 86_400_000).toISOString();

const yo: AgencyUser = {
  id: 'm-yo',
  email: 'nico@portofino.co',
  name: 'Nico García',
  role: 'admin',
  status: 'active',
  createdAt: '2026-08-01T00:00:00.000Z',
};

function equipoDeOcho(): AgencyUser[] {
  const otros: AgencyUser[] = [
    { id: 'm-2', email: 'laura@portofino.co', name: 'Laura Ríos', role: 'contador', status: 'active', createdAt: AHORA },
    { id: 'm-3', email: 'pedro@portofino.co', name: 'Pedro Gil', role: 'agente', status: 'active', createdAt: AHORA },
    { id: 'm-4', email: 'sofi@portofino.co', name: 'Sofía Mesa', role: 'agente', status: 'active', createdAt: AHORA },
    { id: 'm-5', email: 'juan@portofino.co', name: 'Juan Paz', role: 'coordinador', status: 'active', createdAt: AHORA },
    { id: 'm-6', email: 'carla@portofino.co', name: 'Carla Díaz', role: 'viewer', status: 'active', createdAt: AHORA },
    {
      id: 'm-7',
      email: 'alexis@portofino.co',
      name: 'Alexis',
      role: 'admin',
      status: 'invited',
      createdAt: AHORA,
      invitedAt: AHORA,
      invitationExpiresAt: EN_UNA_SEMANA,
    },
    {
      id: 'm-8',
      email: 'vieja@portofino.co',
      name: 'vieja@portofino.co',
      role: 'viewer',
      status: 'invited',
      createdAt: AHORA,
      invitedAt: '2026-09-01T00:00:00.000Z',
      invitationExpiresAt: '2026-09-08T00:00:00.000Z',
    },
    // Desactivado: no tiene acceso, no cuenta ni sale.
    { id: 'm-9', email: 'ex@portofino.co', name: 'Ex Empleado', role: 'agente', status: 'inactive', createdAt: AHORA },
  ];
  return [yo, ...otros];
}

function respuesta(over: Partial<AgencyInviteResult> = {}): AgencyInviteResult {
  return {
    id: 'm-nueva',
    email: 'ana@portofino.co',
    name: 'Ana Gómez',
    role: 'viewer',
    status: 'invited',
    createdAt: AHORA,
    emailDelivered: true,
    emailStatus: 'sent',
    invitationToken: 'tok-ana',
    invitationLink: 'https://app.leasefy.co/registro?invitationToken=tok-ana',
    ...over,
  };
}

// ── Montaje ─────────────────────────────────────────────────────────────────

let contenedor: HTMLDivElement;
let raiz: Root;
let acciones: { invitar: ReturnType<typeof vi.fn>; reenviar: ReturnType<typeof vi.fn>; cancelar: ReturnType<typeof vi.fn> };
let onCambio: Mock<() => unknown>;
let onOpenChange: Mock<(open: boolean) => void>;
let escribirEnPortapapeles: ReturnType<typeof vi.fn>;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  acciones = {
    invitar: vi.fn().mockResolvedValue(respuesta()),
    reenviar: vi.fn(),
    cancelar: vi.fn().mockResolvedValue(undefined),
  };
  onCambio = vi.fn<() => unknown>();
  onOpenChange = vi.fn<(open: boolean) => void>();
  escribirEnPortapapeles = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: escribirEnPortapapeles },
  });
  localStorage.clear();
  sessionStorage.clear();
  Object.values(toastMock).forEach((f) => f.mockClear());
  pushMock.mockClear();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
});

function montar(props: Partial<React.ComponentProps<typeof InvitarAlEquipo>> = {}) {
  act(() => {
    raiz.render(
      <InvitarAlEquipo
        open
        onOpenChange={onOpenChange}
        miembros={equipoDeOcho()}
        cargando={false}
        error={null}
        onReintentar={vi.fn()}
        onCambio={onCambio}
        puedeInvitar
        correoPropio="nico@portofino.co"
        acciones={acciones as unknown as AccionesDelEquipo}
        {...props}
      />,
    );
  });
}

const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
const textoDelDialogo = () => dialogo().textContent ?? '';
const pestanas = () => Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
const pestana = (nombre: RegExp) => pestanas().find((t) => nombre.test(t.textContent ?? ''));
const boton = (nombre: RegExp) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
    nombre.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
  );

/** Radix Tabs cambia de pestaña con el botón izquierdo del mouse, no con `click`. */
function irA(nombre: RegExp) {
  const t = pestana(nombre)!;
  act(() => {
    t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
  });
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function enviarInvitacion(correo = 'Ana@Portofino.co ', nombre = 'Ana Gómez') {
  irA(/^Invitar$/);
  escribir(document.querySelector<HTMLInputElement>('#invitar-nombre')!, nombre);
  escribir(document.querySelector<HTMLInputElement>('#invitar-correo')!, correo);
  await act(async () => {
    document.querySelector('form[aria-label="Invitar a una persona"]')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
  });
}

// ── Pruebas ─────────────────────────────────────────────────────────────────

describe('InvitarAlEquipo — el modal', () => {
  it('es un modal con título, subtítulo, la ✕ única y «Listo»', () => {
    montar();
    expect(dialogo().getAttribute('aria-modal')).not.toBe('false');
    expect(textoDelDialogo()).toContain('Invitar a tu equipo');
    expect(textoDelDialogo()).toContain(
      'Dale acceso a la gente de tu inmobiliaria y decide qué puede hacer cada quien.',
    );
    expect(document.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1);
    expect(boton(/^Listo$/)).toBeTruthy();
  });

  it('«Listo» cierra el modal', () => {
    montar();
    act(() => boton(/^Listo$/)!.click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('InvitarAlEquipo — las dos pestañas', () => {
  it('con equipo de 8: «Con acceso (8)» e «Invitar»; abre en «Con acceso»', () => {
    montar();
    const nombres = pestanas().map((t) => t.textContent);
    expect(nombres).toEqual(['Con acceso (8)', 'Invitar']);
    expect(pestana(/Con acceso/)!.getAttribute('aria-selected')).toBe('true');
    // Activos e invitaciones pendientes; el desactivado no sale.
    expect(textoDelDialogo()).toContain('Laura Ríos');
    expect(textoDelDialogo()).toContain('alexis@portofino.co');
    expect(textoDelDialogo()).not.toContain('Ex Empleado');
    expect(textoDelDialogo()).toContain('Invitaciones pendientes');
  });

  it('cada persona con avatar, nombre, correo y su rol en una pastilla; tú primero', () => {
    montar();
    const tarjetas = Array.from(document.querySelectorAll('[data-testid^="persona-"]'));
    expect(tarjetas[0].textContent).toContain('Nico García');
    expect(tarjetas[0].textContent).toContain('(tú)');
    expect(tarjetas[0].textContent).toContain('nico@portofino.co');
    expect(tarjetas[0].textContent).toContain('Administrador');
    const laura = document.querySelector('[data-testid="persona-m-2"]')!;
    expect(laura.textContent).toContain('Contador');
  });

  it('una invitación pendiente dice cuándo vence; una vencida, que hay que reenviarla', () => {
    montar();
    expect(document.querySelector('[data-testid="persona-m-7"]')!.textContent).toMatch(/Invitación pendiente · vence el/);
    expect(document.querySelector('[data-testid="persona-m-8"]')!.textContent).toContain('Invitación vencida');
  });

  it('«Invitar» muestra nombre, correo y rol, con lo que puede hacer el rol', () => {
    montar();
    irA(/^Invitar$/);
    expect(document.querySelector('#invitar-nombre')).toBeTruthy();
    expect(document.querySelector('#invitar-correo')).toBeTruthy();
    // Los siete roles del back, cada uno con su explicación.
    expect(document.querySelectorAll('[data-testid="rol"] option')).toHaveLength(7);
    expect(document.querySelector('#invitar-rol-ayuda')!.textContent).toBe('Consulta la operación sin cambiar nada.');
  });

  it('con equipo de 1 (sólo tú) abre directo en «Invitar»', () => {
    montar({ miembros: [yo] });
    expect(pestana(/^Invitar$/)!.getAttribute('aria-selected')).toBe('true');
    expect(pestana(/Con acceso/)!.textContent).toBe('Con acceso (1)');
  });

  it('al abrirlo, el foco arranca en la pestaña que se muestra y no en la otra', () => {
    montar({ miembros: [yo], open: false });
    montar({ miembros: [yo], open: true });
    expect(pestana(/^Invitar$/)!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(pestana(/^Invitar$/));
  });
});

describe('InvitarAlEquipo — invitar y el enlace', () => {
  it('invita con el correo normalizado y muestra el enlace personal con «Copiar»', async () => {
    montar();
    await enviarInvitacion();

    expect(acciones.invitar).toHaveBeenCalledWith({
      email: 'ana@portofino.co',
      name: 'Ana Gómez',
      role: 'viewer',
    });
    const bloque = document.querySelector('[data-testid="enlace-de-invitacion"]')!;
    expect(bloque.textContent).toContain('Enlace de invitación de Ana');
    expect(document.querySelector('[data-testid="enlace-de-invitacion-url"]')!.textContent).toBe(
      'https://app.leasefy.co/registro?invitationToken=tok-ana',
    );
    expect(bloque.textContent).toContain('Mándaselo por WhatsApp si el correo no le llega.');
    expect(bloque.textContent).toContain('Sólo sirve para ana@portofino.co');
    expect(bloque.textContent).toContain('Le enviamos la invitación a ana@portofino.co.');
    expect(boton(/Copiar el enlace de ana@portofino\.co/)).toBeTruthy();
    // Se recarga el equipo y el formulario queda listo para otra persona.
    expect(onCambio).toHaveBeenCalled();
    expect(document.querySelector<HTMLInputElement>('#invitar-correo')!.value).toBe('');
  });

  it('el enlace no va a localStorage, ni a sessionStorage, ni a la URL', async () => {
    montar();
    await enviarInvitacion();
    const guardado = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage });
    expect(guardado).not.toContain('tok-ana');
    expect(window.location.href).not.toContain('tok-ana');
  });

  it('con un back viejo (sólo el token), arma el mismo enlace del correo', async () => {
    acciones.invitar.mockResolvedValue(respuesta({ invitationLink: undefined }));
    montar();
    await enviarInvitacion();
    expect(document.querySelector('[data-testid="enlace-de-invitacion-url"]')!.textContent).toBe(
      `${window.location.origin}/registro?invitationToken=tok-ana`,
    );
  });

  it('un correo inválido no llega al back y dice qué le falta', async () => {
    montar();
    await enviarInvitacion('ana.portofino.co');
    expect(acciones.invitar).not.toHaveBeenCalled();
    expect(document.querySelector('#invitar-correo-error')!.textContent).toContain('Falta la @');
  });
});

describe('InvitarAlEquipo — copiar', () => {
  it('«Copiar» copia el enlace entero y dice «Copiado»', async () => {
    montar();
    await enviarInvitacion();
    await act(async () => boton(/Copiar el enlace/)!.click());
    expect(escribirEnPortapapeles).toHaveBeenCalledWith('https://app.leasefy.co/registro?invitationToken=tok-ana');
    expect(boton(/Enlace copiado/)!.textContent).toContain('Copiado');
  });

  it('si el navegador no deja copiar, lo deja seleccionado y lo dice', async () => {
    escribirEnPortapapeles.mockRejectedValue(new Error('NotAllowedError'));
    montar();
    await enviarInvitacion();
    await act(async () => boton(/Copiar el enlace/)!.click());
    expect(toastMock.info).toHaveBeenCalledWith('Cópialo a mano', expect.anything());
    expect(window.getSelection()?.toString()).toBe('https://app.leasefy.co/registro?invitationToken=tok-ana');
  });
});

describe('InvitarAlEquipo — correo no enviado', () => {
  it.each([
    ['failed', 'El correo no salió: pásale tú el enlace.', 'Correo no enviado'],
    ['suppressed', 'Este entorno es de pruebas y no manda correos: pásale tú el enlace.', 'Correo retenido'],
    ['not_configured', 'El servidor todavía no manda correos: pásale tú el enlace.', 'el servidor no manda correos'],
  ] as const)('%s: el bloque lo dice y la persona sale así en «Con acceso»', async (estado, enElBloque, enLaLista) => {
    acciones.invitar.mockResolvedValue(respuesta({ emailDelivered: false, emailStatus: estado }));
    montar();
    await enviarInvitacion();

    expect(document.querySelector('[data-testid="enlace-de-invitacion"]')!.textContent).toContain(enElBloque);

    // El equipo recargado ya trae a Ana como invitación pendiente.
    const recargado: AgencyUser[] = [
      ...equipoDeOcho(),
      { id: 'm-nueva', email: 'ana@portofino.co', name: 'Ana Gómez', role: 'viewer', status: 'invited', createdAt: AHORA, invitedAt: AHORA, invitationExpiresAt: EN_UNA_SEMANA },
    ];
    montar({ miembros: recargado });
    irA(/Con acceso/);
    const ana = document.querySelector('[data-testid="persona-m-nueva"]')!;
    expect(ana.textContent).toContain(enLaLista);
    // Y su enlace se puede volver a copiar desde la lista mientras dure la visita.
    expect(ana.textContent).toContain('Copiar enlace');
  });
});

describe('InvitarAlEquipo — el tope del plan', () => {
  it('un 402 muestra el mensaje del back, que sólo cuenta asesores, y «Ver planes»', async () => {
    acciones.invitar.mockRejectedValue(
      new ApiError(402, 'Alcanzaste el límite de agentes de tu plan. Sube de plan para agregar más.'),
    );
    montar();
    irA(/^Invitar$/);
    const rol = document.querySelector<HTMLSelectElement>('[data-testid="rol"]')!;
    act(() => {
      rol.value = 'agente';
      rol.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(document.querySelector('#invitar-rol-ayuda')!.textContent).toContain('Cuenta para el tope de asesores de tu plan.');
    await enviarInvitacion('pedro2@portofino.co', 'Pedro');

    const alerta = document.querySelector('[role="alert"]')!;
    expect(alerta.textContent).toContain('Alcanzaste el límite de agentes de tu plan.');
    expect(alerta.textContent).toContain('El tope cuenta sólo asesores comerciales');
    const verPlanes = Array.from(alerta.querySelectorAll('a')).find((a) => a.textContent === 'Ver planes')!;
    expect(verPlanes.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade');
    expect(document.querySelector('[data-testid="enlace-de-invitacion"]')).toBeNull();
  });

  it('un 400 sobre el correo sale debajo del campo, con la frase del back', async () => {
    const mensaje = 'Ese correo no es válido. Revisa que no tenga espacios.';
    acciones.invitar.mockRejectedValue(
      new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [mensaje],
        campos: [{ campo: 'email', regla: 'formato', mensaje }],
      }),
    );
    montar();
    await enviarInvitacion('ana@portofino.co', 'Ana');
    expect(document.querySelector('#invitar-correo-error')!.textContent).toBe(mensaje);
    expect(document.querySelector('#invitar-correo')!.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('un 5xx dice que fue nuestro, sin «Error interno del servidor»', async () => {
    acciones.invitar.mockRejectedValue(new ApiError(500, 'Internal server error'));
    montar();
    await enviarInvitacion('ana@portofino.co', 'Ana');
    const alerta = document.querySelector('[role="alert"]')!;
    expect(alerta.textContent).toContain('No pudimos crear la invitación: algo falló de nuestro lado.');
    expect(alerta.textContent).not.toMatch(/internal server error/i);
  });

  it('cualquier otro fallo dice el motivo del back, sin hablar del tope', async () => {
    acciones.invitar.mockRejectedValue(new ApiError(409, 'El usuario ya es miembro activo de esta inmobiliaria.'));
    montar();
    await enviarInvitacion('laura@portofino.co', 'Laura');
    const alerta = document.querySelector('[role="alert"]')!;
    expect(alerta.textContent).toContain('El usuario ya es miembro activo de esta inmobiliaria.');
    expect(alerta.textContent).not.toContain('tope');
  });
});

describe('InvitarAlEquipo — sin permiso de invitar', () => {
  it('no hay pestaña «Invitar», ni formulario, ni acciones sobre las invitaciones', () => {
    montar({ puedeInvitar: false });
    expect(pestanas()).toHaveLength(0);
    expect(document.querySelector('form')).toBeNull();
    expect(textoDelDialogo()).toContain('Con acceso (8)');
    expect(textoDelDialogo()).toContain('Laura Ríos');
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(boton(/Opciones de la invitación/)).toBeFalsy();
  });

  it('con equipo de 1 no invita a invitar', () => {
    montar({ puedeInvitar: false, miembros: [yo] });
    expect(textoDelDialogo()).toContain('Por ahora estás sólo tú.');
    expect(boton(/Invitar a alguien/)).toBeFalsy();
  });
});

describe('InvitarAlEquipo — reenviar y cancelar una invitación', () => {
  it('«Reenviar y copiar enlace» muestra el enlace NUEVO y avisa que el anterior no sirve', async () => {
    acciones.reenviar.mockResolvedValue(
      respuesta({
        id: 'm-7',
        email: 'alexis@portofino.co',
        emailDelivered: false,
        emailStatus: 'suppressed',
        invitationLink: 'https://app.leasefy.co/registro?invitationToken=tok-nuevo',
      }),
    );
    montar();
    const alexis = document.querySelector('[data-testid="persona-m-7"]')!;
    const reenviar = Array.from(alexis.querySelectorAll('button')).find((b) => /Reenviar y copiar enlace/.test(b.textContent ?? ''))!;
    await act(async () => reenviar.click());

    expect(acciones.reenviar).toHaveBeenCalledWith('m-7');
    expect(escribirEnPortapapeles).toHaveBeenCalledWith('https://app.leasefy.co/registro?invitationToken=tok-nuevo');
    const bloque = document.querySelector('[data-testid="enlace-de-invitacion"]')!;
    expect(bloque.textContent).toContain('Enlace de invitación de Alexis');
    expect(bloque.textContent).toContain('Es un enlace nuevo: el anterior ya no sirve.');
    expect(onCambio).toHaveBeenCalled();
  });

  it('«Cancelar invitación» pide confirmar y después la cancela', async () => {
    montar();
    const alexis = () => document.querySelector('[data-testid="persona-m-7"]')!;
    const cancelar = Array.from(alexis().querySelectorAll('button')).find((b) => /Cancelar invitación/.test(b.textContent ?? ''))!;
    act(() => cancelar.click());
    expect(acciones.cancelar).not.toHaveBeenCalled();
    expect(alexis().textContent).toContain('Su enlace deja de servir.');

    const si = Array.from(alexis().querySelectorAll('button')).find((b) => b.textContent === 'Sí, cancelar')!;
    await act(async () => si.click());
    expect(acciones.cancelar).toHaveBeenCalledWith('m-7');
    expect(toastMock.success).toHaveBeenCalledWith('Invitación cancelada', expect.anything());
  });
});

describe('InvitarAlEquipo — el modal de la plataforma, también en el celular', () => {
  it('un solo modal: el cuerpo scrollea solo y frena la rueda, con una ✕ y «Listo»', () => {
    montar();
    const modal = dialogo();
    // Bajo 640 px la misma primitiva sube como hoja desde abajo: no hay una
    // rama aparte para el celular que se pueda desalinear.
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(modal.querySelector('[data-lenis-prevent]')!.textContent).toContain('Con acceso (8)');
    expect(document.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1);
    expect(boton(/^Listo$/)).toBeTruthy();
  });
});

describe('InvitarAlEquipo — movimiento', () => {
  it('«Copiar» pasa a «Copiado» y a los 2,5 s vuelve, sin cambiar de ancho', async () => {
    montar();
    await enviarInvitacion();
    vi.useFakeTimers();
    try {
      await act(async () => boton(/Copiar el enlace/)!.click());
      const copiar = boton(/Enlace copiado/)!;
      expect(copiar).toBeTruthy();
      // El ancho lo fija «Copiado», invisible y fuera del árbol accesible.
      const medida = copiar.querySelector('span[aria-hidden="true"].invisible');
      expect(medida?.textContent).toBe('Copiado');
      await act(async () => {
        vi.advanceTimersByTime(2600);
      });
      expect(boton(/Copiar el enlace de ana@portofino\.co/)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('la fila de una invitación recién hecha entra una sola vez, al volver a «Con acceso»', async () => {
    montar();
    await enviarInvitacion();
    const recienCreada = new Date(Date.now() + 1000).toISOString();
    const recargado: AgencyUser[] = [
      ...equipoDeOcho(),
      { id: 'm-nueva', email: 'ana@portofino.co', name: 'Ana Gómez', role: 'viewer', status: 'invited', createdAt: recienCreada, invitedAt: recienCreada, invitationExpiresAt: EN_UNA_SEMANA },
    ];
    montar({ miembros: recargado });
    irA(/Con acceso/);
    // La más reciente queda arriba de las pendientes.
    const pendientes = Array.from(document.querySelectorAll('[aria-labelledby="invitaciones-pendientes"] li'));
    expect(pendientes[0].getAttribute('data-testid')).toBe('persona-m-nueva');
    expect(pestana(/Con acceso/)!.textContent).toBe('Con acceso (9)');

    // Ida y vuelta: la fila sigue ahí (ya no vuelve a entrar animada).
    irA(/^Invitar$/);
    irA(/Con acceso/);
    expect(document.querySelector('[data-testid="persona-m-nueva"]')).toBeTruthy();
  });
});
