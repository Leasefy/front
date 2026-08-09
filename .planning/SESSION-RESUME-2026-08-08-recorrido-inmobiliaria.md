# Sesión 2026-08-08 (noche) — Panel de inmobiliaria: recorrido, lanzador y sidebar

**Punto de retome de la rama `feat/recorrido-inmobiliaria`.** Sucede al de
`SESSION-RESUME-2026-08-08-panel-inquilino.md` (PR #63, lado del inquilino), que sigue valiendo.
Todo en `~/rent/mvp-inmobiliaria`.

---

## 🟡 Estado

**Rama `feat/recorrido-inmobiliaria` — 11 commits, pusheada, árbol limpio. SIN PR todavía.**

| Compuerta | |
|---|---|
| `tsc --noEmit` · `next lint` · **`pnpm build`** | ✅ |
| 227 archivos / **1838 tests** | ✅ |

Sale de `feat/experiencia-inmobiliaria` (PR #63). Cuando #63 mergee, el diff de esta se
reduce a lo suyo. **Decidir la base del PR en ese momento.**

---

## ⚠️ PREGUNTA ABIERTA — es lo primero al retomar

**¿Una inmobiliaria publica alguna vez un inmueble que NO administra?**

De la respuesta depende un cambio de dos líneas en `src/lib/inmobiliaria/flujos.ts`:

En el lanzador «Nuevo» conviven **«Nueva consignación»** y **«Nuevo inmueble»**, y las dos
llaman a `propertiesApi.create()`. La diferencia real, leída del código:

| | Nueva consignación (`/portafolio/nuevo`) | Nuevo inmueble (`/propiedades/nueva`) |
|---|---|---|
| Propietario | **Sí, es el paso 1** | **No lo pide — cero menciones en el archivo** |
| Comisión · agente · inventario | Sí | No |
| Publica al catálogo | No | **Sí** |

O sea: **«Nuevo inmueble» crea una propiedad sin propietario.** Para una agencia es una ficha
a medias. Ese formulario parece hecho para el **propietario** (dueño de lo suyo) y reutilizado
en el panel de agencia.

- Si la respuesta es **NO** → sacar `inmueble` de `FLUJOS`.
- Si es **SÍ** → se queda, pero renombrado para que la diferencia se vea
  (*«Publicar sin consignar»*) y avisando que queda sin propietario.

---

## Lo que se construyó

### El recorrido (pasos 7→11)

- **`src/lib/recorrido/pasos.ts`** — los 11 pasos definidos una sola vez, con `actor`
  (**de quién es la pelota**, que es lo que los hace legibles).
- **`RecorridoHilo`** — tira compacta montada en la cola de estudio (8), candidatos (9/10) y
  contrato nuevo (11). Aditiva: ninguna pantalla se movió.
- **`RecorridoMapa`** — los 11 con el corte «ACÁ CAMBIA DE MANOS» entre el 6 y el 7.
- **`/panel/inmobiliaria/recorrido`** — la casa del paso 7, que no existía. Cola por
  antigüedad; con la bandeja vacía el mapa ocupa el lugar del vacío.

### El lanzador «Nuevo» (debajo del buscador)

`src/lib/inmobiliaria/flujos.ts` + `BotonNuevo.tsx`. Decisiones que costaron ida y vuelta:

1. **Es un `SplitButton` del DS**, no un botón con menú: `+` y chevron juntos prometían dos
   cosas contradictorias.
2. **El segmento izquierdo muestra el ÚLTIMO flujo que esa persona usó**, no una preferencia
   fija nuestra. Todos los flujos ya tienen su botón donde viven, así que fijar uno duplicaba
   algo a un clic. Arranque: `FLUJO_INICIAL = 'consignacion'`.
3. **La explicación aparece una sola vez por flujo** (`arriendo-facil-flujo-visto-*`).
4. **`selector?: 'postulacion'`** — un flujo que no arranca en frío abre su paso previo en vez
   de navegar. Lo usa contrato.
5. Se llama **«Nuevo», no «Nuevo ingreso»**: en Finanzas "ingreso" es plata que entra.

### El selector de postulación

`SelectorPostulacion.tsx`. Arregla que **«Nuevo contrato» llevaba a un error** —
`/contratos/nuevo` lee `?applicationId=` y sin él muestra *"Falta el parámetro applicationId"*.
Pasaba desde `/contratos` (defecto anterior a esta sesión) y desde el lanzador.
Ofrece solo `APPROVED` sin contrato previo. Se pide sus datos al abrir.

### El sidebar

- **Ningún icono repetido.** Se veían dos (`House`, `CurrencyDollar`); el tercero
  (`FileText` en Cotizador y Documentos) apareció solo al renombrar, porque el extractor
  deduplicaba por etiqueta. Ahora deduplica por `href`.
- **«Documentos · revisión» → «Soportes de candidatos»**: había dos filas llamadas
  «Documentos». Término agregado a `docs/VOCABULARIO.md`.
- Guarda: **`src/app/panel/inmobiliaria/nav-sidebar.test.ts`** — icono repetido, clave de
  etiqueta repetida, texto en español repetido, y ninguna fila que dependa de un `hint`.

---

## 🔴 Lo que falta del back → `HANDOFF-VICTOR-RECORRIDO-INMOBILIARIA.md`

1. **`AGENT_API_KEY` falta en el `.env` del back** → *todo* onboarding de inmobiliaria muere
   en 400. Se agregó al `.env` local (backup `.env.bak-claude`).
2. **Un fallo de aprovisionamiento traba la cuenta para siempre** ("contacta a soporte").
3. **Una agencia recién registrada recibe 401 de TODO el agente**: el camino ES256 resuelve la
   agencia buscando al usuario en `agency_members`, y `provision` crea el tenant sin membresía
   —la crea el magic link de `POST /onboarding/start`—.
4. ¿`applicationId` del funnel == `id` de `/landlord/candidates`? El front cruza y degrada.
5. `/ai/estudio/[id]` espera un **runId de scoring**, no un `applicationId`: del paso 7 no se
   puede saltar al 8.
6. El **funnel sigue sin pushear**.

---

## 🔧 Entorno local (importante para retomar)

- **El back de :3000 es de Nico, corriendo desde `dist/` sin watch desde el 6 de agosto.**
  No tomó la env nueva y NO se reinicia.
- **Se levantó una SEGUNDA instancia del back en `:3010`** (`PORT=3010 node dist/src/main`
  desde `~/rent/back`), que sí tiene `AGENT_API_KEY`.
- El front de `:3002` se levanta apuntando ahí:
  `NEXT_PUBLIC_BACKEND_URL=http://localhost:3010 pnpm dev -p 3002`
- **Cuenta de agencia que funciona:** `agencia.demo.1786238152@leasefy-dev.co` / `PRueba123#`
  (creada vía admin API + onboarding contra :3010).
- ⚠️ `qa.inmobiliaria@leasefy-dev.co` quedó **trabada**: el back la tiene como `TENANT`.

---

## ▶️ Sigue

1. Resolver la pregunta abierta de arriba (consignación vs inmueble).
2. Pasos **9** (comparar lado a lado), **10** (los no elegidos quedan sin estado — y al
   inquilino le prometimos avisarle) y **11** (no registra qué aseguradora aprobó ni su número).
3. Abrir el PR cuando #63 mergee.

**Anotado sin tocar:** la pantalla de Soportes muestra cinco KPI en cero encima del estado
vacío (andamiaje sobre vacío). Y quedan **~12 operaciones simuladas** en el panel de
inmobiliaria — PR aparte.
