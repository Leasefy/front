/**
 * COLA-FRONT (04-10-2026): el 400 `FALTA_CORREO_DEL_INQUILINO` del borrador
 * manual va al campo del correo del formulario (`inquilino.correo` → `correo`).
 */
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { repartirErroresDelContrato } from './errores-del-contrato';

describe('FALTA_CORREO_DEL_INQUILINO', () => {
  it('va al campo del correo, con su frase', () => {
    const cuerpo = {
      statusCode: 400,
      code: 'FALTA_CORREO_DEL_INQUILINO',
      message:
        'Ese documento no es de ningún inquilino de la inmobiliaria: escribe su correo, que es a donde le llegará la invitación al portal.',
      campos: [{ campo: 'inquilino.correo', regla: 'requerido', mensaje: 'Falta el correo del inquilino.' }],
    };
    const e = new ApiError(400, cuerpo.message, cuerpo.code, cuerpo);
    const r = repartirErroresDelContrato(e, { porDefecto: 'No se pudo crear el contrato.', accion: 'crear el contrato' });
    expect(r.porCampo.correo).toBe('Falta el correo del inquilino.');
    expect(r.orden[0]).toBe('correo');
    expect(r.sueltos).toEqual([]);
  });
});
