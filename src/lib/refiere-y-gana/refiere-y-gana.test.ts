/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest';

import type { ColegaReferido } from '@/lib/api/refiere-y-gana.service';
import {
  LLAVE_DEL_REFERIDO,
  enlaceDeWhatsAppParaCompartir,
  enlaceDelCodigo,
  estadoDelColega,
  guardarReferidoPendiente,
  mensajeParaWhatsApp,
  normalizarCodigo,
  olvidarReferidoPendiente,
  referidoPendiente,
} from './refiere-y-gana';

const DIA = 86_400_000;
const colega = (o: Partial<ColegaReferido> = {}): ColegaReferido => ({
  id: 'r1',
  nombre: 'Inmobiliaria Verifica',
  tipo: 'inmobiliaria',
  estado: 'registrado',
  premio: null,
  registradoEn: '2026-10-28T15:00:00Z',
  pagoEn: null,
  aplicadoEn: null,
  aplicadoHasta: null,
  ...o,
});

afterEach(() => window.localStorage.clear());

describe('Refiere y gana en el front', () => {
  it('normaliza el código como el back', () => {
    expect(normalizarCodigo('  VALLE-K7M2 ')).toBe('valle-k7m2');
    expect(normalizarCodigo('Peñalosa k7m2')).toBe('penalosa-k7m2');
  });

  it('el código pendiente dura 30 días (Nico: «el enlace cuenta 30 días»)', () => {
    const hoy = Date.UTC(2026, 9, 28);
    guardarReferidoPendiente('VALLE-K7M2', hoy);
    expect(JSON.parse(window.localStorage.getItem(LLAVE_DEL_REFERIDO) ?? '{}')).toMatchObject({ codigo: 'valle-k7m2' });
    expect(referidoPendiente(hoy + 29 * DIA)).toBe('valle-k7m2');
    expect(referidoPendiente(hoy + 31 * DIA)).toBeNull();
    olvidarReferidoPendiente();
    expect(referidoPendiente(hoy)).toBeNull();
  });

  it('el enlace y el mensaje de WhatsApp llevan el regalo y el enlace', () => {
    const enlace = enlaceDelCodigo('https://leasefy.co/', 'valle-k7m2');
    expect(enlace).toBe('https://leasefy.co/r/valle-k7m2');
    expect(mensajeParaWhatsApp(enlace)).toContain('tu primer mes de Leasefy completo gratis');
    expect(mensajeParaWhatsApp(enlace)).toContain(enlace);
    expect(enlaceDeWhatsAppParaCompartir(enlace)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('dice en qué va cada colega', () => {
    expect(estadoDelColega(colega()).etiqueta).toBe('En su mes gratis');
    expect(estadoDelColega(colega({ estado: 'pago', premio: 'mes' })).etiqueta).toBe('Ganaste un mes');
    expect(estadoDelColega(colega({ estado: 'pago', premio: 'mes', aplicadoEn: '2026-11-28T00:00:00Z' })).etiqueta).toBe('Mes usado');
    expect(estadoDelColega(colega({ estado: 'pago', premio: 'tope' })).detalle).toContain('Ya tenías tus meses gratis');
  });
});
