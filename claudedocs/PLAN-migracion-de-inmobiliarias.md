# Migrar una inmobiliaria entera: contratos, inquilinos y cartera

Escrito 2026-08-13. Decisiones de Nico en esta sesión; hechos medidos contra el
código, no recordados.

---

## El problema, en una frase

> **El modelo asume que Leasefy es donde EMPEZÓ la relación. Para una
> inmobiliaria que migra, es donde SIGUE.**

```
Application → Contract → Lease → Payment
                  ↑
        applicationId obligatorio y @unique
```

Un campo obligatorio arriba bloquea **contratos, arriendos activos y cartera**
de una vez. Lo que falta no es «el importador de contratos»: es que **migrar no
existe como forma de entrar al producto**.

## Por qué es más barato de lo que parece

Medido sobre `back/src/contracts/contracts.service.ts`:

- **21 de 25** referencias a `application.*` están dentro de `async create()`
  — copia de datos **al nacer**.
- Las otras 4 (`cancelContract`, `rejectAsTenant`, `sendReminder`) son del
  **flujo de firma**, que un contrato migrado no tiene: ya está firmado en papel.
- El contrato **ya denormaliza** `landlordName` / `tenantName` /
  `propertyAddress`, nullable a propósito y marcados legalmente inmutables.
- En todo el back hay **un solo** `include: application` desde contrato.

El modelo ya trata la postulación como **fuente que se copia**, no como
dependencia viva. El campo obligatorio es una cerradura sin puerta detrás.

## Lo que NO se hace

**Fabricar una postulación sintética por contrato.** Es el atajo obvio: llenar
`applicationId` con una postulación inventada. Envenena todo lo de arriba —
~1.200 postulaciones que nunca ocurrieron, y cada métrica del embudo
(conversión, tiempo a contrato, tasa de aprobación) mintiendo para siempre.

## Decisión de producto tomada (Nico, 2026-08-13)

> **Los inquilinos migrados se invitan de una.** Van a seguir haciendo todo
> desde el portal de inquilinos, así que no son registros muertos: son usuarios
> desde el día 1.

⚠️ **Cómo, no si.** 1.200 invitaciones en un disparo no es un detalle de
implementación: es el evento con el que la inmobiliaria estrena Leasefy frente a
toda su cartera. Hoy **no hay control de tandas** en el envío
(`src/notifications/`, `src/users/`). Sin eso: rebotes en masa, el dominio
marcado como spam, y la mitad de las invitaciones sin llegar. Va por tandas, con
estado por inquilino y reintento — no con un `Promise.all` sobre 1.200.

---

## Orden de construcción

### 1 · Destrabar el contrato *(back — es el que desbloquea todo)*

- `Contract.applicationId` → opcional.
- `ContractOrigin` → agregar `MIGRATED` (ya tiene `GENERATED` y `UPLOADED_PDF`;
  migrado es el tercer caso natural).
- `POST /contracts/migrated`: crea sin postulación, **sin flujo de firma, sin
  correos, sin transiciones de estado de postulación**.
- Revisar los 4 puntos de firma para que no asuman postulación.

### 2 · Inquilinos como personas *(back)*

- Crear el `User` desde la fila del contrato (nombre, documento, contacto).
- Invitación **en tanda controlada**, con estado por inquilino: pendiente /
  enviada / rebotada / aceptada. La inmobiliaria tiene que poder ver a quién no
  le llegó.

### 3 · Arriendo y cartera *(back)*

- `Lease` cuelga del contrato: una vez que el contrato entra, sale solo.
- Saldos e histórico de pagos: los cobros pendientes del sistema viejo entran
  como cartera abierta, no como historia perdida.

### 4 · El wizard de importación *(front)*

- Rama de contratos en `src/components/inmobiliaria/import/`.
- ⚠️ **Hay que levantar el bloqueo de columnas.**
  `import/lib/columnMapping.ts` descarta a propósito `arrendatario`,
  `inquilino`, `codeudor`, `deudor solidario`, `fiador`. Se pusieron ahí porque
  se confundían con el propietario — y ahora son justo lo que necesitamos. El
  bloqueo se vuelve **condicional al tipo de importación**, no se borra: en un
  import de inmuebles sigue siendo correcto.
- «Migrar desde otro software» hoy **no migra**: explica cómo exportar y manda
  al importador de inmuebles (`handleHaveFile → method: 'excel'`). Ahí va la
  rama nueva.

### 5 · Ver la cartera «muy sencillamente» *(front)*

Ya existen `cobros`, `tesoreria`, `conciliacion` y `conciliacion-ia` en el panel.
**Antes de construir una pantalla nueva hay que mirar esas cuatro**: el pedido
puede ser que lo que hay esté repartido, no que falte. Una quinta pantalla de
plata sería el quinto lugar donde buscar el mismo número.

---

## Lo que se arrastra de la sesión anterior

Los campos que faltan en el contrato — **uso** (vivienda/comercial),
**periodicidad**, **comisión**, **día de plazo de pago** — son parte de esto, no
un trabajo aparte:

> **Un contrato importado sin `uso` no se puede liquidar.** El arrendamiento de
> vivienda está excluido de IVA (art. 476 num. 5 ET) y el comercial no: sin ese
> dato no hay forma de saber si la factura lleva IVA.

Ver `src/lib/contratos/escenarios-tributarios.ts` y la pantalla
`/panel/inmobiliaria/contratos/conceptos`.

---

## Lo que destraba todo lo demás

El paso 1. Es un cambio de schema con migración contra la base de dev
compartida: se hace entero o no se empieza. Una migración a medio aplicar es
peor que ninguna.

**Antes de arrancar, pedir un export real de contratos de Portofino.** Con verlo
se decide el mapeo de columnas de una vez en vez de adivinarlo — y ya sabemos
que sus exports traen sorpresas: el catálogo de conceptos tenía 26 filas
llamadas «NO UTILIZAR» y nueve «Canon de arrendamiento» distintos.
