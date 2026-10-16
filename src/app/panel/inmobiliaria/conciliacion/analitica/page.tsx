import { redirect } from 'next/navigation'

/**
 * /panel/inmobiliaria/conciliacion/analitica — RETIRADA (QA de Portofino, 14-10-2026).
 *
 * Nico, sobre las analíticas que decían «no disponible»: «organízala». Esta
 * pantalla pintaba el resumen y los hallazgos del back —exactamente los mismos
 * que ya muestra el Resumen de Conciliación— y debajo un panel que pedía
 * `ai-hub/agentes/conciliacion/analitica` al micro, ruta que no existe: en cada
 * visita, un cartel de «no disponible». Lo real ya vive en el Resumen; lo que
 * no existe no se muestra (mismo criterio que la Analítica de Matching). La
 * ruta se conserva para que un enlace viejo no dé 404: manda al Resumen.
 */
export default function ConciliacionAnaliticaRetiradaPage() {
  redirect('/panel/inmobiliaria/conciliacion')
}
