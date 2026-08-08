# Handoff a Víctor — recorrido del inquilino

**Qué es esto:** el front del recorrido del inquilino está construido y verde, pero corre con
datos de ejemplo. Acá está todo lo que falta del lado del backend para que funcione de verdad,
en orden de qué desbloquea qué.

Nada de esto es opinión: cada punto dice dónde lo verifiqué.

- **Front:** `~/rent/mvp-inmobiliaria`, rama `feat/experiencia-inmobiliaria` (11 commits, sin pushear)
- **Agente:** `Leasefy/agent`
- **Fecha:** 2026-08-08

---

## Resumen: qué bloquea qué

| # | Falta | Sin esto no funciona |
|---|---|---|
| 1 | **Pushear el funnel** | Nada. Es el bloqueo raíz |
| 2 | `canonCop` opcional | Consultar **sin propiedad** (el caso principal) |
| 3 | `maxAfianzableCop` en la respuesta | El tope, y con él el catálogo filtrado |
| 4 | `GET /api/tenant/aprobacion` | Que la aprobación sobreviva a crear la cuenta |
| 5 | `solicitudId` al crear el estudio | La pantalla de pago |
| 6 | Motor real (hoy `stubMode: true` fijo) | Que el veredicto sea cierto |
| 6b | Leer `user_metadata` en el primer login | Que el onboarding no vuelva a pedir nombre/cédula/celular |
| 7 | `vigenteHasta` | La urgencia. Hoy ninguna aprobación vence |

Los puntos **1, 2 y 3 son el mínimo** para que el recorrido deje de ser una demostración.

---

## 1. 🔴 El funnel existe pero **nunca salió de local**

`POST /api/funnel/preaprobacion` está construido y con tests. **No está en `origin`.**

Verificado por tres vías:

```
OpenAPI del agente vivo (:4100)  →  181 rutas, 0 con funnel/preaprob/tenant
origin/develop                   →  NO tiene src/server/routes/funnel-preaprobacion.ts
origin/main                      →  NO tiene src/server/routes/funnel-preaprobacion.ts
```

**11 ramas locales sí lo tienen:**
`estudio-backend-gaps` · `matching-backend-gaps` · `feat/tenant-funnel-f1` · `f2` · `f3` ·
`stack/08-funnel` · `stack/09-affect` · `stack/10-ai-chat` · `stack/11-chat-actions` ·
`stack/12-funnel-f45` · `feat/avaluo-comparables-detail`

> Si te suena raro que digamos "no está conectado": **lo construiste y funciona.** El pedido es
> **pushearlo**, no rehacerlo. La rama más avanzada parece `estudio-backend-gaps`.

Además hay que prender las flags — por diseño la ruta responde **404** si están apagadas
(`src/funnel/flags.ts`):

```bash
TENANT_FUNNEL_ENABLED=true
TENANT_FUNNEL_PUBLIC_PREAPPROVAL_ENABLED=true
```

⚠️ **Ojo con producción.** La cabecera de tu propio archivo lo dice: antes de prender la flag en
prod hacen falta **verificación OTP del celular** antes de revelar el veredicto, y el **texto de
consentimiento firmado por el abogado** cableado a `TENANT_FUNNEL_POLICY_VERSION` (hoy
`'pending-legal'`). Eso no lo tocamos nosotros.

---

## 2. `canonCop` tiene que ser **opcional**

Hoy el schema lo exige:

```ts
// src/server/routes/funnel-preaprobacion.ts
canonCop: z.number().int().positive(),
```

Y el motor también:

```ts
// src/funnel/preapproval.ts
if (!Number.isInteger(input.canonCop) || input.canonCop <= 0) {
  throw new InvalidPreApprovalInput('canonCop must be a positive integer')
}
```

**Por qué importa:** el cambio de fondo del recorrido es que **el estudio dejó de necesitar una
propiedad**. Antes había que elegir un inmueble para saber si te aprobaban, que es al revés de
como la gente decide. Ahora la persona se consulta primero y elige después, con su tope en la mano.

Hoy ese caso **ni siquiera se puede ejecutar**: omitir `canonCop` devuelve 422.

El front ya lo manda opcional (solo lo incluye si la persona escribió una cifra).

---

## 3. `maxAfianzableCop` en la respuesta

**Este es el dato que hace valer consultar sin propiedad.** Cuando no hay canon, la aseguradora no
responde sí/no: responde **hasta cuánto**. Ese número es el tope, y es lo que vuelve personal el
catálogo — un techo sirve para filtrar, un sí/no no.

Respuesta actual:

```jsonc
{ "asegurabilidad": "yes", "aseguradoras": [...], "stubMode": true, "message": "..." }
```

