import type {
  CanalDeLaSolicitud,
  EstadoDelPlazo,
  ListaDeSolicitudes,
  SolicitudDeHabeasData,
  TipoDeSolicitud,
} from '@/lib/api/habeas-data.service';

/** Las solicitudes de habeas data dichas en palabras. PURO. */

export const TIPO_EN_PALABRAS: Record<TipoDeSolicitud, string> = {
  CONSULTA: 'Consulta',
  RECTIFICACION: 'Actualización o rectificación',
  SUPRESION: 'Supresión',
  REVOCATORIA: 'Revocatoria de la autorización',
};

export const CANAL_EN_PALABRAS: Record<CanalDeLaSolicitud, string> = {
  CORREO: 'Correo',
  CARTA: 'Carta',
  PRESENCIAL: 'En la oficina',
  TELEFONO: 'Teléfono',
  OTRO: 'Otro',
};

export const ESTADO_DEL_PLAZO_EN_PALABRAS: Record<EstadoDelPlazo, string> = {
  RESPONDIDA: 'Respondida',
  EN_PLAZO: 'En plazo',
  POR_VENCER: 'Por vencer',
  VENCIDA: 'Vencida',
};

const n = (x: number, uno: string, varios: string) => `${x} ${x === 1 ? uno : varios}`;

/** «Quedan 4 días hábiles» · «Vence hoy» · «Vencida hace 2 días hábiles». */
export function plazoEnPalabras(s: SolicitudDeHabeasData): string {
  if (s.estado === 'RESPONDIDA') return 'Respondida';
  if (s.estadoDelPlazo === 'VENCIDA') {
    return `Vencida hace ${n(Math.max(1, -s.diasHabilesRestantes), 'día hábil', 'días hábiles')}`;
  }
  if (s.diasHabilesRestantes <= 0) return 'Vence hoy';
  return `Quedan ${n(s.diasHabilesRestantes, 'día hábil', 'días hábiles')}`;
}

/**
 * El resumen como UNA frase (EL MOLDE): «Tienes 3 solicitudes abiertas: 1
 * vencida y 1 que vence en 3 días hábiles o menos. 5 ya tienen respuesta.»
 */
export function fraseDelResumen(lista: ListaDeSolicitudes): string {
  const { abiertas, vencidas, porVencer, respondidas } = lista.resumen;
  if (abiertas === 0 && respondidas === 0) {
    return 'Todavía no hay solicitudes de titulares registradas.';
  }
  const partes: string[] = [];
  if (abiertas === 0) partes.push('No tienes solicitudes abiertas.');
  else {
    const urgentes = [
      vencidas > 0 ? n(vencidas, 'vencida', 'vencidas') : null,
      porVencer > 0
        ? `${n(porVencer, 'que vence', 'que vencen')} en 3 días hábiles o menos`
        : null,
    ].filter(Boolean);
    partes.push(
      `Tienes ${n(abiertas, 'solicitud abierta', 'solicitudes abiertas')}${
        urgentes.length ? `: ${urgentes.join(' y ')}` : ', todas en plazo'
      }.`,
    );
  }
  if (respondidas > 0) {
    partes.push(`${n(respondidas, 'ya tiene', 'ya tienen')} respuesta.`);
  }
  return partes.join(' ');
}

/** `datos-de-<documento>-<fecha>.json`, sin caracteres raros. */
export function nombreDelArchivoDelTitular(documento: string, hoy: Date = new Date()): string {
  const limpio = documento.replace(/[^0-9A-Za-z]/g, '') || 'titular';
  return `datos-del-titular-${limpio}-${hoy.toISOString().slice(0, 10)}.json`;
}
