import { redirect } from 'next/navigation'

/**
 * /postulaciones/asegurabilidad/comparar — OCULTA. Redirige al Resumen.
 *
 * Era una maqueta: la matriz criterio × aseguradora tenía los criterios
 * escritos a mano (`CRITERIA`) y las columnas eran barras grises sin ningún
 * dato detrás; el propio archivo se rotulaba «UX-only». No leía del micro y
 * no había consulta en vivo que comparar.
 *
 * La ruta se conserva porque estuvo en la lista de pestañas y pudo quedar
 * enlazada; la pestaña se retiró de `agentWorkspaceNav.ts` (ver la nota al
 * pie). Cuando la comparación en vivo tenga endpoint, la pantalla vuelve.
 */
export default function CompararOcultaPage() {
  redirect('/panel/inmobiliaria/postulaciones/asegurabilidad')
}
