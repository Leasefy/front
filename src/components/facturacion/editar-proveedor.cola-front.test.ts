/**
 * COLA-FRONT (04-10-2026), QA-FACT FA-24: editar un proveedor del documento
 * soporte manda SÓLO lo que cambió (el back rechaza un PATCH vacío) y `null`
 * para lo que se borró («no lo sabemos» no es «no»).
 */
import { describe, expect, it } from 'vitest';

import { cambiosDelProveedor, proveedorEnElFormulario } from './DocumentoSoporte';

const proveedor = {
  id: 'p1',
  nombre: 'Plomería Martínez',
  tipoDocumento: 'CC',
  documento: '71234567',
  email: null,
  telefono: null,
  direccion: null,
  ciudad: null,
  responsableIva: null,
  regimenSimple: null,
  retefuentePct: null,
  activo: true,
  faltaPerfilTributario: true,
};

describe('cambiosDelProveedor', () => {
  it('🔴 completar el perfil tributario manda sólo eso', () => {
    const antes = proveedorEnElFormulario(proveedor);
    expect(antes.responsableIva).toBe('NO_SE');
    const ahora = { ...antes, responsableIva: 'NO' as const, retefuentePct: '4' };
    expect(cambiosDelProveedor(antes, ahora)).toEqual({ responsableIva: false, retefuentePct: 4 });
  });

  it('sin cambios, nada', () => {
    const antes = proveedorEnElFormulario(proveedor);
    expect(cambiosDelProveedor(antes, { ...antes })).toEqual({});
  });

  it('lo que se borra viaja en null', () => {
    const antes = proveedorEnElFormulario({ ...proveedor, retefuentePct: 4, responsableIva: true });
    const ahora = { ...antes, retefuentePct: '', responsableIva: 'NO_SE' as const, documento: '' };
    expect(cambiosDelProveedor(antes, ahora)).toEqual({
      retefuentePct: null,
      responsableIva: null,
      documento: null,
      tipoDocumento: null,
    });
  });
});
