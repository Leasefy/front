# Acuerdos generales, el Resumen reordenado, y una página que no scrolleaba

**Sesión 2026-08-09 (noche)** · ramas `fix/habeas-data-arco` (mvp, **71 commits**)
y `fix/arco-triage-status-constraint` (agent-develop, **15**) · **nada pusheado**.

Continúa `SESSION-RESUME-2026-08-09-pagos-y-acuerdos-generales.md`.

---

## La frase que resume la sesión

> **Ordenar una pantalla no la mejora: destapa lo que el desorden tapaba.**

Cada vez que se acomodó algo aparecieron defectos que llevaban ahí meses y que
nadie veía porque había demasiado ruido encima. Ninguno daba error.

---

## 1 · Acuerdos generales: de constantes invisibles a algo que la agencia escribe

Nico, tres veces: *«¿por qué sigue estando la creación de acuerdos en
configuración?»*. El puntero seguía vivo pero **no en la página**: vivía DENTRO
del modal «Nuevo acuerdo de pago», y apuntaba a `#heading-negociacion`, un ancla
que ya no existía.

### Agente (`47161f3f`)

- **CRUD** `GET/POST/PATCH/DELETE /api/agency/:id/cobranza/acuerdos-generales`
  (33 tests). Leer pide `cobranza:view`; escribir, `cobranza:configure`.
  Borrar deja el estado COMPLETO en `audit_log` — es lo único que queda para
  responder después «¿con qué regla se cerró aquel acuerdo?».
- **`checkAgencyPolicy` los lee**: el acuerdo de la agencia gana sobre el tier
  interno, y el techo lo recorta igual (`Math.min`, D-09). Falla suave: un error
  leyendo la tabla cae al tier interno, nunca deja al agente sin techos.
- **Lo que no se puede evaluar, se CUENTA** (`acuerdosSinEvaluar`). Con
  `daysOverdue = 0` un acuerdo de «16 a 45 días» le aplicaría a quien no debe
  nada. «No sabemos» no es 0.

Dos defectos que aparecieron al enganchar:

- El esquema del tool topaba en **4 cuotas** (el máximo de los tiers internos).
  Un acuerdo de la agencia con 6 lo reventaba. Ahora 36.
- **El PATCH traía defaults de arriba**: apagar un acuerdo habría reseteado
  prioridad, etapas y descuento a cero. `CreateBodySchema.partial()` arrastra
  los `.default()`. Se declara aparte, todo opcional y sin defaults. 2 tests.
- La migración **no tenía RLS** y todas las demás tablas de `agent` sí.

⚠️ **La migración ya está aplicada en la base de dev** (`prisma migrate deploy`)
y quedó un acuerdo de prueba, «Cierre rápido de fin de mes», creado desde el panel.

### Front (`17c2f213`)

Tabla de acuerdos generales + «Crear acuerdo general» con nivel interno
(`acuerdos/generales/nuevo` y `/[acuerdoId]`). Las reglas de redacción viven en
`acuerdo-general-vocab.ts` con 24 tests, no en el componente: un descuento en 0
no se enuncia, sin cuotas no se menciona el inicial, un rango a medias se dice
a medias.

Y se separaron dos cosas que se llamaban igual: la tarjeta de arriba pasó a
**«Límites del agente»** (el techo) y **«Acuerdos generales»** nombra sólo las
reglas que escribe la inmobiliaria.

---

## 2 · Casos: la tabla que no se parecía a ninguna (`b9d3186c`, `1a569017`)

La pantalla decía «Deudores» y la pestaña, la miga y el sidebar decían «Casos».
Ahora es **Casos** en los cuatro lugares; la ruta sigue en `/deudores` porque
cambiarla rompe enlaces guardados y el detalle.

Los filtros vivían en una **columna suelta fuera de toda tarjeta**, con la tabla
flotando al lado — la única pantalla del panel armada así. Ahora: Card ├ barra
de filtros ├ tabla └ `TablePagination`, igual que las demás.

### El defecto de fondo: el filtro no filtraba

Marcabas S0 y quedaban **7 filas de S0 arriba y las 45 de antes abajo**, con el
chip encendido. El servidor filtra bien: era el **sondeo de 30s llegando DESPUÉS
de la respuesta filtrada**. Como `hasLoadedFirstPage` ya era true, la rama de
refresco las fusionaba.

