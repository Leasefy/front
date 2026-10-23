import { redirect } from 'next/navigation'

/**
 * Revisora r25 (C9 y bloqueante de Plantillas, ronda 26): «Playbooks» se ocultó
 * por decisión de Nico (2026-08-08, NOTA en `agentWorkspaceNav.ts`): qué dice
 * el agente lo definimos nosotros, y editar o publicar aquí no cambiaba lo que
 * dice Mori (`agent.script_templates` no la lee nadie en runtime). La ruta
 * seguía viva para quien llegara por un enlace: una pantalla que prometía algo
 * que no hace. Como Equipo, quien la tenga guardada aterriza donde sí se
 * configura lo que el agente puede ofrecer: Configuración.
 *
 * El editor se conserva en `EditorDePlantillas.tsx` (con sus pruebas) por si
 * el runtime pasa a leer la tabla: entonces se vuelve a montar aquí.
 */
export default function PlantillasDeCobranzaRetiradas(): never {
  redirect('/panel/inmobiliaria/pagos/cobranza/configuracion')
}
