/**
 * La tarjeta de migración del menú.
 *
 * Nico, 01-10: «pon estático ese modal de migración mientras esté la
 * migración en proceso, cuando ya se complete se quita, y si no le da migrar
 * pues no aparece». Se prueba QUÉ dice y CUÁNDO: sólo a quien le dio
 * «Migrar» (o ya tiene un paso listo), fija mientras esté en curso, y se va
 * al terminar.
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
import { guardarDecisionDeMigracion, marcarQueEligioMigrar } from '@/lib/migracion/decision-de-migracion';

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
  const recargar = vi.fn(async () => {});
  const contexto: ContextoDeMigracion = { estado, abrir, recargar };
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
  return { abrir, recargar };
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

describe('qué dice', () => {
  it('le dio «Migrar» y no empezó: «Migra tu inmobiliaria», «Paso 1 de 6», y el botón abre la migración', () => {
    marcarQueEligioMigrar(null);
    const { abrir } = pintar({ bloquea: false, resuelta: 'omitida', pasos: SIN_EMPEZAR });

    const tarjeta = q('sidebar-migracion');
    expect(tarjeta).not.toBeNull();
    expect(tarjeta?.textContent).toContain('migracion.recordatorio.titulo');
    expect(tarjeta?.textContent).not.toContain('tituloEnCurso');
    expect(q('sidebar-migracion-detalle')?.textContent).toBe('migracion.recordatorio.detalle');
    expect(q('sidebar-migracion-paso')?.textContent).toBe('migracion.recordatorio.paso::{"n":1,"total":6}');
    // UNA sola pastilla: la barra en cero y «Paso 1 de 6», nada más.
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(1);
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');
    expect(q('sidebar-migracion')?.textContent).not.toContain('pasos::');
    expect(q('sidebar-migracion-migrar')?.textContent).toBe('migracion.recordatorio.migrar');

    act(() => (q('sidebar-migracion-migrar') as HTMLElement).click());
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('a medias: «Termina tu migración», en qué paso va, qué sigue, la barra y «Continuar migración»', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });

    expect(q('sidebar-migracion')?.textContent).toContain('migracion.recordatorio.tituloEnCurso');
    expect(q('sidebar-migracion-paso')?.textContent).toBe('migracion.recordatorio.paso::{"n":3,"total":6}');
    expect(q('sidebar-migracion-detalle')?.textContent).toBe(
      'migracion.recordatorio.sigue::{"paso":"migracion.pasos.propiedades.corto"}',
    );
    // 🔴 Una sola cosa (Nico, 01-10): no «2 de 6» Y «Paso 3 de 6».
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(1);
    const barra = container.querySelector('[role="progressbar"]');
    expect(barra?.getAttribute('aria-valuenow')).toBe('2');
    expect(barra?.getAttribute('aria-valuemax')).toBe('6');
    expect(q('sidebar-migracion')?.textContent).not.toContain('listos::');
    expect(q('sidebar-migracion-migrar')?.textContent).toBe('migracion.recordatorio.continuar');
  });

  it('QA-MIGRACION-95 (MU-07): si el que falta es uno de los primeros, dice ESE paso, no «hechos + 1»', () => {
    // Visto: 5 de 6 listos y Propietarios pendiente → decía «Paso 6 de 6 · Sigue
    // con Propietarios». Propietarios es el paso 1.
    pintar({
      bloquea: false,
      resuelta: 'omitida',
      pasos: [
        paso('propietarios', 'pendiente'),
        paso('inquilinos', 'listo'),
        paso('propiedades', 'listo'),
        paso('contratos', 'listo'),
        paso('puc', 'listo'),
        paso('contables', 'listo'),
      ],
    });
    expect(q('sidebar-migracion-paso')?.textContent).toBe('migracion.recordatorio.paso::{"n":1,"total":6}');
    expect(q('sidebar-migracion-detalle')?.textContent).toBe(
      'migracion.recordatorio.sigue::{"paso":"migracion.pasos.propietarios.corto"}',
    );
    const barra = container.querySelector('[role="progressbar"]');
    expect(barra?.getAttribute('aria-valuenow')).toBe('5');
  });

  it('un paso `no_disponible` no cuenta ni como hecho ni en el total', () => {
    const pasos = [...A_MEDIAS];
    pasos[5] = paso('contables', 'no_disponible');
    pintar({ bloquea: false, resuelta: 'omitida', pasos });

    expect(q('sidebar-migracion-paso')?.textContent).toBe('migracion.recordatorio.paso::{"n":3,"total":5}');
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuemax')).toBe('5');
  });
});

describe('cuándo sale', () => {
  it.each<[string, 'luego' | 'nunca' | null]>([
    ['eligió «en otro momento»', 'luego'],
    ['eligió «no requiero migración»', 'nunca'],
    ['no eligió nada', null],
  ])('🔴 si no le dio «Migrar» no aparece: %s', (_nombre, decision) => {
    if (decision) guardarDecisionDeMigracion(null, decision);
    pintar({ bloquea: false, resuelta: 'omitida', pasos: SIN_EMPEZAR });
    expect(q('sidebar-migracion')).toBeNull();
  });

  it('le dio «Migrar» y cerró el muro a mitad de camino (la ✕ del muro escribe «luego»): sale', () => {
    marcarQueEligioMigrar(null);
    guardarDecisionDeMigracion(null, 'luego');
    pintar({ bloquea: false, resuelta: 'omitida', pasos: SIN_EMPEZAR });
    expect(q('sidebar-migracion')).not.toBeNull();
  });

  it('con un paso listo sale aunque este navegador no tenga la marca (otro navegador, un importador suelto)', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });
    expect(q('sidebar-migracion')).not.toBeNull();
  });

  it('aparece en cuanto le da «Migrar», sin recargar', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: SIN_EMPEZAR });
    expect(q('sidebar-migracion')).toBeNull();
    act(() => marcarQueEligioMigrar(null));
    expect(q('sidebar-migracion')).not.toBeNull();
  });

  it.each<[string, EstadoDeMigracion | null]>([
    ['el muro está puesto', { bloquea: true, resuelta: null, pasos: A_MEDIAS }],
    ['la migración se dio por terminada', { bloquea: false, resuelta: 'completada', pasos: A_MEDIAS }],
    ['todos los pasos están listos', { bloquea: false, resuelta: 'omitida', pasos: TODO_LISTO }],
    ['no se sabe el estado', null],
  ])('no sale: %s', (_nombre, estado) => {
    marcarQueEligioMigrar(null);
    pintar(estado);
    expect(q('sidebar-migracion')).toBeNull();
  });

  it('fuera del panel (sin contexto) no dibuja nada', () => {
    marcarQueEligioMigrar(null);
    pintar(null, { conContexto: false });
    expect(q('sidebar-migracion')).toBeNull();
  });
});

describe('🔴 es fija mientras la migración esté en curso', () => {
  it('no tiene ✕', () => {
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS });
    expect(q('sidebar-migracion-cerrar')).toBeNull();
    expect(container.querySelector('button[aria-label]')).toBeNull();
  });

  it('no la apagan un «nunca» viejo ni el descarte guardado en la cuenta', () => {
    guardarDecisionDeMigracion(null, 'nunca');
    pintar({ bloquea: false, resuelta: 'omitida', pasos: A_MEDIAS, recordatorioDescartado: true });
    expect(q('sidebar-migracion')).not.toBeNull();
  });
});
