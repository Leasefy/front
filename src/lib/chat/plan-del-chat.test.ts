/**
 * La tarjeta del PLAN, leída del micro (24-09, paquete H).
 *
 *   1. Los EJEMPLOS con que se prueba el chat son lo que el micro manda: se
 *      validan, estrictos, contra `AiHubChatPiezasNuevasDelDone.plan` de su
 *      snapshot (`contrato-del-chat-del-micro.json`).
 *   2. El lector no pierde nada de lo que el micro declara, y descarta lo que
 *      no cumple la forma (un botón de otro plan, un «Deshacer» de otra
 *      ejecución, un campo de otro paso).
 */

import { describe, expect, it } from 'vitest';

import { componenteDelMicro, erroresContraElEsquema } from '@/lib/api/contrato-del-chat-del-micro';
import { handleSSEEvent } from '@/lib/api/ai-hub-chat';
import { leerIntencion, respuestaDelPlan } from '@/lib/chat/acciones-del-hilo';
import { leerIntencionDelBoton } from '@/lib/chat/tarjetas-de-ejecucion';
import { EJECUCION_DEL_PASO_1, PLAN, planDetenido, planPropuesto, planQueSeDetieneAntes } from './plan-del-chat.fixtures';
import { ESTADOS_DEL_PASO, ESTADOS_DEL_PLAN, faltanDatos, leerTarjetaDePlan } from './plan-del-chat';

const esquemaDelPlan = componenteDelMicro('AiHubChatPiezasNuevasDelDone')!.properties!.plan;
const tarjetaDelMicro = esquemaDelPlan.allOf!.find((s) => s.properties)!;

const EJEMPLOS = { propuesto: planPropuesto(), detenido: planDetenido(), seDetieneAntes: planQueSeDetieneAntes() };

describe('los ejemplos son lo que el micro manda (esquema del snapshot, estricto)', () => {
  it.each(Object.entries(EJEMPLOS))('%s cabe en `done.plan`', (_, ejemplo) => {
    expect(erroresContraElEsquema(esquemaDelPlan, ejemplo, 'plan')).toEqual([]);
  });

  it('el validador sí muerde; `null` es un turno sin plan', () => {
    expect(erroresContraElEsquema(esquemaDelPlan, { ...planPropuesto(), inventada: 1 }, 'p')).not.toEqual([]);
    expect(erroresContraElEsquema(esquemaDelPlan, { ...planPropuesto(), estado: 'a_medias' }, 'p')).not.toEqual([]);
    expect(erroresContraElEsquema(esquemaDelPlan, null, 'p')).toEqual([]);
  });
});

