# Handoff a Víctor — Cobranza: dos PRs y lo que apareció en el camino

**2026-08-10** · QA exhaustivo de la sección Cobranza, en tres pasadas, contra el
agente corriendo con token real.

---

## Lo que hay que revisar

| PR | Repo | Qué es | Estado |
|---|---|---|---|
| [front#66](https://github.com/Leasefy/front/pull/66) | `Leasefy/front` | El panel de Cobranza completo, conectado y sin mocks. 91 commits, 196 archivos. | CI y Vercel en verde |
| [agent#85](https://github.com/Leasefy/agent/pull/85) | `Leasefy/agent` | Los datos que el panel pedía y el agente no daba. 29 commits, 60 archivos. | CI en verde |

**El orden importa: `agent#85` antes o junto con `front#66`.** Al revés no rompe
nada, pero deja los arreglos del panel inertes — las pantallas vuelven a mostrar
identificadores donde van personas y 404 donde va un dato.

---

## La frase que resume el QA

> **Un identificador donde va un nombre no es un dato incompleto: es una
> pantalla sobre la que no se puede actuar.**

Ninguno de los defectos daba error. **Todos devolvían 200.** Por eso la sección
llevaba semanas pareciendo terminada.

Un ejemplo de lo que se estaba mirando en producción: la vista de Habeas Data
mostraba `ABC17944` bajo el encabezado «Deudor», al lado de «VENCIDO HACE 3D».
Un plazo de la Ley 1581 corriendo sobre alguien a quien nadie podía identificar.

---

## Tres decisiones que son tuyas, no de ingeniería

Las dejé sin tocar a propósito.

### 1. Chubb y Liberty Seguros no se pueden radicar — **esto bloquea operación**

La lista de aseguradoras a notificar es un enum fijo:

```
sura | mapfre | solidaria | accion
```

En la base hay cuatro aseguradoras reales y **dos de ellas son Chubb y
Liberty**. Además `agent.insurer_contacts` está **vacía**: aunque se abriera el
enum, no hay correo a dónde radicar.

La pantalla hoy lo dice en vez de ofrecer cuatro compañías equivocadas en
silencio — eso es honestidad, no solución. Hace falta decidir: ¿se abre el
enum? ¿quién carga los contactos? ¿o esas dos se radican por fuera del sistema?

### 2. Tres criterios de PII conviviendo en la misma sección

| Pantalla | Qué hace | Efecto |
|---|---|---|
| Llamadas | enmascara el **nombre** (`Lu•••íos`) | la tabla queda ilegible |
| Cartas | muestra la **cédula completa** (`CC 79854123`) | el dato más sensible, sin máscara |
| Casos | enmascara la cédula | — |

No las unifiqué porque es política de datos, no criterio técnico.

### 3. Un acuerdo de prueba que el agente está usando

En la base de dev vive **«Cierre rápido de fin de mes»**: ofrece **40% de
descuento** a cualquier deudor entre 16 y 45 días de mora. No es un dato
inerte — el motor lo lee y lo aplica. Decidir si se borra.

---

## Dos gates que el CI no corre (y por eso nadie los veía)

Esto es lo más importante para el tren de versiones.

**En el agente**, `pnpm test` encadena los chokepoints de seguridad antes de
vitest:

```
bash scripts/check-cotizador-emit-chokepoint.sh && \
bash scripts/check-tenant-scope-chokepoint.sh && \
vitest run
```

**El CI corre `pnpm vitest run` directo.** Los chokepoints nunca se ejecutan.
Uno de ellos llevaba días en rojo y nadie lo notó porque todos —yo incluido—
corremos `vitest` a mano. Lo que marcaba era real: una consulta a
`compliance_events` sin `withTenantScope`. Bajo `FORCE ROW LEVEL SECURITY` con
el rol no-dueño, no fijar `app.current_tenant_id` **devuelve cero filas en
silencio**. Va arreglado en agent#85.

**En el front**, el CI corre `tsc` + `vitest`, pero **no** `pnpm lint` ni
`next build` ni `pnpm api:check`. Los corrí a mano antes de pushear:

| | |
|---|---|
| `tsc --noEmit` | exit 0 |
| `pnpm test` | 1778 tests, 227 archivos |
| `pnpm lint` | exit 0, 0 errores |
| `next build` | OK |
| Contrato del agente | 181 → 202 rutas, **0 perdidas** |

> Sugerencia concreta: cambiar el CI del agente a `pnpm test` y agregar `lint` +
> `build` al del front. Son los dos gates que hoy dependen de que alguien se
> acuerde.

---

## Dos cosas rotas en `develop` que no vienen de estos PRs

### `develop` del front tiene marcadores de conflicto commiteados

`src/lib/api/client.test.ts` en `origin/develop` contiene marcadores literales
en las líneas 2, 28, 52, 57, 91 y 143:

```
<<<<<<< HEAD
=======
>>>>>>> 13b40359396a512482c95389a446af7e7ff3a125
```

Es un archivo de test que **no parsea**. Entró en el commit `13b40359`.
front#66 lo trae resuelto, así que se repara al mergear — pero vale la pena
mirar cómo pasó el CI con eso adentro.

### El `develop` del front llama rutas que el `develop` del agente no tiene

```
/onboarding/{token}/habeas-data/{confirm,presign-url}
/onboarding/session/{sessionId}/habeas-data/{confirm,presign-url}
```

Las creó `529dda51` (2026-07-15, «integracion mvp») en el agente y **ese commit
nunca llegó a `develop`**. Preexistente, ajeno a estos PRs, y no lo toqué.

---

## Qué se probó de verdad, y qué no

**Escrituras ejecutadas de punta a punta:** crear / apagar / borrar un acuerdo
general, generar un reporte a propietario, revelar PII, guardar umbrales,
pausar y reanudar la cobranza de un deudor. Las dos primeras aparecieron
después en la pantalla de Auditoría con el correo del operador — el ciclo
cierra.

**No se dispararon:** aprobar carta prejurídica ni radicar siniestro. Escriben a
S3, mandan correo y son irreversibles sobre la base compartida de dev.

**Accesibilidad:** el proyecto `panel-a11y` de Playwright quedó en 24 verdes / 0
fallas. Incluye el arreglo de tres botones de icono sin nombre en la cabecera
del panel — era una violación `button-name` **crítica de axe en todas las
páginas**, no solo en Cobranza.

---

## Abierto, no bloqueante

- `usePolicyImpact` es código muerto: ningún componente lo usa.
- El Resumen pide `daily-report/today` ~8 veces por carga.
- La rama local `fix/arco-triage-status-constraint` del agente (106 commits, con
  el trabajo de Laura por voz) **no** lleva el arreglo de RLS. agent#85 se cortó
  desde `origin/develop`, así que esa rama sigue con el defecto si se usa.

---

## Detalle completo

`claudedocs/SESSION-RESUME-2026-08-10-qa-cobranza.md` — las tres pasadas,
defecto por defecto, con los comandos que los cazan.
