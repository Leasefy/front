/**
 * MessagesWidget.test.tsx — T-0038 WU-6, contract-addendum-2.md §B.3.
 *
 * `GET /messages/conversations` breaks the live inbox in a way that
 * produces NO error at all: `applicationId` goes `string` -> `string | null`
 * for a PROPERTY_INQUIRY thread. Before this fix, `MessagesWidget` used
 * `applicationId` as the SELECTION KEY (`conversations.find(c =>
 * c.applicationId === selectedApplicationId)`), so every null-application
 * thread matched the FIRST one — clicking the second silently opened the
 * first. `useMessages.ts` already early-returns on a falsy id, so nothing
 * 404s; it just shows the wrong conversation. These tests pin the fix:
 * selection keys on `conversation.id`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ChatConversation } from '@/lib/api/messages.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { searchParamsState, useChatMock, markAsReadMock, pushMock, rutaActual } = vi.hoisted(() => ({
  searchParamsState: { conversationId: null as string | null, applicationId: null as string | null },
  useChatMock: vi.fn(),
  markAsReadMock: vi.fn(),
  pushMock: vi.fn(),
  // El widget se monta en DOS paneles distintos con el mismo `actor='landlord'`
  // (la inmobiliaria y el propietario). La ruta es lo que los separa, así que
  // el doble la deja elegir por test.
  rutaActual: { valor: '/panel/inmobiliaria/mensajes' },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'conversationId' ? searchParamsState.conversationId : key === 'applicationId' ? searchParamsState.applicationId : null),
  }),
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => rutaActual.valor,
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('@leasefy/cadence', () => ({
  // 🔴 El doble tiene que pasar `onClick`. El anterior sólo copiaba el
  // `aria-label`, así que TODO IconButton del widget era —dentro del test— un
  // botón muerto: el menú de los tres puntos no se podía abrir y sus renglones
  // eran imposibles de probar. Justamente el defecto que Nico encontró en la
  // carita de los emojis, escondido en el mock.
  IconButton: ({ icon, variant, ...rest }: Record<string, unknown> & { icon?: React.ReactNode }) =>
    React.createElement('button', { type: 'button', ...rest }, icon as React.ReactNode),
  MonoLabel: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  Input: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLInputElement>) =>
    React.createElement('input', { ...props, ref }),
  ),
  // El composer del piloto escribe en un Textarea (adaptador local sobre cadence).
  Textarea: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLTextAreaElement>) =>
    React.createElement('textarea', { ...props, ref }),
  ),
  Button: React.forwardRef((props: Record<string, unknown> & { children?: React.ReactNode }, ref: React.Ref<HTMLButtonElement>) => {
    const { children, ...rest } = props;
    return React.createElement('button', { ...rest, ref }, children);
  }),
}));

// El widget (desde el merge del piloto) confirma «reportar» con un AlertDialog
// que el adaptador local re-exporta de cadence. El mock de cadence de arriba es
// parcial a propósito, así que el adaptador se mockea aparte con pasamanos.
vi.mock('@/components/ui/alert-dialog', () => {
  const pasamanos = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  const boton = ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('button', rest, children);
  return {
    AlertDialog: pasamanos,
    AlertDialogContent: pasamanos,
    AlertDialogHeader: pasamanos,
    AlertDialogFooter: pasamanos,
    AlertDialogTitle: pasamanos,
    AlertDialogDescription: pasamanos,
    AlertDialogAction: boton,
    AlertDialogCancel: boton,
  };
});

vi.mock('@phosphor-icons/react', () => ({
  Chat: () => null,
  ChatCircle: () => null,
  MagnifyingGlass: () => null,
  PaperPlaneTilt: () => null,
  Paperclip: () => null,
  DotsThreeVertical: () => null,
  Check: () => null,
  Checks: () => null,
  Info: () => null,
  Image: () => null,
  Smiley: () => null,
  ArrowLeft: () => null,
  X: () => null,
  House: () => null,
  Envelope: () => null,
  Archive: () => null,
  BellSlash: () => null,
  Flag: () => null,
  // Los de la insignia de perfil y del cajón de «Nuevo mensaje». Este mock es
  // TOTAL (no usa importOriginal), así que un ícono que falte no es un warning:
  // el módulo devuelve undefined y React revienta al renderizarlo.
  User: () => null,
  Buildings: () => null,
  IdentificationBadge: () => null,
  // El `+` del encabezado, «Ver ficha» y el aviso de huecos de una plantilla.
  Plus: () => null,
  IdentificationCard: () => null,
  Warning: () => null,
  // Los tres paneles del compositor (emojis, plantillas, pendientes).
  Notepad: () => null,
  ListChecks: () => null,
  Receipt: () => null,
  CurrencyCircleDollar: () => null,
  FileText: () => null,
  ArrowClockwise: () => null,
}));

// El cajón de «Nuevo mensaje» monta un Sheet, que arrastra los primitivos de
// diálogo de cadence — y el mock de cadence de este archivo es TOTAL. Se
// sustituye por un doble: acá lo que se prueba es que la bandeja ofrezca el
// botón y abra el cajón, no lo que el cajón hace adentro (eso tiene su propio
// archivo, NuevoMensajeDrawer.test.tsx).
vi.mock('@/components/messages/NuevoMensajeDrawer', () => ({
  NuevoMensajeDrawer: ({ abierto }: { abierto: boolean }) =>
    abierto ? React.createElement('div', { 'data-testid': 'nuevo-mensaje-cajon' }) : null,
}));

/*
 * Los dos servicios que consumen los paneles nuevos del compositor.
 *
 * `messages.service` va entero (el widget también le pide archivar/silenciar/
 * reportar); de `plantillas-de-mensaje.service` se reemplaza SÓLO el cliente
 * HTTP y se deja pasar `resolverPlantilla` de verdad —es la pieza que decide
 * qué queda sin reemplazar, y probarla contra un doble no probaría nada—.
 */