describe('el lector no pierde nada de lo que el micro declara', () => {
  it('los mismos estados del plan y de cada paso', () => {
    expect(tarjetaDelMicro.properties!.estado.enum).toEqual(ESTADOS_DEL_PLAN);
    const paso = tarjetaDelMicro.properties!.pasos.items!;
    expect(paso.properties!.estado.enum).toEqual(ESTADOS_DEL_PASO);
  });

  it.each(Object.entries(EJEMPLOS))('%s se lee entero, con cada campo que el micro declara', (_, ejemplo) => {
    const leida = leerTarjetaDePlan(ejemplo)!;
    expect(leida).not.toBeNull();
    expect(Object.keys(leida).sort()).toEqual(Object.keys(tarjetaDelMicro.properties!).sort());
    expect(Object.keys(leida.pasos[0]!).sort()).toEqual(Object.keys(tarjetaDelMicro.properties!.pasos.items!.properties!).sort());
  });

  it('los botones del plan y el «Deshacer» del paso, con sus intenciones', () => {
    const d = leerTarjetaDePlan(planDetenido())!;
    expect(d.seguir).toEqual({ etiqueta: 'Reintentar desde el paso 2', intencion: { accion: 'seguir_plan', planId: PLAN } });
    expect(d.pasos[0]!.deshacer).toEqual({ etiqueta: 'Anular el recibo', intencion: { accion: 'deshacer', propuestaId: EJECUCION_DEL_PASO_1 } });
    expect(d.detenido).toEqual({ n: 2, tipo: 'fallo', porQue: 'El inquilino no tiene correo registrado.' });
  });

  it('🔴 no se inventa ni se cruza nada: un botón de OTRO plan, un «Deshacer» de otra ejecución, un campo de otro paso', () => {
    const otro = '11111111-1111-4111-8111-111111111111';
    const p = planPropuesto();
    const leida = leerTarjetaDePlan({
      ...p,
      hacerTodo: { etiqueta: 'Hacer todo', intencion: { accion: 'hacer_plan', planId: otro } },
      pasos: [
        { ...p.pasos[0], campos: [{ ...(p.pasos[0]!.campos[0] as object), clave: 'p2_fecha' }] },
        { ...p.pasos[1], estado: 'hecho', deshacer: { etiqueta: 'Anular', intencion: { accion: 'deshacer', propuestaId: otro } } },
      ],
    })!;
    expect(leida.hacerTodo).toBeNull();
    expect(leida.pasos[0]!.campos).toEqual([]);
    expect(leida.pasos[1]!.deshacer).toBeNull();
  });

  it('sin id, con un estado que no conoce, o sin pasos ni motivo: no hay tarjeta', () => {
    expect(leerTarjetaDePlan({ ...planPropuesto(), planId: '' })).toBeNull();
    expect(leerTarjetaDePlan({ ...planPropuesto(), estado: 'raro' })).toBeNull();
    expect(leerTarjetaDePlan({ ...planPropuesto(), pasos: [] })).toBeNull();
    expect(leerTarjetaDePlan({ ...planQueSeDetieneAntes(), pasos: [] })).not.toBeNull();
  });

  it('lo que falta llenar bloquea «Hacer todo» hasta que esté', () => {
    const campos = leerTarjetaDePlan(planPropuesto())!.pasos[0]!.campos;
    expect(faltanDatos(campos, {})).toBe(true);
    expect(faltanDatos(campos, { p1_fecha: '2026-09-24' })).toBe(false);
  });
});

describe('las intenciones sobre un plan', () => {
  it('«Hacer todo» con lo llenado viaja con sus datos (sólo claves `p<paso>_<dato>`)', () => {
    expect(leerIntencion({ accion: 'hacer_plan', planId: PLAN, datos: { p1_fecha: '2026-09-24', inventada: 'x' } })).toEqual({
      accion: 'hacer_plan',
      planId: PLAN,
      datos: { p1_fecha: '2026-09-24' },
    });
    expect(leerIntencionDelBoton({ accion: 'seguir_plan', planId: PLAN })).toEqual({ accion: 'seguir_plan', planId: PLAN });
    expect(leerIntencionDelBoton({ accion: 'hacer_plan' })).toBeNull();
  });

  it('la tarjeta sabe si ya se respondió (del hilo, sin estado aparte)', () => {
    expect(respuestaDelPlan(PLAN, [])).toBeNull();
    expect(respuestaDelPlan(PLAN, [{ role: 'user', intencion: { accion: 'cancelar_plan', planId: PLAN } }])).toBe('cancelar_plan');
  });

  it('el `done` del stream trae el plan (y uno viejo, sin plan, trae `null`)', () => {
    let final: { plan: unknown } | null = null;
    handleSSEEvent(`event: done\ndata: ${JSON.stringify({ responseText: 'x', plan: planPropuesto() })}`, { onDone: (f) => (final = f) });
    expect(final!.plan).toMatchObject({ tipo: 'plan', planId: PLAN, estado: 'propuesto' });
    handleSSEEvent(`event: done\ndata: ${JSON.stringify({ responseText: 'x' })}`, { onDone: (f) => (final = f) });
    expect(final!.plan).toBeNull();
  });
});
