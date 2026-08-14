# 2026-08-14 (tarde): el wizard que tumbaba la página, el login y las 14 tablas

Séptimo bloque. Antes: `SESSION-2026-08-14-liquidacion-y-el-modulo-desconectado.md`.

| repo | rama | commits nuevos |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | +4 (50) |
| back | `feat/migracion-de-inmobiliarias` | +1 (10) |

PRs abiertos: **front#89** y **back#28** (más front#87 y back#27, de antes).

---

## 1. La prueba de dispersiones que pediste

Corrí el asistente completo en el navegador. La dispersión quedó guardada con
los números correctos. En el camino aparecieron tres cosas.

### El wizard tumbaba la página

`Maximum update depth exceeded` **× 507**, **36.306 líneas de consola**.

La causa es la misma de la sesión anterior: los hooks devuelven `data ?? []`,
que crea un array **nuevo en cada render**, y el efecto que arma los borradores
lo tenía en las dependencias.

> Se arregló en la RAÍZ: una referencia congelada compartida por los **20**
> sitios de `useInmobiliaria`. No en el consumidor — en la fuente.

Quedó en 4 líneas de consola.

**El linter venía avisando de esto**, como warning:
*«The 'dispersiones' logical expression could make the dependencies change on
every render»*.

### El wizard calculaba plata en el navegador

Y le salían otros números que al back: comisión sobre lo pagado en vez de sobre
el canon, un **10% inventado** cuando no encontraba la consignación, sin
conceptos, y el nombre como «Propietario desconocido».

Eran los números que alguien veía **justo antes de apretar el botón**.

Ahora `preview` y `generate` comparten `calcularDelMes` en el back. Un test los
compara. Se borró la función que lo hacía en el cliente.

### El paso «Netos» se contradecía

Mostraba `1.000.000 − 100.000 = 0` sin decir de dónde salían los 900.000 que
faltaban. Un total que no cuadra con sus partes no se puede defender delante
del dueño. Y el paso final decía «Se generaron N dispersiones» **antes** de
generarlas.

---

## 2. El login

Entró la obra real (2,3 MB → **618 K**, 1600×2000). El texto va **oscuro sobre
ella**, no blanco: es una pieza clara y cálida, y taparla con un velo azul para
poder escribir en blanco encima sería usarla de fondo en vez de mostrarla.

El color base pasó a ser el de la obra, así que si el archivo faltara el mismo
texto sigue siendo legible — que es la condición para que un fondo pueda faltar.

Logotipo de la sidebar (monocromo, hereda `currentColor`) y **una** frase.
Antes había tres beneficios y tres métricas: en una pantalla cuya única tarea
es entrar, cada línea de más compite con el formulario.

⚠️ `~/Documents` está bloqueado por macOS para el agente. `~/Downloads` no.

---

## 3. El stepper no indicaba el avance

Los pasos cumplidos y el actual estaban **los dos en negro**, distinguidos sólo
por un anillo. Ahora **verde = hecho, azul = acá estás**, gris = todavía no.

---

## 4. Catorce tablas reimplementaban el encabezado del DS

El `TH` de Cadence ya trae lo suyo: JetBrains Mono 11px, mayúsculas, tracking
0.04em, `text-fg-subtle`. Catorce tablas lo volvían a escribir a mano con otros
valores —`text-xs`, `font-semibold`, `tracking-wider`, y **la tipografía de
texto en vez de la mono**— así que cada una se leía distinta.

Se quitó **sólo la tipografía**: alineación, ancho, padding, sticky y
`hidden md:table-cell` se quedan — eso es maquetación.

**57 encabezados en 12 archivos + 7 spans en 2 más.**

Mi primer conteo dijo 17. Al abrirlas: **14** desviadas, **2** ya correctas
(el grep contó clases de la celda siguiente) y **1** distinta a propósito
(`PricingTable`, comparación de planes en la landing).

### El error que casi cometo

Asumí que `text-label` —el tamaño del `TH`— no generaba CSS, porque no está en
el `tailwind.config` del front. De haber actuado sobre eso, quitarles el
`text-xs` habría dejado los encabezados a 14px, **más grandes**.

Lo medí en el CSS servido: **aparece 3 veces**. Lo trae el preset del DS.

---

## Lo de los «4 errores»

No son de la app. Los escribe el **navegador** cuando pide algo a
`localhost:4200` y ahí no hay nadie escuchando: el agente está apagado. La app
ya lo maneja bien —tres estados y `catch`— pero el log del navegador no se
puede silenciar desde el código.

---

## Gates

back **178 suites / 1732 tests** ✓ · front: la suite completa corrió bajo carga
(969 s, «4 errores» sin detalle — el patrón conocido), así que se midió lo
tocado: **38 archivos / 275 tests** de los componentes + 44 de las utilidades +
el canario `auth-context` 15/15. tsc ✓ · lint sin errores ✓ · build ✓.

**El CI manda.**

---

## Lo que falta

1. 🟡 **La suite completa del front sin verificar en limpio.** Corrió con el
   dev server encima y tardó 969 s. Hay que correrla sola, o mirar el CI.
2. 🟡 **La espera de ~15 s cuando el agente está caído.** El panel muestra
   «Verificando acceso…» mientras reintenta. Se resuelve bien, pero tarda.
3. 🟡 **El wizard de dispersiones: pasos 3 a 5 son informativos.** La selección
   por propietario no llega al back — `generate` toma el mes entero. Si alguien
   destilda uno, se genera igual.
4. **Limpiar el catálogo de conceptos CON la inmobiliaria** — 26 filas «NO
   UTILIZAR». Se agrava con el tiempo: el `nombre` se guarda como copia.
5. **Avalúos** — aplazado por Nico.
6. `PricingTable` quedó fuera de la normalización, a propósito.

### Basura en dev

Lo de esta sesión quedó limpio (conceptos, dispersiones, el pago revertido). Lo
de sesiones anteriores sigue igual.
