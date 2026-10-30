/**
 * Codeudores y documentos adicionales al crear el contrato (Nico, 29-10-2026),
 * con lo que se vio en la revisión con datos de Portofino: cada campo dice qué
 * le falta con los topes del back y un archivo que el back no recibe se dice
 * al elegirlo (antes fallaba después de crear el contrato).
 */
import { describe, expect, it } from 'vitest';
import {
  CODEUDOR_VACIO,
  archivosQueNoCaben,
  codeudorCompleto,
  codeudorVacio,
  erroresDelCodeudor,
} from './AlCrearElContrato';

const completo = {
  ...CODEUDOR_VACIO,
  nombre: 'Codeudor de Prueba',
  documento: '71999001',
  email: 'codeudor@ejemplo.co',
  celular: '300 123 4567',
};

describe('el codeudor al crear el contrato', () => {
  it('vacío no cuenta; completo deja crear', () => {
    expect(codeudorVacio(CODEUDOR_VACIO)).toBe(true);
    expect(codeudorCompleto(completo)).toBe(true);
    expect(erroresDelCodeudor(completo)).toEqual({});
  });

  it('a medias dice qué le falta a cada campo, con el tope del back', () => {
    const errores = erroresDelCodeudor({ ...CODEUDOR_VACIO, nombre: 'Ana' });
    expect(Object.keys(errores).sort()).toEqual(['celular', 'documento', 'email']);
    expect(erroresDelCodeudor({ ...completo, documento: '71.999.001' }).documento).toContain('sin puntos');
    expect(erroresDelCodeudor({ ...completo, documento: 'ab' }).documento).toContain('Entre 3 y 20');
    expect(erroresDelCodeudor({ ...completo, email: 'codeudor@' }).email).toContain('Revisa el correo');
    expect(erroresDelCodeudor({ ...completo, celular: '300 123' }).celular).toContain('10 números');
  });
});

describe('los documentos adicionales', () => {
  const archivo = (name: string, type: string, size: number) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('PDF e imágenes de hasta 10 MB entran', () => {
    expect(archivosQueNoCaben([archivo('cedula.pdf', 'application/pdf', 1024), archivo('foto.jpg', 'image/jpeg', 2048)])).toBeNull();
  });

  it('lo que el back no recibe se dice con su nombre, antes de crear', () => {
    expect(archivosQueNoCaben([archivo('planilla.xlsx', 'application/vnd.ms-excel', 1024)])).toBe(
      'No se agregó «planilla.xlsx»: sólo PDF, JPG, PNG o WebP de hasta 10 MB.',
    );
    expect(
      archivosQueNoCaben([archivo('grande.pdf', 'application/pdf', 11 * 1024 * 1024), archivo('foto.gif', 'image/gif', 10)]),
    ).toBe('No se agregaron «grande.pdf», «foto.gif»: sólo PDF, JPG, PNG o WebP de hasta 10 MB.');
  });
});
