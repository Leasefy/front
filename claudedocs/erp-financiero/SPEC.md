# ERP financiero — cobros, recaudo, dispersiones, migración y contabilidad

Especificación derivada de la reunión del **2026-08-31** (Nico, Víctor, Juan — Portofino/Licify).
Fuente: transcript «Licify — migración de datos, configuración de cobros y dispersiones».

> Regla de este documento: **cada afirmación viene del transcript o está marcada como
> supuesto / pregunta abierta.** Lo que no se dijo, no se inventa.

**Reparto acordado en la reunión**: Nico hace el front y la experiencia completa; Víctor
hace el backend. Nico además se lleva el módulo de contabilidad. La rama
`feat/migracion-de-inmobiliarias` del back ya es de Víctor.

---

## 1. Cobros, cartera y mora

### 1.1 Fechas del contrato

- **Fecha de cartera** = la fecha de cobro que se le va a realizar al usuario, derivada de
  **cuándo inició el contrato**. Ejemplo del transcript: contrato iniciado el 19 de octubre.
- **Fecha de corte**: la fecha mensual recurrente. En Portofino el corte es **del 1 al 3 de
  cada mes**. La «fecha de cartera» rige el **primer** mes; el corte rige los siguientes.
- **Días de plazo**: días después de la fecha de corte que el inquilino tiene para pagar
  antes de que se genere mora. Ejemplo real: el contrato 1050 tiene **3 días**.
  Configurable por contrato.

### 1.2 Prorrateo del primer mes

Cada inmobiliaria elige si el primer cobro es **prorrateado o no**.

- Si es prorrateado y el contrato inicia el **19 de octubre**, se cobra **sólo el restante
  de octubre**.
- El mes siguiente (noviembre) se cobra **el mes completo, automáticamente**. No hay que
  desmarcar nada: el sistema ya sabe que el prorrateo aplicó una sola vez.

### 1.3 Interés por mora

- **No existe hoy** en Leasefy. Hay que agregarlo.
- **Lo define cada inmobiliaria**, libre, en su configuración.
- Se empieza a generar **por día**, a partir del día siguiente a los días de plazo.
  Ejemplo: no pagó agosto → desde el **día 3 de agosto** el sistema genera interés diario.

🔴 **Pregunta abierta (legal).** Nico preguntó en la reunión si hay un máximo legal y quedó
sin resolver («Sí, pero usted sabe, Nico, que acá se ve todo»). En Colombia el interés
moratorio tiene tope: la tasa de usura certificada por la Superintendencia Financiera.
**Propuesta**: dejar el campo libre pero validar contra un tope configurable y advertir en
la UI cuando se supere. **Necesita confirmación de abogado antes de liberar.**

### 1.4 Varias reglas de cobro sobre el mismo arriendo

Esto es un **diferenciador**: Nube (el nuevo) no lo permite; el Nube viejo sí.

Portofino, como inmobiliaria, aplica **dos reglas encadenadas**:

| desde | qué se agrega |
|---|---|
| pasados los días de plazo (día 3) | **interés de mora**, diario |
| pasado el **día 15** | además, **10% del canon** como *gasto administrativo* / honorario de cobranza |

El modelo tiene que soportar **N reglas por contrato o por inmobiliaria**, cada una con su
disparador (día del mes o días de mora) y su fórmula (tasa diaria / porcentaje del canon /
monto fijo).

### 1.5 Total adeudado y conceptos

El total se calcula **automáticamente**:

```
total adeudado = canon + intereses de mora + gastos administrativos
```

- Los intereses y los honorarios entran como **conceptos** del cobro, igual que el canon:
  «canon de arrendamiento + intereses + honorarios». No son un campo suelto.
- 🔴 **Por qué importa**: cuando la persona de facturación va a hacer el recibo de caja el
  día 16, tiene que ver los intereses y el gasto administrativo **ya sumados**, para no
  aceptar un pago incompleto creyendo que el cliente quedó al día. Ese es, literal, «donde
  mueren las inmobiliarias».
- El agente de cobranza también tiene que verlo desagregado: «debe 2 millones, de los
  cuales 1.800.000 es canon, más intereses de mora, más el honorario».

### 1.6 Pagos parciales y acuerdos de pago

- **Pagos parciales**: un cobro admite abonos; el saldo queda pendiente.
- **Acuerdos de pago**: los puede armar el agente de cobranza, o la persona de cartera
  cuando el inquilino llama directo. Hay que llevarlo «a la operación real».

### 1.7 Cartera y siniestro

- Reporte de **cartera pendiente** con seguimiento.
- **A los 30 días de mora → siniestro.** Portofino le reporta a la aseguradora el **día 8**,
  pero el siniestro real es a los 30.
- 🔴 **La aseguradora sólo devuelve el CANON.** No devuelve intereses ni gastos
  administrativos. Por eso, si se recupera antes del día 15, la inmobiliaria gana; si se va
  a siniestro, pierde los accesorios.
- La inmobiliaria **igual le puede cobrar** los intereses y honorarios al inquilino, pero
  «ya se vuelve más complejo».
