# Caso de muestra para la migración

Cinco archivos consistentes entre sí, generados con `scripts/generar-muestras-migracion.mjs`
(semilla `20260901`: correrlo de nuevo da exactamente estos archivos). Sirven para recorrer
el muro de migración de punta a punta con una inmobiliaria de tamaño real.

| Paso | Archivo | Qué trae |
|---|---|---|
| 1 · Terceros | `01-propietarios.csv` | 60 propietarios (6 empresas con NIT, el resto personas con CC/CE), con banco, tipo y número de cuenta, titular y perfil tributario |
| 1 · Terceros | `02-inquilinos.csv` | 110 inquilinos con documento, correo y teléfono (90 tienen contrato; el resto no) |
| 2 · Propiedades | `03-inmuebles.csv` | 120 inmuebles en Bogotá 44 · Medellín 36 · Cali 10 · Sabaneta 9 · Envigado 7 · Bucaramanga 7 · Barranquilla 6 · Pereira 1 — 90 arrendados, 2 en venta, el resto disponibles |
| 3 · Contratos | `04-contratos.csv` | 90 contratos vigentes (23 comerciales), cada uno sobre una dirección del archivo 03, un inquilino del 02 y el propietario del inmueble (nombre y documento del 01): con eso el paso 3 consigna solo |
| 5 · Registros contables | `05-asientos-historicos.csv` | 1043 comprobantes / 2839 líneas del libro diario de 2026-06, 2026-07, 2026-08: recaudo, comisión con IVA, giro al propietario con 4×1000, pago de administración y gastos de la oficina |

Recaudado en los tres meses: $1.044.630.000 · comisiones: $89.274.000.

## Cómo se enlazan

- **Inmueble → dueño**: la columna `Propietario` trae el nombre completo tal cual está en
  `01-propietarios.csv`, y `Tel Propietario` el mismo teléfono.
- **Contrato → inmueble**: `Dirección del inmueble` es idéntica a la `Dirección` del archivo 03.
  El migrador casa por dirección normalizada, así que tiene que ser la misma; lo es.
- **Contrato → inquilino**: nombre, cédula, correo y teléfono son los del archivo 02.
- **Asientos → PUC**: sólo códigos que existen en el plan base (Decreto 2650) que siembra el paso 4.
  Cargá el PUC base ANTES de subir este archivo; si no, cada línea va a decir que la cuenta no existe.
- **Asientos → contratos**: cada recaudo, comisión y giro menciona la dirección del contrato.

## Para tener en cuenta

- Los correos son `@example.com` a propósito: el correo del inquilino es la llave de su cuenta del
  portal, y no queremos invitar a una persona real por accidente.
- 🔴 **Los inquilinos no se crean hasta que el back deje de invitar por correo en la misma
  llamada.** Hoy `aplicar` crea cada inquilino con `inviteUserByEmail` de Supabase, y el
  proyecto de dev devuelve `429 over_email_send_rate_limit` a la segunda o tercera invitación
  (probado el 2026-09-01: las 110 filas pasan la revisión, «Listas para crear 110», y al crear cada
  una dice «No se pudo invitar a …: Error sending invite email» / «email rate limit exceeded»).
  No es un problema del archivo: el back tiene que crear el usuario sin mandar el correo y
  encolar las invitaciones aparte (o a un ritmo que el SMTP aguante). Los propietarios sí se
  crean —no se invitan—: 60 de 60.
- 🔴 **Los inmuebles entran sin consignación.** El asistente de inmuebles crea las 120
  propiedades (probado: 120 de 120, geocodificadas) pero ignora «Propietario», «Tel
  Propietario» y «Comisión %» para el mandato: la agencia queda con 0 consignaciones, y en el
  paso 3 los 90 contratos resuelven su inmueble (90 de 90 por dirección) pero cada uno pide
  «Registrar y consignar» a mano (nombre del propietario, documento, comisión). Hay un diálogo
  de mandatos en lote (`CompletarMandatosLoteDialog`) construido pero sin conectar, y asigna
  UN dueño a todo el lote — no sirve para muchos dueños. Falta: que la importación case el
  propietario por documento/nombre+teléfono y cree la consignación con la comisión de la fila.
- ✅ Lo que sí pasó de punta a punta en QA (`portofinoqaprb`, 2026-09-01): 60 propietarios
  creados; 120 inmuebles creados; 90 contratos revisados con inmueble resuelto; PUC base
  sembrado (99 cuentas); **1.043 asientos / 2.839 movimientos aplicados, débitos = créditos =
  $2.141.126.351**.
- Los contratos de **vivienda van sin depósito** (Ley 820 de 2003, art. 16 lo prohíbe); los
  comerciales llevan uno o dos cánones.
- Un 8 % de los contratos se atrasa un mes y paga al siguiente: en el libro diario aparece
  «(atrasado)». Los bimestrales cobran mes por medio.
- Los encabezados son los títulos que publica cada importador, así que el auto-mapeo los
  reconoce solo. Si remapeás algo a mano, el archivo sigue sirviendo.
- Son CSV UTF-8 con BOM, separados por coma: Excel, Numbers y Google Sheets los abren con
  las tildes bien.

## Otro tamaño u otro caso

```bash
node scripts/generar-muestras-migracion.mjs --semilla=7 --propietarios=200 --inquilinos=400 --inmuebles=450 --contratos=380
```