Lo que el front ya parsea (campo nuevo, opcional — si no viene, llega `null` y la UI lo dice sin
inventar nada):

```jsonc
{
  "asegurabilidad": "yes" | "partial" | "no",
  "aseguradoras": [{ "aseguradora": "sura", "status": "approved" | "conditional" }],
  "stubMode": false,
  "message": "…",
  "maxAfianzableCop": 2800000   // ← NUEVO. COP enteros. null si no aplica
}
```

**Vocabulario** (`docs/VOCABULARIO.md`): al inquilino se le dice **tope**; a la agencia, **máximo
afianzable**. Es el mismo número.

> **Un tope y un canon consultado NO son lo mismo**, y el front los trata distinto a propósito.
> El tope es un techo ("aprobado **hasta** $X"); el canon consultado es apenas un punto confirmado
> ("aprobado **para** $X"). Con tope, lo que se pasa se marca como fuera de alcance; con canon
> consultado, solo como "no confirmado todavía — un asesor lo revisa". Confundirlos le pondría a
> alguien un techo que ninguna aseguradora calculó.

Sigue valiendo tu regla de **no exponer primas** en el endpoint público: el **tope** puede volver
al inquilino, la **tasa** solo al panel autenticado de la agencia.

---

## 4. `GET /api/tenant/aprobacion` — no existe

No hay nada parecido en ninguna rama (busqué por nombre de archivo y por contenido).

**Por qué importa — esto ya causó un bug real.** El recorrido nuevo es: la persona se aprueba sin
cuenta → crea la cuenta para entrar a ver su catálogo. Al crear la cuenta, el front deja de leer el
respaldo local y le pregunta al backend. Como la ruta no existe, el 404 se mapeaba a `sin_estudio`
y **la aprobación desaparecía justo al entrar**.

Lo tapamos del lado del front (un `sin_estudio` del backend ya no borra lo guardado localmente),
pero es un parche: el respaldo local vive en **un solo navegador**. Si la persona entra desde el
teléfono, no tiene nada.

Forma que el front ya parsea (`src/lib/api/aprobacion.service.ts`, tolera campos faltantes):

```jsonc
{
  "estado": "sin_estudio" | "en_proceso" | "aprobado" | "rechazado",
  "topeAprobadoCop": 2800000,        // null si todavía no se sabe
  "aseguradoras": [{ "nombre": "Sura", "aprobada": true }],
  "vigenteHasta": "2026-09-07T00:00:00.000Z",  // null si no aplica
  "resueltoEn": "2026-08-08T00:00:00.000Z",
  "condicionada": false,             // aprobado, pero piden codeudor/depósito
  "canonConsultadoCop": null         // el canon que consultó, si consultó alguno
}
```

Notas:
- **`404` es un estado válido**, no un error: significa "todavía no se ha estudiado". El front ya
  lo trata así.
- **`condicionada`**: `asegurabilidad: 'partial'` es un **sí** con condición, no un rechazo. La
  persona puede postularse igual; la condición la resuelve el asesor.

---

## 5. `solicitudId` al crear el estudio — desbloquea el pago

El front tiene el endpoint de cobro listo y con tests
(`src/app/api/estudio/wompi-session/route.ts`), pero **ninguna pantalla lo usa**, porque para crear
la sesión de Wompi hace falta una referencia estable de la solicitud. Hoy
`POST /api/funnel/preaprobacion` no devuelve ningún id.

Con eso construimos la pantalla de pago clonando el patrón de avalúo, que ya funciona:
form → sesión Wompi → retorno → espera → resultado.

Flag relacionada que ya existe: `TENANT_FUNNEL_STUDY_CHARGE_ENABLED`.

**Detalle del front que conviene saber:** el precio del estudio no se inventa. Sin
`ESTUDIO_PRECIO_COP` el endpoint responde 503 a propósito — hay un test que lo prueba, porque un
default silencioso le cobraría a alguien una cifra que nadie aprobó.

---

## 6. El motor devuelve `stubMode: true` **fijo**

```ts
// src/funnel/preapproval.ts, última línea de runPreApproval
return { asegurabilidad, aseguradoras: eligible, stubMode: true }
```

O sea: aunque publiques la ruta, el veredicto sigue siendo de ejemplo. El front lo respeta y lo
anuncia en pantalla con todas las letras ("Resultado de ejemplo… estos datos no son reales"), y
**no guarda** un resultado con `stubMode: true` — persistirlo dejaría al catálogo afirmando una
aprobación falsa en pantallas que ya no avisan que era una demo.

Cuando el motor consulte de verdad, mandá `stubMode: false` y el aviso desaparece solo.

---

## 6-bis. Mapear `user_metadata` → registro del usuario en el primer login