Cada petición recuerda con qué filtros salió y se descarta entera si al volver
ya no es la vigente. **Dos tests que fallan sin la guarda.**

De paso: «mixed» salía crudo en las 45 filas (→ «Varios»), el Badge venía de
Cadence crudo, y los filtros eran DOS definiciones (una en un cajón para móvil).

---

## 3 · El Resumen: de 11 bloques apilados a 4 preguntas (`7dd804db`, `0681951a`)

*«no se comprende toda esa informacion… piensala mejor!!!»*

No era diseño: **no había jerarquía**. Once secciones del mismo peso y el mismo
número cuatro veces — «6 esperan tu aprobación» salía en el banner, en una
tarjeta, en «Revisar escalaciones» y en la lista. Tres botones a dos rutas, y la
lista —lo único accionable— al final.

Ahora contesta cuatro preguntas en el orden en que se hacen:

1. **Te toca a ti** · 2. **Lo que hizo el agente** · 3. **Tu cartera** ·
4. **Actividad** · ▸ **¿Cómo funciona?** (desplegable, abierto sólo sin cartera)

Cada número aparece UNA vez. Borrados `CobranzaWowBanner`,
`CobranzaQueMirarHoy` y `CobranzaAtencionPreview`.

### Lo que se cayó al ordenarlo

- **`3.97885756959325 días promedio`** en las tarjetas de etapa.
- **«Carta prejurídica / Carta prejurídica»**: las cartas no traen deudor, así
  que sin nombre no hay segunda línea que escribir.
- **Los siniestros se pedían DOS veces** al mismo endpoint y llegaban distintos:
  el aviso decía que no había ninguno y la lista mostraba dos.
- **«Ajustar cadencia de contacto»** como CTA primario, hacia una sección de
  Configuración que quitamos esta misma sesión.
- El **embudo sin título**: una barra de colores con `S0…SX` y ni una palabra.
  El nombre de cada etapa ya se calculaba y no se mostraba.
- «No pudimos cargar tus pendientes» **encima de cuatro pendientes cargados**:
  `usePendientes` junta cinco fuentes y sigue rindiendo las que responden.

---

## 4 · Dos «no puedo hacer scroll» que eran defectos distintos

### La barra de pestañas (`23ae5653`)

Desbordaba 143px sin forma de llegar a las últimas pestañas. No era Lenis ni el
handler de rueda —los dos estaban— era **cuándo corría el efecto**: en el primer
render los permisos no resolvieron, el componente devuelve `null`, el efecto
encuentra el ref en `null` y **nunca vuelve a correr**.

El nodo va en `useState`, no en `useRef`. 4 tests; el de la rueda falla si se
vuelve al ref.

### La página entera (`b83ad053`) — el más caro

`<html>` con `lenis-stopped` y `overflow: hidden` **desde que cargaba**, sin
modal a la vista y sin un solo error. Lo encontré instrumentando `stop()`: las
trazas señalaban `dialog.tsx` y `sheet.tsx`, que frenaban Lenis en el efecto de
MONTAJE con un comentario que decía «el Content sólo está montado mientras está
abierto». **Falso**: en el panel se montan cerrados.

Tres capas: Lenis se frena mirando `data-state="open"` en el DOM · `stop`/`start`
con contador de bloqueos · cambiar de ruta siempre libera.

---

## Estado

`tsc` limpio en ambos · front **1.714 tests** (218 archivos) · agente **33 + 35 +
98** en lo tocado · lint 0 errores · verificado en pantalla en claro y oscuro.
**Nada pusheado.**

⚠️ **Node 20 obligatorio** (`export PATH="$HOME/.nvm/versions/node/v20.20.0/bin:$PATH"`).
El dev server de :3001 tarda **60–120s** en recompilar estas rutas; hay que
esperar con `curl`, no matarlo.

## Lo que sigue

1. **Enganchar los hilos `requires_action` de WhatsApp a Pendientes.** Ocultamos
   el Inbox y esos 5 «requiere humano» no se ven en ningún lado.
2. **`analytics/top-scripts` devuelve 500** en cada carga del Resumen
   (pre-existente: JOIN contra `script_templates` vacía).
3. Borrar —o no— el acuerdo de prueba de la base de dev.
