# 2026-08-13 (noche): el código que era de verdad, y migrar como forma de entrar

Tercer bloque del día. Antes: `SESSION-2026-08-13-no-repetir-lo-ya-llenado.md` y
`SESSION-2026-08-13-tarde-header-luz-y-la-puerta.md`.

| repo | rama | commits |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | 39 |
| back | `feat/migracion-de-inmobiliarias` | 3 |

Worktree `~/rent/mvp-marketplace` (:3007), back en **:3010**.

---

## El hilo de la noche

> **Lo que se ve bien y está mal, otra vez — pero ahora en la plata.** Un código
> de seguimiento inventado, un impuesto escondido dentro del nombre de un
> concepto, y una cartera migrada que existía sin producir un peso.

---

## 1. El aviso de «ya te postulaste» (`94d31091`)

Nico pidió un modal grande. Al construirlo salieron dos defectos.

**El código de seguimiento era inventado.** `APP-` + `Math.random()`, junto al
texto «guardá este código para consultar el estado». No correspondía a nada: en
el panel la misma postulación salía como `AF-XXXXXX`, derivado del id — la
fórmula que **el back también usa**. Y se llamaba durante el render, así que
cambiaba en cada repintado.

> **Un identificador inventado se ve exactamente igual que el de verdad.**

**El wizard bloqueaba a quien reusaba sus documentos.** El guard de «documentos
desconectados al recargar» miraba `fileName && !file` — y un documento traído de
una postulación anterior llega exactamente así, porque vive en el servidor. Se
le pedía adjuntar de nuevo lo que ya había dado. Peor: el comentario prometía
llamar a `reuseDocuments` y **nadie la llamaba** — sin el guard, la postulación
se habría creado vacía.

Del modal: va **encima** de lo enviado, cerrar **navega** (volver atrás dejaría
a la persona frente a «Postularme» otra vez, para chocar con un 409), y el pie
son **dos** salidas, porque desde que los documentos se reutilizan postularse a
otro cuesta una pantalla.

## 2. Contratos: el impuesto estaba en el NOMBRE (`e74dacd7`)

El catálogo real de la inmobiliaria: **107 filas**.

- **26 se llaman «NO UTILIZAR»** — un cuarto son lápidas.
- **41 son la misma cosa con distinto impuesto.** Hay NUEVE «Canon De
  Arrendamiento», que se diferencian sólo en el combo metido en el nombre («con
  IVA, RF, Reteica y Reteiva»).

> **Elegir mal entre nueve opciones que se leen casi igual no da un error: da
> una factura equivocada, y no se ve hasta la declaración.**

Quedan **66**, y ninguno pide saber de retenciones para elegirlo. Los impuestos
los calcula `liquidar()` desde los perfiles de las partes:

- **IVA**: vivienda **excluida** (art. 476 num. 5 ET), comercial gravada. ⇒ el
  uso del inmueble no es un dato de ficha: es lo que decide si hay IVA.
- **Retención**: la practica **quien paga**, y sólo si es agente retenedor. La
  regla de Juan. **No depende de quién recibe.** Base mínima 10 UVT.
- **ReteIVA** sobre el IVA, no sobre la base. **ReteICA** municipal ⇒ parámetro.

Tarifas por defecto (19 / 3.5 / 11 / 15 / 0.8): **las que la inmobiliaria ya
tenía**, leídas de su catálogo. Migrar no puede cambiar un peso.

Pantalla en `/panel/inmobiliaria/contratos/conceptos`. Muestra los **motivos**
al lado del número, incluso los negativos: un cobro sin IVA y uno al que se le
olvidó el IVA se ven idénticos en una factura.

## 3. Migrar: de «importar o fallar» a preparar → resolver → activar

### El primer intento (`4442bcc`, `518316d`)

`applicationId` era obligatorio arriba de `Application → Contract → Lease →
Payment`, así que un campo bloqueaba **contratos, arriendos y cartera** de una
vez. Al hacerlo opcional aparecieron **11 errores de tsc, ni uno más** — y cada
uno era una decisión:

- El **pipeline comercial** sigue postulaciones; un migrado no tiene recorrido.
- El **modelo de ML** aprende de solicitudes que evaluamos: registrarle el
  desenlace de un migrado sería enseñarle con un examen que no presentó.
- La **cascada** que rechaza a los otros candidatos SÍ debe correr.

Y apareció el eslabón olvidado: **los cobros se generan desde la CONSIGNACIÓN**,
leyendo `currentLeaseId`, no desde el arriendo. Los 5 arriendos migrados de la
prueba tenían 0 consignaciones: los contratos existían y no producían un peso.

### El rediseño (`ff5a13d`, `3104bb57`)

Nico: *«contempla todos los posibles casos… quizás un contrato no queda activo
hasta que tenga un inmueble y un propietario y un inquilino»*.

