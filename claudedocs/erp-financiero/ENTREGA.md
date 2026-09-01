# Qué se construyó — 2026-08-31

Compañero de [SPEC.md](SPEC.md) (lo que se pidió) y [ESTADO.md](ESTADO.md) (lo que existía).
Esto es lo que hay ahora.

🔴 **Nada está commiteado ni desplegado.** Dos ramas nuevas sobre `origin/develop`:

| repo | worktree | rama |
|---|---|---|
| back | `~/rent/back-erp` | `feat/erp-cobros` |
| panel | `~/rent/mvp-erp` | `feat/erp-financiero` |

---

## Gates

| | back | panel |
|---|---|---|
| `tsc --noEmit` | **0** | **0** |
| suite | **303 suites · 3.838 tests · verde** | **3.879 tests · 3.687 verdes** |
| regresiones | **cero** (línea base 283 · 3.567) | **cero** — los 20 archivos rojos son **byte por byte idénticos a `develop`** y ninguno se tocó (happy-dom / `localStorage`, preexistente) |
| build | `nest build` limpio | — |
| arranque | **«Nest application successfully started», 40 rutas nuevas mapeadas, cero errores de DI** | — |
| migración | **las 73 + la nueva aplican desde cero** contra Postgres limpio; las 6 restricciones rechazan lo que deben | — |

---

## Los defectos que estaban vivos en `develop`

| # | qué pasaba | causa |
|---|---|---|
| 1 | **Registrar un pago devolvía 400** | el front manda `paymentDate`, el DTO espera `paidDate`, y el back corre con `forbidNonWhitelisted`. Una auditoría previa arregló verbo y ruta, dejó el campo, y escribió un test que **compara el cuerpo contra sí mismo** |
| 2 | 🔴 **El campo del monto registraba la milésima parte** | el campo venía prellenado con el saldo formateado y se parseaba con `parseFloat`. Con seis cifras (`"500.000"` → `500`) da un entero válido que **el back acepta**: un pago de $500.000 quedaba como $500, en silencio. Con siete cifras rebotaba con 400. **Estaba tapado por el defecto 1** |
| 3 | **La mora sólo se calculaba si alguien abría el reporte** | `updateLateFees` tenía **un solo invocador** y ningún cron. El cron de las 2 a.m. le empuja esa cifra vieja al agente de cobranza — la que le dice al deudor por teléfono |
| 4 | **La mora se congelaba al vencerse** | `updateLateFees` sólo consultaba `COBRO_PENDING` |
| 5 | **Un día de atraso costaba un mes entero** | `monthsLate = max(1, ceil(dias/30))` |
| 6 | **El día de pago del contrato se ignoraba** | se captura en el formulario y `dueDate` usa el día por defecto de la agencia |
| 7 | **Un abono parcial pisaba al anterior** | `paidAmount` absoluto, con UN solo medio y UNA sola referencia |
| 8 | **Dos lotes podían girar el mismo pago** | el chequeo vivía en el servicio; entre leer y escribir cabe la otra transacción |
| 9 | **La página se tragaba todos los errores** | `catch { console.error }` — el 409 de conciliación habría sido un botón que no hace nada |

---

## Back

**Motor de cobros** (`cobros/motor-de-mora/`) — días de plazo, interés diario, **reglas
encadenadas** (el 10% del canon pasado el día 15, que el ERP anterior no permitía),
topes, prorrateo del primer mes, y el desglose escrito en `CobroConcepto`.
El caso Portofino está verificado con números calculados a mano.

**El cron que faltaba** (`scheduled/recalculo-de-mora.scheduler.ts`) — 1 a.m., antes del
`mora-sync` de las 2.

**Reglas de mora** (`cobros/reglas-de-mora/`) — CRUD por inmobiliaria. Rechaza lo que no
significa nada: un interés diario atado al día del mes, una tasa mensual escrita como
diaria (dice cuánto sería al mes), un porcentaje mayor que 100. Se desactivan, no se
borran: los cobros emitidos apuntan a ellas.

