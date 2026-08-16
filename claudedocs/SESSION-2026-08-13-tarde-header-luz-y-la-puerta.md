# 2026-08-13 (tarde): el header que era dos, la luz, y la puerta que devolvía al principio

Continuación de la mañana (`SESSION-2026-08-13-no-repetir-lo-ya-llenado.md`).
Todo en `feat/marketplace-y-postulacion` — **11 commits sobre develop**.
Worktree `~/rent/mvp-marketplace`, dev en :3007.

---

## El hilo de la tarde

> **Casi todo lo de hoy se veía bien y estaba mal.** Ninguno de estos defectos
> daba un error en consola: un header distinto que parecía el mismo sitio, una
> grilla que medía la ventana equivocada, un espaciado borrado por un reset
> ajeno, dos anillos de foco donde va uno, y una puerta que te devolvía al
> punto de partida después de hacerte el trámite entero.

---

## 1. Un solo header (`8eda75e8`)

Al entrar a «Buscar inmueble» el header cambiaba entero: `/propiedades` traía
el mega-menú viejo (`layout/Navbar`), con otras rutas, otra tipografía y otra
forma. **Dos headers para un mismo sitio hacen que parezcan dos sitios.**

El header vivía embebido en el JSX gigante de `LandingHome` (28k tokens en UNA
línea), así que «el mismo header» no se podía reusar: sólo se podía volver a
escribir. Sale a `LandingHeaderV2` y lo usan los dos.

- `activo` marca con `aria-current="page"` — en el nav y en el menú móvil.
- `LandingChrome` carga hoja + tipografías + `LogoDefs` para poder usarlo fuera
  del grupo `(landing)`.
- El comportamiento tiene un dueño: en la landing lo monta `initLandingFx` (de
  ahí `fxExterno`); fuera, el componente se encarga solo.

### Dos trampas de cascada

**El activo no pintaba.** La regla estaba junto a las otras de «activo», pero
`.lv2 header.scrolled nav.main a` tiene las mismas clases y **un elemento más**:
gana el desempate y además viene después. La regla existía, generaba CSS, y
perdía en silencio. Hubo que moverla abajo y subirle la especificidad.

**El scope `.lv2` se comió el espaciado.** `landing-v2.css` abre con
`.lv2 *{box-sizing:border-box;margin:0;padding:0}` — misma especificidad que
las utilidades de Tailwind (0,1,0) y **carga después**. Al envolver la pantalla
entera, el `p-4 md:p-6` del catálogo computaba `0px` y las tarjetas quedaban
pegadas al borde. El scope ahora envuelve **sólo el header**, que al ser
`position:fixed` no necesita ser ancestro del contenido.

## 2. La grilla medía la ventana, pero vive en media ventana (`3419cd76`)

`/propiedades` parte la pantalla en dos y la grilla usaba breakpoints de
viewport (`md:grid-cols-2`):

| pantalla | antes | ahora |
|---|---|---|
| 1024 | 2 columnas de **244px** | 1 de 464 |
| 1440 | 2 de 324 | 2 de 324 |
| 2560 | 2 de **1.200** | 3 de 480 |

244px es más angosto que en un teléfono. Container queries en CSS plano (tres
reglas no justifican una dependencia). **Los umbrales salen del ancho mínimo de
tarjeta (~300px)**: el primer intento los puso en 560px y la grilla volvía a
saltar a dos columnas de 244 — el mismo defecto, a otro tamaño.

## 3. Sin fotos ≠ una foto vacía (`f71aa17f`)

`allImages = images.length > 0 ? images : [thumbnailUrl]` daba `[undefined]` y
pintaba `<img src="">`: ícono de rota + texto alternativo desbordado sobre las
etiquetas. Se descartan las vacías —incluida la **cadena vacía**, que es el caso
real de la base— y si no queda ninguna se muestra el vacío a propósito.

## 4. Siempre en claro (`fa3f8342`)

`landing-v2.css` no tiene modo oscuro: `.lv2` fija `--paper` y `--ink` como
literales. Con el tema oscuro el header salía claro sobre una página oscura.
`LandingChrome` usa `ForceLightMode` — la misma pieza que la home. **El panel
sigue respetando la preferencia**: verificado con el tema oscuro guardado, por
carga dura y por clic.

La ficha `/propiedades/[id]` también tenía el mega-menú viejo: el header
cambiaba entero al hacer clic en una tarjeta. Ya lleva el mismo.

## 5. Un solo indicador de foco (`7563f808`)

Al escribir en la búsqueda salían dos rectángulos, uno dentro del otro. El
contenedor ya marca el foco y el Textarea del DS traía además el suyo.
`focus-visible:ring-0` no lo apagaba porque **el DS no usa el `ring` de Tailwind
sino un `box-shadow` directo**. Sin test unitario a propósito: en jsdom no hay
CSS real, así que sólo podría afirmar que la clase está en el string.

## 6. La puerta devolvía al principio (`c4e348a5`)

**El defecto que Nico reportó.** El `returnUrl` de la puerta de sesión apuntaba
a `/propiedades/<id>` — la ficha. La persona tocaba «Postularme», hacía todo el
trámite de entrar, y aterrizaba **exactamente donde había empezado**. Desde
afuera: «no pasó nada». Ahora va a `/aplicar/<id>`.

Y `SesionYaAbierta`: llegar a `/auth` con sesión mostraba un formulario en
blanco (`didAuthenticateInForm` hace que el rebote sólo ocurra tras entrar en
ese formulario). Ahora dice con qué cuenta estás y da las dos salidas; «otra
cuenta» cierra sesión y **conserva el destino**.

---

## La trampa que me hizo reportar un falso negativo

> **Borrar `localStorage` no cierra la sesión: Supabase (`@supabase/ssr`) la
> guarda en COOKIES.**

La sesión anterior le dije a Nico que no había podido reproducir su defecto.
Era falso: mi «logout» no cerró nada, seguí logueado, y por eso el botón pasaba
directo y la ficha prometía «Sin codeudor» — todo correcto para alguien con
sesión. **Medí el estado equivocado y reporté una conclusión sobre él.**

Cerrando las cookies, el defecto salió a la primera.

## Gates

`tsc` ✓ · `eslint` sin errores nuevos ✓ · **285 archivos / 2438 tests** ✓ ·
`next build` ✓ (252 páginas). 22 tests nuevos, cada guarda comprobada por
sabotaje donde el test podía mentir.

---

## Lo que sigue

1. **Modal grande de confirmación** al postularse. Hoy sale la pantalla
   «Aplicación enviada» con código de seguimiento — funciona, pero Nico pidió
   un modal.
2. **Contratos** — UI + 113 conceptos + escenarios tributarios.

### Decisión de producto abierta

Nico dijo «si no tiene cuenta que lo lleve a crear cuenta», pero hoy «Es mi
primera vez» va a `/aprobacion` — a conocer su tope primero. Eso salió de la
reunión con Juan: **asegurabilidad antes que cuenta**. Queda planteado, sin
cambiar en silencio.

### Inconsistencia conocida, fuera de alcance

`/ayuda`, `/terminos`, `/pricing`, `/para/*` y `/privacidad` **siguen con el
header viejo**. Están fuera de «buscar inmuebles». Ya es mecánico con
`LandingChrome`.
