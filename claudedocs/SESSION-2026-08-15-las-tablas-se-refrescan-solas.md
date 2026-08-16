# 2026-08-15: las tablas se refrescan solas (y cinco que mostraban vacío con datos)

Noveno bloque. Antes: `SESSION-2026-08-14-la-seleccion-que-no-salia-de-la-pantalla.md`.

| repo | rama | commits nuevos |
|---|---|---|
| front | `feat/marketplace-y-postulacion` | +3 (57) |

Pedido de Nico: **«toda acción que tenga que ver con tablas, que al terminar se
refresque sola — que evitemos decirle al usuario que recargue páginas»**, más
los cuatro puntos que quedaban pendientes.

---

## 1. El refresco y las 53 peticiones son el mismo problema

Nadie sabía qué estaba pidiendo quién.

- Cada componente que llamaba a un hook disparaba su propio GET.
- Cada acción tenía que acordarse de llamar a su `refetch`, y la mayoría no lo
  hacía.

`src/lib/api/refresco-de-datos.ts` resuelve los dos **desde el cliente HTTP**,
que es el único lugar por donde pasa todo:

- Los GET idénticos **en vuelo** comparten una sola petición.
- Los `POST/PUT/PATCH/DELETE` avisan qué recurso tocaron; los hooks que lo leen
  se refrescan solos.

> Va en el cliente y no en cada pantalla porque así **una acción nueva nace
> refrescando la tabla**. No hay que acordarse nunca más.

| | antes | ahora |
|---|---|---|
| peticiones por pantalla | **53** | **13** |
| rutas duplicadas | 11 | **0** |
| `/inmobiliaria/config` | 10 veces, 10,8 s | 1 vez, 3,5 s |

⚠️ **No es un caché.** La promesa se olvida al terminar: el siguiente GET sale
de verdad. Todo el ahorro, cero posibilidad de mostrar algo viejo. Hay un test
que lo fija (`NO es un caché: terminada, el siguiente pedido sale de nuevo`).

El refresco es **silencioso**: el dato ya está en pantalla y hacerlo parpadear a
esqueleto después de cada acción se ve peor que el problema.

---

## 2. Cinco tablas decían «no tenés nada» con los datos ahí

Fui a probar el refresco en Propietarios y la pantalla decía **«Todavía no
tenés propietarios»** — con tres en la base y la respuesta trayéndolos.

```ts
const res = await apiClient.get<{ data: Propietario[] }>(...)
return res.data          // el back devuelve [...] pelado → undefined
```

Antes de tocar nada guardé mis cambios en stash y recargué: **pasaba igual**.
No era regresión mía.

Afecta a **propietarios, actas, mantenimiento, documents y templates**. Las de
`agentes` y `config/billing/invoices` sí vienen envueltas y estaban bien: media
docena acertaba por casualidad.

Ahora pasa por `lista()`, que acepta las dos formas.

### Y destapó un crash que nadie podía alcanzar

Con filas de verdad, buscar en la tabla hacía `null.includes(...)` sobre el
teléfono —que llega nulo con toda normalidad— y la pantalla pasaba a «esta
sección se rompió» con la primera letra. **No se veía porque la lista llegaba
siempre vacía y no había fila que filtrar.**

---

## 3. «¿Revisaste la cobertura?» — no, y faltaban dos cosas

Nico preguntó si había revisado que **todo** lo que toca tablas se actualice.
Tenía el mecanismo probado, no medido cuántas pantallas lo usaban.

**a) Los hooks con `fetch` propio.** `useApiData` cubre los ~30 de
`useInmobiliaria`, pero propiedades, contratos, arriendos, postulaciones y
visitas tienen el suyo: esas tablas no se refrescaban. Enganchadas con
`useRefrescoAutomatico(recursos, refetch)`.

**b) Un espejo local que se tragaba el refresco.**

```ts
if (apiPropietarios.length > 0) setPropietarios(apiPropietarios)
```

Ese `> 0` sólo copia hacia adelante: **borrar el último propietario dejaba su
fila en pantalla para siempre**. Con el refresco automático era peor — la
pantalla recibía el dato nuevo y lo ignoraba.

Sacando el espejo sobraron los tres retoques a mano de crear/editar/borrar:
eran una segunda versión de la verdad, y el objeto que devuelve `create` ni
trae los campos calculados, así que insertarlo mostraba una fila incompleta.

### La cobertura, medida

**18 de 27** recursos que alguna acción modifica tienen pantalla escuchando:
`actas · agency · agenda · agentes · applications · avaluos · cobros ·
consignaciones · contracts · dispersiones · documents · leases · mantenimiento ·
pipeline · properties · propietarios · renovaciones · visits`

Los 9 restantes no son tablas del panel (notificaciones —tiene su realtime—,
wishlist, evaluaciones, cargos, selección de plan) o son artefactos del parser.

El chequeo quedó reproducible: cruza cada `apiClient.post/put/patch/delete`
contra los recursos declarados, y dice si una acción nueva quedó huérfana.

---

## Los otros tres pendientes

- **Catálogo de conceptos**: ya estaba hecho. `conceptos.ts` tiene **66** y las
  26 «NO UTILIZAR» no están — se quitaron al portarlo. La migración tampoco
  copia nombres crudos. Lo que sigue sucio es el catálogo **de ellos**.
- **Avalúos**: igual. El micro corre en :4100 y las tres rutas dan **404**;
  nunca hizo su mitad. Otro repo, sesión aparte.
- **La imagen en alta**: **no se puede**. El original de 2,3 MB no está en
  Downloads ni en la papelera, y al repo entró sólo la de 1600×2000.

---

## Gates

`297 archivos · 2579 tests · 0 fallos · 59,6 s` · tsc ✓ · lint ✓ · build ✓.
**27 tests nuevos.**

⚠️ **Lo que NO se probó**: el refresco clicando en el navegador de punta a
punta. La prueba es a nivel de hook (crear, borrar, no molestar a otros
recursos, no parpadear, dejar de escuchar al desmontar) porque el menú de
acciones es de Radix y no responde a clics sintéticos. Prueba del mecanismo,
no de cada pantalla.

⚠️ Escribiendo `lista()` me quedó un `return lista(res)` **dentro de `lista`** —
recursión infinita que compilaba perfecto. Lo vi y hay un test que lo fija.

⚠️ El dev server de :3007 se cayó solo recompilando (el cambio toca `client.ts`,
que importa medio proyecto) y el `--watch` lo levantó de nuevo.

---

## Lo que falta

1. **Probar el refresco en el navegador**, pantalla por pantalla.
2. **Avalúos** — el micro nunca hizo su mitad (otro repo).
3. La obra del login en resolución mayor, si aparece el original.
4. Las 3 sub-rutas de `/propietarios/:id/{consignaciones,cobros,dispersiones}` y
   `/reports/definitions` que el front llama y **el back no tiene**: hoy son 404
   silenciosos.
5. `PricingTable` sigue fuera de la normalización de tablas, a propósito.
