/**
 * Los reportes de Mantenimientos (Juan Camilo y Nico, 28-10-2026): «que nos permita exportar reportes en Excel y también
 * un reporte de todo lo que hizo en el mes para liquidar a los proveedores». Nico eligió «Todo lo de Mantenimientos»
 * (solicitudes, cotizaciones, proveedores, calificaciones y tiempos del mes) y, para liquidar, «trabajos del mes y total
 * por pagar» por proveedor, en Excel y PDF.
 *
 * Todo sale de lo que ya trae la lista (y del registro de proveedores): aquí las hojas, puras, para probarlas. Bajar el
 * archivo es lo único que toca el navegador (`descargarExcelDeMantenimientos`, `descargarLiquidacionEnPdf`).
 */

import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria';
import type { ProveedorDeMantenimiento } from '@/lib/api/proveedores-de-mantenimiento.service';

type Celda = string | number;
type Hoja = Celda[][];

const ESTADO: Record<string, string> = {
  reported: 'Reportada',
  quoted: 'Por aprobar',
  approved: 'Por arreglar',
  in_progress: 'En arreglo',
  completed: 'Cerrada',
  cancelled: 'Cancelada',
};
const PRIORIDAD: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', emergency: 'Emergencia', urgent: 'Emergencia' };
const A_CARGO: Record<string, string> = { owner: 'Propietario', tenant: 'Inquilino', split: 'Compartida', agency: 'Inmobiliaria' };

/** «2026-10» del día en Bogotá. */
export function mesEnBogota(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(d);
}

/** «2026-10-28» en Bogotá. */
function dia(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
}

const NOMBRES_DE_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «octubre de 2026». */
export function mesEnPalabras(mes: string): string {
  const [a, m] = mes.split('-');
  return `${NOMBRES_DE_MES[Number(m) - 1] ?? m} de ${a}`;
}

