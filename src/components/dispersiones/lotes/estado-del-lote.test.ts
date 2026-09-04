/**
 * Las reglas de pantalla del lote, calcadas del servicio del back.
 *
 * Un botón que aparece en un estado en que el back lo rechaza es un botón que
 * siempre falla; uno que NO aparece cuando el back lo aceptaría es una acción
 * que nadie puede hacer. Estos tests fijan la tabla contra los `if` del back.
 */

import { describe, it, expect } from 'vitest';
import {
  accionesPara,
  CAMINO_DEL_LOTE,
  codigoValido,
  esSinVerificar,
  FORMATOS,
  motivoValido,
  pasoAlcanzado,
  PERMISO_DE_LA_ACCION,
} from './estado-del-lote';

describe('accionesPara', () => {
  it('BORRADOR: pedir aprobación o anular — nada más', () => {
    expect(accionesPara('BORRADOR')).toEqual(['pedirAprobacion', 'anular']);
  });

  it('ESPERANDO_APROBACION: aprobar, reemitir el código, anular', () => {
    expect(accionesPara('ESPERANDO_APROBACION')).toEqual(['aprobar', 'reenviarCodigo', 'anular']);
  });

  it('APROBADO: generar el archivo (el back sólo lo saca de un lote aprobado)', () => {
    expect(accionesPara('APROBADO')).toEqual(['generarArchivo', 'anular']);
  });

  it('ARCHIVO_GENERADO: descargar, marcar pagado, anular', () => {
    expect(accionesPara('ARCHIVO_GENERADO')).toEqual(['descargarArchivo', 'marcarPagado', 'anular']);
  });

  it('🔴 PAGADO y ANULADO no ofrecen nada: la plata salió / el lote murió', () => {
    expect(accionesPara('PAGADO')).toEqual([]);
    expect(accionesPara('ANULADO')).toEqual([]);
  });

  it('cada acción tiene el permiso del @RequirePermission del back', () => {
    expect(PERMISO_DE_LA_ACCION.generarArchivo).toBe('export');
    expect(PERMISO_DE_LA_ACCION.descargarArchivo).toBe('export');
    expect(PERMISO_DE_LA_ACCION.aprobar).toBe('edit');
    expect(PERMISO_DE_LA_ACCION.anular).toBe('edit');
  });
});

describe('pasoAlcanzado', () => {
  const base = { aprobadoAt: null, archivoGeneradoAt: null, pagadoAt: null };

  it('en el camino feliz es el índice del estado', () => {
    CAMINO_DEL_LOTE.forEach((estado, i) => {
      expect(pasoAlcanzado({ ...base, estado })).toBe(i);
    });
  });

  it('un lote anulado se ubica por las fechas que quedaron escritas', () => {
    expect(pasoAlcanzado({ ...base, estado: 'ANULADO' })).toBe(0);
    expect(pasoAlcanzado({ ...base, estado: 'ANULADO', aprobadoAt: '2026-09-01' })).toBe(2);
    expect(
      pasoAlcanzado({ ...base, estado: 'ANULADO', aprobadoAt: '2026-09-01', archivoGeneradoAt: '2026-09-01' }),
    ).toBe(3);
  });
});

describe('esSinVerificar', () => {
  it('lee el sello del nombre del archivo, que es el que viaja al escritorio', () => {
    expect(esSinVerificar('lote-2026-08-bancolombia_pab-SIN-VERIFICAR-6b0f2e2c.txt')).toBe(true);
    expect(esSinVerificar('lote-2026-08-bancolombia_pab-6b0f2e2c.txt')).toBe(false);
  });
});

describe('FORMATOS', () => {
  it('sólo Bancolombia PAB se puede generar hoy; los otros dicen por qué no', () => {
    const disponibles = FORMATOS.filter((f) => f.disponible).map((f) => f.codigo);
    expect(disponibles).toEqual(['BANCOLOMBIA_PAB']);
    for (const f of FORMATOS.filter((f) => !f.disponible)) {
      expect(f.porQueNo).toMatch(/archivo de ejemplo/);
    }
  });
});

describe('validaciones del DTO', () => {
  it('el código son exactamente 6 dígitos', () => {
    expect(codigoValido('048213')).toBe(true);
    expect(codigoValido(' 048213 ')).toBe(true);
    expect(codigoValido('04821')).toBe(false);
    expect(codigoValido('04821a')).toBe(false);
  });

  it('el motivo de anulación va de 5 a 300 caracteres', () => {
    expect(motivoValido('corto')).toBe(true);
    expect(motivoValido('cort')).toBe(false);
    expect(motivoValido('x'.repeat(301))).toBe(false);
  });
});
