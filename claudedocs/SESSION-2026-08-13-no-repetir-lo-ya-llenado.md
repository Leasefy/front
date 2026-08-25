# 2026-08-13: la cédula que se subió siete veces

Segundo punto de la lista de Nico: «si ya está aprobada, el inmueble entra en su
tope y ya llenó una postulación previa, postularse **sin pedirle nada**».

| repo | rama | commit |
|---|---|---|
| back | `feat/aprobacion-del-inquilino` | `b142a78` |
| front | `feat/marketplace-y-postulacion` | (este) |

---

## El hilo

El síntoma es «el wizard son 6 pasos siempre». Antes de tocarlo, medí la base:

| documentos en `application_documents` | |
|---|---|
| primera vez que esa persona sube ese tipo | **20** |
| **ya lo había subido antes** | **57** |

`cedulaprrub.pdf` —el mismo archivo, los mismos 377.675 bytes— aparece **7
veces**, una por postulación. `jacc9121@gmail.com` postuló a 11 inmuebles y
repitió 45 documentos.

> **Lo caro no era volver a escribir el nombre: era volver a buscar la cédula en
> el celular.**

Y ahí estaba el defecto de fondo. El prefill (`GET /applications/prefill`) ya
traía nombre, empleo, ingresos y referencias desde hacía tiempo. **Los
documentos no viajaban.** Saltarse los pasos sólo en el front habría creado
postulaciones sin cédula: la inmobiliaria se entera cuando ya está evaluando.

---

## 1. Back: los documentos viajan (`b142a78`)

`POST /applications/:id/documents/reuse` copia el **objeto de storage**, no
reapunta la fila vieja. Las rutas están namespaceadas por postulación
(`{applicationId}/{tipo}/…`) y el replace-on-upload borra el archivo anterior de
ese tipo: compartir ruta sería borrarle la cédula a la otra postulación al
reemplazarla acá. `storage.copy` lo hace del lado del servidor.

Cuatro reglas, cada una por una forma concreta de mentir:

- **El veredicto no se hereda.** La copia nace `PENDING` aunque la original
  estuviera aprobada — ese visto bueno se lo dio otra inmobiliaria.
- **Si la copia falla, no se crea la fila.** Un adjunto que figura presente y da
  404 al abrirlo es peor que uno ausente.
- **Los rechazados en revisión no se reutilizan.** Si alguien ya dictaminó que
  ese archivo estaba ilegible, remandarlo repite un error que ya teníamos
  anotado. (Un rechazo de la *postulación* no dice nada del documento.)
- **Una sola definición de «reutilizable»**, en `documentos-reutilizables.ts`,
  usada por el prefill que promete y por la copia que adjunta. Si difirieran, la
  pantalla prometería un archivo que después no se manda.

El prefill ahora informa además **de cuándo es cada documento**.

**Probado contra la base y el storage reales**: 4 documentos copiados, los 4
abren con HTTP 200 y el mismo tamaño exacto, la segunda corrida copia 0.

### Un reporte que mentía

La primera corrida en vivo destapó algo que ningún test tenía: la segunda pasada
devolvía `copiados=0, yaEstaban=0` — sonaba a que no había quedado nada. Pasaba
porque «el más reciente de cada tipo» ya eran las copias de esta misma
postulación, y el filtro «es de acá» corría antes que «ya lo tiene». Invertido el
orden, dice `yaEstaban=4`.

## 2. Front: una pantalla en vez de seis pasos

`PostulacionDirecta` sale cuando hay sesión + aprobación vigente + el canon entra
en el tope + la postulación previa está completa. Muestra qué se va a mandar, con
el nombre y la fecha de cada documento, y una salida (`?formulario=1`).

**La completitud no se define ahí**: se le pregunta a `validateStep`, la misma
función con la que el wizard deja avanzar. Con dos definiciones, esta pantalla
podría decir «ya tenemos todo» sobre datos que el wizard considera incompletos.

### Lo único que se sigue pidiendo

