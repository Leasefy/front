/** «Borrar conversación» borra también el servidor (Nico, 04-10-2026): qué se manda. */
import { describe, expect, it } from 'vitest';

import { cuerpoDelBorrado, urlDelBorrado } from './borrar-en-el-servidor';

const T = '00000000-0000-4000-8000-000000000001';

describe('cuerpoDelBorrado', () => {
  it('manda los turnoId válidos, los ids de los mensajes y las preguntas de la persona', () => {
    expect(
      cuerpoDelBorrado([
        { id: 'u1', role: 'user', content: '¿cómo va la cartera?' },
        { id: 'a1', role: 'assistant', content: 'Bien.', turnoId: T },
        { id: 'a2', role: 'assistant', content: 'Viejo', turnoId: 'no-es-uuid' },
      ]),
    ).toEqual({ turnoIds: [T], mensajeIds: ['u1', 'a1', 'a2'], preguntas: ['¿cómo va la cartera?'] });
  });

  it('una conversación vacía no manda nada', () => {
    expect(cuerpoDelBorrado([])).toBeNull();
    expect(cuerpoDelBorrado([{ id: 'w', role: 'assistant', content: 'Hola' }])).toBeNull();
  });

  it('sin micro configurado no hay URL', () => {
    const antes = process.env.NEXT_PUBLIC_AGENT_URL;
    delete process.env.NEXT_PUBLIC_AGENT_URL;
    expect(urlDelBorrado('ag')).toBeNull();
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro';
    expect(urlDelBorrado('ag')).toBe('http://micro/api/agency/ag/ai-hub/chat/conversacion/borrar');
    if (antes === undefined) delete process.env.NEXT_PUBLIC_AGENT_URL;
    else process.env.NEXT_PUBLIC_AGENT_URL = antes;
  });
});
