/**
 * Una contraseña en la URL se borra sin usarse.
 *
 * El caso (prueba en vivo, 2026-09-16): un clic en «Iniciar sesión» antes de
 * hidratar dejaba `/auth?email=…&password=…` en la barra. Los formularios ya no
 * lo hacen; esto limpia las URL que ya quedaron en el historial.
 */

import { describe, it, expect, afterEach } from 'vitest';

import { limpiarCredencialesDeLaUrl, urlSinCredenciales } from './credenciales-en-la-url';

describe('urlSinCredenciales', () => {
  it('🔴 saca la contraseña y el correo que el envío nativo pegó a su lado', () => {
    expect(urlSinCredenciales('http://localhost:3011/auth?email=nico%40gmail.com&password=Secreta.123')).toBe('/auth');
  });

  it('también la confirmación del registro, y el nombre del registro por invitación', () => {
    expect(
      urlSinCredenciales('/auth?email=a%40b.co&password=x1&confirmPassword=x1'),
    ).toBe('/auth');
    expect(
      urlSinCredenciales('/registro?firstName=Ana&lastName=Paz&email=a%40b.co&password=x1'),
    ).toBe('/registro');
  });

  it('conserva lo que la pantalla necesita: returnUrl, token de invitación, modo y el hash', () => {
    expect(
      urlSinCredenciales('/auth?returnUrl=%2Finvitacion%2Fabc&mode=register&password=x#arriba'),
    ).toBe('/auth?returnUrl=%2Finvitacion%2Fabc&mode=register#arriba');
    expect(urlSinCredenciales('/registro?invitationToken=tok&password=x')).toBe('/registro?invitationToken=tok');
  });

  it('reconoce la contraseña se llame como se llame el campo', () => {
    expect(urlSinCredenciales('/x?newPassword=1')).toBe('/x');
    expect(urlSinCredenciales('/x?contrasena=1')).toBe('/x');
    expect(urlSinCredenciales('/x?PASSWORD=1')).toBe('/x');
  });

  it('sin contraseña no cambia nada: un correo solo, o un aviso de cierre, no es una credencial', () => {
    expect(urlSinCredenciales('/auth')).toBeNull();
    expect(urlSinCredenciales('/auth?reason=expirada')).toBeNull();
    expect(urlSinCredenciales('/aplicar/123?email=a%40b.co')).toBeNull();
  });

  it('una contraseña vacía también se va: el parámetro solo ya delata el formulario', () => {
    expect(urlSinCredenciales('/auth?email=a%40b.co&password=')).toBe('/auth');
  });
});

describe('limpiarCredencialesDeLaUrl', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('🔴 reemplaza la entrada del historial —no agrega una— sin la contraseña', () => {
    window.history.replaceState(null, '', '/auth?email=nico%40gmail.com&password=Secreta.123&returnUrl=%2Fpanel');
    const largo = window.history.length;

    expect(limpiarCredencialesDeLaUrl()).toBe(true);

    expect(window.location.pathname).toBe('/auth');
    expect(window.location.search).toBe('?returnUrl=%2Fpanel');
    expect(window.location.href).not.toContain('Secreta');
    expect(window.location.href).not.toContain('nico');
    expect(window.history.length).toBe(largo);
  });

  it('sin nada que limpiar no toca el historial', () => {
    window.history.replaceState({ marca: 1 }, '', '/auth?returnUrl=%2Fpanel');

    expect(limpiarCredencialesDeLaUrl()).toBe(false);

    expect(window.location.search).toBe('?returnUrl=%2Fpanel');
    expect(window.history.state).toEqual({ marca: 1 });
  });
});
