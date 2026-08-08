# Plan — Que la reunión pase de verdad

Reunión del 2026-08-06 (Juan · Víctor · Nico). Este doc convierte esa conversación en
trabajo ejecutable de front, sobre `feat/experiencia-inmobiliaria`.

La agrupación de la sidebar (Comercial · Administración · Finanzas) ya está hecha —
ver `SESSION-RESUME-2026-08-06-experiencia-inmobiliaria.md`. **Esa era la parte fácil.**
Lo de acá es el cambio de verdad: hoy el producto es *property-first* y la reunión pidió
que sea *candidate-first*.

---

## 1. Las decisiones que quedaron firmes

Filtrando el ida y vuelta, esto es lo que quedó acordado:

| # | Decisión | Quién la cerró |
|---|---|---|
| D1 | El estudio se hace **sin propiedad**. Primero se estudia la persona, después elige. | Juan, Nico |
| D2 | El estudio es **asegurabilidad**, y va a **todas las aseguradoras de una vez**. | Nico (firme) |
| D3 | **Un solo precio**, no paquetes. Dar a elegir cuántas aseguradoras = parálisis y se pierde el negocio. | Nico |
| D4 | **Lo paga el inquilino**, vía Wompi, con el mismo patrón que avalúo. | Víctor, Juan |
| D5 | El resultado clave es el **máximo afianzable**. De ahí sale el catálogo. | Juan |
| D6 | Con un estudio se postula a **N propiedades**: no se vuelve a pedir info ni a cobrar. | Nico, Víctor |
| D7 | **Codeudores**: mínimo 1, algunas piden 2. Llenan el mismo formulario y **también deben salir asegurables**. | Juan |
| D8 | El botón **"Postular" se queda visible**; sin estudio, abre el estudio con el mensaje "antes de postularte…". | Nico (ganó el debate) |
| D9 | **Segunda puerta** fuera de la propiedad, con copy tipo *"conoce las propiedades para las que ya estás aprobado"*. **Nunca "estúdiate ahora"** — suena a academia. | Nico |
| D10 | En **inmuebles solo se sube y se revisa**. Fuera evaluar/reevaluar desde la propiedad. | Víctor, Nico |
| D11 | **No existe "preaprobado"**: aprobado o rechazado. | Juan |
| D12 | Vista **por cliente**, no por inmueble: ver todos los aprobados aunque no se hayan postulado. | Víctor, Juan |
| D13 | **Alertas de aprobados sin gestionar** — que no se acumulen cien y nadie los toque. | Juan |
| D14 | El comercial entra y **lo primero es lo que tiene que resolver**. | Nico |
| D15 | **Código consecutivo por propiedad**, buscable. En volumen sin código es un desorden. | Juan |
| D16 | Guardar el **ID que devuelve la aseguradora** y mostrarlo en el contrato (reporte manual de no pago). | Juan |
| D17 | El scoring debe pesar **también la tasa**, no solo el máximo afianzable. Aprobar más caro no es mejor negocio. | Juan |
| D18 | Inquilino: `Aplicaciones` → **"Mis estudios"**. Si no es asegurable: empty state honesto + recomendaciones + *"¿un familiar o amigo puede postularse por ti?"* (60% de los arriendos son así). | Víctor, Juan |
| D19 | Lo que no está listo lleva badge **"Próximamente"**. | Nico, Víctor |

**Diferido explícitamente en la reunión** (no lo hagamos): alertas de aptitud del inmueble
("esta cocina de vidrio no aguanta") — Juan la mandó a futuro. Y el modelo de negocio por
paquetes de aseguradoras — decidieron cobrar barato y monetizar la renta, no el estudio.

---

## 2. Qué existe hoy (la buena noticia)

Casi todo el plumbing está. El problema no es que falte: es que **está cableado al revés**.