**La autorización de datos.** La Ley 1581/2012 la exige previa, expresa e
informada y para una finalidad determinada; cada inmueble puede ser de otra
inmobiliaria, o sea otro responsable del tratamiento. El back ya lo tenía
decidido así —el prefill excluye a propósito los campos de consentimiento— y la
pantalla lo respeta: una autorización, un botón. Verificado en la base: **un
`consent_record` versionado por postulación**.

## 3. El defecto que apareció probando: «no sé» leído como «no»

La pantalla no salía. La aprobación estaba bien, el prefill estaba bien — y
`/tenant/aprobacion` **nunca se llamaba**.

> **`useAprobacion` leía `getAccessToken()` durante el render.**

El token vive en memoria y lo pone el `AuthProvider` cuando Supabase contesta: en
el primer render es `null` aunque la persona tenga sesión. Como el efecto corría
una sola vez, ahí quedaba. **A alguien aprobado se le mostraba `sin_estudio` en
todas partes** —catálogo, ficha, botón de postularse— hasta que navegara a otra
pantalla sin recargar. Son **7 consumidores** del hook.

Costó encontrarlo porque los campos del wizard igual salían llenos: venían de
`localStorage`, no del prefill.

El mismo defecto estaba en `/aplicar/[propertyId]`, en la detección de «ya
postulaste»: en carga fría no corría, y quien ya había postulado volvía a llenar
los seis pasos para chocar con un 409 al enviar. Ahora sí aparece la tarjeta.

Los tres arreglos son el mismo: **esperar a que la sesión se resuelva**. «Todavía
no sé si hay sesión» no es «no hay sesión».

---

## Verificación

Recorrido completo con cuenta real (`maria.inquilina@leasefy-dev.co`) contra un
back aislado en `:3011` — el `:3010` de Nico nunca se tocó:

1. Primera postulación por el formulario, con 3 PDFs subidos por la API pública.
2. Segunda postulación, otro inmueble: sale «Ya tenemos todo lo tuyo», dos
   casillas, un botón.
3. En la base: **3 documentos, rutas propias, todos PENDING**, y la auditoría
   dice `reusadoDe: <la primera postulación>`.
4. Inmueble de $3.000.000 (sobre el tope de $2.600.000) → formulario completo.
5. Volver al mismo inmueble → «Ya tenés una postulación».

**Gates.** Back: `tsc` ✓ · `nest build` ✓ · **1647 tests** ✓.
Front: `tsc` ✓ · `eslint` sin errores nuevos · tests nuevos: 19 (regla) + 3
(sesión) + 16 (back).

Cada guarda se comprobó por sabotaje: al quitar el paso de documentos de la
regla fallan exactamente los 2 tests que lo cubren; con el hook viejo fallan 3 de
los nuevos.

---

## Lo que sigue

1. **Contratos** — UI + los 113 conceptos de `~/Downloads/Productos.csv` +
   escenarios tributarios. ⚠️ El CSV viene en **Windows-1252**.
2. **Avalúos** — en otra sesión, por pedido de Nico.

### Decisiones de producto que quedan abiertas

- **¿Un documento viejo caduca?** Hoy se muestra la fecha de subida y la persona
  decide. No inventé un umbral: «el extracto vale 90 días» es una regla de
  negocio, y ponerla sin que nadie la decida sería inventar política.
- **El cobro del estudio sigue sin existir** en el back
  (`estudio-pago.service.ts` → `CobroNoDisponible`).
- **Fianli no expone API.** Hay que pedirle el endpoint a Javier.

### Dato sembrado en dev

María quedó con **una** postulación y su aprobación, a propósito, para poder
repetir la prueba. Los dos son inventados por mí, no veredictos de aseguradora:

```sql
-- la aprobación
DELETE FROM tenant_approvals WHERE user_id = '83ec60a5-04e4-4152-bbb0-6b48c70f77a9';
-- la postulación sembrada (y sus documentos en storage)
```
