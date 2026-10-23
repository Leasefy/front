/**
 * El Excel de PROVEEDORES, tal como venga (reunión con Portofino, 22-10-2026:
 * «subir un Excel en Proveedores»). Lo lee el mismo lector de planillas de la
 * cartera y del recaudo (`lib/importar`): la hoja y la fila de títulos que más
 * campos nombran, y cada columna reconocida por su título y por sus valores. La
 * persona ve qué columna se tomó para cada dato y la cambia si no es.
 *
 * Al back viaja el TEXTO de cada celda, sin interpretar: el tipo de documento,
 * los oficios, el teléfono y el correo los lee el back
 * (`proveedores/importar-proveedores.ts`), con una sola regla para todos.
 */
import type { ParsedRow } from '@/components/inmobiliaria/import/lib/importTypes';
import type { CampoReconocible, Mapeo } from '@/lib/importar/reconocer-columnas';
import { textoDeLaCelda } from '@/lib/importar/reconocer-columnas';

export type CampoDelProveedor =
  | 'nombre'
  | 'tipoDocumento'
  | 'documento'
  | 'telefono'
  | 'correo'
  | 'especialidades'
  | 'notas';

export const CAMPOS_DEL_PROVEEDOR: readonly CampoReconocible<CampoDelProveedor>[] = [
  {
    campo: 'nombre',
    etiqueta: 'Nombre o razón social',
    sinonimos: ['nombre', 'razon social', 'proveedor', 'nombre del proveedor', 'nombre proveedor', 'empresa', 'contratista', 'tercero', 'nombre completo'],
    palabras: ['nombre', 'razon', 'proveedor', 'empresa', 'contratista', 'tercero'],
    evitar: ['tipo', 'documento', 'correo', 'telefono', 'contacto', 'banco'],
    tipo: 'nombre',
    requerido: true,
  },
  {
    campo: 'tipoDocumento',
    etiqueta: 'Tipo de documento',
    sinonimos: ['tipo de documento', 'tipo documento', 'tipo doc', 'tipo de identificacion', 'tipo identificacion', 'tipo id', 'tipo'],
    palabras: ['tipo'],
    evitar: ['nombre', 'cuenta', 'servicio', 'oficio'],
    tipo: 'codigo',
  },
  {
    campo: 'documento',
    etiqueta: 'Número de documento',
    sinonimos: ['nit', 'cedula', 'documento', 'numero de documento', 'identificacion', 'numero de identificacion', 'nit o cedula', 'cc', 'nit cc', 'id'],
    palabras: ['nit', 'cedula', 'documento', 'identificacion'],
    evitar: ['tipo', 'nombre', 'fecha'],
    tipo: 'documento',
    requerido: true,
  },
  {
    campo: 'telefono',
    etiqueta: 'Teléfono',
    sinonimos: ['telefono', 'celular', 'movil', 'whatsapp', 'contacto', 'telefono de contacto', 'tel', 'cel'],
    palabras: ['telefono', 'celular', 'movil', 'whatsapp', 'tel', 'cel'],
    evitar: ['nombre', 'correo'],
    tipo: 'telefono',
    porLosValores: true,
  },
  {
    campo: 'correo',
    etiqueta: 'Correo',
    sinonimos: ['correo', 'email', 'correo electronico', 'e mail', 'mail'],
    palabras: ['correo', 'email', 'mail'],
    tipo: 'correo',
    porLosValores: true,
  },
  {
    campo: 'especialidades',
    etiqueta: 'Oficio',
    sinonimos: ['oficio', 'oficios', 'especialidad', 'especialidades', 'servicio', 'servicios', 'categoria', 'actividad', 'tipo de servicio'],
    palabras: ['oficio', 'especialidad', 'servicio', 'categoria', 'actividad'],
    evitar: ['nombre', 'documento'],
    tipo: 'texto',
  },
  {
    campo: 'notas',
    etiqueta: 'Notas',
    sinonimos: ['notas', 'observaciones', 'comentarios', 'nota', 'observacion'],
    palabras: ['nota', 'observacion', 'comentario'],
    tipo: 'texto',
  },
];

/** Lo que viaja al back por cada fila: el texto de cada celda, tal cual. */
export interface FilaDeProveedorDelArchivo {
  fila: number;
  nombre?: string;
  tipoDocumento?: string;
  documento?: string;
  telefono?: string;
  correo?: string;
  especialidades?: string;
  notas?: string;
}

/** Los topes holgados del DTO del back: una celda más larga se corta, no tumba el archivo. */
const TOPE: Record<CampoDelProveedor, number> = {
  nombre: 1000,
  tipoDocumento: 200,
  documento: 200,
  telefono: 500,
  correo: 1000,
  especialidades: 1000,
  notas: 5000,
};

export function armarFilasDeProveedores(
  filas: readonly ParsedRow[],
  mapeo: Mapeo<CampoDelProveedor>,
  filaDeEncabezado: number | null,
): FilaDeProveedorDelArchivo[] {
  const salida: FilaDeProveedorDelArchivo[] = [];
  filas.forEach((f, i) => {
    // La fila como la ve la persona en Excel (1-based, contando el encabezado).
    const fila = typeof f._rowIndex === 'number' ? f._rowIndex + 1 : (filaDeEncabezado ?? 0) + i + 2;
    const armada: FilaDeProveedorDelArchivo = { fila };
    let algo = false;
    for (const c of CAMPOS_DEL_PROVEEDOR) {
      const columna = mapeo[c.campo];
      if (!columna) continue;
      const texto = textoDeLaCelda(f[columna]).trim().slice(0, TOPE[c.campo]);
      if (texto) {
        armada[c.campo] = texto;
        algo = true;
      }
    }
    if (algo) salida.push(armada);
  });
  return salida;
}
