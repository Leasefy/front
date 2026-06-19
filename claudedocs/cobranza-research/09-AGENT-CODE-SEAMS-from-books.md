# 09 — Seams de código del agente desbloqueados por los libros (handoff Víctor)

> De las ~217 técnicas destiladas (ver `08-libros-INTEGRADO.md`), éstos son los **enriquecimientos de código concretos** para el repo `Leasefy/agent`. Cada uno es **aditivo**, estilo B1/B2/B3 (suffix-only donde aplique, hereda el compliance existente, + casos de eval, + copy ES pendiente abogado). **Esta cuenta NO pushea `agent` — Víctor pushea.** Priorizado P1 (mayor impacto/menor riesgo) → P3.
>
> Antes de mergear cualquiera: Víctor corre `tsc` + `vitest` + `vitest.evals` (tests no están en CI) + revisión de copy ES.

---

## P1 — alto impacto, bajo riesgo, patrón ya probado

### P1-A · "Ledge bank" + control emocional → overlay de empatía (estilo B2)
- **Fuente:** Objections (Blount), De-Escalate (Noll), Crucial Conversations.
- **Qué:** primer-movimiento obligatorio ante hostilidad/objeción = un *ledge* de reconocimiento (no contenido) + **affect-labeling** ("suena a que esto lo tiene preocupado") ANTES de hablar de plata. Disciplina de no-reactividad (contagio emocional).
- **Dónde:** nuevo `src/mastra/lib/apply-deescalation-overlay.ts` (mismo patrón que `apply-nudges-overlay.ts`), inyectado en `hardship-counselor.ts` + el overlay de voz `state-overlays.ts` (DISCOVERY/NEGOTIATION_HARDSHIP). Banco de ~10 ledges en "usted".
- **Compliance:** los ledges NUNCA preguntan el motivo de la mora (Art. 7) — filtrar ese subconjunto. Suffix-only; `validateEmpathyResponse` sigue siendo la frontera.
- **Eval:** ante 10 mensajes hostiles, la respuesta abre con ledge aprobado, 0 reactividad, no pregunta "por qué no pagó".

### P1-B · Anti-patrones red-team → endurecer el linter + validateMessage
- **Fuente:** How to Collect Illegal Debts (Loompanics, red-team) → BLOCK-LIST de 19 (ver `cobranza-compliance-guardrails__LIBROS.md`).
- **Qué:** detectar y RECHAZAR las tácticas ilegales (amenaza de violencia/embargo falso, suplantación, contacto a terceros como palanca, vergüenza pública, etc.).
- **Dónde:** extender `findProhibitedTerms()`/`PROHIBITED_TERMS` en `cartera/scripts/template-loader.ts` (ya creado en Step A) + reglas en `compliance-guardrail.ts` (validateMessage). Patrón ya existe — sólo añadir entradas + tests.
- **Eval:** cada anti-patrón tiene un mensaje-trampa que el guardrail debe bloquear (fail-closed).

### P1-C · Handler de "red herring"/queja → ticket + retomar (objeciones, determinista)
- **Fuente:** Objections (PAIS de Blount), Hug Your Haters, A Complaint Is a Gift.
- **Qué:** cuando el deudor deflecta con una queja de habitabilidad/mantenimiento ("no pago por la gotera"), reconocer empáticamente → **crear ticket real** → retomar el plan colaborativamente. NO discutir, NO enterrar la queja (Estatuto del Consumidor).
- **Dónde:** nuevo handler determinista en `cartera/scripts/objection-handlers.ts` (extiende los 13 de Step A) + nueva tool `create-maintenance-ticket` (o evento Inngest a la inmobiliaria). Esto solapa con P2-A (servicio-recuperación).
- **Eval:** mensaje mixto (queja legítima + no-pago) → reconoce + enruta ticket + ofrece plan, no argumenta que la queja "no justifica".

---

## P2 — nueva capacidad (skill nueva), más diseño

