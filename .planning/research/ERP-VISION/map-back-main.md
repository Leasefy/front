# ERP Vision Capability Map — `back-main` (Monolith Backend Candidate)

**Repo:** `/Users/nicolasgarcia/rent/back-main`
**Mapped:** 2026-05-29
**Verdict in one line:** This is **NOT an ERP engine**. It is a freshly-scaffolded NestJS starter at **Phase 2 of 10**, containing only Foundation + Auth/Users. Even its *own* roadmap targets a rental-marketplace MVP with AI risk-scoring ("Arriendo Fácil"), **not** the ERP/CRM/Autopilot vision. Every ERP/financial domain (D1–D11, D16) is **MISSING** — no entities, no controllers, no services.

---

## Tech Stack (verified)

| Concern | Tech | Evidence |
|---|---|---|
| Framework | NestJS 11 (TypeScript, ESM, strict) | `package.json` (`@nestjs/* ^11`), `nest-cli.json`, `src/main.ts` |
| ORM | Prisma 7.x (with `@prisma/adapter-pg`) | `package.json` (`@prisma/client ^7.3.0`), `prisma/schema.prisma`, `src/database/prisma.service.ts` |
| DB | PostgreSQL via Supabase | `prisma/schema.prisma` (`provider = "postgresql"`), `configuracion-supabase.md` |
| Auth | Supabase Auth + Passport JWT (JWKS verification) | `src/auth/strategies/supabase.strategy.ts`, `jwks-rsa`, `passport-jwt` |
| API docs | Swagger (`@nestjs/swagger`) at `/api` | `src/main.ts` |
| Health | `@nestjs/terminus` at `/health` | `src/health/health.controller.ts` |
| Tests | Jest | `package.json`, `test/` |

**Entire source tree** (`src/`): `app.*`, `auth/` (guards, strategies, decorators), `common/` (filters, enums), `config/` (env validation), `database/` (Prisma service), `health/`, `users/`. That is the whole backend.

**Entire data model** (`prisma/schema.prisma`, 44 lines): a single `User` model (`id, email, role[TENANT|LANDLORD|BOTH], activeRole, firstName, lastName, phone, timestamps`) + `Role` enum. **No other models exist.**

**Entire DB migration set** (`supabase/migrations/`): one file `00001_user_sync_trigger.sql` — a trigger that copies `auth.users` → `public.users`. No business tables.

**Endpoints that exist** (exhaustive):
- `GET /` (hello) — `src/app.controller.ts`
- `GET /health` — `src/health/health.controller.ts`
- `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/role` — `src/users/users.controller.ts`

Skeptical grep across `src/` for ERP terms (`contrato|factura|recaudo|cobranza|concili|egreso|cartera|tercero|propiet|payment|wompi|dian|pqrs|dispers`) returned **zero matches**.

---

## Domain Status

### D1 — Conciliación bancaria
**Status: MISSING** — No bank-import, no movement matching, no accounting posting. No related model/controller/service anywhere. Not on this repo's roadmap.

### D2 — Facturación (incl. DIAN e-invoicing, NC/ND, recurring)
**Status: MISSING** — No invoice entity, no DIAN integration, no IVA logic. `package.json` has no DIAN/e-invoice SDK. Not on roadmap.

### D3 — Recaudo & Cobranza (payment links, mora, escalation)
**Status: MISSING** — No payment-link generation, no payment provider (Wompi/etc.), no mora/cartera logic, no collections flow. Grep for `payment`/`wompi` → none. (Cobranza/collections live in the separate `Leasefy/agent` microservice, not here.)

### D4 — Egresos a propietarios (neto, comprobante, dispersión)
**Status: MISSING** — No owner-payout computation, no comprobante de egreso, no dispersal logic. No `Owner`/`Disbursement` model. Not on roadmap.

### D5 — Contratos & Firma (generation, e-sign, incrementos, renovaciones)
**Status: MISSING** — No contract entity, no template engine, no e-signature integration (Abaco/etc.), no increment/renewal scheduling. Explicitly "Out of Scope" in `.planning/PROJECT.md` ("Pagos/contratos reales — MVP valida flujo, transacciones después").

### D6 — Gestión documental (store/classify/expiry/risk-detect)
**Status: MISSING (planned, partial-future)** — No document storage or classification implemented today. The *roadmap* (Phase 4 "Applications & Documents" + Phase 6 "AI Document Analysis", `.planning/ROADMAP.md`) plans Supabase Storage uploads + Claude-based OCR/extraction for *applicant* docs (cédula, carta laboral, extractos) — but this is application-scoring document analysis, NOT contract/property documental management, and **none is built** (0/0 plans, status "Not started"). Research notes exist: `.planning/research/AI_DOCUMENT_ANALYSIS.md`.

### D7 — CRM / Captación / Propiedades
**Status: MISSING (planned)** — No `Property`/`PropertyImage`/`Lead`/`Application` models exist. Roadmap Phase 3 ("Properties" — CRUD, filtering, image upload) and Phase 4 ("Applications") plan basic property + application flows, but **0/0 plans, not started**. Data-model sketches only in `.planning/PROJECT.md`.

### D8 — Creación de propiedades por app móvil + audio
**Status: MISSING** — No mobile-capture, no audio-transcription pipeline. Not present, not on roadmap.

### D9 — PQRS / Solicitudes
**Status: MISSING** — No PQRS/ticket entity, no classify/route/assign logic. Not present, not on roadmap.

### D10 — Creación de terceros automatizada
**Status: MISSING** — No `Tercero`/counterparty model (the only person model is `User`, auth-synced). No cédula/RUT extraction. Roadmap's Phase 6 AI doc-analysis is for applicant scoring, not tercero prefill. Not built.

### D11 — Informes & Insights (cartera, helisa export, certificado tributario, proactive alerts)
**Status: MISSING** — No reporting endpoints, no Helisa export, no tributary certificates, no insight/alert engine. Not present, not on roadmap.

### D16 — Afianzadoras / seguros
**Status: MISSING** — No bonding/insurance integration, no garantías/coberturas entity. Not present, not on roadmap. (Insurance/cotizador work lives in `Leasefy/agent`, not here.)

---

## Cross-cutting notes (skeptical)

- **No mock dashboards either.** Unlike a UI repo, there is nothing to mistake for real — there is simply no ERP code at all (real or mock). The honest classification for D1–D11, D16 is uniformly **MISSING**.
- **Wrong product on the roadmap.** This backend's stated `Core Value` (`.planning/PROJECT.md`) is "Ejecutar el Risk Score con análisis inteligente de documentos" — a rental-applicant scoring marketplace, not an inmobiliaria ERP. If `back-main` were to become the ERP engine, essentially the entire ERP layer (terceros, contratos, facturación, recaudo, conciliación, egresos, cartera, reportes) would need to be built from zero.
- **Stage:** `.planning/STATE.md` reports 19% (6/31 plans), Phase 2/10 complete, last activity 2026-01-26. Phases 3–10 all "Not started" (0/0 plans).
- **Adjacent capabilities elsewhere:** Cobranza/collections (D3) and afianzadora/cotizador (D16) functionality is documented as living in the sibling `Leasefy/agent` microservice — none of it is in `back-main`.

## Bottom line
As an "ERP engine candidate," `back-main` provides only the substrate: NestJS + Prisma + Supabase Postgres + Supabase Auth + role-based guards. Useful as a foundation to build on, but it currently implements **0 of the 12 ERP/financial domains** in scope (D1–D11, D16). Every verdict above is MISSING.
