# Cómo probarlo

Todo esto quedó **andando en tu máquina** al cierre del 2026-08-31.

| qué | dónde |
|---|---|
| panel | **http://localhost:3011** |
| back | `:3007` (reemplacé el que estaba corriendo, que era el de la rama vieja) |
| micro de agentes | `:4300`, sin tocar |
| cuenta | `hola+inmobiliaria3@leasefy.co` / `PRueba123#` — la de QA, **nunca la tuya** |

Si se cae algo:

```bash
# back
cd ~/rent/back-erp && npm run build && PORT=3007 node dist/src/main.js
# panel
cd ~/rent/mvp-erp && npx next dev -p 3011
```

🔴 **Entrar desde otro lado cierra esta sesión.** El guard de sesión única de la app deja
una sola viva por cuenta.

---

## Lo que preparé para que se vea

- **La migración quedó aplicada en la base de dev** (9 tablas nuevas, aditiva).
- **`motorDeCobrosV2` prendido sólo en la agencia de QA**, con **3 días de plazo**. Ninguna
  otra inmobiliaria cambió.
- **Las dos reglas de mora de Portofino**: interés diario del 0,0667% sobre canon +
  administración, y **10% del canon pasado el día 15** como gasto administrativo.
- **Datos**: un propietario con cuenta bancaria, dos inmuebles con contrato y arriendo
  vivos, y dos cobros de septiembre vencidos hace 22 días — uno limpio y otro **con
  $400.000 pagados sin recibo que los respalde**, que es como está toda la cartera real.

---

## El recorrido, en orden

### 1. Cobros → el desglose
`/panel/inmobiliaria/cobros`, pasá a **septiembre** con la flecha.

Vas a ver 2 cobros en mora y $3.040.783. Antes de esto `days_late` y `late_fee` estaban en
**cero** aunque el cobro llevara 22 días vencido, porque la mora sólo se calculaba si
alguien abría el reporte de cartera.

Dale a **«Hacer recibo de caja»** → elegí el apartamento. El desglose:

```
Canon de arrendamiento                 $ 1.800.000
Administración                         $   250.000
Interés de mora                        $    30.082   ← 0,0667% × 22 días
Gasto administrativo de cobranza       $   180.000   ← 10% del canon, pasado el 15
Total adeudado                         $ 2.260.082
```

Esto es lo que se pidió: que la persona de facturación lo vea **al hacer el recibo**, no
después.

### 2. El abono parcial
Escribí `500000`, elegí «Transferencia» y emitilo. Tiene que decir **«Entraron $500.000»**.

🔴 Probá también **$85.000** o **$950.000**: ese rango es donde el campo registraba la
**milésima parte** del pago —$500.000 se guardaba como $500 y el back lo aceptaba— y
estaba tapado por otro error que hacía fallar todo antes de llegar ahí.

### 3. Conciliar un pago viejo
Abrí el **Local 3**, que tiene $400.000 pagados sin recibo. Al intentar abonar, el sistema
se niega: recomponer el saldo borraría ese pago. Ofrece **conciliar**, te pide de dónde
salió la plata, y emite un recibo por la diferencia. Sin este paso el módulo no serviría
sobre ningún cobro que ya existe.

### 4. Inquilinos
`/panel/inmobiliaria/inquilinos` — la sección que no existía. Una fila **por persona**, con
todos sus arriendos adentro.

### 5. Migrar tu operación
`/panel/inmobiliaria/migracion` — los cinco pasos en orden. El **paso 1 (terceros)** es el
que se construyó: subir, mapear contra la plantilla del back, corregir sin volver a subir,
aplicar. Los pasos 2 y 3 enlazan a lo que ya existía. **4 y 5 dicen «en construcción»**, sin
botón muerto.

---

## Lo que NO vas a poder probar todavía

- **El archivo plano de dispersión.** El endpoint está y funciona, pero **el layout no está
  cotejado contra un archivo real** y Bancolombia tiene dos formatos. Se descarga
  llamándose `...-SIN-VERIFICAR-<hash>.txt` a propósito. Falta el archivo de Juan.
