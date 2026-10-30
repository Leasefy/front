/**
 * Quién gestiona la reparación (reunión con Portofino, Nico 29-10-2026): lo que
 * lee la pantalla del campo del back, también cuando un back anterior no lo
 * manda, y el seguimiento por avisos.
 */
import { describe, expect, it } from 'vitest';

import type { PasoDelSeguimientoExterno, SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import {
  etapaDeLaColumna,
  filtrarPorGestion,
  gestionDeLaSolicitud,
  laGestionaOtro,
  porQueNoSePasaAOtro,
  seLeRegistraSeguimiento,
  seguimientoDeLaSolicitud,
  siguienteEtapa,
} from './gestionado-por';

const laHace = {
  loDecidio: 'PROPIETARIO' as const,
  nota: null,
  desde: '2026-10-27T10:00:00.000Z',
  terminadaAt: null,
  terminadaNota: null,
};

const paso = (etapa: PasoDelSeguimientoExterno['etapa'], fecha: string, nota: string | null = null): PasoDelSeguimientoExterno => ({
  etapa,
  nota,
  fecha,
  registradoPorUserId: null,
});

type S = Pick<SolicitudMantenimiento, 'gestionadoPor' | 'laHaceElPropietario'>;

describe('gestionDeLaSolicitud', () => {
  it('un back anterior (sin el campo) o un valor raro: la inmobiliaria', () => {
    expect(gestionDeLaSolicitud({})).toBe('inmobiliaria');
    expect(gestionDeLaSolicitud({ gestionadoPor: 'el-vecino' as never })).toBe('inmobiliaria');
  });

  it('lo que manda el back, tal cual', () => {
    expect(gestionDeLaSolicitud({ gestionadoPor: 'administracion' })).toBe('administracion');
    expect(gestionDeLaSolicitud({ gestionadoPor: 'inquilino' })).toBe('inquilino');
  });

  it('«la hace el propietario» (22-10) es gestionada por el propietario, también sin el campo', () => {
    expect(gestionDeLaSolicitud({ laHaceElPropietario: laHace })).toBe('propietario');
    expect(gestionDeLaSolicitud({ gestionadoPor: 'inmobiliaria', laHaceElPropietario: laHace })).toBe('propietario');
    expect(laGestionaOtro({ laHaceElPropietario: laHace })).toBe(true);
  });

  it('lo guardado manda cuando dice otra cosa que la inmobiliaria', () => {
    expect(gestionDeLaSolicitud({ gestionadoPor: 'administracion', laHaceElPropietario: laHace })).toBe('administracion');
  });
});

describe('el seguimiento por avisos', () => {
  it('sin el campo, ningún paso; con pasos, del más viejo al más nuevo', () => {
    expect(seguimientoDeLaSolicitud({})).toEqual([]);
    const pasos = seguimientoDeLaSolicitud({
      seguimientoExterno: [paso('en_arreglo', '2026-10-28T10:00:00Z'), paso('visita', '2026-10-27T10:00:00Z')],
    });
    expect(pasos.map((p) => p.etapa)).toEqual(['visita', 'en_arreglo']);
  });

  it('el paso que sigue: visita → en arreglo → terminado → ninguno', () => {
    expect(siguienteEtapa([], 'reported')).toBe('visita');
    expect(siguienteEtapa([paso('visita', '2026-10-27T10:00:00Z')], 'reported')).toBe('en_arreglo');
    expect(siguienteEtapa([paso('en_arreglo', '2026-10-27T10:00:00Z')], 'in_progress')).toBe('terminado');
    expect(siguienteEtapa([paso('terminado', '2026-10-27T10:00:00Z')], 'completed')).toBeNull();
  });

  it('ya en arreglo sin pasos (la movieron antes): lo que sigue es terminarla', () => {
    expect(siguienteEtapa([], 'in_progress')).toBe('terminado');
  });

  it('cerrada o cancelada no se le registra nada', () => {
    expect(siguienteEtapa([], 'cancelled')).toBeNull();
    expect(seLeRegistraSeguimiento({ gestionadoPor: 'propietario', status: 'cancelled' })).toBe(false);
    expect(seLeRegistraSeguimiento({ gestionadoPor: 'propietario', status: 'reported' })).toBe(true);
    expect(seLeRegistraSeguimiento({ gestionadoPor: 'inmobiliaria', status: 'reported' })).toBe(false);
  });

  it('soltarla en el tablero: «En arreglo» y «Completada» son pasos; lo demás no', () => {
    expect(etapaDeLaColumna('in_progress')).toBe('en_arreglo');
    expect(etapaDeLaColumna('completed')).toBe('terminado');
    expect(etapaDeLaColumna('approved')).toBeNull();
    expect(etapaDeLaColumna('reported')).toBeNull();
  });
});

describe('pasarla a otro', () => {
  it('con una cotización aprobada ya no (el back responde 409); antes, sí', () => {
    expect(porQueNoSePasaAOtro({})).toBeNull();
    expect(porQueNoSePasaAOtro({ selectedQuoteId: 'q-1' })).toMatch(/cotización aprobada/);
    expect(porQueNoSePasaAOtro({ approvedAmount: 0 })).toMatch(/cotización aprobada/);
  });
});

describe('filtrarPorGestion', () => {
  const lista: (S & { id: string })[] = [
    { id: 'a' },
    { id: 'b', gestionadoPor: 'propietario' },
    { id: 'c', laHaceElPropietario: laHace },
    { id: 'd', gestionadoPor: 'administracion' },
  ];

  it('sin filtro, todas; con filtro, las de ese (también la que hace el propietario por su cuenta)', () => {
    expect(filtrarPorGestion(lista, null).map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filtrarPorGestion(lista, 'propietario').map((s) => s.id)).toEqual(['b', 'c']);
    expect(filtrarPorGestion(lista, 'inmobiliaria').map((s) => s.id)).toEqual(['a']);
    expect(filtrarPorGestion(lista, 'inquilino')).toEqual([]);
  });
});
