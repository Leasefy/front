# Panel del inquilino — qué está conectado y qué falta

**Para:** Víctor · **De:** Nico · **Fecha:** 2026-08-08
**Repo front:** `rent/mvp` · rama `feat/experiencia-inmobiliaria` (worktree `~/rent/mvp-inmobiliaria`, `:3002`)

Auditoría de las **14 pantallas** del panel del inquilino: se recorrieron todas con una sesión
real, capturando cada request. Lo de abajo no es lectura de código — es lo que respondió tu
backend local (`:3000`) el 2026-08-08.

Complementa a `HANDOFF-VICTOR-RECORRIDO-INQUILINO.md`, que cubre el **recorrido público**
(la consulta de aprobación antes de tener cuenta). Este cubre el **panel, ya con sesión**.

---

## TL;DR — 3 bloqueos

| # | Qué | Impacto |
|---|-----|---------|
| 1 | `GET /notifications` responde **500** | En **las 14 pantallas**. Error de Prisma, causa concreta abajo |
| 2 | `GET /api/tenant/aprobacion` **no existe** en el agente | El tope no sobrevive al cambio de navegador |
| 3 | El **funnel** sigue sin pushear | Sin él nadie puede sacar una aprobación |

Todo lo demás del panel está conectado y respondiendo.

**Un cuarto, menor:** `GET /evaluations/mine` no existe (404), así que la tarjeta "Tu score" no
puede mostrar nunca un resultado — ver el detalle más abajo.

---

## ✅ Lo que ya funciona (verificado, no asumido)

**Lecturas — 15 endpoints, todos 200:**

```
GET /users/me                            GET /applications/mine
GET /users/me/notification-settings      GET /applications/prefill
GET /users/me/preferences                GET /contracts
GET /properties                          GET /leases
GET /recommendations                     GET /wishlists
GET /messages/conversations              GET /subscriptions/me
GET /messages/unread-count               GET /tenant-payments/mine
                                         GET /tenant-payments/requests/mine
```

**Escrituras — probadas una por una:**

| Endpoint | Resultado | Cómo se probó |
|---|---|---|
| `PATCH /users/me/notification-settings` | ✅ **persiste** | Se cambió `emailMarketing`, se releyó, se revirtió |
| `POST /users/me/data-export` | ✅ 201 | Derecho de acceso, Ley 1581 |
| `PATCH /users/me/password` | ✅ 401 con contraseña equivocada | *"La contraseña actual es incorrecta"* — verifica bien |
| `PATCH /users/me/preferences` | ✅ 200 | |
| `POST /applications` | ✅ 400 con cuerpo vacío | La ruta existe y valida |
| `POST /wishlists/items` · `DELETE /wishlists/items/:id` | ✅ 400 | Ídem |
| `GET /documents/application/:id` | ✅ 400 | Ídem |

> **Ojo con estos tres.** Hasta ayer el front **fingía** cambiar la contraseña, exportar los datos
> y guardar las preferencias: esperaba un `setTimeout` y decía "listo" sin llamar a nadie. Ya están
> cableados a tus endpoints, que funcionaban desde siempre. Si alguno cambia de forma, ahora sí se
> rompe algo visible.

---

## 🔴 1. `GET /notifications` responde 500 en todas las pantallas

El layout del panel lo pide en **cada** navegación. Respuesta textual:

```json
{
  "statusCode": 500,
  "path": "/notifications",
  "message": "\nInvalid `this.prisma.notificationLog...`"
}
```

**Por qué importa más de lo que parece:** el front lo traga sin romperse, así que no se ve nada
raro en pantalla — pero deja un error en consola en cada navegación y **tapa cualquier fallo real
que aparezca ahí**. Es ruido que vuelve inútil la consola para depurar.

Verificado en 14 de 14 rutas.

---

## 🔴 2. `GET /api/tenant/aprobacion` no existe en el agente

Responde **404**. Es la ruta que devuelve la aprobación vigente de quien ya tiene cuenta.

**Qué hace el front mientras tanto:** guarda el resultado en `localStorage` (30 días de retención)
para que el recorrido no se corte. Eso alcanza en un navegador, pero:

- Si entra desde el celular, su tope **no está**.
- Si limpia el navegador, lo pierde.
- Y la aprobación es lo que decide **qué propiedades puede tomar**, así que sin esto el catálogo
  personal no existe fuera del dispositivo donde se consultó.

**Regla que ya dejamos fija del lado del front:** un backend que responde "no hay estudio" **nunca
borra** el respaldo local. Un 404 se lee como "todavía no sé", no como "no tiene". Cuando publiques
la ruta, cualquier estado distinto de `sin_estudio` sí manda sobre lo local.

**Forma que espera el front** (`src/lib/api/aprobacion.service.ts`, `parseAprobacion`):

```ts
{
  estado: 'sin_estudio' | 'en_proceso' | 'aprobado' | 'rechazado',
  topeAprobadoCop: number | null,   // el máximo afianzable
  aseguradoras: { nombre: string, aprobada: boolean }[],
  vigenteHasta: string | null,      // ISO-8601
  resueltoEn: string | null,        // ISO-8601
  condicionada: boolean,            // "sí, pero con codeudor"
  canonConsultadoCop: number | null // si se consultó CON propiedad
}
```

Todo campo que falte se normaliza sin reventar. `404` ⇒ `sin_estudio`, no error.

