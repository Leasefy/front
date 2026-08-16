# 2026-08-14 (madrugada): los conceptos de verdad, la invitación que nunca funcionó, y una pregunta que destapó un cobro equivocado

Quinto bloque. Antes: `SESSION-2026-08-13-cartera-y-los-cinco-pendientes.md`.

| repo | rama | commits nuevos |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | +3 (44) |
| back | `feat/migracion-de-inmobiliarias` | +2 (7) |

Nico pidió tres cosas: cerrar lo pendiente, confirmar si conceptos y escenarios
tributarios ya estaban hechos, y comprobar que al migrar **se mande sola la
invitación** para crear la cuenta de inquilino.

---

## 0. La respuesta honesta a «¿ya hiciste lo de conceptos?»

**No.** Lo medí antes de contestar: a `liquidar()` lo llamaban **su propio test
y una pantalla suelta**, nadie más.

> El catálogo (66 conceptos) y la calculadora servían para entender la regla.
> Un contrato seguía sabiendo sólo de `monthlyRent` y `deposit`.

La administración de propiedad horizontal, el parqueadero o una cuota de
reparación no vivían en ningún lado: se seguían llevando en el sistema del que
la inmobiliaria se está migrando.

### Lo que se construyó

`ContratoConcepto` cuelga del contrato, y —esto es lo que lo salva de ser
decorativo— **los recurrentes entran en el cobro**. Probado contra la base:
agosto $250.000 de administración → septiembre **$430.000** tras agregar un
concepto de $180.000. El de **una sola vez** ($500.000) no entró.

`nombre` y `base` se guardan como **copia**, no como referencia: el catálogo se
va a limpiar con la inmobiliaria, y un contrato firmado no puede cambiar de
tratamiento tributario porque alguien renombró una fila.

Sin `usoInmueble` no se liquida: **se dice**. Asumir vivienda sería elegir la
opción sin IVA y hacer desaparecer el impuesto en silencio.

---

## 1. ⚠️ El defecto que destapó la segunda pregunta de Nico

*«esos conceptos ya sabes que se pueden agregar al contrato, ¿lo hiciste así?»*

Lo había hecho, y estaba mal. La pregunta me hizo medir **quién paga cada
concepto**, que no había medido:

```
paga: INQUILINO    51
paga: INMOBILIARIA  9
paga: PROPIETARIO   6
```

> **15 de 66 conceptos NO los paga el inquilino** — y yo los sumaba todos al
> cobro, que es justamente lo que se le factura al inquilino.

Marcar «Impuesto predial» o «Comisión del contrato» como recurrente le cobraba
al inquilino la plata del dueño. Y el cobro quedaba **perfecto**: su canon, su
administración, su total, sin un error en ningún log.

Medido con el caso real: $180.000 (inquilino) + $900.000 (predial del
propietario) daba **$1.330.000**; debía dar **$430.000**.

La pantalla decía la misma mentira. Ahora cada concepto dice **quién lo paga**
—deducirlo del nombre es lo que hace que se cuele—, el total es sólo lo del
inquilino, y lo de los otros se nombra aparte.

**Límite declarado:** lo que paga el propietario o la inmobiliaria hoy **no
mueve nada**. Su lugar es la liquidación al propietario (dispersión/extracto),
no este cobro. Se nombra en vez de sumarse en silencio, pero está a medias.

---

## 2. La invitación se mandaba y nadie podía entrar

Se manda sola: `invited_at` y `confirmation_sent_at` puestos en `auth.users`.
Pero al abrir un enlace **real**, caía en `/auth?error=auth_callback_failed`.

> **Verificar que una invitación se ENVÍA no es verificar que alguien puede
> ENTRAR con ella.** En la sesión anterior di por bueno lo primero y lo reporté
> como funcionando.

Dos causas encadenadas:

1. **El token vuelve en el fragmento.** `/auth/callback` es una ruta de
   SERVIDOR y sólo lee `?code=` (el PKCE de Google). Las invitaciones usan el
   flujo implícito: `#access_token=…`, que **el navegador nunca manda al
   servidor**.
