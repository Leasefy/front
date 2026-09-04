/**
 * audit-event-labels.test.ts — el feed «Novedades» del buscador nunca muestra
 * una clave cruda.
 *
 * Nico abrió el ⌘K y vio `precall.held_for_approval` / `debtor · hace 6h`.
 * Este test fija las tres capas de traducción (diccionario, familias por
 * prefijo/patrón, humanizador) y el tiempo relativo en español correcto.
 */

import { describe, it, expect } from 'vitest';

import {
  AUDIT_ENTITY_LABELS_ES,
  AUDIT_EVENT_LABELS_EN,
  AUDIT_EVENT_LABELS_ES,
  auditEntityLabel,
  auditEventLabel,
  humanizeEventType,
  relativeTimeLabel,
} from '../audit-event-labels';

describe('auditEventLabel — diccionario', () => {
  it('traduce el evento de la captura de Nico', () => {
    expect(auditEventLabel('precall.held_for_approval', 'es')).toBe('Llamada retenida para aprobación');
    expect(auditEventLabel('precall.held_for_approval', 'en')).toBe('Call held for approval');
  });

  it('cubre las tres convenciones de slug que escribe el agente', () => {
    expect(auditEventLabel('dialer.call_placed', 'es')).toBe('Llamada realizada');
    expect(auditEventLabel('escalation_claim', 'es')).toBe('Escalación tomada');
    expect(auditEventLabel('arco-request-created', 'es')).toBe('Solicitud ARCO creada');
  });

  it('ignora espacios alrededor y devuelve vacío para vacío', () => {
    expect(auditEventLabel('  pii_reveal ', 'es')).toBe('Cédula revelada');
    expect(auditEventLabel('', 'es')).toBe('');
    expect(auditEventLabel('   ', 'en')).toBe('');
  });

  it('el diccionario es/en cubre exactamente los mismos slugs', () => {
    expect(Object.keys(AUDIT_EVENT_LABELS_EN).sort()).toEqual(Object.keys(AUDIT_EVENT_LABELS_ES).sort());
  });

  it('ninguna frase del diccionario es una clave disfrazada', () => {
    for (const [slug, frase] of Object.entries(AUDIT_EVENT_LABELS_ES)) {
      expect(frase, slug).toMatch(/^[A-ZÁÉÍÓÚÑ]/);
      expect(frase, slug).not.toMatch(/[._]/);
      expect(frase, slug).not.toBe(slug);
    }
  });
});

describe('auditEventLabel — familias', () => {
  it('erp.sync.<método> es una sola frase, sea cual sea el método', () => {
    expect(auditEventLabel('erp.sync.invoices', 'es')).toBe('Sincronización con el ERP');
    expect(auditEventLabel('erp.sync.credit_notes', 'es')).toBe('Sincronización con el ERP');
    expect(auditEventLabel('erp.sync.payments', 'en')).toBe('ERP sync');
  });

  it('legal_artifact.<tipo>.generated: los tipos conocidos van al diccionario, el resto a la familia', () => {
    expect(auditEventLabel('legal_artifact.pre_judicial_letter.generated', 'es')).toBe('Carta prejurídica generada');
    expect(auditEventLabel('legal_artifact.otro_tipo.generated', 'es')).toBe('Documento legal generado');
  });

  it('arco_<acción>_requested se arma con la acción traducida', () => {
    expect(auditEventLabel('arco_rectificacion_requested', 'es')).toBe('Solicitud ARCO de rectificación recibida');
    expect(auditEventLabel('arco_acceso_requested', 'en')).toBe('Data-rights access request received');
  });
});

describe('humanizeEventType — lo desconocido', () => {
  it('convierte snake_case, dot.case y kebab-case en una frase', () => {
    expect(humanizeEventType('cobranza.algo_nuevo')).toBe('Cobranza algo nuevo');
    expect(humanizeEventType('some_new_action')).toBe('Some new action');
    expect(humanizeEventType('policy-version-created')).toBe('Policy version created');
    expect(humanizeEventType('a:b')).toBe('A b');
  });

  it('nunca deja puntos ni guiones y sube sólo la primera letra', () => {
    const out = humanizeEventType('X.Y_Z-W');
    expect(out).toBe('X y z w');
    expect(out).not.toMatch(/[._-]/);
  });

  it('tolera separadores repetidos, espacios y vacío', () => {
    expect(humanizeEventType('..foo__bar--')).toBe('Foo bar');
    expect(humanizeEventType('   ')).toBe('');
    expect(humanizeEventType('')).toBe('');
  });

  it('auditEventLabel cae al humanizador cuando no hay traducción', () => {
    expect(auditEventLabel('cobranza.algo_nuevo', 'es')).toBe('Cobranza algo nuevo');
    expect(auditEventLabel('cobranza.algo_nuevo', 'en')).toBe('Cobranza algo nuevo');
  });
});