| Pieza | Dónde | Estado |
|---|---|---|
| Preaprobación pública | `/preaprobacion` → agente `/api/funnel/preaprobacion` | ✅ Funciona. Devuelve `asegurabilidad: yes/partial/no` + aseguradoras. **Pide canon.** |
| Asegurabilidad multi-carrier | `/ai/asegurabilidad/nueva` | ✅ Real: `carrierMode: favoritas\|todas`, `selectedCarriers`, `codeudoresCount`. **Pide canon.** |
| Comparador de aseguradoras | `/ai/asegurabilidad/comparar` | ✅ Existe |
| Scoring propio + codeudores | `/ai/estudio/*` incl. `CodeudoresTab` | ✅ Existe |
| Link al candidato (7 pasos, incl. codeudor) | `/ai/estudio/solicitud` | ⚠️ **Es un PREVIEW. No hay submit ni endpoint.** |
| Vista por cliente | `/postulaciones` (`AllCandidatesItem`) | ✅ Ya es client-centric — más cerca de D12 de lo que creíamos |
| Catálogo "para ti" | `/inquilino/para-ti` | ⚠️ Filtra por `riskLevel`, **no por máximo afianzable** |
| Pago Wompi | `/api/avaluo/wompi-session` + `WompiPayButton` + `/avaluo/estado/[id]` | ✅ Patrón completo, reutilizable tal cual |
| Tope por aseguradora | `maxCanonCop` en el registro de carriers | ✅ Pero es tope **del carrier**, no del candidato |

## 3. Qué falta de verdad

1. **El máximo afianzable por candidato no existe** como dato. `PreApprovalResult` devuelve
   `{ asegurabilidad, aseguradoras[{aseguradora, status}] }` — sin monto, sin tasa.
   **Sin ese número, D5, D12, D17 y todo el catálogo filtrado no tienen de dónde salir.**
2. **La tasa por aseguradora tampoco viene.** Es la mitad de D17.
3. Estudiar sin propiedad: los tres formularios (preaprobación, asegurabilidad, estudio) piden canon.
4. El link real al candidato (hoy `/ai/estudio/solicitud` es un dibujo).
5. Cobro del estudio (Wompi existe, pero solo para avalúo).
6. Codeudor como **sujeto estudiable** (hay contador y pestaña; no el flujo de "también debe pasar").
7. Gate de postulación — `/aplicar/[propertyId]` no chequea estudio.
8. Código consecutivo de propiedad (solo PQRS tiene radicado consecutivo).
9. ID de aseguradora guardado/visible.
10. Alertas de aprobados sin gestionar.
11. Vigencia del estudio.

---

## 3-bis. Cómo trabaja el front sin esperar al back

**Nosotros hacemos front. Víctor hace back. Nada se bloquea.**

El repo ya tiene el patrón, documentado y testeado, en `funnel-applications.service.ts`:

```ts
function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') return true
  return !process.env.NEXT_PUBLIC_AGENT_URL   // sin agente → mocks de fábrica
}
```

Con la URL del agente puesta y sin override, **siempre corre el fetch real** — producción nunca
puede servir mocks. O sea: definimos el contrato, servimos un fixture determinista, construimos
la experiencia completa, y **el día que Víctor publica el endpoint se prende sola**.

> Dato: ese servicio ya está escrito, con mocks y tests, **para la bandeja de postulaciones de
> la agencia — el paso 7 — y ninguna UI lo consume todavía.** El paso 7 tiene los cimientos puestos.

**Regla:** ninguna pantalla inventa datos que no tiene. Si falta el tope aprobado, se dice que
falta; no se pinta un número falso.

---

## 4. La experiencia, paso a paso

Los 11 pasos del flujo acordado, y qué cambia en la experiencia para que ocurran.

### Los cinco cambios de fondo

Antes del detalle, lo que realmente se mueve:

1. **El catálogo deja de ser vitrina y pasa a ser embudo con llave.** Hoy todos ven lo mismo.
   Después, lo que podés *tomar* depende de tu tope. El reto es que no se sienta un muro.
2. **La plata cambia de manos antes del valor.** Hoy nadie paga hasta el contrato. Ahora el
   inquilino paga primero → la pantalla previa al pago tiene que **vender**: qué compra
   (todas las aseguradoras) y qué se lleva (un número que sirve para todas las propiedades).
3. **El estudio deja de ser un evento y pasa a ser un estado que caduca.** La persona *tiene*
   una aprobación, con vigencia visible siempre. De ahí sale la urgencia, no de un banner.
4. **La agencia deja de navegar y pasa a atender una cola.** El comercial entra y lo primero
   es lo que se le está envejeciendo.
5. **Hay dos estudios y tienen que sentirse distintos.** Si se parecen, la persona cree que
   pagó dos veces. Momento distinto, nombre distinto, pantalla distinta.

