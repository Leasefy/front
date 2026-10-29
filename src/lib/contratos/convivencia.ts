/**
 * Los llamados de atención por convivencia (Nico, 29-10-2026: «sí, hazlo»).
 *
 * Portofino decide si un inquilino renueva mirando cómo paga, las
 * reparaciones del inmueble y los llamados de atención por convivencia. Aquí
 * vive lo puro de la pantalla: los nombres (el mismo catálogo y el mismo orden
 * que el back, `contracts/convivencia/llamados.ts`), la validación del
 * formulario (los mismos topes y frases que el DTO) y el aviso cuando un
 * motivo se repite.
 */
import type { MotivoDeConvivencia, QuienLoReporto } from '@/lib/api/convivencia.service';

export const MOTIVOS: ReadonlyArray<{ valor: MotivoDeConvivencia; nombre: string }> = [
  { valor: 'ruido', nombre: 'Ruido' },
  { valor: 'mascotas', nombre: 'Mascotas' },
  { valor: 'basuras', nombre: 'Basuras' },
  { valor: 'areas_comunes', nombre: 'Áreas comunes' },
  { valor: 'parqueadero', nombre: 'Parqueadero' },
  { valor: 'visitas', nombre: 'Visitas o número de personas' },
  { valor: 'danos', nombre: 'Daños' },
  { valor: 'otro', nombre: 'Otro' },
];

export const QUIENES: ReadonlyArray<{ valor: QuienLoReporto; nombre: string }> = [
  { valor: 'vecino', nombre: 'Un vecino' },
  { valor: 'administracion', nombre: 'La administración' },
  { valor: 'propietario', nombre: 'El propietario' },
  { valor: 'inmobiliaria', nombre: 'La inmobiliaria' },
  { valor: 'otro', nombre: 'Otra persona' },
];

export function nombreDelMotivo(valor: string): string {
  return MOTIVOS.find((m) => m.valor === valor)?.nombre ?? 'Otro';
}

export function nombreDeQuien(valor: string | null): string | null {
  if (!valor) return null;
  return QUIENES.find((q) => q.valor === valor)?.nombre ?? null;
}

/** `AAAA-MM-DD` de hoy en Colombia (UTC−5, sin horario de verano). */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

export const LARGO_MINIMO_DE_QUE_PASO = 10;
export const LARGO_MAXIMO_DE_QUE_PASO = 2000;
export const LARGO_MINIMO_DEL_MOTIVO_DE_ANULACION = 5;

export interface LlamadoPorRegistrar {
  motivo: MotivoDeConvivencia | null;
  fecha: string;
  quePaso: string;
  loReporto: QuienLoReporto | null;
}

/** Lo que falta o está mal, por campo (las frases del DTO del back). Vacío = se puede registrar. */
export function erroresDelLlamado(l: LlamadoPorRegistrar, hoy: string = hoyEnColombia()): Partial<Record<'motivo' | 'fecha' | 'quePaso', string>> {
  const errores: Partial<Record<'motivo' | 'fecha' | 'quePaso', string>> = {};
  if (!l.motivo) errores.motivo = 'Elige por qué fue el llamado.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.fecha)) errores.fecha = 'Elige el día del llamado.';
  else if (l.fecha > hoy) errores.fecha = 'La fecha del llamado no puede ser después de hoy.';
  const texto = l.quePaso.trim();
  if (texto.length < LARGO_MINIMO_DE_QUE_PASO || texto.length > LARGO_MAXIMO_DE_QUE_PASO) {
    errores.quePaso = 'Cuenta qué pasó en al menos 10 letras (y hasta 2.000).';
  }
  return errores;
}

/**
 * Cuando un mismo motivo llega a 3 llamados vigentes, se dice: es lo que mira
 * la inmobiliaria para decidir la renovación (y lo cuenta Vinci). `null` si no.
 */
export function avisoDeRepetidos(porMotivo: ReadonlyArray<{ motivo: string; cuantos: number }>): string | null {
  const repetidos = porMotivo.filter((m) => m.cuantos >= 3);
  if (repetidos.length === 0) return null;
  const partes = repetidos.map((m) => `${m.cuantos} por ${nombreDelMotivo(m.motivo).toLowerCase()}`);
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
  return `Ya van ${lista}. Vinci lo tiene en cuenta al proponer la renovación.`;
}
