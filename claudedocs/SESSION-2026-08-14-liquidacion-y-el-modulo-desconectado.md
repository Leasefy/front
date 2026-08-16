# 2026-08-14: la liquidación al propietario, y el módulo que no estaba conectado

Sexto bloque. Antes: `SESSION-2026-08-14-conceptos-invitacion-y-lo-que-quedaba.md`.

| repo | rama | commits nuevos |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | +1 (46) |
| back | `feat/migracion-de-inmobiliarias` | +2 (9) |

Nico pidió dos cosas: **terminar todo lo pendiente** y después **revisar que
todo esté conectado y no mockeado**. La segunda es la que destapó el bloque
grande — y la respuesta corta es que **no lo estaba**.

---

## 1. La liquidación al propietario (el pendiente 🔴)

Los conceptos que paga el propietario se guardaban en el contrato, se veían en
pantalla y **no se descontaban en ninguna parte**. Al ir a cerrarlo, medí quién
calculaba la plata del dueño y aparecieron **tres cuentas distintas** que no
coincidían entre sí:

```
dispersiones.generate()     comisión sobre rentAmount,  neto = paidAmount − com
propietarios.getExtracto()  comisión sobre paidAmount,  neto = paidAmount − com
propietarios.overview()     comisión sobre paidAmount,  neto = paidAmount − com
```

De ahí salieron **tres defectos que ya movían plata**:

**La administración se le acreditaba al propietario.** `paidAmount` es todo lo
que puso el inquilino: canon + administración. La administración de propiedad
horizontal la recibe la copropiedad —el catálogo lo dice: `paga INQUILINO,
recibe INMOBILIARIA`— y girársela al dueño descuadra a la inmobiliaria todos
los meses.

**La comisión se cobraba sobre esa administración.** Canon $1.000.000 con
$230.000 de administración daba **$123.000** al 10% en vez de $100.000.

**Con pago parcial, el propietario quedaba en negativo.** La dispersión cobraba
la comisión completa sobre lo FACTURADO aunque hubiera entrado la mitad.

### La regla

Un solo módulo, `liquidarAlPropietario`, que reparte según **quién RECIBE** cada
concepto. Un pago parcial se reparte **a prorrata**: no viene rotulado —nadie
sabe si el inquilino «pagó el canon» o «pagó la administración»— y cualquier
otra regla favorece en silencio a una de las partes.

Lo que paga el propietario **no** se escala por lo que haya pagado el inquilino:
es plata suya.

Cada renglón sale con su motivo, y **los renglones suman exactamente el neto**.
Un extracto que sólo se puede revisar rehaciendo la cuenta a mano no sirve para
reclamar.

### Medido contra el sistema corriendo

Canon $1.000.000 + administración $230.000, pagado completo, predial de $900.000
a cargo del dueño:

```
canon recaudado    $1.000.000     (no 1.230.000)
comisión 10%        −$100.000     (no 123.000)
predial             −$900.000
NETO                       $0
de terceros          $230.000     nombrado aparte
```

Con el código anterior ese mes le habría girado **$1.107.000**. Un inmueble, un
mes.

---

## 2. El perfil tributario (el pendiente 🟡)

Quién es agente retenedor ya no se deduce. Las columnas son **NULLABLE a
propósito**: `NULL` es «no lo sabemos» y cae al defecto diciéndolo; `false`
afirma que no retiene. Colapsarlos convierte un vacío en una afirmación que
nadie hizo.

El tipo de persona del propietario **no se guarda**: sale de `documentType`
(NIT ⇒ jurídica). Dos campos que dicen lo mismo terminan diciendo cosas
distintas.

La mezcla es **campo por campo**: una inmobiliaria puede tener configurado que
sí retiene renta y no haber dicho nada de ICA.

---

## 3. ⚠️ «Revisá que esté conectado»: el módulo entero estaba roto

Al ir a mostrar la liquidación en pantalla, el panel de dispersiones no
funcionaba **en ninguna de sus partes**. Ocho defectos encadenados, todos
previos, y ninguno visible porque **el primero tapaba a los demás**:

1. **La lista siempre llegaba vacía.** `getAll` leía `res.data` sobre un array
   pelado → `undefined`. «No hay dispersiones registradas», con dispersiones
   en la base.