Cuando la persona crea la cuenta desde el recorrido, ya nos dio **nombre, celular, cédula y
ciudad**. Los mandamos en `user_metadata` del signup de Supabase:

```jsonc
{ "intended_role": "tenant", "full_name": "…", "phone": "+57…",
  "document_number": "…", "city": "…" }
```

**Hoy nadie los lee.** El resultado es que el onboarding de inquilino
(`StepTenantWelcome`) le vuelve a pedir **nombre, cédula y celular** — los tres — treinta
segundos después de que los escribió.

El front ya sabe prellenar: `TenantOnboardingContext` tiene `hydrateFromBackend`, que llena
`displayName` / `phone` / `rut` desde el usuario **cuando `profileSource === 'backend'`**. O sea:
apenas `GET /users/me` devuelva esos campos, el onboarding se prellena solo, sin tocar la UI.

Lo mismo con `intended_role: 'tenant'`: si el backend lo respeta al crear el registro, la persona
se ahorra también el selector de perfil.

> Lo podríamos parchear del lado del front leyendo lo que guardamos en el navegador, pero sería
> un arreglo de un solo dispositivo — el mismo problema del punto 4. El lugar correcto es el
> backend.

---

## 7. `vigenteHasta` — cuánto dura una aprobación

Nadie llena este campo, así que **hoy ninguna aprobación vence**.

El plan de experiencia decía que la vigencia visible era «el motor del cierre»: sin fecha no hay
urgencia, y la persona no tiene razón para decidir hoy en vez de en tres semanas.

La duración la define el negocio (¿30 días? ¿lo que diga cada aseguradora?), no el front. El front
ya está listo: muestra "Vence en X días", pinta la urgencia cuando faltan ≤3, y bloquea al vencer.

**Regla que dejamos fija:** sin fecha, la aprobación se asume **vigente**. No se le quita a alguien
algo que ya se ganó por un dato que nos falta a nosotros.

---

## 8. `GET /notifications` responde **500 en todas las pantallas**

Salió en el QA del 2026-08-08. Cada carga de cualquier ruta del panel dispara
`GET http://localhost:3000/notifications` y **siempre** vuelve 500. No rompe nada visible —el front
lo traga— pero deja un error en consola en cada navegación y tapa cualquier fallo real que aparezca
ahí. Verificado en 12 rutas del panel del inquilino, 12 de 12.

## 9. Endpoints que el front ya usa y conviene que estén

Estos tres se cablearon el 2026-08-08 (antes eran `setTimeout` que fingían éxito). Si alguno no
existe o responde error, la acción ahora **avisa que falló** en vez de mentir — que es lo correcto,
pero deja a la persona sin poder hacerlo:

| Endpoint | Para qué | Si falta |
|---|---|---|
| `PATCH /users/me/notification-settings` | Guardar preferencias de notificación | Los interruptores no guardan y lo dicen |
| `GET /users/me/notification-settings` | Cargarlas al abrir | Ídem |
| `POST /users/me/data-export` | **Derecho de acceso, Ley 1581** | No se puede pedir la copia de datos |

El de `data-export` es el que más urge: es una obligación legal, y hasta ayer la pantalla prometía
"te enviaremos tus datos en 24 horas" sin que nadie recibiera la solicitud.

---

## Lo que NO es tuyo (para que no lo persigas)

- **Confirmación de correo en Supabase.** Está activa, así que al crear la cuenta la persona no
  entra directo: tiene que ir al correo. El front soporta las dos formas — si se apaga, entra
  derecho a su panel. Es una decisión de producto/seguridad, de Nico.
- **`PREAPPROVED` como estado.** Lo seguimos aceptando; el front lo muestra como **"En revisión"**,
  porque "pre-aprobado" no le dice nada a quien lo lee. No hace falta que cambies el enum.

---

## Lo que el front ya resuelve (para que no lo dupliques)

- Degrada a un resultado de ejemplo **solo en desarrollo** cuando el agente falla o no responde.
  En producción cualquier fallo sigue siendo un error visible.
- Guarda la aprobación en el navegador para que sobreviva a la navegación y funcione **sin cuenta**
  (la mayoría llega por un link de WhatsApp).
- Tolera campos faltantes en toda respuesta: nada revienta si mandás de a poco. Podés ir
  entregando 2 → 3 → 4 por separado y cada uno se prende solo.

---

## Contacto entre repos

- Plan completo de los 11 pasos: `.planning/PLAN-EXPERIENCIA-ESTUDIOS.md`
- Cómo se llaman las cosas: `docs/VOCABULARIO.md`
- Punto de retome del front: `.planning/SESSION-RESUME-2026-08-07-recorrido-inquilino.md`
- Spec tuya del funnel: `agent:.planning/TENANT-FUNNEL-SPEC.md` (rama `estudio-backend-gaps`)