const { pendientesMock, listarPlantillasMock, instalarSugeridasMock } = vi.hoisted(() => ({
  pendientesMock: vi.fn(),
  listarPlantillasMock: vi.fn(),
  instalarSugeridasMock: vi.fn(),
}));

vi.mock('@/lib/api/messages.service', () => ({
  messagesApi: {
    getPendientes: pendientesMock,
    archiveConversation: vi.fn().mockResolvedValue('unavailable'),
    muteConversation: vi.fn().mockResolvedValue('unavailable'),
    reportConversation: vi.fn().mockResolvedValue('unavailable'),
    sendAttachment: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/lib/api/plantillas-de-mensaje.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/plantillas-de-mensaje.service')>()),
  plantillasDeMensajeApi: {
    listar: listarPlantillasMock,
    instalarSugeridas: instalarSugeridasMock,
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}));

vi.mock('@/lib/api/agent-contact.service', () => ({
  agentContactApi: { canContact: vi.fn().mockResolvedValue({ allowed: false }) },
}));

// Memoized per-tag — an unmemoized Proxy `get` trap returns a brand-new
// component on every `motion.div` access, forcing React to unmount+remount
// the whole subtree every render. That is a real infinite loop, not a slow
// test, whenever a mocked child calls something render-triggering from an
// effect (confirmed against ConsignacionWizard.test.tsx's documented fix).
vi.mock('framer-motion', () => {
  const motionTagCache = new Map<string, (props: Record<string, unknown>) => React.ReactElement>();
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        if (!motionTagCache.has(tag)) {
          motionTagCache.set(
            tag,
            ({ children, whileHover, whileTap, initial, animate, exit, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
              React.createElement(tag, rest, children),
          );
        }
        return motionTagCache.get(tag);
      },
    },
  );
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => children };
});

vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title?: string }) => React.createElement('div', null, title),
}));

vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: () => React.createElement('div', null, 'error'),
}));

let conversationsState: ChatConversation[] = [];

