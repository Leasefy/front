/**
 * QA de agentes 17-10 (Nico, «Inicio de arrendatario»). El caso del lab: el
 * contrato #10 de John Jaime Mesa Cano debe agosto y septiembre (en mora) y el
 * 1 de noviembre le vencen DOS cuotas (el saldo de octubre, $ 1.640.500,50, y
 * noviembre, $ 1.524.971,91). El panel de la inmobiliaria dice «$ 3.165.472,41
 * en 15 días»; el portal decía sólo $ 1.640.500,50.
 */
import { describe, expect, it } from 'vitest';

import { vistaDeTuArriendo } from './tu-arriendo';
import { proximoPagoDelPortal } from '@/lib/estado-de-cuenta/proximo-pago-del-portal';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

type Cajon = 'POR_VENCER' | 'VENCIDA_EN_PLAZO' | 'CARTERA';

const fila = (mes: string, vence: string, valor: number, cajon: Cajon, diasDeMora = 0) => ({
  concepto: `Canon ${mes}`,
  estado: 'PENDIENTE',
  fechaDePago: null,
  valorBruto: valor,
  iva: 0,
  retencion: 0,
  reteIva: 0,
  reteIca: 0,
  valorNeto: valor,
  fechaVencimiento: vence,
  documentoDePago: null,
  parcial: false,
  cuotaId: `cuota-${mes}`,
  cajon,
  diasDeMora,
});

const contrato = (
  id: string,
  filas: ReturnType<typeof fila>[],
  extra: Record<string, unknown> = {},
) => ({
  id,
  numero: id.replace('contrato-', ''),
  rol: 'INQUILINO',
  inmueble: { direccion: 'Calle 50 # 12-30, La Playita, Caldas' },
  vigente: true,
  estadoDelContrato: 'VIGENTE',
  secciones: { arriendos: filas, otrosConceptos: [] },
  totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
  ...extra,
});

const doc = (contratos: ReturnType<typeof contrato>[]) =>
  ({
    cliente: { nombre: 'John Jaime Mesa Cano', documento: '71395289' },
    inmobiliaria: { nombre: 'Portofino' },
    fecha: '2026-10-17',
    contratos,
    totales: { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
  }) as unknown as EstadoDeCuenta;

const HOY = '2026-10-17';

const DEL_10 = contrato('contrato-10', [
  fila('2026-08', '2026-08-01', 1_524_971.91, 'CARTERA', 62),
  fila('2026-09', '2026-09-01', 1_524_971.91, 'CARTERA', 31),
  fila('2026-10', '2026-11-01', 1_640_500.5, 'POR_VENCER'),
  fila('2026-11', '2026-11-01', 1_524_971.91, 'POR_VENCER'),
  fila('2026-12', '2026-12-01', 1_524_971.91, 'POR_VENCER'),
]);

describe('proximoPagoDelPortal (QA 17-10)', () => {
  it('🔴 lo que vence el mismo día se suma: $ 3.165.472,41 el 1 de noviembre, 2 cuotas', () => {
    expect(proximoPagoDelPortal(doc([DEL_10]), HOY)).toEqual({
      valor: 3_165_472.41,
      fecha: '2026-11-01',
      cuantas: 2,
    });
  });

  it('una sola cuota ese día: la de siempre', () => {
    const d = doc([contrato('contrato-1', [fila('2026-11', '2026-11-01', 1_650_000, 'POR_VENCER')])]);
    expect(proximoPagoDelPortal(d, HOY)).toEqual({ valor: 1_650_000, fecha: '2026-11-01', cuantas: 1 });
  });
});

describe('vistaDeTuArriendo', () => {
  it('🔴 con lo vencido en mora, lo dice con cuánto, cuántas cuotas y desde cuándo', () => {
    const v = vistaDeTuArriendo(doc([DEL_10]), HOY, { 'contrato-10': 'Local en La Playita, Caldas' });
    expect(v.vencido).toEqual({
      valor: 3_049_943.82,
      cuotas: 2,
      desde: '2026-08-01',
      enMora: true,
      diasDeMora: 62,
    });
    expect(v.proximo).toMatchObject({ valor: 3_165_472.41, fecha: '2026-11-01' });
    expect(v.alDia).toBe(false);
    expect(v.inmuebles).toEqual([
      {
        contratoId: 'contrato-10',
        titulo: 'Local en La Playita, Caldas',
        direccion: 'Calle 50 # 12-30, La Playita, Caldas',
      },
    ]);
  });

  it('sin título del arriendo, nombra el inmueble por la dirección (sin repetirla)', () => {
    const v = vistaDeTuArriendo(doc([DEL_10]), HOY);
    expect(v.inmuebles[0]).toMatchObject({ titulo: 'Calle 50 # 12-30, La Playita, Caldas', direccion: null });
  });

  it('nada vencido ni por vencer: al día', () => {
    const v = vistaDeTuArriendo(doc([contrato('contrato-2', [])]), HOY);
    expect(v).toMatchObject({ vencido: null, proximo: null, alDia: true });
  });

  it('vencida dentro del plazo: no es mora', () => {
    const d = doc([contrato('contrato-3', [fila('2026-10', '2026-10-15', 1_000_000, 'VENCIDA_EN_PLAZO')])]);
    expect(vistaDeTuArriendo(d, HOY).vencido).toMatchObject({ valor: 1_000_000, cuotas: 1, enMora: false });
  });

  it('🔴 lo de PROPIETARIO no entra: ni el inmueble ni su plata', () => {
    const suyoDePropietario = contrato('contrato-9', [fila('2026-11', '2026-11-01', 9_000_000, 'POR_VENCER')], {
      rol: 'PROPIETARIO',
    });
    const v = vistaDeTuArriendo(doc([DEL_10, suyoDePropietario]), HOY);
    expect(v.inmuebles.map((i) => i.contratoId)).toEqual(['contrato-10']);
    expect(v.proximo?.valor).toBe(3_165_472.41);
  });

  it('un contrato terminado no se nombra, pero su saldo vencido sí se cuenta', () => {
    const terminado = contrato('contrato-4', [fila('2026-07', '2026-07-01', 500_000, 'CARTERA', 93)], {
      estadoDelContrato: 'TERMINADO',
      vigente: false,
    });
    const v = vistaDeTuArriendo(doc([contrato('contrato-5', []), terminado]), HOY);
    expect(v.inmuebles.map((i) => i.contratoId)).toEqual(['contrato-5']);
    expect(v.vencido).toMatchObject({ valor: 500_000, cuotas: 1, enMora: true });
  });
});
