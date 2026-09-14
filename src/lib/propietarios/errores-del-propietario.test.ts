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
  NO_PUDIMOS_GUARDAR,
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
    expect(r).toEqual({ campo: { field: 'documentNumber', message: DOCUMENTO_YA_CARGADO }, general: null });
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
    expect(r).toEqual({ campo: null, general: 'La ficha cambió mientras la editabas' });
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

  it('con dos campos, el primero va a su lugar y el segundo se nombra arriba', () => {
    const r = errorAlGuardarPropietario(
      new ApiError(400, ['email must be an email', 'documentNumber should not be empty']),
    );
    expect(r.campo?.field).toBe('email');
    expect(r.general).toBe('Revisa el número de documento');
  });

  it('nunca muestra el inglés del validador', () => {
    const r = errorAlGuardarPropietario(new ApiError(400, ['property foo should not exist']));
    expect(r.campo).toBeNull();
    expect(r.general).not.toMatch(/should|must|property/);
    expect(r.general).toContain('revisa el formulario');
  });

  it('un 400 de negocio que ya viene en castellano se muestra tal cual', () => {
    const r = errorAlGuardarPropietario(new ApiError(400, 'El NIT debe tener entre 6 y 10 dígitos'));
    expect(r).toEqual({ campo: null, general: 'El NIT debe tener entre 6 y 10 dígitos' });
  });
});

describe('errorAlGuardarPropietario — lo que sí se arregla reintentando', () => {
  it('un fallo de red no muestra el «Failed to fetch» del navegador', () => {
    expect(errorAlGuardarPropietario(new TypeError('Failed to fetch'))).toEqual({
      campo: null,
      general: NO_PUDIMOS_GUARDAR,
    });
  });

  it('un 500 tampoco muestra su volcado', () => {
    expect(errorAlGuardarPropietario(new ApiError(500, 'Error interno del servidor.')).general).toBe(
      NO_PUDIMOS_GUARDAR,
    );
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

  it('403 → permiso; red o 500 → reintentar', () => {
    expect(motivoAlEliminarPropietario(new ApiError(403, 'Forbidden resource'))).toBe(SIN_PERMISO_PARA_ELIMINAR);
    expect(motivoAlEliminarPropietario(new TypeError('Failed to fetch'))).toBe(NO_PUDIMOS_ELIMINAR);
    expect(motivoAlEliminarPropietario(new ApiError(502, 'Bad Gateway'))).toBe(NO_PUDIMOS_ELIMINAR);
  });
});