### El recorrido

| # | Paso | Dónde | Qué cambia |
|---|---|---|---|
| 1 | Entra al catálogo o recibe link | `/propiedades`, `/propiedades/[id]` · **nuevo** `/estudio/[token]` | Navegar sigue libre. "Postular" **se queda visible**; sin aprobación abre el camino de 3 pasos, no un formulario. Segunda puerta: *"Conoce hasta cuánto te arrendamos"* |
| 2 | Estudio inicial (asegurabilidad) | `/preaprobacion` rediseñada | Canon deja de ser obligatorio. Se muestra el recorrido completo **antes** de pedir el primer dato |
| 3 | Paga | **nuevo**, clonando avalúo | Form → Wompi → vuelve → espera → resultado. La pantalla de espera dice qué pasa si cierra (le llega por correo) |
| 4 | Evaluación multi-aseguradora | pantalla de proceso | No un spinner: se ve que se está consultando a varias. Resultado = aprobado/no + **monto máximo** |
| 5 | Se habilitan propiedades compatibles | `/inquilino/para-ti` + catálogo | **La pantalla más importante.** Chip permanente *"Aprobado hasta $X"*. Lo que excede el tope **se ve pero bloqueado con el motivo** — no se esconde |
| 6 | Elige una o varias | catálogo + detalle | Postularse a N con el mismo estudio, **sin repreguntar ni recobrar**. Contador visible + vigencia corriendo |
| 7 | La inmobiliaria recibe la alerta | **nuevo**, sobre `funnel-applications.service.ts` | Cola de acción, no dashboard. **Envejecimiento visible**: lo que lleva días sin gestionar se ve viejo |
| 8 | Estudio del inquilino para la propiedad | `/ai/estudio/*` → *evaluación de candidatos* | El segundo estudio, con ingresos y codeudores. Tiene que **verse distinto** al paso 2 |
| 9 | Se comparan candidatos | `/propiedades/[id]/candidatos` | Comparación lado a lado. Muestra **la condición del negocio, no solo el puntaje** — aprobar más caro no es mejor |
| 10 | Se acepta al candidato | mismo | La decisión también resuelve a los demás: los no elegidos necesitan un estado honesto |
| 11 | Se prepara contrato | `/contratos/nuevo` | Arrastra **qué aseguradora aprobó y con qué ID** |

### Las decisiones de experiencia que sostienen todo

- **El botón "Postular" no se quita** (paso 1). Se queda y educa. El miedo de Víctor
  —*"el man cree que ya quedó postulado"*— se resuelve mostrando el camino, no escondiendo el botón.
- **Nunca "estúdiate ahora"** (paso 1). Suena a academia.
- **Lo que excede el tope se ve** (paso 5). Esconderlo se siente a trampa; mostrarlo bloqueado
  con el motivo se siente a diagnóstico.
- **La vigencia es visible siempre** (pasos 5-6). Es el motor del cierre.
- **El rechazo es una pantalla, no un callejón**: por qué, cómo mejorar, cuándo volver, y que
  un familiar o amigo puede postularse (60% de los arriendos son así).
- **Nada que cueste plata se dispara sin decir cuánto** (pasos 3 y 8).

---

### Construido — recorrido del inquilino (pasos 1→6)

2026-08-07. Se arrancó por el premio (pasos 4-5) y no por el formulario: sabiendo cómo se ve el
resultado, el form y el pago tienen un trabajo obvio. Al revés se construye a ciegas.

| Paso | Qué se construyó | Archivos |
|---|---|---|
| **4-5** | **"Mi aprobación"** — 4 estados, el número como héroe, rechazo con salidas | `lib/api/aprobacion.service.ts(+test)` · `app/inquilino/aprobacion/page.tsx(+test)` · `inquilino/layout.tsx` |
| **1, 6** | **El gate de postulación** — el botón se queda y enseña el camino | `components/tenant/PostularButton.tsx(+test)` · `lib/hooks/use-aprobacion.ts` · `property/StickyCTA.tsx` · `tenant/PropertyDetailSheet.tsx` |
| **5** | **El catálogo se vuelve personal** — banda con el tope + lo que se pasa se ve marcado | `components/tenant/TopeAprobadoBanner.tsx` · `app/inquilino/para-ti/page.tsx` |
| **2** | **El estudio deja de necesitar propiedad** — canon opcional | `preaprobacion/form-logic.ts(+test)` · `preaprobacion/page.tsx` · `lib/api/funnel.service.ts` |
| **3** | **Sesión de pago Wompi** — un precio, todas las aseguradoras | `app/api/estudio/wompi-session/route.ts(+test)` |

