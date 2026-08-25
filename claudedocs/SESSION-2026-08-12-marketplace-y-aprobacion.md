# 2026-08-12 (noche): el marketplace, la puerta de sesión y el fixture que murió

Arranca de la reunión del 11-08 (Nico + Juan) sobre marketplace, flujo de
inquilinos y asegurabilidad. **Dos ramas nuevas**, ninguna a develop:

| repo | rama | commits |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | `fc49d733`, `6f5950e6`, `cf8dbac4` |
| back | `feat/aprobacion-del-inquilino` | `9557eb7` |

Worktree propio en `~/rent/mvp-marketplace`, dev en **:3007** — el :3005 de
Nico quedó intacto.

---

## El hilo

> **Un número inventado en el navegador decidía a qué podía postularse una
> persona.**

Nico pidió no entregar nada mockeado. Medir eso primero fue lo que ordenó todo
el trabajo: el tope de asegurabilidad —del que cuelga qué inmuebles ve alguien
y a cuáles puede postularse— salía de `mockAprobacion()`, un fixture del front
con $2.400.000 fijo. Existía porque el endpoint no estaba: `GET
/api/tenant/aprobacion` daba **404** en el agente y la carpeta ni siquiera
estaba en su repo.

---

## 1. El marketplace tiene puerta otra vez (`fc49d733`)

`/propiedades` funciona hace rato, pero la landing v2 **no lo enlazaba desde
ningún lado**: su header es autocontenido (port 1:1 del standalone). La vieja
sí lo tenía —«Buscar Inmueble» en `Navbar`— y al cambiar de landing esa puerta
se cerró sin que nadie decidiera cerrarla. Sólo se llegaba desde el 404 y desde
el panel.

Entra: nav del header + menú móvil, y `<MarketplaceSection>` con **6 inmuebles
reales** de `GET /properties` (público, sin token; 16 en la base).

Dos decisiones:

- **Si la carga falla, la sección se retira entera.** No dice «no hay
  inmuebles» —lo que se leería mirando sólo `length === 0`—. En un home nadie
  aprieta «reintentar»: una vitrina ausente no afirma nada falso, una vacía sí.
- **Sin número de sección.** Le había puesto un `( 05 )` y un `.slabel` que
  NINGUNA otra sección usa; ese ordinal no numeraba ninguna secuencia real.

## 2. Un invitado no es «alguien sin estudio» (`6f5950e6`)

Sin sesión el botón leía `sin_estudio` y mandaba a pagar. Pero sin sesión eso
**no prueba que la persona no se haya estudiado** — prueba que no sabemos quién
es. Podía tener cuenta y aprobación vigente y estar deslogueada.

Motivo nuevo `sin_sesion` con las dos puertas de la reunión: «Es mi primera
vez» → `/aprobacion`, y «Ya tengo cuenta, entrar» →
`/auth?returnUrl=<el inmueble donde estaba>`.

No cambia: quien tiene respaldo local (se aprobó por un link de WhatsApp, sin
cuenta) pasa de largo y se postula. Su aprobación es real.

## 3. El back de aprobación (`9557eb7`) y el fixture muerto (`cf8dbac4`)

`TenantApproval`: **una fila por persona, no por postulación**.
`evaluation_results` está atado a `application_id` —el estudio de una solicitud
sobre un inmueble— y lo acordado es lo contrario: se estudia una vez, sin
inmueble, y con eso se postula a todas las que entren en el tope sin volver a
pagar.

- **No hay estado «sin estudio»**: es la ausencia de fila.
- **Siempre 200, nunca 404**: es el primer paso del recorrido, no una falla.
- **`max_rent_cop` NULL con APPROVED es válido**: hay aseguradoras que
  respaldan sin comprometer techo. La UI dice que falta; nunca lo inventa.

En el back y no en el agente: el tope y su vigencia son dato de dominio del
inquilino. El agente es dueño de lo que razona, no de lo que se persiste.

📌 `reference_el_fixture_del_tope_murio`

**La prueba**: fila sembrada en la base → endpoint → pantalla del inquilino
diciendo «Estás aprobado hasta **$ 2.600.000** /mes · Vence en 20 días».

---

## Dos trampas encontradas

**`prisma format` realineó 209 líneas de modelos ajenos** cuando yo agregaba
~50. Lo deshice y apliqué a mano: 63 agregadas, cero borradas. Mismo tipo de
trampa que el `--fix` del lint del back.

**`vi.mock('./client') + importActual` rompe `instanceof`**: el `ApiError` del
test y el del servicio son clases distintas —dos instancias del módulo— así que
el `catch` del servicio no reconocía el 404. Un `vi.spyOn` sobre el módulo real
deja una sola clase. Y el spy va **dentro de cada test**: a nivel de módulo con
`mockReset()`, los casos que rechazan salían como error suelto del archivo.

## Gates

Front: `tsc` ✓ · `eslint` ✓ · **2398/2398 tests** · `next build` 252/252 ✓.
Back: `tsc` ✓ · `nest build` ✓ · 10 tests ✓ · migración aplicada · 401 sin
token y 200 con token real de Supabase.

La suite del front quedó **verde entera acá**, incluido `auth-context` —
confirma que los 6 rojos del otro worktree eran carga de máquina, no código.

---

## Lo que sigue

1. **No volver a pedir lo ya llenado.** El wizard de `/aplicar/[propertyId]`
   son 6 pasos SIEMPRE (Personal, Empleo, Ingresos, Referencias, Documentos,
   Revisión), aunque la persona ya haya postulado antes. Lo pedido: si ya está
   aprobada, el inmueble entra en su tope y ya llenó una postulación previa,
   postularse sin pedirle nada.
2. **Contratos** — alcance elegido por Nico: **UI + conceptos + escenarios
   (front)**. El CSV `~/Downloads/Productos.csv` trae **113 conceptos** con
   columnas `% IVA`, `% Retención`, `% ReteIva`, `% ReteIca`. ⚠️ Viene en
   **Windows-1252**, no UTF-8 (`LÓPEZ` sale partido).
3. **Avalúos** — en otra sesión, por pedido de Nico.

### Deuda que quedó anotada, no resuelta

- **El cobro del estudio no existe en el back** (`estudio-pago.service.ts` →
  `CobroNoDisponible`). La pantalla ya lo dice en vez de fingir un botón que
  no cobra. Sin eso, «primero debe pagar» no se puede cerrar de verdad.
- **Fianli no expone API**: según la reunión obliga a ir al correo. El endpoint
  hay que pedírselo a Javier; sin él, «llena el formulario y te digo al
  instante» no existe.
- **Dato sembrado a mano**: la aprobación de María en dev es inventada por mí,
  no un veredicto de aseguradora.
  `DELETE FROM tenant_approvals WHERE user_id = '83ec60a5-04e4-4152-bbb0-6b48c70f77a9';`
