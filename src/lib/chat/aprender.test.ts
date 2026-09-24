/**
 * Lo puro del «¿Aprendo esto?»: a qué URL va (siempre una ruta REAL del micro)
 * y en qué respuestas vale la pena ofrecerlo.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { rutaDelMicro } from '@/lib/api/contrato-del-chat-del-micro';
import type { ChatMessage } from '@/lib/types/beta-chat';

import { propuestaDeshecha, urlDeAprender, valeLaPenaOfrecer } from './aprender';

const AGENCIA = '504bdd59-d05f-4ae2-99c5-b71e6accb58c';
const TURNO = '3f2b8c1e-9d4a-4f6b-8e2a-1c5d7e9f0a3b';
const ORIGINAL = process.env.NEXT_PUBLIC_AGENT_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test';
});
afterEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = ORIGINAL;
});

describe('urlDeAprender', () => {
  it('arma la ruta que el micro expone (GET y POST)', () => {
    const url = urlDeAprender(AGENCIA, TURNO)!;
    expect(rutaDelMicro('GET', url)).not.toBeNull();
    expect(rutaDelMicro('POST', url)).not.toBeNull();
  });

  it('sin micro, sin agencia o con un turno que no es del servidor: no hay a dónde ir', () => {
    expect(urlDeAprender(AGENCIA, 'msg-123')).toBeNull();
    expect(urlDeAprender(null, TURNO)).toBeNull();
    delete process.env.NEXT_PUBLIC_AGENT_URL;
    expect(urlDeAprender(AGENCIA, TURNO)).toBeNull();
  });
});

describe('valeLaPenaOfrecer', () => {
  const base = { role: 'assistant', status: 'complete', turnoId: TURNO } as Pick<
    ChatMessage,
    'role' | 'status' | 'turnoId' | 'entidades' | 'resultado'
  >;

  it('con tarjetas, con un «Deshacer» o tras una definición; si no, no', () => {
    expect(valeLaPenaOfrecer({ ...base, entidades: [{ tipo: 'contrato', id: 'c-1', titulo: '#1' }] as ChatMessage['entidades'] }, null)).toBe(true)
    const deshecha = { ...base, resultado: { propuestaId: 'p-1', estado: 'deshecha', titulo: '', resumen: 'x', deshacer: null } } as typeof base
    expect(valeLaPenaOfrecer(deshecha, null)).toBe(true);
    expect(propuestaDeshecha(deshecha)).toBe('p-1');
    expect(valeLaPenaOfrecer(base, 'acá le decimos la 81 al edificio de la Calle 81 Sur')).toBe(true);
    expect(valeLaPenaOfrecer(base, '¿cuánto tengo en cartera?')).toBe(false);
  });

  it('nunca en un mensaje sin turno del servidor, sin terminar o de la persona', () => {
    const conTarjetas = { entidades: [{ tipo: 'contrato', id: 'c-1', titulo: '#1' }] as ChatMessage['entidades'] };
    expect(valeLaPenaOfrecer({ ...base, ...conTarjetas, turnoId: undefined }, null)).toBe(false);
    expect(valeLaPenaOfrecer({ ...base, ...conTarjetas, status: 'streaming' } as typeof base, null)).toBe(false);
    expect(valeLaPenaOfrecer({ ...base, ...conTarjetas, role: 'user' }, null)).toBe(false);
  });
});
