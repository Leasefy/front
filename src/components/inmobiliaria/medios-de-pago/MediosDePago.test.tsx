/**
 * Lo que se prueba: la lista se lee, el estado vacío ofrece los dos medios
 * de siempre con el cuerpo exacto, los switches mandan sólo su bandera, el
 * error del back se ve, y el editor manda el juego exacto de claves.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { MedioDePago } from '@/lib/api/medios-de-pago.types';

// `vi.mock` se iza al tope del archivo: lo que usan las fábricas tiene que
// nacer con `vi.hoisted`, si no queda «antes de inicializar».
const { listarMock, crearMock, actualizarMock, reordenarMock, toastMock, estado } = vi.hoisted(() => ({
  listarMock: vi.fn(),
  crearMock: vi.fn(),
  actualizarMock: vi.fn(),
  reordenarMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
  estado: { permisos: { canAccess: () => true, isLoading: false } as { canAccess: () => boolean; isLoading: boolean } },
}));
vi.mock('@/lib/api/medios-de-pago.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api/medios-de-pago.service')>();
  return {
    ...original,
    mediosDePagoApi: {
      listar: (...a: unknown[]) => listarMock(...a),
      crear: (...a: unknown[]) => crearMock(...a),
      actualizar: (...a: unknown[]) => actualizarMock(...a),
      desactivar: vi.fn(),
      reordenar: (...a: unknown[]) => reordenarMock(...a),
      catalogo: vi.fn(),
      paraInquilino: vi.fn(),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => estado.permisos }));

vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo-de-carga">{error instanceof Error ? error.message : 'falló'}</div>
  ),
}));

import { MediosDePago } from './MediosDePago';

function medio(extra: Partial<MedioDePago> = {}): MedioDePago {
  return {
    id: 'm1',
    agencyId: 'a1',
    tipo: 'TRANSFERENCIA',
    nombre: 'Transferencia a Bancolombia',
    instrucciones: null,
    banco: 'Bancolombia',
    tipoDeCuenta: 'AHORROS',
    numeroDeCuenta: '12345678901',
    titular: 'Portofino S.A.S.',
    documentoTitular: null,
    enlace: null,
    visibleAlInquilino: true,
    activo: true,
    orden: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...extra,
  };
}

let contenedor: HTMLDivElement;
let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root!.render(<MediosDePago agencia={{ name: 'Portofino', razonSocial: 'Portofino S.A.S.', nit: '900-1' }} />);
  });
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.body.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No está: ${selector}`);
  return el;
}

function botonConTexto(texto: string, dentro: ParentNode = document.body): HTMLButtonElement {
  const b = Array.from(dentro.querySelectorAll('button')).find((x) => (x.textContent ?? '').includes(texto));
  if (!b) throw new Error(`No hay botón «${texto}»`);
  return b;
}

async function clic(el: Element) {
  await act(async () => {
    (el as HTMLElement).click();
  });
  await esperar();
}

function escribir(selector: string, valor: string) {
  const campo = $(selector) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  listarMock.mockReset();
  crearMock.mockReset();
  actualizarMock.mockReset();
  reordenarMock.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  estado.permisos = { canAccess: () => true, isLoading: false };
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
    root = null;
  }
  document.body.innerHTML = '';
});

describe('MediosDePago — la lista', () => {
  it('pinta los medios en orden con su tipo y la frase legible con el número tapado', async () => {
    listarMock.mockResolvedValueOnce([medio(), medio({ id: 'm2', tipo: 'EFECTIVO', nombre: 'Efectivo en la oficina', orden: 1, banco: null, numeroDeCuenta: null, titular: null, tipoDeCuenta: null })]);
    await montar();
    const lista = $('[data-testid="medios-lista"]');
    const filas = Array.from(lista.querySelectorAll('li'));
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Transferencia a Bancolombia');
    expect(filas[0].textContent).toContain('Transferencia bancaria');
    expect(filas[0].textContent).toContain('•••• 8901');
    expect(filas[0].textContent).not.toContain('12345678901');
    expect(filas[1].textContent).toContain('Efectivo en la oficina');
    // Las filas fijas: Wompi y Cobre (apagada).
    expect($('[data-testid="fila-wompi"]').textContent).toContain('PSE por Wompi');
    expect($('[data-testid="tarjeta-cobre"]').getAttribute('aria-disabled')).toBe('true');
  });

  it('el switch de activo manda { activo: false } y sólo eso', async () => {
    listarMock.mockResolvedValueOnce([medio()]);
    actualizarMock.mockResolvedValueOnce(medio({ activo: false }));
    await montar();
    await clic($('[data-testid="activo-m1"]'));
    expect(actualizarMock).toHaveBeenCalledWith('m1', { activo: false });
    expect($('[data-testid="medio-m1"]').textContent).toContain('Apagado');
  });

  it('el switch de visibilidad manda { visibleAlInquilino: false }', async () => {
    listarMock.mockResolvedValueOnce([medio()]);
    actualizarMock.mockResolvedValueOnce(medio({ visibleAlInquilino: false }));
    await montar();
    await clic($('[data-testid="visible-m1"]'));
    expect(actualizarMock).toHaveBeenCalledWith('m1', { visibleAlInquilino: false });
    expect($('[data-testid="medio-m1"]').textContent).toContain('Sólo interno');
  });

  it('si el back rechaza el switch, el mensaje sale por toast', async () => {
    listarMock.mockResolvedValueOnce([medio()]);
    actualizarMock.mockRejectedValueOnce(new Error('No tenés permiso para editar la configuración.'));
    await montar();
    await clic($('[data-testid="activo-m1"]'));
    expect(toastMock.error).toHaveBeenCalledWith('No tenés permiso para editar la configuración.');
  });

  it('bajar un medio manda el orden completo a PUT /orden', async () => {
    listarMock.mockResolvedValueOnce([medio(), medio({ id: 'm2', nombre: 'Nequi', tipo: 'NEQUI', orden: 1 })]);
    reordenarMock.mockResolvedValueOnce([medio({ id: 'm2', nombre: 'Nequi', tipo: 'NEQUI', orden: 0 }), medio({ orden: 1 })]);
    await montar();
    await clic(document.body.querySelector('[aria-label="Bajar «Transferencia a Bancolombia»"]')!);
    expect(reordenarMock).toHaveBeenCalledWith([
      { id: 'm2', orden: 0 },
      { id: 'm1', orden: 1 },
    ]);
  });

  it('sin permiso de edición no hay «Nuevo medio» y los switches quedan deshabilitados', async () => {
    estado.permisos = { canAccess: () => false, isLoading: false };
    listarMock.mockResolvedValueOnce([medio()]);
    await montar();
    expect(Array.from(document.body.querySelectorAll('button')).some((b) => b.textContent?.includes('Nuevo medio'))).toBe(false);
    expect(($('[data-testid="activo-m1"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('un fallo al cargar se muestra', async () => {
    listarMock.mockRejectedValueOnce(new Error('Se cayó la red.'));
    await montar();
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('Se cayó la red.');
  });
});

describe('MediosDePago — el estado vacío y las sugerencias', () => {
  it('«Efectivo en la oficina» se crea de un clic con el cuerpo exacto', async () => {
    listarMock.mockResolvedValueOnce([]);
    crearMock.mockResolvedValueOnce(medio({ id: 'm-ef', tipo: 'EFECTIVO', nombre: 'Efectivo en la oficina' }));
    await montar();
    expect($('[data-testid="medios-vacio"]').textContent).toContain('Todavía no tenés medios de pago');
    await clic(botonConTexto('Usar este medio', $('[data-testid="sugerencia-efectivo"]')));
    expect(crearMock).toHaveBeenCalledWith({ tipo: 'EFECTIVO', nombre: 'Efectivo en la oficina' });
    expect(document.body.querySelector('[data-testid="medios-vacio"]')).toBeNull();
    expect($('[data-testid="medio-m-ef"]').textContent).toContain('Efectivo en la oficina');
  });

  it('la transferencia abre el editor prellenado con titular y NIT de la agencia, y no crea sola', async () => {
    listarMock.mockResolvedValueOnce([]);
    await montar();
    await clic(botonConTexto('Completar la cuenta', $('[data-testid="sugerencia-transferencia"]')));
    expect(crearMock).not.toHaveBeenCalled();
    expect(($('#medio-titular') as HTMLInputElement).value).toBe('Portofino S.A.S.');
    expect(($('#medio-documentoTitular') as HTMLInputElement).value).toBe('900-1');
  });
});

describe('MediosDePago — el editor', () => {
  it('crear manda el juego exacto de claves, con el vacío como null', async () => {
    listarMock.mockResolvedValueOnce([]);
    crearMock.mockResolvedValueOnce(medio({ id: 'm-nuevo' }));
    await montar();
    await clic(botonConTexto('Crear un medio'));
    escribir('#medio-nombre', 'Transferencia a Bancolombia');
    escribir('#medio-banco', 'Bancolombia');
    await clic($('[data-testid="tipo-de-cuenta-AHORROS"]'));
    escribir('#medio-numeroDeCuenta', '12345678901');
    escribir('#medio-titular', 'Portofino S.A.S.');
    await clic(botonConTexto('Crear medio'));
    expect(crearMock).toHaveBeenCalledTimes(1);
    expect(crearMock.mock.calls[0][0]).toEqual({
      tipo: 'TRANSFERENCIA',
      nombre: 'Transferencia a Bancolombia',
      instrucciones: '',
      banco: 'Bancolombia',
      tipoDeCuenta: 'AHORROS',
      numeroDeCuenta: '12345678901',
      titular: 'Portofino S.A.S.',
      documentoTitular: '',
      enlace: '',
      visibleAlInquilino: true,
      activo: true,
    });
    expect($('[data-testid="medio-m-nuevo"]')).toBeTruthy();
  });

  it('una transferencia sin cuenta no llama al back y dice qué falta', async () => {
    listarMock.mockResolvedValueOnce([]);
    await montar();
    await clic(botonConTexto('Crear un medio'));
    escribir('#medio-nombre', 'Transferencia');
    await clic(botonConTexto('Crear medio'));
    expect(crearMock).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('El banco es obligatorio para un medio de tipo Transferencia bancaria.');
  });

  it('un 400 del back se muestra adentro del modal y el modal sigue abierto', async () => {
    listarMock.mockResolvedValueOnce([]);
    crearMock.mockRejectedValueOnce(new Error('El enlace de pago tiene que empezar con https://'));
    await montar();
    await clic(botonConTexto('Crear un medio'));
    await clic($('[data-testid="tipo-EFECTIVO"]'));
    escribir('#medio-nombre', 'Caja');
    await clic(botonConTexto('Crear medio'));
    expect($('[data-testid="error-del-back"]').textContent).toContain('https://');
    expect(document.body.querySelector('#form-medio-de-pago')).not.toBeNull();
  });

  it('editar abre con la regla cargada y guarda por PUT con las claves del formulario', async () => {
    listarMock.mockResolvedValueOnce([medio()]);
    actualizarMock.mockResolvedValueOnce(medio({ nombre: 'Cuenta principal' }));
    await montar();
    await clic(document.body.querySelector('[aria-label="Editar «Transferencia a Bancolombia»"]')!);
    expect(($('#medio-nombre') as HTMLInputElement).value).toBe('Transferencia a Bancolombia');
    escribir('#medio-nombre', 'Cuenta principal');
    await clic(botonConTexto('Guardar cambios'));
    expect(actualizarMock).toHaveBeenCalledTimes(1);
    expect(actualizarMock.mock.calls[0][0]).toBe('m1');
    expect(actualizarMock.mock.calls[0][1]).toMatchObject({ nombre: 'Cuenta principal', tipo: 'TRANSFERENCIA' });
    expect($('[data-testid="medio-m1"]').textContent).toContain('Cuenta principal');
  });
});
