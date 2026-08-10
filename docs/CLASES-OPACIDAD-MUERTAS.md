# Clases que no generaban CSS — auditoría y cierre

Estado: **cerrado el 2026-08-09.** Este documento queda como el método, no como
una lista de pendientes.

## Qué pasaba

Dos defectos distintos, los dos invisibles para `tsc`, para ESLint y para los tests.

### 1. El modificador de opacidad sobre los tokens del DS

Tailwind sólo sabe inyectar alpha cuando puede leer los canales del color.

| Forma del token | ¿`/50` funciona? | Por qué |
|---|---|---|
| `hsl(var(--foreground))` | ✅ | la var es un triplete; lo reescribe a `hsl(… / .5)` |
| `var(--surface)` | ❌ | la var guarda un **hex**; no lo puede componer |

Los tokens de `@leasefy/cadence` son todos de la segunda forma. Resultado:
**103 formas de clase, 768 usos, cero líneas de CSS.** No es que se vieran mal:
`bg-surface/50` no existía.

**Arreglado en `tailwind.alpha.ts`**, que envuelve cada valor `var(--x)` en una
función que emite `color-mix(in srgb, var(--x) N%, transparent)` cuando hay
modificador. Se aplica en `tailwind.leasefy.ts` (tokens del DS) y en
`tailwind.config.ts` (los `bg`, `fg` y `plan-*` propios). Un arreglo, 768 usos.

### 2. Clases que nombran tokens que no existen

Peor que la anterior, porque el borde **sí** se pintaba: con el `#e5e7eb` del
preflight de Tailwind, un gris claro fijo que en modo oscuro se ve como una
línea brillante sobre una superficie oscura.

| Escrito | No existe porque | Corregido a |
|---|---|---|
| `border-faint` · `border-strong` | las claves son `border-faint`/`border-strong`, la utilidad es `border-border-faint` | `border-border-faint` · `border-border-strong` |
| `bg-surface-brand` | `surface` no tiene `brand` | `bg-primary-soft` |
| `bg-accent-soft` | el token `--accent-soft` se expone como `primary.soft` | `bg-primary-soft` |
| `bg-surface-raised` · `bg-surface-sunken` | `surface` sólo tiene `muted/hover/pressed/selected` | `bg-surface` · `bg-surface-muted` |
| `text-success-600` · `text-error-400` | la escala es 50/100/500/700 | `text-success` · `text-danger` |
| `bg-success-fg` · `bg-bg-dim` · `text-fg-secondary` | inventados | `bg-success` · `bg-surface-muted` · `text-fg-muted` |
| `bg-*/12` | 12 no está en la escala de opacidad | `/10` |

`bg-surface-brand` estaba en **29 pantallas**: el círculo del avatar no tenía
fondo y las iniciales quedaban flotando.

## Cómo se mide (el método, que es lo que hay que conservar)

No sirve grepear `.next`: Next parte el CSS en varios archivos, el de `dev`
difiere del de producción, y `next dev` te lo pisa mientras mirás. La medición
que vale es un build aislado de Tailwind con la config real:

```bash
# 1. juntar toda clase escrita en el código en un solo archivo
#    (tokens que empiezan por bg- text- border- ring- divide- from- to- …)
# 2. una config temporal que sólo mire ese archivo
cat > probe.tailwind.config.ts <<'EOF'
import base from './tailwind.config'
export default { ...base, content: ['/tmp/probe.html'] } as typeof base
EOF
npx tailwindcss -c probe.tailwind.config.ts -i src/app/globals.css -o /tmp/probe.css
# 3. la clase existe si aparece con la barra escapada:  .bg-surface\/50
```

Barrido completo el 2026-08-09: **902 clases de color examinadas, 63 muertas,
las 63 corregidas.** Las que quedan sin aparecer en el CSS son valores
arbitrarios (`shadow-[0_8px_30px_…]`, `text-[clamp(…)]`) — falsos positivos del
escapado, no defectos.

## Lo que este método NO cubre

Que una clase genere CSS no dice que se lea. Tres defectos que sólo se ven
mirando la pantalla, todos encontrados el mismo día:

- **`text-white` sobre `bg-danger-soft`** — la cifra más importante de la
  tarjeta, blanca sobre rosa claro. En 3 tarjetas de plata.
- **`dark:text-neutral-{100,200,500,600}`** — en oscuro sólo se redefinen
  `--neutral-0/50/100/200`; del 300 al 900 conservan el valor claro. Un
  `dark:` encima invierte dos veces. 41 usos, corregidos a tokens semánticos.
  Ver `reference-neutral-ya-es-sensible-al-tema` en memoria.
- **`bg-fg-muted`** — un token de texto usado como fondo: disco gris con el
  icono del mismo color exacto adentro.

## La regla

Usá los semánticos y no les pongas `dark:`: `text-fg` · `text-fg-muted` ·
`text-fg-subtle` · `bg-surface` · `bg-surface-muted` · `bg-card` ·
`border-border`. Ya resuelven solos. Ver `docs/DESIGN.md`.
