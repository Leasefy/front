/**
 * `haySesionValida` — la puerta de las rutas que bajan URLs de afuera
 * (auditoría de seguridad 23-09). Lo que importa: que un encabezado inventado
 * no alcance, y que un import con miles de fotos no verifique el mismo token
 * miles de veces.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getClaims = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getClaims } }) }));

import { haySesionValida, _olvidarSesionesVerificadas } from './sesion-de-la-ruta';

const conToken = (valor?: string) =>
  new Request('http://localhost/api/x', { headers: valor ? { authorization: valor } : {} });
const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proyecto.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_prueba';
  _olvidarSesionesVerificadas();
  getClaims.mockReset();
});

describe('haySesionValida', () => {
  it('sin encabezado, o sin «Bearer», no hay sesión y no se pregunta a nadie', async () => {
    expect(await haySesionValida(conToken())).toBe(false);
    expect(await haySesionValida(conToken('Basic abc'))).toBe(false);
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('un token con firma inválida no pasa', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('invalid JWT') });
    expect(await haySesionValida(conToken('Bearer inventado'))).toBe(false);
  });

  it('un token vencido no pasa', async () => {
    getClaims.mockResolvedValue({ data: { claims: { exp: Math.floor(Date.now() / 1000) - 10 } }, error: null });
    expect(await haySesionValida(conToken('Bearer viejo'))).toBe(false);
  });

  it('si Supabase falla, se cierra', async () => {
    getClaims.mockRejectedValue(new Error('JWKS caído'));
    expect(await haySesionValida(conToken('Bearer x'))).toBe(false);
  });

  it('sin configuración de Supabase, se cierra', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    _olvidarSesionesVerificadas();
    expect(await haySesionValida(conToken('Bearer x'))).toBe(false);
  });

  it('un token válido pasa, y el mismo token no se vuelve a verificar por cada foto', async () => {
    getClaims.mockResolvedValue({ data: { claims: { exp: enUnaHora() } }, error: null });
    for (let i = 0; i < 40; i++) {
      expect(await haySesionValida(conToken('Bearer bueno'))).toBe(true);
    }
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(getClaims).toHaveBeenCalledWith('bueno');
  });
});
