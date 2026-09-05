# Sesión 2026-08-08 (noche) — Panel de inmobiliaria: recorrido, lanzador y sidebar

**Punto de retome de la rama `feat/recorrido-inmobiliaria`.** Sucede al de
`SESSION-RESUME-2026-08-08-panel-inquilino.md` (PR #63, lado del inquilino), que sigue valiendo.
Todo en `~/rent/mvp-inmobiliaria`.

---

## 🟡 Estado

**Rama `feat/recorrido-inmobiliaria` — 26 commits, pusheada, árbol limpio. SIN PR todavía.**

| Compuerta | |
|---|---|
| `tsc --noEmit` · `next lint` · **`pnpm build`** | ✅ |
| 227 archivos / **1846 tests** | ✅ |

Sale de `feat/experiencia-inmobiliaria` (PR #63). Cuando #63 mergee, el diff de esta se
reduce a lo suyo. **Decidir la base del PR en ese momento.**

---

## ✅ RESUELTO — entrar un inmueble es siempre una consignación

Nico, 2026-08-08: *"una inmobiliaria nunca va a tener un inmueble que no tiene propietario,
por eso siempre es una nueva consignación"*. Es una **regla de negocio**, no una preferencia
de UI: vale en todo el panel de agencia.

Había **cuatro** formas de crear un inmueble sin dueño, todas con el mismo origen —formularios
del panel del PROPIETARIO (que es dueño de lo suyo y no tiene a quién declarar) reutilizados
en el de agencia—:

| Dónde | Iba a | Ahora |
|---|---|---|
| Lanzador «Nuevo» → «Nuevo inmueble» | `/propiedades/nueva` | **eliminado** |
| Inmuebles · catálogo → «Nueva propiedad» | `/publicar` | «Nueva consignación» |
| Paleta de comandos → «Crear propiedad» | `/publicar` | «Nueva consignación» |
| Captura con IA falla → «Crear manual» | `/propiedades/nueva` | consignación |

También cambió **el segmento principal del SplitButton**: era el último flujo abierto y quedó
mostrando «Nuevo contrato» —justo el que NO arranca en frío—. Ahora es **fijo: la
consignación**. Un botón que dice algo distinto cada vez que se mira es un historial, no un
punto de partida.

⚠️ `/panel/inmobiliaria/propiedades/nueva` quedó **huérfana**: ya nadie la enlaza. No se borró
(borrar rutas es aparte); si se confirma que no la usa nadie más, es candidata a irse.

---

## ✅ RESUELTO — el orden: asegurabilidad primero, A/B/C/D después y solo

Nico, 2026-08-08: *"la nueva evaluación de inquilino no es para ABCD, es para literal ver si lo
aseguran o no; y ya si lo aseguran, y luego de que postule el usuario, ya ahí sí entramos con
su información a hacer la validación del inquilino, que se inicia de manera automática pero
también se podría hacer a demanda."*

| | Asegurabilidad | Evaluación A/B/C/D |
|---|---|---|
| Pregunta | **¿lo respaldan o no?** (+ máximo afianzable) | ¿cuál de estos candidatos? |
| Cuándo | **primero**, sin propiedad | después de la **postulación** |
| Quién la dispara | una persona, **en frío** | **sola**; a demanda se re-corre |

El lanzador ofrecía «Nueva evaluación de candidato» como algo que se empieza en frío —invertía
el orden— y encima llevaba a `/ai/estudio/nuevo`, que **no guarda nada**: su botón responde
*"Próximamente: esto creará el estudio…"*. Se sacó. Queda la asegurabilidad, con copy que
lleva la pregunta binaria adelante y que dice dónde quedó el A/B/C/D.

⚠️ Ya estaba escrito en `docs/VOCABULARIO.md` §Evaluación y en `pasos.ts` (2 vs 8), y el
lanzador igual decía lo contrario. **Leer los nombres no alcanza: mirar el orden.**

---

## Lo que se construyó

### El recorrido (pasos 7→11)

- **`src/lib/recorrido/pasos.ts`** — los 11 pasos definidos una sola vez, con `actor`
  (**de quién es la pelota**, que es lo que los hace legibles).
- **`RecorridoHilo`** — tira compacta montada en la cola de estudio (8), candidatos (9/10) y
  contrato nuevo (11). Aditiva: ninguna pantalla se movió.
- **`RecorridoMapa`** — los 11 con el corte «ACÁ CAMBIA DE MANOS» entre el 6 y el 7.

⚠️ **Hubo una pantalla `/recorrido` y era un error de estructura.** Mostraba *las
postulaciones de la gente con su estado* — o sea `/postulaciones`, la fila de abajo en el mismo
menú. Dos rutas y dos filas para una cosa, el mismo defecto que los dos «Documentos». La
distinción que yo había escrito ("lee otro embudo") era del BACKEND, no de quien opera.

**El recorrido no es un destino, es el contexto de esa lista**: el mapa se mudó adentro de
`/postulaciones` —ocupa el vacío cuando no hay nada, plegado cuando hay trabajo—, la fila se
fue del sidebar y `/recorrido` redirige. De paso murieron los seis KPI en cero sobre el vacío.

Quedan **huérfanos**: `use-recorrido-postulaciones.ts` y `funnel-applications.service.ts` (ya
nadie los monta). No se borraron; el funnel del agente sigue sin desplegar.

### El lanzador «Nuevo» (debajo del buscador)

`src/lib/inmobiliaria/flujos.ts` + `BotonNuevo.tsx`. Decisiones que costaron ida y vuelta:

1. **Es un `SplitButton` del DS**, no un botón con menú: `+` y chevron juntos prometían dos
   cosas contradictorias.
2. **El segmento izquierdo es siempre la consignación** (`FLUJO_PRINCIPAL`). Hubo una versión
   que mostraba el último flujo abierto: se cambió porque quedó ofreciendo «Nuevo contrato»,
   el único que no arranca en frío. Ver el bloque ✅ de arriba.
3. **La explicación aparece una sola vez por flujo** (`arriendo-facil-flujo-visto-*`).
4. **`selector?: 'postulacion'`** — un flujo que no arranca en frío abre su paso previo en vez
   de navegar. Lo usa contrato.
5. Se llama **«Nuevo», no «Nuevo ingreso»**: en Finanzas "ingreso" es plata que entra.

### El selector de postulación

`SelectorPostulacion.tsx`. Arregla que **«Nuevo contrato» llevaba a un error** —
`/contratos/nuevo` lee `?applicationId=` y sin él muestra *"Falta el parámetro applicationId"*.
Ofrece solo `APPROVED` sin contrato previo. Se pide sus datos al abrir.

**Eran cuatro puertas al mismo error**, no una: `/contratos` (defecto anterior a esta sesión),
el lanzador, el **paso 11 del mapa del recorrido** y **«Nuevo contrato» en el buscador**. Las
dos últimas aparecieron recién al mirar los `href` en pantalla. Las cuatro cerradas: las que no
tienen de dónde sacar el id llevan al listado, donde el botón sí pregunta.

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
- **Cuenta de agencia que funciona:** `agencia.demo.1786238152@leasefy-dev.co` / `<contraseña en 1Password>`
  (creada vía admin API + onboarding contra :3010).
- ⚠️ `qa.inmobiliaria@leasefy-dev.co` quedó **trabada**: el back la tiene como `TENANT`.

---


### Contraste y color (2026-08-09)

Tres defectos distintos, todos encontrados **midiendo**, no mirando:

1. **`neutral-*` ya es sensible al tema.** `dark:text-neutral-100` invierte dos veces y en
   oscuro da `hsl(40 8% 14%)` —casi negro—. El título de `EmptyState` era invisible en
   **51 pantallas**. Migrado a tokens semánticos.
2. **`bg-ink/NN` no genera CSS.** `bg-ink` solo sí (`rgb(20,19,15)`). Con `bg-white/60
   dark:bg-ink/60` ganaba el blanco: panel BLANCO en cajón oscuro. Barridos los 34.
3. **`bg-fg-muted` es token de TEXTO usado como fondo** — disco gris con el icono del mismo
   color exacto, invisible.

Medición final del cajón de candidato: 28 textos, **peor ratio 4.94**, ninguno bajo AA.

### Tocar una postulación abre a ESA persona

`/postulaciones` llevaba a la lista de candidatos del inmueble sin abrir a nadie — parecía que
el clic no hacía nada. Ahora navega con `?candidato=<id>` y la pantalla destino abre el cajón.
La fila además **no existía para el teclado** (`<tr>` con `onClick`): lleva `role="button"`,
`tabIndex`, `aria-label` y Enter/Espacio.

⚠️ El mock de la tabla en el test **reenviaba solo `onClick`** y descartaba el resto: habría
dado verde con la fila igual de inalcanzable. Arreglado y verificado contra el DOM real.

## ▶️ Sigue — en este orden

### 1. Qué falta para el recorrido completo (pregunta de Nico, 2026-08-09)

| # | Paso | Estado | Falta |
|---|---|---|---|
| 1 | Catálogo | ✅ | — |
| 2 | Asegurabilidad | ✅ real | wizard 3 pasos que sí llama al agente |
| 3 | **Paga el estudio** | 🔴 **no existe** | pasarela + ciclo formulario → pago → vuelve → procesa |
| 4 | Contra TODAS las aseguradoras | 🟡 **sin verificar** | ¿consulta a todas? ¿devuelve binario + máximo afianzable? |
| 5 | Habilitar compatibles | 🟡 **sin verificar** | ¿filtra de verdad por el tope? |
| 6 | Postularse a varias | ✅ | — |
| 7 | Alerta a la agencia | 🟡 | vive en `/postulaciones`; **el funnel no está pusheado** |
| 8 | Estudio A/B/C/D | 🟡 | `/ai/estudio/nuevo` **no guarda** ("Próximamente"); el disparo automático es del agente |
| 9 | **Comparar candidatos** | 🔴 **no existe** | hay lista, no comparación lado a lado |
| 10 | Aceptar candidato | 🟡 | a los no elegidos **no se les avisa**, y se les prometió |
| 11 | Contrato | 🟡 | **no registra qué aseguradora aprobó ni su ID** |

**Front acotado:** 3, 9, 10, 11. **Lo demás depende del back/agente** (ver §🔴).
**Primero verificar 4 y 5** contra el agente corriendo — no se probaron nunca.

### 2. Barrido de clases con opacidad muertas

📌 **`docs/CLASES-OPACIDAD-MUERTAS.md`** — 166 formas, **944 usos**, lista verificada contra
los 7 CSS del build. **NO es un `sed`**: `bg-danger/20` hoy pinta nada y `bg-danger` daría un
bloque rojo sólido; iba `bg-danger-soft`. Varios se apoyan hoy en el fondo del padre y se ven
bien — darles color sería la regresión. Mapa por familia dentro del documento.

### 3. Auditoría de estados de carga (pedido de Nico)

*"TODO, absolutamente todo, tenga carga previa para mostrar lo real que hay ahí."*

Caso testigo verificado: `/propiedades/{id-inexistente}/candidatos` responde
**«Algo salió mal · `Property with ID … not found`»** — inglés crudo del backend, y encima
ofrece «Intentar de nuevo» sobre un 404, que es una promesa falsa.

Hoy se colapsan **cuatro** estados en uno. Hay que separarlos ruta por ruta:

| Situación | Debe decir |
|---|---|
| Cargando | skeleton (donde aplique) o spinner |
| No existe (404) | «Esa propiedad ya no está» + volver, **sin** reintentar |
| Falló la red | «No pudimos cargar» + reintentar |
| Existe y está vacío | el estado vacío |

### 4. Abrir el PR cuando #63 mergee.
