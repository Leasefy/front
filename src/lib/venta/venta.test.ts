import { describe, expect, it } from 'vitest';

import { enlaceDeWhatsApp, mensajeParaVentas } from './whatsapp-de-leasefy';
import { abiertaParaElPropietarioGratis, claveDeDemoDelPropietario } from './propietario-gratis';
import { demoDeLaInmobiliaria } from './demos-del-panel';

describe('el WhatsApp de ventas (Nico, 20-10)', () => {
  it('va a +57 301 307 5347 con el mensaje ya escrito', () => {
    const url = enlaceDeWhatsApp({ quien: 'inmobiliaria', nombre: 'Camila', empresa: 'Los Almendros', queVio: 'la cobranza' });
    expect(url.startsWith('https://wa.me/573013075347?text=')).toBe(true);
    const texto = decodeURIComponent(url.split('text=')[1]!);
    expect(texto).toContain('Soy Camila, de Los Almendros');
    expect(texto).toContain('la cobranza');
    expect(texto).toContain('piloto automático');
  });

  it('al propietario le habla de administrarle el inmueble, y sin nombre no inventa uno', () => {
    const texto = mensajeParaVentas({ quien: 'propietario', nombre: null });
    expect(texto).toContain('administrarlo');
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('null');
  });
});

describe('el propietario en el plan gratis', () => {
  it('publicar, candidatos, visitas, mensajes y la ficha de su inmueble son gratis', () => {
    for (const r of ['/panel/propiedades', '/panel/propiedades/nueva', '/panel/candidatos', '/panel/visitas', '/panel/mensajes', '/panel/abc-123']) {
      expect(abiertaParaElPropietarioGratis(r)).toBe(true);
    }
  });

  it('el inicio, contratos, cobro y estudio van en demo', () => {
    for (const r of ['/panel', '/panel/contratos', '/panel/leases', '/panel/estado-de-cuenta', '/panel/escoger-inquilino', '/panel/upgrade']) {
      expect(abiertaParaElPropietarioGratis(r)).toBe(false);
    }
    expect(claveDeDemoDelPropietario('/panel/estado-de-cuenta')).toBe('cobro');
    expect(claveDeDemoDelPropietario('/panel/escoger-inquilino')).toBe('estudio');
    expect(claveDeDemoDelPropietario('/panel')).toBeNull();
  });
});

describe('las demos de la inmobiliaria', () => {
  it('cada parte tiene su demo, y lo que no tiene una propia usa la general', () => {
    expect(demoDeLaInmobiliaria('cobranza').titulo).toBe('Cobranza en piloto automático');
    expect(demoDeLaInmobiliaria('juridico').titulo).toBe('Cobranza en piloto automático');
    expect(demoDeLaInmobiliaria('nada-que-ver').capturas.length).toBeGreaterThan(0);
    expect(demoDeLaInmobiliaria(null).titulo).toBe('Tu inmobiliaria en piloto automático');
  });
});
