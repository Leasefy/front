/**
 * AccionPropuestaCard — tests de la tarjeta que ejecuta.
 *
 * Lo que se prueba es lo que el operador tiene derecho a ver ANTES de decir que
 * sí: a quiénes, a quién no y por qué, y el texto exacto que va a salir. Más el
 * estado después: un «listo» sin el detalle de lo que no salió es cómo se
 * termina creyendo que un envío salió cuando no salió.
 *
 * Mismo patrón que `ActionProposalCard.test.tsx` (react-dom/client + act).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { AccionPropuestaCard, type EstadoDeTarjeta } from './AccionPropuestaCard';
import type { BackendAccionPropuesta } from '@/lib/api/ai-hub-acciones';

void React;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function propuesta(over: Partial<BackendAccionPropuesta> = {}): BackendAccionPropuesta {
  return {
    id: 'p-1',
    accion: 'recordatorio_pago',
    titulo: 'Recordatorio de pago',
    resumen: 'Recordatorio de pago a 2 inquilinos con más de 30 días de mora',
    canal: 'hilo_directo',
    destinatarios: [
      { nombre: 'Laura Pérez', contacto: 'lau•••@ejemplo.com', detalle: '45 días · $2.104.202' },
      { nombre: 'Andrés Escobar', contacto: 'and•••@ejemplo.com', detalle: '33 días · $2.107.003' },
      { nombre: 'Mónica Toro', contacto: 'mon•••@ejemplo.com', excluidoPor: 'ya fue contactada hoy' },
    ],
    total: 2,
    texto: 'Hola, tienes un pago de arriendo pendiente.',
    estado: 'pendiente',
    venceEn: new Date(Date.now() + 9 * 60_000).toISOString(),
    ...over,
  };
}

function montar(
  p: BackendAccionPropuesta,
  estado: EstadoDeTarjeta,
  extra: { resultado?: { enviados: number; fallidos: { nombre: string; motivo: string }[]; resumen: string } | null; error?: string | null } = {},
  manejadores: { onConfirmar?: () => void; onCancelar?: () => void } = {},
) {
  act(() => {
    root.render(
      React.createElement(AccionPropuestaCard, {
        propuesta: p,
        estado,
        resultado: extra.resultado ?? null,
        error: extra.error ?? null,
        onConfirmar: manejadores.onConfirmar ?? vi.fn(),
        onCancelar: manejadores.onCancelar ?? vi.fn(),
      }),
    );
  });
}

function botones(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button'));
}

describe('AccionPropuestaCard — lo que se ve antes de confirmar', () => {
  it('muestra a quiénes se les escribe, con su detalle real', () => {
    montar(propuesta(), 'pendiente');
    expect(container.textContent).toContain('Laura Pérez');
    expect(container.textContent).toContain('45 días · $2.104.202');
    expect(container.textContent).toContain('and•••@ejemplo.com');
  });

  it('muestra tachado a quien NO se le escribe, con el motivo', () => {
    montar(propuesta(), 'pendiente');
    expect(container.textContent).toContain('Mónica Toro');
    expect(container.textContent).toContain('no se le escribe: ya fue contactada hoy');
    const tachado = container.querySelector('.line-through');
    expect(tachado?.textContent).toBe('Mónica Toro');
  });

  it('muestra el texto exacto que va a salir', () => {
    montar(propuesta(), 'pendiente');
    expect(container.textContent).toContain('Hola, tienes un pago de arriendo pendiente.');
  });

  it('el botón dice a cuántos les va a llegar', () => {
    montar(propuesta(), 'pendiente');
    expect(botones()[0].textContent).toContain('Confirmar (2)');
  });

  it('avisa cuánto le queda a la propuesta antes de vencer', () => {
    montar(propuesta(), 'pendiente');
    expect(container.textContent).toContain('vence en');
  });
});

describe('AccionPropuestaCard — confirmar y cancelar', () => {
  it('«Confirmar» llama al manejador una sola vez', () => {
    const onConfirmar = vi.fn();
    montar(propuesta(), 'pendiente', {}, { onConfirmar });
    act(() => {
      botones()[0].click();
    });
    expect(onConfirmar).toHaveBeenCalledOnce();
  });

  it('«Cancelar» llama al suyo y NO al de confirmar', () => {
    const onConfirmar = vi.fn();
    const onCancelar = vi.fn();
    montar(propuesta(), 'pendiente', {}, { onConfirmar, onCancelar });
    act(() => {
      botones()[1].click();
    });
    expect(onCancelar).toHaveBeenCalledOnce();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('mientras se ejecuta, los dos botones quedan deshabilitados', () => {
    montar(propuesta(), 'confirmando');
    expect(botones().every((b) => b.disabled)).toBe(true);
    expect(container.textContent).toContain('Enviando…');
  });

  it('sin nadie a quien escribirle, no se puede confirmar', () => {
    const p = propuesta({
      destinatarios: [{ nombre: 'Mónica Toro', contacto: 'mon•••@x.co', excluidoPor: 'ya fue contactada hoy' }],
      total: 0,
    });
    montar(p, 'pendiente');
    expect(botones()[0].disabled).toBe(true);
  });
});

describe('AccionPropuestaCard — después', () => {
  it('ejecutada: muestra el resumen de lo que pasó, incluido lo que no salió', () => {
    montar(propuesta(), 'ejecutada', {
      resultado: {
        enviados: 3,
        fallidos: [{ nombre: 'Mónica', motivo: 'no tiene cuenta en el portal' }],
        resumen: 'Listo: 3 recordatorios enviados; 1 no salió: Mónica (no tiene cuenta en el portal).',
      },
    });
    expect(container.textContent).toContain('Listo: 3 recordatorios enviados');
    expect(container.textContent).toContain('no tiene cuenta en el portal');
    // Ya no se puede volver a confirmar desde la tarjeta.
    expect(botones()).toHaveLength(0);
  });

  it('cancelada: no hay botones y lo dice', () => {
    montar(propuesta(), 'cancelada');
    expect(container.textContent).toContain('Cancelada');
    expect(botones()).toHaveLength(0);
  });

  it('una propuesta con la hora pasada se muestra vencida aunque el estado diga pendiente', () => {
    montar(propuesta({ venceEn: new Date(Date.now() - 60_000).toISOString() }), 'pendiente');
    expect(container.textContent).toContain('Venció');
    expect(container.textContent).toContain('Pedímela de nuevo');
    expect(botones()).toHaveLength(0);
  });

  it('fallida: dice que no salió y muestra el motivo', () => {
    montar(propuesta(), 'fallida', {
      resultado: { enviados: 0, fallidos: [], resumen: 'No salió ninguno: no hay conexión con la operación.' },
    });
    expect(container.textContent).toContain('No salió');
    expect(container.textContent).toContain('no hay conexión con la operación');
  });
});
