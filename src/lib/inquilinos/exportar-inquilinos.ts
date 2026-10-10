/**
 * Exportar inquilinos a Excel (acciones masivas, Nico 10-10-2026): una fila
 * por ARRIENDO —la misma persona con dos inmuebles sale dos veces, cada una
 * con lo suyo— y una fila sola para quien todavía no tiene contrato. La hoja
 * se arma pura (`hojaDeInquilinos`) y se prueba; bajar es lo único que toca
 * el navegador.
 */

import { cuentaDelPortal, estadoParaMostrar, type EstadoDeArriendo, type Inquilino } from '@/lib/api/inquilinos.service';
import { descargar } from '@/lib/propietarios/exportar-datos';

const ESTADO: Record<EstadoDeArriendo, string> = {
  ACTIVE: 'Activo',
  ENDING_SOON: 'Por terminar',
  ENDED: 'Terminado',
  TERMINATED: 'Terminado anticipadamente',
  EN_FIRMA: 'En firma',
  POR_EMPEZAR: 'Por empezar',
};

export const ENCABEZADOS_DE_INQUILINOS = [
  'Nombre',
  'Documento',
  'Correo',
  'Teléfono',
  'Cuenta del portal',
  'Inmueble',
  'Ciudad',
  'Estado del arriendo',
  'Canon',
  'Desde',
  'Hasta',
] as const;

export function hojaDeInquilinos(personas: readonly Inquilino[], hoy?: string): (string | number)[][] {
  const filas: (string | number)[][] = [[...ENCABEZADOS_DE_INQUILINOS]];
  for (const p of personas) {
    const base = [
      p.nombre,
      p.documento ?? '',
      p.email ?? '',
      p.telefono ?? '',
      cuentaDelPortal(p) ? 'Sí' : 'No',
    ];
    if (p.arriendos.length === 0) {
      filas.push([...base, 'Sin contrato', '', '', '', '', '']);
      continue;
    }
    for (const a of p.arriendos) {
      filas.push([
        ...base,
        a.inmueble ? a.inmueble.address || a.inmueble.title : 'Sin inmueble',
        a.inmueble?.city ?? '',
        ESTADO[estadoParaMostrar(a, hoy)] ?? a.estado,
        a.canonCop,
        a.desde?.slice(0, 10) ?? '',
        a.hasta?.slice(0, 10) ?? '',
      ]);
    }
  }
  return filas;
}

/** Baja el Excel y devuelve el nombre del archivo. */
export async function descargarInquilinos(personas: readonly Inquilino[]): Promise<string> {
  // Dinámico: `xlsx` pesa y esto sólo corre cuando alguien aprieta el botón.
  const XLSX = await import('xlsx');
  const libro = XLSX.utils.book_new();
  const filas = hojaDeInquilinos(personas);
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = ENCABEZADOS_DE_INQUILINOS.map((t) => ({ wch: Math.max(14, t.length + 4) }));
  XLSX.utils.book_append_sheet(libro, ws, 'Inquilinos');
  const bytes = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const nombre = `inquilinos-${dia}.xlsx`;
  descargar(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nombre);
  return nombre;
}
