import { describe, expect, it } from 'vitest';
import { NOMBRES_ILUSTRACIONES } from '@leasefy/cadence';
import { ilustracionDelVacio } from './ilustracion-del-vacio';

describe('ilustracionDelVacio (Nico 23-10: todo vacío con su ilustración 3D)', () => {
  it.each([
    ['Todavía no tienes inmuebles', 'casa'],
    ['Sin llamadas registradas', 'mensajes'],
    ['No hay pagos este mes', 'billetera'],
    ['Todavía no hay contratos', 'contrato'],
    ['Ninguna factura en el período', 'factura'],
    ['No hay notas crédito', 'factura'],
    ['Sin deudores en cobranza', 'sobre_cobro'],
    ['No hay propietarios', 'llaves'],
    ['Todavía no hay inquilinos', 'cedula'],
    ['Sin visitas agendadas', 'visita'],
    ['No hay tickets de mantenimiento', 'llave_destornillador'],
    ['Todavía no hay asesores en el equipo', 'equipo'],
    ['Sin extractos cargados', 'banco'],
    ['No hay pagos en línea', 'datafono'],
    ['Sin facturas de servicios públicos', 'bombillo'],
  ] as const)('«%s» → %s', (texto, nombre) => {
    expect(ilustracionDelVacio(texto)).toBe(nombre);
  });

  it('el primer texto con pista gana; sin pistas, la carpeta', () => {
    expect(ilustracionDelVacio(undefined, '', 'contratos')).toBe('contrato');
    expect(ilustracionDelVacio('Todavía no hay nada que mostrar')).toBe('carpeta');
  });

  it('siempre devuelve una ilustración que existe en Cadence', () => {
    const textos = ['a', 'pagos', 'reportes', 'documentos', 'garantías', 'bodegas', 'lotes', 'novedades', 'plan'];
    for (const t of textos) expect(NOMBRES_ILUSTRACIONES).toContain(ilustracionDelVacio(t));
  });
});
