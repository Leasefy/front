# Punto de retome — rama `feat/recorrido-inmobiliaria`

Worktree `~/rent/mvp-inmobiliaria`, dev en `:3002`.
1972 tests · `tsc` · `next lint` · `pnpm build` ✓.

---

## Actualización 2026-08-10 — QA exhaustivo

Se auditó el recorrido completo en navegador. **Tres defectos corregidos acá**
(commits `500fd63f` y `56d1303a`):

- **El catálogo encogía en silencio.** Con tope de $1.200.000 mostraba 1 de 9 y
  no decía nada de las otras 8. El aviso existía sólo en `para-ti/page.tsx`, que
  se pinta con perfil verificado; quien tiene aprobación y aún no perfil cae en
  `CatalogoPorAprobacion` — el camino más común, y era el que no avisaba.
- **«Te avisamos por correo»** en el paso de aseguradoras, contra la decisión de
  asegurabilidad inmediata. Las otras dos apariciones son correctas (el pago
  acreditándose y la respuesta a una postulación).
- **«1 baños»** en 5 lugares.

⚠️ **La cobranza NO está en esta rama** — vive en `~/rent/mvp` (:3001), 42
commits. Acá el nav de cobranza es el viejo de 20 pestañas. El informe completo
del QA está en `~/rent/mvp/claudedocs/QA-2026-08-10-cobranza-y-recorrido.md`.

También confirmado en vivo: `GET /agent-proxy/api/tenant/aprobacion` → **404**.
Y ojo, el back de :3002 es **`:3010`**, no `:3000`.

---

## 🔴 LO PRIMERO: 90 commits sin PR

La rama está **87 commits adelante de `develop` y nunca se abrió un PR.** Los 24
de la última sesión viven ahí, verificados en pantalla, sin que nadie los haya
visto. El único PR abierto en el repo es el **#63**, que es otra rama
(`feat/experiencia-inmobiliaria`).

El workflow es rama → PR → Víctor aprueba → merge. **Ese paso falta.**

## 🟡 Tres preguntas abiertas para Nico

1. **«Respuesta en menos de 24h»** — dos veces en la ficha de propiedad, una
   pegada al sello VERIFICADO. Es la respuesta de *la inmobiliaria a una
   postulación* (no la asegurabilidad, que ya se aplicó como inmediata).
   ¿Compromiso real o escrito a mano como los «12 minutos» que se borraron?
2. **«Completa tu solicitud en minutos»** — el formulario tiene 6 pasos e
   incluye subir documentos.
3. **Los datos demo en la base compartida** (ver abajo) — ¿banco de pruebas o
   se borran?

## 🟡 Bloqueado en Víctor

```
POST /api/funnel/preaprobacion       (existe, sin pushear)
GET  /api/tenant/aprobacion          → { estado, topeAprobadoCop, aseguradoras[], vigenteHasta }
GET  /tenant/estudio/pago            → { pagado, precioCop, incluye[], pagadoEl? }
POST /tenant/estudio/pago/checkout   → { urlDePago, referencia }
```

Los pasos **2, 4, 5 y 6** están completos del lado del front y **muertos** sin
esto: el agente sigue con **cero rutas `/api/tenant/*`** y sin concepto de
«máximo afianzable».

⚠️ **Sekure** está en `CARRIER_DISPLAY` del agente pero su dominio no responde y
no aparece como aseguradora colombiana. Puede ser una afianzadora o un nombre
viejo — confirmar.

---

## Las decisiones de negocio, ya aplicadas

| | |
|---|---|
| El estudio **se paga** | murió «Es gratis y sin compromiso». No se inventa el monto: lo manda el backend |
| Lo que **no cabe se oculta** | `/para-ti` filtra en el origen — pero **dice cuántas escondió**: encoger en silencio se lee como «no hay nada» |
| La asegurabilidad es **inmediata** | murió «te avisamos por correo, puedes cerrar esta página» |
| **Logos**: 7 de 9 | Sura·Bolívar·Solidaria·Equidad·Mapfre·Previsora·Zurich |

## El recorrido, verificado en pantalla

Inquilino 0→7 y agencia 7→11, recorridos de punta a punta con datos.
**Los pasos 9 y 10 se ejercitaron de verdad**: se eligió a Valentina, avisó a
Andrés y Camila, y la base lo confirmó (`APPROVED` + 2 `REJECTED` + 3
`STATUS_CHANGED`).

## Lo que se aprendió (y por qué importa más que los arreglos)

**Casi todos los defectos eran de la misma familia: el producto afirmando algo
que no verificó.**

- «Tu sesión se venció» con el panel entero renderizado atrás
- «Estás aprobado hasta $2.800.000» → «no sabemos nada de ti» (era el tope de
  **demostración**, que a propósito no se guarda)
- «Sin codeudor» prometido a todos, incluso a quien tiene aprobación
  condicionada — a quien sí se lo van a pedir
- «Última postulación hace 12 minutos», idéntico en todas las propiedades
- «Nada por revisar» cuando el back estaba caído, **con un comentario
  defendiéndolo** («fail-soft»)
- El inicio del inquilino saludando como recién llegado a alguien con arriendo
  activo, porque la carga falló
- Un 404 diciendo «problema nuestro, prueba de nuevo»

**Ninguno lo agarró un test.** Todos aparecieron mirando la pantalla, abortando
la red, o midiendo con `getComputedStyle`.

Y dos veces **mi propio conteo estaba mal**: dije «~120 rutas» (eran 63) y
«25 rotas» (eran 11). Detectar «no usa la primitiva» no es detectar «está mal».

## Deuda medida, no estimada

- **`errorCrudo` en ~70 hooks.** Ya funciona en los 4 del recorrido
  (`useApiData`, `useLeases`, `useApplications`, `useProperties`). 104 sitios
  hacen `setError(err.message)` y ahí se pierde el status HTTP: sin él,
  `clasificarFallo` no puede distinguir 404 de red. Inventario en
  `docs/AUDITORIA-ESTADOS-DE-CARGA.md`.
- **48 rutas con `ErrorState` propio.** Funcionan; migrarlas es consistencia.

## Operativo

- **Inquilina**: `maria.inquilina@leasefy-dev.co` / `<contraseña en 1Password>`
- **Agencia**: `agencia.demo.1786238152@leasefy-dev.co` / `<contraseña en 1Password>`
- **Build sin matar el dev**: `NEXT_DIST_DIR=.next-build pnpm build`, después
  `git checkout -- tsconfig.json` (el build lo reescribe).
- **Ver un defecto de estados**: `page.route('**/x', r => r.abort('failed'))`.
  En local el back responde y todo se ve bien.

⚠️ **Sembrado en la base de dev COMPARTIDA** (aditivo, no se tocó nada ajeno):
propiedad `[demo] Apartamento Chapinero para comparar`
(`f818c393-8ce6-44ea-9ad8-8d55795cbf9f`) + inquilinos
`demo.camila/andres/valentina@leasefy-dev.co`. Es lo que permite reprobar los
pasos 9 y 10 sin rearmar nada.