- **Contabilidad y PUC**: los 17 endpoints están vivos (probalos con `GET
  /inmobiliaria/contabilidad/puc`), pero **no tienen pantalla**. El sidebar ya decía
  «Contabilidad general — PRÓXIMAMENTE» desde antes.
- **Reglas de mora**: se configuran por API (`/inmobiliaria/reglas-de-mora`), todavía sin
  pantalla. Las dos de Portofino las dejé cargadas.

## Un detalle que vi probando

En el modal de elegir cobro, **el subtítulo «Elegí el cobro al que le entró la plata»
aparece dos veces**. Cosmético, no lo toqué.

---

## El muro de migración (2026-09-01)

La migración ahora es **bloqueante**: si la inmobiliaria no la resolvió, el panel se ve
desenfocado detrás y sólo se puede avanzar por los cinco pasos, en orden. La agencia de
QA quedó **a propósito sin resolver** para que lo recorras: entrá y vas a ver el muro con
terceros, propiedades y contratos ya en «listo» (derivados de datos reales), el paso 4
activo y el 5 en espera.

- **Paso 4 — Cuentas del PUC** (`/panel/inmobiliaria/migracion/puc`): «Cargar el plan de
  cuentas base» siembra 99 cuentas del Decreto 2650 (ya lo hice en QA). Arriba queda la
  única sin código oficial —`511580`, el 4×1000— para confirmar con el contador.
- **Paso 5 — Registros contables** (`/panel/inmobiliaria/migracion/contables`): dos
  caminos. **Saldos iniciales** (un asiento de apertura cuenta por cuenta; el botón no se
  habilita hasta que débitos = créditos) o **migrar el histórico** (Excel → mapear →
  revisar → aplicar; las cuentas que no existan en el PUC se avisan, no se crean solas).
  **Este paso lo dejé sin hacer** para que lo hagas vos y veas bajar el muro.
- 🔴 **Todo pasa adentro del muro (2026-09-01, segunda vuelta).** La primera versión
  tenía un «Empezar» por paso que mandaba a la pantalla del paso, y esas pantallas estaban
  exentas del muro: un clic y se veía la plataforma entera. Ahora **no hay rutas exentas**:
  el muro tapa todo el panel y el contenido completo de cada paso (subir archivo, bajar
  plantilla, revisar, aplicar) se monta adentro — los mismos componentes de las pantallas
  sueltas (`MigrarTerceros`, `ImportWizard`, `MigrarContratos`, `PlanDeCuentas`,
  `RegistrosContables`). Es un panel casi a pantalla completa: arriba la barra de pasos
  (columnas iguales, como el onboarding de cuenta; los habilitados son botones), en el
  medio el paso elegido con scroll propio, abajo las salidas.
- El muro vuelve a pedir el estado **cada 5 s** mientras está puesto: cuando un paso pasa
  a «listo», la barra lo marca y el pie ofrece «Seguir con «X»» — pero nunca te cambia de
  paso solo, y un fallo de red no lo baja (bajarlo desmontaría el archivo que estás
  revisando). Con los cinco listos aparece la franja «Todo listo» con los conteos y
  «Entrar al panel». «No vengo de otro sistema, arranco de cero» está mientras falte algo.
- Los saltos entre pasos que tenían los componentes (PUC → «Continuar al paso 5»,
  contables → «Ir al paso 4», el «cancelar» del importador de inmuebles) ahora se quedan
  adentro del muro; en las pantallas sueltas siguen siendo enlaces.
- Si tu usuario no tiene permiso para un paso (`configuracion` / `portafolio` /
  `contratos`), el muro lo dice en vez de dejar que el componente falle con 403.

🔴 **Las 4 agencias que ya operaban quedaron marcadas como «migración completada»** por
la migración `20260901020000`, para que no vieran el muro mañana. Si querés que también
pasen por el PUC, es borrar ese `UPDATE`. Ojo al criterio: marca a las que tienen un
contrato **vigente**; una con todos sus arriendos vencidos y sin PUC quedaría afuera.

## Las pantallas del bloque 1 (2026-09-01)

Todas están detrás del muro: la agencia tiene que haber migrado o haber elegido «arranco de cero».

