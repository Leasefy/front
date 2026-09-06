# Todo a develop, y por qué Cobranza seguía invisible

**2026-08-10.** Continúa `QA-2026-08-10-cobranza-y-recorrido.md`.

---

## Estado

Los tres PR entraron a `develop`: **#63**, **#65** (recorrido) y **#66**
(cobranza). Por primera vez las dos mitades conviven.

`develop` verificado: **2165 tests · 260 archivos · tsc · lint · build ✓ · 0
marcadores de conflicto.**

**Abierto: PR #68** — Cobranza desaparecía del menú y decía «Próximamente».

## develop estaba roto y nadie lo notó

`13b40359` subió `src/lib/api/client.test.ts` **con los marcadores de conflicto
adentro**. El archivo no parseaba, así que sus tests nunca corrieron — y el CI
no lo agarró, porque un archivo que no parsea simplemente no se ejecuta.

Eran dos suites que se pisaron al fusionar (401 `SESSION_SUPERSEDED` y respaldo
del 402). Se reconstruyó con las dos, sin quitarle un test a ninguna, en las dos
ramas para que quedara igual entrara por donde entrara.

```bash
git grep -lE '^(<{7}|={7}|>{7})( |$)' origin/develop -- '*.ts' '*.tsx' '*.json'
```

⚠️ Da falsos positivos con docs que citan marcadores dentro de un bloque.

## El método que sirvió para fusionar dos ramas largas

Al entrar #66 primero, el #65 pasó de 2 conflictos a **16**. Clasificarlos antes
de tocarlos ahorró el 80% del trabajo:

```bash
git diff --name-only --diff-filter=U | while read f; do
  o=$(git show HEAD:"$f" | grep -c $'\r'); t=$(git show origin/develop:"$f" | grep -c $'\r')
  [ "$o" != "$t" ] && echo "EOL  $f" || echo "REAL $f"
done
```

**3 eran sólo fin de línea** (CRLF en develop, LF en la rama): el archivo entero
en conflicto sin una diferencia real.

Para los 9 de cobranza la pregunta correcta no es «¿cuál gana?» sino **«¿qué
aportó cada lado sobre la base común?»** — `git diff --shortstat $BASE HEAD` vs
`$BASE origin/develop`. Nosotros: 1–5 líneas. Ellos: 114–374. Aun así, antes de
tomar su lado se verificó que **su versión ya estuviera migrada** a los tokens
Cadence; si no, habríamos reintroducido el defecto de color en oscuro.

> **Un merge sin conflictos no es un merge correcto.** `PermissionsContext.tsx`
> fusionó limpio y dejó `agentPermsResolved` DUPLICADO, en el tipo y en el
> objeto. Sólo lo cazó `tsc` (TS2300). Correr `tsc` siempre antes de commitear.

## La compuerta de suscripción (#64) y los dos muros encima

Nico entró y la pantalla quedó negra, y lo dejó en `/upgrade`.

**No era un bug.** `AgencySubscriptionGuard` exige plan `pro` o `flex`; su
agencia demo estaba en **STARTER** y su rol es ADMIN → `router.replace('/upgrade')`.
La pantalla negra era el spinner del guard mientras redirigía.

Se resolvió **por el flujo del producto**, no con un UPDATE:

```
POST /inmobiliaria/subscription/select-plan  { "planTier": "FLEX" }
→ outcome: FLEX_ACTIVATED
```

**FLEX y no PRO a propósito**: `feature-gates.ts` pone «All 19 AI Agents» en
`minTier: 'flex'`. Con PRO se desbloquea el panel pero los agentes siguen
apagados.

### Y aun con FLEX, Cobranza no aparecía

Dos capas más:

1. **Un 401 del agente borraba la fila del menú.** `cobranza` y `cotizador`
   fallan cerrado por diseño, y para «el agente dijo que no» está bien. Pero
   `canAccess` devuelve false por DOS razones, y cuando es **no pudimos
   preguntar** borrar la fila se lee como «esto no existe». El tri-estado ya
   existía (`agentAccessStatus`); el sidebar no lo usaba. → PR #68.
2. **`tag: 'Próximamente'` escrito a mano** sobre un módulo entero y conectado
   (12 pestañas, 33 endpoints con datos reales). → PR #68.

## Y todavía así: está en el puesto 18 de 36

Con todo arreglado, Cobranza es el ítem **18 de 36**, el primero de FINANZAS,
después de Agenda y Soportes de candidatos. **Nico no la encontró** — pasó de
largo dos veces y pidió captura.

> Si el dueño del producto no encuentra el módulo que más trabajo tiene encima,
> una inmobiliaria tampoco.

Además él la piensa como **comercial** («que también es una sección ahí en
comercial») y el código la clasifica en **finanzas**. Decisión abierta: subir
FINANZAS, agrupar los agentes de IA en su propia sección arriba, o dejarlo.

## Lo que sigue abierto

- 🔴 **7 de 18 agencias `ACTIVE` sin fila en `agent.agency_members`.** El
  aprovisionamiento marca éxito sin confirmarlo, y **ninguna herramienta de
  reparación las ve**: el pipeline del admin sólo lista `PENDING`/`FAILED`.
  No existe endpoint de reparación — `onboarding/complete` crea una agencia
  nueva y el de sesión rechaza sesiones completadas.
- 🟡 **La tarjeta de bloqueo del guard es invisible**: usa `bg-surface-raised` y
  `text-fg-secondary`, y **ninguno de los dos existe** en el preset de Cadence
  (verificado). Se pinta sin fondo y con el texto casi invisible.
- 🟡 La cédula en claro en `cartera/legal-artifacts` e `insurance-claims`.
- ⚪ Las escrituras de cobranza siguen sin ejercitar.

## Entorno

`develop` corriendo en **:3005** desde el worktree `~/rent/mvp-develop`.

⚠️ Se agregó `http://localhost:3002` y `http://localhost:3005` a
`CORS_ALLOWED_ORIGINS` del `.env` del agente — sólo tenía `:3001`, y sin eso el
panel dice «No pudimos verificar tu acceso» con una cuenta que sí tiene
permisos. El agente se reinicia solo tocando un archivo de `src/` (`tsx watch`).

⚠️ El `.env.local` de :3002 apunta a `http://localhost:3002/agent-proxy`, **una
ruta que no existe** (ni carpeta ni rewrite). Ese front nunca pudo hablarle al
agente — de ahí el 404 de `/agent-proxy/api/tenant/aprobacion`.

Cuentas (todas con la contraseña de QA — está en 1Password):

| cuenta | qué tiene |
|---|---|
| `agencia.demo.1786238152@leasefy-dev.co` | la de Nico. FLEX. **Sin membresía en el agente** |
| `pruebasarrendador1902@gmail.com` | 3 deudores, 107 llamadas (**34 con outcome** — las únicas que permiten ver detalle/transcripción) |
| `hola+inmobiliaria3@leasefy.co` | 45 deudores, 59 llamadas, todas sin outcome |

Para darle cobranza real a la agencia de Nico falta esta fila (el sandbox del
asistente no puede escribir a la base):

```sql
insert into agent.agency_members
  (id, tenant_id, user_id, email, role, accepted_at, created_at, updated_at)
values (gen_random_uuid(),
        '58cd89cd-3421-4ebf-b79a-054ea2b3b3da',
        '422a4b48-9c0a-46f7-aff5-bd0a78b512b1',
        'agencia.demo.1786238152@leasefy-dev.co',
        'OWNER', now(), now(), now());
```
