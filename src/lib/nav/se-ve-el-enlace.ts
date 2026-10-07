/**
 * ¿Este rol ve un enlace que sólo es de algunos roles? PURA.
 *
 * 🔴 FA-R31 (QA de Facturación, 03-10-2026): «Hoy» ofrecía «Facturación» a todos
 * los roles y la asesora caía en la pantalla negada. Nico: Facturación es sólo
 * de administrador y contador. Sin `roles`, el enlace es de todos; el
 * administrador de la plataforma lo ve siempre; mientras no se sabe el rol, lo
 * que tiene `roles` no se muestra (mejor aparecer un instante después que
 * ofrecer una puerta cerrada).
 */
export function seVeElEnlace(
  item: { roles?: readonly string[] },
  quien: { isAdmin: boolean; agencyRole: string | null; isLoading: boolean },
): boolean {
  if (!item.roles) return true;
  if (quien.isAdmin) return true;
  if (quien.isLoading || !quien.agencyRole) return false;
  return item.roles.includes(quien.agencyRole);
}
