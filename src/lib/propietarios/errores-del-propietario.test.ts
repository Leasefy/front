/**
 * errores-del-propietario.test.ts — el motivo del back, dicho donde sirve.
 *
 * La lista de Propietarios decía «Intenta de nuevo» sobre un 409 que explica
 * («tiene 7 inmuebles consignados», «ya existe ese documento») y sobre un 400
 * que nombra el campo. Reintentar no arregla ninguno de los dos.
 */
import { describe, it, expect } from 'vitest';

import { ApiError } from '@/lib/api/client';
import {
  CORREO_YA_CARGADO,
  DOCUMENTO_YA_CARGADO,
  NO_PUDIMOS_ELIMINAR,
  SIN_PERMISO_PARA_ELIMINAR,
  SIN_PERMISO_PARA_GUARDAR,
  errorAlGuardarPropietario,
  motivoAlEliminarPropietario,
} from './errores-del-propietario';

describe('errorAlGuardarPropietario — 409 de duplicado', () => {
  it('el documento repetido va AL LADO del documento, no en un toast', () => {
    const r = errorAlGuardarPropietario(
      new ApiError(409, 'Ya existe un propietario con el documento 1020304050 en esta agencia'),
    );
    expect(r).toEqual({
      campo: { field: 'documentNumber', message: DOCUMENTO_YA_CARGADO },
      porCampo: { documentNumber: DOCUMENTO_YA_CARGADO },
      general: null,
    });
  });

  it('el P2002 que traduce el filtro global también es el documento', () => {
    const r = errorAlGuardarPropietario(new ApiError(409, 'Ya existe un registro con esos datos.', 'P2002'));
    expect(r.campo).toEqual({ field: 'documentNumber', message: DOCUMENTO_YA_CARGADO });
  });

  it('si lo repetido es el correo, lo dice en el correo', () => {
    const r = errorAlGuardarPropietario(
      new ApiError(409, 'Ya existe un registro con esos datos.', 'P2002', { target: ['agency_id', 'email'] }),
    );
    expect(r.campo).toEqual({ field: 'email', message: CORREO_YA_CARGADO });
  });

  it('un 409 que no es duplicado se muestra con su propio motivo', () => {
    const r = errorAlGuardarPropietario(new ApiError(409, 'La ficha cambió mientras la editabas'));
    expect(r).toEqual({ campo: null, porCampo: {}, general: 'La ficha cambió mientras la editabas' });
  });
});

describe('errorAlGuardarPropietario — 400 del ValidationPipe', () => {
  it('pone el campo en castellano, con el nombre del FORMULARIO y no el del DTO', () => {
    const r = errorAlGuardarPropietario(new ApiError(400, ['bankAccountNumber must be a string']));
    expect(r.campo).toEqual({ field: 'accountNumber', message: 'Revisa el número de cuenta' });
    expect(r.general).toBeNull();
  });

  it('un correo inválido va al correo', () => {
    const r = errorAlGuardarPropietario(new ApiError(400, ['email must be an email']));
    expect(r.campo).toEqual({ field: 'email', message: 'Ese correo no es válido' });
  });

  it('con dos campos, cada uno va a SU lugar y el primero recibe el foco', () => {
    const r = errorAlGuardarPropietario(
      new ApiError(400, ['email must be an email', 'documentNumber should not be empty']),
    );
    expect(r.campo?.field).toBe('email');
    expect(r.porCampo).toEqual({
      email: 'Ese correo no es válido',
      documentNumber: 'Revisa el número de documento',
    });
    expect(r.general).toBeNull();
  });

  it('nunca muestra el inglés del validador', () => {
    const r = errorAlGuardarPropietario(new ApiError(400, ['property foo should not exist']));
    expect(r.campo).toBeNull();
    expect(r.general).not.toMatch(/should|must|property/);
    expect(r.general).toContain('revisa el formulario');
  });

  it('un 400 de negocio que ya viene en castellano se muestra tal cual', () => {
    const r = errorAlGuardarPropietario(new ApiError(400, 'El NIT debe tener entre 6 y 10 dígitos'));
    expect(r).toEqual({ campo: null, porCampo: {}, general: 'El NIT debe tener entre 6 y 10 dígitos' });
  });
});