2. **Al destaparlo, la tabla reventó.** `Cannot read properties of null
   (reading 'accountNumber')`: el back manda dos strings nulables y la pantalla
   esperaba un objeto. Un propietario **sin cuenta** —caso normal— tumbaba la
   sección entera.
3. **Los estados nunca casaban.** El back manda `DISP_PENDING`, la pantalla
   filtra por `'pending'`. Todos los contadores en cero.
4. **`POST /dispersiones` no existe.** El wizard armaba los totales **en el
   navegador** y los posteaba. Nunca guardó nada — y de haber funcionado habría
   escrito los números viejos, salteándose la liquidación entera.
5. **El wizard inventaba una cuenta bancaria** («bancolombia», «****0000») para
   quien no tuviera. En una pantalla sobre **a dónde girar plata**.
6. **`PATCH /:id/process`** cuando el back expone `PUT`.
7. **`GET /dispersiones/summary` no existía.** Caía en `GET /:id` con
   id="summary", fallaba el UUID y devolvía 400.
8. **Un bucle infinito de peticiones.** El efecto del resumen dependía de un
   `?? []`, que crea un array nuevo en cada render: efecto → setState → render →
   efecto. Con la ruta caída, **~2,5 peticiones por segundo**, indefinidamente.

> El linter venía avisando del 8 desde siempre: *«The 'dispersiones' logical
> expression could make the dependencies change on every render»*.

**Y el extracto**: el tipo declaraba `properties` y `summary`, campos que el
back **nunca envió** (manda `lineItems`/`totals`). Como la página lo cargaba en
un `useState<any>`, tsc no veía nada y el modal **reventaba al abrirlo**. Es el
mismo defecto que ya había tenido `CarteraItem`, en el tipo de al lado.

---

## 4. Seis conceptos con la dirección invertida

No es una opinión: **el catálogo se desmiente a sí mismo**.

```
Cobro De Servicios Públicos Propietario        paga INMOBILIARIA
Devolución Por Servicios Públicos Propietario  paga INMOBILIARIA
```

Un cobro y una devolución no pueden mover la plata para el mismo lado. Igual con
«Reparación N a cargo del propietario» contra «Devolución reparaciones
propietario» — y «a cargo de» no admite lectura doble.

Con la dirección al revés, el predial o la reparación del dueño le **SUMABAN** a
lo que se le gira en vez de descontárselo.

---

## 5. El mes que retrocedía uno

`new Date('2026-08-01')` es medianoche **UTC**: pintado en hora local (Colombia,
UTC-5) son las 19:00 del **31 de julio**. El título decía «julio de 2026» sobre
los datos de agosto.

Estaba en **cinco** lugares del panel. Ahora hay un helper (`lib/utils/mes.ts`)
con tests, y una entrada inválida devuelve el string crudo en vez de inventar
una fecha.

---

## Gates

back **178 suites / 1729 tests** ✓ · front **293 archivos / 2548 tests** ✓ ·
tsc ✓ · build del front ✓ · eslint sin errores nuevos (los que quedan estaban
en HEAD: 5 comparaciones de enum y un `as any`).

Sabotajes: los dos de la cuenta y el del cableado hacen fallar tests.

---

## Lo que queda

1. **El wizard de dispersiones sigue mostrando una vista previa calculada en el
   cliente.** Ya no escribe nada (genera por el back), pero los números de los
   pasos 3–5 no descuentan conceptos. Necesita un endpoint de preview real.
2. **`dispersionesApi.preview` quedó eliminado** por muerto; si alguien lo
   quería, hay que hacerlo en el back.
3. **Limpiar el catálogo de conceptos CON la inmobiliaria** — 26 filas «NO
   UTILIZAR» y los duplicados de matiz. Se agrava con el tiempo: el `nombre` se
   guarda como copia, así que cada contrato migrado se lleva el nombre sucio.
4. **Avalúos** — aplazado por Nico.
5. **Los PRs.**

### Datos de prueba

Todo lo de esta sesión quedó **limpio**: conceptos, dispersiones, cobros de
2026-09 y el pago del cobro de agosto revertido. Lo de sesiones anteriores sigue
igual.
