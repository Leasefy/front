# Modales de dos familias, un contrato que sostenía código muerto, y fichas sin salida

**2026-08-11.** Continúa `SESSION-2026-08-11-cobranza-de-punta-a-punta.md`.

**Seis PRs mergeados a develop. Uno abierto** (front#79, el contrato).

| repo | PR | qué |
|---|---|---|
| agent | #89 | el historial dice QUIÉN hizo cada acción, y con qué rol |
| agent | #90 | wa-templates devuelve el texto, las variables y los 19 nombres |
| front | #76 | ese quién/rol en pantalla |
| front | #78 | tres fichas de detalle no tenían cómo volver |
| front | #80 | **una sola cabecera para los 29 modales** + S0/S1 + WhatsApp |
| front | #77 | documento de la sesión anterior |
| front | **#79** | contrato del agente al día — **abierto** |

---

## 1. Los modales eran dos familias

Los ~29 que usan la primitiva tenían **título de 22px**, sin filete, con una ✕
chiquita flotando. Las ~13 cáscaras escritas a mano (`createPortal`) ya tenían
la cabecera correcta: 16px, filete, chip redondo. La primitiva se alineó a
esa.

**La causa**: `components/ui/dialog.tsx` re-exportaba el `DialogTitle` de
cadence **tal cual**, y el del DS es `font-display text-h2` — tamaño de
encabezado de PÁGINA.

**Y no se arreglaba con un `className`.** tailwind-merge clasifica `text-*`
mirando el valor: `text-lg` es t-shirt size ⇒ font-size, pero **`h2` no lo
es**, así que lo manda al grupo de COLOR. Las dos clases sobreviven, las dos
emiten `font-size`, y decide el orden del CSS. Va por especificidad de
descendiente (`[&_h2]:text-base`), que gana siempre.

**El segundo defecto era peor que estético.** El Content era
`overflow-y-auto`, o sea scrolleaba TODO — y la ✕ del DS va `absolute` DENTRO
de ese contenedor. En un modal alto quedabas dentro de un formulario sin saber
de qué era, sin cómo salir y sin cómo confirmar. Ahora `DialogContent`
**reparte** a sus hijos: cabecera arriba, pie abajo, cuerpo con su propio
scroll. Los call sites no cambiaron una línea.

## 2. S0/S1 y el WhatsApp: el mismo error de fondo

Los dos mostraban **el estado interno del sistema** en vez de lo que le
importa a quien decide.

**«Forzar etapa»** ofrecía S0…S5. Pero el operador no elige una etiqueta:
elige el plan de contacto que va a ejecutar el agente. Ahora dice qué hace
cada etapa —espejo de `CADENCE_CALENDAR`— y en particular que **S4 y S5 apagan
al agente**. No promete los correos (día 3 y 35): están detrás de
`DEBTOR_EMAIL_ENABLED` y por defecto no se planifican.

De paso: venía con **destino preseleccionado, siempre S0**. Proponía solo, y
en silencio, devolver a pre-vencimiento un caso con 27 días de mora.

**«Enviar WhatsApp manual»** mostraba `reminder_soft_co` y cinco cajas
rotuladas `debtor_first_name`, `agency_name`, `overdue_month`… El agente ya
tenía el cuerpo del mensaje y una descripción en español por variable; **la
ruta los tiraba al armar la respuesta**. Ahora se ve el mensaje armado antes
de mandarlo, con los huecos marcados.

Las cajas además estaban vacías **por un defecto**: el prefill llegaba con la
clave `nombre`, que no existe en ninguna plantilla, así que el `?? ''` caía a
vacío SIEMPRE. Nunca rellenó nada.

**Lo que NO se rellena, a propósito**: el monto y las fechas. `totalOwed` es
el acumulado del caso, no el canon que la plantilla nombra. Un campo vacío es
una molestia; un monto equivocado dentro de un mensaje de cobro es una
afirmación falsa sobre una deuda, por WhatsApp, con el nombre de la
inmobiliaria adelante.

**Los 19 nombres** viven en el registro, al lado del cuerpo que describen, y
`label` es **obligatorio** en el tipo: una plantilla nueva sin nombre no
compila. Uno lleva la advertencia en el nombre — *«Resumen diario de cartera —
INTERNO, va a la inmobiliaria»*: es un digest para la agencia y estaba en la
misma lista que los mensajes al deudor.

## 3. El contrato sostenía código muerto

202 rutas contra 200. Sobraban `habeas-data/presign-url` y
`habeas-data/confirm` —que el agente borró y reemplazó por `accept-terms`— y
**el front las seguía llamando**.

> Un contrato desactualizado no es información vieja: es andamiaje que sostiene
> código muerto. Mientras el tipo exista, `tsc` bendice la llamada.

Regenerar fue lo único que lo reveló: 18 errores en 6 archivos, y ese listado
**era** el inventario de lo que había que borrar (`HabeasDataStepForm`, su
esquema, los helpers de S3).

## 4. Tres fichas sin salida

`deudores/[id]`, `pagos/planes/[planId]` y `estudio/[id]` no tenían **ninguna**
forma visible de volver. El breadcrumb enlaza la pestaña padre, pero se lee
como rastro de ubicación, no como control — y la pestaña de arriba se pinta
activa, que dice lo contrario.

---

## Lo que aprendimos, en una línea cada uno

- **Una primitiva sólo manda sobre lo que el call site le delega.** Si el
  adapter deja pasar la pieza equivocada del DS, cada pantalla hereda el
  defecto — y arreglarlo pantalla por pantalla garantiza que vuelva.
- **Tocar un schema del agente obliga a `pnpm openapi:dump`.** El snapshot
  está commiteado y hay un test que lo compara byte a byte. Correr sólo el
  test del archivo que tocaste NO lo agarra: es otro archivo, y el CI parte en
  dos shards. Me pasó: `test (2)` pasó y `test (1)` falló.
- **`next build` con `NEXT_DIST_DIR` te ensucia `tsconfig.json`** — le agrega
  su ruta de tipos y lo pasa a CRLF. Revertirlo después, o se cuela.

## Estado operativo

`develop` del front tiene las cuatro fusiones limpias, sin marcadores de
conflicto. `develop` del agente tiene #89 y #90.

**front#79 quedó para el final a propósito**: mergearlo antes que el agente lo
habría hecho nacer viejo, que es justo lo que arregla. Se actualizó contra el
agente ya mergeado — **+32 líneas de snapshot, +6 de tipos**, nada más:
`actor_role`, `body`, `variableHints`.

Y el contrato fresco destapó dos cosas de la misma familia:
`AccionesTab` declaraba `actor_role?: string | null` **a mano**, y al derivarlo
del contrato `tsc` rechazó tres fixtures del test que **omitían la clave** —
el agente siempre la manda (`null` cuando no aplica). Describían una respuesta
que no existe.

## La intermitencia era CARGA de máquina — y mi primera hipótesis estaba mal

Apareció dos veces, y **las dos en archivos distintos**:

| corrida | fallas | dónde | duración |
|---|---|---|---|
| 1 | 6 | no capturé los nombres | normal |
| 2 | 10 | 5 archivos de `src/lib/api/__tests__/*.service.test.ts` | **968 s** |
| 3, 4, 5 | 0 | — | ~40 s |

**968 segundos contra 40** es lo que lo explica: en esa corrida estaban
encima el dev server de `:3005`, un `next build` y otra corrida de vitest. Los
cinco archivos pasan aislados (29/29) y la suite sin nada compitiendo da
**exit 0**. El CI de `develop`, que corre en una máquina dedicada, quedó en
**success**.

**Con las primeras 6 fallas até cabos mal**: `page.realtime.test.tsx` tiene
exactamente 6 tests, así que lo di por sospechoso. La segunda vez fallaron 10
tests en 5 archivos sin relación. La coincidencia numérica era eso, una
coincidencia — cuando no capturaste los nombres no tenés un sospechoso, tenés
un número.

⚠️ Esto **no** es «entonces está todo bien». Una suite que falla bajo carga va
a fallar en la máquina de alguien. Queda como deuda real.

## Lo que queda

- **front#79 sin mergear.**
- El `?session=` del onboarding sigue siendo override de dev.
- Pro Plus / Ultra: sin decidir si son productos reales (1 agencia en `ultra`).
- Las 6 agencias varadas siguen necesitando un clic humano cada una
  (sesión viva hasta el 18 de agosto).
