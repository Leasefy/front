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

  it('el propietario: «Quiero que Leasefy maneje mi inmueble»', () => {
    expect(demoDelPropietario(null).titulo).toBe('Quiero que Leasefy maneje mi inmueble');
  });
});
