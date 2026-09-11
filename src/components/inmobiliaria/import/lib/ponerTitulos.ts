/**
 * ponerTitulos — el título sugerido para las filas que no lo traen.
 *
 * Ningún archivo real trae título (0 de 2.895 en `Propiedades.csv`), y el
 * título es obligatorio: es lo primero que se ve en el marketplace. Sin él,
 * cada fila entra PENDIENTE y hay que escribirlo una por una. Por eso la
 * sugerencia no es un extra: es la acción recomendada del paso de revisión,
 * y el asistente la vuelve a ofrecer justo antes de seguir (`ImportWizard`).
 *
 * Vive fuera del paso porque la usan dos lugares —el botón «Ponerles título a
 * las N» y el diálogo de «Siguiente»— y tienen que hacer EXACTAMENTE lo mismo:
 * sólo el título, sólo donde falta, y las demás sugerencias siguen esperando.
 */

import type { ImportProperty } from './importTypes';
import { tituloSugerido } from './tituloSugerido';
import { recalcularEstado } from './requisitosDelBack';

/** Cuántas filas siguen sin título. */
export function sinTitulo(properties: readonly ImportProperty[]): number {
  return properties.filter((p) => !p.propertyTitle?.trim()).length;
}

/**
 * Toca SÓLO el título, y sólo donde falta: un título que la persona ya
 * escribió no se pisa. Una comisión o un canon estimado son otra decisión, y
 * meterlos acá sería aceptar cosas que la persona no miró.
 */
export function ponerTitulosATodas(properties: readonly ImportProperty[]): ImportProperty[] {
  return properties.map((p) => {
    if (p.propertyTitle?.trim()) return p;
    const titulo = tituloSugerido(p.propertyType, p.propertyCity, p.propertyZone);
    return recalcularEstado({
      ...p,
      propertyTitle: titulo,
      suggestions: p.suggestions.map((s) =>
        s.field === 'propertyTitle' && s.accepted === null ? { ...s, accepted: true } : s,
      ),
    });
  });
}
