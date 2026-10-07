/**
 * PropietarioForm — QA de Propietarios (03-10-2026).
 *
 * P-11 · al enviar con errores, el foco y la vista van al PRIMER campo con
 *        error (se quedaba en «Crear propietario», abajo, con el primero fuera
 *        de la vista).
 * P-13 · la cuenta bancaria es OPCIONAL para crear (Nico, 03-10); a medias no.
 * PR-02 · correo y teléfono opcionales como en el back; el correo, obligatorio
 *        sólo con la política de la inmobiliaria; la cuenta sin el «10 a 20
 *        dígitos» que el back no pide.
 * P-14 / PR-03 · en «Editar», la cuenta que ya existe es de sólo lectura,
 *        enmascarada, con «Cambiar cuenta»; guardar no la manda.
 * Cajón · `accionesAfuera`: los botones los pone el pie del cajón (`form=`).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { permisos, politica } = vi.hoisted(() => ({
  permisos: { valor: null as null | Record<string, unknown> },
  politica: { exigido: false, llamadas: 0 },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
  }),
}));

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));

vi.mock('@/lib/api/facturacion-electronica.service', () => ({
  facturacionElectronicaService: {
    tercerosSinCorreo: async () => {
      politica.llamadas += 1;
      return { exigido: politica.exigido };
    },
  },
}));

import { PropietarioForm } from './PropietarioForm';
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria';

let container: HTMLDivElement;
let root: Root;
let scrollOriginal: typeof Element.prototype.scrollIntoView;
let traidos: Element[];

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  permisos.valor = null;
  politica.exigido = false;
  politica.llamadas = 0;
  traidos = [];
  scrollOriginal = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (this: Element) {
    traidos.push(this);
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Element.prototype.scrollIntoView = scrollOriginal;
});

const JORGE: Propietario = {
  id: 'p1',
  name: 'Jorge Restrepo',
  email: 'jorge@example.com',
  phone: '3101234567',
  documentType: 'CC',
  documentNumber: '71234567',
  bankAccount: {
    bank: 'bancolombia',
    accountType: 'savings',
    accountNumber: '0012344521',
    accountHolder: 'Carlos Restrepo',
  },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  createdAt: '2026-09-07',
  updatedAt: '2026-09-07',
};

/** La misma ficha sin cuenta: así la deja `normalizePropietario` (banco vacío, «Ahorros» por defecto). */
const SIN_CUENTA = {
  ...JORGE,
  bankAccount: { bank: '', accountType: 'savings', accountNumber: '', accountHolder: '' },
} as unknown as Propietario;

async function render(props: Partial<React.ComponentProps<typeof PropietarioForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  await act(async () => {
    root.render(<PropietarioForm mode="create" onSubmit={onSubmit} onCancel={() => {}} {...props} />);
  });
  return onSubmit;
}

/** El control de un campo: su `id` termina en el nombre del campo. */
const control = (campo: string) => container.querySelector<HTMLElement>(`[id$="${campo}"]`);