**Decisiones de experiencia que quedaron cerradas en código:**
- El botón "Postularme" **nunca se esconde ni se deshabilita** — sin aprobación abre el camino
  (`PostularButton`). Es la salida del debate Víctor/Nico: muro → escalón.
- **Sin tope conocido NO se bloquea.** No se le niega algo a alguien por un dato que falta.
- Lo que se pasa del tope **se ve**, marcado y con el motivo. Nunca se esconde.
- **El precio del estudio no se inventa**: sin `ESTUDIO_PRECIO_COP` el endpoint responde 503.
  Hay un test que lo prueba — un default silencioso le cobraría a alguien una cifra que nadie aprobó.

Aditivo: **no se quitó ninguna pantalla ni ninguna ruta.**
Verde: `tsc` · **213 archivos / 1668 tests** · `next lint` limpio (el único warning es previo,
en `use-pendientes.ts` de cobranza).

⚠️ **Sin verificación visual.** `/inquilino/*` exige sesión de inquilino y la del navegador es de
inmobiliaria. Los tests cubren estados y reglas, no si se ve bien.

**Falta para cerrar el paso 3:** la pantalla de pago que consume el endpoint. Depende de que el
backend devuelva un `solicitudId` al crear el estudio — hoy `funnel-preaprobacion` no devuelve
ninguno. Construir el botón de pago antes de eso sería construir sobre aire.

## 4-bis. Orden de entrega

Cada fase entrega algo usable. Front-first y aditivo: nada rompe lo que ya opera.

### Fase 0 — Commitear lo que ya está
Los seis trabajos de la sidebar siguen en un árbol sucio. Antes de meter una línea más.

### Fase 1 — El estudio deja de necesitar una propiedad ⭐ *empezar por acá*
- `/preaprobacion` pasa a ser la puerta real: **canon opcional** ("si ya tienes una en mente").
- La respuesta pasa a mostrar **hasta cuánto te afianzamos**, no solo sí/no.
- Contrato nuevo que hay que pedirle al agente: `maxAfianzableCop` + `tasa` por aseguradora.
- El front se puede construir **antes** de que el agente lo mande, con estado honesto
  ("aún no disponible") en vez de inventar el número.

### Fase 2 — Cobro del estudio
Clonar el patrón de avalúo, que ya funciona: form → `/api/estudio/wompi-session` → Wompi →
retorno → pantalla de espera → resultado. **Un precio, todas las aseguradoras** (D3).
Dos orígenes: el candidato paga desde su link, o la agencia genera el link y lo envía.

### Fase 3 — El link al candidato deja de ser un dibujo
- `/ai/estudio/solicitud` genera un **link real y copiable**, con estado
  (enviado → abierto → pagado → completado → resultado).
- Vista pública `/estudio/[token]` con los 7 pasos que **ya están diseñados**.
- **Codeudores (D7)**: cada uno con su propio sub-link; el resultado del titular queda
  pendiente hasta que los codeudores pasen.

### Fase 4 — El catálogo se filtra por el máximo afianzable
- `/inquilino/para-ti` filtra por `maxAfianzableCop` en vez de `riskLevel`.
- Lo que está por encima **se ve pero bloqueado, con el motivo** (no se esconde: Víctor
  fue explícito en que poder navegar importa).
- En la agencia: **"enviar portafolio"** → link con el catálogo ya filtrado (D5).

### Fase 5 — El gate de postulación
- "Postular" visible siempre; sin estudio → abre el estudio con *"antes de postularte…"* (D8).
- Segunda puerta fuera de la propiedad con el copy de D9.
- Con estudio vigente: postularse a N propiedades sin repreguntar ni recobrar (D6).

