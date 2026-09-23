/**
 * La bitácora de movimientos, en palabras: módulos, roles, resultados, fechas y
 * la frase de arriba. Todo puro, para poder probarlo sin pantalla.
 */

import { getRoleLabel, type AgencyRole } from '@/lib/types/inmobiliaria';
import type {
  Movimiento,
  PaginaDeMovimientos,
  ResultadoDelMovimiento,
} from '@/lib/api/movimientos.service';

/**
 * El módulo sale de la RUTA del back (`lotes-de-dispersion`, `contabilidad`,
 * `inmuebles`…). Los que no están acá se muestran con la primera en mayúscula
 * y los guiones como espacios: mejor un nombre feo que uno inventado.
 */
const MODULOS: Record<string, string> = {
  'lotes-de-dispersion': 'Lotes de giros',
  dispersiones: 'Dispersiones',
  contabilidad: 'Contabilidad',
  facturacion: 'Facturación',
  contratos: 'Contratos',
  inmuebles: 'Inmuebles',
  propietarios: 'Propietarios',
  consignaciones: 'Mandatos',
  cobros: 'Cobros',
  'recibos-de-caja': 'Recibos de caja',
  cartera: 'Cartera',
  inquilinos: 'Inquilinos',
  mantenimiento: 'Mantenimiento',
  pqrs: 'PQRS',
  leads: 'Leads',
  pipeline: 'Pipeline',
  renovaciones: 'Renovaciones',
  juridico: 'Jurídico',
  agency: 'Equipo y configuración',
  config: 'Configuración',
  tesoreria: 'Tesorería',
  'conciliacion-bancaria': 'Conciliación bancaria',
  nomina: 'Nómina',
  documentos: 'Documentos',
  documents: 'Documentos',
  reports: 'Reportes',
  agenda: 'Agenda',
  avaluos: 'Avalúos',
  clientes: 'Clientes',
  migracion: 'Migración',
  'migracion-terceros': 'Migración de terceros',
};

export function moduloEnPalabras(modulo: string): string {
  const conocido = MODULOS[modulo];
  if (conocido) return conocido;
  const plano = modulo.replace(/-/g, ' ');
  return plano.charAt(0).toUpperCase() + plano.slice(1);
}

/** `CONTADOR` → «Contador». Sin rol (una acción del sistema) → «—». */
export function rolEnPalabras(rol: string | null): string {
  if (!rol) return '—';
  return getRoleLabel(rol.toLowerCase() as AgencyRole);
}

export function resultadoDe(codigo: number): ResultadoDelMovimiento {
  if (codigo >= 500) return 'error';
  if (codigo >= 400) return 'negado';
  return 'exito';
}

export const RESULTADO_EN_PALABRAS: Record<ResultadoDelMovimiento, string> = {
  exito: 'Hecho',
  negado: 'Negado',
  error: 'Falló',
};

/** Quién, con lo que haya: el nombre copiado, si no el correo. */
export function quienFue(m: Pick<Movimiento, 'actor'>): string {
  return m.actor.nombre ?? m.actor.email ?? 'Alguien sin nombre';
}

/** «22 sep 2026, 9:30 p. m.» — SIEMPRE en hora de Bogotá, no la del navegador. */
export function cuandoEnBogota(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Del mes `YYYY-MM` al rango de días que pide el back (inclusive). */
export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

const miles = (n: number) => n.toLocaleString('es-CO');
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/**
 * LA FRASE de arriba de la pantalla (el molde: el resumen es una frase, no
 * fichas sueltas). Habla del filtro que está puesto, no de todo el historial.
 */
export function fraseDelResumen(
  p: Pick<PaginaDeMovimientos, 'total' | 'resumen'>,
  cuando: string,
): string {
  if (p.total === 0) return `No hay movimientos registrados ${cuando} con estos filtros.`;
  const base = `${cuando.charAt(0).toUpperCase()}${cuando.slice(1)} hubo ${miles(p.total)} ${plural(
    p.total,
    'movimiento',
    'movimientos',
  )} de ${miles(p.resumen.personas)} ${plural(p.resumen.personas, 'persona', 'personas')}`;
  const partes: string[] = [];
  if (p.resumen.negados > 0) {
    partes.push(
      `${miles(p.resumen.negados)} ${plural(p.resumen.negados, 'fue negado', 'fueron negados')} por permiso`,
    );
  }
  if (p.resumen.errores > 0) {
    partes.push(`${miles(p.resumen.errores)} ${plural(p.resumen.errores, 'falló', 'fallaron')}`);
  }
  return partes.length > 0 ? `${base}; ${partes.join(' y ')}.` : `${base}.`;
}

/**
 * Lo enviado, en filas «campo: valor» para el cajón. El back ya redactó: acá
 * sólo se aplana (un nivel de anidación se nombra con punto).
 */
export function loEnviadoEnFilas(
  resumen: Record<string, unknown> | null,
): { campo: string; valor: string; redactado: boolean }[] {
  if (!resumen) return [];
  const filas: { campo: string; valor: string; redactado: boolean }[] = [];
  const recorrer = (obj: Record<string, unknown>, prefijo: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const campo = prefijo ? `${prefijo}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && prefijo === '') {
        recorrer(v as Record<string, unknown>, campo);
        continue;
      }
      const valor =
        v === null || v === undefined
          ? 'vacío'
          : typeof v === 'boolean'
            ? v
              ? 'sí'
              : 'no'
            : typeof v === 'object'
              ? JSON.stringify(v)
              : String(v);
      filas.push({ campo, valor, redactado: valor === '«redactado»' });
    }
  };
  recorrer(resumen, '');
  return filas;
}
