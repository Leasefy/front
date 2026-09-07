/**
 * El recordatorio de migración del sidebar (Nico, 2026-09-07).
 *
 * Lo que se prueba es QUÉ dice y CUÁNDO: a quien no empezó le ofrece migrar;
 * a quien va por la mitad le dice cuántos pasos van y cuál sigue; a quien
 * terminó, descartó o tiene el muro puesto no le dice nada.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { EstadoDeMigracion, PasoDeMigracion } from '@/lib/api/migracion-estado.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}::${JSON.stringify(params)}` : k,
    locale: 'es',
  }),
}));

import { MigracionContext, type ContextoDeMigracion } from './migracion-context';
import { RecordatorioDeMigracion } from './RecordatorioDeMigracion';
import { guardarDecisionDeMigracion } from '@/lib/migracion/decision-de-migracion';

function paso(
  id: PasoDeMigracion['id'],
  estado: PasoDeMigracion['estado'],
  conteo = 0,
): PasoDeMigracion {
  return { id, estado, detalle: null, conteo };
}

const SIN_EMPEZAR: PasoDeMigracion[] = [
  paso('propietarios', 'pendiente'),
  paso('inquilinos', 'pendiente'),
  paso('propiedades', 'pendiente'),
  paso('contratos', 'pendiente'),
  paso('puc', 'pendiente'),
  paso('contables', 'pendiente'),
];

const A_MEDIAS: PasoDeMigracion[] = [
  paso('propietarios', 'listo', 12),
  paso('inquilinos', 'listo', 30),
  paso('propiedades', 'pendiente'),
  paso('contratos', 'pendiente'),
  paso('puc', 'pendiente'),
  paso('contables', 'pendiente'),
];

const TODO_LISTO: PasoDeMigracion[] = SIN_EMPEZAR.map((p) => ({ ...p, estado: 'listo', conteo: 1 }));

let container: HTMLDivElement;
let root: Root | null = null;

function pintar(
  estado: EstadoDeMigracion | null,
  { conContexto = true }: { conContexto?: boolean } = {},
) {
  container = document.createElement('div');
  document.body.appendChild(container);
  const abrir = vi.fn();
  const contexto: ContextoDeMigracion = { estado, abrir, recargar: async () => {} };
  act(() => {
    root = createRoot(container);
    root.render(
      conContexto ? (
        <MigracionContext.Provider value={contexto}>
          <RecordatorioDeMigracion />
        </MigracionContext.Provider>
      ) : (
        <RecordatorioDeMigracion />
      ),
    );
  });
  return { abrir };
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => localStorage.clear());

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe('qué dice', () => {
  it('sin empezar, con el muro abajo: «Migra tu inmobiliaria», y «Migrar ahora» abre la migración', () => {
    const { abrir } = pintar({ bloquea: false, resuelta: 'omitida', pasos: SIN_EMPEZAR });

    const tarjeta = q('sidebar-migracion');
    expect(tarjeta).not.toBeNull();
    expect(tarjeta?.textContent).toContain('migracion.recordatorio.titulo');
    expect(tarjeta?.textContent).not.toContain('tituloEnCurso');
    expect(tarjeta?.textContent).toContain('migracion.recordatorio.detalle');
    expect(container.querySelector('[role="progressbar"]')).toBeNull();

    act(() => (q('sidebar-migracion-migrar') as HTMLElement).click());
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('a medias: «Termina tu migración», cuántos pasos van, cuál sigue y una barra de avance', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });

    expect(q('sidebar-migracion')?.textContent).toContain('migracion.recordatorio.tituloEnCurso');
    expect(q('sidebar-migracion-detalle')?.textContent).toBe(
      'migracion.recordatorio.avance::{"hechos":2,"total":6,"paso":"migracion.pasos.propiedades.corto"}',
    );
    const barra = container.querySelector('[role="progressbar"]');
    expect(barra?.getAttribute('aria-valuenow')).toBe('2');
    expect(barra?.getAttribute('aria-valuemax')).toBe('6');
  });

  it('un paso `no_disponible` no cuenta ni como hecho ni en el total', () => {
    const pasos = [...A_MEDIAS];
    pasos[5] = paso('contables', 'no_disponible');
    pintar({ bloquea: false, resuelta: 'omitida', pasos });

    expect(q('sidebar-migracion-detalle')?.textContent).toContain('"hechos":2,"total":5');
  });

  it('también recuerda a quien eligió «ahora» y cerró a mitad de camino: lo que manda es el estado del back, no la decisión', () => {
    localStorage.setItem('leasefy:migracion:decision:agencia', 'ahora');
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });
    expect(q('sidebar-migracion')).not.toBeNull();
  });
});

describe('cuándo no se muestra', () => {
  it.each<[string, EstadoDeMigracion | null]>([
    ['el muro está puesto', { bloquea: true, resuelta: null, pasos: SIN_EMPEZAR }],
    ['la migración se dio por terminada', { bloquea: false, resuelta: 'completada', pasos: A_MEDIAS }],
    ['todos los pasos están listos', { bloquea: false, resuelta: 'omitida', pasos: TODO_LISTO }],
    ['no se sabe el estado', null],
  ])('%s', (_nombre, estado) => {
    pintar(estado);
    expect(q('sidebar-migracion')).toBeNull();
  });

  it('fuera del panel (sin contexto) no dibuja nada', () => {
    pintar(null, { conContexto: false });
    expect(q('sidebar-migracion')).toBeNull();
  });

  it('se descartó con «no requiero migración»', () => {
    localStorage.setItem('leasefy:migracion:decision:agencia', 'nunca');
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });
    expect(q('sidebar-migracion')).toBeNull();
  });
});

describe('la ✕', () => {
  it('cierra la tarjeta y lo guarda como «nunca»; «Recordármelo» (luego) la vuelve a traer', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });
    expect(q('sidebar-migracion')).not.toBeNull();

    act(() => (q('sidebar-migracion-cerrar') as HTMLElement).click());
    expect(q('sidebar-migracion')).toBeNull();
    expect(localStorage.getItem('leasefy:migracion:decision:agencia')).toBe('nunca');

    act(() => guardarDecisionDeMigracion(null, 'luego'));
    expect(q('sidebar-migracion')).not.toBeNull();
  });

  it('es una ✕ con nombre accesible, no un «Descartar» de texto', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });
    expect(q('sidebar-migracion')?.textContent).not.toContain('Descartar');
    expect(q('sidebar-migracion-cerrar')?.getAttribute('aria-label')).toBe(
      'migracion.recordatorio.cerrar',
    );
  });
});
