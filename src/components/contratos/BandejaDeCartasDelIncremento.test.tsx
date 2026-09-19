/**
 * D6 · La bandeja de cartas del incremento (Nico, 17-09).
 *
 * Lo que no puede fallar: la alerta roja del aniversario sin constancia se
 * tiene que VER, enviar es un clic, y un correo que no salió de verdad
 * (simulado, por `EMAIL_DELIVERY_ENABLED`) NO se puede contar como enviado.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: { bandejaDeCartas: vi.fn(), enviarCarta: vi.fn() },
}));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
/*
 * 🔴 El falso pasa TODAS las props, no sólo `href`.
 *
 * Con `{ href, children }` a secas se perdían `data-testid` y `className`, así
 * que las losetas del tablero —que son `<Link>`— quedaban invisibles para las
 * pruebas y para cualquier aserción sobre su color. Un falso que recorta props
 * hace que el test mida otra cosa que la pantalla.
 */
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
import { BandejaDeCartasDelIncremento } from './BandejaDeCartasDelIncremento';

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const toastMock = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function carta(overrides: Partial<CartaEnLaBandeja> = {}): CartaEnLaBandeja {
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
    ...overrides,
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

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
});

async function montar(puedeEditar = true) {
  await act(async () => {
    root!.render(<BandejaDeCartasDelIncremento puedeEditar={puedeEditar} />);
  });
}

const $ = (id: string) => container!.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

/**
 * 🔴 19-09-2026 · De lista infinita a TABLERO.
 *
 * Nico: «es una lista enorme… quizás un tablero que contenga diferente
 * información y de ahí amplío la información si es que son urgentes, críticas
 * etc… y poder ir abriendo esos caminos en la navegación, porque es larguísima
 * esa lista y ni se ve la tabla que hay en la parte de abajo».
 *
 * 57 cartas de cuatro renglones son ~5.700 px ENCIMA de la tabla de
 * Renovaciones. Acá quedó el tablero; la cola se mudó a
 * `/contratos/renovaciones/cartas` y sus pruebas viven con ella
 * (`cartas/page.test.tsx`): enviar con un clic, el correo simulado que no se
 * canta como enviado, el caso sin correo del inquilino y los permisos.
 */
describe('<BandejaDeCartasDelIncremento> — el tablero (D6)', () => {
  it('🔴 NO lista las cartas: son tres losetas con su conteo', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta(), carta({ contractId: 'c2' })]));
    await montar();
    expect($('tablero-de-cartas')).not.toBeNull();
    // Ni una fila de carta, ni un botón de enviar, encima de Renovaciones.
    expect($('carta-c1-2026-10-01')).toBeNull();
    expect($('enviar-c1')).toBeNull();
  });

  it('cada loseta es un CAMINO a la cola ya filtrada', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    const RUTA = '/panel/inmobiliaria/contratos/renovaciones/cartas';
    expect($('loseta-sin-constancia')?.getAttribute('href')).toBe(`${RUTA}?estado=sin-constancia`);
    expect($('loseta-por-enviar')?.getAttribute('href')).toBe(`${RUTA}?estado=por-enviar`);
    expect($('loseta-enviadas')?.getAttribute('href')).toBe(`${RUTA}?estado=enviadas`);
    expect($('abrir-cola-de-cartas')?.getAttribute('href')).toBe(RUTA);
  });

  it('🔴 las vencidas sin constancia se cuentan y se ven distintas', async () => {
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([carta({ estado: 'VENCIDA_SIN_CONSTANCIA', alertaRoja: true })]),
    );
    await montar();
    const loseta = $('loseta-sin-constancia')!;
    expect(loseta.textContent).toContain('1');
    // El único color de la tarjeta se gasta en lo que pide acción hoy.
    expect(loseta.className).toContain('destructive');
  });

  it('en cero, la loseta roja no grita', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()], { vencidasSinConstancia: 0 }));
    await montar();
    expect($('loseta-sin-constancia')!.className).not.toContain('destructive');
  });

  it('sin migración lo dice, sin esconder el tablero', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()], { disponible: false }));
    await montar();
    expect(container!.textContent).toContain('todavía no se pueden enviar');
    expect($('tablero-de-cartas')).not.toBeNull();
  });
});

/**
 * 🔴 19-09-2026 · El vacío pesa un renglón, no una tarjeta.
 *
 * Esto vive encima de la tabla de Renovaciones —183 filas en la agencia
 * migrada— y ocupaba una tarjeta entera para decir «No hay cartas por enviar»,
 * con título, tres contadores en cero y párrafo. Es el mismo defecto que la
 * bandeja del agente en `/pagos`: regalarle el lugar más valioso de la
 * pantalla a un vacío estructural.
 *
 * Lo que NO se puede hacer es esconderla: si desapareciera, nadie sabría que
 * las cartas existen ni que salen solas.
 */
describe('<BandejaDeCartasDelIncremento> — el vacío no se queda con la pantalla', () => {
  it('🔴 sin cartas y sin vencidas es UNA línea, no la tarjeta entera', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([]));
    await montar();
    expect($('bandeja-de-cartas-vacia')).not.toBeNull();
    expect($('bandeja-de-cartas')).toBeNull();
  });

  it('pero sigue diciendo que las cartas existen y cuándo salen', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([]));
    await montar();
    const linea = $('bandeja-de-cartas-vacia')!.textContent ?? '';
    expect(linea).toContain('Cartas del incremento');
    expect(linea).toContain('30 días antes del aniversario');
  });

  it('🔴 con una vencida SIN constancia vuelve la tarjeta: eso hay que verlo', async () => {
    // La alerta roja del pedido D6. Colapsarla sería esconder el único caso
    // que pide una acción hoy.
    api.bandejaDeCartas.mockResolvedValue(
      bandeja([], { vencidasSinConstancia: 2, enviadas: 3 }),
    );
    await montar();
    expect($('bandeja-de-cartas')).not.toBeNull();
    expect($('bandeja-de-cartas-vacia')).toBeNull();
  });

  it('con cartas por enviar también es la tarjeta', async () => {
    api.bandejaDeCartas.mockResolvedValue(bandeja([carta()]));
    await montar();
    expect($('bandeja-de-cartas')).not.toBeNull();
    expect($('bandeja-de-cartas-vacia')).toBeNull();
  });
});
