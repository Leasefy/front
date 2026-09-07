# 2026-08-13 (noche tardía): la cartera, y los tres defectos que sólo se ven usando

Cuarto bloque del día. Nico pidió cerrar los cinco pendientes que yo mismo había
listado. Los cinco están hechos — y buscarlos destapó tres defectos que ningún
test iba a encontrar, porque los tres pasaban con el código verde.

| repo | rama | commits nuevos |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | +1 (41) |
| back | `feat/migracion-de-inmobiliarias` | +2 (5) |

---

## 0. Lo que la auditoría previa cambió del plan

Antes de construir la cartera me obligué a mirar las cuatro pantallas que
supuestamente la tenían repartida. El resultado cambió el trabajo:

- **`/tesoreria` no es cartera.** Es una página explicativa con un ejemplo
  ilustrativo hardcodeado y una tabla vacía.
- **`/conciliacion` es un `redirect`.**
- **El reporte de edades YA existía y estaba completo**: `GET
  /inmobiliaria/reports/cartera` devuelve cada deuda con sus días de mora,
  buckets y 12 meses de historia.

> **La cartera no faltaba: se calculaba entera y se tiraba.**

En pantalla vivía dentro de Reportes → pestaña avanzada → sub-pestaña, y el
adaptador la cortaba con **`.slice(0, 10)`**. Con 1.200 contratos se veían diez.

---

## 1. La cartera en una pantalla (`59fc849d`)

`/panel/inmobiliaria/cartera`, enlazada desde el sidebar en FINANZAS.

**«Por vencer» va aparte de la mora.** El back agrupa por `daysLate <= 30`, y lo
que aún no vence tiene `daysLate = 0`: cae en el mismo balde que 29 días de
atraso. Plata que va a entrar no es plata que hay que salir a buscar; sumarlas
infla la mora todos los meses, y una alerta que salta siempre enseña a
ignorarla. Ver [[reference-por-vencer-no-es-mora]].

Dos vistas: **por deuda** y **por propietario** — que es la pregunta real de una
inmobiliaria: no «cuánto se debe» sino «a quién le estoy quedando mal». Un
propietario con cuatro inmuebles en mora se va.

Cuatro estados de verdad: cargando · falló · nadie te debe nada · ninguna
coincide con el filtro. **Un error pintado como cartera vacía diría «nadie te
debe nada»**, que es exactamente lo contrario de «no pudimos preguntar».

### Lo que se borró

- **`CarteraEdadesTable`** (527 líneas): exportada del barrel, usada por
  **ninguna** página, leyendo `item.bucket`, `propietarioName` y `agenteName` —
  campos que el back nunca envió. Me traje su única idea buena: WhatsApp.
- **`getAgingBucket`**: sin llamadores, y con el mismo defecto de meter «por
  vencer» dentro de la mora.
- **La columna «Intentos»** de Reportes: era un `0` literal en el adaptador. Para
  TODA la cartera afirmaba que nadie había sido contactado — distinto de no
  saberlo. El dato existía: `Cobro.remindersSent`.

**El tipo `CarteraItem` del front declaraba SEIS campos que el back nunca
mandaba.** Una pantalla que los pintara mostraba `undefined` con tsc en verde.
Ahora el back los manda de verdad: dirección, teléfono, propietario, agente.

---

## 2. Uso, periodicidad y comisión (`ca15340`)

Ruta nueva `PATCH /contracts/:id/administracion`, **aparte de `PATCH /:id` a
propósito**: aquélla invalida las firmas y sólo corre sobre borradores. Ninguno
de los tres viaja en el documento firmado, y un contrato migrado nace ACTIVE —
por ahí no se podrían corregir nunca.

**Hay DOS comisiones.** La del contrato (la que trajo el archivo) y
`Consignacion.commissionPercent`, que es la que leen la dispersión y el extracto
para pagarle al propietario. Escribir sólo la del contrato deja un número que se
ve y no mueve un peso.

En la base **ya había contratos donde no coinciden** (8% vs 10%). La ficha
muestra el desacuerdo en vez de elegir. Al corregir se escriben las dos.

---

## 3. Paginación y resolución masiva (`ca15340`)

- **`total` viaja aparte del largo de la página.** Con páginas de 50 y 1.200
  pendientes, medirlo por lo recibido diría «quedan 50» para siempre.
- **El filtro por estado va en la consulta**, no después de recibir la página:
  las primeras 50 de 1.200 pueden ser todas LISTO y parecería que no queda nada.
