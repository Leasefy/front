# Disputas, Acuerdos y tres bugs del design system

**Sesión 2026-08-09** · ramas `fix/habeas-data-arco` (mvp, **54 commits**) y
`fix/arco-triage-status-constraint` (agent-develop, **12**) · **nada pusheado**.

Continúa `SESSION-RESUME-2026-08-09-cobranza-datos-reales-y-tablas.md`.

---

## La frase que resume la sesión

> **Un componente puede ser el del DS y aun así no ser el que usa el resto.**

Tres veces pasó lo mismo: yo importaba de `@leasefy/cadence` directo, y el
panel usa el **adaptador local** de `@/components/ui`. Se ve parecido y compila
igual, pero cambia el tamaño, el tema y el comportamiento.

---

## 1 · Los tres bugs del DS (aplican a TODO el panel)

### Los diálogos no estaban centrados

`animate-scale-in` anima `transform: scale(...)` con `animation-fill-mode:
forwards`. Los diálogos se centran con `left-1/2 -translate-x-1/2`, que Tailwind
resuelve DENTRO de `transform`: la animación lo pisa y el `forwards` lo deja
pisado para siempre.

```
viewport 1600, diálogo de 1024
antes → left  800 · right 1824   (se salía 224px)
ahora → left  288 · right 1312   (centrado)
```

Con el ancho por defecto (480px) no se sale, sólo queda descentrado — por eso
llevaba tiempo sin verse. **Había DOS definiciones del keyframe** (`tailwind.config.ts`
y `globals.css`, esta última escrita «for badges») y ganaba la de CSS.
Se corrigieron las dos: animar `scale`, que **compone** con `transform` en vez
de reemplazarlo. Commit `94165574`.

### Con un modal abierto, la rueda movía el fondo

Radix bloquea el scroll **nativo** del body (react-remove-scroll). Lenis no
scrollea por ahí: escucha la rueda en `window`. El freno va ahora en los
adaptadores de Dialog y Sheet —le pasaba a los 21 modales y a todos los
cajones— y vive en el `Content`, que sólo está montado mientras está abierto.

`SelectContent` tampoco tenía `data-lenis-prevent`: una lista larga no
scrolleaba con el mouse, sólo con las flechitas de Radix. Commit `8473dc67`.

### El Badge crudo ≠ el Badge del panel

| | crudo (`@leasefy/cadence`) | adaptador (`@/components/ui`) |
|---|---|---|
| tamaño | `size="sm"` → h-5 / 11px | fija `md` → h-6 / 13px |
| variante azul | `info` = **hex crudo** `#E6F0FA` | `default` → `primary`, con tokens |

El `info` del DS **no es sensible al tema**: en oscuro se queda celeste claro.
Acuerdos y Disputas usan ahora el adaptador, como Pagos. Commit `01b2e1c3`.

⚠️ Lo mismo con Dialog: **21 archivos** usan el adaptador local, ~6 el crudo.
El canónico es el local.

---

## 2 · Permisos: «no tienes acceso» antes de saberlo

Cobranza mostraba «No tienes acceso» y un segundo después entraba.

**Causa raíz**: `auth.isLoading` se libera ANTES que la sonda de membresía de
agencia (es fire-and-forget). Queda un tramo con sesión válida y `agency` en
null, y con `agencyId` null el fetch de permisos del agente **ni se dispara**.
Como cobranza y cotizador fallan CERRADO, «no se pudo preguntar» se leía como
«denegado». Lo que cierra el caso legítimo es `agencyMembershipChecked`.

`agentAccessStatus` reemplaza al booleano por **tres** estados:

```
resolviendo    → esqueleto
sin-verificar  → «No pudimos verificar tu acceso» + reintentar
resuelto       → canAccess manda
```

El tercero importa: si «el agente no contestó» se colapsara en «resuelto», una
caída del servicio volvería a decir «no tenés acceso». Asegurabilidad tenía el
defecto idéntico; ambas comparten `AgentModuleGate`. Commit `f16688d4`.

---

## 3 · Disputas

- **El CTA principal era imposible**: pedía el UUID del deudor escrito a mano,
  y ese UUID sólo vive en la barra de direcciones. → `DebtorPicker` que busca
  por nombre o cédula (hasheada, los dígitos no salen del navegador).
- **Las tarjetas decían «Deudor ••A3F2C1»**: el endpoint no unía el nombre.
  Ahora sí, con caída a id enmascarado. No es exposición extra — la lista de
  deudores ya lo devuelve en claro.
