# 2026-08-14 (tarde II): la selección que no salía de la pantalla

Octavo bloque. Antes: `SESSION-2026-08-14-el-wizard-el-login-y-las-tablas.md`.

| repo | rama | commits nuevos |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | +2 (53) |
| back | `feat/migracion-de-inmobiliarias` | +1 (11) |

---

## 1. El login: la obra sola

Se fueron el logotipo, la frase y los dos velos. La marca ya está en el
formulario de al lado, y cada capa encima de la pieza es una capa que la
ensucia.

De paso cambió cómo se sirve: era un `background-image`, ahora es `next/image`.
El motivo del fondo CSS era degradar con elegancia si el archivo faltaba; sin
nada encima ese motivo desaparece. A cambio se sirve WebP del tamaño del
dispositivo: **1600×2000 reales en 395 KB**, contra los 632 KB del JPEG que
antes se mandaba entero para que el navegador lo reescalara.

⚠️ **El original de 2,3 MB ya no está** (Downloads vacío, y al repo entró sólo
la versión de 1600×2000). Para una pantalla de hasta ~1512 px de ancho a 2x
alcanza justo —el panel pide 1572 px y hay 1600—; en un monitor de 2560 se
quedaría corto. Si aparece el archivo original, lo cambio y no hay que tocar
código.

---

## 2. Los pasos 3 a 5 del asistente eran informativos

Era el punto 3 de lo que faltaba. Destildar a un propietario cambiaba el
contador **y nada más**: `generate` iba con el mes solo, el back generaba a
todos, y al destildado se le giraba igual.

Ahora la selección viaja y decide. `POST /dispersiones/generate` acepta
`propietarioIds`; sin lista, el mes entero, como venía.

### La lista vacía

```ts
propietarioIds?.length ? filtrar : todos   // ❌ un [] genera el mes COMPLETO
propietarioIds       ? filtrar : todos   // ✅ un [] no genera nada
```

Con `?.length`, «ninguno» se convertía en «todos» — el error más caro posible,
en la rama que menos se prueba. El DTO además la rechaza en la puerta.

### Dos pasos de teatro que se borraron

- `generateDispersiones` fabricaba objetos `Dispersion` en el navegador, con
  ids inventados (`disp-gen-2026-08-1`) y los conceptos en cero, sólo para que
  el paso 5 tuviera algo que listar. No guardaba nada.
- `approveSelected` les ponía `status: 'processing'` y
  `approvedBy: 'agent-007'` — un usuario que no existe. No aprobaba nada en
  ninguna parte.

Con ellos se fueron tres peticiones: cobros, propietarios y consignaciones eran
los insumos de la cuenta que hacía el navegador, y ya nadie los leía.

### Y el final del recorrido, que se leía como un fracaso

Al terminar se caía en la lista, **que abre en el mes actual**. Generar las de
julio y aterrizar en agosto vacío —«No hay dispersiones registradas»— se lee
como que no pasó nada. Ahora vuelve con `?mes=`.

Ahí mismo había un **segundo** `toast.success` que contaba
`dispersiones.length` sobre el array vacío que manda `onComplete`: anunciaba
«0 dispersiones» pegado al aviso correcto.

### La prueba

3 propietarios en julio, uno destildado → **2 dispersiones guardadas**, con los
montos exactos de la vista previa (1.300.000 + 1.800.000 = 3.100.000), el
destildado sin dispersión, y la lista abriendo en julio. 0 errores de consola.
Datos de prueba borrados después.

---

## 3. Lo de los «15 s con el agente caído» era falso

Lo había anotado yo el bloque anterior. Medido en el navegador:

```
fetch a un puerto sin nadie escuchando → 3 ms
```

Una conexión rechazada es inmediata. El agente caído **no** cuesta 15 s.

Lo que sí cuesta es otra cosa. Cargando una sola pantalla del panel:

| ruta | veces | peor caso |
|---|---|---|
| `/inmobiliaria/config` | **10** | 10,8 s |
| `/inmobiliaria/propietarios` | 8 | 6,0 s |
| `/inmobiliaria/subscription` | 6 | 6,0 s |
| `/subscription-plans` | 6 | 4,0 s |

**53 peticiones para pintar una pantalla, y sólo 4 rutas se piden una sola
vez.** Y se pisan entre ellas: salen casi todas en el mismo milisegundo, así
que cada una espera a las otras nueve.

No lo toqué. Arreglarlo es dedupe/caché en el cliente HTTP o en `useApiData` —
toca todas las pantallas del panel, y no es algo para meter junto a esto.
Queda medido, que es lo que faltaba para poder decidirlo.

---

## Gates

back **179 suites / 1739 tests** ✓ (7 nuevos) · tsc ✓ · lint sin errores en lo
tocado ✓ · `pnpm build` ✓.

### La suite del front, sola — punto 1 de lo que faltaba

```
294 archivos · 2552 tests · 0 fallos · 55 s
```

Contra los **969 s y «4 errores» sin detalle** de ayer. La diferencia es que
esta vez corrió sin el build ni la suite del back compitiendo por la máquina.

Los «4 errores» eran de la contención, no del código: **no había nada roto**.
Queda como dato para la próxima vez que la suite se ponga rara —
[[reference-la-suite-del-front-falla-bajo-carga]] ahora tiene su medición
limpia al lado.

---

## Lo que falta

1. 🔴 **53 peticiones por pantalla** (arriba). Es el techo de velocidad del
   panel hoy.
2. **Limpiar el catálogo de conceptos CON la inmobiliaria** — 26 filas «NO
   UTILIZAR». Se agrava con el tiempo: el `nombre` se guarda como copia.
3. **Avalúos** — aplazado por Nico.
4. La obra del login en resolución mayor, si aparece el archivo original.
5. `PricingTable` sigue fuera de la normalización de tablas, a propósito.
