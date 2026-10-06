/**
 * 🔴 El AUXILIAR DE CARTERA no entra a los BANCOS (COBRANZA-MANUAL, 04-10-2026).
 *
 * Espejo de `back/src/inmobiliaria/agency/permissions/el-auxiliar-de-cartera-no-ve-los-bancos.ts`:
 * la conciliación bancaria y la tesorería (convenios y archivos de recaudo del
 * banco) piden `cobros`, el mismo módulo con que el auxiliar ve la cartera y
 * hace recibos, y el back le responde 403 en esas rutas. Acá se esconde la fila
 * del menú y la pantalla dice «No tienes acceso» sin pedir nada: una fila que se
 * ve y rebota es una promesa rota.
 *
 * Nico (04-10-2026): el auxiliar «ve sólo cartera, estados de cuenta, cobranza
 * y acuerdos»; no ve giros, bancos, dispersiones, lotes ni contabilidad.
 */
import { AGENCY_ROLES, type AgencyRole } from '@/lib/auth/agency-roles'

/** Todos los roles menos el auxiliar de cartera (el módulo `cobros` se sigue pidiendo aparte). */
export const ROLES_QUE_VEN_LOS_BANCOS: readonly AgencyRole[] = (Object.values(AGENCY_ROLES) as AgencyRole[]).filter(
  (rol) => rol !== AGENCY_ROLES.AUXILIAR_CARTERA,
)

/**
 * 🔴 Y sólo cobra (04-10-2026, la recomendada; el orquestador vio en su menú
 * Chat, Contratos, Propietarios, Inquilinos, Documentos y Reportes). La matriz
 * del back ya le quita contratos, propietarios, documentos, tablero y reportes;
 * esto cubre lo que sólo se gatea por rol o por `cobros`:
 *   · el RECAUDO del mes (dice lo que salió en giros y lo que queda en la
 *     mano; el back le responde 403 en `inmobiliaria/recaudo/`).
 * El CHAT ya no está acá: CF-01 (decisión 12 de Nico, 05-10-2026) le abre el
 * chat al auxiliar, SÓLO de cartera; el micro le contesta lo de cartera con
 * consultas fijas y lo demás con calma que no le corresponde
 * (`agent/src/ai-hub/en-el-chat/chat-del-auxiliar.ts`).
 */
export const SIN_EL_AUXILIAR_DE_CARTERA: readonly AgencyRole[] = ROLES_QUE_VEN_LOS_BANCOS

/**
 * 🔴 IA95-34 (Nico, 05-10-2026 19:05): «Dejarlo conciliar». El auxiliar de
 * cartera ya concilia el banco desde el Piloto (Bandeja, con `cobros:create`);
 * para que no haya dos reglas distintas, también entra a la pantalla de
 * Conciliación (menú, pestañas y `PageGuard`). Lo que pide `cobros:edit`
 * (dejar fuera, reabrir, reversar un lote) o el rol de administrador o
 * contador (deshacer, firmar y reabrir el cierre) lo sigue cerrando cada
 * botón, igual que el back. La tesorería y el recaudo por convenio siguen
 * cerrados (`ROLES_QUE_VEN_LOS_BANCOS`). Espejo del back
 * (`el-auxiliar-de-cartera-no-ve-los-bancos.ts`: la conciliación salió de
 * `RUTAS_DE_LOS_BANCOS`).
 */
export const ROLES_QUE_CONCILIAN: readonly AgencyRole[] = [
  AGENCY_ROLES.ADMIN,
  AGENCY_ROLES.CONTADOR,
  AGENCY_ROLES.AUXILIAR_CARTERA,
]
