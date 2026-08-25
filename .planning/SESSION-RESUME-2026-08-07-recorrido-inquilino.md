# Sesión 2026-08-07 — Vocabulario + recorrido del inquilino

**Punto de retome. Leé esto primero.** Sucede al de 2026-08-06 (que sigue valiendo para el
detalle de la sidebar). Todo vive en `~/rent/mvp-inmobiliaria`, rama
**`feat/experiencia-inmobiliaria`**.

---

## Estado: COMMITEADO, sin pushear

**9 commits** sobre `develop` (`dcab5284`), árbol limpio. La rama **todavía no existe en
`origin`** — el push y el PR los decide Nico.

`pnpm build` **corrido y verde** (245 páginas). ⚠️ Correrlo mata los chunks del `next dev` que
comparte `.next`: parar el dev antes, y reiniciarlo después.

---

## Dónde corre todo

| Servicio | Puerto | Notas |
|---|---|---|
| Front de este trabajo | **3002** | `npx next dev -p 3002` (el `-p 3001` está hardcodeado en `pnpm dev`) |
| Front de Nico | 3001 | **no tocar** |
| Monolito | 3000 | `~/rent/back` |
| Agente | 4100 | `~/rent/agent-develop`, rama `fix/voice-first-turn-latency` |

Node 20 obligatorio: `export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"`.
Levantar desacoplado (`nohup … & disown`).

---

## 1. Vocabulario — CERRADO (`docs/VOCABULARIO.md`)

Es la ley de cómo se llaman las cosas, compañera de `DESIGN.md`.

**La raíz del problema:** "estudio" nombraba **tres** cosas — asegurabilidad, scoring A/B/C/D, y
`propertyType.studio` (apartaestudio). La tercera no salió en la reunión y estaba en producción.
Además "aplicación" y "postulación" eran el mismo objeto con dos nombres, partidos por panel.

| Concepto | Inquilino | Agencia |
|---|---|---|
| Consulta a aseguradoras | **aprobación** | **asegurabilidad** |
| El número | **tope aprobado** | **máximo afianzable** |
| Scoring A/B/C/D | *(no lo ve)* | **evaluación de candidatos** |
| Ofrecerse a una propiedad | **postulación** | **postulación** |

**Muertos:** "pre-aprobado", "reevaluar", "aplicación" (es), "estúdiate ahora".
`propertyType.studio` → **apartaestudio**.

Aplicado: 29 claves i18n exactas + 14 por barrido + `PREAPPROVED`→"En revisión" en agencia.
**El panel de propietario quedó sin tocar a propósito** (ahí es un embudo coherente).

---

## 2. Recorrido del inquilino (pasos 1→6) — CONSTRUIDO

Se arrancó por el premio (4-5), no por el formulario: sabiendo cómo se ve el resultado, el form
y el pago tienen un trabajo obvio.

| Paso | Qué es | Archivos clave |
|---|---|---|
| 4-5 | **"Mi aprobación"** — 4 estados, el número como héroe | `lib/api/aprobacion.service.ts(+test)` · `app/inquilino/aprobacion/page.tsx(+test)` |
| 1, 6 | **Gate de postulación** — el botón se queda y enseña el camino | `components/tenant/PostularButton.tsx(+test)` · `lib/hooks/use-aprobacion.ts` · `StickyCTA` · `PropertyDetailSheet` |
| 5 | **Catálogo con el tope** — lo que se pasa se ve marcado | `components/tenant/TopeAprobadoBanner.tsx` · `inquilino/para-ti/page.tsx` |
| 2 | **Estudio sin propiedad** — canon opcional | `app/aprobacion/form-logic.ts(+test)` · `app/aprobacion/page.tsx` |
| 3 | **Pago Wompi** — un precio, todas las aseguradoras | `app/api/estudio/wompi-session/route.ts(+test)` |

### Reglas de experiencia fijadas en código, con test

