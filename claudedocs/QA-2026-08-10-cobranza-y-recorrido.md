# QA exhaustivo — cobranza (:3001) y recorrido (:3002)

**2026-08-10.** Auditoría de la sección completa de cobranza —20 pestañas, 12
visibles y 8 ocultas— más el recorrido de inquilino e inmobiliaria. Recorrida en
navegador con datos reales, no sólo leyendo código.

---

## 🔴 LO PRIMERO: los dos trabajos no conviven en ningún lado

| rama | worktree | puerto | commits nuevos | de cobranza |
|---|---|---|---|---|
| `fix/habeas-data-arco` | `~/rent/mvp` | :3001 | 85 | **42** |
| `feat/recorrido-inmobiliaria` | `~/rent/mvp-inmobiliaria` | :3002 | 90 | 1 |

Ninguna contiene a la otra y **ninguna tiene PR**. En :3002 —donde se trabaja a
diario— la cobranza está en su forma vieja: nav de 20 pestañas, sin acuerdos
generales ni Resumen consolidado. `use-acuerdos-generales.ts` y
`CobranzaResultadosKpis.tsx` no existen ahí.

**Decisión pendiente de Nico**: fusionar en una sola rama, o abrir dos PR.

---

## Estado: verde en las dos

| | :3001 cobranza | :3002 recorrido |
|---|---|---|
| tests | 1715 ✓ | 1972 ✓ |
| tsc · lint · build | ✓ ✓ ✓ | ✓ ✓ ✓ |

**33/33 endpoints GET de cobranza responden 200 con datos reales.** 26/26 rutas
sirven. Cero mocks, cero fixtures, cero operaciones que finjan éxito en toda la
sección.

---

## Lo que queda abierto (nada de esto es del front)

### 1. 🔴 7 de 18 agencias `ACTIVE` no tienen membresía en el agente

Medido en la base:

```
ACTIVE   total: 18   sin membresía en agent.agency_members: 7
FAILED   total:  4   sin membresía:                          4
```

El aprovisionamiento marca `provisioningStatus = ACTIVE` y deja la agencia **sin
ningún módulo de IA**: `verifyAgentJwt` resuelve el token ES256 cruzando
`agency_members(tenantId, email)`, no encuentra fila, devuelve 401, y el panel
muestra «No pudimos verificar tu acceso».

La cuenta demo (`agencia.demo.1786238152@leasefy-dev.co`, agencia
`58cd89cd-3421-4ebf-b79a-054ea2b3b3da`) es una de las 7 — por eso cobranza se
veía inaccesible.

La pantalla se comporta bien: no dice «no tenés permiso», dice que no pudo
comprobarlo, y ofrece reintentar. El defecto es del aprovisionamiento.

**Qué hacer**: que el back no marque `ACTIVE` hasta confirmar que el agente creó
la membresía, y un reparador para las 7 existentes.

### 2. 🟡 La cédula viaja en claro desde dos endpoints

```
cartera/legal-artifacts   → debtorDocument: "CC 79854123"
cartera/insurance-claims  → debtorDocument: "CC 1017234567"
cobranza/debtors          → cedulaMasked:  "E1•••796"   ← el control
```

`cobranza/debtors` la enmascara y exige `POST /debtors/:id/reveal-pii`, que queda
en `audit_log`. Cartas y Siniestros saltan ese control y el panel imprime el
número completo. No es una fuga hacia afuera —la agencia es responsable de sus
propios datos— pero rompe la trazabilidad de «quién miró esta cédula».

**Qué hacer**: enmascarar en esos dos endpoints, igual que `debtors`.

### 3. 🟡 Escalaciones sin nombre en el contrato

`GET /cobranza/escalations` y `/escalations/:id` devuelven sólo `debtor_id`. Son
las únicas dos de las seis fuentes de Pendientes sin nombre.

Mitigado en el front (hoy se muestra el motivo traducido en vez del UUID), pero
el arreglo de fondo es que el endpoint mande `debtor_name`, como ya hacen
`legal-artifacts`, `insurance-claims`, `daily-report/today`, `promises` e `inbox`.

⚠️ Requiere regenerar tipos. `pnpm api:gen` ya borró 17 rutas del contrato en
silencio una vez: usar `pnpm openapi:dump` y verificar el conteo antes y después.

### 4. ⚪ Escrituras sin ejercitar

Aprobar carta, radicar siniestro, resolver disputa y aprobar plan **no se
probaron**: exigen firma humana, quedan en un `audit_log` append-only y la base
de dev es compartida. El cableado de lectura está verificado; las mutaciones no.

---

## Cómo reproducir el QA

```bash
# Cuentas con cartera real (las dos con PRueba123#)
hola+inmobiliaria3@leasefy.co      # tenant f1849975… 45 deudores, 59 llamadas
pruebasarrendador1902@gmail.com    # tenant 6d37b582…  3 deudores, 107 llamadas
                                   #   ← 34 con outcome+duración: el único que
                                   #     permite probar detalle/transcripción

# Login en :3001 → /auth  (no existe /auth/login)
# Build sin matar el dev server:
NEXT_DIST_DIR=.next-build pnpm build && git checkout -- tsconfig.json
```

**El audio de las llamadas da 502 en local** porque Vapi no es alcanzable. No es
un defecto: la pantalla dice «No pudimos cargar la grabación. Existe, pero no
logramos traerla», que es lo correcto — un 404 sí diría que no hay.

---

## Trampas que costaron tiempo en este QA

- **Leer el DOM antes de que Next compile da falsos positivos.** Tres «defectos»
  —«1 días de mora», Reportes a propietarios crasheado, ARCO en blanco— eran
  lecturas prematuras. Con el dev server hay que esperar *contenido*, no un
  tiempo fijo. `PageSkeleton` no tiene texto: `innerText` vacío parece pantalla
  rota y es sólo el esqueleto.
- **Escribir un archivo temporal dentro de `~/rent/agent-develop` reinicia el
  agente** (`tsx watch`) y corta las llamadas en vuelo. Parecía un crash.
- **`pnpm build` con dos dev servers vivos los deja sin CPU**: :3002 dejó de
  responder 90 s y parecía colgado.
- **Ordenar la transcripción por `index` habría sido una regresión**: el turno 2
  ocurre 124 ms antes que el 1, así que los tiempos irían hacia atrás. La API
  ordena por `startedAt`, que es lo correcto para un reproductor.