### Fase 6 — La agencia trabaja por cliente
- `/postulaciones` gana el eje **"aprobados sin postular"** (D12).
- Fuera evaluar/reevaluar desde `/propiedades/[id]/candidatos` (D10).
- Fuera el estado `PREAPPROVED` de la UI (D11).
- **Alertas de aprobados sin gestionar**, con antigüedad (D13).
- Entrada del comercial: primero lo pendiente (D14).

### Fase 7 — Higiene que pidió la operación
Código consecutivo por propiedad + búsqueda por código (D15) · ID de aseguradora guardado y
visible en el contrato (D16) · vigencia del estudio visible en todos lados.

### Fase 8 — El panel del inquilino se simplifica
`Aplicaciones` → **"Mis estudios"** (D18) · empty state honesto cuando no es asegurable, con
recomendaciones, cuándo volver, y la salida del familiar/amigo.

---

## 5. Lo que depende de Víctor (cross-repo, no lo puede hacer el front)

> **Verificado contra el agente el 2026-08-07**, no asumido. Tres hallazgos que cambian el plan.

**H1 · `/preaprobacion` hoy está muerto.** El front llama a `POST /api/funnel/preaprobacion`;
en el agente en `develop` **esa ruta no existe** (404 → el servicio lo traduce a *"no
disponible"*). Solo vive en la rama sin mergear **`estudio-backend-gaps`**, que está
**363 archivos / +63k líneas** por delante de develop y arrastra toda la torre de funnel
(F0→F5), ai-hub y workspaces. O sea: la pantalla pública de preaprobación no funciona en local
y probablemente tampoco donde no esté esa rama.

**H2 · El agente NUNCA devuelve primas, y es a propósito.** Comentario textual en la ruta:
*"The response carries insurer NAMES + asegurabilidad only — never premiums"*. Es un endpoint
**público y sin auth**: filtrar tarifas de aseguradoras ahí sería un problema de negocio.
**Consecuencia para D17:** el tope y la tasa **no van juntos**.

| Dato | De quién es | Dónde va |
|---|---|---|
| **Tope aprobado** | del inquilino, sobre sí mismo | endpoint público — sí puede volver |
| **Tasa / prima** | de la agencia, es su costo | solo endpoint de agencia, autenticado |

**H3 · `canonCop` es obligatorio en el schema** (`z.number().int().positive()`). El front no
puede simplemente dejar de mandarlo: sería 422. "Estudio sin propiedad" **no se puede terminar
sin tocar el agente.**

### La lista para Víctor

1. **Bajar `funnel-preaprobacion` a develop** (o cortarlo de `estudio-backend-gaps`) ← desbloquea todo
2. `canonCop` **opcional** en el schema
3. **Tope aprobado** en la respuesta pública (el tope sí, la tasa no — H2)
4. **Tasa por aseguradora** en la respuesta de agencia (para D17)
5. Endpoint de link de estudio con token + estados
6. Sesión de pago Wompi para estudios
7. Codeudores como sujetos estudiables (no solo un contador)
8. Código consecutivo de propiedad
9. Persistir el ID que devuelve la aseguradora

## 6. UX — el trabajo real

**La evidencia más fuerte de que esto es un problema de UX está en la reunión misma.**
Víctor, que construyó el producto, y Juan, que opera una inmobiliaria hace años, pasaron
cuarenta minutos discutiendo qué significa "estudio". Si las dos personas que más saben no
se entienden usando el vocabulario del producto, ningún usuario tiene chance.

No es que la UI esté fea. Es que **nombra tres cosas distintas con la misma palabra, esconde
el sujeto principal, y pide compromiso antes de mostrar el camino.**

### Las fallas de comprensión, con su evidencia

| # | Falla | Evidencia en la reunión |
|---|---|---|
| F1 | **"Estudio" significa 3 cosas**: asegurabilidad, scoring propio, y el formulario del panel | *"Ese no es el que va a la aseguradora, sino el score propio"* — 15 min de ida y vuelta |
| F2 | **"Postular" promete más de lo que hace** | *"usted dice postular, yo digo: ah, ya quedé postulado a la propiedad"* |
| F3 | **"Preaprobado" no significa nada** | *"ahí sale preaprobar, pero preaprobar qué"* |
| F4 | **"Reevaluar"**: acción con costo real y etiqueta ambigua | Víctor temía que recobrara estudios; nadie sabía qué hacía |
| F5 | **"Aplicaciones"** se lee como *apps* | *"no falta el que diga aplicaciones, aplicaciones web"* |
| F6 | **El inmueble tapa a la persona** | *"necesitamos un módulo que nos arroje todos los aprobados independiente de si ya se postuló"* |
| F7 | **Nadie sabe dónde entrar** | *"cualquier integrante entra como que ¿dónde me meto?"* |

### Siete principios que ordenan todo lo demás

**P1 · Un nombre, una cosa.** Vocabulario como ley del producto, no como sugerencia:
- *Asegurabilidad* (¿te respalda una aseguradora y hasta cuánto?) — al inquilino nunca se le
  dice "asegurabilidad", se le dice **"hasta cuánto te podemos arrendar"**.
- *Evaluación de candidatos* (nuestro A/B/C/D, para elegir entre varios) — vive **solo** en la
  agencia. Nunca comparte pantalla ni palabra con lo anterior.
- Se mueren: "preaprobado" (F3), "reevaluar" (F4), "aplicaciones" (F5).

**P2 · El sujeto es la persona, no el inmueble.** Hoy solo se llega a un candidato entrando por
una propiedad. El candidato pasa a ser entidad de primera clase con ficha propia: hasta cuánto
le afianzan, qué aseguradoras y a qué tasa, vigencia, a qué se postuló, cómo puntuó en cada una.
Esto resuelve F6 y es la mitad de D12.

**P3 · Mostrar el camino antes de pedir el primer dato.** El debate botón-sí/botón-no de F2 se
disuelve solo si, antes de tocar nada, el usuario ve *"son 3 pasos: te estudiamos → eliges →
el propietario decide"*. Se queda el botón que quería Nico, y se va el susto de Víctor.

**P4 · El número manda.** El máximo afianzable es EL dato. Después de aprobar, es lo más grande
en pantalla, y es un chip permanente en todo el catálogo. *"Estás aprobado hasta $2.400.000"*
carga el producto entero en una frase.

**P5 · El estado envejece a la vista.** Las alertas de D13 no son notificaciones, son un patrón
visual: lo que lleva días sin gestionar **tiene que verse viejo**. Igual la vigencia del estudio.

**P6 · Nada que cueste plata se dispara sin decir cuánto.** Eso fue lo que mató a "reevaluar".
Toda acción con costo muestra el precio y pide confirmación explícita.

**P7 · El rechazo también es una pantalla.** Hoy no ser asegurable es un callejón sin salida.
Pasa a ser una pantalla con trabajo que hacer: por qué, cómo mejorar, cuándo volver, y la
salida real que dio Juan — *un familiar o amigo puede postularse por ti* (60% de los arriendos
funcionan así).

### Las pantallas que cambian

**Inquilino** — resultado del estudio (el número como héroe, P4) · catálogo con el filtro
siempre visible y lo que no aplica **visible pero bloqueado con el motivo** (Víctor fue
explícito: poder navegar importa) · "Mis estudios" en vez de Aplicaciones · pantalla de
rechazo con salida (P7) · detalle de propiedad con el camino de 3 pasos (P3).

**Agencia** — **ficha de candidato** (nueva, P2) · bandeja "aprobados sin gestionar" con
envejecimiento (P5) · el inmueble se simplifica a subir y revisar (D10) · entrada del comercial
con lo pendiente primero (D14, F7) · "enviar link de estudio" y "enviar portafolio" como
acciones primarias.

> Todo esto se construye sobre `docs/DESIGN.md`. No inventar patrones donde ya hay uno canónico.

## 7. Decisiones que la reunión NO cerró

1. **Vigencia del estudio.** Se dijeron tres números distintos: 2 meses (lo real de la
   aseguradora), 15 días (Víctor), 2 días (Nico, para presionar el cierre). Hay que elegir uno.
2. **La fórmula de D17** — cómo se pondera máximo afianzable vs. tasa. Se acordó el principio,
   no el cálculo.
3. **El precio del estudio.** Acordaron "barato, uno solo, no monetizar todavía". Falta el número.
4. **El rol administrativo no existe en el backend** (`ADMIN|AGENTE|CONTADOR|VIEWER`). La
   reunión describe tres personas; hoy se mapeó AGENTE→comercial y CONTADOR→finanzas. La
   persona administrativa real necesita un rol nuevo **en el backend**.
