import { redirect } from 'next/navigation'

/**
 * `/panel/inmobiliaria/recorrido` → `/postulaciones`.
 *
 * Esta pantalla existió unos días como "la casa del paso 7" y era un error de
 * estructura: mostraba **las postulaciones de la gente con su estado**, que es
 * exactamente lo que ya muestra `/postulaciones`. Dos rutas y dos filas de menú
 * para una sola cosa — el mismo defecto que tenían los dos «Documentos».
 *
 * El recorrido de los 11 pasos no es un destino, es el **contexto** de esa
 * lista, así que el mapa se mudó adentro de `/postulaciones`: abierto cuando no
 * hay nada que atender, plegado cuando sí lo hay.
 *
 * La ruta se conserva redirigiendo porque anduvo enlazada (mapa, hilo, marcadores).
 */
export default function RecorridoRedirect() {
  redirect('/panel/inmobiliaria/postulaciones')
}