- **Después del siniestro** hay dos caminos:
  1. El inquilino empieza a pagar vencido y la aseguradora lo deja seguir.
  2. No paga dos meses → **restitución del inmueble**, y la hace **la aseguradora**, no la
     inmobiliaria.
- **Qué debe decir Leasefy en ese punto**: que el caso ya lo lleva la aseguradora y que
  desde acá no hay más datos. Pedido explícito de Nico.

### 1.8 Impuestos y retenciones por contrato

El contrato tiene que poder llevar: **IVA · retención en la fuente · ReteICA · ReteIVA**.

- Depende de la condición del contrato — Víctor mencionó **«los 8 escenarios»** que ya tenía
  mapeados. 🔴 **Falta ese mapa**: hay que pedírselo antes de modelar.
- Ejemplo del transcript: propietario = constructora que presta un servicio comercial →
  **genera IVA**; el arrendatario (JIC Papas) → **hace la retención**. En ese contrato
  ReteICA y ReteIVA van en cero, pero podrían aplicar en otro.
- El cobro debe mostrar **valor sin impuestos** y el desglose.

### 1.9 Menores, del transcript

- Mostrar **cuenta bancaria** en observaciones.
- Mostrar **saldo pendiente** en observaciones.

---

## 2. Recaudo y recibos de caja

### 2.1 Renombrar y arreglar

- «**Cobro manual**» pasa a llamarse «**recibo de caja**», en finanzas.
- 🔴 En Licify hoy **«registrar pago» no funciona**. Hay que construir el flujo de recibo de
  caja manual de verdad.
- Distinción que Víctor marcó: **una cosa es la factura** (la inmobiliaria factura a inicio
  de mes) **y otra el recibo de caja** (registrar que entró la plata).

### 2.2 El flujo real de hoy

La persona de cartera entra, usa el **rango de búsqueda**, encuentra al cliente, ve
«Alice Ortiz — agosto — debe 5.351.192» y hace el recibo. Ese es el flujo a igualar,
con los conceptos desagregados (§1.5) a la vista.

### 2.3 Conciliación bancaria

Lo que hace Nube y hay que igualar:

1. Se sube el **archivo del banco** (Bancolombia).
2. El sistema **mapea la referencia de pago** contra el inquilino y contra lo que debía.
3. Los pagos **congruentes** (pagó exactamente lo que debía) generan **recibo de caja
   automático**.
4. Los que no cuadran quedan para revisión manual.

Motivación de Nico: «la operación financiera de una inmobiliaria es muy dura porque toca
hacerlo uno a uno».

### 2.4 Medios de pago

- **Por ahora**: cada inmobiliaria configura **su propia pasarela** y sus cuentas
  (Bancolombia, Davivienda, OnePay…). Eso «nos quita ese problema» de entrada.
- Integración tipo Nube↔Paloma: el ERP manda las facturas del mes, la pasarela cobra por
  WhatsApp y recauda, y **cada recaudo genera recibo de caja automático** en el ERP.
  Técnicamente: leer la pasarela del cliente con un token, o que ellos peguen a un webhook.
- 🔴 **Dato duro**: no toda la plata entra por la pasarela. En agosto Portofino recaudó
  **374 millones por OnePay** y **el resto por Bancolombia normal**. El diseño no puede
  asumir que la pasarela ve todo.

### 2.5 Cobre — la apuesta grande

- OnePay y Paloma están montados sobre **Cobre** (antes visto como «Plexo»).
- La idea: **Leasefy recauda y dispersa directo por Cobre**, eliminando la pasarela
  intermedia. «Cobran por recibir y por dispersar» → se puede poner un spread.
- **Acción, no código**: Nico habla con **Emilio, CPO de Cobre**.
- Advertencia de Víctor: la dispersión masiva de esos proveedores **es lenta** (hasta 2 días).

### 2.6 Vista de recaudo

Un lugar donde la inmobiliaria ve **cuánto llegó, cuánto hay disponible y el estado del
mes**. Nico dice que en finanzas ya existen «recaudo del mes, propiedades totales,
comisiones, ocupación» — hay que verificar qué de eso es real.

---

## 3. Dispersiones a propietarios

### 3.1 Qué es

Egresos a los propietarios. La pantalla debe listar, para el mes: **contratos activos ·
propietario · neto · comisión de la inmobiliaria · total a pagar**, y permitir confirmar
a cuántas personas se les paga y cuánto.

### 3.2 El dolor actual

El auxiliar contable hace los egresos **uno a uno**: entra, busca el propietario, pone el
rango de búsqueda, guarda. Después exporta Excel → lo pasa por el **conversor de
Bancolombia** → sube el archivo plano → se aprueba el pago. Al día 7 ya está todo
dispersado. Ejemplo real: el 3 de agosto, **34 millones** en un día.

### 3.3 Qué hay que construir

- **Dispersión manual** (una) y **masiva** (el lote del mes).
- 🔴 **Generación automática del archivo plano** compatible con **Bancolombia / OnePay**,
  con un botón. «Que usted únicamente con un pinche botón se le genere ese archivo».
  Esto es lo más valioso y lo más barato: no requiere que Leasefy custodie la plata.
