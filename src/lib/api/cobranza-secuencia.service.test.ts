/**
 * cobranza-secuencia.service — el contrato con el back, clave por clave.
 *
 * El back corre con `forbidNonWhitelisted`: una clave de más es un 400. Por eso
 * estos tests fijan el juego EXACTO de claves de cada cuerpo, no sólo que «se
 * llame al endpoint».
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    put: (...args: unknown[]) => putMock(...args),
  },
}));

import { cobranzaSecuenciaApi, mesDeHoy } from './cobranza-secuencia.service';

const BASE = '/inmobiliaria/cobranza/secuencia';

beforeEach(() => {
  getMock.mockReset();
  postMock.mockReset();
  putMock.mockReset();
  getMock.mockResolvedValue({});
  postMock.mockResolvedValue({});
  putMock.mockResolvedValue({});
});

describe('guardar — sólo viajan las claves que cambian', () => {
  it('un cambio suelto manda UNA sola clave', async () => {
    await cobranzaSecuenciaApi.guardar({ diasEntreAvisos: 5 });
    expect(putMock).toHaveBeenCalledWith(BASE, { diasEntreAvisos: 5 });
  });

  it('apagar la secuencia manda `activa: false`, no la omite', async () => {
    await cobranzaSecuenciaApi.guardar({ activa: false });
    expect(putMock).toHaveBeenCalledWith(BASE, { activa: false });
  });

  it('un mensaje vacío SÍ viaja: es la manera de borrar el texto propio', async () => {
    await cobranzaSecuenciaApi.guardar({ mensajeDelRecordatorio: '' });
    expect(putMock).toHaveBeenCalledWith(BASE, { mensajeDelRecordatorio: '' });
  });

  it('el reglaje completo manda exactamente sus cinco claves', async () => {
    await cobranzaSecuenciaApi.guardar({
      activa: true,
      diaDelRecordatorio: 1,
      diasEntreAvisos: 3,
      maxAvisosConInteres: 3,
      canalPreferido: 'CORREO',
    });
    expect(Object.keys(putMock.mock.calls[0][1] as object).sort()).toEqual([
      'activa',
      'canalPreferido',
      'diaDelRecordatorio',
      'diasEntreAvisos',
      'maxAvisosConInteres',
    ]);
  });
});

describe('destinatarios — la vista previa es GET y no tiene efecto', () => {
  it('con sólo el mes, no inventa paso ni canal (los decide el back)', async () => {
    await cobranzaSecuenciaApi.destinatarios({ mes: '2026-10' });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/destinatarios?mes=2026-10`);
  });

  it('el paso 0 viaja: es el recordatorio, no «sin paso»', async () => {
    await cobranzaSecuenciaApi.destinatarios({ mes: '2026-10', paso: 0 });
    expect(getMock).toHaveBeenCalledWith(`${BASE}/destinatarios?mes=2026-10&paso=0`);
  });

  it('el canal se agrega cuando se elige', async () => {
    await cobranzaSecuenciaApi.destinatarios({ mes: '2026-10', paso: 2, canal: 'WHATSAPP' });
    expect(getMock).toHaveBeenCalledWith(
      `${BASE}/destinatarios?mes=2026-10&paso=2&canal=WHATSAPP`,
    );
  });
});

describe('enviar — lo único que le escribe a un inquilino', () => {
  it('el cuerpo mínimo es sólo el mes', async () => {
    await cobranzaSecuenciaApi.enviar({ mes: '2026-10' });
    expect(postMock).toHaveBeenCalledWith(`${BASE}/enviar`, { mes: '2026-10' });
  });

  it('el paso 0 viaja también acá', async () => {
    await cobranzaSecuenciaApi.enviar({ mes: '2026-10', paso: 0 });
    expect(postMock).toHaveBeenCalledWith(`${BASE}/enviar`, { mes: '2026-10', paso: 0 });
  });

  it('una selección manda sólo esos cobros', async () => {
    await cobranzaSecuenciaApi.enviar({ mes: '2026-10', soloEstosCobros: ['a', 'b'] });
    expect(postMock).toHaveBeenCalledWith(`${BASE}/enviar`, {
      mes: '2026-10',
      soloEstosCobros: ['a', 'b'],
    });
  });

  it('no cuela ninguna clave que el back no conozca', async () => {
    await cobranzaSecuenciaApi.enviar({ mes: '2026-10', paso: 1, canal: 'CORREO' });
    expect(Object.keys(postMock.mock.calls[0][1] as object).sort()).toEqual([
      'canal',
      'mes',
      'paso',
    ]);
  });
});

describe('calendario', () => {
  it('pide el mes por query', async () => {
    await cobranzaSecuenciaApi.calendario('2026-10');
    expect(getMock).toHaveBeenCalledWith(`${BASE}/calendario?mes=2026-10`);
  });
});

describe('mesDeHoy — en Bogotá, no en UTC', () => {
  it('las 7 p.m. del 31 en Bogotá siguen siendo ese mes, aunque en UTC ya sea el 1', () => {
    // 2026-11-01T00:30Z = 31 de octubre, 7:30 p.m. en Bogotá.
    expect(mesDeHoy(new Date('2026-11-01T00:30:00.000Z'))).toBe('2026-10');
  });

  it('el primero a mediodía es el mes nuevo', () => {
    expect(mesDeHoy(new Date('2026-11-01T17:00:00.000Z'))).toBe('2026-11');
  });
});
