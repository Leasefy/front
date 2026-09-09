import { describe, it, expect } from 'vitest';
import {
  canalDeEnvio,
  enlaceDeWhatsapp,
  etiquetaDeActividad,
  fechaCorta,
  fechaLarga,
  formatearPct,
  ipcSugerido,
  mensajeSugerido,
  nuevoVencimiento,
  pasoDelEstado,
  renovacionAceptada,
  textoDeActividad,
  topeConIpc,
  variacionDelCanon,
} from './reglas';

describe('pasoDelEstado', () => {
  it('la negociación y la aprobación viven dentro de «Aceptación»', () => {
    expect(pasoDelEstado('pending')).toBe(0);
    expect(pasoDelEstado('notified')).toBe(1);
    expect(pasoDelEstado('negotiating')).toBe(1);
    expect(pasoDelEstado('approved')).toBe(1);
    expect(pasoDelEstado('signed')).toBe(2);
    expect(pasoDelEstado('completed')).toBe(3);
    expect(pasoDelEstado('terminated')).toBe(-1);
  });
});

describe('ipcSugerido', () => {
  it('sugiere el diciembre del año pasado cuando la tabla lo tiene', () => {
    expect(ipcSugerido(new Date(2026, 8, 8))).toEqual({ rate: 5.1, anio: 2025 });
  });

  it('no sugiere nada cuando la tabla se quedó vieja: el dato lo escribe la inmobiliaria', () => {
    expect(ipcSugerido(new Date(2028, 0, 15))).toBeNull();
  });
});

describe('el canon y el tope', () => {
  it('el tope con IPC es el canon por (1 + IPC), redondeado', () => {
    expect(topeConIpc(1_550_000, 5.1)).toBe(1_629_050);
  });

  it('la variación va en pesos y en por ciento', () => {
    expect(variacionDelCanon(1_550_000, 1_629_050)).toEqual({ pesos: 79_050, pct: 5.1 });
    expect(variacionDelCanon(0, 100)).toEqual({ pesos: 100, pct: 0 });
  });

  it('el por ciento se escribe con coma en español', () => {
    expect(formatearPct(5.1, 'es')).toBe('5,10 %');
    expect(formatearPct(5.1, 'es', 1)).toBe('5,1 %');
    expect(formatearPct(5.1, 'en')).toBe('5.10 %');
  });
});

describe('canalDeEnvio', () => {
  it('con cuenta va al panel y al correo; sin cuenta, al correo del contrato; sin nada, a ningún lado', () => {
    expect(canalDeEnvio({ tenantUserId: 'u1', tenantEmail: 'a@b.co' })).toBe('panel_y_correo');
    expect(canalDeEnvio({ tenantUserId: 'u1', tenantEmail: null })).toBe('panel_y_correo');
    expect(canalDeEnvio({ tenantUserId: null, tenantEmail: 'a@b.co' })).toBe('correo_del_contrato');
    expect(canalDeEnvio({ tenantUserId: null, tenantEmail: null })).toBe('ninguno');
  });
});

describe('renovacionAceptada', () => {
  it('aceptó desde su panel o la inmobiliaria lo registró', () => {
    expect(renovacionAceptada({ status: 'notified', tenantAcceptedAt: null })).toBe(false);
    expect(renovacionAceptada({ status: 'notified', tenantAcceptedAt: '2026-09-02T10:00:00Z' })).toBe(true);
    expect(renovacionAceptada({ status: 'approved', tenantAcceptedAt: null })).toBe(true);
    expect(renovacionAceptada({ status: 'signed', tenantAcceptedAt: null })).toBe(true);
  });
});

describe('fechas', () => {
  it('el vencimiento nuevo es un año más, leído en UTC como lo hace el back', () => {
    expect(nuevoVencimiento('2026-10-01')).toBe('2027-10-01');
    expect(nuevoVencimiento('2026-12-31T00:00:00.000Z')).toBe('2027-12-31');
    // 29 de febrero + 1 año: el back rueda al 1 de marzo (Date.UTC lo corre).
    expect(nuevoVencimiento('2028-02-29')).toBe('2029-03-01');
  });

  it('la fecha larga no se corre un día por la zona horaria', () => {
    expect(fechaLarga('2026-10-01', 'es')).toBe('1 de octubre de 2026');
    expect(fechaLarga('2026-03-01T00:00:00.000Z', 'es')).toBe('1 de marzo de 2026');
  });

  it('la corta tampoco: es el mismo día, abreviado', () => {
    const esperado = new Date(2026, 9, 1).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    expect(fechaCorta('2026-10-01T00:00:00.000Z', 'es')).toBe(esperado);
    expect(esperado).toContain('2026');
    expect(esperado.startsWith('1 ')).toBe(true);
  });
});

describe('mensajeSugerido', () => {
  it('lleva dirección, vencimiento, canon y la firma de la inmobiliaria', () => {
    const texto = mensajeSugerido({
      tenantName: 'Mateo Pérez',
      propertyAddress: 'Carrera 17 # 83-96 Apto 1502',
      leaseEndDate: '2026-10-01',
      newRent: 1_550_000,
      agencyName: 'Portofino',
      locale: 'es',
      formatCurrency: (n) => `$${n.toLocaleString('es-CO')}`,
    });
    expect(texto).toContain('Estimado/a Mateo Pérez');
    expect(texto).toContain('Carrera 17 # 83-96 Apto 1502 vence el 1 de octubre de 2026');
    expect(texto).toContain('$1.550.000');
    expect(texto.endsWith('Atentamente,\nPortofino')).toBe(true);
  });

  it('sin nombre de la inmobiliaria el mensaje termina sin firma, no con un nombre inventado', () => {
    const texto = mensajeSugerido({
      tenantName: 'Mateo',
      propertyAddress: 'x',
      leaseEndDate: '2026-10-01',
      newRent: 1,
      agencyName: '',
      locale: 'es',
      formatCurrency: String,
    });
    expect(texto.endsWith('Atentamente,')).toBe(true);
  });
});

describe('enlaceDeWhatsapp', () => {
  it('con teléfono apunta al número con el indicativo de Colombia y el mensaje codificado', () => {
    expect(enlaceDeWhatsapp('313 254 3924', 'Hola & adiós')).toBe(
      'https://wa.me/573132543924?text=Hola%20%26%20adi%C3%B3s',
    );
  });

  it('sin teléfono abre el chat sin destinatario', () => {
    expect(enlaceDeWhatsapp(null, 'Hola')).toBe('https://wa.me/?text=Hola');
  });
});

describe('el historial se lee como frases', () => {
  it('traduce las acciones del back, en sus dos vocabularios', () => {
    expect(etiquetaDeActividad('notified')).toBe('Propuesta enviada');
    expect(etiquetaDeActividad('note')).toBe('Nota');
    expect(etiquetaDeActividad('tenant_accepted')).toBe('El inquilino aceptó');
    expect(etiquetaDeActividad('RENOV_APPROVED')).toBe('Aceptación registrada');
    expect(etiquetaDeActividad('RENOV_TERMINATED')).toBe('No se renueva');
    expect(etiquetaDeActividad('lo_que_sea')).toBe('lo_que_sea');
  });

  it('le quita a la notificación el prefijo que le pone el back', () => {
    expect(textoDeActividad('notified', 'Notificación al inquilino: Hola Mateo')).toBe('Hola Mateo');
    expect(textoDeActividad('note', 'Llamé y no contestó')).toBe('Llamé y no contestó');
    expect(textoDeActividad('note', null)).toBe('');
  });
});
