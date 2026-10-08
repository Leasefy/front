/**
 * Pestaña «Calidad» de Portales (Niti · calidad) contra DOBLES del cliente del
 * micro: los cuerpos salen del contrato (`niti-contrato.json`, sección
 * `panel`), el micro se construye en paralelo.
 *
 * Vive en dos lugares: la pestaña de Portales (`variante` por defecto) y su
 * propia fila en «Agentes IA» (`variante="pagina"`). Desde el glow up del
 * 30-09-2026 cada estado tiene su forma: consultando, sin verificar, apagado,
 * prendido sin primera pasada, con datos y la última pasada fallida.
 *
 * Lo que no puede pasar:
 *   · pedir la lista con Niti apagado, o que el apagado parezca un error;
 *   · decir «Apagado» sin haber podido preguntar;
 *   · cifras en cero antes de la primera pasada (se leen como datos);
 *   · colores clavados (hex o `dark:bg-[…]`): claro y oscuro salen de tokens;
 *   · ofrecer un botón de aprobar que no corresponde a la acción (o a una que
 *     el front no conoce);
 *   · decidir y no decir qué pasó (el `mensaje` del micro) ni refrescar;
 *   · botones de escribir para quien no puede editar inmuebles.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import contrato from '@/lib/api/__tests__/niti-contrato.json';
import type { InmuebleAuditado, PaginaDeCalidad, ResumenDeCalidad } from '@/lib/types/niti';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  api: { resumen: vi.fn(), inmuebles: vi.fn(), decidir: vi.fn() },
  canAccess: vi.fn((_m: string, _a: string) => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/api/niti.service', () => ({ nitiApi: h.api }));
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'agencia-1' } }) }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: h.canAccess }) }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}));

import { CalidadDeLasPublicaciones } from './CalidadDeLasPublicaciones';

const RESUMEN = contrato.panel.resumen.cuerpo as ResumenDeCalidad;
const ITEM = contrato.panel.inmuebles.cuerpo.items[0] as InmuebleAuditado;

const pagina = (items: InmuebleAuditado[]): PaginaDeCalidad => ({ items, total: items.length, page: 1, limit: 20 });

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  h.api.resumen.mockReset().mockResolvedValue(RESUMEN);
  h.api.inmuebles.mockReset().mockResolvedValue(pagina([ITEM]));
  h.api.decidir.mockReset();
  h.canAccess.mockReset().mockReturnValue(true);
  h.toast.success.mockReset();
  h.toast.error.mockReset();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function esperar() {
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function montar(variante?: 'pagina' | 'pestana') {
  await act(async () => raiz.render(<CalidadDeLasPublicaciones variante={variante} />));
  await esperar();
}

const q = (sel: string) => contenedor.querySelector(sel);
const pildora = () => q('[data-testid="estado-de-niti"]');

/**
 * Toda clase de color sale de un token: nada de hex ni de valores arbitrarios
 * de color. Se excluye el `disabled:text-[#…]` de los BOTONES de cadence (la
 * paginación, y «Abrir ficha», que es un `Button asChild` sobre un enlace):
 * es del sistema de diseño, no de esta pantalla.
 */
