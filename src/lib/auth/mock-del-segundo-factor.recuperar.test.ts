/**
 * T-0172 r2 — el mock cuando el factor NO se inscribió con el mock.
 * Libera los factores por el back (sólo no-prod), inscribe uno nuevo con el
 * mock y lo verifica. El secreto se guarda DESPUÉS de verificar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { liberarMock, crearMock, verificarMock, descartarMock } = vi.hoisted(() => ({
  liberarMock: vi.fn(),
  crearMock: vi.fn(),
  verificarMock: vi.fn(),
  descartarMock: vi.fn(),
}));

vi.mock('@/lib/api/segundo-factor.service', () => ({
  segundoFactorApi: { liberarFactoresDelMock: liberarMock },
}));

vi.mock('@/lib/auth/inscripcion-del-segundo-factor', () => ({
  crearFactorTotp: crearMock,
  verificarFactorNuevo: verificarMock,
  descartarFactorSinVerificar: descartarMock,
}));

import {
  MENSAJE_SIN_SECRETO_DEL_MOCK,
  clavePorFactor,
  inscribirYVerificarConElMock,
  leerSecretoDelMock,
  liberarYVerificarConElMock,
  resolverCodigoDelMock,
} from './mock-del-segundo-factor';

const SECRETO = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const TOKEN = `cab.${btoa(JSON.stringify({ sub: 'u1' })).replace(/=+$/, '')}.firma`;

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development');
  liberarMock.mockReset().mockResolvedValue({ factoresBorrados: 1 });
  crearMock.mockReset().mockResolvedValue({ factorId: 'fn', qrCode: '', secret: SECRETO });
  verificarMock.mockReset().mockResolvedValue(undefined);
  descartarMock.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe('resolverCodigoDelMock sin secreto', () => {
  it('marca sinSecreto para poder recuperar', async () => {
    const r = await resolverCodigoDelMock({ codigo: '123456', userId: 'u1', factorId: 'f1' });
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK, sinSecreto: true });
  });
});

describe('inscribirYVerificarConElMock', () => {
  it('guarda el secreto sólo después de verificar', async () => {
    let guardadoAlVerificar: string | null = 'sin-medir';
    verificarMock.mockImplementation(async () => {
      guardadoAlVerificar = leerSecretoDelMock('u1', 'fn');
    });
    const r = await inscribirYVerificarConElMock({ token: TOKEN, enElIngreso: true });
    expect(r).toEqual({ factorId: 'fn' });
    expect(guardadoAlVerificar).toBeNull();
    expect(window.localStorage.getItem(clavePorFactor('u1', 'fn'))).toBe(SECRETO);
  });

  it('si verificar falla no deja secreto y descarta el factor', async () => {
    verificarMock.mockRejectedValue(new Error('mal'));
    await expect(inscribirYVerificarConElMock({ token: TOKEN, enElIngreso: false })).rejects.toThrow('mal');
    expect(window.localStorage.getItem(clavePorFactor('u1', 'fn'))).toBeNull();
    expect(descartarMock).toHaveBeenCalledWith('fn', TOKEN);
  });
});

describe('liberarYVerificarConElMock', () => {
  it('200: libera, inscribe, verifica y guarda el secreto', async () => {
    const r = await liberarYVerificarConElMock({ token: TOKEN, enElIngreso: true });
    expect(r).toEqual({ ok: true, factorId: 'fn' });
    expect(liberarMock).toHaveBeenCalledTimes(1);
    expect(verificarMock).toHaveBeenCalledTimes(1);
    expect(verificarMock.mock.calls[0]![0]).toMatchObject({ factorId: 'fn', enElIngreso: true, token: TOKEN });
    expect(window.localStorage.getItem(clavePorFactor('u1', 'fn'))).toBe(SECRETO);
  });

  it('404 (o red, o 5xx): el mensaje de siempre, sin inscribir ni reintentar', async () => {
    liberarMock.mockRejectedValue(Object.assign(new Error('no'), { status: 404 }));
    const r = await liberarYVerificarConElMock({ token: TOKEN, enElIngreso: true });
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK });
    expect(liberarMock).toHaveBeenCalledTimes(1);
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('compuerta cerrada: nunca llama al back', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
    const r = await liberarYVerificarConElMock({ token: TOKEN, enElIngreso: true });
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_SIN_SECRETO_DEL_MOCK });
    expect(liberarMock).not.toHaveBeenCalled();
    expect(crearMock).not.toHaveBeenCalled();
  });

  it('libera bien pero la inscripción falla: ok false con aviso y sin secreto', async () => {
    verificarMock.mockRejectedValue(new Error('mal'));
    const r = await liberarYVerificarConElMock({ token: TOKEN, enElIngreso: true });
    expect(r.ok).toBe(false);
    expect(window.localStorage.getItem(clavePorFactor('u1', 'fn'))).toBeNull();
  });
});