1. **Configuración → Perfil → Editar**: sección «Cobros y mora» — prendé «Motor de cobros con reglas de mora», poné días de plazo (p. ej. 5) y días para siniestro (30). Sección «Dispersiones» — código en todos los lotes y/o umbral del segundo aprobador. Guardar. Si el NIT no tiene dígito de verificación y no te deja guardar, es la validación vieja (se relaja en el bloque 2).
2. **Cobros → Reglas de mora**: con la lista vacía aparecen dos plantillas («Interés diario después del plazo», «10 % de gasto administrativo desde el 15»); un clic cada una. «Nueva regla» abre el editor; las validaciones son las del back (un interés diario mayor que 1 % se frena con el mismo mensaje).
3. **Contratos → Nuevo / Editar**: junto a «Día de pago» están «Días de plazo antes de la mora» (vacío = los de la inmobiliaria) y el switch «Prorratear el primer mes».
4. **Cartera**: la sección «En siniestro» aparece siempre, con el plazo real de la configuración; se llena cuando el cron de la 1 a. m. pasa un cobro a siniestro (sólo con el motor prendido).
5. **Dispersiones → Lotes al banco**: «Armar lote de <mes>» toma las dispersiones pendientes del mes; sin dispersiones el back lo dice. Con lote: pedir aprobación (el código llega por correo a quien puede aprobar; el creador no puede aprobar su propio lote), aprobar con el código, generar el archivo (sólo PAB; el nombre lleva `SIN-VERIFICAR` hasta tener el archivo real del banco), descargar, marcar pagado con la referencia, anular con motivo.
6. **Contabilidad general** (sidebar): hub → Plan de cuentas (el mismo PUC del muro), Asientos (libro paginado, detalle en panel lateral, reversar, «Asiento manual» con partida doble en vivo, «Cerrar período…»), Reportes (balance de prueba con «cuadra», libro auxiliar por cuenta, estado de cuenta por tercero).

## Las pantallas del bloque 2 (2026-09-01, tarde)

1. **Configuración → Perfil → Editar → «Impuestos y retenciones»**: IVA 19, retefuente arrendamiento 3,5, comisiones 11, reteICA (vacío = no se practica; Bogotá comercio 9,66), reteIVA 15, base mínima de retefuente (vacío = sin mínimo). Se aplican sólo con el motor prendido, y sólo cuando en la ficha del contrato (sección Administración → perfil tributario del inquilino) se dijo que el inquilino retiene; el IVA del canon sólo en inmueble comercial con propietario responsable de IVA.
2. **Configuración → Medios de pago**: «Efectivo en la oficina» de un clic; «Completar la cuenta» prellena la transferencia con los datos del perfil. Los medios activos aparecen en el selector del recibo de caja y, si «visible al inquilino», en `/inquilino/pagos` → «Cómo pagar» con el número tapado.
3. **Contabilidad general → Mapeo contable**: «Usar las cuentas propuestas» siembra las 8 (bancos, caja, 2815 por concepto, comisión, IVA, giro). Desde ahí, cada recibo de caja nuevo, cada anulación y cada lote pagado generan su asiento (se ve en Asientos con origen «Recibo de caja» / «Dispersión»). Sin una cuenta en un evento, ese asiento no se genera y queda en el log.
4. **Cobros → Extracto bancario**: subí el CSV/Excel del banco tal cual (fecha, valor o crédito/débito, descripción, referencia). Las líneas repetidas no se duplican; las salidas se listan y sólo se ignoran. Cada entrada muestra hasta 3 cobros candidatos con el porqué; el «seguro» (valor exacto + identidad o único con ese saldo) se concilia de un clic o todos juntos con «Conciliar los seguros». Conciliar emite el recibo de caja (medio transferencia, referencia del banco). Anular ese recibo devuelve la línea a pendiente.
5. **Recaudo** (sidebar): mes por mes, «Llegó» (recibos no anulados con fecha en el mes), «Pendiente», «Dispersado» (lotes pagados + dispersiones procesadas sin lote), «Disponible» (acumulado recaudado − dispersado − comisiones; puede ser negativo si hubo giros sin recibo). 12 meses en barras y tabla por medio.
