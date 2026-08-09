# Front del recorrido: qué quedó hecho y qué NO — 2026-08-09

Rama `feat/recorrido-inmobiliaria`, worktree `~/rent/mvp-inmobiliaria`, dev en `:3002`.
**Todo pusheado.** 1895 tests · `tsc` · `next lint` sin errores · `pnpm build` ✓.

## Los cuatro commits

| | |
|---|---|
| `cfed2629` | las clases que no generaban CSS, y las que daban el color equivocado |
| `d2b24df0` | cargando / no existe / falló / vacío dejan de ser el mismo cartel |
| `5aaac331` | los cuatro huecos de front del recorrido de 11 pasos |
| `f02391b8` | un análisis en curso dejaba de leerse como buen resultado |

## Los 11 pasos, al cierre

| # | Paso | Antes | Ahora |
|---|---|---|---|
| 1 | Catálogo | ✅ | ✅ |
| 2 | Asegurabilidad | ✅ | ✅ |
| 3 | Paga el estudio | 🔴 no existía | 🟡 **pantalla completa**, pero el cobro no existe en el backend y la pantalla lo dice |
| 4 | Contra todas las aseguradoras | 🟡 sin verificar | 🟡 **sigue sin verificar** |
| 5 | Habilitar compatibles | 🟡 sin verificar | 🟡 **sigue sin verificar** |
| 6 | Postularse | ✅ | ✅ |
| 7 | Alerta a la agencia | 🟡 | ✅ vive en `/postulaciones` |
| 8 | Estudio A/B/C/D | 🟡 | 🟡 igual (depende del agente) |
| 9 | Comparar candidatos | 🔴 no existía | ✅ `/propiedades/:id/candidatos/comparar?ids=…` |
| 10 | Avisar a los no elegidos | 🔴 no se avisaba | ✅ `ModalAvisarNoElegidos` |
| 11 | Aseguradora + ID en el contrato | 🔴 no se registraba | ✅ como cláusula del contrato |

## Lo que NO está y por qué

**El cobro del estudio (paso 3).** Verificado contra el back y contra
`src/lib/api/generated/agent.ts`: no hay ninguna ruta de cobro del estudio para el
inquilino. Sólo existen `/agent-credits/purchase` (la inmobiliaria compra créditos) y
`/leases/:id/pse/checkout` (canon). La pantalla está entera y detecta la ausencia:
muestra «Todavía no se puede pagar desde acá» con salida, en vez de un formulario que
no cobraría nada. Endpoints que hacen falta, documentados en
`src/lib/api/estudio-pago.service.ts`:
```
GET  /tenant/estudio/pago          → { pagado, precioCop, incluye[], pagadoEl? }
POST /tenant/estudio/pago/checkout → { urlDePago, referencia }
```

**Los pasos 4 y 5 siguen sin probarse contra el agente corriendo.** Es lo mismo que
decía el resume anterior y no cambió: hace falta una agencia con permisos resueltos.

**`/inquilino/estudio/pago` no se verificó en pantalla**: la sesión de esta máquina es
de inmobiliaria y el guard de rol redirige. Compila, buildea y la lógica está testeada,
pero nadie la vio renderizada.

**El paso 11 guarda en `customClauses`**, no en un campo propio. Es un campo real y
persistido, y una póliza pertenece al texto del contrato — pero cuando el backend tenga
uno estructurado, migrar leyendo con `leerRespaldo` (el formato es estable a propósito).

## Lo que se aprendió midiendo

**El inventario de clases muertas estaba mal: 63 de las 166 sí generaban CSS.** El
método que vale está en `docs/CLASES-OPACIDAD-MUERTAS.md`: un build aislado de Tailwind
con `content` forzado. Grepear `.next` responde otra pregunta (*¿se usa?*), no la que
importa (*¿se puede generar?*) — me dio 96 falsos positivos.

Al final: **737 clases de color en el código, 0 sin generar CSS.**

**La causa era de configuración, no 768 errores de escritura.** Los tokens de cadence
son `var(--x)` con un hex adentro y Tailwind no sabe componerles alpha. Se arregló en
`tailwind.alpha.ts` con `color-mix`.

**Dos defectos que ningún test podía ver:**
- `border-faint` y `border-strong` (250 usos) no son claves de color: caían en el
  `#e5e7eb` del preflight, un gris claro fijo que en oscuro brilla.
- `bg-surface-brand` en 29 pantallas dejaba el círculo del avatar sin fondo.

**Y uno que sólo se ve usando la pantalla:** en la comparación, un análisis en curso se
leía como «no necesita revisión» y se llevaba el trofeo de mejor de la fila.

## Sigue

1. Verificar 4 y 5 contra el agente corriendo.
2. Pedirle a Víctor los dos endpoints del paso 3.
3. Auditoría de estados de carga en las ~120 rutas del panel que todavía no distinguen
   los cuatro estados. Las primitivas ya están: `EstadoDeDatos`, `FalloDeCarga`,
   `EsqueletoTabla`. Las de PQRS y tesorería NO son deuda: son andamiaje honesto,
   dicen «ejemplo ilustrativo».