vi.mock('@/lib/hooks/useMessages', () => ({
  useConversations: () => ({
    conversations: conversationsState,
    totalUnread: 0,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useChat: (id: string | null) => useChatMock(id),
}));

import { MessagesWidget } from './MessagesWidget';
// La clase REAL: es la que `endpointNoDisponible` mira con `instanceof`.
import { ApiError } from '@/lib/api/client';

function makeConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: 'conv-1',
    kind: 'APPLICATION',
    applicationId: 'app-1',
    name: 'Ana',
    role: 'Propietario',
    perfil: 'LANDLORD',
    contraparteId: 'user-ana',
    email: 'ana@test.com',
    property: 'Depto Chicó',
    propertyId: 'prop-1',
    lastMessage: 'Hola',
    lastMessageTime: '10:00',
    unreadCount: 0,
    updatedAt: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  searchParamsState.conversationId = null;
  searchParamsState.applicationId = null;
  rutaActual.valor = '/panel/inmobiliaria/mensajes';
  pushMock.mockReset();
  pendientesMock.mockReset().mockResolvedValue({ cobros: [], dispersiones: [], documentos: [] });
  listarPlantillasMock.mockReset().mockResolvedValue({ plantillas: [] });
  instalarSugeridasMock.mockReset().mockResolvedValue({ creadas: 0, plantillas: [] });
  conversationsState = [];
  useChatMock.mockReset().mockReturnValue({
    messages: [],
    isLoading: false,
    isSending: false,
    sendMessage: vi.fn(),
    markAsRead: markAsReadMock,
  });
  markAsReadMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

function render(actor: 'tenant' | 'landlord' = 'tenant') {
  act(() => {
    root.render(React.createElement(MessagesWidget, { actor }));
  });
}

// ── Utilidades para los tests del compositor ───────────────────────────────

function campoDeMensaje(): HTMLInputElement {
  const campo = container.querySelector<HTMLInputElement>(
    'input[aria-label="Escribe un mensaje"]',
  );
  if (!campo) throw new Error('No se encontró el campo del mensaje.');
  return campo;
}

/**
 * Escribe en un input CONTROLADO por React.
 *
 * 🔴 Asignar `.value` a secas no alcanza: React guarda el último valor que él
 * pintó en un tracker interno del nodo, ve que no cambió y NO dispara
 * `onChange`. El setter nativo del prototipo esquiva ese tracker, que es lo
 * que hace que el evento llegue al componente.
 */
function escribir(campo: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  act(() => {
    setter?.call(campo, texto);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function clic(el: Element | null | undefined) {
  if (!el) throw new Error('No se encontró el elemento a clickear.');
  act(() => {
    (el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function abrirMenuDeOpciones() {
  clic(container.querySelector('button[aria-label="Mas opciones"]'));
}

/** Deja que se resuelvan las promesas de los paneles que piden datos al abrir. */
async function esperar() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<MessagesWidget> — hilo directo: iniciar y distinguir perfiles', () => {
  it('la bandeja ofrece iniciar una conversación, incluso vacía', () => {
    conversationsState = [];
    render();

    // Antes el vacío decía «cuando te comuniques con…» y no había forma de
    // comunicarse: sólo se llenaba si el otro escribía primero.
    expect(container.querySelectorAll('[data-testid="abrir-nuevo-mensaje"]').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="nuevo-mensaje-cajon"]')).toBeNull();
  });

  it('el botón abre el cajón', () => {
    conversationsState = [makeConversation()];
    render();

    const boton = container.querySelector<HTMLButtonElement>('[data-testid="abrir-nuevo-mensaje"]');
    expect(boton).toBeTruthy();
    act(() => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="nuevo-mensaje-cajon"]')).toBeTruthy();
  });

  it('cada conversación lleva la insignia del perfil del interlocutor', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', name: 'Ana', perfil: 'LANDLORD' }),
      makeConversation({ id: 'conv-2', name: 'Beto', perfil: 'TENANT' }),
      makeConversation({ id: 'conv-3', name: 'Inmobiliaria Prueba', perfil: 'AGENCY', property: '' }),
    ];
    render();

    expect(container.querySelectorAll('[data-testid="insignia-landlord"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="insignia-tenant"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-testid="insignia-agency"]').length).toBeGreaterThan(0);
  });
});

describe('<MessagesWidget> — selection keys on conversation.id, never applicationId (contract-addendum-2.md §B.3)', () => {
  it('auto-selects the first conversation by id when none is selected yet', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', applicationId: null, name: 'Inquiry One' }),
      makeConversation({ id: 'conv-2', applicationId: null, name: 'Inquiry Two' }),
    ];
    render();
    expect(useChatMock).toHaveBeenLastCalledWith('conv-1');
  });

  it('REGRESSION: clicking the SECOND of two null-applicationId threads opens the second, not the first', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry One' }),
      makeConversation({ id: 'conv-2', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry Two' }),
    ];
    render();

    // Auto-selected the first by default.
    expect(useChatMock).toHaveBeenLastCalledWith('conv-1');

    const secondButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Inquiry Two'),
    );
    expect(secondButton).toBeTruthy();
    act(() => {
      (secondButton as HTMLButtonElement).click();
    });

    // The OLD bug: both threads have applicationId === null, so
    // `conversations.find(c => c.applicationId === selectedApplicationId)`
    // always matched conv-1. Selection must now resolve to conv-2.
    expect(useChatMock).toHaveBeenLastCalledWith('conv-2');
  });

  it('the header shows the selected conversation, not the first one, after selecting the second', () => {
    conversationsState = [
      makeConversation({ id: 'conv-1', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry One' }),
      makeConversation({ id: 'conv-2', kind: 'PROPERTY_INQUIRY', applicationId: null, name: 'Inquiry Two' }),
    ];
    render();
    const secondButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Inquiry Two'),
    );
    act(() => {
      (secondButton as HTMLButtonElement).click();
    });
    // Chat header (desktop pane) should now render "Inquiry Two"'s name.
    expect(container.textContent).toContain('Inquiry Two');
  });

  it('resolves the legacy ?applicationId= deep-link to the matching thread id (signed-contract flows keep working)', () => {
    searchParamsState.applicationId = 'app-legacy';
    conversationsState = [
      makeConversation({ id: 'conv-1', applicationId: 'app-other' }),
      makeConversation({ id: 'conv-2', applicationId: 'app-legacy' }),
    ];
    render();
    expect(useChatMock).toHaveBeenLastCalledWith('conv-2');
  });

  it('a new ?conversationId= deep-link selects that thread directly', () => {
    searchParamsState.conversationId = 'conv-2';
    conversationsState = [
      makeConversation({ id: 'conv-1', applicationId: null }),
      makeConversation({ id: 'conv-2', kind: 'PROPERTY_INQUIRY', applicationId: null }),
    ];
    render();
    expect(useChatMock).toHaveBeenLastCalledWith('conv-2');
  });
});

// ===========================================================================
// Los cinco pedidos de Nico sobre /panel/inmobiliaria/mensajes (2026-09-04)
// ===========================================================================

describe('<MessagesWidget> — el buscador y el «+» (pedido 1)', () => {
  it('el «+» del encabezado abre el cajón y se llama por su nombre', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    const mas = container.querySelector<HTMLButtonElement>('[data-testid="abrir-nuevo-mensaje"]');
    expect(mas).toBeTruthy();
    // Un ícono sin nombre no es descubrible ni accesible: van los dos.
    expect(mas!.getAttribute('aria-label')).toBe('Nuevo mensaje');
    expect(mas!.getAttribute('title')).toBe('Nuevo mensaje');

    clic(mas);
    expect(container.querySelector('[data-testid="nuevo-mensaje-cajon"]')).toBeTruthy();
  });

  it('el buscador y el «+» viven en la MISMA fila, no apilados', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    const buscador = container.querySelector('input[aria-label="Buscar conversación"]');
    const mas = container.querySelector('[data-testid="abrir-nuevo-mensaje"]');
    expect(buscador).toBeTruthy();
    // El padre común es la fila flex del encabezado: el buscador está dentro de
    // su envoltorio relativo, y el `+` es hermano de ese envoltorio.
    expect(buscador!.parentElement!.parentElement).toBe(mas!.parentElement);
  });
});

describe('<MessagesWidget> — los emojis funcionan (pedido 2)', () => {
  it('la carita abre el panel y se cierra con Escape', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    expect(container.querySelector('[data-testid="panel-emojis"]')).toBeNull();
    clic(container.querySelector('[data-testid="abrir-emojis"]'));
    expect(container.querySelector('[data-testid="panel-emojis"]')).toBeTruthy();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('[data-testid="panel-emojis"]')).toBeNull();
  });

  it('un clic afuera lo cierra', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-emojis"]'));
    expect(container.querySelector('[data-testid="panel-emojis"]')).toBeTruthy();

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(container.querySelector('[data-testid="panel-emojis"]')).toBeNull();
  });

  it('🔴 el emoji entra EN LA POSICIÓN DEL CURSOR, no pegado al final', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    const campo = campoDeMensaje();
    escribir(campo, 'Hola Ana, gracias');
    // El cursor queda justo después de «Hola», antes del espacio.
    campo.setSelectionRange(4, 4);

    clic(container.querySelector('[data-testid="abrir-emojis"]'));
    clic(container.querySelector('[data-testid="emoji"][data-emoji="👍"]'));

    expect(campoDeMensaje().value).toBe('Hola👍 Ana, gracias');
    // Y el cursor queda DESPUÉS del emoji, para poder seguir escribiendo.
    expect(campoDeMensaje().selectionStart).toBe(4 + '👍'.length);
  });

  it('con lo que haya seleccionado, el emoji lo reemplaza', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    const campo = campoDeMensaje();
    escribir(campo, 'Listo perfecto');
    campo.setSelectionRange(6, 14); // «perfecto»

    clic(container.querySelector('[data-testid="abrir-emojis"]'));
    clic(container.querySelector('[data-testid="emoji"][data-emoji="✅"]'));

    expect(campoDeMensaje().value).toBe('Listo ✅');
  });
});

