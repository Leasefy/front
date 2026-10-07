/**
 * QA-INQ-95 (PI-44, 04-10-2026) · En «Mensajes» del portal, el hilo de la
 * postulación de Iván a «Carrera 35 # 8A-60 Apto 402» decía «Sobre tu arriendo —
 * Carrera 35…»: su arriendo es otro (Calle 45). El encabezado dice de qué es el hilo.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/hooks/use-messages', () => ({}));
import { encabezadoDelHilo } from './MessagesWidget';

describe('encabezadoDelHilo', () => {
  it('postulación, consulta e hilo de arriendo', () => {
    expect(encabezadoDelHilo('APPLICATION')).toBe('Sobre tu postulación');
    expect(encabezadoDelHilo('PROPERTY_INQUIRY')).toBe('Sobre el inmueble');
    expect(encabezadoDelHilo(undefined)).toBe('Sobre tu arriendo');
  });
});
