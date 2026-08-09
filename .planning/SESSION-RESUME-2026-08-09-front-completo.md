# El recorrido de 11 pasos: qué quedó, qué no, y qué hay que decidir — 2026-08-09

Rama `feat/recorrido-inmobiliaria`, worktree `~/rent/mvp-inmobiliaria`, dev en `:3002`.
**Todo pusheado.** 1919 tests · `tsc` · `next lint` sin errores · `pnpm build` ✓.

## Los nueve commits

| | |
|---|---|
| `cfed2629` | las clases que no generaban CSS, y las que daban el color equivocado |
| `d2b24df0` | cargando / no existe / falló / vacío dejan de ser el mismo cartel |
| `5aaac331` | los cuatro huecos de front del recorrido |
| `f02391b8` | un análisis en curso dejaba de leerse como buen resultado |
| `d622ddda` | docs |
| `15767058` | «tu sesión se venció» con el panel entero renderizado alrededor |
| `8162359f` | «Volver a entrar» iba a `/auth/login`, que no existe |
| `5038f0f8` | el paso 7 deja de exigir entrar para enterarse |
| `b29251b4` | el formulario de PSE como funciona de verdad |

## Los 11 pasos, medidos contra los servicios corriendo

No es un estado supuesto: se probó contra el back (`:3010`) y el agente (`:4100`).

| # | Paso | Estado | Evidencia |
|---|---|---|---|
| 1 | Catálogo | ✅ | — |
| 2 | Estudio de asegurabilidad | 🔴 | el wizard llama a `POST /api/funnel/preaprobacion` → **404**; «funnel» no está en ninguna de las 181 rutas del agente. Cae a fixture y guarda en **localStorage** |
| 3 | Paga el estudio | 🟡 | pantalla completa con PSE real; **el cobro no existe** en el back |
| 4 | Contra todas + máximo afianzable | 🔴 | consulta varias (`approvedCount`/`totalCarriers` ✅) pero **«afianzable» = 0 ocurrencias** en todo el contrato, y **cero rutas `/api/tenant/*`** |
| 5 | Habilita propiedades compatibles | 🔴 | **el catálogo no filtra**; sólo frena el botón de postularse (`cabeEnTope`) |
| 6 | Postularse a varias | 🟡 | el front lo soporta; cuelga del tope del paso 4 |
| 7 | Alerta a la inmobiliaria | ✅ | indicador con `stats.pending` real |
| 8 | Estudio A/B/C/D | ✅ | `POST /evaluations/:id` da **401**, no 404: existe |
| 9 | Comparar candidatos | ✅ | `/propiedades/:id/candidatos/comparar?ids=…` |
| 10 | Avisar a los no elegidos | ✅ | `ModalAvisarNoElegidos` |
| 11 | Contrato + aseguradora + ID | 🟡 | funciona; el ID se **escribe a mano** porque el agente no lo devuelve |

## Lo que hay que pedirle a Víctor

Todo cuelga de una sola cosa: **el agente no tiene superficie para el inquilino.**
Y cotizar exige un `canonCop` específico — se pregunta *«¿le alcanza para $X?»*,
nunca *«¿hasta cuánto le alcanza?»*. Sin ese número no hay paso 5 ni 6.

```
POST /api/funnel/preaprobacion          (existe, sin pushear)
GET  /api/tenant/aprobacion             → { estado, topeAprobadoCop, aseguradoras[], vigenteHasta }
GET  /tenant/estudio/pago               → { pagado, precioCop, incluye[], pagadoEl? }
POST /tenant/estudio/pago/checkout      → { urlDePago, referencia }
```

Contratos y forma exacta en `src/lib/api/estudio-pago.service.ts` y
`src/lib/api/aprobacion.service.ts`.

## 🔴 Dos decisiones que son de Nico, no mías

**1. ¿El estudio de asegurabilidad es gratis o se paga?**
`/aprobacion` dice **«Es gratis y sin compromiso»**. El paso 3 del spec dice que el
inquilino paga ese mismo estudio. Hoy la pantalla le promete gratis a la gente.

**2. Paso 5: ¿ocultar o marcar?**
Cuando exista el tope, ¿se **ocultan** las propiedades por encima, o se **muestran
marcadas** («$3.2M, por encima de tu tope de $2.4M»)? Ocultar inventario es decisión
de negocio. Con la respuesta queda listo para prenderse solo.

## Lo que se aprendió midiendo

**El inventario de clases muertas estaba mal: 63 de las 166 sí generaban CSS.** El
método que vale está en `docs/CLASES-OPACIDAD-MUERTAS.md`: build aislado de Tailwind con
`content` forzado. Grepear `.next` responde *¿se usa?*, no *¿se puede generar?* — dio 96
falsos positivos. Cierre: **737 clases de color, 0 muertas.**

**La causa era de configuración.** Los tokens de cadence son `var(--x)` con un hex
adentro y Tailwind no sabe componerles alpha → `tailwind.alpha.ts` con `color-mix`.

**Cuatro defectos que ningún test podía ver:**
- `border-faint`/`border-strong` (250 usos) no son claves de color: caían en el
  `#e5e7eb` del preflight, que en oscuro brilla.
- `bg-surface-brand` en 29 pantallas dejaba el avatar sin fondo.
- En la comparación, un análisis **en curso** se leía como «está bien» y se llevaba el
  trofeo de mejor candidato.
- «Tu sesión se venció» con el panel entero renderizado atrás: era la carrera del token
  (`/users/me` 200 y la lista 401 en la misma carga). Arreglado en `client.ts` para los
  42 que llaman, no pantalla por pantalla.

**Y uno que apareció al verificar:** `/auth/login` no existe en este repo. Mi botón
«Volver a entrar» mandaba al 404. La ruta es `/auth`.

## Sigue

1. Las dos decisiones de arriba.
2. Los cuatro endpoints, a Víctor.
3. Auditoría de estados de carga en las ~120 rutas del panel que todavía no distinguen
   los cuatro estados. Las primitivas ya están: `EstadoDeDatos`, `FalloDeCarga`,
   `EsqueletoTabla`, más los `not-found.tsx`/`error.tsx` de Next que no existían.
   ⚠️ Las de PQRS y tesorería **no** son deuda: son andamiaje honesto, dicen
   «ejemplo ilustrativo».

## Para verificar en pantalla

- **Inquilina**: `maria.inquilina@leasefy-dev.co` / `PRueba123#`. Abrir en un
  `isolatedContext` del MCP para no pisar la sesión de inmobiliaria de Nico.
- **Build sin matar el dev**: `NEXT_DIST_DIR=.next-build pnpm build` (los dos escribían
  en `.next`). Después `git checkout -- tsconfig.json`: el build lo reescribe.
