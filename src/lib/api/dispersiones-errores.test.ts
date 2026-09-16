/**
 * El `code` del back decide la salida; el `message` se muestra tal cual.
 */
import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';
import {
  apruebaPorLote,
  esAprobarPorLote,
  esAprobadorYEjecutor,
  leerLiquidacionFrenada,
  motivoLegible,
  RUTA_INMUEBLES,
} from './dispersiones-errores';

const PID = '7c1d2b8e-0000-4000-8000-000000000001';

function participaciones(detalle: Record<string, unknown> | undefined) {
  return new ApiError(
    400,
    `Las participaciones de los copropietarios de «Apto 101» suman 9000 y no 10000 puntos básicos (el 90 % y no el 100 %): no se puede repartir su plata. Corrige los porcentajes de los dueños en la ficha del inmueble (inmueble ${PID}).`,
    'PARTICIPACIONES_NO_SUMAN_100',
    detalle,
  );
}

describe('leerLiquidacionFrenada', () => {
  it('participaciones ≠ 100: enlaza a la ficha del inmueble que dice el cuerpo', () => {
    const f = leerLiquidacionFrenada(
      participaciones({
        statusCode: 400,
        code: 'PARTICIPACIONES_NO_SUMAN_100',
        propertyId: PID,
        titulo: 'Apto 101',
        detalle: { propertyId: PID, titulo: 'Apto 101', sumaBps: 9000 },
      }),
    );
    expect(f?.code).toBe('PARTICIPACIONES_NO_SUMAN_100');
    expect(f?.enlace.href).toBe(`${RUTA_INMUEBLES}/${PID}`);
    expect(f?.enlace.label).toContain('Apto 101');
    expect(f?.titulo).toContain('«Apto 101»');
    // El uuid crudo sobra cuando hay enlace; el resto del mensaje, intacto.
    expect(f?.mensaje).not.toContain(PID);
    expect(f?.mensaje).toContain('suman 9000 y no 10000');
  });

  it('participaciones ≠ 100 sin cuerpo: el mensaje entero y la lista de inmuebles', () => {
    const f = leerLiquidacionFrenada(participaciones(undefined));
    expect(f?.enlace.href).toBe(RUTA_INMUEBLES);
    expect(f?.mensaje).toContain(PID);
  });

  it('copropietarios con impuestos: el mensaje tal cual y la lista de inmuebles', () => {
    const msg =
      '«Casa 5» tiene 2 copropietarios y el cobro de 2026-08 lleva impuestos liquidados para un solo perfil tributario (IVA y retenciones del canon). No se puede repartir sin decidir a nombre de quién queda cada retención: liquida este inmueble por fuera de la corrida del mes.';
    const f = leerLiquidacionFrenada(new ApiError(400, msg, 'COPROPIETARIOS_CON_IMPUESTOS'));
    expect(f?.mensaje).toBe(msg);
    expect(f?.enlace.href).toBe(RUTA_INMUEBLES);
  });

  it('cualquier otro error no es una liquidación frenada', () => {
    expect(leerLiquidacionFrenada(new ApiError(500, 'boom'))).toBeNull();
    expect(leerLiquidacionFrenada(new Error('Failed to fetch'))).toBeNull();
  });
});

describe('apruebaPorLote: la misma regla que el back', () => {
  it('sin agencia leída se asume que sí, como el back', () => {
    expect(apruebaPorLote(null)).toBe(true);
    expect(apruebaPorLote(undefined)).toBe(true);
  });
  it('el PIN sin definir cuenta como prendido', () => {
    expect(apruebaPorLote({})).toBe(true);
  });
  it('PIN apagado y sin monto de doble aprobación: se aprueba una por una', () => {
    expect(apruebaPorLote({ dispersionExigePin: false, dispersionMontoDobleAprobacion: null })).toBe(false);
  });
  it('PIN apagado pero con monto de doble aprobación: por lote', () => {
    expect(apruebaPorLote({ dispersionExigePin: false, dispersionMontoDobleAprobacion: 0 })).toBe(true);
  });
});

describe('códigos de los 409', () => {
  it('reconoce APROBAR_POR_LOTE y APROBADOR_Y_EJECUTOR_IGUALES', () => {
    expect(esAprobarPorLote(new ApiError(409, 'x', 'APROBAR_POR_LOTE'))).toBe(true);
    expect(esAprobarPorLote(new ApiError(409, 'x', 'OTRO'))).toBe(false);
    expect(esAprobadorYEjecutor(new ApiError(409, 'x', 'APROBADOR_Y_EJECUTOR_IGUALES'))).toBe(true);
  });
});

describe('motivoLegible', () => {
  it('un 4xx trae un motivo para leer; un 5xx o la red no', () => {
    expect(motivoLegible(new ApiError(409, 'Ya está girada'))).toBe('Ya está girada');
    expect(motivoLegible(new ApiError(500, 'Internal server error'))).toBeNull();
    expect(motivoLegible(new ApiError(0, 'No pudimos conectarnos'))).toBeNull();
    expect(motivoLegible(new Error('x'))).toBeNull();
  });
});
