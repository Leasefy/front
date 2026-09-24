import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { avisoDeVigencia, textoDelBloqueo } from '@/lib/inventario/aviso-de-vigencia';
import {
  bloqueoDeLaConsulta,
  bloqueoDelError,
  diaLegible,
  enlaceAlInventario,
  instanteLegible,
  numeroDelContrato,
} from '@/lib/inventario/bloqueo-por-inventario';
import type { VigenciaDelInventario } from '@/lib/types/inventario-del-inmueble';

const tras = { contratoId: 'c9', code: 12, externalId: null, terminoEl: '2026-08-31' };

describe('bloqueo por inventario', () => {
  it('lee el 409 del back con la consignación para el enlace', () => {
    const err = new ApiError(409, 'El inventario…', 'INVENTARIO_NO_VIGENTE', {
      motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO',
      consignacionId: 'cons-1',
      porActualizarTras: tras,
    });
    expect(bloqueoDelError(err)).toEqual({
      motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO',
      consignacionId: 'cons-1',
      porActualizarTras: tras,
    });
  });

  it('cualquier otro error no es un bloqueo por inventario', () => {
    expect(bloqueoDelError(new ApiError(409, 'Inmueble ocupado', 'INMUEBLE_OCUPADO'))).toBeNull();
    expect(bloqueoDelError(new Error('x'))).toBeNull();
  });

  it('la consulta previa sólo bloquea si se exige y no está vigente', () => {
    const vigencia: VigenciaDelInventario = {
      vigente: false, motivo: 'SOLO_BORRADOR', inventarioVigenteId: null,
      ultimoCompleto: null, hayBorrador: true, porActualizarTras: null,
    };
    expect(bloqueoDeLaConsulta({ exigible: true, motivoNoExigible: null, consignacionId: 'c', vigencia }))
      .toMatchObject({ motivo: 'SOLO_BORRADOR', consignacionId: 'c' });
    expect(bloqueoDeLaConsulta({ exigible: false, motivoNoExigible: 'MIGRACION_PENDIENTE', consignacionId: null, vigencia: null }))
      .toBeNull();
    expect(bloqueoDeLaConsulta({
      exigible: true, motivoNoExigible: null, consignacionId: 'c',
      vigencia: { ...vigencia, vigente: true, motivo: null },
    })).toBeNull();
  });

  it('el enlace va a la sección del inventario de la ficha', () => {
    expect(enlaceAlInventario('cons-1')).toBe('/panel/inmobiliaria/inmuebles/cons-1#inventario');
  });

  it('nombra el contrato por su número del sistema viejo si lo tiene', () => {
    expect(numeroDelContrato({ code: 12, externalId: 'A-77' })).toBe('A-77');
    expect(numeroDelContrato({ code: 12, externalId: null })).toBe('#12');
  });

  it('las fechas se leen en Colombia', () => {
    expect(diaLegible('2026-08-31')).toBe('31 de agosto de 2026');
    // 8 p. m. del 31 en Bogotá es el 1.º de septiembre en UTC.
    expect(instanteLegible('2026-09-01T01:00:00Z')).toBe('31 de agosto de 2026');
    expect(instanteLegible(null)).toBe('');
  });
});

describe('aviso de vigencia en la ficha', () => {
  const base: VigenciaDelInventario = {
    vigente: false, motivo: 'SIN_INVENTARIO', inventarioVigenteId: null,
    ultimoCompleto: null, hayBorrador: false, porActualizarTras: null,
  };

  it('por actualizar tras un contrato gana sobre todo lo demás', () => {
    const a = avisoDeVigencia({ ...base, motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO', porActualizarTras: tras });
    expect(a).toMatchObject({
      severidad: 'warning',
      titulo: { clave: 'inmobiliaria.inventarioDelInmueble.porActualizarTitulo', params: { numero: '#12' } },
      texto: { params: { fecha: '31 de agosto de 2026' } },
    });
  });

  it('vigente dice la versión y el día', () => {
    const a = avisoDeVigencia({
      ...base, vigente: true, motivo: null, inventarioVigenteId: 'v3',
      ultimoCompleto: { id: 'v3', version: 3, completadoEl: '2026-09-02' },
    });
    expect(a).toMatchObject({ severidad: 'success', titulo: { params: { version: 3, fecha: '2 de septiembre de 2026' } } });
  });

  it('borrador y sin inventario tienen su propio texto', () => {
    expect(avisoDeVigencia({ ...base, motivo: 'SOLO_BORRADOR' })?.titulo.clave).toMatch(/soloBorrador$/);
    expect(avisoDeVigencia(base)?.titulo.clave).toMatch(/sinInventario$/);
    expect(avisoDeVigencia(null)).toBeNull();
  });

  it('el texto del bloqueo nombra el contrato y la fecha', () => {
    expect(textoDelBloqueo({ motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO', consignacionId: 'c', porActualizarTras: tras }))
      .toEqual({ clave: 'inmobiliaria.inventarioDelInmueble.bloqueoAnterior', params: { numero: '#12', fecha: '31 de agosto de 2026' } });
    expect(textoDelBloqueo({ motivo: 'SIN_INVENTARIO', consignacionId: null, porActualizarTras: null }).clave)
      .toMatch(/bloqueoSinInventario$/);
  });
});
