import { describe, it, expect } from 'vitest';
import { hayQuePintarLasPestanas, pestanasVisibles, sinElNumeroRepetido } from './pestanas-sin-repetir';

type V = 'todos' | 'enviar' | 'enviadas';

describe('pestañas sin el número repetido (R2, r27)', () => {
  it('«Todas 30 · Por enviar 30» → «Todas · Por enviar 30»', () => {
    const r = sinElNumeroRepetido<V>(
      [
        { valor: 'todos', etiqueta: 'Todas', cuantos: 30, fija: true },
        { valor: 'enviar', etiqueta: 'Por enviar', cuantos: 30 },
        { valor: 'enviadas', etiqueta: 'Enviadas', cuantos: 0 },
      ],
      'todos',
      'todos',
    );
    expect(r.find((p) => p.valor === 'todos')!.cuantos).toBeNull();
    expect(r.find((p) => p.valor === 'enviar')!.cuantos).toBe(30);
  });

  it('con números distintos no cambia nada', () => {
    const p = [
      { valor: 'todos' as V, etiqueta: 'Todas', cuantos: 30, fija: true },
      { valor: 'enviar' as V, etiqueta: 'Por enviar', cuantos: 12 },
      { valor: 'enviadas' as V, etiqueta: 'Enviadas', cuantos: 18 },
    ];
    expect(sinElNumeroRepetido(p, 'todos', 'todos')).toEqual(p);
  });

  it('una pestaña en cero (que no se pinta) no cuenta como repetida', () => {
    const r = sinElNumeroRepetido<V>(
      [
        { valor: 'todos', etiqueta: 'Todas', cuantos: 0, fija: true },
        { valor: 'enviar', etiqueta: 'Por enviar', cuantos: 0 },
      ],
      'todos',
      'todos',
    );
    expect(r[0].cuantos).toBe(0);
  });

  it('sin contar (null) se deja como está', () => {
    const r = sinElNumeroRepetido<V>(
      [
        { valor: 'todos', etiqueta: 'Todas', cuantos: null, fija: true },
        { valor: 'enviar', etiqueta: 'Por enviar', cuantos: 3 },
      ],
      'todos',
      'todos',
    );
    expect(r[0].cuantos).toBeNull();
  });

  it('una pestaña sola no se pinta; dos sí', () => {
    expect(hayQuePintarLasPestanas<V>([{ valor: 'todos', etiqueta: 'Todos', cuantos: 8, fija: true }, { valor: 'enviar', etiqueta: 'x', cuantos: 0 }], 'todos')).toBe(false);
    expect(hayQuePintarLasPestanas<V>([{ valor: 'todos', etiqueta: 'Todos', cuantos: 8, fija: true }, { valor: 'enviar', etiqueta: 'x', cuantos: 2 }], 'todos')).toBe(true);
    // La elegida siempre se pinta, aunque esté en cero.
    expect(pestanasVisibles<V>([{ valor: 'todos', etiqueta: 'Todos', cuantos: 8, fija: true }, { valor: 'enviar', etiqueta: 'x', cuantos: 0 }], 'enviar')).toHaveLength(2);
  });
});
