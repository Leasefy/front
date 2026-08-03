# 08 — Integración de 27 libros al agente de cobranza (índice maestro)

> **Qué es:** el resultado de leer a fondo **27 libros** y destilarlos en técnicas accionables, filtradas por compliance colombiano, y volcadas a las skills del agente. Generado 2026-06-03 (3 workflows: 27 agentes de extracción → 651 técnicas → 14 agentes de síntesis → 14 docs).
>
> **Cómo se hizo (sin gastar de más):** cada libro → 1 agente lo leyó completo y extrajo técnicas estructuradas (nombre, resumen, a qué skill alimenta, cómo aplicar en CO, guion, **filtro Ley 2300**, caso de eval). Las 651 técnicas se agruparon por skill y 14 agentes escribieron los docs de enriquecimiento (slice → archivo). Sólo se destiló (principios/marcos), **no se copió** texto de los libros (derecho de autor).
>
> ⚠️ **Todo el copy deudor-facing queda pendiente de revisión por abogado/compliance antes de producción** (Ley 1480/2300 = artefacto legal).

---

## Lo que cambió (de un vistazo)

| | Antes | Ahora |
|---|---|---|
| Skills | 13 | **14** (+`cobranza-servicio-recuperacion`) |
| Fuente de técnicas | research `01–06` | + **27 libros destilados** (651 técnicas → ~217 sintetizadas) |
| Compliance | 3 gates | + **BLOCK-LIST de 19 anti-patrones** (red-team Loompanics) |

**Decisión de arquitectura:** enriquecer las 13 skills existentes + crear 1 skill nueva donde había gap real (servicio/CX, pedida por 13 libros). **NO** se crearon módulos paralelos de compliance (forkearía el control plane — prohibido). Todo aditivo: cada skill base queda intacta; el enriquecimiento vive en `cobranza-<skill>__LIBROS.md` al lado.

---

## Mapa skill → enriquecimiento (técnicas nuevas)

| Skill | Archivo | Técnicas nuevas | Aportes destacados de los libros |
|---|---|---|---|
| compliance-guardrails | `cobranza-compliance-guardrails__LIBROS.md` | 13 + **BLOCK-LIST 19** | red-team de tácticas ilegales a detectar/rechazar; OECD nudge-vs-manipulación |
| segmentacion-cadencia | `…segmentacion-cadencia__LIBROS.md` | 16 | matriz de intensidad por valor/recuperabilidad; timeline con condiciones de salida; "earlier not more" (Salek); decision-rules/ML (papers) |
| metricas-experimentacion | `…metricas-experimentacion__LIBROS.md` | 24 | KPIs de cartera, tamaño de muestra, champion/challenger; CES (effort score) como métrica de servicio |
| saludos-apertura | `…saludos-apertura__LIBROS.md` | 12 | aperturas pregunta-primero (Carter/Ask), accusation-audit reforzado, microcopy de saludo |
| empatia-deescalacion | `…empatia-deescalacion__LIBROS.md` | 18 (+3 meta, +2 PROHIBIDO) | **affect-labeling** (Noll, 90s), control emocional + "ledges" (Blount), make-it-safe + STATE (Crucial Conversations), EI remoto (HBR) |
| objeciones | `…objeciones__LIBROS.md` | 24 | PAIS para "red herrings" (Blount), turnaround Ledge→Disrupt→Ask, biblioteca de excusas filtrada |
| negociacion | `…negociacion__LIBROS.md` | 12 | 6 cimientos + palanca normativa (Shell), negociación investigativa (Malhotra/Bazerman), Framing/Proceso/Empatía (Negotiating the Impossible) |
| planes-pago-hardship | `…planes-pago-hardship__LIBROS.md` | 12 | deal-design de planes asequibles; paradoja de Stockdale (realismo + esperanza) |
| ptp-compromisos | `…ptp-compromisos__LIBROS.md` | 12 | concreción + compromiso (Cialdini), implementation-intentions, previsibilidad-cumple-promesa |
| reenganche | `…reenganche__LIBROS.md` | 10 | memoria corta anti-repetición, tope de toques + escalar a humano, encuadre de restauración (Power of Moments) |
| nudges-conductuales | `…nudges-conductuales__LIBROS.md` | 13 | REDUCE/reactancia (Catalyst), fricción cero (Effortless), framing honesto; takeaway marcado PROHIBIDO |
| tono-whatsapp | `…tono-whatsapp__LIBROS.md` | 20 | microcopy (Yifrah), voz-y-tono por etapa (Podmajersky), **BIFF** para mensajes hostiles |
| script-voz | `…script-voz__LIBROS.md` | 13 | accesibilidad voz adultos mayores (pace/confirmación/recuperación de error), pausa psicológica, prosodia match-then-lead |
| **servicio-recuperacion (NUEVA)** | `cobranza-servicio-recuperacion.md` | 18 | **paradoja de recuperación de servicio** (Power of Moments), abrazar quejas (Hug Your Haters), fases emocionales (Never Lose a Customer), enrutar reparaciones reales a ticket |