describe('<MessagesWidget> — el menú de los tres puntos (pedido 3)', () => {
  it('ofrece «Ver ficha del inquilino» y navega con el id de la contraparte', () => {
    conversationsState = [
      makeConversation({ perfil: 'TENANT', contraparteId: 'user-beto', name: 'Beto' }),
    ];
    render('landlord');

    abrirMenuDeOpciones();
    const verFicha = container.querySelector('[data-testid="ver-ficha"]');
    expect(verFicha).toBeTruthy();
    expect(verFicha!.textContent).toContain('Ver ficha del inquilino');

    clic(verFicha);
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/inquilinos?persona=user-beto');
  });

  it('con un propietario cambia la etiqueta y el destino', () => {
    conversationsState = [
      makeConversation({ perfil: 'LANDLORD', contraparteId: 'user-ana' }),
    ];
    render('landlord');

    abrirMenuDeOpciones();
    const verFicha = container.querySelector('[data-testid="ver-ficha"]');
    expect(verFicha!.textContent).toContain('Ver ficha del propietario');

    clic(verFicha);
    expect(pushMock).toHaveBeenCalledWith('/panel/inmobiliaria/propietarios?persona=user-ana');
  });

  it('sin id de la contraparte NO se ofrece (la inmobiliaria no tiene ficha)', () => {
    conversationsState = [
      makeConversation({ perfil: 'AGENCY', contraparteId: null, name: 'Inmobiliaria Prueba' }),
    ];
    render('landlord');

    abrirMenuDeOpciones();
    expect(container.querySelector('[data-testid="ver-ficha"]')).toBeNull();
    // Y el resto del menú sigue estando: no se rompió nada por esconder uno.
    expect(container.textContent).toContain('Archivar conversación');
  });

  it('fuera del panel de la inmobiliaria tampoco: el destino no es suyo', () => {
    // Mismo `actor='landlord'`, pero montado en el panel del PROPIETARIO.
    rutaActual.valor = '/panel/mensajes';
    conversationsState = [makeConversation({ perfil: 'TENANT', contraparteId: 'user-beto' })];
    render('landlord');

    abrirMenuDeOpciones();
    expect(container.querySelector('[data-testid="ver-ficha"]')).toBeNull();
  });

  it('«Silenciar notificaciones» no se parte: el renglón es nowrap', () => {
    conversationsState = [makeConversation()];
    render('landlord');

    abrirMenuDeOpciones();
    const silenciar = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Silenciar notificaciones'),
    );
    expect(silenciar).toBeTruthy();
    expect(silenciar!.className).toContain('whitespace-nowrap');
    // Y el contenedor ya no tiene el ancho fijo que lo partía.
    expect(silenciar!.parentElement!.className).not.toContain('w-52');
  });
});

