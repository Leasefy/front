/**
 * IN-06 (QA 04-10): el historial del inmueble decía «Cobro de 2026-07»: el
 * período crudo que manda el back. Un `AAAA-MM` suelto dentro de un texto se
 * escribe en palabras («Cobro de julio de 2026»). Las fechas completas
 * (`2026-07-15`) no se tocan aquí.
 */
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function periodosEnPalabras(texto: string): string {
  return texto.replace(/(?<![\d-])(\d{4})-(\d{2})(?![\d-])/g, (entero, anio: string, mes: string) => {
    const nombre = MESES[Number(mes) - 1];
    return nombre ? `${nombre} de ${anio}` : entero;
  });
}
