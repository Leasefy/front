# Caso de muestra para la migración

Cinco archivos consistentes entre sí, generados con `scripts/generar-muestras-migracion.mjs`
(semilla `20260901`: correrlo de nuevo da exactamente estos archivos). Sirven para recorrer
el muro de migración de punta a punta con una inmobiliaria de tamaño real.

| Paso | Archivo | Qué trae |
|---|---|---|
| 1 · Terceros | `01-propietarios.csv` | 60 propietarios (6 empresas con NIT, el resto personas con CC/CE), con banco, tipo y número de cuenta, titular y perfil tributario |
| 1 · Terceros | `02-inquilinos.csv` | 110 inquilinos con documento, correo y teléfono (90 tienen contrato; el resto no) |
| 2 · Propiedades | `03-inmuebles.csv` | 120 inmuebles en Bogotá 44 · Medellín 36 · Cali 10 · Sabaneta 9 · Envigado 7 · Bucaramanga 7 · Barranquilla 6 · Pereira 1 — 90 arrendados, 2 en venta, el resto disponibles |
| 3 · Contratos | `04-contratos.csv` | 90 contratos vigentes (23 comerciales), cada uno sobre una dirección del archivo 03 y un inquilino del 02 |
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
