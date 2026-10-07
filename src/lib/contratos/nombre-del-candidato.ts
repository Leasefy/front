/**
 * 🔴 QA-CONT-95 (C-26, 04-10-2026): el nombre del candidato al crear el
 * contrato desde una postulación. `GET /landlord/applications/:id` manda
 * `tenant: { firstName, lastName }`, no `tenantName`, y la pantalla decía
 * «Candidato: ·» vacío. Se lee lo que venga; sin nada, «—».
 */
export function nombreDelCandidato(app: unknown): string {
  const a = (app ?? {}) as { tenantName?: string | null; tenant?: { firstName?: string | null; lastName?: string | null } | null };
  const directo = a.tenantName?.trim();
  if (directo) return directo;
  const armado = [a.tenant?.firstName, a.tenant?.lastName].map((x) => x?.trim()).filter(Boolean).join(' ');
  return armado || '—';
}
