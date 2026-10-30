/**
 * La publicidad de la demo por perfil (Nico y Juan, 27-10-2026): el agente ve «administra tus propiedades tú solo»
 * y el propietario «quiero que Leasefy maneje mi inmueble».
 */
import { describe, expect, it } from 'vitest';
import { demoDelAgente, demoDelPropietario, demoDeLaInmobiliaria } from './demos-del-panel';

describe('demos por perfil', () => {
  it('el agente tiene su propia publicidad, distinta de la inmobiliaria', () => {
    expect(demoDelAgente(null).titulo).toBe('Administra tus propiedades tú solo, de forma fácil');
    expect(demoDelAgente('contratos').titulo).toBe('Administra tus propiedades tú solo');
    expect(demoDelAgente('facturacion').titulo).toBe(demoDelAgente('pagos').titulo);
    expect(demoDelAgente('contratos').titulo).not.toBe(demoDeLaInmobiliaria('contratos').titulo);
  });

  it('el agente ve VIDEO en las secciones que lo tienen, no la general con capturas (Nico 30-10)', () => {
    for (const clave of ['contratos', 'pagos', 'facturacion', 'propietarios', 'reportes', 'mantenimientos', 'documentos', 'contabilidad', 'servicios-publicos', 'solicitudes', 'proveedores']) {
      expect(demoDelAgente(clave).video, clave).toBeDefined();
    }
    // Sin texto propio del agente, la demo de la sección (no la general).
    expect(demoDelAgente('mantenimientos').titulo).toBe(demoDeLaInmobiliaria('mantenimientos').titulo);
    expect(demoDelAgente('reportes').titulo).not.toBe(demoDeLaInmobiliaria('reportes').titulo);
  });

  it('el propietario: «Quiero que Leasefy maneje mi inmueble»', () => {
    expect(demoDelPropietario(null).titulo).toBe('Quiero que Leasefy maneje mi inmueble');
  });
});
