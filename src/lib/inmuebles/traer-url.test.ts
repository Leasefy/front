import { describe, it, expect } from 'vitest';
import { esDireccionPrivada } from './traer-url';
import { separarEnlaces } from './enlaces.service';

/**
 * La guardia contra SSRF: la URL la escribe el usuario y quien pide es nuestro
 * servidor. Estas reglas se prueban con una tabla y no con un servidor de
 * verdad, porque lo único que hay que verificar es la decisión.
 */
describe('esDireccionPrivada', () => {
  it.each([
    // El que más importa: el metadata de la nube. Devuelve credenciales.
    ['169.254.169.254', true],
    ['127.0.0.1', true],
    ['10.0.0.5', true],
    ['192.168.1.1', true],
    ['172.16.0.1', true],
    ['172.31.255.255', true],
    ['100.64.0.1', true], // CGNAT
    ['0.0.0.0', true],
    ['::1', true],
    ['fd00::1', true], // unique local
    ['fe80::1', true], // link-local
    ['::ffff:10.0.0.1', true], // IPv4 disfrazada de IPv6
  ])('bloquea %s', (ip, esperado) => {
    expect(esDireccionPrivada(ip)).toBe(esperado);
  });

  it.each([
    ['8.8.8.8', false],
    ['200.75.51.132', false], // un servidor colombiano cualquiera
    ['172.15.0.1', false], // justo fuera del bloque privado 172.16–172.31
    ['172.32.0.1', false],
    ['2606:4700:4700::1111', false],
  ])('deja pasar %s', (ip, esperado) => {
    expect(esDireccionPrivada(ip)).toBe(esperado);
  });
});

describe('separarEnlaces', () => {
  it('acepta uno por línea', () => {
    expect(separarEnlaces('https://a.com/1\nhttps://b.com/2')).toEqual([
      'https://a.com/1',
      'https://b.com/2',
    ]);
  });

  it('acepta separados por coma o espacios — la gente pega de donde sea', () => {
    expect(separarEnlaces('https://a.com/1, https://b.com/2')).toHaveLength(2);
  });

  it('completa el esquema cuando falta', () => {
    expect(separarEnlaces('www.fincaraiz.com.co/inmueble/1')).toEqual([
      'https://www.fincaraiz.com.co/inmueble/1',
    ]);
  });

  it('no repite el mismo enlace dos veces', () => {
    expect(separarEnlaces('https://a.com/1\nhttps://a.com/1')).toHaveLength(1);
  });

  it('descarta lo que no es un enlace', () => {
    expect(separarEnlaces('hola mundo\nhttps://a.com/1')).toEqual(['https://a.com/1']);
  });

  it('limpia la puntuación del final, que es como queda al pegar de un correo', () => {
    expect(separarEnlaces('Mirá https://a.com/1, y también https://b.com/2.')).toEqual([
      'https://a.com/1',
      'https://b.com/2',
    ]);
  });
});
