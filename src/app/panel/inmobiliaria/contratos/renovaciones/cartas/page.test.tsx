/**
 * La cola de cartas del incremento, en su propia pantalla (19-09-2026).
 *
 * 🔴 Estas pruebas vivían en `BandejaDeCartasDelIncremento.test.tsx` cuando la
 * lista estaba encima de Renovaciones. Se mudaron con la lista, no se
 * reescribieron: lo que protegen es lo mismo de D6 —enviar desde la cola, un
 * correo SIMULADO no se canta como enviado, sin correo del inquilino no se
 * manda y se dice qué hacer, sin permiso se lee y no se manda— porque mover
 * una pantalla de lugar no puede aflojar lo que ya estaba garantizado.
 *
 * Lo nuevo es el chrome de la casa: el estado llega por la URL (es el camino
 * que abrió la loseta), hay buscador, alcance y paginación.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ params: new URLSearchParams(), canAccess: vi.fn(() => true) }));

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: { bandejaDeCartas: vi.fn(), enviarCarta: vi.fn(), verCarta: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => h.params }));
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...resto
  }: { href: string; children?: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}));

import { cicloDeVidaApi, type CartaEnLaBandeja } from '@/lib/api/ciclo-de-vida.service';
import { toast } from '@/components/ui/toast';
import Pagina from './page';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

function carta(over: Partial<CartaEnLaBandeja> = {}): CartaEnLaBandeja {
  return {
    contractId: 'c1',
    code: 120,
    externalId: '1850',
    inquilino: 'Ana Díaz',
    correoDelInquilino: 'ana@example.com',
    inmueble: 'Cra 76 # 32-11',
    desde: '2026-10-01',
    diasParaElAniversario: 14,
    estado: 'POR_ENVIAR',
    alertaRoja: false,
    origen: 'IPC',
    porcentaje: 5.1,
    canonAnteriorCop: 2_000_000,
    canonNuevoCop: 2_102_000,
    contenido: 'Señor(a) Ana Díaz…',
    enviadaAt: null,
    medio: null,
    ultimoIntento: null,
    ...over,
  };
}

function bandeja(cartas: CartaEnLaBandeja[], extra: Record<string, unknown> = {}) {
  return {
    diasAntes: 30,
    disponible: true,
    porEnviar: cartas.filter((c) => c.estado === 'POR_ENVIAR').length,
    vencidasSinConstancia: cartas.filter((c) => c.alertaRoja).length,
    enviadas: cartas.filter((c) => c.estado === 'ENVIADA').length,
    cartas,
    ...extra,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  h.params = new URLSearchParams();
  h.canAccess.mockReturnValue(true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar() {
  await act(async () => {
    root!.render(<Pagina />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function escribir(texto: string) {
  const input = $('buscar-cartas') as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('la cola de cartas — lo que D6 garantizaba sigue garantizado', () => {
  it('lista la carta con el canon de antes y el nuevo, y desde cuándo', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    const fila = $('carta-c1-2026-10-01')!;
    expect(fila.textContent).toContain('#1850');
    // 🔴 19-09: acá se esperaba el crudo `2026-10-01`. El testid sigue siendo
    // la fecha ISO —es la llave de la fila, no texto para leer—, pero lo que
    // se ESCRIBE es la fecha en español.
    expect(fila.textContent).toContain('1 oct 2026');
  });

  /*
   * 🔴 19-10-2026 (Juan, Portofino: «no me salió qué tipo de carta enviamos, y
   * ya la enviamos»; Nico eligió «vista previa y confirmar»): enviar ya NO es
   * un clic a ciegas. La fila abre el cajón con el correo tal como sale y el
   * botón del cajón manda EXACTAMENTE el texto que se ve. Lo demás que D6
   * garantizaba sigue igual.
   */
  function vista(over: Record<string, unknown> = {}) {
    return {
      contractId: 'c1',
      desde: '2026-10-01',
      estado: 'POR_ENVIAR',
      inquilino: 'Ana Díaz',
      inmueble: 'Cra 76 # 32-11',
      canonAnteriorCop: 2_000_000,
      canonNuevoCop: 2_102_000,
      para: 'ana@example.com',
      asunto: 'Incremento del canon de arrendamiento desde el 1 de octubre de 2026',
      contenido: 'Señor(a) Ana Díaz: le informamos…',
      corregida: false,
      reajuste: null,
      enviada: null,
      correoSaleDeVerdad: true,
      envioHabilitado: true,
      ...over,
    };
  }
  /** El cajón vive en un portal: se busca en todo el documento. */
  const $$ = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

  async function abrirLaCarta(boton = 'ver-y-enviar-c1') {
    await act(async () => ($(boton) as HTMLButtonElement).click());
    await act(async () => {});
  }

  it('la fila dice qué carta es antes de abrirla', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    expect($('tipo-de-carta-c1')!.textContent).toContain('Carta de incremento por IPC del 5,1 %');
  });

  it('enviar pasa por la vista previa: se ve el correo y sale el texto que se ve', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    api.verCarta.mockResolvedValue(vista());
    api.enviarCarta.mockResolvedValue({
      ultimoEnvio: { resultado: 'ENVIADA', mensaje: 'La carta salió a ana@example.com.' },
    });
    await montar();
    await abrirLaCarta();
    expect(api.verCarta).toHaveBeenCalledWith('c1', '2026-10-01');
    expect(api.enviarCarta).not.toHaveBeenCalled();
    expect($$('texto-de-la-carta')!.textContent).toContain('Señor(a) Ana Díaz');
    expect(document.body.textContent).toContain('Incremento del canon de arrendamiento desde el 1 de octubre de 2026');
    const enviar = $$('enviar-la-carta') as HTMLButtonElement;
    expect(enviar.textContent).toContain('Enviar a ana@example.com');
    await act(async () => enviar.click());
    expect(api.enviarCarta).toHaveBeenCalledWith('c1', '2026-10-01', 'Señor(a) Ana Díaz: le informamos…');
    expect(toastMock.success).toHaveBeenCalled();
    expect(api.bandejaDeCartas).toHaveBeenCalledTimes(2);
  });

  it('🔴 un correo SIMULADO no se canta como enviado', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    api.verCarta.mockResolvedValue(vista());
    api.enviarCarta.mockResolvedValue({
      ultimoEnvio: {
        resultado: 'SIMULADA',
        mensaje: 'El envío de correos está apagado en este entorno.',
      },
    });
    await montar();
    await abrirLaCarta();
    await act(async () => ($$('enviar-la-carta') as HTMLButtonElement).click());
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      'La carta no salió.',
      expect.objectContaining({ description: expect.any(String) }),
    );
  });

  it('sin correo del inquilino no deja enviar y dice qué hacer', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta({ correoDelInquilino: null })]));
    api.verCarta.mockResolvedValue(vista({ para: null }));
    await montar();
    expect(container!.textContent).toContain('entrégala por otro medio');
    await abrirLaCarta();
    expect(($$('enviar-la-carta') as HTMLButtonElement).disabled).toBe(true);
    expect(document.body.textContent).toContain('El contrato no tiene correo del inquilino');
  });

  it('una carta ENVIADA se abre con lo que salió, a quién, cuándo y quién la envió', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ estado: 'ENVIADA', enviadaAt: '2026-10-19T21:12:00.000Z', medio: 'CORREO' })]),
    );
    api.verCarta.mockResolvedValue(
      vista({
        estado: 'ENVIADA',
        para: 'ana@example.com',
        enviada: {
          at: '2026-10-19T21:12:00.000Z',
          por: 'Juan Camilo López',
          medio: 'CORREO',
          constancia: '<abc@resend>',
          soporteNombre: null,
        },
      }),
    );
    await montar();
    await abrirLaCarta('ver-enviada-c1');
    const cuando = $$('carta-enviada-cuando')!.textContent ?? '';
    expect(cuando).toContain('19 de octubre de 2026');
    expect(cuando).toContain('Juan Camilo López');
    expect($$('texto-de-la-carta')!.textContent).toContain('Señor(a) Ana Díaz');
    expect($$('enviar-la-carta')).toBeNull();
  });

  it('🔴 con el mes ya facturado, el cajón dice la diferencia y en qué factura llega', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    api.verCarta.mockResolvedValue(
      vista({ reajuste: { valorCop: 30_402.8, deMes: '2026-10', enMes: '2026-11' } }),
    );
    await montar();
    await abrirLaCarta();
    const aviso = $$('carta-reajuste')!.textContent ?? '';
    expect(aviso).toContain('octubre de 2026');
    expect(aviso).toContain('noviembre de 2026');
    expect(aviso).toMatch(/30\.402,8/);
  });

  it('sin migración se ven las cartas pero no se envían', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()], { disponible: false }));
    await montar();
    expect(container!.textContent).toContain('todavía no se pueden enviar');
    expect($('ver-y-enviar-c1')!.textContent).toBe('Ver la carta');
  });

  it('sin permiso de editar se lee, no se manda', async () => {
    h.canAccess.mockReturnValue(false);
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    api.verCarta.mockResolvedValue(vista());
    await montar();
    expect($('ver-y-enviar-c1')!.textContent).toBe('Ver la carta');
    await abrirLaCarta();
    expect(($$('enviar-la-carta') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('la cola de cartas — el chrome de la casa', () => {
  it('🔴 el estado llega por la URL: es el camino que abrió la loseta', async () => {
    h.params = new URLSearchParams('estado=sin-constancia');
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([
        carta({ contractId: 'c1', estado: 'VENCIDA_SIN_CONSTANCIA', alertaRoja: true }),
        carta({ contractId: 'c2', estado: 'POR_ENVIAR' }),
      ]),
    );
    await montar();
    expect($('carta-c1-2026-10-01')).not.toBeNull();
    expect($('carta-c2-2026-10-01')).toBeNull();
    expect($('alcance-de-cartas')!.textContent).toContain('1 de 2 cartas');
  });

  /*
   * 🔴 19-09 · Visto en el navegador: la cola escribía las fechas CRUDAS
   * —«desde el 2026-01-20», «Llegó el aniversario (2026-01-20)»— en la única
   * pantalla donde la fecha decide si hay que correr, y ninguna otra del panel
   * las escribe así. Y la alerta iba con un emoji 🔴 literal: el mismo que uso
   * en los comentarios del código, filtrado a la cara del usuario.
   */
  it('🔴 las fechas se escriben en español, no en `YYYY-MM-DD`', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ contractId: 'c1', desde: '2026-01-20' })]),
    );
    await montar();
    const texto = $('carta-c1-2026-01-20')!.textContent ?? '';
    expect(texto).toContain('20 ene 2026');
    expect(texto).not.toContain('2026-01-20');
  });

  it('🔴 la alerta va con icono, no con un emoji', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([
        carta({ contractId: 'c1', estado: 'VENCIDA_SIN_CONSTANCIA', alertaRoja: true }),
      ]),
    );
    await montar();
    expect(container!.textContent).toContain('sin constancia de la carta');
    expect(container!.textContent).not.toContain('🔴');
  });

  it('sin `estado` en la URL se ven todas', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ contractId: 'c1' }), carta({ contractId: 'c2' })]),
    );
    await montar();
    expect(container!.querySelectorAll('[data-testid^="carta-"]')).toHaveLength(2);
    expect($('alcance-de-cartas')).toBeNull();
  });

  it('busca por contrato, inquilino o inmueble, sin tildes', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([
        carta({ contractId: 'c1', inquilino: 'Ana Díaz' }),
        carta({ contractId: 'c2', inquilino: 'Beto Ruiz', externalId: '9001' }),
      ]),
    );
    await montar();
    await escribir('diaz');
    expect($('carta-c1-2026-10-01')).not.toBeNull();
    expect($('carta-c2-2026-10-01')).toBeNull();
    await escribir('9001');
    expect($('carta-c2-2026-10-01')).not.toBeNull();
  });

  it('quitar los filtros devuelve la cola entera', async () => {
    h.params = new URLSearchParams('estado=enviadas');
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ contractId: 'c1' }), carta({ contractId: 'c2' })]),
    );
    await montar();
    expect(container!.querySelectorAll('[data-testid^="carta-"]')).toHaveLength(0);
    await act(async () => ($('limpiar-filtros-cartas') as HTMLButtonElement).click());
    expect(container!.querySelectorAll('[data-testid^="carta-"]')).toHaveLength(2);
  });

  it('🔴 sin «Volver»: el riel de secciones ya deja Renovaciones marcada', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    expect(container!.textContent).not.toContain('Volver');
  });
});