### P2-A · Skill `servicio-recuperacion` → detector de queja + "defining moment"
- **Fuente:** Power of Moments (paradoja de recuperación), Never Lose a Customer (fases emocionales), Hug Your Haters.
- **Qué:** tratar la mora como oportunidad de relación: detectar disputa/queja/vulnerabilidad, enrutar a resolución real, y convertir un impago bien manejado en lealtad (pagos futuros + retención del propietario). Hereda compliance; nunca "servicio" como pretexto de presión.
- **Dónde:** capa conversacional nueva que coordina con `objeciones` + `empatia` + `escalation-router`; tool de ticket (P1-C); señales de fase emocional en `profile-inferer.ts`. Doc: `skills/cobranza-servicio-recuperacion.md`.
- **Riesgo:** es la pieza más nueva → diseñar el contrato con cuidado (no fork de compliance). Empezar por P1-C (el ticket) como primer incremento.

### P2-B · BIFF para mensajes hostiles → variante de plantilla (tono-whatsapp)
- **Fuente:** BIFF (Eddy), Strategic Writing for UX, Microcopy.
- **Qué:** respuesta **Brief, Informative, Friendly, Firm** a mensajes hostiles por WhatsApp (corta, factual, cálida, cierra el hilo) — de-escala sin alimentar la pelea.
- **Dónde:** nueva `ToneVariant`/template-variant (patrón `beneficio` 17.8-13) en `cartera/scripts/templates/` + selección cuando el sentimiento entrante es hostil. Meta-approved si es plantilla saliente.
- **Eval:** ante insulto, render BIFF: ≤4 líneas, sin defensividad, sin amenaza, opt-out presente.

### P2-C · Modo accesibilidad voz adultos mayores (script-voz)
- **Fuente:** Voice UIs for Older Adults, De-Escalate (pausa).
- **Qué:** ritmo más lento, confirmaciones explícitas, recuperación de error tolerante, una idea por turno — para deudores mayores en llamada.
- **Dónde:** overlay condicional en `voice-conductor`/`state-overlays.ts` activado por señal de edad/dificultad. Suffix-only.
- **Eval:** en modo accesibilidad, cada turno confirma comprensión y ofrece repetir; respeta Vapi budget.

---

## P3 — refinamientos (extienden seams existentes)

- **P3-A · Reenganche: memoria corta anti-repetición** — extender B1 (`reengagement-angle.ts`) para que `lastAngle` se lea del audit log y nunca repita un ángulo fallido; tope de toques → humano (Blount "tope de 2 + amenazas"). *(Ya estaba como "next step" de B1.)*
- **P3-B · Nudges: nuevas palancas honestas** — añadir al `apply-nudges-overlay.ts` (B2): previsibilidad-cumple-promesa (PTP), implementation-intentions reforzadas, framing de restauración.
- **P3-C · Segmentación: matriz de intensidad** — codificar la matriz valor×recuperabilidad (Salek) en `prioritizer.ts`/`cadence-orchestrator.ts` (intensidad = calidad+escalamiento, NUNCA más frecuencia).
- **P3-D · Métricas: nuevos KPIs + CES** — extender el `COBRANZA-KPI-CATALOG.md` con CES (customer effort score) y los KPIs de cartera; instrumentación ya fluye por `instrumented-generate`.
- **P3-E · Negociación: negociación investigativa** — enriquecer `NEGOTIATION_STRATEGIST_PROMPT` (suffix) con "diagnostica POR QUÉ no puede pagar" (sin preguntar el motivo de la mora — preguntar capacidad/opciones), palanca normativa (Shell), Framing/Proceso/Empatía (Malhotra).

---

## Regla transversal (no negociable)

Todo lo de arriba **hereda** `compliance-guardrails` y pasa por `validateMessage`/gates — **nunca** un segundo control plane. El prompt es ayuda de framing; la frontera de confianza es el guardrail. Copy deudor-facing = artefacto legal (Ley 1480/2300) → revisión de abogado antes de producción. Cifras de lift = hipótesis a A/B-testear localmente.
