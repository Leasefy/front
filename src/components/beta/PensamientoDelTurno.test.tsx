/**
 * @vitest-environment happy-dom
 */
/**
 * El pensamiento en vivo (Nico, 02-10-2026): cada paso del micro mientras
 * pasa, con su resultado y su cifra; el especialista con su orbe y su nombre
 * del equipo; al llegar la respuesta, plegado en «Cómo lo pensó».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { DespuesDeUnMomento, PensamientoDelTurno, RelojDelTurno } from './PensamientoDelTurno';
import type { PasoDelPensamiento } from '@/lib/chat/pensamiento';

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
  vi.useRealTimers();
});
const pintar = (el: React.ReactElement) => act(() => root.render(el));
const q = (testid: string) => container.querySelectorAll(`[data-testid="${testid}"]`);

/** Un turno real del micro (fixture grabado de la ruta con dobles, 02-10). */
const PASOS: PasoDelPensamiento[] = [
  { id: 'pregunta', fase: 'pregunta', estado: 'listo', texto: 'Contratos que vencen entre el 1 y el 30 de noviembre de 2026' },
  {
    id: 'cartera',
    fase: 'cartera',
    estado: 'listo',
    texto: 'Tu cartera al 2 de octubre',
    resultado: { texto: '$48.600.000 en 31 clientes', cifra: 48_600_000, formato: 'moneda' },
  },
  {
    id: 'despacho-d1',
    fase: 'despacho',
    estado: 'en_curso',
    agente: 'pagos',
    dispatchId: 'd1',
    texto: 'Le pido al especialista de pagos: “los pagos de octubre de esos 14 contratos”…',
    actividad: 'Cruzando los pagos de octubre de 14 contratos…',
  },
];

describe('en vivo', () => {
  it('cada paso con su texto; el que corre lleva brillo, su «ahora» y el orbe de su especialista', () => {
    pintar(<PensamientoDelTurno pasos={PASOS} vivo />);
    const filas = q('paso-del-pensamiento');
    expect(filas).toHaveLength(3);
    expect(filas[0]!.textContent).toContain('Contratos que vencen entre el 1 y el 30 de noviembre de 2026');
    // El resultado, con su cifra (AnimatedNumber la cuenta; acá, su valor final).
    expect(filas[1]!.textContent).toContain('Tu cartera al 2 de octubre');
    expect(filas[1]!.textContent).toMatch(/\$48\.600\.000 en 31 clientes|en 31 clientes/);
    // El especialista: nombre del equipo (pagos → Cobri), no «el especialista de pagos».
    const vivo = filas[2]!;
    expect(vivo.getAttribute('data-estado')).toBe('en_curso');
    expect(vivo.textContent).toContain('Le pido a Cobri: “los pagos de octubre de esos 14 contratos”…');
    expect(vivo.textContent).not.toContain('especialista de pagos');
    expect(vivo.textContent).toContain('Cruzando los pagos de octubre de 14 contratos…');
    expect(vivo.querySelector('.chat-brillo__capa')).not.toBeNull();
    expect(vivo.querySelector('[data-agente="pagos"]')).not.toBeNull();
  });

  it('la lista visual no se anuncia; un lector de pantalla oye UNA línea con lo esencial', () => {
    pintar(<PensamientoDelTurno pasos={PASOS} vivo />);
    expect(q('pensamiento-en-vivo')[0]!.getAttribute('aria-hidden')).toBe('true');
    const linea = q('pensamiento-para-lectores')[0]!;
    expect(linea.getAttribute('aria-live')).toBe('polite');
    expect(linea.textContent).toBe('Le pido a Cobri: “los pagos de octubre de esos 14 contratos”…');
  });

  it('un paso que termina se asienta con su resultado (y pierde el brillo)', () => {
    pintar(<PensamientoDelTurno pasos={PASOS} vivo />);
    const listo: PasoDelPensamiento = {
      ...PASOS[2]!,
      estado: 'listo',
      texto: 'Le pedí al especialista de pagos: “los pagos de octubre de esos 14 contratos”',
      actividad: undefined,
      resultado: { texto: '3 con saldo pendiente', cifra: 3, formato: 'numero' },
    };
    pintar(<PensamientoDelTurno pasos={[PASOS[0]!, PASOS[1]!, listo]} vivo />);
    const fila = q('paso-del-pensamiento')[2]!;
    expect(fila.getAttribute('data-estado')).toBe('listo');
    expect(fila.querySelector('.chat-brillo__capa')).toBeNull();
    expect(fila.textContent).toContain('Le pedí a Cobri');
    expect(fila.textContent).toContain('con saldo pendiente');
  });
});