---

## Los 27 libros (procedencia)

**Cobranza / cartera / ops (8):** Accounts Receivable Management Best Practices (Salek 2005) · Collection Management Handbook (Coleman) · Mastering the Art of Collections (Brennan & Clark) · Collections 101 (Besser) ⚠️filtro alto · Loan Collection Techniques (Espiritu) ⚠️ · Debt Collection Model for Mass Receivables (Jankowski & Paliński 2024) · Towards a Smart Debt Collection System (Przybyłek 2025) · Credit and Collection Management Practices (ICEBM 2019).
**Negociación (4):** Bargaining for Advantage (Shell) · Negotiation Genius (Malhotra & Bazerman) · Negotiating the Impossible (Malhotra) · Ask Like an Auctioneer (Bondi) adyacente.
**Persuasión / comportamiento (1):** The Catalyst (Berger).
**Empatía / de-escalación / EI (4):** De-Escalate (Noll) · Crucial Conversations · HBR Emotional Intelligence Boxed Set · Virtual EI (HBR).
**Servicio / CX (3):** The Power of Moments (Heath) · Hug Your Haters (Baer) · Never Lose a Customer Again (Coleman).
**Objeciones (1):** Objections: The Ultimate Guide (Blount) ⚠️filtro sales.
**Copy / UX / voz (3):** Microcopy (Yifrah) · Strategic Writing for UX (Podmajersky) · Voice UIs for Older Adults (Islam 2025).
**Anti-patrón / red-team (1):** How to Collect Illegal Debts (Harold S. Long, Loompanics) — **NO** como técnica; sólo para endurecer el guardrail.
**Off-domain / bajo rendimiento (2):** How to Change It (Virasami, activismo) · Copywriter's Guide to Getting Paid (Furr, carrera de copywriting).

**No utilizable:** el `.crdownload` quedó corrupto (descarga incompleta) — re-descargar para incluirlo.

---

## Cómo esto llega al agente (pipeline)

1. **KB (hecho):** estos docs = la fuente de verdad destilada (vive en `rent/mvp`, repo de research).
2. **Código del agente (siguiente, Víctor-gated):** convertir las técnicas de alta prioridad en enriquecimientos aditivos del agente (estilo B1/B2/B3) — ver `09-AGENT-CODE-SEAMS-from-books.md`. Cada uno: aditivo, suffix-only donde aplique, + casos de eval, + nota "pendiente abogado", y **Víctor pushea** el repo `agent`.
3. **Eval:** cada cambio de comportamiento añade casos a `vitest.evals`; Víctor corre `tsc`+`vitest`+`vitest.evals` antes de mergear (tests aún no en CI).

> Las cifras de "lift" de los libros (US/UK/crédito de consumo) son **hipótesis a A/B-testear** en arrendamiento residencial colombiano, no metas. La frontera de confianza sigue siendo el guardrail (`validateMessage`/gates), no el prompt.
