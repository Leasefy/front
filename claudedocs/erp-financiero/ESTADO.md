# Qué existe hoy y qué falta — inventario medido

Levantado el **2026-08-31** con seis exploraciones paralelas sobre los tres repos, y
**re-verificado contra `origin/develop`** de cada uno (los checkouts locales estaban 235 y
434 commits atrás — los primeros hallazgos se comprobaron de nuevo antes de darlos por
buenos).

Compañero de [SPEC.md](SPEC.md), que es lo que se pidió. Esto es lo que hay.

---

## Los tres repos y quién manda sobre qué

| repo | qué es | base de este trabajo |
|---|---|---|
| `back` | monolito NestJS + Prisma. **Fuente de verdad de la plata.** | worktree `back-erp`, rama `feat/erp-cobros` desde `origin/develop` |
| `mvp` | panel Next.js | worktree `mvp-erp`, rama `feat/erp-financiero` desde `origin/develop` |
| `agent-integracion` | micro de agentes (Laura cobranza, Piloto) | sin tocar por ahora |

🔴 **El micro NO calcula deuda.** Recibe un lote nocturno del back
(`POST /internal/cartera/mora-sync`) y lo proyecta. `public.cobros` del monolito es la
fuente de verdad del monto y del desglose. Todo lo que se construya de cobros va en el
back, y el micro se entera por ese riel.

---

## 🔴 Defectos verificados (no son features que faltan — es código roto hoy)

### D1 · Registrar un pago devuelve 400

El front manda `paymentDate`; el DTO del back espera `paidDate`. El back arranca con
`forbidNonWhitelisted: true`, así que una clave desconocida **no se ignora: es 400**.

Es exactamente lo que Nico dijo en la reunión («*ese no funciona, no funciona registrar
pago*»). En la rama vieja eran tres defectos apilados —verbo, ruta y campo—; en `develop`
ya arreglaron el verbo y la ruta, **y quedó el campo**. El síntoma cambió de 404 a 400.

- front: `src/lib/api/inmobiliaria.service.ts` · back: `src/inmobiliaria/cobros/dto/register-payment.dto.ts`
- **Estado: ARREGLADO** en `feat/erp-financiero`, con 7 tests de contrato que fijan método,
  ruta y el juego exacto de claves.

### D2 · La mora sólo se calcula si un humano abre un reporte

`CobrosService.updateLateFees()` tiene **un solo invocador en todo el repo**: el endpoint
`GET /inmobiliaria/cobros/cartera-report`. No hay ningún `@Cron` que lo dispare.

Consecuencias medidas:
- `lateFee`, `totalWithFees`, `daysLate` y el estado `LATE` quedan **congelados** hasta que
  alguien abra el reporte de cartera.
- El evento `cobro.vencido` —el que dispara las notificaciones— **sólo se emite desde ahí**.
- 🔴 El cron nocturno `mora-sync` (2 a.m.) empuja la cartera al micro de cobranza **sin
  recalcularla antes**. El micro documenta que el `lateFee` que recibe «ya viene calculado
  por un job del back con el `lateFeePercent` de la agencia». **Ese job no existe.** O sea:
  Laura le dice al deudor por teléfono una cifra que puede estar semanas vieja.

Es, palabra por palabra, lo que Nico describió: «*como el sistema automáticamente no está
calculando la mora*».

### D3 · La mora cobra un mes entero desde el primer día

```
monthsLate = max(1, ceil(daysLate / 30))
lateFee    = totalAmount × (defaultLateFeePercent/100) × monthsLate
```

Con el 2% por defecto, **un día de atraso cuesta lo mismo que treinta**. No hay interés
diario, no hay días de plazo, y el salto del día 30 al 31 duplica el recargo de golpe.

### D4 · El día de pago del contrato se captura y se ignora

`Contract.paymentDay` (1-28) existe, se pide en el formulario de crear contrato y se copia
a `Lease.paymentDay`. Pero `createCobroForConsignacion` calcula
`dueDate = new Date(year, mes-1, agency.paymentDueDay)` — **el día por defecto de la
agencia**. El dato del contrato no se usa nunca.

### D5 · Un abono parcial pisa al anterior

`registerPayment` recibe `paidAmount` como **monto absoluto** y sobreescribe
`paidAmount`/`paymentMethod`/`paymentReference`/`paidDate` en la misma fila. Dos abonos: el
segundo borra la huella del primero. No hay histórico. Quien llama tiene que mandar el
acumulado, cosa que el formulario del panel no hace.

### D6 · El armado automático del siniestro es un no-op silencioso (en el micro)

El cron que arma el paquete de reclamación consulta columnas que no existen
(`ap.aseguradora_name`, `ap.insurance_policy_active`, `dd.canones_vencidos_count`…), y el
`try/catch` lo deja en `[]`. Nunca falla, nunca hace nada. **No es de este trabajo pero hay
que avisarlo.**

---

## Lo que SÍ existe (y no hay que volver a construir)