---

## 🔴 3. El funnel sigue sin pushear

`POST /api/funnel/preaprobacion` está construido pero vive en **ramas locales** de `Leasefy/agent`.
No está en `origin/develop` ni en `origin/main`, y el agente que corre publica 181 rutas, ninguna
de funnel.

El detalle completo (incluidos `canonCop` opcional y `maxAfianzableCop`) está en
**`HANDOFF-VICTOR-RECORRIDO-INQUILINO.md` §1–§3**. No lo repito acá.

**El pedido es "pusheá", no "conectá".**

---

## 🟠 Lo demás que encontramos

### `GET /leases/pse/financial-institutions` → 503

La pantalla de Pagos ofrece PSE. El endpoint existe pero el servicio responde **503**
(¿configuración del proveedor?). Hoy no se nota porque la cuenta de prueba no tiene arriendo
activo, pero en cuanto alguien firme, se nota.

### Evaluación del inquilino (el "score") — no conectada, pero ya no es un botón muerto

`useEvaluation` **siempre** devuelve `null` y lo dice en su cabecera: la evaluación de
autoservicio del inquilino *"is a planned feature that is NOT yet connected to the backend"*.
Además purga a propósito los scores falsos que persistía la implementación vieja.

**Lo que estaba roto y ya arreglamos:** el panel del score ofrecía un botón primario grande,
*"Evaluar mi perfil"*, cableado a `purchaseEvaluation()` — una función que **solo escribe una
advertencia en consola**. Se tocaba y no pasaba nada: ni aviso, ni error, ni navegación.

Ahora esa pantalla dice la verdad —*"Tu evaluación la hace la inmobiliaria cuando te postulas a
una propiedad. No tienes que pedirla ni pagarla aparte."*— y ofrece la salida real: ir a su
catálogo y postularse. La etiqueta de la tarjeta pasó de *"Evaluar perfil"* a *"Al postularte"*.

**Lo tuyo:** cuando corras `POST /evaluations/:applicationId` sobre una postulación de un
inquilino, necesitamos leer ese resultado desde su panel. Hoy no hay endpoint para eso —
`GET /evaluations/mine` responde 404. Con eso la tarjeta deja de estar bloqueada.

### "Propiedades para ti" del home ahora respeta el tope

La sección llama a `useFeaturedProperties`, **no** a `/recommendations`. Eso causaba dos cosas:

1. Una insignia *"92% match"* cuyo número salía de `92 - index * 5` — la posición en el arreglo.
   La primera tarjeta siempre decía 92%. **Quitada.**
2. Más grave: la vista previa **no filtraba por el tope**, así que alguien aprobado hasta
   $2.800.000 podía ver acá una de $4.000.000, hacer clic en "Ver más" y no encontrarla en su
   catálogo. **Ya filtra igual que `/inquilino/para-ti`** — verificado: lo que muestra el home es
   siempre un subconjunto del catálogo.

El subtítulo también mentía: decía *"Basado en tu perfil y preferencias"* sin ningún motor de
perfil detrás. Ahora dice *"Dentro de tu tope aprobado"* (o *"Disponibles ahora"* sin aprobación).

Tu `/recommendations` **sí devuelve `matchScore` real** y `PropertyMatchCard` lo pinta bien en
`/inquilino/para-ti`. Queda abierto si el home se conecta a ese endpoint — hoy no lo necesita.

### `GET /documents` no existe (y no hace falta)

Los documentos del inquilino se derivan de sus postulaciones vía `GET /documents/application/:id`,
que sí existe. Con cero postulaciones no se dispara ninguna llamada — comportamiento correcto,
no un fallo.

---

## 🔧 Dos cosas que no son código

**1. Supabase — Redirect URLs.** No incluyen `localhost:3002`, así que el link de confirmación del
correo aterriza en el `:3001`. Verificado generando el link real. Sin eso, todo el aterrizaje
post-registro no se ejecuta en el entorno donde estamos construyendo.

**2. Confirmación de correo activa.** Al crear la cuenta la persona no entra directo: tiene que ir
al correo. El front soporta las dos formas. Es decisión de producto/seguridad, no un bug.

---

## Lo que NO es tuyo (para que no lo persigas)

Se auditaron los **44 archivos** de la superficie del inquilino:

- **0** esperas simuladas (`setTimeout` haciéndose pasar por trabajo)
- **0** fixtures o datos inventados
- **0** números decorativos

Los únicos dos servicios con modo mock —`aprobacion` y `funnel`— ahora están cerrados con
`NODE_ENV === 'production'`, así que **producción no puede fabricar una aprobación** aunque falte
`NEXT_PUBLIC_AGENT_URL` en el deploy. Antes bastaba esa env sin poner para mostrarle a alguien real
un tope de $2.400.000 que nadie le dio, y sin marca de demo.

---

## Cómo reproducir esto

```bash
# Stack: front :3002 · back :3000 · agente :4100
cd ~/rent/mvp-inmobiliaria && pnpm dev -p 3002

# Cuenta de inquilina ya confirmada
maria.inquilina@leasefy-dev.co / <contraseña en 1Password>
```

Para ver el panel **con** aprobación (mientras el agente no publique la ruta), sembrar en
`localStorage` la clave `arriendo-facil-aprobacion`; el formato está en
`src/lib/api/aprobacion-local.ts`.