- **El botón "Postularme" nunca se esconde ni se deshabilita.** Sin aprobación abre el camino.
- **Sin tope conocido NO se bloquea** — no se le niega algo a alguien por un dato que falta.
- **Lo que se pasa del tope se ve**, marcado y con el motivo.
- **El precio del estudio no se inventa**: sin `ESTUDIO_PRECIO_COP` el endpoint da 503.
- **Dígitos de más en el celular se rechazan, no se recortan** — recortar mandaría el SMS a un
  número que la persona nunca escribió.
- **Un resultado de demo se anuncia como demo** (`stubMode`).

### `/preaprobacion` → `/aprobacion`

Ruta renombrada + **redirect 308 permanente** (en `next.config.mjs`), porque el link ya se envía
por WhatsApp a candidatos. Header con logo real (`LeasefyLogotype`) + botón outline `✕ Cerrar`
que vuelve a donde vino, o al panel/catálogo si llegó por link directo.

---

## 2-bis. El después del resultado (agregado el 08-07, tarde)

Faltaba la mitad que hace valer todo: **qué pasa cuando el resultado sale.**

**El hueco de fondo:** el resultado vivía en el estado de React y moría al navegar.
Y quien llega por link de WhatsApp **no tiene cuenta**, así que el catálogo tampoco tenía a quién
preguntarle. El recorrido se cortaba justo en el punto que lo hace valer.

| Pieza | Archivo |
|---|---|
| **El puente** — el resultado se guarda y sobrevive a la navegación, con o sin cuenta | `lib/api/aprobacion-local.ts(+test)` · `lib/hooks/use-aprobacion.ts` |
| **Tres pantallas de resultado**, una por veredicto | `components/tenant/ResultadoAprobacion.tsx(+test)` |
| **El catálogo público se personaliza** (antes solo `/inquilino/para-ti`) | `property/PropertySearchView.tsx` · `property/PropertyGrid.tsx` (prop opcional) |
| **La referencia** — tope vs canon consultado, que NO son lo mismo | `lib/api/aprobacion.service.ts` (`referenciaCanon`, `superaReferencia`) |

**Las tres respuestas, tres experiencias:**
- **Aprobado** → el número al frente + puerta al catálogo que ya le sirve.
- **Con condiciones** → sigue siendo un sí. Se explica la condición en palabras normales
  ("piden un codeudor o un depósito"), y **no frena**: va al catálogo igual que un aprobado.
- **No aprobado** → *no es un callejón*. Tres salidas, la primera la que más se usa en Colombia:
  que otra persona sea la titular. Hay test que lo protege.

**Reglas nuevas fijadas en código:**
- **Un resultado de demo NO se guarda.** Persistirlo dejaría al catálogo afirmando una aprobación
  falsa en pantallas que ya no avisan que era demo.