| capacidad | dónde | estado |
|---|---|---|
| Modelo `Cobro` por consignación/mes | `prisma/schema.prisma` | sólido; le faltan conceptos, impuestos y ledger |
| Estado `PARTIAL` y registro de pago | `cobros.service.ts` | existe, con el defecto D5 |
| Reporte de cartera con edades 0-30/31-60/61-90/90+ | `reports.service.ts` | funciona |
| Módulo de **dispersiones** completo | `dispersiones.service.ts` + panel | preview, generate, approve, process, extracto PDF |
| Comisión y neto al propietario | `liquidacion/` | con conceptos a favor/cargo y de terceros |
| Datos bancarios del propietario | `Propietario` | banco, tipo, número, titular |
| Pasarela **Wompi/PSE** con webhook firmado y reconciliación | `tenant-payments/wompi/` | activa, sólo cobro entrante |
| Vista de recaudo | dashboard + `cobros/summary` + `analytics` | existe en 4 lugares |
| **Migración de contratos** (preparar → resolver → activar) | `contracts/migracion/` | ya construida por Víctor, entrada JSON |
| Perfil tributario de las 3 partes | `Contract`, `Agency`, `Propietario` | **booleanos de quién retiene**, sin montos |
| Conceptos del contrato (`ContratoConcepto`) | schema | con `BaseTributaria`; se agregan a `adminAmount` |
| Importador de **propiedades** por Excel/CSV | `import/ImportWizard.tsx` | 5 pasos, con revisión IA |
| Onboarding de agencia | `onboarding/inmobiliaria/` | 4 pasos, sesión en el micro |

---

## Lo que NO existe

### Cobros y mora
- Días de plazo antes de la mora (hay un `GRACE_PERIOD_DAYS = 5` **hardcodeado y sólo para
  scoring**, que no toca el cobro).
- Interés de mora real: diario, con tasa por inmobiliaria.
- **Reglas encadenadas** (el 10% de gasto administrativo pasado el día 15). Nada parecido.
- Prorrateo del primer mes. Lo único que se llama «prorrateo» es el reparto de un pago
  parcial entre propietario e inmobiliaria — otra cosa.
- Desglose por concepto **del cobro**: `adminAmount` es un agregado; no hay tabla de líneas.
- Montos de impuestos. Hay banderas de quién retiene, no cuánto. Ni una tasa en el repo.
- Ledger de abonos.
- Acuerdo / plan de pago **en el back** (sí existe, y bien, en el micro de cobranza: techo
  de 4 cuotas por CHECK en base, descuentos por etapa que nunca tocan el principal).
- Estado de siniestro en `Cobro` (vive en el micro; `CobroStatus` llega hasta `DEFAULTED`).

### Recaudo
- «Recibo de caja» como documento. El concepto no existe con ese nombre en ningún lado.
- **Conciliación bancaria**: cero. Lo que se llama «reconciliation» es consultarle a Wompi
  el estado de una transacción que ya conocíamos.
- Medios de pago configurables por inmobiliaria. Sólo Wompi, global.
- OnePay, Paloma, Cobre: ninguno.

### Dispersiones
- **Archivo plano**. No hay ninguna generación de instrucción de pago bancaria.
- PIN, código dinámico, doble aprobación, resumen por correo. Hoy `approve()` es **un solo
  usuario cambiando un estado**, sin segundo control ni tope por monto.
- El pago sale del sistema y alguien pega la referencia a mano.

### Terceros y migración
- 🔴 **No hay sección de inquilinos.** Ni ruta, ni ítem de menú, ni modelo propio: el
  inquilino es un `User` con rol `TENANT`, o un campo `tenantName` dentro de un candidato.
- No hay carga masiva de propietarios ni de inquilinos.
- El importador de propiedades **no tiene endpoint de bulk**: crea de a una en un loop
  desde el navegador.
- No hay onboarding de migración (el de creación de cuenta existe y es otra cosa).

### Contabilidad
- **Nada.** Ni PUC, ni cuentas, ni asientos, ni doble partida. Lo único es el valor de enum
  `IntegrationCategory.ACCOUNTING`, un placeholder sin nada detrás.

---

## Dos cosas que hay que decidir antes de construir

**1. La tasa de mora está definida dos veces, distinta, y las dos corren.**
El back cobra `Agency.defaultLateFeePercent` (2% **mensual** por defecto ⇒ 24% anual). El
micro, para las cartas pre-jurídicas, calcula **6% anual** (Art. 884 CCo residencial) o
1.5× el bancario corriente si es comercial, según `AgencyPolicy.legalInterestRateKind`.
Son cifras muy distintas para la misma deuda, y la carta legal y el estado de cuenta se
contradicen. **Hay que unificar, y la respuesta es del abogado** (insumo #3 del SPEC).

**2. El techo legal.** Nico lo preguntó en la reunión y quedó sin responder. En Colombia el
interés moratorio tiene tope de usura. La configuración por inmobiliaria debería validar
contra ese tope, no ser libre.

---

## Cómo se va a construir

Todo lo que pueda mover plata o cambiar lo que se le cobra a un inquilino nace **apagado**,
por inmobiliaria. Una agencia que no lo prenda sigue viendo exactamente el comportamiento
de hoy. Esa es la única forma de tocar el motor de cobros de un sistema con contratos
vivos sin arriesgar un cobro mal hecho.