- 🔴 **Falta el insumo**: Juan iba a mandar **un archivo plano real** de ejemplo. Sin eso el
  formato es un supuesto. **Pedirlo antes de dar el export por bueno.**

  Averiguado el 2026-08-31: Bancolombia no tiene *un* formato, tiene **dos** para pagos
  masivos de nómina/proveedores por Sucursal Virtual Empresas — **PAB** (el del «conversor»
  que mencionó Juan, formato 2003) y **SAP**. Cuál aplica depende de por dónde se sube el
  lote. La especificación campo por campo está en el manual del conversor de Bancolombia,
  que no es públicamente accesible sin credenciales.
  ⇒ **Preguntarle a Juan las dos cosas: el archivo real Y cuál de los dos formatos usan.**

### 3.4 Seguridad — no negociable

Escala: **~300 pagos al mes**, montos que **superan los mil millones**. Nico: «imagínese
dejar acá que todo el mundo pueda hacer con la plata lo que quiera».

| control | detalle |
|---|---|
| **PIN** | para poder dispersar |
| **Código dinámico** | como OnePay: al aprobador le llega un código al **celular**, se lo pasa a quien montó el lote |
| **Aprobador** | rol distinto del que arma el lote — dos personas |
| **Resumen por correo** | del lote aprobado: qué se aprobó y cuánto se pagó |

---

## 4. Migración y onboarding

### 4.1 El segundo onboarding

Después del onboarding de creación de cuenta, un **onboarding de migración**: un botón
«migrar mi inmobiliaria» que lleva por una secuencia de pasos, uno por uno, hasta terminar.

### 4.2 La secuencia (acordada al final de la discusión)

1. **Terceros**: inquilinos y propietarios.
2. **Propiedades / inmuebles.**
3. **Contratos.**
4. **Cuentas contables del PUC.**
5. **Registros contables históricos.**

> Hubo desacuerdo en el orden (Víctor proponía inmuebles antes que terceros). **Quedó
> terceros primero**, siguiendo la secuencia de 10 plantillas de Nube que Nico ya tenía
> mapeada.

Nota de modelado: en Nube, propietarios e inquilinos van en **una sola plantilla de
«terceros»** con una clasificación. En Leasefy están separados. Hay que decidir si se
unifica o se mantienen dos plantillas. 🔴 **Decisión pendiente.**

### 4.3 Lo que falta construir

- **Migración masiva de propietarios.**
- **Migración masiva de inquilinos** — que requiere una **sección de inquilinos nueva**:
  hoy no existe («yo ni siquiera tengo sección de inquilinos»).
- Mapear completamente **las plantillas** y el proceso.

### 4.4 Por qué importa

Nico: «yo tampoco quiero pasar mi inmobiliaria y perder todo mi registro contable». Son
**cientos de miles de filas**. Y el antecedente es duro: Portofino **nunca fue capaz de
migrarse a Nube** en dos meses y terminó dejando de pagarlo. La migración es la barrera
real de adopción del producto.

---

## 5. Contabilidad

- 🔴 **No existe.** Hay que construir el módulo entero.
- **Cuentas del PUC** asociadas a los contratos **y** a la operación general de la
  inmobiliaria.
- **Migrar registros contables históricos** (paso 5 de la secuencia).

---

## 6. Insumos que faltan — bloquean trabajo, no son código

| # | qué | a quién | bloquea |
|---|---|---|---|
| 1 | **Archivo plano real** de Bancolombia/OnePay | Juan | el export de dispersiones (§3.3) |
| 2 | **Los 8 escenarios** de impuestos y retenciones | Víctor | el modelo tributario del contrato (§1.8) |
| 3 | **Tope legal del interés de mora** | abogado | liberar la configuración de mora (§1.3) |
| 4 | **Las 10 plantillas de migración** de Nube | Nico | el mapeo de la migración (§4.3) |
| 5 | **Contacto con Cobre** (Emilio, CPO) | Nico | la decisión de recaudar en Leasefy (§2.5) |
| 6 | Credenciales de **Nube / Nubi** de la otra inmobiliaria | Juan | escanear funcionalidades faltantes |

---

## 7. Salió en la reunión y NO está en la lista de tareas

Lo dejo anotado para que no se pierda; no lo construyo sin que se pida.

- **«Recordarme esta cuenta» en el login.** La sesión se cae por seguridad y molesta.
- **Calculadora de servicios públicos con IA.** Dividir la factura de EPM entre propietario
  e inquilino según el corte de la zona y la fecha de inicio del contrato. Ejemplo: en
  Caldas el corte es del 20 al 20; si el contrato arrancó el 28, al propietario le
  corresponde una parte y al inquilino los 8 días restantes. Nico dijo «eso me lo llevo yo
  también y lo creo». Nube lo tiene pero manual.
- **Módulo de PQRS.** Existe en Nube, «pero es muy manual».
- **Escanear Nube y Nubi** para sacar el faltante funcional y construirlo.
- **Modelo de negocio**: Nube cobra ~$1.416 por contrato/mes (1.7M ÷ 1.200 contratos), sólo
  ERP. Referencia de precio.