/** Los últimos `n` meses, del actual hacia atrás. */
export function ultimosMeses(n = 12, hoy = new Date()): string[] {
  const base = mesEnBogota(hoy.toISOString()) ?? '2026-01';
  let [a, m] = base.split('-').map(Number);
  const meses: string[] = [];
  for (let k = 0; k < n; k += 1) {
    meses.push(`${a}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  return meses;
}

const extra = (s: SolicitudMantenimiento) => s as unknown as Record<string, unknown>;
const cotizacionElegida = (s: SolicitudMantenimiento) => s.quotes.find((q) => q.id === s.selectedQuoteId) ?? null;
const nombreDelProveedor = (s: SolicitudMantenimiento) => s.proveedor?.nombre ?? cotizacionElegida(s)?.providerName ?? '';

/** ¿Se cerró dentro del tiempo de su prioridad? «Sí», «No» o vacío (sin tiempo o sin cerrar). */
function aTiempo(s: SolicitudMantenimiento): string {
  const vence = extra(s).slaVenceAt as string | undefined;
  if (!vence || !s.completedAt) return '';
  return new Date(s.completedAt).getTime() <= new Date(vence).getTime() ? 'Sí' : 'No';
}

export function hojaDeSolicitudes(lista: readonly SolicitudMantenimiento[]): Hoja {
  const filas: Hoja = [['Solicitud', 'Inmueble', 'Dirección', 'Propietario', 'Inquilino', 'Prioridad', 'Estado', 'Proveedor', 'Valor aprobado', 'A cargo de', 'Creada', 'Vence', 'Cerrada', 'A tiempo']];
  for (const s of lista) {
    filas.push([
      s.title,
      s.propertyTitle,
      s.propertyAddress ?? '',
      s.propietarioName ?? '',
      s.tenantName ?? '',
      PRIORIDAD[s.priority] ?? s.priority,
      ESTADO[s.status] ?? s.status,
      nombreDelProveedor(s),
      s.approvedAmount ?? '',
      A_CARGO[s.paidBy] ?? s.paidBy,
      dia(s.createdAt),
      dia(extra(s).slaVenceAt as string | undefined),
      dia(s.completedAt),
      aTiempo(s),
    ]);
  }
  return filas;
}

export function hojaDeCotizaciones(lista: readonly SolicitudMantenimiento[]): Hoja {
  const filas: Hoja = [['Solicitud', 'Inmueble', 'Proveedor', 'Teléfono', 'Valor', 'Días estimados', 'Fecha', 'Elegida']];
  for (const s of lista) {
    for (const q of s.quotes) {
      filas.push([s.title, s.propertyTitle, q.providerName, q.providerPhone ?? '', q.amount, q.estimatedDays ?? '', dia(q.createdAt), q.id === s.selectedQuoteId ? 'Sí' : 'No']);
    }
  }
  return filas;
}

/** Los tiempos del mes: lo creado o cerrado en `mes`, con su prioridad y si se cerró a tiempo. */
export function hojaDeTiempos(lista: readonly SolicitudMantenimiento[], mes: string): Hoja {
  const filas: Hoja = [['Solicitud', 'Inmueble', 'Prioridad', 'Creada', 'Vence', 'Cerrada', 'Días para cerrar', 'A tiempo']];
  for (const s of lista) {
    if (mesEnBogota(s.createdAt) !== mes && mesEnBogota(s.completedAt) !== mes) continue;
    const dias = s.completedAt ? Math.max(0, Math.round((new Date(s.completedAt).getTime() - new Date(s.createdAt).getTime()) / 86_400_000)) : '';
    filas.push([s.title, s.propertyTitle, PRIORIDAD[s.priority] ?? s.priority, dia(s.createdAt), dia(extra(s).slaVenceAt as string | undefined), dia(s.completedAt), dias, aTiempo(s)]);
  }
  return filas;
}

export function hojaDeProveedores(proveedores: readonly ProveedorDeMantenimiento[]): Hoja {
  const filas: Hoja = [['Proveedor', 'Documento', 'Teléfono', 'Correo', 'Especialidades', 'Activo']];
  for (const p of proveedores) filas.push([p.nombre, p.documento, p.telefono ?? '', p.correo ?? '', (p.especialidades ?? []).join(', '), p.activo ? 'Sí' : 'No']);
  return filas;
}

export function hojaDeCalificaciones(proveedores: readonly ProveedorDeMantenimiento[]): Hoja {
  const filas: Hoja = [['Proveedor', 'Calificación', 'Trabajos calificados', 'Reaperturas por garantía']];
  for (const p of proveedores) filas.push([p.nombre, p.calificacion ?? '', p.trabajosCalificados ?? 0, p.reaperturasPorGarantia ?? 0]);
  return filas;
}

// ── Liquidación de proveedores ─────────────────────────────────────────────

export interface TrabajoDelProveedor {
  solicitudId: string;
  inmueble: string;
  titulo: string;
  cerrada: string;
  cotizado: number | null;
  costoFinal: number | null;
  aCargoDe: string;
  /** Lo que se le paga por este trabajo: el costo final o, sin él, lo cotizado. Una reapertura por garantía, 0. */
  aPagar: number;
}

export interface LiquidacionDelProveedor {
  clave: string;
  nombre: string;
  telefono: string;
  trabajos: TrabajoDelProveedor[];
  total: number;
}

/**
 * Por proveedor, cada arreglo CERRADO en `mes` (Bogotá) y el total a pagarle. El proveedor es el del registro o, sin él,
 * el de la cotización elegida; sin ninguno, «Sin proveedor». Ordenado por total, de mayor a menor.
 */
export function liquidacionDelMes(lista: readonly SolicitudMantenimiento[], mes: string): LiquidacionDelProveedor[] {
  const porClave = new Map<string, LiquidacionDelProveedor>();
  for (const s of lista) {
    if (s.status !== 'completed' || mesEnBogota(s.completedAt) !== mes) continue;
    const q = cotizacionElegida(s);
    const nombre = nombreDelProveedor(s) || 'Sin proveedor';
    const clave = s.proveedorId ?? s.proveedor?.id ?? `nombre:${nombre.toLowerCase()}`;
    const sinCosto = extra(s).sinCosto === true;
    const cotizado = q?.amount ?? null;
    const costoFinal = s.approvedAmount ?? null;
    const aPagar = sinCosto ? 0 : (costoFinal ?? cotizado ?? 0);
    const grupo = porClave.get(clave) ?? { clave, nombre, telefono: s.proveedor?.telefono ?? q?.providerPhone ?? '', trabajos: [], total: 0 };
    grupo.trabajos.push({ solicitudId: s.id, inmueble: s.propertyTitle, titulo: s.title, cerrada: dia(s.completedAt), cotizado, costoFinal, aCargoDe: sinCosto ? 'Garantía (sin costo)' : (A_CARGO[s.paidBy] ?? s.paidBy), aPagar });
    grupo.total += aPagar;
    porClave.set(clave, grupo);
  }
  return [...porClave.values()].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'));
}

export function hojaDeLiquidacion(liquidaciones: readonly LiquidacionDelProveedor[]): Hoja {
  const filas: Hoja = [['Proveedor', 'Teléfono', 'Inmueble', 'Trabajo', 'Cerrada', 'Valor cotizado', 'Costo final', 'A cargo de', 'A pagar']];
  for (const l of liquidaciones) {
    for (const t of l.trabajos) filas.push([l.nombre, l.telefono, t.inmueble, t.titulo, t.cerrada, t.cotizado ?? '', t.costoFinal ?? '', t.aCargoDe, t.aPagar]);
    filas.push([`Total ${l.nombre}`, '', '', '', '', '', '', '', l.total]);
  }
  if (liquidaciones.length > 1) filas.push(['Total del mes', '', '', '', '', '', '', '', liquidaciones.reduce((t, l) => t + l.total, 0)]);
  return filas;
}