describe('auditEntityLabel', () => {
  it('debtor → deudor', () => {
    expect(auditEntityLabel('debtor', 'es')).toBe('deudor');
    expect(auditEntityLabel('debtor', 'en')).toBe('debtor');
  });

  it('traduce las entidades que el agente escribe de verdad', () => {
    expect(auditEntityLabel('payment_plan', 'es')).toBe('plan de pago');
    expect(auditEntityLabel('legal_artifact', 'es')).toBe('carta legal');
    expect(auditEntityLabel('insurance_claim', 'en')).toBe('insurance claim');
  });

  it('una entidad desconocida se humaniza en minúscula', () => {
    expect(auditEntityLabel('foo_bar_baz', 'es')).toBe('foo bar baz');
  });

  it('null, undefined o vacío → null (la fila no pinta un separador colgando)', () => {
    expect(auditEntityLabel(null, 'es')).toBeNull();
    expect(auditEntityLabel(undefined, 'es')).toBeNull();
    expect(auditEntityLabel('', 'es')).toBeNull();
    expect(auditEntityLabel('  ', 'es')).toBeNull();
  });

  it('las etiquetas en español van en minúscula (se leen después del evento)', () => {
    for (const [slug, etiqueta] of Object.entries(AUDIT_ENTITY_LABELS_ES)) {
      expect(etiqueta, slug).toBe(etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1));
    }
  });
});

describe('relativeTimeLabel', () => {
  const NOW = Date.parse('2026-09-03T15:00:00.000Z');
  const ago = (ms: number) => new Date(NOW - ms).toISOString();
  const MIN = 60_000;
  const H = 60 * MIN;
  const D = 24 * H;

  it('escribe «hace 6 h», con espacio antes del símbolo', () => {
    expect(relativeTimeLabel(ago(6 * H), 'es', NOW)).toBe('hace 6 h');
    expect(relativeTimeLabel(ago(6 * H + 25 * MIN), 'es', NOW)).toBe('hace 6 h');
  });

  it('minutos y «ahora»', () => {
    expect(relativeTimeLabel(ago(20 * 1000), 'es', NOW)).toBe('ahora');
    expect(relativeTimeLabel(ago(5 * MIN), 'es', NOW)).toBe('hace 5 min');
    expect(relativeTimeLabel(ago(59 * MIN), 'es', NOW)).toBe('hace 59 min');
  });

  it('días enteros, con singular', () => {
    expect(relativeTimeLabel(ago(1 * D), 'es', NOW)).toBe('hace 1 día');
    expect(relativeTimeLabel(ago(3 * D + 2 * H), 'es', NOW)).toBe('hace 3 días');
    expect(relativeTimeLabel(ago(6 * D), 'es', NOW)).toBe('hace 6 días');
  });

  it('de 7 días en adelante muestra la fecha corta', () => {
    const label = relativeTimeLabel(ago(9 * D), 'es', NOW);
    expect(label).not.toMatch(/^hace/);
    expect(label).toMatch(/25/);
    expect(label.toLowerCase()).toMatch(/ago/);
  });

  it('inglés', () => {
    expect(relativeTimeLabel(ago(20 * 1000), 'en', NOW)).toBe('just now');
    expect(relativeTimeLabel(ago(5 * MIN), 'en', NOW)).toBe('5 min ago');
    expect(relativeTimeLabel(ago(6 * H), 'en', NOW)).toBe('6 h ago');
    expect(relativeTimeLabel(ago(1 * D), 'en', NOW)).toBe('1 day ago');
    expect(relativeTimeLabel(ago(2 * D), 'en', NOW)).toBe('2 days ago');
  });

  it('una fecha inválida o futura se trata como «ahora»', () => {
    expect(relativeTimeLabel('no-es-fecha', 'es', NOW)).toBe('ahora');
    expect(relativeTimeLabel(new Date(NOW + 5 * H).toISOString(), 'es', NOW)).toBe('ahora');
  });
});
