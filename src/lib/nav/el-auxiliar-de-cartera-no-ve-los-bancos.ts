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
 *   · el CHAT del panel (responde sobre todo el negocio: giros, contabilidad,
 *     propietarios), y
 *   · el RECAUDO del mes (dice lo que salió en giros y lo que queda en la
 *     mano; el back le responde 403 en `inmobiliaria/recaudo/`).
 */
export const SIN_EL_AUXILIAR_DE_CARTERA: readonly AgencyRole[] = ROLES_QUE_VEN_LOS_BANCOS