- La masiva se procesa **fila por fila, no con `updateMany`**: cada una tiene que
  pasar por `revisar()`. Y cada fallo vuelve con su id, su línea del archivo y su
  motivo. Una masiva que dice «listo» tapando lo que no pudo es la mentira que
  este diseño evita.

---

## 4. Los tres defectos que salieron de USAR el sistema (`8fa1714`)

Ninguno de los tres lo encuentra un test. Los tres se ven en el navegador.

### El inquilino migrado no veía su contrato: veía un selector de rol

Le puse contraseña a un inquilino migrado, entré, y caí en
**`/onboarding/seleccionar-rol`**: *«¿Sos inquilino o una inmobiliaria?»* — a
alguien con un arriendo vigente que la agencia acababa de migrar. Si elegía mal,
se rompía su propia cuenta. Faltaba `onboardingCompletedAt`.

Después del arreglo: `/inquilino` muestra «Arriendos 1 · Contratos vigentes»,
«Próximo Pago $1.800.000», y `/inquilino/contratos` su contrato completo.

### La ficha afirmaba «sin consignación» justo después de guardar en ella

`PATCH /administracion` devolvía el `Contract` pelado. La pantalla se refresca
con esa respuesta y leía el campo ausente como **«Sin consignación: este
inmueble no genera cobros»** — un segundo después de haberle escrito la comisión
a esa consignación.

> **La respuesta de un update tiene que ser la misma forma que la del read.**

### La lista de trabajo se perdía al recargar

Vivía en el estado del componente. La única forma de volver era subir el archivo
otra vez — **lo que duplica las 1.200 filas**. `GET /contracts/migrar/lotes`
devuelve los lotes a medias y la pantalla ofrece «Retomar» antes del cargador.

Sin esto, paginar no servía de nada: una migración de una cartera real no se
termina de una sentada.

---

## Lo que se probó contra el sistema corriendo

- Cartera: **$7.150.000 en 5 deudas de 9 días**, exactamente lo que dice la base.
  Por propietario: Jorge Restrepo 4/$4.700.000 + Demo Inmobiliaria 1/$2.450.000.
- Ficha del contrato: la alerta de desacuerdo con datos reales (8% vs 10%);
  corregir a 12,5% escribió **12.50 en el contrato y 12.5 en la consignación**,
  y el estado siguió `ACTIVE`.
- Migración: lote real de 30 filas → página 1 de 25 con `total: 30`, página 2
  desde la fila 25. Masiva de uso: **10 de 10**. Masiva de propietario sobre
  filas sin inmueble: **0 de 25, con las 25 nombradas** y su motivo.
- «Retomar» con el lote real, y las filas ya resueltas sin el faltante `uso`.
- Portal del inquilino migrado, antes y después del arreglo.

## Gates

back **173 suites / 1692 tests** ✓ · front **290 archivos / 2524 tests** ✓ ·
tsc ✓ · build de los dos ✓ · eslint sin errores nuevos (los de enum en
`contracts.service.ts` y `reports.service.ts` son preexistentes: mismo conteo
antes y después).

⚠️ Otra vez: **el sabotaje se verifica**. Los dos tests que protegen la
paginación y el reporte de fallos de la masiva se rompieron a propósito con el
reemplazo aplicado por python **con aserción**, y cayeron los dos.

---

## Lo que queda

1. 🟡 Un mismo correo con **dos contratos** debería reusar el usuario. Sin probar.
2. **Avalúos** — aplazado por Nico.
3. Limpiar el catálogo de conceptos **con** la inmobiliaria.
4. `/ayuda`, `/terminos`, `/pricing`, `/para/*`, `/privacidad` con el header viejo.
5. **Cuatro PRs sin abrir**: front#87, back#27 y las dos ramas de hoy.

### Basura mía en dev

Lo de la sesión anterior sigue igual (contratos `MIGRATED`, inquilinos `*.ui@` y
`*.mig@`, el inmueble «Calle 40B # 12-34», «Jorge Restrepo» con su consignación,
cobros de 2026-08, la aprobación de María).

**De esta sesión**: el lote `lote-prueba-paginacion` (30 filas) **ya lo borré**;
la contraseña de `luis.ui1@leasefy-dev.co` quedó en la de QA (1Password); la comisión del
contrato `c0f6dc78` quedó en **11%** en contrato y consignación (era 8/10); y los
tres inquilinos migrados tienen `onboarding_completed_at` seteado — eso último
es la corrección, no basura.