describe('<MessagesWidget> — plantillas (pedido 4)', () => {
  it('la plantilla llena el campo con las variables resueltas y NO manda nada', async () => {
    const enviar = vi.fn();
    useChatMock.mockReturnValue({
      messages: [],
      isLoading: false,
      isSending: false,
      sendMessage: enviar,
      markAsRead: markAsReadMock,
    });
    listarPlantillasMock.mockResolvedValue({
      plantillas: [
        {
          id: 'pl-1',
          titulo: 'Recordatorio de canon',
          cuerpo: 'Hola {{nombre}}, te recuerdo el canon de {{mes}} de {{inmueble}}.',
          orden: 1,
        },
      ],
    });
    conversationsState = [makeConversation({ name: 'Ana', property: 'Depto Chicó' })];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-plantillas"]'));
    await esperar();

    clic(container.querySelector('[data-testid="plantilla"]'));

    const texto = campoDeMensaje().value;
    expect(texto).toContain('Hola Ana');
    expect(texto).toContain('Depto Chicó');
    expect(texto).not.toContain('{{');
    // 🔴 Lo importante: queda EDITABLE en el campo, nadie lo mandó.
    expect(enviar).not.toHaveBeenCalled();
  });

  it('🔴 lo que no se pudo reemplazar se DICE en pantalla', async () => {
    listarPlantillasMock.mockResolvedValue({
      plantillas: [
        { id: 'pl-2', titulo: 'Saldo', cuerpo: 'Hola {{nombre}}, tu saldo es {{saldo}}.', orden: 1 },
      ],
    });
    conversationsState = [makeConversation({ name: 'Ana' })];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-plantillas"]'));
    await esperar();
    clic(container.querySelector('[data-testid="plantilla"]'));

    // El widget no tiene el saldo, así que la variable queda tal cual…
    expect(campoDeMensaje().value).toContain('{{saldo}}');
    // …y se avisa, en vez de dejar mandar un hueco en silencio.
    const aviso = container.querySelector('[data-testid="plantilla-con-huecos"]');
    expect(aviso).toBeTruthy();
    expect(aviso!.textContent).toContain('{{saldo}}');
  });

  it('el aviso se apaga cuando la persona completa el hueco a mano', async () => {
    listarPlantillasMock.mockResolvedValue({
      plantillas: [
        { id: 'pl-2', titulo: 'Saldo', cuerpo: 'Hola {{nombre}}, tu saldo es {{saldo}}.', orden: 1 },
      ],
    });
    conversationsState = [makeConversation({ name: 'Ana' })];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-plantillas"]'));
    await esperar();
    clic(container.querySelector('[data-testid="plantilla"]'));
    expect(container.querySelector('[data-testid="plantilla-con-huecos"]')).toBeTruthy();

    escribir(campoDeMensaje(), 'Hola Ana, tu saldo es $200.000.');
    expect(container.querySelector('[data-testid="plantilla-con-huecos"]')).toBeNull();
  });

  it('sin plantillas ofrece instalar las sugeridas y después las lista', async () => {
    listarPlantillasMock.mockResolvedValueOnce({ plantillas: [] }).mockResolvedValueOnce({
      plantillas: [{ id: 'pl-3', titulo: 'Bienvenida', cuerpo: 'Hola {{nombre}}.', orden: 1 }],
    });
    conversationsState = [makeConversation()];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-plantillas"]'));
    await esperar();
    expect(container.querySelector('[data-testid="plantillas-vacio"]')).toBeTruthy();

    clic(container.querySelector('[data-testid="instalar-plantillas-sugeridas"]'));
    await esperar();

    expect(instalarSugeridasMock).toHaveBeenCalled();
    expect(container.querySelector('[data-testid="plantilla"]')).toBeTruthy();
  });

  it('🔴 un endpoint que todavía no existe NO se lee como «no tenés plantillas»', async () => {
    listarPlantillasMock.mockRejectedValue(new ApiError(404, 'Not Found'));
    conversationsState = [makeConversation()];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-plantillas"]'));
    await esperar();

    expect(container.querySelector('[data-testid="plantillas-no-disponible"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="plantillas-vacio"]')).toBeNull();
  });
});

