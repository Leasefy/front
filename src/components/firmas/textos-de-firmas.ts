import type { EstadoDelDocumento, FormaDePago } from '@/lib/api/firmas.service';

export const ESTADO_DEL_DOCUMENTO: Record<EstadoDelDocumento, { texto: string; tono: 'info' | 'success' | 'warning' | 'critical' | 'neutral' }> = {
  BORRADOR: { texto: 'Sin enviar', tono: 'neutral' },
  POR_PAGAR: { texto: 'Esperando el pago', tono: 'warning' },
  ENVIADO: { texto: 'Por firmar', tono: 'info' },
  FIRMADO: { texto: 'Firmado', tono: 'success' },
  CANCELADO: { texto: 'Cancelado', tono: 'neutral' },
};

export const FORMA_DE_PAGO: Record<FormaDePago, string> = {
  REGALO: 'Firma gratis',
  PAQUETE: 'De tu paquete',
  PAGO_UNICO: 'Pagado aparte',
  FACTURA: 'A tu factura',
};

/** «28 oct, 3:15 p. m.» en Colombia. */
export function fechaYHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dia = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' }).format(d).replace('.', '');
  const hora = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  return `${dia}, ${hora.replace(/\s+/g, ' ')}`;
}

/** «28 oct 2026». */
export function fechaCortaDeFirma(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' }).format(d).replace('.', '');
}

/** La foto de una persona (o su prueba de vida, con Didit), en una frase para el panel. */
export function textoDeLaPruebaDeVida(p: {
  estado: 'EN_CURSO' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';
  proveedor: 'DIDIT' | 'LEASEFY';
  puntaje: number | null;
}): string {
  if (p.estado === 'APROBADA') {
    if (p.proveedor === 'LEASEFY') return 'Se tomó la foto al firmar';
    return `Pasó la prueba de vida${p.puntaje !== null ? ` · ${String(p.puntaje).replace('.', ',')} %` : ''}`;
  }
  if (p.estado === 'EN_REVISION') return 'Su prueba de vida está en revisión';
  if (p.estado === 'RECHAZADA') return 'No pasó la prueba de vida: puede intentarlo de nuevo';
  return 'Empezó la prueba de vida';
}