**Recibos de caja** (`recibos-de-caja/`) — cada abono es un documento numerado con
responsable; el saldo se **recompone desde la suma**, no se acumula. Se anula con motivo,
nunca se borra. Y `POST /conciliar/:cobroId`, sin el cual el módulo no serviría sobre la
cartera viva: todos los cobros que ya existen tienen plata sin recibo que la respalde.

**Lote de dispersión** (`dispersiones/lotes/`) — datos bancarios congelados al armar,
**segundo par de ojos** (restricción en la base, no sólo en el servicio), código de 6
dígitos al celular con vencimiento y bloqueo a los 5 intentos, archivo plano con su
SHA-256, correo de resumen.

**Contabilidad** (`contabilidad/`) — PUC con árbol y semilla del Decreto 2650 verificada
código por código, partida doble validada antes de escribir, **reversa en vez de
edición**, balance de prueba, libro auxiliar, estado de cuenta por tercero, y migración
de la contabilidad histórica en tandas.

**Migración de terceros** (`migracion-terceros/`) — el paso 1, que no existía. Duplicados
por documento dentro del lote y contra la agencia, que **se preguntan** en vez de
fusionarse solos.

**Inquilinos** (`inquilinos/`) — sólo lectura, agrupado por persona. No crea un modelo
nuevo: el inquilino sigue siendo un `User`, y tener dos verdades sobre la misma persona
habría sido peor que no tener sección.

**Cuatro archivos existentes tocados**: `schema.prisma`, `app.module.ts`,
`cobros.module.ts`, `cobros.service.ts`.

## Panel

- **Recibo de caja**: el formulario con el desglose **adentro** (que es lo que se pidió:
  verlo *al hacer el recibo*), el máximo abonable a la vista, el historial con los
  anulados visibles, y el camino de conciliación cuando el back devuelve 409.
- **Desglose del total adeudado** en el detalle del cobro, con aviso si las líneas no
  suman el total.
- **Inquilinos** — listado con búsqueda y detalle, agrupado por persona.
- **Migrar mi inmobiliaria** — el hub de la secuencia de 5 pasos, con el paso 1 completo
  (subir, mapear contra la plantilla del back, corregir sin volver a subir, aplicar) y los
  pasos 4 y 5 **marcados como no disponibles, sin botón muerto**.
- **«Cobros manuales» → «Cobros»** en el sidebar y el buscador: esa pantalla lista cobros;
  el recibo de caja es el documento que se emite contra uno.
- Dos filas nuevas de sidebar y dos entradas nuevas en el command palette.

---

## 🔴 Lo que falta y no es código

| # | qué | a quién |
|---|---|---|
| 1 | **El archivo plano real** de Bancolombia **y cuál de los dos formatos** (PAB o SAP) usa Portofino. Si el layout real pidiera dos decimales implícitos, **cada giro saldría por 100 veces su valor** | Juan |
| 2 | **Los 8 escenarios tributarios**. El esquema tiene los tipos de concepto; **no hay cálculo** — sólo banderas de quién retiene, ni una tasa en el repo | Víctor |
| 3 | **El tope legal del interés de mora.** Y hoy la tasa está definida **dos veces distinta**: 2% mensual en el back, 6% anual en el micro para las cartas legales — la carta y el estado de cuenta se contradicen | abogado |
| 4 | **Aplicar la migración** y decidir cuándo se prende `motorDeCobrosV2` por inmobiliaria | Víctor |
| 5 | Una cuenta del PUC sin código oficial (el 4×1000 es de 1998, el decreto de 1993) | contador |

## Lo que no está probado

- **Nada se verificó en navegador.** Todo está probado por unidad; nadie subió un Excel de
  verdad ni emitió un recibo contra el back real.
- **La migración no está aplicada en dev**, a propósito: la rama no está mergeada.
- **Conciliación bancaria** (§2.3 del SPEC) y **medios de pago por inmobiliaria** (§2.4) no
  se construyeron. Cobre (§2.5) es una decisión de negocio, no una tarea.
