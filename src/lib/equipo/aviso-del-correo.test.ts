import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { avisoDelError, leerAvisoDelCorreo } from './aviso-del-correo';

describe('aviso-del-correo', () => {
  it('lee el aviso de otra persona y el de otra inmobiliaria', () => {
    expect(
      leerAvisoDelCorreo({
        code: 'CORREO_DE_OTRA_PERSONA',
        message: 'Este correo ya es la cuenta de X (inquilino).',
        nombreDeLaCuenta: 'X',
        relacion: 'inquilino',
      }),
    ).toEqual({
      code: 'CORREO_DE_OTRA_PERSONA',
      message: 'Este correo ya es la cuenta de X (inquilino).',
      nombreDeLaCuenta: 'X',
      relacion: 'inquilino',
      sePuedeInvitarIgual: true,
      sePuedeDarAlInvitado: false,
    });
    expect(
      leerAvisoDelCorreo({ code: 'ACTIVO_EN_OTRA_INMOBILIARIA', message: 'Ya está activo.', creoSuPropiaInmobiliaria: true }),
    ).toEqual({
      code: 'ACTIVO_EN_OTRA_INMOBILIARIA',
      message: 'Ya está activo.',
      creoSuPropiaInmobiliaria: true,
      sePuedeInvitarIgual: false,
    });
  });

  it('cualquier otra cosa no es un aviso', () => {
    expect(leerAvisoDelCorreo(null)).toBeNull();
    expect(leerAvisoDelCorreo({ code: 'YA_EXISTE', message: 'x' })).toBeNull();
    expect(leerAvisoDelCorreo({ code: 'CORREO_DE_OTRA_PERSONA', message: '' })).toBeNull();
    expect(leerAvisoDelCorreo({ code: 'CORREO_DE_OTRA_PERSONA', message: 'x', relacion: 'jefe' })).toMatchObject({
      relacion: null,
      nombreDeLaCuenta: null,
    });
  });

  it('sale de un 409 con ese código, no de otros errores', () => {
    const conAviso = new ApiError(409, 'Este correo ya tiene una cuenta…', 'CORREO_DE_OTRA_PERSONA', {
      code: 'CORREO_DE_OTRA_PERSONA',
      message: 'Este correo ya tiene una cuenta…',
      nombreDeLaCuenta: null,
      relacion: null,
    });
    expect(avisoDelError(conAviso)?.code).toBe('CORREO_DE_OTRA_PERSONA');
    expect(avisoDelError(new ApiError(409, 'Ya existe una invitación pendiente', 'CONFLICT'))).toBeNull();
    expect(avisoDelError(new ApiError(400, 'x', 'CORREO_DE_OTRA_PERSONA'))).toBeNull();
    expect(avisoDelError(new Error('red'))).toBeNull();
  });
});
