/**
 * Bajar el archivo que dejó un proceso.
 *
 * El back firma una URL de una hora que ya viene con `download=<nombre>`: el
 * navegador la BAJA con su nombre en vez de abrirla en una pestaña. Se navega
 * a ella en la misma ventana —no con `window.open`, que el bloqueador de
 * ventanas corta cuando llega después de un `await`— y como la respuesta es
 * un adjunto, la pantalla no se va a ningún lado.
 */

import { procesosApi } from '@/lib/api/procesos.service'

export type Navegar = (url: string) => void

const navegarDeVerdad: Navegar = (url) => {
  window.location.assign(url)
}

export async function descargarArchivoDelProceso(
  id: string,
  navegar: Navegar = navegarDeVerdad,
): Promise<string> {
  const { url, nombre } = await procesosApi.descarga(id)
  navegar(url)
  return nombre
}
