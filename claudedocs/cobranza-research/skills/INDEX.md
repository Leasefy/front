# Sistema de Skills de Cobranza — Índice y Arquitectura

**14 skills** portables para alimentar el agente autónomo de cobranza (arriendo residencial, inmobiliarias Colombia, WhatsApp + voz). Todas heredan la capa de compliance. Destiladas de la investigación en `../01..06` (ver `../00-SKILL-TAXONOMY.md`).

> 📚 **ENRIQUECIMIENTO DE 27 LIBROS (2026-06-03):** cada skill tiene un doc `cobranza-<skill>__LIBROS.md` al lado con técnicas nuevas destiladas de 27 libros (651 técnicas → ~217 sintetizadas), filtradas por Ley 2300. **Skill 14 NUEVA:** `cobranza-servicio-recuperacion` (servicio/CX, pedida por 13 libros). `compliance-guardrails` suma un **BLOCK-LIST de 19 anti-patrones** (red-team). Índice maestro: **`../08-libros-INTEGRADO.md`**. Seams de código para el agente (Víctor-gated): **`../09-AGENT-CODE-SEAMS-from-books.md`**. Todo aditivo; copy deudor-facing pendiente revisión abogado.

**Principio rector:** cobranza ética y 100% compatible con **Ley 2300/2023, Sentencia T-323/2024, Ley 1581 Habeas Data (+1266/2157), Estatuto del Consumidor 1480**. La tasa de cobro sube por *canal preferido + autoservicio 24/7 + un único toque semanal excelente + nudges honestos + planes asequibles* — **no** por frecuencia (la ráfaga multicanal es ilegal en Colombia).

> 🛑 **REALITY CHECK (auditoría 2026-06-03 del repo `~/rent/agent`):** la mayoría de estas skills **ya están implementadas en producción** (los 3 gates de compliance, segmentación/cadencia, A/B testing, negociación, hardship, PTP, plantillas). Usa estos playbooks para **ALINEAR / ENRIQUECER el código existente, NUNCA para reconstruir** — un set de módulos paralelo forkearía el compliance (anti-patrón prohibido). Mapa skill→archivo + plan aditivo: **`~/rent/agent/.planning/COBRANZA-SKILLS-INTEGRATION.md`**. Decisiones: 9 align (doc) · 3 enrich-prompt (reenganche, nudges, saludos) · 2 extend-templates (objeciones, tono-lint) · **0 módulos nuevos**. Único gap material de comportamiento: `reenganche` no rota el ángulo del mensaje.

---

## Capas

| Capa | Skills | Rol |
|---|---|---|
| **Base (transversal)** | `cobranza-compliance-guardrails` | Gate que envuelve TODO. Expone `canContact()`, `validateMessage()`, `requiresHumanReview()`. Ninguna otra skill envía sin pasar por aquí. |
| **Orquestación / decisión** | `cobranza-segmentacion-cadencia`, `cobranza-metricas-experimentacion` | Deciden a quién, cuándo, por qué canal, con qué oferta; y miden/optimizan. |
| **Conversación** | `cobranza-saludos-apertura`, `cobranza-empatia-deescalacion`, `cobranza-objeciones`, `cobranza-negociacion`, `cobranza-planes-pago-hardship`, `cobranza-ptp-compromisos`, `cobranza-reenganche`, `cobranza-nudges-conductuales` | Producen la **intención** + variables (qué decir y por qué), no el texto final. |
| **Entrega / render** | `cobranza-tono-whatsapp`, `cobranza-script-voz` | Renderizan la intención a español colombiano final (WhatsApp microcopy / guion de voz). |

---

## Flujo de invocación (runtime)

```
                 ┌──────────────────────────────────────────────┐
                 │  cobranza-compliance-guardrails (BASE)        │
                 │  canContact() · validateMessage() ·          │
                 │  requiresHumanReview()                        │
                 └──────────────────────────────────────────────┘
                        ▲ (gate) ▲ (gate)            ▲ (gate)
   nueva señal          │        │                   │
 (mora / respuesta /    │        │                   │
  pago / PTP rota)      │        │                   │
        │               │        │                   │
        ▼               │        │                   │
  segmentacion-cadencia ┘        │                   │
  (capacidad×voluntad,           │                   │
   etapa S0–S5, VAR,             │                   │
   next-best-action) ──► elige skill conversacional  │
        │                        │                   │
        ▼                        │                   │
  [conversación]  saludos → (empatía) → objeciones → negociacion → planes-pago → ptp-compromisos
                  reenganche (si ghosting/PTP rota) · nudges (capa de optimización sobre el mensaje)
        │ producen intención + variables                          │
        ▼                                                          │
  [render]  tono-whatsapp  |  script-voz  ──validateMessage()──►  envío
        │                                                          │
        ▼                                                          │
  metricas-experimentacion  ◄── registra cada evento, atribuye, A/B, realimenta
```

