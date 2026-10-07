/**
 * ¿El inmueble trae un área que se pueda mostrar?
 *
 * 🔴 QA-INQ-95 (PI-03, 04-10-2026): el Inicio del inquilino pintaba «0 m²» en
 * «Propiedades para ti» (Calle 30A # 82-45 Apto 210): los migrados llegan con el
 * área en 0 cuando el archivo no la traía. Cero metros no es una medida: en las
 * tarjetas del portal se trata como «no sabemos», igual que `null`.
 * (`formatArea(0)` sigue escribiendo «0 m²» donde alguien lo pide a propósito.)
 */
export function areaConocida(area: number | null | undefined): area is number {
  return typeof area === 'number' && Number.isFinite(area) && area > 0;
}