- **Tope ≠ canon consultado.** El tope es un techo; el canon consultado es apenas un punto
  confirmado. Se etiquetan distinto ("aprobado **hasta**" vs "aprobado **para**") y la marca sobre
  las tarjetas cambia ("por encima de tu tope" vs "por encima de lo que consultaste — un asesor
  puede revisarlo"). Tratarlos igual le pondría a la persona un techo que nadie calculó.
- **La banda no se le muestra a inmobiliaria ni a propietario** en el catálogo público: la
  aprobación es del inquilino. Anónimo sí la ve — es el caso principal.
- **Sin cuenta, "Ver detalle" lleva a crear cuenta**, no a `/inquilino/aprobacion` (que exige
  sesión y lo mandaría al login justo después de aprobarse).

**El error "el servicio no está disponible" ya no sale en desarrollo.** Antes solo degradaban
404 y 503; ahora degrada **cualquier** fallo del servidor y también el agente caído. Siguen
visibles 429 y 422, que sí dicen algo cierto sobre lo que se envió. En producción no se tapa nada.

Verificado en navegador de punta a punta: los tres veredictos, el guardado, y el catálogo
marcando 6 tarjetas por encima de la referencia.

### El número: son DOS y no significan lo mismo

Corrección de dominio de Nico (2026-08-07): **cuando se consulta SIN propiedad, la aseguradora
(Fianli) devuelve el monto máximo.** Ese es justamente el caso donde SÍ hay cifra — yo lo tenía al
revés y la pantalla decía "todavía no tienes un monto", que es falso.

| Dato | De dónde sale | Cómo se dice | Sirve para |
|---|---|---|---|
| **Máximo afianzable** (`maxAfianzableCop`) | consulta **sin** canon | "Te afianzamos **hasta** $X" | es un techo → filtra el catálogo |
| **Canon consultado** | la persona escribió una cifra y se la aprobaron | "Aprobado **para** $X" | punto confirmado, NO un techo → por encima se ofrece revisar, no se descarta |

El máximo entra como `topeAprobadoCop` (el tope de verdad) y le gana al canon consultado.

🔴 **Contrato que le falta al agente.** Verificado en `estudio-backend-gaps:src/server/routes/
funnel-preaprobacion.ts`: hoy devuelve solo `{ asegurabilidad, aseguradoras, stubMode, message }`
y **exige `canonCop`** (`z.number().int().positive()`). O sea **el caso "sin propiedad" ni siquiera
se puede ejecutar** contra el backend real. Faltan dos cosas, no una:
1. `canonCop` **opcional**
2. `maxAfianzableCop` en la respuesta

El front ya está listo: llega en `null`, la UI lo dice sin inventar, y se prende solo cuando llegue.
La demo local sí lo trae (2.800.000) para que el caso se pueda ver y construir.

---

### Pasada de Cadence sobre todo el recorrido

**El vocabulario real de tokens no es el de `DESIGN.md`.** Verificado contra `globals.css`:
`--surface: #ffffff` (superficie elevada) y `--surface-muted: #f4f2ef` (fondo hundido).
`surface-raised` / `surface-sunken` / `error-bg` / `fg-secondary` que nombra el doc **no existen**
(0–5 usos en todo el repo). Los alias shadcn (`bg-card`, `text-muted-foreground`) sí resuelven
—son capa de compat en 238 archivos— pero no son Cadence.

Corregido en lo del recorrido:
- **Header fijo** en `/aprobacion` (`sticky top-0 z-20`, patrón de `WizardShell`). El resultado
  es largo y la salida se quedaba arriba fuera de alcance. Lenis usa scroll nativo → `sticky` va.
- `bg-card`→`bg-surface`, `bg-muted`→`bg-surface-muted`, `text-muted-foreground`→`text-fg-muted`,
  `text-destructive`/`bg-destructive/10` → `text-danger`/`bg-danger-soft`.
- **`backdrop-blur` eliminado** de `SobreTopeOverlay` — glass morphism sobre contenido está
  prohibido (§1 y §9). Superficie sólida, se lee igual.
- `<button>` crudo → `Button variant="link"`.
- Tile de icono `rounded-lg` → `rounded-md` (§4 Tinted Icon Tiles).

Limpio: sin gradientes en tarjetas, sin `shadow-xl`, sin z-index fuera de escala, solo Phosphor,
números en `font-mono tabular-nums`, botones pill sentence-case por el primitivo.

**Gap NO cerrado — i18n (§6).** `/aprobacion` y `ResultadoAprobacion` tienen el español
hardcodeado. **Hay dos locales de verdad** (`es.json` + `en.json`) y **19 de 23** pantallas de
inquilino usan `useI18n()`, así que estas son la excepción. La página ya venía así de
`/preaprobacion`. Son ~45 claves × 2 locales: decisión de Nico si se hace ahora.

---

## 3. Bugs encontrados y arreglados (no eran del alcance, aparecieron mirando)

| Bug | Alcance real |
|---|---|
| **Selects no scrolleaban** — faltaba `data-lenis-prevent` (DESIGN.md §8) | **Todos los selects de la app** con >10 opciones. También `dropdown-menu` y `popover`. El popover tenía un `onWheel+stopPropagation` que **no funciona** (Lenis escucha en `window`) |
| **Doble flecha** en CTAs — el `Button` ya pone la suya | 4 lugares |
| **Texto cortado en el diálogo** — dos botones en fila superaban el `max-w-md` | `PostularButton` |
| **KPIs a 5 columnas desde `sm`** — 134px por card en 1024 | `portafolio/page.tsx` |
| **Celular sin límite** — se podía escribir `31178899000000` | `lib/phone/countries.ts` + `ui/phone-field.tsx` (solo Colombia) |

---

## 4. 🔴 EL BLOQUEO: el funnel del agente no está pusheado

Verificado por tres vías independientes:

```
OpenAPI del agente vivo (:4100):  181 rutas · 0 con funnel/preaprob/tenant
origin/develop:                    NO tiene funnel-preaprobacion.ts
origin/main:                       NO tiene funnel-preaprobacion.ts
Ramas LOCALES que sí la tienen:    11 (estudio-backend-gaps +77 comm., tenant-funnel-f1/f2/f3,
                                   stack/08-funnel, stack/12-funnel-f45, matching-backend-gaps…)
```

**Víctor la construyó y funciona** — es una torre completa de tenant-funnel, no un endpoint
suelto. **Pero nunca salió de local.** Lo que hay que pedirle no es "conectalo" sino
**"pusheá el funnel"**.

Mientras tanto el front **no queda roto**: en desarrollo un 404 degrada a un resultado de
ejemplo marcado con `stubMode`, y la pantalla lo dice. En producción el mismo 404 sigue siendo
error visible (hay un test por cada lado).

---

## 5. Estado de calidad

`tsc --noEmit` limpio · **218 archivos / 1742 tests** · `next lint` limpio
(el único warning es previo, en `use-pendientes.ts` de cobranza).

**`pnpm build` NUNCA se corrió** — es el gate que el CI no cubre y que ya rompió Vercel antes.
Ver [[project-mvp-ci-build-gap]]. **No dar la rama por mergeable sin correrlo.**

---

## 6. Qué sigue

**Panel de inmobiliaria (pasos 7→11)** — es lo que quedó acordado como siguiente:
ficha de candidato · bandeja de "aprobados sin gestionar" con envejecimiento · quitar
evaluar/reevaluar del inmueble · comparar candidatos mostrando la condición del negocio, no solo
el puntaje · arrastrar aseguradora + ID al contrato.

Ya hay cimientos sin usar: **`funnel-applications.service.ts`** está escrito, con mocks y tests,
para la bandeja de postulaciones de la agencia (**el paso 7**) y **ninguna UI lo consume**.

### Deuda anotada

- **"Pre-aprobado" sigue vivo** en `/inquilino/aplicaciones` (estados) y en
  `/propiedades/[id]/candidatos` (el botón **"Pre-aprobar candidato"** — es una *acción*, no una
  etiqueta: cambiarlo toca semántica). Y en el panel de propietario, dejado a propósito.
- **Consignaciones vs Inmuebles**: dos entidades distintas que se ven iguales. Consignación =
  el mandato (comisión, vigencia, contrato firmado); Inmueble = la ficha publicable. Los datos
  del inmueble están **copiados** dentro de la consignación (`// denormalized for convenience`),
  así que pueden desincronizarse. Y hay tres nombres para lo mismo: ruta `portafolio`, menú
  "Consignaciones", título "Portafolio".
- `lib/phone/countries.ts` es reusable: hay ~4 lugares más con `+57` hardcodeado.
- El pago (paso 3) tiene el endpoint pero **no la pantalla**: necesita un `solicitudId` que el
  backend todavía no devuelve.
