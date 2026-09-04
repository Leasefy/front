/**
 * Descargar la plantilla vacía de terceros.
 *
 * Las columnas NO se escriben acá: llegan de
 * `GET /inmobiliaria/migracion-terceros/plantilla`. Es la misma lista con la
 * que se mapea el archivo ajeno, y por eso el día que el back agregue una
 * columna la plantilla la trae sola. Una lista escrita a mano en el front se
 * queda vieja sin un solo error: el archivo trae el dato y el back nunca lo ve.
 */

import type {
  ColumnaDePlantilla,
  TipoDeTercero,
} from '@/lib/api/migracion-terceros.service';

/**
 * 🔴 `XLSX.writeFile()` NO sirve en el navegador.
 *
 * Es una función de Node que escribe con `fs`: en el browser no falla, no tira
 * error y no descarga nada — el botón simplemente no hace nada y no hay a qué
 * agarrarse para depurarlo. Hay que armar el buffer con `XLSX.write` y bajarlo
 * con un `<a download>`. Mismo aprendizaje que `parseFile.ts`.
 */
export async function descargarPlantillaDeTerceros(
  tipo: TipoDeTercero,
  columnas: readonly ColumnaDePlantilla[],
): Promise<void> {
  // Dinámico: `xlsx` pesa y esto sólo corre cuando alguien aprieta el botón.
  const XLSX = await import('xlsx');

  const titulos = columnas.map((c) => c.titulo);

  /*
   * Dos filas de ejemplo y no una. Con una sola, Excel no muestra que la
   * columna admite varios valores y la persona la trata como texto libre —
   * después «Ahorros», «AHORRO» y «cta ahorros» llegan como tres cosas.
   */
  const ejemplo = columnas.map((c) => c.ejemplo);
  const segunda = columnas.map((c) => (c.opciones ? (c.opciones[1] ?? c.ejemplo) : ''));

  const hoja = XLSX.utils.aoa_to_sheet([titulos, ejemplo, segunda]);
  hoja['!cols'] = titulos.map((titulo) => ({ wch: Math.max(16, titulo.length + 4) }));

  const libro = XLSX.utils.book_new();
  const nombreDeHoja = tipo === 'PROPIETARIO' ? 'Propietarios' : 'Inquilinos';
  XLSX.utils.book_append_sheet(libro, hoja, nombreDeHoja);

  /*
   * Segunda hoja con la ayuda: qué es obligatorio y qué valores se aceptan.
   * Meterlo como comentarios de celda no sobrevive a Google Sheets ni a
   * LibreOffice; una hoja aparte se abre en cualquier lado.
   */
  const ayuda = XLSX.utils.aoa_to_sheet([
    ['Columna', '¿Obligatoria?', 'Valores aceptados', 'Notas'],
    ...columnas.map((c) => [
      c.titulo,
      c.obligatoria ? 'Sí' : 'No',
      c.opciones ? c.opciones.join(' · ') : 'Texto libre',
      c.ayuda ?? '',
    ]),
  ]);
  ayuda['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 48 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(libro, ayuda, 'Cómo llenarla');

  const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantilla-${nombreDeHoja.toLowerCase()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // En un tick: revocar en la misma vuelta cancela la descarga en Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
