/**
 * Las tres pestañas del estudio, sin la maqueta de ejemplo.
 *
 * Esto vive dentro de la ficha de una persona real, que es el peor lugar
 * posible para un dato inventado. Debajo del estado vacío, cada pestaña
 * pintaba una tarjeta rotulada «Ejemplo …» que era una maqueta completa del
 * bloque real:
 *
 *   - Conversaciones: tres burbujas con texto escrito a mano, maquetadas con
 *     el mismo globo y el mismo autor que tendría el hilo verdadero — incluida
 *     una respuesta del candidato («Claro, lo subo hoy mismo.») que nadie
 *     escribió nunca.
 *   - Historial: cuatro eventos —solicitud, documentos, evaluación, decisión—
 *     con su punto, su línea conectora y su número de paso.
 *   - Codeudores: una ficha de persona con avatar, «Nombre del codeudor» y
 *     «C.C. — · — · —».
 *
 * El rótulo estaba, sí. Pero era un rótulo chico arriba de una maqueta grande,
 * y quien lee de reojo se lleva la maqueta.
 *
 * Lo que SÍ se queda: la nota de codeudor recomendado. Ese `requiereCodeudor`
 * se deriva de `financialAnalysis.incomeToRentRatio`, que es dato real del
 * motor (contra un umbral que pone el front — por eso ahora se muestran los
 * dos números).
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

// El stub resuelve las claves contra el es.json REAL. Importa que sea el de
// verdad y no `t: (k) => k`: buena parte del texto inventado vivía en el
// diccionario, no en el componente, así que un mock que devuelve la clave
// escondería justo lo que hay que vigilar.
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { ConversacionesTab } from './ConversacionesTab';
import { HistorialTab } from './HistorialTab';
import { CodeudoresTab } from './CodeudoresTab';
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(nodo: React.ReactElement) {
  act(() => {
    root.render(nodo);
  });
}

const texto = () => container.textContent ?? '';

describe('ConversacionesTab', () => {
  it('no pinta ningún mensaje: ni burbujas, ni texto inventado', () => {
    pintar(<ConversacionesTab />);

    expect(container.querySelectorAll('[data-side]').length).toBe(0);
    expect(texto()).not.toContain('Claro, lo subo hoy mismo');
    expect(texto()).not.toContain('necesitamos tu certificado laboral');
    expect(texto()).not.toContain('Ejemplo de la conversación');
  });

  it('dice qué falta y por qué', () => {
    pintar(<ConversacionesTab />);
    expect(texto()).toContain('postulación');
    expect(texto()).toContain('identificador del análisis');
  });
});

describe('HistorialTab', () => {
  it('no afirma eventos que nadie registró', () => {
    pintar(<HistorialTab />);

    for (const inventado of [
      'Solicitud creada',
      'Documentos recibidos',
      'Estudio evaluado',
      'Decisión registrada',
      'Ejemplo de la línea de tiempo',
    ]) {
      expect(texto()).not.toContain(inventado);
    }
  });

  it('dice qué falta y por qué', () => {
    pintar(<HistorialTab />);
    expect(texto()).toContain('no hay ni un solo evento');
  });
});

describe('CodeudoresTab', () => {
  const decision = { requiereCodeudor: true } as EstudioDecision;
  const result = {
    financialAnalysis: {
      monthlyIncomeDetected: 4_500_000,
      monthlyRent: 2_000_000,
      incomeToRentRatio: 2.25,
      financialStability: 70,
    },
  } as TenantScoringResult;

  it('no dibuja una ficha de persona que no existe', () => {
    pintar(<CodeudoresTab decision={decision} result={result} />);

    expect(texto()).not.toContain('Nombre del codeudor');
    expect(texto()).not.toContain('C.C.');
    expect(texto()).not.toContain('Ejemplo de una ficha de codeudor');
  });

  it('CONSERVA la recomendación, que sí se deriva de datos del motor', () => {
    // ⚠️ Lo bueno no se va con lo malo: `requiereCodeudor` sale de un número
    // real. Si esta nota desaparece, el arreglo se pasó de largo.
    pintar(<CodeudoresTab decision={decision} result={result} />);

    expect(container.querySelector('[data-testid="codeudor-recomendado"]')).toBeTruthy();
  });

  it('muestra la aritmética de la recomendación: el ratio real y el umbral', () => {
    pintar(<CodeudoresTab decision={decision} result={result} />);

    const nota = container.querySelector('[data-testid="codeudor-recomendado"]')?.textContent ?? '';
    expect(nota).toContain('2.3×'); // incomeToRentRatio real (2.25), a un decimal
    expect(nota).toContain('3×'); // DEFAULT_INCOME_RATIO_MIN, umbral del front
  });

  it('sin recomendación no inventa ninguna nota', () => {
    pintar(<CodeudoresTab decision={{ requiereCodeudor: false } as EstudioDecision} />);
    expect(container.querySelector('[data-testid="codeudor-recomendado"]')).toBeNull();
  });

  it('con la recomendación pero sin ratio, no inventa el número', () => {
    pintar(<CodeudoresTab decision={decision} />);

    const nota = container.querySelector('[data-testid="codeudor-recomendado"]')?.textContent ?? '';
    expect(nota).not.toContain('×');
  });
});