2. **Un invitado no tiene contraseña** (`encrypted_password` vacío, medido). El
   error no era recuperable: no había otra puerta.

La solución ya existía en el repo — `/admin/auth/callback` maneja los dos
flujos. Se replicó en `/auth/enlace`; el fragmento sobrevive a la redirección.

Y la invitación ya no lleva al portal directo, sino a **crear la contraseña** y
de ahí al contrato. La pantalla servía sólo para recuperar: le decía «tu
contraseña fue cambiada» a quien nunca tuvo una, y mostraba los errores de
Supabase crudos y en inglés.

---

## 3. Un inquilino con dos contratos rompía la migración

Era el último «sin verificar». Estaba mal.

En una cartera colombiana es normal: el apartamento y el parqueadero. Las filas
se activan en **tandas paralelas**; las dos preguntaban «¿existe este correo?»
antes de que ninguna lo creara, las dos invitaban, y la segunda chocaba con
`User already registered`. **1 de 2 contratos**, medido con un test antes de
arreglarlo — y reportado como un fallo raro de Supabase.

Se arregló con un mapa de promesas **por corrida** (no del servicio: un caché
de larga vida devolvería el id de otra agencia). Detalle que se escapa: las dos
filas comparten el resultado, así que contarían **dos invitaciones donde salió
un solo correo**; sólo la que dispara la resolución la reporta.

---

## 4. Las 10 páginas públicas con el header viejo

Quedaban con el `Navbar` anterior al rebrand: alguien que entra por Google a
/ayuda o /pricing veía otro producto. Aparecieron **dos que no estaban en la
lista**: `/ayuda/propietarios` y `/pricing/empresas`. Hoy quedan **cero**.

Se reusó `LandingChrome`, que envuelve **sólo el header** en `.lv2` — no es un
detalle: `landing-v2.css` abre con `.lv2 *{margin:0;padding:0}`, misma
especificidad que Tailwind y cargando después. Verificado en el navegador: el
scope queda de alto 0 y el `pt-40` de /ayuda sigue computando 160px.

**Vocabulario muerto:** 15 usos de «aplicar/aplicación» donde manda
«postulación». NO fue un find/replace — en /terminos y /privacidad casi todos
son legítimos («aplica el derecho de retracto», «aplicaciones móviles») y
**sólo uno** era el muerto. También `arriendo.co/aplicar/…`, la marca anterior
al rebrand, en una captura de /para/agentes.

---

## Gates

back **175 suites / 1699 tests** ✓ · front **290 archivos / 2524 tests** ✓ ·
tsc ✓ · build de los dos ✓ · eslint sin errores nuevos (mismo conteo antes y
después en los archivos con errores preexistentes).

---

## Lo que queda

1. **La liquidación al propietario**: los conceptos que paga el propietario o
   la inmobiliaria se muestran y todavía no se descuentan en su extracto.
2. El contrato **no guarda si cada parte es agente retenedor**: la liquidación
   usa perfiles por defecto y lo dice en pantalla.
3. **Avalúos** — aplazado por Nico.
4. **Limpiar el catálogo de conceptos CON la inmobiliaria.**
5. **Cuatro PRs sin abrir**: front#87, back#27 y las dos ramas de este trabajo.
   Preguntado tres veces, sin respuesta.

### Basura mía en dev

Lo de sesiones anteriores sigue igual (contratos `MIGRATED`, inquilinos `*.ui@`
y `*.mig@`, el inmueble «Calle 40B # 12-34», «Jorge Restrepo» con su
consignación, cobros de 2026-08, la aprobación de María).

**De esta sesión ya limpié todo**: los conceptos de prueba, los cobros de
2026-09 y 2026-10, el lote `lote-prueba-paginacion` y los usuarios
`prueba.invitacion*`. Queda: la contraseña de `luis.ui1@leasefy-dev.co` en
`PRueba123#`, la comisión del contrato `c0f6dc78` en 11% (era 8/10), y los tres
inquilinos migrados con `onboarding_completed_at` — eso último es la
corrección, no basura.
