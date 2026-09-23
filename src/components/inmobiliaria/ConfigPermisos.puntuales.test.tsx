/**
 * 🔴 22-09 · Los PERMISOS PUNTUALES en «Permisos por rol».
 *
 * Nico, sobre cambiar la fecha de un egreso: «que sólo lo pueda hacer alguien
 * con permisos». El back lo exige como `reportes:cambiar_fecha_egreso` y por
 * defecto sólo lo tiene el administrador. Esta pantalla es donde la
 * inmobiliaria se lo da a otro rol, y lo que se prueba acá es que:
 *   · aparece con su NOMBRE, aparte de la matriz (no como una columna más);
 *   · marcarlo en el contador lo manda dentro de `reportes` al guardar;
 *   · en el administrador está marcado y no se puede desmarcar;
 *   · «todo el módulo Reportes» NO lo otorga.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { DEFAULT_ROLE_PERMISSIONS, type RolDeLaMatriz, type RolePermissions } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

import { ConfigPermisos } from './ConfigPermisos';

let host: HTMLDivElement;
let root: Root;
const onSave = vi.fn();

beforeEach(() => {
  onSave.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

async function montar() {
  // Copia profunda: la pantalla no debe tocar la constante de fábrica.
  const inicial = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)) as Record<
    RolDeLaMatriz,
    RolePermissions
  >;
  await act(async () => {
    root.render(<ConfigPermisos permissions={inicial} onSave={onSave} />);
  });
}

/** Radix Tabs cambia de pestaña con el `mousedown` del botón izquierdo. */
async function irALaPestana(texto: string) {
  const pestana = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) =>
    b.textContent?.includes(texto),
  );
  if (!pestana) throw new Error(`no hay pestaña «${texto}»`);
  await act(async () => {
    pestana.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
  });
}

const casilla = () =>
  document.querySelector<HTMLButtonElement>('[data-testid="permiso-puntual-cambiar_fecha_egreso"]');

async function clic(el: HTMLElement | null | undefined) {
  if (!el) throw new Error('no hay elemento');
  await act(async () => {
    el.click();
  });
}

function boton(texto: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].filter((b) =>
    b.textContent?.includes(texto),
  ).pop();
}

describe('Permisos por rol · permisos puntuales', () => {
  it('🔴 el administrador lo tiene marcado y no se le puede quitar', async () => {
    await montar();
    const bloque = document.querySelector('[data-testid="permisos-puntuales"]')!;
    expect(bloque).not.toBeNull();
    expect(bloque.textContent).toContain(
      'inmobiliaria.config.permissions.puntuales.cambiar_fecha_egreso.nombre',
    );
    expect(casilla()!.getAttribute('data-state')).toBe('checked');
    expect(casilla()!.disabled).toBe(true);
  });

  it('🔴 el contador no lo trae por defecto; marcarlo lo manda dentro de `reportes` al guardar', async () => {
    await montar();
    await irALaPestana('Contador');
    expect(casilla()!.getAttribute('data-state')).toBe('unchecked');
    expect(casilla()!.disabled).toBe(false);

    await clic(casilla());
    expect(casilla()!.getAttribute('data-state')).toBe('checked');

    await clic(boton('inmobiliaria.config.permissions.saveChanges'));
    // El diálogo de confirmación tiene su propio «Guardar»: es el último.
    await clic(boton('inmobiliaria.config.permissions.saveChanges'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const guardado = onSave.mock.calls[0][0] as Record<RolDeLaMatriz, RolePermissions>;
    const reportes = guardado.contador.permissions.find((p) => p.module === 'reportes');
    expect(reportes?.actions).toContain('cambiar_fecha_egreso');
    // Y no le quitó lo que ya tenía en el módulo.
    expect(reportes?.actions).toEqual(expect.arrayContaining(['view', 'export']));
  });

  it('marcar «todo» en la fila de Reportes NO lo otorga', async () => {
    await montar();
    await irALaPestana('Contador');
    const fila = [...document.querySelectorAll('tr')].find((tr) => tr.textContent?.includes('Reportes'));
    const todo = fila?.querySelector<HTMLButtonElement>('button[role="checkbox"]');
    await clic(todo);
    expect(casilla()!.getAttribute('data-state')).toBe('unchecked');
  });
});
