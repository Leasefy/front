# Siete PRs, y el hilo que los une: pantallas que afirman cosas que no verificaron

**2026-08-11.** Continúa `SESSION-2026-08-11-modales-contrato-y-vuelta.md`.

**Seis mergeados a develop, uno abierto** (#87).

| PR | qué | estado |
|---|---|---|
| #81 | corrección del documento anterior: la intermitencia era carga | ✅ |
| #82 | avalúos: no ofrecer el asistente cuando el servicio no está conectado | ✅ |
| #83 | un error dejó de pintarse como «no hay nada» | ✅ |
| #84 | importar: aceptar el archivo como lo tenga la persona | ✅ |
| #85 | 12 sistemas en el selector + el mapeo dejó de equivocarse | ✅ |
| #86 | consignación: la línea de tiempo dejó de inventar la historia | ✅ |
| **#87** | plantilla · esquinas · portales · oscuro · **la importación fallaba al 100%** | **abierto, verde** |

---

## El hilo

Todo lo de esta sesión es la misma forma: **la pantalla afirma algo que nadie
verificó**. Cambia el disfraz.

| dónde | lo que afirmaba | la verdad |
|---|---|---|
| Avalúos | dos botones vivos | no había a dónde ir |
| Portafolio | «todavía no hay inmuebles» | la petición había muerto |
| Consignación | «visita completada», con agente y fecha | `contractDate + 8 días` |
| Mapeo de columnas | «DETECTADO» con 0.92 | el teléfono del **inquilino** |
| Portales | «te avisamos por mail» | la dirección se tiraba |
| Importar | «ERRORES RESTANTES 0» | las 200 filas eran inválidas |

---

## 1. Avalúos (#82)

El `POST .../solicitar` responde **200** con `{agencyToken, wizardPath}` — la
forma que el back manda cuando NO tiene `AVALUO_WIZARD_ORIGIN`, esperando que
el front componga la URL con `NEXT_PUBLIC_AVALUO_API_URL`. **Esa variable no
está en ninguno de los tres worktrees ni en `.env.example`.** El clic hacía el
viaje, el back **firmaba un token de agencia**, y recién ahí fallaba.

Y lo de fondo: el micro (`~/rent/avaluo`) **nunca implementó su mitad** — no
existe `/api/avaluo/list/by-identity` (el back la llama) y el asistente
**ignora `?agency=`**, así que el avalúo no saldría a nombre de la
inmobiliaria.

## 2. Los cuatro estados (#83)

`useApiData` **captura el fallo y no lo relanza**. Quien toma sólo los datos
recibe `[]` cuando la petición murió — y afirma «no hay nada».

`EstadoDeDatos` (ordena cargando → falló → vacío → datos) y `FalloDeCarga`
(decide si reintentar sirve) **ya existían**. `EstadoDeDatos` tenía **cero call
sites**. Ahora tiene dos, y `cuatro-estados.test.ts` congela **11 pantallas**
que pintan un vacío sin mirar el error y **12** con el `ErrorState` viejo.

## 3. Importar cualquier archivo (#84)

El asistente ya hacía casi todo (mapeo por keywords + Levenshtein, plantilla,
persistencia real). Faltaban dos grietas:

- **Excel en español exporta CSV en Windows-1252** y se leía como UTF-8:
  «Bogotá» entraba como `Bogot?` al inmueble, sin error. Ahora la codificación
  se **averigua**: BOM → UTF-8 estricto → 1252.
- `.ods`, `.txt`, `.tsv` estaban prohibidos aunque SheetJS los lee, y el
  mensaje mandaba a convertir el archivo a mano.

## 4. El mapeo se equivocaba con confianza (#85)

Medido con encabezados reales, **antes de tocar nada**:

```
Celular arrendatario  ->  ownerPhone    (0.92, «DETECTADO»)
Arrendatario          ->  propertyZone  (0.50)
Estrato               ->  status        (0.71)
Tipo de negocio       ->  propertyType  (0.92)
```

El teléfono del **inquilino** como el del propietario, con la confianza más
alta que el sistema sabe dar. **Un campo vacío se nota; uno lleno con el dato
de otra persona, no.**

Dos reglas del matcher que hay que tener presentes:

1. El **nivel 2 (Levenshtein 0.5) siempre encuentra algo parecido**. Para un
   encabezado sin campo nuestro, lo parecido siempre está mal → hace falta un
   nivel 0 que bloquee.
2. El **nivel 1 gana por LONGITUD**. Por eso `propietario` (11) le ganaba a
   `movil` (5) y «Movil propietario» caía en el campo del NOMBRE.

`arrendador` = propietario. `arrendatario` = inquilino. Dos letras.

**+7 sistemas verificados**: Nuby (nuby.ai, Medellín), SINCO ERP, Smart Home,
Nuwwe, MisPropiedades, Arrendasoft, DeB Inmobiliaria.

## 5. Consignación (#86)

Auditoría pedida: «que todo esté conectado y nada mockeado». **Casi todo lo
estaba.** Pero `ConsignacionTimeline` **generaba diez eventos** desde una sola
fecha guardada, incluido «Candidato aprobado» atribuido al **sistema de
scoring** con el nombre real del inquilino. En un inmueble creado ayer,
«Propiedad publicada» salía fechada **en el futuro**.

> Una fecha guardada es un hecho; esa fecha más tres días es una invención.

El grep que los encuentra es **`setDate(` / `setFullYear(`** — no `mock` ni
`Math.random`. **El dato inventado era determinista**, por eso pasaba los tests.

Fuente real que ya existía y nadie usaba: `agendaApi.getAgenda()` devuelve
eventos con `vinculoTipo === 'propiedad'`.

De paso: el barrio era un `<Select>` **cerrado con barrios de Bogotá**. Un
inmueble en El Poblado abría el formulario en blanco y guardar le borraba el
barrio.

## 6. La importación fallaba al 100% (#87)

`POST /properties` respondía **400**:

```
description must be longer than or equal to 20 characters
area must not be less than 10
```

El front mandaba `description: ''` y `area: 0`. El DTO exige `description` ≥20,
`area` ≥10, `bathrooms` ≥1, `monthlyRent` ≥100.000 — **todos obligatorios**. Y
el paso de Revisión AI rellena tipo, ciudad, canon, zona, comisión y título:
**ninguno de los tres que bloquean**.

> El asistente **nunca se contrastó con el contrato del back**. Pasaba `tsc` y
> los tests porque el payload es un objeto libre: la validación vive del otro
> lado.

Más tres defectos del mismo paso: 200 POST simultáneos, los motivos de rechazo
de `allSettled` tirados (de ahí el aviso mudo), y dos minutos de
«Geocodificando direcciones…» sin barra ni conteo.

**Se puede derivar `description`** (el inmueble contado con sus datos reales).
**No se puede derivar `area`**: es un dato, no una suposición.

## 7. Los portales no entregan inmuebles (#87)

Ninguno de los tres publica API para que una inmobiliaria **saque** sus
inmuebles. La integración que existe va **al revés**: los CRMs publican hacia
el portal por XML. Lo demás son scrapers de terceros, contra los términos.

Y la caja de «déjanos tu email y te avisamos» **tiraba la dirección**.

Lo que quedó: el inventario ya está en el panel del portal → explicarlo,
enlazar, y llevar a subir el archivo.

## 8. Oscuro (#87)

Medido: fondo `rgb(17,17,19)`, círculos y líneas `rgb(20,19,15)`. **Tres
unidades por canal.** El culpable es el override `dark:bg-ink` sobre un token
que **ya** es sensible al tema.

⚠️ **El patrón está en 140 lugares.** NO se barre en bloque: dentro de una
tarjeta (`rgb(28,26,22)`) ese `bg-ink` sí se lee como hundido. El defecto es
sólo **sobre el fondo de página**.

---

## Lo que aprendí de proceso (tres cosas, y las tres eran mías)

1. **Me salté `pnpm build`.** `CLAUDE.md` dice que hay que correrlo a mano
   porque el CI no lo corre. Abrí cinco PRs con `tsc` + tests + lint y sin
   build. Tenía la nota escrita de antes; tenerla no alcanzó. Después las
   corrí: las cinco compilaban.

2. **Un «Build Error» del dev server sobre un archivo que estás editando no
   prueba nada.** El dev compila en cada guardado y agarra el archivo a medio
   editar. La única forma de distinguirlo de uno real es correr `next build`.

3. **Cinco PRs en cinco ramas = trabajo que para el usuario no existe.** Nico
   reportó «no agregaste las plataformas» sobre algo hecho y mergeado en otra
   rama, porque :3005 sirve una sola. Consolidar antes de que se acumule.

---

## Lo que queda, y no es código

- **Área y baños obligatorios en el back** dejan afuera casi cualquier
  exportación de CRM. O se relaja el DTO para importaciones, o el asistente se
  los pide. **Decisión de producto.**
- **140 lugares** con `bg-surface-muted dark:bg-ink`, a mirar de a uno.
- **23 pantallas** en las listas de `cuatro-estados.test.ts`.
- **Avalúos no funciona**: falta `NEXT_PUBLIC_AVALUO_API_URL`, el micro sin
  `.env.local` ni corriendo, y sus dos piezas sin implementar.
- *«Segunda plataforma más usada»* (Daytona) **no se pudo verificar**.
- 5 inmuebles de prueba en la agencia demo.
