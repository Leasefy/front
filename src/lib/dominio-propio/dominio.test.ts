import { describe, expect, it } from 'vitest';

import { destinoEnElDominioPropio, enlaceDeLaFichaEn, esHostDeLeasefy, normalizarDominio, problemaDelDominio } from './dominio';

describe('el dominio propio de la inmobiliaria (Nico, 31-10-2026)', () => {
  it('lo deja como host: sin protocolo, ruta, puerto ni mayúsculas', () => {
    expect(normalizarDominio('  https://WWW.Loza.com.co/inmuebles?x=1 ')).toBe('www.loza.com.co');
    expect(normalizarDominio('inmuebles.loza.co:443')).toBe('inmuebles.loza.co');
    expect(normalizarDominio('loza.co.')).toBe('loza.co');
  });

  it('dice qué tiene mal en una frase', () => {
    expect(problemaDelDominio('inmuebles.loza.com.co')).toBeNull();
    expect(problemaDelDominio('loza.co')).toBeNull();
    expect(problemaDelDominio('')).toContain('Escribe tu dominio');
    expect(problemaDelDominio('mi inmobiliaria')).toContain('no parece un dominio');
    expect(problemaDelDominio('inmobiliariaañez.com')).toContain('no parece un dominio');
    expect(problemaDelDominio('-loza.co')).toContain('no parece un dominio');
    expect(problemaDelDominio('loza')).toContain('no parece un dominio');
    expect(problemaDelDominio('192.168.0.1')).not.toBeNull();
    expect(problemaDelDominio('loza.leasefy.co')).toContain('es de Leasefy');
    expect(problemaDelDominio('leasefy.co')).toContain('es de Leasefy');
  });

  it('reconoce los hosts de Leasefy y de las pruebas', () => {
    for (const h of ['leasefy.co', 'www.leasefy.co', 'front-git-rama.vercel.app', 'localhost', '127.0.0.1', '']) {
      expect(esHostDeLeasefy(h)).toBe(true);
    }
    expect(esHostDeLeasefy('inmuebles.loza.co')).toBe(false);
  });

  it('en su dominio: el inicio es su página, las fichas pasan y lo demás va a leasefy.co', () => {
    expect(destinoEnElDominioPropio('/', 'inmobiliaria-loza')).toEqual({ tipo: 'reescribir', ruta: '/i/inmobiliaria-loza' });
    expect(destinoEnElDominioPropio('/es', 'inmobiliaria-loza')).toEqual({ tipo: 'reescribir', ruta: '/i/inmobiliaria-loza' });
    expect(destinoEnElDominioPropio('/propiedades/abc', 'x')).toEqual({ tipo: 'reescribir', ruta: '/propiedades/abc' });
    expect(destinoEnElDominioPropio('/es/propiedades/abc', 'x')).toEqual({ tipo: 'reescribir', ruta: '/propiedades/abc' });
    expect(destinoEnElDominioPropio('/_next/static/chunk.js', 'x')).toEqual({ tipo: 'seguir' });
    expect(destinoEnElDominioPropio('/imagenes/banco/sala.webp', 'x')).toEqual({ tipo: 'seguir' });
    expect(destinoEnElDominioPropio('/panel/inmobiliaria', 'x')).toEqual({ tipo: 'a-leasefy', ruta: '/panel/inmobiliaria' });
    expect(destinoEnElDominioPropio('/auth/login', 'x')).toEqual({ tipo: 'a-leasefy', ruta: '/auth/login' });
  });

  it('la ficha se comparte con el dominio de la inmobiliaria cuando lo tiene activo', () => {
    expect(enlaceDeLaFichaEn('https://leasefy.co', 'p-1', 'inmuebles.loza.co')).toBe('https://inmuebles.loza.co/propiedades/p-1');
    expect(enlaceDeLaFichaEn('https://leasefy.co/', 'p-1', null)).toBe('https://leasefy.co/propiedades/p-1');
  });
});