describe('plegado en «Cómo lo pensó»', () => {
  const RAZONAMIENTO = [
    { texto: 'Era la pregunta de un dato puntual de tu operación.' },
    { agente: 'pagos', texto: 'Le pasé la consulta al especialista de pagos, que orienta sobre cobros.' },
    { agente: 'pagos', texto: 'Lo que trajo: 3 con saldo pendiente.' },
  ];

  it('una línea con los pasos y el tiempo, cerrada; al abrirla, EXACTAMENTE las líneas que pasaron en vivo (Nico, 09-10)', () => {
    const pasos = PASOS.map((p) => (p.estado === 'en_curso' ? { ...p, estado: 'listo' as const, actividad: undefined } : p));
    pintar(<PensamientoDelTurno pasos={pasos} vivo={false} duracionMs={8_400} razonamiento={RAZONAMIENTO} />);
    expect(q('paso-del-pensamiento')).toHaveLength(0);
    const boton = q('como-lo-penso')[0] as HTMLButtonElement;
    expect(boton.textContent).toContain('Cómo lo pensó');
    expect(boton.textContent).toContain('3 pasos');
    expect(boton.textContent).toContain('8,4 s');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    act(() => boton.click());
    // Las mismas filas que en vivo, en el mismo orden, con su resultado y el riel.
    const filas = q('paso-del-pensamiento');
    expect(filas).toHaveLength(3);
    expect(filas[0]!.textContent).toContain('Contratos que vencen entre el 1 y el 30 de noviembre de 2026');
    expect(filas[1]!.textContent).toContain('Tu cartera al 2 de octubre');
    expect(filas[1]!.textContent).toContain('en 31 clientes');
    // El especialista con su nombre del equipo y su orbe.
    expect(filas[2]!.getAttribute('data-fase')).toBe('despacho');
    expect(filas[2]!.textContent).toContain('Le pido a Cobri');
    expect(q('pensamiento-abierto')).toHaveLength(1);
    // Con pasos, las frases del micro no reemplazan lo que pasó.
    expect(container.textContent).not.toContain('Era la pregunta de un dato puntual');
    expect(q('pasos-del-razonamiento')).toHaveLength(0);
  });

  it('una respuesta vieja, sin pasos, se abre en las frases del micro con el orbe y el nombre', () => {
    pintar(<PensamientoDelTurno pasos={[]} vivo={false} razonamiento={RAZONAMIENTO} />);
    act(() => (q('como-lo-penso')[0] as HTMLButtonElement).click());
    expect(container.textContent).toContain('Era la pregunta de un dato puntual de tu operación.');
    expect(container.textContent).toContain('Le pasé la consulta a Cobri, que orienta sobre cobros.');
    expect(container.querySelector('[data-testid="pasos-del-razonamiento"] [data-agente="pagos"]')).not.toBeNull();
  });

  it('sin pasos ni razonamiento no pinta nada (nunca se rellena)', () => {
    pintar(<PensamientoDelTurno pasos={[]} vivo={false} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('el tiempo y la espera del primer paso', () => {
  it('el reloj corre mientras piensa y queda quieto al terminar', () => {
    vi.useFakeTimers();
    const inicio = Date.now();
    pintar(<RelojDelTurno inicio={inicio} fin={null} />);
    act(() => {
      vi.advanceTimersByTime(2_300);
    });
    expect(q('reloj-del-turno')[0]!.textContent).toBe('2,3 s');
    pintar(<RelojDelTurno inicio={inicio} fin={inicio + 8_400} />);
    expect(q('reloj-del-turno')[0]!.textContent).toBe('8,4 s');
    expect(q('reloj-del-turno')[0]!.getAttribute('aria-hidden')).toBe('true');
  });

  it('si el primer paso no llega en un momento (un micro viejo), aparece el respaldo', () => {
    vi.useFakeTimers();
    pintar(
      <DespuesDeUnMomento ms={700}>
        <p data-testid="respaldo">Leyendo tu pregunta</p>
      </DespuesDeUnMomento>
    );
    expect(q('respaldo')).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(q('respaldo')).toHaveLength(1);
  });
});
