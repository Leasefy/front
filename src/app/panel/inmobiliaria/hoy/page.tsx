import { redirect } from 'next/navigation'

/**
 * `/panel/inmobiliaria/hoy` → Inicio (`/panel/inmobiliaria`).
 *
 * 🟡 PI-32 (QA-PILOTO 04-10-2026; PILOTO-ACTIVO): esta pantalla seguía viva
 * sin ningún enlace que la abriera, con textos de la versión vieja («ERP · CRM ·
 * Autopilot, todo en uno», «Autopilot activo · N agentes ejecutando», «Insights
 * & Alertas» de ejemplo). Lo que mostraba —los bloques de cada sistema y el
 * estado del Piloto— ya lo dicen Inicio, el menú y la página del Piloto, con
 * las cifras de verdad.
 *
 * La ruta se conserva redirigiendo, como `recorrido/`: alguien la puede tener
 * guardada.
 */
export default function HoyRedirect() {
  redirect('/panel/inmobiliaria')
}
