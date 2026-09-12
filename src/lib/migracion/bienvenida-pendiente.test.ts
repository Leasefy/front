/**
 * La marca de «terminó y todavía no ha visto la bienvenida».
 *
 * 🔴 Nico, 2026-09-12: «cuando finalicé la migración, con el link de ingresar
 * al panel, no me mostró la bienvenida a Leasefy». La celebración vivía sólo
 * en la transición dentro de la misma pestaña; el enlace del último paso
 * navega y esa transición no vuelve a ocurrir.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { PasoDeMigracion } from '@/lib/api/migracion-estado.service';

import {
  leerBienvenidaPendiente,
  marcarBienvenidaPendiente,
  olvidarBienvenidaPendiente,
} from './bienvenida-pendiente';

const PASOS = [
  { id: 'propietarios', titulo: 'Propietarios', estado: 'listo', detalle: '12 propietarios', conteo: 12 },
] as unknown as PasoDeMigracion[];

beforeEach(() => {
  localStorage.clear();
});

describe('bienvenida-pendiente', () => {
  it('lo anotado se lee tal cual', () => {
    marcarBienvenidaPendiente('ag-1', { pasos: PASOS, resuelta: 'completada' });

    expect(leerBienvenidaPendiente('ag-1')).toEqual({ pasos: PASOS, resuelta: 'completada' });
  });

  it('sin nada anotado no hay bienvenida', () => {
    expect(leerBienvenidaPendiente('ag-1')).toBeNull();
  });

  it('entrar la borra: se muestra UNA vez', () => {
    marcarBienvenidaPendiente('ag-1', { pasos: PASOS, resuelta: 'completada' });
    olvidarBienvenidaPendiente('ag-1');

    expect(leerBienvenidaPendiente('ag-1')).toBeNull();
  });

  /*
   * 🔴 Por agencia. Quien administra dos inmobiliarias desde el mismo
   * navegador terminó de migrar UNA: la otra no tiene nada que celebrar.
   */
  it('la marca es de su agencia y no se cruza con otra', () => {
    marcarBienvenidaPendiente('ag-1', { pasos: PASOS, resuelta: 'completada' });

    expect(leerBienvenidaPendiente('ag-2')).toBeNull();
    expect(leerBienvenidaPendiente('ag-1')).not.toBeNull();
  });

  /* Ante cualquier duda, nada: una bienvenida a medias es peor que ninguna. */
  it('algo corrupto se lee como «no hay», sin lanzar', () => {
    localStorage.setItem('leasefy:migracion:bienvenida:ag-1', '{no es json');
    expect(leerBienvenidaPendiente('ag-1')).toBeNull();

    localStorage.setItem('leasefy:migracion:bienvenida:ag-1', '{"pasos":"no es lista","resuelta":"completada"}');
    expect(leerBienvenidaPendiente('ag-1')).toBeNull();

    localStorage.setItem('leasefy:migracion:bienvenida:ag-1', '{"pasos":[],"resuelta":"cualquiera"}');
    expect(leerBienvenidaPendiente('ag-1')).toBeNull();
  });

  it('sin agencia todavía resuelta, la marca no se pierde: tiene su propia clave', () => {
    marcarBienvenidaPendiente(null, { pasos: PASOS, resuelta: 'omitida' });

    expect(leerBienvenidaPendiente(null)?.resuelta).toBe('omitida');
    expect(leerBienvenidaPendiente('ag-1')).toBeNull();
  });
});
