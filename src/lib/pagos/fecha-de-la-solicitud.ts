/**
 * La fecha que acompaña a una solicitud de pago en el historial de «Pagos» del
 * portal del inquilino. PURA.
 *
 * 🔴 QA-INQ-95 (04-10-2026): un intento RECHAZADO decía «Vence 5 de oct» (el
 * vencimiento del período), que no dice nada de ese intento y se lee como una
 * deuda con fecha. Rechazado = cuándo lo rechazaron.
 */
export interface SolicitudConFechas {
  status: string;
  createdAt: string;
  updatedAt: string;
  validatedAt: string | null;
  dueDate: string;
}

export function fechaDeLaSolicitud(
  s: SolicitudConFechas,
  locale: string,
  fecha: (iso: string) => string,
): string {
  const es = locale === 'es';
  if (s.status === 'APPROVED' && s.validatedAt) return `${es ? 'Aprobado el' : 'Approved on'} ${fecha(s.validatedAt)}`;
  if (s.status === 'PENDING_VALIDATION' || s.status === 'PROCESSING') return `${es ? 'Enviado el' : 'Submitted on'} ${fecha(s.createdAt)}`;
  if (s.status === 'REJECTED') return `${es ? 'Rechazado el' : 'Rejected on'} ${fecha(s.validatedAt ?? s.updatedAt)}`;
  // Un intento cancelado (abandonado en la pasarela) tampoco «vence»: se dice cuándo se canceló.
  if (s.status === 'CANCELLED') return `${es ? 'Cancelado el' : 'Cancelled on'} ${fecha(s.updatedAt)}`;
  return `${es ? 'Vence' : 'Due'} ${fecha(s.dueDate)}`;
}
