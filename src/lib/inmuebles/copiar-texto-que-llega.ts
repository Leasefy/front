/**
 * Copiar un texto que todavía no existe: el de «Copiar ficha» en el menú de
 * Inmuebles (Nico, 22-10-2026) se arma con datos que hay que pedir al back.
 *
 * 🔴 Safari sólo deja escribir en el portapapeles DENTRO del clic: un
 * `writeText` después de esperar la respuesta del back falla («not allowed»).
 * `ClipboardItem` con una PROMESA es la forma de pedirlo en el clic y
 * llenarlo cuando llegue (Safari y Chrome la aceptan). Sin `ClipboardItem`
 * (Firefox viejo), el `writeText` de siempre.
 *
 * Devuelve si quedó copiado. Si `texto` falla, también devuelve `false`:
 * quien llama mira su propia promesa para decir POR QUÉ.
 */
export async function copiarTextoQueLlega(texto: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && typeof navigator !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': texto.then((t) => new Blob([t], { type: 'text/plain' })) }),
      ]);
      return true;
    }
  } catch {
    // Cae al camino de siempre.
  }
  try {
    await navigator.clipboard.writeText(await texto);
    return true;
  } catch {
    return false;
  }
}