function clasesConColorClavado(): string[] {
  const malas: string[] = [];
  for (const el of Array.from(contenedor.querySelectorAll('[class]'))) {
    for (const c of (el.getAttribute('class') ?? '').split(/\s+/)) {
      if ((el.tagName === 'BUTTON' || el.tagName === 'A') && c.startsWith('disabled:')) continue;
      if (/(^|:)(bg|text|border|from|to|via|fill|stroke)-\[(#|rgb|hsl)/.test(c) || /gradient/.test(c)) malas.push(`${el.tagName}[${el.getAttribute('role') ?? ''}] ${c}`);
    }
  }
  return malas;
}

const texto = () => contenedor.textContent ?? '';
const botones = (etiqueta: string) =>
  Array.from(contenedor.querySelectorAll('button')).filter((b) => b.textContent?.trim() === etiqueta);

async function clic(el: Element | undefined) {
  if (!el) throw new Error('no está el elemento');
  await act(async () => {
    (el as HTMLElement).click();
  });
  await esperar();
}

describe('Niti apagado', () => {
  it('dice quién lo prende, NO pide la lista y no tiene cara de error', async () => {
    h.api.resumen.mockResolvedValue({ ...RESUMEN, activo: false });
    await montar('pagina');
    expect(pildora()?.getAttribute('data-estado')).toBe('apagado');
    expect(pildora()?.textContent).toContain('Apagado');
    const apagado = q('[data-testid="calidad-apagado"]')?.textContent ?? '';
    expect(apagado).toContain('Lo prende el equipo técnico de Leasefy');
    expect(apagado).toContain('no audita tus inmuebles');
    expect(h.api.inmuebles).not.toHaveBeenCalled();
    // Apagado no es un fallo: ni alerta, ni «Intentar de nuevo», ni cifras.
    expect(q('[role="alert"]')).toBeNull();
    expect(q('[data-severidad="danger"]')).toBeNull();
    expect(texto()).not.toMatch(/intentar de nuevo/i);
    expect(q('[data-testid="calidad-cifras"]')).toBeNull();
    // La píldora ya dice «Apagado»: el cuerpo no lo repite con otras palabras.
    expect(apagado).not.toMatch(/apagado/i);
  });

  it('el color del apagado es neutro (no amarillo ni rojo)', async () => {
    h.api.resumen.mockResolvedValue({ ...RESUMEN, activo: false });
    await montar('pagina');
    const clase = pildora()?.getAttribute('class') ?? '';
    expect(clase).toContain('bg-surface-muted');
    expect(clase).not.toMatch(/warning|danger/);
  });
});

describe('Niti: la pantalla propia y la pestaña de Portales', () => {
  it('como página: margen del panel, «Agentes IA» y un h1 con el nombre de su fila', async () => {
    await montar('pagina');
    const raizDeLaPantalla = q('[data-testid="calidad-de-las-publicaciones"]');
    expect(raizDeLaPantalla?.className).toContain('p-6');
    expect(raizDeLaPantalla?.className).toContain('lg:p-8');
    expect(q('h1')?.textContent).toBe('Calidad de publicaciones · Niti');
    expect(q('[data-testid="calidad-encabezado"]')?.textContent).toContain('Agentes IA');
  });

  it('como pestaña: sin h1 propio ni margen (Portales ya los pone)', async () => {
    await montar();
    expect(q('h1')).toBeNull();
    expect(q('h2')?.textContent).toBe('Niti · calidad');
    expect(q('[data-testid="calidad-de-las-publicaciones"]')?.className).not.toContain('p-6');
  });

  it('claro y oscuro salen de tokens: ninguna clase con color clavado ni degradado', async () => {
    await montar('pagina');
    expect(clasesConColorClavado()).toEqual([]);
    h.api.resumen.mockResolvedValue({ ...RESUMEN, activo: false });
    act(() => raiz.unmount());
    raiz = createRoot(contenedor);
    await montar('pagina');
    expect(clasesConColorClavado()).toEqual([]);
  });
});

describe('Niti: consultando y sin verificar', () => {
  it('mientras pregunta: «Consultando…», esqueleto y ninguna cifra', async () => {
    h.api.resumen.mockReturnValue(new Promise(() => undefined));
    await montar('pagina');
    expect(pildora()?.getAttribute('data-estado')).toBe('cargando');
    expect(q('[data-testid="calidad-cargando"]')).not.toBeNull();
    expect(q('[data-testid="calidad-cifras"]')).toBeNull();
    expect(h.api.inmuebles).not.toHaveBeenCalled();
  });

  it('si el resumen no se pudo leer: «Sin verificar» (nunca «Apagado»), el fallo y reintentar', async () => {
    h.api.resumen.mockRejectedValue(new Error('500'));
    await montar('pagina');
    expect(pildora()?.getAttribute('data-estado')).toBe('sin-verificar');
    expect(pildora()?.textContent).not.toContain('Apagado');
    expect(q('[data-testid="calidad-apagado"]')).toBeNull();
    expect(h.api.inmuebles).not.toHaveBeenCalled();
    const reintentar = Array.from(contenedor.querySelectorAll('button')).find((b) =>
      /intentar/i.test(b.textContent ?? ''),
    );
    expect(reintentar).toBeTruthy();

    h.api.resumen.mockResolvedValue(RESUMEN);
    await clic(reintentar);
    expect(pildora()?.getAttribute('data-estado')).toBe('prendido');
    expect(q('[data-testid="calidad-cifras"]')).not.toBeNull();
  });
});

describe('Niti prendido sin primera pasada', () => {
  it('sin cifras en cero ni «última pasada»: la lista vacía lo dice con palabras', async () => {
    h.api.resumen.mockResolvedValue({
      ...RESUMEN,
      ultimaPasada: null,
      inmueblesAuditados: 0,
      conProblemas: 0,
      puntajePromedio: null,
    });
    h.api.inmuebles.mockResolvedValue(pagina([]));
    await montar('pagina');
    expect(pildora()?.getAttribute('data-estado')).toBe('prendido');
    expect(q('[data-testid="calidad-cifras"]')).toBeNull();
    expect(q('[data-testid="calidad-ultima-pasada"]')).toBeNull();
    expect(texto()).toContain('Niti todavía no ha auditado ningún inmueble');
    // Y no se dice dos veces.
    expect(texto()).not.toContain('Todavía no ha hecho su primera pasada.');
  });
});

describe('Niti prendido', () => {
  it('el encabezado dice quién es, que está prendido y cuándo pasó; la franja, las cifras', async () => {
    await montar();
    expect(h.api.resumen).toHaveBeenCalledWith('agencia-1');
    const encabezado = contenedor.querySelector('[data-testid="calidad-encabezado"]')?.textContent ?? '';
    expect(encabezado).toContain('Niti · calidad');
    expect(pildora()?.getAttribute('data-estado')).toBe('prendido');
    expect(q('[data-testid="calidad-ultima-pasada"]')?.textContent).toContain('Última pasada');
    const cifras = contenedor.querySelector('[data-testid="calidad-cifras"]')?.textContent ?? '';
    expect(cifras).toContain('81');
    expect(cifras).toContain('37');
    expect(cifras).toContain('120');
    expect(cifras).toContain('42');
    expect(cifras).toMatch(/0[.,]42/);
    expect(cifras).toMatch(/5/);
  });

  it('a 390 px el filtro es un select (los cuatro segmentos no caben)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((consulta: string) => ({
      matches: /max-width/.test(consulta),
      media: consulta,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      await montar('pagina');
      expect(q('[data-testid="calidad-filtro-movil"]')).not.toBeNull();
      expect(q('[role="radiogroup"], [role="tablist"]')).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it('sin IA de fotos, el encabezado no habla de fotos con IA', async () => {
    h.api.resumen.mockResolvedValue({ ...RESUMEN, fotosIA: { ...RESUMEN.fotosIA, activo: false } });
    await montar();
    expect(contenedor.querySelector('[data-testid="calidad-fotos-ia"]')).toBeNull();
  });

  it('un error en la última pasada se ve', async () => {
    h.api.resumen.mockResolvedValue({ ...RESUMEN, errorDeLaUltimaPasada: 'sin conexión con el back' });
    await montar();
    expect(contenedor.querySelector('[data-testid="calidad-error-de-la-pasada"]')?.textContent).toContain(
      'sin conexión con el back',
    );
  });

  it('pide la primera página con «todos» y pinta lo del contrato tal cual', async () => {
    await montar();
    expect(h.api.inmuebles).toHaveBeenCalledWith('agencia-1', { page: 1, limit: 20, filtro: 'todos' });
    const fila = contenedor.querySelector(`[data-testid="calidad-inmueble-${ITEM.propertyId}"]`);
    const t = fila?.textContent ?? '';
    expect(t).toContain('Apartamento 101 en Chicó');
    expect(t).toContain('43');
    expect(t).toContain('Chicó');
    expect(t).toContain('63');
    expect(t).toContain('4 fotos más (el aviso necesita al menos 5)');
    expect(t).toContain('El canon está 2,4 veces por encima de la mediana de apartamentos estrato 5 en Bogotá.');
    expect(t).toContain('Poner el barrio «Chicó Norte» (lo tiene la consignación).');
    const foto = fila?.querySelector('img');
    expect(foto?.getAttribute('src')).toBe('https://storage.example.com/inmuebles/f000/1.jpg');
    expect(t).toContain('Tiene la marca de agua de otro portal.');
    const ficha = Array.from(fila?.querySelectorAll('a') ?? []).find((a) => a.textContent?.includes('Abrir ficha'));
    expect(ficha?.getAttribute('href')).toBe(ITEM.href);
  });

  it('cambiar el filtro vuelve a la página 1 con ese filtro', async () => {
    await montar();
    await clic(botones('Posible tomado')[0]);
    expect(h.api.inmuebles).toHaveBeenLastCalledWith('agencia-1', { page: 1, limit: 20, filtro: 'posible_tomado' });
  });
});

describe('las propuestas', () => {
  const conPropuestas = (propuestas: InmuebleAuditado['propuestas']) =>
    h.api.inmuebles.mockResolvedValue(pagina([{ ...ITEM, propuestas }]));

  it('cada acción con su botón; una acción desconocida sólo se puede rechazar', async () => {
    conPropuestas([
      { id: 'p-campo', tipo: 'aplicable', texto: 'Barrio', accion: 'campo' },
      { id: 'p-portada', tipo: 'aplicable', texto: 'Portada', accion: 'portada' },
      { id: 'p-desp', tipo: 'aplicable', texto: 'Bajarlo', accion: 'despublicar' },
      { id: 'p-tarea', tipo: 'tarea', texto: 'Subir fotos', accion: 'tarea' },
      { id: 'p-rara', tipo: 'aplicable', texto: 'Rara', accion: 'desconocida' },
    ]);
    await montar();
    const de = (id: string) => contenedor.querySelector(`[data-testid="calidad-propuesta-${id}"]`)?.textContent ?? '';
    expect(de('p-campo')).toContain('Aprobar y aplicar');
    expect(de('p-portada')).toContain('Aprobar y aplicar');
    expect(de('p-desp')).toContain('Despublicar');
    expect(de('p-desp')).not.toContain('Aprobar y aplicar');
    expect(de('p-tarea')).toContain('Marcar como hecha');
    expect(de('p-rara')).not.toMatch(/Aprobar|Despublicar|Marcar como hecha/);
    for (const id of ['p-campo', 'p-portada', 'p-desp', 'p-tarea', 'p-rara']) expect(de(id)).toContain('Rechazar');
  });

  it('aprobar: decide, muestra el mensaje del micro y refresca la lista y el resumen', async () => {
    h.api.decidir.mockResolvedValue(contrato.panel.decidir.respuesta.cuerpo);
    await montar();
    const antesLista = h.api.inmuebles.mock.calls.length;
    const antesResumen = h.api.resumen.mock.calls.length;
    await clic(botones('Aprobar y aplicar')[0]);
    expect(h.api.decidir).toHaveBeenCalledWith('agencia-1', ITEM.propuestas[0].id, 'approve');
    expect(h.toast.success).toHaveBeenCalledWith('Listo: se puso el barrio «Chicó Norte».');
    expect(h.api.inmuebles.mock.calls.length).toBeGreaterThan(antesLista);
    expect(h.api.resumen.mock.calls.length).toBeGreaterThan(antesResumen);
  });

  it('despublicar es UN clic, sin diálogo', async () => {
    conPropuestas([{ id: 'p-desp', tipo: 'aplicable', texto: 'Bajarlo', accion: 'despublicar' }]);
    h.api.decidir.mockResolvedValue({ id: 'p-desp', estado: 'aplicada', mensaje: 'Listo: se despublicó de todos los portales.' });
    await montar();
    await clic(botones('Despublicar')[0]);
    expect(h.api.decidir).toHaveBeenCalledWith('agencia-1', 'p-desp', 'approve');
    expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull();
    expect(h.toast.success).toHaveBeenCalledWith('Listo: se despublicó de todos los portales.');
  });

  it('rechazar manda reject', async () => {
    h.api.decidir.mockResolvedValue({ id: 'x', estado: 'rechazada', mensaje: 'Niti no la vuelve a proponer.' });
    await montar();
    await clic(botones('Rechazar')[0]);
    expect(h.api.decidir).toHaveBeenCalledWith('agencia-1', ITEM.propuestas[0].id, 'reject');
    expect(h.toast.success).toHaveBeenCalledWith('Niti no la vuelve a proponer.');
  });

  it('«fallida» (el back no la pudo aplicar) se dice como error, con el motivo', async () => {
    h.api.decidir.mockResolvedValue({ id: 'x', estado: 'fallida', mensaje: 'El dato cambió desde que Niti lo propuso.' });
    await montar();
    await clic(botones('Aprobar y aplicar')[0]);
    expect(h.toast.error).toHaveBeenCalledWith('El dato cambió desde que Niti lo propuso.');
    expect(h.toast.success).not.toHaveBeenCalled();
  });

  it('sin permiso de editar inmuebles no hay botones de decidir', async () => {
    h.canAccess.mockImplementation((m: string, a: string) => !(m === 'portafolio' && a === 'edit'));
    await montar();
    expect(texto()).toContain('Poner el barrio «Chicó Norte» (lo tiene la consignación).');
    expect(botones('Aprobar y aplicar')).toHaveLength(0);
    expect(botones('Rechazar')).toHaveLength(0);
  });
});

describe('estados', () => {
  it('sin inmuebles auditados, lo dice (no una tabla vacía)', async () => {
    h.api.inmuebles.mockResolvedValue(pagina([]));
    await montar();
    expect(texto()).toContain('Niti todavía no ha auditado ningún inmueble');
  });

  it('si la lista no carga, se dice y se puede reintentar', async () => {
    h.api.inmuebles.mockRejectedValue(new Error('caído'));
    await montar();
    expect(Array.from(contenedor.querySelectorAll('button')).some((b) => /intentar/i.test(b.textContent ?? ''))).toBe(
      true,
    );
  });
});
