import { describe, expect, it } from 'vitest';
import { enlaceDeLaInvitacion } from './enlace-de-la-invitacion';
import { estadoDeLaInvitacion, estadoDelCorreo, queDecirDelCorreo } from './estado-de-la-invitacion';
import { ROLES_PARA_INVITAR, cuentaParaElTope } from './roles-para-invitar';

describe('enlaceDeLaInvitacion', () => {
  const PANEL = 'https://app.leasefy.co';

  it('usa el enlace del back tal cual: es el mismo del correo', () => {
    expect(
      enlaceDeLaInvitacion({ invitationLink: `${PANEL}/registro?invitationToken=abc`, invitationToken: 'abc' }, PANEL),
    ).toBe(`${PANEL}/registro?invitationToken=abc`);
  });

  it('sin enlace, lo arma con el token y la MISMA ruta del correo', () => {
    expect(enlaceDeLaInvitacion({ invitationToken: 'abc' }, PANEL)).toBe(`${PANEL}/registro?invitationToken=abc`);
  });

  it('un enlace del back a localhost (sin FRONTEND_URL) se corrige a la dirección del panel', () => {
    expect(
      enlaceDeLaInvitacion({ invitationLink: 'http://localhost:3001/registro?invitationToken=abc' }, PANEL),
    ).toBe(`${PANEL}/registro?invitationToken=abc`);
  });

  it('en local, el enlace a localhost se respeta', () => {
    expect(
      enlaceDeLaInvitacion(
        { invitationLink: 'http://localhost:3001/registro?invitationToken=abc' },
        'http://localhost:3001',
      ),
    ).toBe('http://localhost:3001/registro?invitationToken=abc');
  });

  it('algo que no es un enlace http no se muestra; sin token, no hay enlace', () => {
    expect(enlaceDeLaInvitacion({ invitationLink: 'javascript:alert(1)' }, PANEL)).toBeNull();
    expect(enlaceDeLaInvitacion({}, PANEL)).toBeNull();
  });
});

describe('estado de la invitación', () => {
  const ahora = new Date('2026-10-02T12:00:00.000Z');

  it('un back viejo sin emailStatus: emailDelivered decide', () => {
    expect(estadoDelCorreo({ emailDelivered: true })).toBe('sent');
    expect(estadoDelCorreo({ emailDelivered: false })).toBe('failed');
    expect(estadoDelCorreo({ emailDelivered: false, emailStatus: 'suppressed' })).toBe('suppressed');
  });

  it('vencida gana a todo: hay que reenviarla', () => {
    expect(
      estadoDeLaInvitacion({ correo: 'sent', venceEl: '2026-10-01T00:00:00.000Z', ahora }),
    ).toEqual({ texto: 'Invitación vencida: reenvíala para darle un enlace nuevo', tono: 'peligro' });
  });

  it('sin saber del correo (una invitación de otra visita): pendiente y cuándo vence', () => {
    const e = estadoDeLaInvitacion({ venceEl: '2026-10-09T15:00:00.000Z', ahora });
    expect(e.tono).toBe('pendiente');
    expect(e.texto).toMatch(/^Invitación pendiente · vence el 9 de octubre$/);
    expect(estadoDeLaInvitacion({ ahora }).texto).toBe('Invitación pendiente');
  });

  it('cada estado del correo dice algo distinto, nunca sólo con color', () => {
    const textos = (['sent', 'suppressed', 'not_configured', 'failed'] as const).map(
      (c) => estadoDeLaInvitacion({ correo: c, ahora }).texto,
    );
    expect(new Set(textos).size).toBe(4);
    expect(queDecirDelCorreo('failed', 'a@b.co').texto).toContain('pásale tú el enlace');
    expect(queDecirDelCorreo('sent', 'a@b.co').texto).toBe('Le enviamos la invitación a a@b.co.');
  });
});

describe('roles para invitar', () => {
  it('son los siete del back y cada uno explica qué puede hacer', () => {
    expect(ROLES_PARA_INVITAR.map((r) => r.rol)).toEqual([
      'admin',
      'coordinador',
      'agente',
      'auxiliar_cartera',
      'contador',
      'abogado_externo',
      'viewer',
    ]);
    for (const r of ROLES_PARA_INVITAR) expect(r.queHace.length).toBeGreaterThan(10);
  });

  it('sólo el asesor comercial cuenta para el tope del plan', () => {
    expect(ROLES_PARA_INVITAR.filter((r) => cuentaParaElTope(r.rol)).map((r) => r.rol)).toEqual(['agente']);
  });
});
