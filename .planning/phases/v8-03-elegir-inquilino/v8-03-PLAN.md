# v8-03 · Elegir inquilino (F2) — PLAN

**Goal:** reemplazar el shell de `/panel/seleccion` con el flujo real de elección: listar procesos,
comparar postulados **asegurables** lado a lado y elegir **one-click con WYSIWYS** — degrade honesto
mientras el back esté flag-OFF. Aditivo, sin tocar inmobiliaria.

## Contrato del back (verificado en `portal-propietario-eleccion.ts`)

| Endpoint | Shape |
|---|---|
| `GET /procesos` | `[{ id, propertyRef, propertyLabel, status, chosenCandidacyId: string|null, createdAt, updatedAt }]` |
| `GET /procesos/{id}/comparacion` | `{ processId, status, snapshotHash, candidates: [{ id, candidateName, stage, insurabilityVerdict: string|null, score: number|null, status, elegible }] }` |
| `POST /procesos/{id}/eleccion` | body `{ candidacyId, snapshotHash }` (strict) → `{ processId, status: 'seleccionado'|'contrato_habilitado', chosenCandidacyId, decidedAt }` |

**Invariantes del back que el front respeta:**
- **WYSIWYS:** la elección DEBE reenviar el `snapshotHash` de la comparación mostrada. Si el set cambió,
  el back rechaza (`terms_changed`) — el front vuelve a cargar y avisa, NO fuerza.
- **CAS single-winner:** si otro click ganó, el back rechaza (conflict) — el front muestra el motivo.
- **Candidato mínimo (anti-PII, LEGAL Q2/Q5):** el back NO expone cédula/email/evaluationId/buró.
  El front muestra SOLO los campos del shape (nombre, verdict de asegurabilidad, score, elegible).
- **Solo elegibles se pueden elegir** (`elegible: true`).

## Sub-plan v8-03-01 — Types + service + hooks
- `owner-seleccion.types.ts` — 4 tipos exactos.
- `ownerPost` agregado a `owner-portal.http.ts` (semántica de acción: distingue terms_changed/conflict).
- `owner-seleccion.service.ts` — `getProcesos`, `getComparacion`, `elegir` (usa `ownerPost`).
- Hooks: `useOwnerProcesos()`, `useOwnerComparacion(processId)`.

## Sub-plan v8-03-02 — Lista de procesos (`/panel/seleccion/page.tsx`)
- loading→Spinner; unavailable→"Próximamente"; data→lista de procesos con propiedad, estado y
  CTA "Comparar postulados" (→ detalle). Marca los que esperan tu elección.

## Sub-plan v8-03-03 — Comparación + elección (`/panel/seleccion/[processId]/page.tsx`)
- Cards de candidatos lado a lado: nombre, verdict de asegurabilidad, score, badge elegible.
- Botón "Elegir" SOLO en elegibles → `ConfirmDialog` ("habilita el contrato") → `elegir()` con el
  `snapshotHash` de la comparación mostrada.
- Manejo de resultado: éxito → estado "elegido"; `terms_changed` → recargar + aviso; conflict → aviso;
  unavailable → "Próximamente". Sin optimismo: el estado lo fija el back.

## Gates
- tsc + `next build` verdes (`/panel/seleccion`, `/panel/seleccion/[processId]`).
- Cero imports de inmobiliaria; inmobiliaria intacto.
- **WYSIWYS**: la elección envía el `snapshotHash` de la comparación en pantalla (no uno stale).
- **Anti-PII**: el front no renderiza ni pide campos fuera del shape mínimo.
- Sin data falsa: con back flag-OFF → "Próximamente".