**Reglas de oro del flujo:**
1. **Nada se programa** sin `canContact()` (horario, frecuencia 1/día + 1 canal/semana, canal autorizado, destinatario válido).
2. **Nada se envía** sin `validateMessage()` (honestidad, prohibidos, disclosures, opt-out, tono).
3. **Acciones de alto impacto** (reporte a centrales, pre-jurídico, condonación de capital, vulnerabilidad/disputa) → `requiresHumanReview()` = `true`, el agente **no decide solo** (T-323).

---

## Skills (one-liners)

| Skill | Capa | Etapas | Qué hace |
|---|---|---|---|
| [`compliance-guardrails`](./cobranza-compliance-guardrails.md) | base | S0–S5 | Codifica la ley como límites duros + 3 funciones de gate. |
| [`segmentacion-cadencia`](./cobranza-segmentacion-cadencia.md) | orq. | S0–S5 | Clasifica (capacidad×voluntad), ubica etapa, prioriza VAR, elige next-best-action. |
| [`metricas-experimentacion`](./cobranza-metricas-experimentacion.md) | orq. | — | KPIs + champion/challenger con holdout para validar el lift real en CO. |
| [`saludos-apertura`](./cobranza-saludos-apertura.md) | conv. | S0–S5 | Apertura: saludo + identificación + encuadre; verificación de identidad en voz. |
| [`empatia-deescalacion`](./cobranza-empatia-deescalacion.md) | conv. | S0–S5 | Reconocer emoción antes de solución; de-escalar sin interrogar el motivo. |
| [`objeciones`](./cobranza-objeciones.md) | conv. | S0–S5 | 13 objeciones canónicas → respuesta compatible + guion + enrutamiento. |
| [`negociacion`](./cobranza-negociacion.md) | conv. | S2–S5 | Intereses no posiciones, criterios objetivos, BATNA neutro, cierre con plan si-entonces. |
| [`planes-pago-hardship`](./cobranza-planes-pago-hardship.md) | conv. | S1–S5 | Planes asequibles + hardship con dignidad; condonación de capital → humano. |
| [`ptp-compromisos`](./cobranza-ptp-compromisos.md) | conv. | S0–S5 | Captura/confirma/seguimiento de promesas (fecha+monto+medio) + recordatorio + recibo. |
| [`reenganche`](./cobranza-reenganche.md) | conv. | S1–S5 | Recupera ghosting / PTP rota sin subir frecuencia ni reprochar. |
| [`nudges-conductuales`](./cobranza-nudges-conductuales.md) | conv. | S0–S5 | Economía del comportamiento honesta sobre mensaje y oferta (fricción cero, framing %). |
| [`tono-whatsapp`](./cobranza-tono-whatsapp.md) | entrega | S0–S3 | Render WhatsApp 1-1-1-1-1, Lenguaje Claro, CTA único, opt-out. |
| [`script-voz`](./cobranza-script-voz.md) | entrega | S2–S5 | Guion de llamada: open → verificación → escucha → propuesta → PTP → cierre. |

---

## Cableado al agente Mastra (`~/rent/agent`) — plan propuesto

1. **Compliance como gate, no como prompt suelto.** Implementar `canContact/validateMessage/requiresHumanReview` como funciones/herramientas reales (TS) que el scheduler (pre-cola) y el pre-envío llaman. El playbook tiene el pseudocódigo + tablas (horario, caps, disclosures, gate de centrales).
2. **Segmentacion-cadencia = el orquestador** que decide la next-best-action y qué sub-skill activar (su contenido alimenta el prompt del agente orquestador + las reglas del cron de cadencia).
3. **Skills conversacionales = módulos de conocimiento/prompt** que el agente consulta por situación/etapa (system prompt por etapa, o retrieval). Producen *intención + variables*.
4. **tono-whatsapp / script-voz = render** final → pasa por `validateMessage()` antes de enviar.
5. **metricas-experimentacion = event log + A/B** (tablas en Postgres + el panel ya existe en mvp/admin).

> Mejor hacerlo en una sesión dentro de `~/rent/agent` (ver la arquitectura real de prompts/tools del agente Mastra). Estos archivos son portables: se copian a `agent/src/.../cobranza/skills/` o se cargan como knowledge.

## Ingesta de libros (PDFs)
Cuando lleguen los PDFs, por cada uno: extraer → mapear a la(s) skill(s) que alimenta (ver `../06-libros-fuentes.md`) → enriquecer las secciones *Fundamento* y *Guiones* → **re-pasar por el filtro de compliance**. Orden sugerido: marco legal CO + Asobancaria (compliance) → Voss + Fisher/Ury (negociacion, empatia) → Cialdini (nudges) → Scarcity/Nudge (planes-hardship, nudges).

## ⚠️ Validación pendiente
Las cifras de lift (US/UK/McKinsey/TrueAccord) son **hipótesis a probar en Colombia** vía champion/challenger (`metricas-experimentacion`), no hechos garantizados. Los guiones CO-ES deben revisarse con un abogado/compliance local antes de producción.