async function escribir(campo: string, valor: string) {
  const input = control(campo) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function enviar() {
  const form = container.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('P-11 — al enviar con errores, el foco y la vista van al primero', () => {
  it('🔴 el formulario vacío lleva al número de documento (el primero), no deja el foco en el botón', async () => {
    const onSubmit = await render();
    await enviar();

    expect(onSubmit).not.toHaveBeenCalled();
    const documento = control('documentNumber');
    expect(documento).not.toBeNull();
    expect(document.activeElement).toBe(documento);
    // Y se trae a la vista: con el cuerpo del cajón desplazado, quedaba afuera.
    expect(traidos).toContain(documento);
  });

  it('con el documento puesto, el siguiente con error: el nombre', async () => {
    await render();
    await escribir('documentNumber', '52123456');
    await enviar();
    expect(document.activeElement).toBe(control('name'));
  });

  it('una cuenta a medias lleva al banco, que es el primero de la cuenta que falta', async () => {
    await render();
    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await escribir('accountNumber', '123456789');
    await enviar();
    expect(document.activeElement).toBe(control('bankCode'));
  });
});

describe('P-13 / PR-02 — lo que el back no exige, el formulario tampoco', () => {
  it('🔴 se crea sin cuenta, sin teléfono y sin correo, y no manda una cuenta vacía', async () => {
    const onSubmit = await render();
    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await enviar();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const enviado = onSubmit.mock.calls[0][0] as PropietarioFormData;
    expect(enviado).toMatchObject({ name: 'Paula Gómez', documentNumber: '52123456', phone: '', email: '' });
    // Nada de la cuenta: ni número vacío, ni «Ahorros», ni titular.
    expect(enviado.accountNumber).toBeUndefined();
    expect(enviado.accountHolder).toBeUndefined();
    expect(enviado.titularDeLaCuenta).toBeUndefined();
    expect(enviado.bankCode).toBe('');
    expect(enviado.accountType).toBe('');
  });

  it('dice que la cuenta es opcional y por qué', async () => {
    await render();
    expect(container.querySelector('[data-testid="cuenta-opcional"]')?.textContent).toBe(
      'inmobiliaria.propietario.form.bankOptional',
    );
  });

  it('🔴 a medias no se guarda: con el número escrito se piden el banco y el tipo', async () => {
    const onSubmit = await render();
    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await escribir('accountNumber', '123456789');
    await enviar();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('inmobiliaria.propietario.form.errBankRequired');
    expect(container.textContent).toContain('inmobiliaria.propietario.form.errAccountTypeRequired');
    // Empezada, los tres se marcan como requeridos también para el lector de pantalla.
    expect(control('bankCode')?.getAttribute('aria-required')).toBe('true');
    expect(control('accountNumber')?.getAttribute('aria-required')).toBe('true');
  });

  it('sin empezar, la cuenta no se marca como requerida', async () => {
    await render();
    expect(control('bankCode')?.getAttribute('aria-required')).toBeNull();
    expect(control('accountNumber')?.getAttribute('aria-required')).toBeNull();
    expect(control('phone')?.getAttribute('aria-required')).toBeNull();
    expect(control('email')?.getAttribute('aria-required')).toBeNull();
  });

  it('🔴 una cuenta de 9 dígitos (hay bancos así) se guarda: el back no pide «10 a 20»', async () => {
    const onSubmit = await render({
      initialFormData: {
        name: 'Paula Gómez',
        email: '',
        phone: '',
        documentType: 'CC',
        documentNumber: '52123456',
        bankCode: 'bancolombia',
        accountType: 'savings',
        accountNumber: '123456789',
        accountHolder: '',
      },
    });
    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((onSubmit.mock.calls[0][0] as PropietarioFormData).accountNumber).toBe('123456789');
  });

  it('el teléfono es texto libre, como lo guarda el back', async () => {
    const onSubmit = await render();
    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await escribir('phone', '3103640479 / NELSON - ESPOSO');
    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('un correo escrito se sigue revisando', async () => {
    const onSubmit = await render();
    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await escribir('email', 'paula@');
    await enviar();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('inmobiliaria.propietario.form.errEmailInvalid');
  });
});

describe('PR-02 — el correo, obligatorio sólo con la política de la inmobiliaria', () => {
  const conPermisos = () => {
    permisos.valor = { isAdmin: true, isLoading: false, canAccess: () => true };
  };

  it('🔴 con la política prendida, sin correo no se guarda y el campo lo dice', async () => {
    conPermisos();
    politica.exigido = true;
    const onSubmit = await render();
    expect(politica.llamadas).toBe(1);
    expect(control('email')?.getAttribute('aria-required')).toBe('true');
    expect(container.textContent).toContain('Tu inmobiliaria pide el correo de cada propietario.');

    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await enviar();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('inmobiliaria.propietario.form.errEmailRequired');
    expect(document.activeElement).toBe(control('email'));
  });

  it('con la política apagada, el correo es opcional', async () => {
    conPermisos();
    politica.exigido = false;
    const onSubmit = await render();
    await escribir('documentNumber', '52123456');
    await escribir('name', 'Paula Gómez');
    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('P-14 / PR-03 — en «Editar», la cuenta registrada es de sólo lectura', () => {
  it('🔴 se ve enmascarada, no se puede escribir y guardar no la manda', async () => {
    const onSubmit = await render({ mode: 'edit', initialData: JORGE });

    const bloque = container.querySelector('[data-testid="cuenta-de-solo-lectura"]');
    expect(bloque).not.toBeNull();
    expect(container.querySelector('[data-testid="cuenta-enmascarada"]')?.textContent).toBe('•••• 4521');
    // El número entero no está en ningún lado de la pantalla.
    expect(container.textContent).not.toContain('0012344521');
    expect(control('accountNumber')).toBeNull();
    expect(control('bankCode')).toBeNull();

    await escribir('phone', '3009998877');
    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const enviado = onSubmit.mock.calls[0][0] as PropietarioFormData;
    expect(enviado.phone).toBe('3009998877');
    expect(enviado.accountNumber).toBeUndefined();
    expect(enviado.accountHolder).toBeUndefined();
    expect(enviado.bankCode).toBe('');
    expect(enviado.accountType).toBe('');
  });

  it('«Cambiar cuenta» lleva al flujo controlado de la ficha', async () => {
    await render({ mode: 'edit', initialData: JORGE });
    const enlace = container.querySelector<HTMLAnchorElement>('a[data-testid="cambiar-cuenta"]');
    expect(enlace?.getAttribute('href')).toBe('/panel/inmobiliaria/propietarios/p1?cambiarCuenta=1');
  });

  it('dentro de la ficha, «Cambiar cuenta» lo abre quien monta el formulario', async () => {
    const onCambiarCuenta = vi.fn();
    await render({ mode: 'edit', initialData: JORGE, onCambiarCuenta });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[data-testid="cambiar-cuenta"]')!.click();
    });
    expect(onCambiarCuenta).toHaveBeenCalledTimes(1);
  });

  it('sin cuenta todavía, la PRIMERA se registra en «Editar»', async () => {
    await render({
      mode: 'edit',
      initialData: SIN_CUENTA,
    });
    expect(container.querySelector('[data-testid="cuenta-de-solo-lectura"]')).toBeNull();
    expect(control('accountNumber')).not.toBeNull();
    expect(container.querySelector('[data-testid="cuenta-opcional"]')?.textContent).toBe(
      'inmobiliaria.propietario.form.bankFirstTime',
    );
  });

  it('editar una ficha sin cuenta y sin tocarla no manda el «Ahorros» que puso la normalización', async () => {
    const onSubmit = await render({
      mode: 'edit',
      initialData: SIN_CUENTA,
    });
    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((onSubmit.mock.calls[0][0] as PropietarioFormData).accountType).toBe('');
  });
});

describe('Cajón — los botones van en el pie del cajón', () => {
  it('con `accionesAfuera` el formulario no pinta sus botones y lleva el id para el `form=` del pie', async () => {
    await render({ accionesAfuera: true, idDelFormulario: 'propietario-nuevo-x' });
    expect(container.querySelector('form')?.id).toBe('propietario-nuevo-x');
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });

  it('sin él, el formulario de siempre con «Cancelar» y el botón de guardar', async () => {
    await render();
    expect(container.querySelector('button[type="submit"]')?.textContent).toContain(
      'inmobiliaria.propietario.form.createOwner',
    );
  });
});