Tenía razón, y había un defecto **en lo ya entregado**: yo resolvía el inmueble
con `Map<direccion, id>`, y **hay direcciones repetidas en la base**. El Map se
queda con la última, en silencio — el contrato se pegaba al inmueble equivocado
y quedaba perfecto, cobrándole a la persona equivocada.

> **Una coincidencia ambigua no es una coincidencia.**

Tabla `migracion_contratos` con estado **PENDIENTE → LISTO → ACTIVADO** y
`faltantes[]`. Sólo se activan las LISTO.

| caso | ahora |
|---|---|
| el inmueble no existe | se crea desde la fila, **arrendado** |
| dos inmuebles, misma dirección | pide desempatar, con candidatos |
| dirección escrita distinto | «Cra 13 #55-20» = «Carrera 13 No 55 - 20»; candidatos por los **números** |
| se asoció mal | reasignable antes de activar |
| el inmueble ya tiene contrato | `inmueble_ocupado` |
| sin propietario | se registra y consigna desde la pantalla |
| sin correo / nombre / uso / canon / fechas | cada uno con su nombre, **todos a la vez** |

**Trampas de implementación:**

- `@IsOptional()` **no cubre la cadena vacía**, sólo `undefined`. Una celda
  vacía de Excel llega como `''` y tiraba el archivo entero. Va `@ValidateIf`.
- El DTO de staging es permisivo **a propósito**: recibe datos para REVISAR, no
  una orden para ejecutar.
- `@CurrentAgency('agencyId')` necesita **`AgencyMemberGuard`** en la ruta.

## 4. Lo que se probó contra el sistema, no sólo en tests

- 4 postulaciones reales de María: los códigos del modal (`AF-624847`,
  `AF-25C364`) son los que aparecen después en el detalle.
- El peor de los nueve conceptos viejos reproducido desde UNO: 2.000.000 +
  380.000 IVA − 70.000 RF − 57.000 ReteIVA − 16.000 ReteICA = **2.237.000**.
- Migración por API y por pantalla: corregir correo, crear inmueble, registrar
  propietario, activar. **Sin tocar el archivo ni una vez.**
- Una fila incompleta devuelve `intentadas: 0` y **no crea un solo contrato**.
- **`POST /inmobiliaria/cobros/generate` → los 3 migrados generaron cobro.** Era
  lo único que había afirmado sin probar.

## Gates

back **171 suites / 1675 tests** ✓ · front **289 archivos / 2515 tests** ✓ ·
tsc ✓ · build ✓ · eslint sin errores nuevos. ~100 tests nuevos en el día.

⚠️ **Un sabotaje que "pasa" hay que verificarlo.** El primero dio 28/28 en verde
con el código roto: el `perl -0pi` nunca había reemplazado. Aplicado de verdad,
cayeron 2.

---

## Lo que falta

### De la migración

1. 🔴 **La cartera en una sola pantalla, discriminada.** Pedido explícito. Hoy
   `cartera-report` sólo resume el mes corriente, repartido en `cobros`,
   `tesorería` y `conciliación`.
2. 🔴 **`uso`, `periodicidad` y `comisión` no se ven en la ficha del contrato.**
   Se guardan y la migración los escribe, pero la UI no los muestra ni permite
   editarlos.
3. 🟡 La lista de trabajo **no pagina**: con 1.200 filas pinta las 1.200.
4. 🟡 **Sin resolución masiva**: 200 filas del mismo propietario = 200 veces.
5. 🟡 **El portal del inquilino migrado, sin verificar**: entran, pero no
   comprobé que vean su contrato en `/inquilino`.
6. 🟢 Un inquilino con **dos contratos** (mismo correo): debería reusar el
   usuario; sin probar.

### De antes

- **Decisión de Nico, abierta**: «si no tiene cuenta que lo lleve a crear
  cuenta» vs. `/aprobacion` (asegurabilidad antes que cuenta, de la reunión con
  Juan). Cambio de una línea.
- **Avalúos** — aplazado por Nico.
- **Limpiar el catálogo CON la inmobiliaria**: duplicados de matiz que se
  conservaron para que la migración cuadre uno a uno.
- `/ayuda`, `/terminos`, `/pricing`, `/para/*`, `/privacidad` con el header
  viejo.
- **Cuatro PRs sin abrir**: front#87, back#27 y las dos ramas de hoy.

### Basura mía en dev

Contratos migrados de prueba, inquilinos `*.ui@leasefy-dev.co` y `*.mig@…`, el
inmueble «Calle 40B # 12-34», el propietario «Jorge Restrepo» con su
consignación, cobros de 2026-08, y la aprobación fabricada de María
(`DELETE FROM tenant_approvals WHERE user_id = '83ec60a5-04e4-4152-bbb0-6b48c70f77a9';`).
