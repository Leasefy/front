/**
 * MP-05 (QA-MIGRACION-95, 06-10-2026): con UNA fila la vista previa decía
 * «Así quedarían las primera fila». Con una, singular; con más, cuántas.
 */
export function tituloDeLaVistaPrevia(filas: number): string {
  return filas === 1 ? 'Así quedaría la primera fila' : `Así quedarían las primeras ${filas} filas`
}
