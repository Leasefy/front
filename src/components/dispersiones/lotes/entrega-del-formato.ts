/**
 * Qué recibe la inmobiliaria para cada banco, en palabras.
 *
 * Nico (22-09): «vamos a darles el archivo plano para TODOS los bancos de
 * Colombia». Todos los bancos se pueden elegir, pero no todos reciben lo mismo,
 * y la pantalla tiene que decirlo sin rodeos: un archivo del banco se sube al
 * portal; la planilla NO (no encontramos la estructura de ese banco y no se
 * adivina). Estas etiquetas son las que ve la lista de bancos y el diálogo del
 * archivo — una sola vez, acá.
 */
import type { EntregaDelFormato } from "@/lib/api/lotes-de-dispersion.service";

export const ETIQUETA_DE_LA_ENTREGA: Record<EntregaDelFormato, string> = {
  ARCHIVO_OFICIAL: "Archivo del banco — oficial",
  ARCHIVO_DE_TERCERO: "Archivo del banco — de tercero, sin verificar",
  PLANILLA: "Planilla para cargar a mano",
};

/** El orden de los grupos en la lista: primero lo que se sube tal cual. */
export const ORDEN_DE_LA_ENTREGA: EntregaDelFormato[] = [
  "ARCHIVO_OFICIAL",
  "ARCHIVO_DE_TERCERO",
  "PLANILLA",
];

/** Un back anterior al 22-09 noche no manda `entrega`: todo lo que tenía era oficial. */
export function entregaDe(b: {
  entrega?: EntregaDelFormato;
  formato: string | null;
}): EntregaDelFormato {
  if (b.entrega) return b.entrega;
  return b.formato === "PLANILLA_MANUAL" ? "PLANILLA" : "ARCHIVO_OFICIAL";
}