/**
 * 02-10-2026 — el contrato de errores: el back manda `campos[]` con la ruta
 * del DTO y una frase en español. Cada uno va a SU campo del formulario.
 */
describe('errorAlGuardarPropietario — 400 con `campos` (contrato de errores)', () => {
  it('cada campo del DTO va al del FORMULARIO, con la frase del back', () => {
    const r = errorAlGuardarPropietario(
      new ApiError(400, ['Revisa el correo.', 'Revisa la cuenta.'], 'DATOS_INVALIDOS', {
        code: 'DATOS_INVALIDOS',
        campos: [
          { campo: 'email', regla: 'formato', mensaje: 'Revisa el correo.' },
          { campo: 'bankAccountNumber', regla: 'formato', mensaje: 'Revisa la cuenta.' },
        ],
      }),
    );
    expect(r.campo).toEqual({ field: 'email', message: 'Revisa el correo.' });
    expect(r.porCampo).toEqual({ email: 'Revisa el correo.', accountNumber: 'Revisa la cuenta.' });
    expect(r.general).toBeNull();
  });

  it('lo que el formulario no muestra (las etiquetas) va arriba, con su frase', () => {
    const tope = 'Un propietario puede tener hasta 50 etiquetas.';
    const r = errorAlGuardarPropietario(
      new ApiError(400, [tope], 'DATOS_INVALIDOS', {
        campos: [{ campo: 'tags', regla: 'lista_maxima', mensaje: tope }],
      }),
    );
    expect(r).toEqual({ campo: null, porCampo: {}, general: tope });
  });
});

describe('errorAlGuardarPropietario — la regla de oro', () => {
  it('sin respuesta (la red) habla de la conexión, sin el «Failed to fetch» del navegador', () => {
    const r = errorAlGuardarPropietario(new TypeError('Failed to fetch'));
    expect(r.campo).toBeNull();
    expect(r.general).toMatch(/conexión/);
    expect(r.general).not.toMatch(/fetch/i);
  });

  it('un ApiError(0) del cliente también es la conexión', () => {
    expect(errorAlGuardarPropietario(new ApiError(0, 'No pudimos conectar')).general).toMatch(/conexión/);
  });

  it('un 5xx dice «de nuestro lado» con la referencia, sin volcado y sin culpar a la conexión', () => {
    const r = errorAlGuardarPropietario(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    );
    expect(r.general).toMatch(/^No pudimos guardar el propietario: algo falló de nuestro lado/);
    expect(r.general).toContain('ab12cd34');
    expect(r.general).not.toMatch(/conexi[oó]n|Error interno/);
  });

  it('un 403 dice que falta el permiso, no que se reintente', () => {
    expect(errorAlGuardarPropietario(new ApiError(403, 'Forbidden resource')).general).toBe(
      SIN_PERMISO_PARA_GUARDAR,
    );
  });
});

describe('motivoAlEliminarPropietario', () => {
  it('el 409 que explica se muestra tal cual', () => {
    const motivo = 'No se puede eliminar: tiene 7 inmueble(s) consignado(s).';
    expect(motivoAlEliminarPropietario(new ApiError(409, motivo))).toBe(motivo);
  });

  it('403 → permiso; la red → conexión; un 5xx → de nuestro lado con la referencia', () => {
    expect(motivoAlEliminarPropietario(new ApiError(403, 'Forbidden resource'))).toBe(SIN_PERMISO_PARA_ELIMINAR);
    expect(motivoAlEliminarPropietario(new TypeError('Failed to fetch'))).toMatch(/conexión/);
    const quinientos = motivoAlEliminarPropietario(
      new ApiError(500, 'Internal server error', 'ERROR_INTERNO', { referencia: 'ff00aa11' }),
    );
    expect(quinientos).toMatch(/^No pudimos eliminar el propietario: algo falló de nuestro lado/);
    expect(quinientos).toContain('ff00aa11');
  });

  it('un 409 en inglés o con un volcado no llega a la pantalla', () => {
    expect(motivoAlEliminarPropietario(new ApiError(409, 'at foo (/app/x.js:10:5)'))).toBe(NO_PUDIMOS_ELIMINAR);
  });
});