describe('<MessagesWidget> — pendientes de la persona (pedido 5)', () => {
  it('un cobro se convierte en un mensaje con plata, fecha y mora', async () => {
    const enviar = vi.fn();
    useChatMock.mockReturnValue({
      messages: [],
      isLoading: false,
      isSending: false,
      sendMessage: enviar,
      markAsRead: markAsReadMock,
    });
    pendientesMock.mockResolvedValue({
      cobros: [
        {
          id: 'c-1',
          mes: '2026-08',
          totalCop: 2_400_000,
          pendienteCop: 2_400_000,
          vencimiento: '2026-08-05',
          diasDeMora: 12,
          estado: 'OVERDUE',
          contractId: 'ct-1',
          inmueble: 'Depto Chicó',
        },
      ],
      dispersiones: [],
      documentos: [],
    });
    conversationsState = [makeConversation({ name: 'Ana' })];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-pendientes"]'));
    await esperar();
    clic(container.querySelector('[data-testid="pendiente-cobro"]'));

    const texto = campoDeMensaje().value;
    expect(texto).toContain('Hola Ana');
    expect(texto).toContain('agosto de 2026');
    expect(texto).toContain('$2.400.000');
    // 🔴 La fecha NO pasa por `new Date`: en UTC-5 el 05 se leería como el 04.
    expect(texto).toContain('05/08/2026');
    expect(texto).toContain('12 días de mora');
    expect(enviar).not.toHaveBeenCalled();
  });

  it('un documento se convierte en un mensaje con su enlace', async () => {
    pendientesMock.mockResolvedValue({
      cobros: [],
      dispersiones: [],
      documentos: [
        { id: 'd-1', tipo: 'CONTRATO', nombre: 'Contrato 2026', url: 'https://x.test/c.pdf' },
      ],
    });
    conversationsState = [makeConversation({ name: 'Ana' })];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-pendientes"]'));
    await esperar();
    clic(container.querySelector('[data-testid="pendiente-documento"]'));

    expect(campoDeMensaje().value).toContain('https://x.test/c.pdf');
    expect(campoDeMensaje().value).toContain('Contrato 2026');
  });

  it('🔴 «no tiene nada pendiente» y «no pudimos preguntar» se dicen distinto', async () => {
    conversationsState = [makeConversation()];
    render('landlord');

    clic(container.querySelector('[data-testid="abrir-pendientes"]'));
    await esperar();
    expect(container.querySelector('[data-testid="pendientes-vacio"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="pendientes-no-disponible"]')).toBeNull();

    // Cerrar y reabrir con la ruta caída.
    clic(container.querySelector('[data-testid="abrir-pendientes"]'));
    pendientesMock.mockRejectedValue(new ApiError(404, 'Not Found'));
    clic(container.querySelector('[data-testid="abrir-pendientes"]'));
    await esperar();

    expect(container.querySelector('[data-testid="pendientes-no-disponible"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="pendientes-vacio"]')).toBeNull();
  });
});