- **Un solo nombre**: el nav decía «Disputas» y la pantalla «Controversias».
- **Maestro-detalle**: era una columna con `max-w-3xl` y media pantalla vacía.
  La lista elige; el panel muestra el motivo completo y resuelve. La
  recomendación del backend, que se pedía y se **tiraba**, ahora se muestra.

Commits `a0d7ecc5`, `27541b65`, `a34065f0`, `f3b02d7e`.

---

## 4 · Acuerdos de pago: de dos pantallas a una

Eran dos pestañas para la misma pregunta. La diferencia era técnica, no de
negocio:

| | `/promesas` | `/acuerdos` |
|---|---|---|
| tabla | `payment_promises` (45 en demo) | `payment_plans` (**0 en los 3 tenants**) |
| qué es | monto + fecha, de una llamada | cuotas, descuento, link de pago |

Se fusionaron en **una** pestaña con tabla (Card → filtros → tabla →
paginación), detalle en cajón y alta en modal. Commits `1ef41568`, `6e7a017e`,
`46354c49`.

### ⚠️ El hallazgo de fondo, sin resolver

**Ningún agente puede crear un plan de cuotas.** Verificado en código:

- El Closer sólo tiene `recordPromise`, `generatePaymentLink`,
  `scheduleFollowUp`, `sendWhatsAppTemplate`.
- SÍ negocia cuotas (`calculatePaymentPlan` en `negotiation-strategist` y
  `hardship-counselor`), pero lo que persiste es una PROMESA: `recordPromise`
  sólo acepta `amountCop` + `dueDate`. **El cronograma recién calculado se
  pierde** — no hay ni campo para guardarlo como texto.
- `persistOfferedPlan` (`agent/src/cartera/payment-plans/wompi-link.ts`) crearía
  el plan con su link de pago, y **nadie la invoca**: aparece como
  `void persistOfferedPlan` para callar al linter.

O sea: **el negocio hace acuerdos y el sistema los guarda como promesas.**

### El «acuerdo general» ya existía

Lo que Nico pedía —«si el deudor cabe en estas condiciones, el agente lo toma»—
vive en la política de la agencia (`allowedPaymentPlans`, `maxDiscountPct`,
`minPaymentCop`, `negotiationMaxAttempts`, `allowHardshipPath`), la edita
Configuración §Negociación y **el agente ya la lee**. Faltaba que se viera desde
Acuerdos: tarjeta de sólo lectura + vuelta con `?volver=acuerdos`.
Commits `707d4b1a`, `fec4ba1e`.

---

## 5 · Otros arreglos

- **Los últimos 4 hooks que se saltaban `agentFetch`** (`e9d051c9`). El peor,
  Analítica: disparaba las SEIS peticiones con el mismo token viejo, así que el
  tablero entero caía junto. Van 42/42.
- **El interruptor de aprobación humana se veía APAGADO** (`f584f96d`). Un
  Switch `checked` + `disabled` se pinta gris —igual que uno apagado— mientras
  el de al lado, encendido, se pinta azul: gris `rgb(213,209,202)` vs azul
  `rgb(26,64,255)`, los dos con `aria-checked="true"`. De fondo no era estilo:
  **no es un ajuste**, es una invariante. Ahora se enuncia («🔒 Siempre»).
- **7 badges armados a mano** → Badge/StatusBadge del DS (`5f48fa88`).
- **Las promesas de demo vencían antes de registrarse** — las 45. Reparado en
  el agente (`55ff72a9`), con verificación y rollback si no queda coherente.

---

## Estado

`tsc` limpio en ambos · front **1.659 tests** · agente **7.754** (2 fallos
previos: cotizador-cost-aggregator y full-call-path) · lint limpio · verificado
en el navegador con Playwright. **Nada pusheado.**

## Lo que sigue

1. **Marcar una promesa como cumplida / reprogramarla** no existe: el agente
   sólo expone `GET /cobranza/promises`. Necesita ruta nueva + permiso +
   auditoría + efecto sobre la máquina de cartera. **Decisión de producto.**
2. **Que el agente persista el plan** que negocia — o un paso «convertir en
   acuerdo» desde la tabla. Sin eso, `payment_plans` sigue en cero.
3. `agentPermsResolved` vive con **otra forma** en `feat/recorrido-inmobiliaria`
   (`~/rent/mvp-inmobiliaria`); se dejó el flag con semántica compatible para
   que ese merge no choque.
4. **El demo no tiene una sola llamada real** — costo y cumplimiento seguirán
   vacíos ahí por más cableado que se haga.
