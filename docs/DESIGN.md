# DESIGN.md — Leasefy

> El sistema de diseño de Leasefy: cómo se ve, cómo se arma y cómo habla TODO lo que hacemos (panel de la
> inmobiliaria, portales, marketplace, landing, admin, chat de Ori, app nativa, correos y PDF).
> Identidad vigente: **Cadence 2 · «Papel, tinta y voltaje»** (Nico, 20 → 21-10-2026).
> Revisado contra el código el **28-10-2026** (front `marketplace-facil`, Cadence `identidad-leasefy`, `app-expo`
> `master`, landing estática).
>
> Lo carga la skill `diseno-leasefy`. Orden de autoridad cuando algo choca:
> 1. Lo que Nico eligió viéndolo (se hace tal cual).
> 2. Los tokens y piezas de Cadence (`cadence/src/styles/tokens.css`, `src/components/ui/*`).
> 3. Este documento. Si contradice el código de Cadence, se corrige este documento.
>
> Este mismo archivo vive en dos lugares con el mismo texto: la skill `diseno-leasefy` (`DESIGN.md`) y el front
> (`docs/DESIGN.md`). Si cambias uno, copia el otro en el mismo cambio.
>
> **El detalle de cada pieza** (cajón, modal, movimiento, toaster, estados, insignias, filtros, plata, primitivas,
> sello, datos de muestra) está en el front, `docs/DESIGN-PIEZAS.md`: es el DESIGN.md anterior con su numeración. Sus
> §1, §2 (valores), §3 y §10 describen Cadence 1 (Schibsted Grotesk, JetBrains Mono, degradados Aurora) y no aplican;
> si algo de ese archivo choca con éste, gana éste. **Los comentarios del código que citan «DESIGN.md §4», «§8b»,
> «§17», «§Drawers», «§Toaster»… usan esa numeración anterior: búscalos en `docs/DESIGN-PIEZAS.md`.**

## Índice

1. La idea
2. Mapa de la plataforma
3. Color
4. Letra
5. Forma: la esquina
6. Profundidad: sombras, líneas y capas
7. Espacio, retícula y anchos
8. Íconos
9. Ilustración, orbes e imágenes
10. Movimiento
11. Las piezas, y cuándo va cada una
12. Patrones de pantalla
13. Por superficie
14. Voz y tono
15. Responsive y accesibilidad
16. Lo que nunca
17. La vara: cómo se mide
18. Estado actual y deuda (medido el 28-10-2026)
19. Dónde vive cada cosa
20. Cómo pedirle diseño a otro agente o a otra IA

---

## 1. La idea

Leasefy es el software con el que una inmobiliaria de Colombia administra sus arriendos —contratos, cobro, giros a
propietarios, contabilidad, captación— con agentes de IA que hacen parte del trabajo, más el marketplace donde
inquilinos y propietarios encuentran inmuebles. Lo usa gente que maneja plata ajena todos los días: necesita leer
rápido, no equivocarse y sentir que el sistema sabe de inmobiliarias.

**Cómo se siente:** papel cálido, tinta y una sola chispa de azul eléctrico. Editorial y sereno, con el rigor de una
herramienta financiera. Nico (20-10-2026): «quiero nuestra propia marca, que no se sienta que es IA». La identidad
mezcla los botones de Mollie, lo moderno de OCI, el grano y la limpieza de ElevenLabs, la disposición de Clay y el
rigor de Baselayer, sin perder el azul. La vara de calidad es Stripe, Linear, Mercury y Ramp.

**Cinco principios**, en este orden cuando chocan:

1. **La tarea primero.** Cada pantalla se arma por el trabajo que la persona vino a hacer y en el orden en que lo
   hace (§12.1). Cambiar colores o íconos sobre el mismo flujo NO cuenta como diseño (Nico, 21-10: «no solo colocarle
   la UI nueva»).
2. **Una sola chispa.** El voltaje `#1A40FF` marca lo que se hace: una acción principal por pantalla. Todo lo demás es
   papel, tinta y grises.
3. **La cifra manda.** Cifras en DM Mono, enteras, alineadas y con su definición a mano. Nunca un dato inventado.
4. **Calma.** Títulos livianos, aire, sombras que casi no se ven, estados con punto y palabra. Nada grita.
5. **Hecho por nosotros.** Íconos propios, ilustraciones 3D propias, fotos del producto real. Ni brillos, ni
   estrellitas, ni degradados morados, ni «✨ IA».

Y dos exigencias de Nico que aplican a todo: **impacto visual real** («wow») en cada pantalla, decidido y construido
sin rondas de propuestas (21-10), y **responsive perfecto** en celular, tableta y escritorio, claro y oscuro (21-10).

---

## 2. Mapa de la plataforma

| Superficie | Para quién | Dónde vive | Ver |
|---|---|---|---|
| Panel de la inmobiliaria `/panel/inmobiliaria/*` | dueño, asesor, contador | front `src/app/panel/inmobiliaria`, `src/components/*`; menú en `src/lib/nav/arquitectura-del-panel.ts` | §13.1 |
| Portales: inquilino (`/inquilino`), propietario (`/panel/(landlord)`), independiente | inquilinos, propietarios | front | §13.2 |
| Marketplace y públicas en React: `/propiedades`, ficha `/propiedades/<id>`, `/i/<id>`, avalúo, blog, contacto | quien busca o publica | front | §13.3 |
| Landing estática: `/es`, `/en`, `/productos/*`, `/para/*` | inmobiliarias que nos evalúan | front `public/landing/index.html`, `public/internas/`, armadas en `public/paginas/` | §13.4 |
| Admin de Leasefy `/admin/*` | equipo de Leasefy | front `src/app/admin`, `src/components/admin` | §13.5 |
| Chat de Ori y los agentes | todos los roles del panel | front `src/components/beta/**`; Cadence `chat-*` | §13.6 |
| App nativa iOS / Android (Expo) | todos los perfiles | repo `app-expo` (`src/tema`, `src/components/ui`) | §13.7 |
| Correos, PDF, Excel | inquilinos, propietarios, contadores | plantillas del back y del micro; front `src/lib/**/documento-*.ts` | §13.9 |
| Imágenes de marca (manual, campañas, redes) | mercado | manual de marca (artefacto KmyeY1Fq…) | §13.10 |

La rama de trabajo cambia según el encargo: antes de tocar, mira cuál es (en la máquina de Nico los front son worktrees
`~/rent/wt-front-*`). Cadence es el repo hermano `cadence` (Cadence 2 en la máquina de Nico: `~/rent/wt-cadence-identidad`).

---

## 3. Color

### 3.1 Los roles (tema claro)

| Nombre | Hex | Para qué | Web (Tailwind) | App (`COLORES.claro`) |
|---|---|---|---|---|
| Papel | `#FBFAF8` | el fondo de todo | `bg-bg` | `fondo` |
| Superficie | `#FFFFFF` | tarjetas, tablas, cajones, modales | `bg-surface` | `superficie` |
| Arena | `#F3F1ED` | botón secundario, pista de pestañas, bloques callados | `bg-surface-muted` | `superficieHundida` |
| Piedra | `#E7E3DC` | la línea fina | `border-border` | `borde` |
| Piedra suave | `#EFECE7` | divisiones dentro de una tarjeta | `border-border-faint` | `bordeSuave` |
| Piedra fuerte | `#D3CDC3` | hover de un campo | `border-border-strong` | `bordeFuerte` |
| Tinta | `#121110` | el texto (18,4 : 1 sobre papel) | `text-fg` | `texto` |
| Grafito | `#5B5751` | texto secundario (7,2 : 1) | `text-fg-muted` | `textoSuave` |
| Ceniza | `#706B64` | texto tenue, cabeceras de tabla (5,1 : 1) | `text-fg-subtle` | `textoTenue` |
| **Voltaje** | `#1A40FF` | LA chispa: acción principal, foco, enlace, paso actual, menú activo (6,5 : 1) | `bg-primary`, `text-primary`, `ring-ring` | `primario` |
| Voltaje suave | `#EEF1FF` | lo elegido, la fila activa, la insignia «en curso» | `bg-primary-soft` | `primarioSuave` |
| Medianoche | `#0A0F2C` → `#16205C` | superficie de marca: Ori, plan, onboarding, la entrada, velo de modales | `bg-ink`, `text-ink-fg` | `tinta`, `tinta2` |
| Éxito | `#2B7549` · suave `#E8F2EB` | al día, pagado, verificado | `text-success`, `bg-success-soft` | `exito` |
| Aviso | `#8C600E` (texto) · suave `#FAF0DA` | por vencer, revisar | `text-warning`, `bg-warning-soft` | `aviso` |
| Peligro | `#B8372A` · suave `#FBEAE6` | mora, error, irreversible | `text-danger`, `bg-danger-soft` | `peligro` |
| Info | `#2A6FB0` · suave `#E6F0FA` | información neutra | `text-info`, `bg-info-soft` | `info` |
| Chispas | lila `#9D8CFF` · ámbar `#FF7A3D` · cielo `#7DC4FF` · rosa `#FFB3C8` · menta `#8FE3BF` | SÓLO ilustración y orbes | `chispa-*` | `chispa*` |

El ámbar de la identidad para puntos e ilustración es `#D9911C` (lo usa la landing); el texto de aviso es `#8C600E`
porque necesita contraste.

Degradados: el único **de color** es el de la medianoche,
`linear-gradient(150deg, var(--ink) 58%, var(--ink-2) 135%)`. Fuera de ese, sólo degradados **funcionales y
neutros**: el velo que hace legible un texto sobre una foto o un video, el desvanecido de un borde (`mask-image`), el
material de un marco en una maqueta (el portátil de la landing) y los patrones de puntos o rayas de corte duro. Nunca
un degradado decorativo de color (ni de voltaje a lila, ni «aurora»).

### 3.2 Tema oscuro

Un solo negro **Onyx `#0A0A0A`** en todos los fondos (Nico, 01-09) y los grises **neutros** del chat (Nico, 02-10):
arena `#1A1A1A`, piedra `#262626`, texto `#FBFAF9`, grafito `#A6A6A6`, ceniza `#8A8A8A`, voltaje `#2E52FF`. La
medianoche en oscuro es el mismo negro; el azul de noche queda en el degradado (`ink-2 #141A3D`). Toda pantalla se
revisa también en oscuro. Guardián: `src/components/ui/grises-en-oscuro.guardian.test.ts`.

### 3.3 Reglas

- **Una acción en voltaje por pantalla** (o por bloque que vive aparte, como un cajón). La que más se hace ahí.
- **Medianoche: un momento de marca por pantalla, como mucho** (`CampoDeMedianoche`).
- **Estado = punto + palabra.** El fondo suave sólo en insignias y avisos; nunca rellenos saturados.
- **El color dice gravedad, no decora.** Verde, ámbar y rojo sólo donde hay un juicio (al día / por vencer / en mora).
- **Gráficas:** la rampa del voltaje (`--blue-500 … --blue-200`) más ceniza y piedra fuerte; los colores de estado sólo
  cuando la serie ES un estado. Así lo hacen `donut-chart` y `bar-chart` de Cadence.
- **Siempre por token.** Nada de hex en clases (`bg-[#1a40ff]`), nada de la paleta cruda de Tailwind (`bg-blue-500`,
  `text-violet-600`, `bg-emerald-50`), nada de `var(--primary)` suelto en una sombra o un `style` (en el front son
  canales HSL: usar `ring-*`, `bg-primary`, `border-border`). En la app nativa, `useTema()` y `COLORES`; en la landing,
  las variables CSS de `public/landing/index.html` (`--voltaje`, `--tinta`, `--arena`…).

---

## 4. Letra

Dos familias, cargadas con `next/font` en `src/app/layout.tsx` (web), `@expo-google-fonts` en la app y por CSS en la
landing:

- **Host Grotesk** — para leer: títulos y texto. Títulos LIVIANOS.
- **DM Mono** — cifras (tabulares, también en tablas), rótulos y textos cortos en MAYÚSCULA.

### 4.1 La escala (Cadence 2)

| Clase | Tamaño / interlínea | Peso | Familia | Uso |
|---|---|---|---|---|
| `text-display` | clamp(40–64) / 1,02 | 400 | Host | héroes de la landing y momentos de marca |
| `text-h1` | 32 / 1,1 | 420 | Host | título de página pública, entrada, onboarding |
| `text-h2` | 22 / 1,25 | 500 | Host | **título de pantalla del panel, portales y admin** (`<h1 className="text-h2">`) |
| `text-h3` | 18 / 1,35 | 500 | Host | título de bloque o de tarjeta; título de modal (20/500) |
| `text-subtitle` / `text-body-lg` | 18 / 1,45 | 400 | Host | entradillas |
| `text-body` | 16 / 1,55 | 400 | Host | texto |
| `text-body-sm` | 14 / 1,5 | 400 | Host | texto de tablas, formularios y UI densa |
| `text-caption` | 13 / 1,46 | 400 | Host | ayudas, datos secundarios. **El mínimo para contenido** |
| `text-label` | 11 / 1,35, +0,06 em | 400 | **Mono MAYÚSCULA** | sobretítulos, cabeceras de tabla, estados |
| `text-stat` | 30 / 1,1 | 400 | **Mono** | la cifra de un KPI |

### 4.2 Reglas

- **Jerarquía con tamaño y aire, nunca con negrilla.** Pesos 400, 420 y 500. `font-bold` no se usa; `font-semibold`
  no se agrega en código nuevo (quedan 471 usos viejos, §18).
- **Título de pantalla del panel = `h1` con `text-h2`.** No el `PageHeader` de Cadence (su título es el gigante). La
  descripción va debajo en UNA línea, `text-sm text-fg-muted max-w-2xl`.
- **Cifras siempre en `font-mono`** (tabulares). Plata con `formatCurrency` → «$ 1.234.567» con espacio duro (U+00A0)
  después de `$`.
- **MAYÚSCULAS sólo en DM Mono y sólo en rótulos cortos** (`text-label`). Nunca `uppercase` en Host Grotesk, en
  botones ni en frases. Nunca la clase `capitalize` (en español sube cada palabra): `conMayusculaInicial`.
- **Botones en minúscula de frase**, Host Grotesk medio.
- **12 px no crece**: `text-xs` tiene un guardián que no deja sumar usos (`components/doce-pixeles.guardian.test.ts`).
- **App nativa:** nunca `fontWeight`; la letra sale de `LETRA` (`src/tema/tokens.ts`: `normal`, `media`, `mono`…).
- **Landing:** `var(--f)` (Host Grotesk) y `var(--m)` (DM Mono).

---

## 5. Forma: la esquina

- **La esquina suavizada** (la de Mollie): `corner-shape: superellipse(1.5)` en toda esquina redondeada. La pone sola
  la regla global de `globals.css` para cualquier `rounded-*` que no sea `rounded-full`. Sin soporte del navegador
  cae al radio de siempre.
- **Escala** (remapeada por Cadence): `rounded-sm` 8 · `rounded-md` 14 · `rounded-lg` 22 · `rounded-xl` 32 ·
  `rounded-full`. 🔴 Trampa: `rounded-xl` NO son 12 px, son 32; `rounded-lg` son 22. Para una caja chica, `rounded-sm`.
- **Por pieza:** botones con radio completo + superelipse (lo trae `Button`; nunca pastilla dura ni rectángulo duro) ·
  campos 14 · tarjetas 20–22 · modales y cajón 24 · pastillas 7 · avatar de persona en superelipse · círculos
  (avatar de agente, orbes, puntos de estado) `rounded-full`.

---

## 6. Profundidad: sombras, líneas y capas

- **Dos sombras y nada más:** `shadow-susurro` (una pieza que sube apenas: filo de 1 px + sombra casi invisible) y
  `shadow-flotante` (menús, cajones, diálogos). Nada de `shadow-xl`, brillos ni resplandores.
- **Líneas finas:** `border-border` alrededor; `border-border-faint` para dividir por dentro.
- **Una sola capa de tarjeta.** Nunca tarjeta con borde dentro de tarjeta con borde: adentro se separa con aire o con
  una línea fina y rótulos en mono (así está hecha `TarjetaDeLaFicha`).
- **Velos:** medianoche al 38 % detrás de un modal, al 24 % detrás de un cajón (la lista se sigue viendo).
- **Sin vidrio sobre contenido** (glassmorphism). El botón `glass` existe sólo sobre medianoche.
- **Capas (z-index):** dropdown 10 · sticky 20 · fixed 30 · velo 40 · modal 50 · popover 60 · tooltip 70 · toast 80.

---

## 7. Espacio, retícula y anchos

- **Escala de 4:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Entre bloques, más aire que dentro del bloque (proximidad).
- **Contenedor de pantalla** (panel, portales, admin): `space-y-6 p-6 lg:p-8`, **a todo el ancho**. Nunca
  `max-w-3xl mx-auto` ni columnas centradas (Nico, 12-10). Excepción: el estado de cuenta, documento imprimible de
  1.200 px.
- **Anchos que se prueban:** 390 · 768 · 1024 · 1440 (y oscuro). Nada se corre de lado a 390 (`scrollWidth` = ancho).
- **Bajo 768 px** las tablas pasan a tarjetas (`useIsMobile`) o se deslizan DENTRO de su caja; los rieles de
  pestañas y atajos se deslizan; los botones principales van a lo ancho.
- **Columnas parejas** en las páginas públicas: mide la altura de ambas columnas antes de entregar (Nico, 16-10).
- **Landing:** `--max: 1320px`, `--gutter: clamp(16px, 4vw, 56px)`. **App:** 16 a los lados (`ESPACIO.l`), sin
  franjas vacías arriba ni abajo.

---

## 8. Íconos

Una familia propia (Cadence `src/icons`): cuadrícula de 24, **trazo 1,5**, puntas y uniones redondas, esquinas
suavizadas y un **corte** donde un trazo pasa sobre otro. Pesos: thin · light · regular (1,5) · bold · **fill**
(silueta llena, detalles calados) · duotone.

- **Web:** se importa como siempre de `@phosphor-icons/react`; `next.config.mjs` (`aliasDeIconos`) y `vitest.config.ts`
  apuntan ese paquete al puente `@leasefy/cadence/phosphor`, que dibuja con nuestra familia los 307 nombres que usa la
  plataforma. También `<Icono nombre="casa" size={16} />`. Regular por defecto; fill para lo activo.
- **Nunca Lucide** (queda 1 import viejo). Nunca SF Symbols ni Material en la app.
- **La IA es la orbe**, no una estrellita: `Sparkle` y `MagicWand` se dibujan como esfera con su brillo (`chispa`).
- **Sin íconos dentro de círculos o cuadros de color.** Si un vacío chico necesita base, `EsferaDeGrano`.
- **Un ícono que falta se dibuja**, no se toma de otra librería: Cadence `scripts/iconos/familia.py` (+ `MAPA_PHOSPHOR`)
  → `npm run iconos` → revisar `scripts/iconos/hoja.html` (regular y fill) → `tsup`. En la app: PNG de plantilla con
  `app-expo/scripts/iconos/traer-de-cadence.py`.

---

## 9. Ilustración, orbes e imágenes

### 9.1 Ilustraciones 3D

Objetos renderizados en Blender con trazado de rayos, aprobados por Nico (21–22-10), en dos tonos: **voltaje** y
**grafito** (`auto` elige). Van sin pedestal, transparentes, con su sombra:
`<Ilustracion nombre="contrato" tono="voltaje" tamano={160} />` (Cadence; archivos `public/ilustraciones/<nombre>-<tono>.webp`).

Los 64 nombres (`NOMBRES_ILUSTRACIONES`):
- **Plata:** casa, alcancia, billetera, escudo, monedas
- **Inmuebles:** edificio, fachada, local, torre, bodega, lote, campestre, parqueadero, plano, obra
- **Captación y marketplace:** arriendo, lupa, pin, mapa, camara, recorrido, visita, favorito, megafono, canon
- **Contratos:** contrato, firma, sello, llaves, carpeta
- **Estudio y cobro:** portapapeles, cedula, lupa_estudio, calendario_pago, factura, datafono, banco, celular_pago, reloj_mora, campana
- **Cartera e incrementos:** sobre_cobro, grafica, calculadora, ipc, herramientas
- **Mantenimiento y entrega:** llave_destornillador, grifo, bombillo, inventario, rodillo, buzon, cerradura, mudanza
- **Novedades y plan:** novedad_regalo, novedad_cohete, aviso_importante, aviso_cartelera, plan_peldanos, plan_insignia
- **Estados:** pago_confirmado, sin_conexion, bienvenida, mensajes, equipo, correo_enviado

Reglas: **todo estado vacío lleva su ilustración 3D** (Nico, 23-10, «sí o sí»), con las piezas que ya la ponen (§11);
una ilustración por pantalla; para éxitos, vacíos grandes y bienvenidas. Una ilustración nueva se hace con el motor de
Blender (`archivos/identidad-v3/blender/escena.py` en la memoria del proyecto) y Nico la ve antes de usarla.

### 9.2 Orbes y piezas de marca

- **`AgentOrb`** — la orbe viva **Nebulosa**, elegida por Nico el 02-10 TAL CUAL (Cadence v1.2.2). Sola: sin aura, sin
  puntos ni cruces alrededor. Cada agente tiene su paleta. Estados: quieta, `working` (trabajando/hablando).
- **`EsferaDeGrano`** (quieta, con grano), **`FotoEnEstrias`** (fotos en estrías), **`BrandMotif`** (el monograma en
  estrías), **`CampoDeMedianoche`** (el momento de marca).
- El grano (`--grano`) va sólo en esferas y campos de marca.
- **Fondos y fotos de lo público, sin puntos ni estrías** (Nico 29-10 en el home; 30-10 «el marketplace todavía tiene
  cosas de dots» y las estrías «parecen un bug»): sobre papel, **`OlaEnPapel`** (la tinta de voltaje sube desde abajo;
  en el héroe, `interactivo`: ondas finas donde pasa el cursor); sobre medianoche, **`CurvasDeNivel`**; las fotos de
  marca, **`TintaDelDuotono`** (llegan en medianoche, voltaje y papel y florecen a su color al verse o al pasar el
  mouse). Piezas en `src/components/landing-v2/{CamposDeLaMarca,TintaDelDuotono}.tsx`; en la landing estática,
  `09-campos.js` (home) y `js/0X-campos.js` de cada familia de internas. `CorrienteDeVoltaje` (píxeles) y
  `FotoEnEstrias` ya no van en ninguna pantalla pública.

### 9.3 Imágenes del producto y de marca

- **Lo que muestra el producto es una captura REAL del panel** con la inmobiliaria de demostración «Tu Inmobiliaria»
  (datos inventados pero creíbles y coherentes; nunca datos de clientes ni restos de QA). Mejor el panel completo en
  uso, en clip, que un recorte quieto. Cada imagen prueba lo que dice su texto. Marcos grises. Si la pantalla cambia,
  se vuelve a tomar; nunca se dibuja a mano (Nico, 12-10).
- **Logo:** proporción 2,08 : 1, nunca deformado. En arquitectura u objetos (fachada, placa, bordado) va como OBJETO REAL
  hecho por el generador, nunca pegado plano; lo plano sólo en pantallas, hojas, paredes pintadas y lonas. Revisar manos
  y letras de cada imagen generada. Nada repetido (Nico, 28-10). Manual: https://claude.ai/artifact/KmyeY1Fqv5qVwAfQmxBX3R

---

## 10. Movimiento

Nico (02-10): «que cada interacción tenga su animación top, cosas suaves: entradas, salidas, cambios». Una pantalla
correcta pero quieta se siente sin terminar.

- **Tokens** (`cadence/src/motion/tokens.ts` = `tokens.css`): `instant` 100 ms (hover, foco) · `fast` 150 ms (presión,
  salidas) · `base` 200 ms (entradas, menús, pestañas) · `slow` 300 ms (paneles, secciones, colapsables) · `reveal`
  500 ms (cifras grandes). Curvas: `ease-enter` (lo que entra desacelera), `ease-exit` (lo que sale acelera y dura
  menos), `ease-emphasis` (paneles), `ease-spring` (presión, interruptores). Distancias 4 · 8 · 16 · 24.
- **Primitivas de Cadence:** `Appear`, `Presence`, `Stagger`/`StaggerItem`, `CrossFade`, `Collapse`,
  `MotionIndicator` (el indicador de la pestaña activa), `AnimatedNumber` (cifras que cambian), `Pressable`,
  `PageTransition`, `MotionProvider`. Los componentes base (`Button`, `Table`, `Dialog`, cajón) ya traen el suyo.
- **Reglas:** sólo `transform` y `opacity` (salvo la altura de un colapsable); presionar encoge 3 % con resorte;
  modales entran en 200 ms, cajones en 240 ms; listas que entran de a uno (stagger corto); cargando → contenido con
  fundido; una cosa se mueve a la vez. Con `prefers-reduced-motion` sólo quedan fundidos (`MotionConfig
  reducedMotion="user"`). Nunca animar `transform: scale` en un diálogo centrado con `translate` (usa la propiedad
  `scale`; ver el comentario de `scale-in` en `tailwind.config.ts`).

---

## 11. Las piezas, y cuándo va cada una

Antes de escribir una pieza, búscala: front `src/components/ui/*` (adaptadores sobre Cadence),
`src/components/pantalla/*`, `src/components/estado/*`, o `@leasefy/cadence` (329 archivos en `src/components/ui`).
**Si falta, se agrega a Cadence o a `components/pantalla`; nunca un estilo armado a mano dentro de una pantalla.**

| Necesidad | Pieza | Reglas |
|---|---|---|
| Encabezado de pantalla | `EncabezadoDePantalla` (front `components/pantalla`) | sección en mono · título `text-h2` · UNA línea de para qué sirve │ a la derecha, de lo más callado a lo más fuerte: ayuda (`ParaEntenderMas`), secundarias (`outline`), principal (voltaje). Todos `size="sm"`. En el celular las acciones bajan y la principal va a lo ancho |
| Botón | `Button` (front `components/ui/button.tsx` → Cadence) | `default` = voltaje, UNO · `secondary`/`outline` (arena) · `ink` para decidir (aprobar, girar) · `ghost` para cancelar · `link` · `destructive` · `white`/`glass` sólo sobre medianoche. Tamaños `sm` (tablas, barras, encabezado) · `default` · `lg` (entrada, formularios de una columna). `isLoading` conserva el ancho; `count` nunca muestra 0; sin flechas decorativas; el texto dice lo que pasa |
| Lo que falta para empezar | `ListaParaEmpezar` | «Para facturar te faltan 2 pasos», el primero con «Sigue»; lo opcional no cuenta; con todo listo se pliega en una línea |
| Tarea en pasos | `PasosDeLaTarea` | el paso actual abierto, lo hecho resumido con «Cambiar», lo que viene con su porqué |
| Lo de consulta | `MasDetalles` («Ver detalles») | explicaciones, opciones avanzadas, desgloses: plegados en la misma pantalla |
| Página larga (> 3 pantallas) | `IndiceDeLaPagina` | «En esta sección», pegado arriba; cada bloque con `id` + `data-indice` |
| La cifra que decide | `CifraHeroe` (front `components/pantalla`) | rótulo mono · cifra grande · contexto que la vuelve un hecho · barra en tramos · leyenda |
| Varias cifras | `FranjaDeCifras` + `Cifra` (Cadence) | juntas en UNA tarjeta con líneas finas, no tarjetas sueltas con ícono. Máx. 4. `Cifra onClick activa` filtra la lista (va DENTRO de la tarjeta de la tabla). `tono` sólo si pide atención |
| Una sola cifra | `KpiCard` / `Stat` | etiqueta mono, cifra mono 30 |
| Pestañas de estado de una tabla | `PestanasDeEstado` (front) | con conteo, DENTRO de la tarjeta; reemplaza franjas de ceros |
| Pestañas | `Tabs` (pocas, por trabajo) · `SegmentedControl` (variantes dentro de una pestaña) | pista de arena; la elegida sube con `shadow-susurro` |
| Ficha (inmueble, contrato, propietario, inquilino) | `TarjetaDeLaFicha`, `PestanasDeLaFicha` | sin borde duro, título liviano con ícono suelto; adentro, líneas finas |
| Tabla | `Table` + `TableToolbar` + `TableFooter` (Cadence; front `components/ui/table.tsx`), `TablePagination`; admin: `DataTable` | ver §12.3 |
| Acciones masivas | `BarraDeAccionesMasivas` (front `components/ui/acciones-masivas.tsx`) | una línea + «Ver más»; bajo `lg`, encima de la barra del celular |
| Cajón | `Cajon` (front `components/ui/cajon.tsx`) / `Sheet` | sale por la derecha, flota a 12 px con esquina 24; cabecera (qué es + estado + cifra), pestañas sólo si hay más de un tema, cuerpo que se desplaza solo, pie fijo con la acción. En el celular, hoja desde abajo |
| Modal | `Dialog` / `AlertDialog`, `Confirmar` (front `components/ui/confirmar.tsx`), `ConfirmarEscribiendo` (Cadence) | sólo para decidir. Título = la pregunta; el porqué en una línea con la cifra; botones que dicen lo que hacen, la principal a la derecha; UNA sola ✕ (la pone la primitiva) |
| Aviso (toast) | front `components/ui/toast.tsx` (sonner) | tarjeta clara con punto de estado, título + una línea, «Deshacer» si se puede; 6 s |
| Vacío | `EmptyState` (ui) · `SinDatos` (con filtros) · `VacioDeSeccion` (Configuración) · `VacioChico` (tarjeta, 64 px) | SIEMPRE con ilustración 3D; si la pantalla no elige, `ilustracionDelVacio()` (`lib/vacios`) la deduce. Qué va a aparecer, quién lo trae y UNA acción |
| Fallo al leer | `FalloDeCarga` / `EstadoDeDatos` (front `components/estado`) | qué pasó, reintentar y salida |
| Error de un campo | `ErrorDelCampo` (front `components/estado`) + `aplicarErroresDelServidor` | bajo el campo, en palabras, cómo arreglarlo |
| Texto del error | `mensajeParaLaPersona` (`lib/errores/traductor-de-errores.ts`) | un solo traductor; «conexión» sólo si no hubo respuesta |
| Estado de un registro | `StatusBadge` (punto + palabra en mono) · `Badge` suave | el estado se lee por la palabra, no por un bloque de color |
| Persona, agente, inmueble | `Avatar` (`persona` superelipse con su tono · `agente` círculo con orbe · `inmueble` foto · `invitada` punteada · `marca` medianoche), `AvatarStack` | nunca iniciales hechas a mano |
| Plata | `MoneyInput`, `CampoDePlata`, `formatCurrency` | cifras en mono; centavos sólo con la llave del back |
| Fechas | `CampoDeFecha` (DatePicker de Cadence), `fechaLegible`, `fechaEnFrase` | nunca `<input type="date">` (guardián `fechas-con-cadence`) |
| Otros campos | `Input`, `Select`, `Combobox`, `PhoneField`, `PercentInput`, `CasillasDeCodigo`, `SelectorDeArchivo` | etiqueta arriba, ayuda debajo; `aria-invalid` pinta el borde |
| Volver | `BackButton` | arriba en toda sub-pantalla, también en carga, vacío y fallo |
| Acciones de una sección de Configuración | `AccionesDeLaSeccion` | en la línea del título, a la derecha: secundarias y al final la principal |
| Fotos | `VisorDeFotos` | |

---

## 12. Patrones de pantalla

### 12.1 Por tarea: las cinco capas (el glow up, Nico 20-10)

Antes de dibujar, escribe el trabajo en una línea («Cobrarle a quien debe este mes») y los pasos que la persona hace
hoy y los que debería hacer. Después arma de arriba abajo, en el orden en que se trabaja:

1. **Encabezado** — dónde estoy, qué es (una línea) y la acción principal (`EncabezadoDePantalla`).
2. **Lo que falta para empezar** — sólo si la tarea tiene requisitos (`ListaParaEmpezar`).
3. **La tarea en pasos** — cuando hay un orden (`PasosDeLaTarea`); o **lo que toca hoy** en UNA frase con sus cifras,
   o la `CifraHeroe` si una cifra decide la pantalla.
4. **El trabajo de todos los días** — la tabla o el formulario; el detalle en un cajón, no en otra pantalla.
5. **Lo demás** — lo que se toca una vez al año o se consulta poco: `MasDetalles`, un cajón, una pestaña al final o su
   propia vista con «Volver». Nunca un listado infinito al fondo.

Reglas que salen de ahí: **un aviso, una vez** (si arriba dice que falta algo, no se repite en la tabla) · **pocas
pestañas, por trabajo** (Facturación pasó de 8 a 5; las variantes, en un `SegmentedControl`) · **lo que se configura
una vez es un botón que abre su cajón ahí mismo**, no una pestaña adonde ir · **cuenta los clics y campos del camino
más común y quita los que sobran** (la complejidad la absorbe el sistema).

### 12.2 ¿Cajón, modal o página?

- **Cajón:** ver o editar una cosa sin perder la lista.
- **Modal:** decidir algo que no puede esperar o que no se deshace.
- **Página:** una tarea de más de tres pasos, o algo que se comparte con un enlace.
- **Lo que se deshace no lleva modal:** se hace y sale un aviso con «Deshacer».
- **El foco** entra al primer campo (o al botón seguro), no se escapa del modal y vuelve al botón que lo abrió.

### 12.3 Tablas y listas

- **La barra va DENTRO de la tarjeta de la tabla** (`toolbar`): buscador a la izquierda (ancho flexible), los 1–3
  filtros que más se usan como selects compactos en la MISMA línea, el resto en «Filtros (n)» (popover), exportar y
  acciones a la derecha. Todos los controles del mismo alto (h-9). Nunca selects con etiqueta flotando en una grilla
  ni filtros en dos renglones desalineados.
- **Un filtro activo se ve** (chip «Estado: en mora ✕») y «Limpiar» aparece sólo con filtros. Filtros, pestaña,
  orden y página quedan en la URL.
- **Pestañas de estado con conteo** dentro de la tarjeta; la pestaña que nunca tendrá nada se oculta.
- **Paginación, filtros y buscador NUNCA se quitan** en un rediseño, y se agregan a la tabla que crece (Nico, 23-10).
  También en la versión de tarjetas del celular.
- **Columnas:** la primera identifica (nombre + dato secundario debajo en grafito); números a la derecha en mono con
  los mismos decimales; textos a la izquierda; una columna que dice lo mismo en todas las filas se quita o se vuelve
  filtro; un cero en una tabla de conteos es «—» atenuado.
- **La fila abre el cajón** con el detalle completo.
- **Bajo 768 px:** tarjetas con 2–3 datos esenciales, buscador a lo ancho + botón «Filtros» (hoja inferior).
- **Exportar** donde hay listas, salvo datos personales de deudores (Deudores, Cartera por etapa).

### 12.4 Cifras

- Máximo 4 juntas, en `FranjaDeCifras`. Cada una responde una pregunta que cambia una decisión.
- Una cifra que casi siempre es 0 no es una cifra: es un aviso que aparece cuando no es 0.
- Todo en cero → UNA línea («Todo al día: nadie en mora»), no una franja de ceros.
- Sin sub-datos de relleno. Un sub-dato sólo si cambia la lectura (una tendencia real, una fecha que vence).
- El mismo número no se dice dos veces en la misma vista (cifra, pestaña y título).
- Una cifra sin definición no se publica; la definición puede ir plegada («Qué mide cada cifra»).

### 12.5 Etapas, embudos y distribuciones

No una tarjeta de color por etapa. UNA barra horizontal apilada (cada tramo = cuántos hay; color sólo por gravedad,
de neutro a rojo) + una lista compacta debajo (etapa · cantidad · monto · días), alineada en columnas; las etapas en
cero atenuadas o plegadas («+ 4 etapas sin casos»). Tocar una etapa filtra la tabla.

### 12.6 Formularios

- Una columna en el celular; dos sólo para pares naturales (día/mes, ciudad/departamento).
- Etiqueta arriba; la ayuda dice qué va; el error dice CÓMO arreglarlo con un ejemplo, bajo el campo. Un requerido
  vacío no abre en rojo: su error sale al dejarlo.
- Se valida en el campo antes de enviar, con los MISMOS topes y frases que el DTO del back.
- Un campo apagado dice por qué; lo verificado lleva su chulo verde y de dónde salió.
- El botón dice el resultado («Guardar el contrato», no «Enviar»). Un formulario a medias no se pierde sin avisar.
- **Texto largo con formato (la descripción del inmueble, 31-10-2026, Nico: «lo de bold… agregar emojis»)**:
  `EditorDeDescripcion` (front `components/property`) = el mismo `Textarea` con una barra de íconos fantasma (negrilla,
  cursiva, viñetas, numerada, emojis, «Ver cómo queda»). Se guarda con las marcas de WhatsApp y se pinta con
  `DescripcionConFormato`: la negrilla de la persona va en `font-medium text-fg`, nunca `font-bold`. Los emojis del
  selector son CONTENIDO de la persona (viven en `lib/inmuebles/emojis-de-la-descripcion.ts`), no adorno de la
  interfaz: la regla de §16 sigue igual.

### 12.7 Carga, vacío y error

- **Carga:** esqueleto con la forma de lo que llega (nunca la tabla vacía, ceros ni «0 de 0»); respuesta en < 400 ms o
  esqueleto.
- **Vacío:** ilustración 3D + por qué está vacío + quién lo trae + UNA acción (§11).
- **Error:** `FalloDeCarga` con qué pasó, reintentar y salida; ningún estado sin salida.

### 12.8 Acciones y confirmaciones

- Una sola acción azul por pantalla, arriba a la derecha en el encabezado; lo frecuente grande y cerca, lo destructivo
  lejos de lo frecuente.
- En Configuración, las acciones van en la línea del título de la sección, a la derecha (`AccionesDeLaSeccion`).
- **Tarjeta de acción** (pagar, aprobar, firmar): el monto y el botón juntos, el botón a lo ancho en el celular, el
  detalle plegable.
- Un botón apagado dice qué falta; lo que no se puede (permiso, estado) no se ofrece.
- Toda acción que tarda dice que está en curso y no se puede disparar dos veces.
- Al terminar, un aviso dice QUÉ pasó (con la cifra) y ofrece lo siguiente.
- Nunca diálogos del navegador (`window.alert/confirm`; guardián `sin-dialogos-del-navegador`). Lo irreversible:
  `ConfirmarEscribiendo palabra="BORRAR"`.

### 12.9 El control del caso de uso se ve de una

Cuando una opción abre un caso de uso («En los meses que elijo»), el control para hacerlo (el calendario de meses)
aparece ENSEGUIDA y con la forma que la persona espera, nunca detrás de «elige primero…». Si depende de otro dato,
arranca con un valor razonable y se vuelve a leer sin perder lo marcado (Nico, 22-10). Recorre cada caso desde el
estado vacío y pregúntate: «¿dónde está el control para hacer lo que esta opción promete?».

### 12.10 Datos para copiar

Lo que se copia (referencia, número de cuenta) grande, en mono, con su «Copiar» al lado de CADA dato. Lo que no se
copia, en grafito y pequeño.

---

## 13. Por superficie

### 13.1 Panel de la inmobiliaria

Todo lo de §11–12. Contenedor `space-y-6 p-6 lg:p-8`; `EncabezadoDePantalla`; tabla con barra adentro; cajón por fila;
`tr()` para todo texto nuevo, con su inglés en `lib/i18n/frases-en-del-glow-up.ts`. Los agentes de IA tienen su sección
del menú («Agentes IA») pero viven DENTRO del chat (§13.6). Ejemplos hechos: Facturación
(`app/panel/inmobiliaria/facturacion/page.tsx`), Recaudo bancario, Cartera.

- **La barra lateral es UNA hoja de arena** (Nico, 22-10), también su pie (tarjetas fijas, Ayuda, tema): el pie va
  sólido con la misma arena, nunca con el papel de la página (Nico, 29-10: en oscuro dejaba negros los lados de la
  tarjeta «Configura tu facturación»). Las tarjetas del pie van en `bg-surface`, como la de migración.
- **Acciones de una fila de tabla:** a la vista sólo la que sigue para ESA fila (causar el borrador, pagar la causada),
  en `sm`; lo que reversa o borra (anular) va en el «⋯» (`IconButton` + `DropdownList`, `ANCHO_DEL_MENU_DE_ACCIONES`)
  y, si no se puede, la opción apagada con su motivo debajo. Nunca dos o tres botones apilados en la celda (29-10,
  Facturas de proveedor: la fila medía 170 px y la tabla no cabía a 1440). Ejemplos: Recibos de caja, Facturas de
  proveedor.

### 13.2 Portales (inquilino, propietario, independiente)

Se ven como el panel, no como otro producto (Nico, 12-10): mismo contenedor a todo el ancho, mismo título `h1
text-h2` con la acción a la derecha, listas que crecen en tabla con `TablePagination` paginada en el back (tope 50),
tarjetas bajo 768 y cada fila abre un `Cajon` con fotos en `VisorDeFotos`. Ejemplo: `components/landlord/portal/
HistorialDeReparaciones.tsx`.

### 13.3 Marketplace y páginas públicas en React

- **Lo que invita a actuar nunca se esconde por falta de datos.** Sin catálogo se retiran fotos y cifras; el texto y
  los botones quedan («Tu inmueble aquí» fija).
- **Columnas parejas**, sin huecos. **«Ver más» abre un cajón**, no empuja la página.
- **Vivo, sin inventar:** movimiento y fotos propias sí; nombres, precios o «X está publicando» inventados, nunca. Una
  cifra real del back sí.
- La ficha del inmueble sigue el plano de Redfin/Zillow; la inmobiliaria se ve sin buscarla. El perfil de la
  inmobiliaria (`/i/<id>`) reemplaza su página web.
- SEO, metadatos, inglés y datos estructurados: skill `seo-experto` (también aquí, siempre).

### 13.4 Landing estática

- `/es` y `/en` = `public/landing/index.html` (HTML sin React); internas en `public/internas/{productos,para}`. Las
  páginas que se sirven están ARMADAS en `public/paginas/<idioma>/` por `scripts/landing/armar-paginas.mjs`: **se editan
  las fuentes y se vuelve a correr el script** (la prueba `paginas-armadas.test.ts` falla si quedaron viejas).
- Tokens: las variables CSS de la landing (`--bg`, `--arena`, `--piedra`, `--tinta`, `--grafito`, `--ceniza`,
  `--voltaje`, `--medianoche`, `--f`, `--m`, `--sombra-susurro`…), las mismas de Cadence 2.
- Imágenes = el producto real (§9.3). Sin auras, glow, texturas borrosas ni vidrio. Nada que «se sienta como IA».
- Contacto `hola@leasefy.co` (nunca .com). Sin WhatsApp público hasta que Nico dé el número. Nada inventado (cifras,
  reseñas, premios, redes).

### 13.5 Admin de Leasefy

Cadence como el panel (desde el 19-10; ya no `card`/`btn`/`pill` de `admin.css`). **Toda lista en `DataTable`**
(`src/components/admin/screen/DataTable.tsx`): buscador, pestañas con conteo, filtros en la URL, orden, Excel, filas
por página, «N de M» y tarjetas bajo 768. El detalle en un cajón (`CajonDelDetalle`).

### 13.6 El chat de Ori y los agentes

- **Todo pasa dentro del chat:** un botón, tarjeta o enlace del chat es un mensaje de la persona en el hilo y el chat
  responde o ejecuta ahí. Nunca `Link`, `router.push` ni `href` interno en `components/beta/**`.
- **Ningún agente trae su propio chat** ni pestaña de preguntas: entra al chat de Ori como especialista (su orbe en
  `src/lib/agentes/equipo.ts`).
- Cada bloque (tabla, métrica, aviso, entidad) va en UNA caja de Cadence del chat con cabecera, contenido y pie; «Ver
  más» en el pie dice cuántas faltan; sin scroll anidado; los datos de una entidad viven dentro de su tarjeta y no se
  repiten en cada respuesta.
- La respuesta crece bajo la pregunta; el chat no salta al final; «Ver el resto ↓» mientras quede contenido abajo.
- Nombres: **Ori** orquesta; **Mori** es la cobranza en la plataforma (se presenta como «Laura» sólo ante el
  inquilino); Fixi, Niti, Cuenti… El chat y el piloto automático son cosas distintas.

### 13.7 App nativa (Expo, repo `app-expo`)

- **El front del glow up (Cadence 2) en TODA pantalla, pero como app:** barra de pestañas, pilas nativas, hojas del
  sistema. Nunca una copia responsive de la web (Nico, 26-10).
- **Nada de la landing:** la app arranca en entrar / crear cuenta, y ese comienzo va nativo (Nico, 25-10).
- **Tokens:** `src/tema/tokens.ts` (`COLORES`, `LETRA`, `ESPACIO`) y `useTema()`. Nunca `fontWeight`.
- **Piezas comunes** (`src/components/ui/*`): `Tarjeta`, `Boton`, `Campo`, `Pastilla`, `AvisoEnLinea`, `FilaDeCifras`,
  `VacioDeSeccion` (con ilustración), `CampoDeMedianoche`, `RejillaDeModulos`, `Interruptor`, `Actualizar`,
  `EntradaDeTexto`, `ModalDeLaApp`, `TituloDeLaRaiz`; `OrbeDeOri` en `components/chat`. Nunca `Switch`,
  `RefreshControl`, `TextInput` ni `Modal` crudos.
- **Nunca `Alert.alert`** (ni ActionSheet ni diálogos del sistema): `avisar(titulo, mensaje, botones)` de
  `@/lib/dialogo`; toda hoja que iOS presente encima lleva `<AnclaDeDialogos />`; tres opciones o más, como lista.
- **Íconos** de la familia de Leasefy también en la barra nativa (PNG de plantilla, `renderingMode="template"`).
- **Navegación de app:** la barra de pestañas sólo en la raíz de cada pestaña (`src/lib/navegacion/
  raiz-de-la-pestana.ts`); en las internas, volver arriba. Las listas de secciones van en `RejillaDeModulos` (2 por
  fila, ícono grande u orbe). Ninguna navegación se apila dos veces (`empujarUnaVez`).
- **Ori siempre a la vista y a un toque** (accesorio de la barra; no en pantallas con su propio campo de escribir).
- La selección en voltaje suave, nunca en tinta. Sin franjas vacías arriba ni abajo.
- Se prueba en iPhone chico, iPad, iPhone plegable (riel a la derecha) y Android, escribiendo en cada formulario.

### 13.8 Navegación en el celular (web del panel)

Como app nativa: barra de abajo **Inicio · Agentes · Operación · Dinero · Menú**; cada sección abre una hoja con sus
páginas; «Menú», a la derecha, abre el menú completo. Sin ☰ arriba que haga lo mismo. La barra se arma por secciones
(`agruparPorSeccion` en `MobileNavBar.tsx`).

### 13.9 Correos, PDF y Excel

Misma voz (§14) y mismos formatos de plata y fecha. En PDF con jsPDF (Helvetica) el «−» tipográfico sale como basura:
pasar el texto por `textoParaElPdf` y la plata por `pesosEnPdf` (espacio normal). Documentos con centavos sólo con la
llave del área (`formatCurrencyEnDocumento`).

### 13.10 Imágenes de marca

Ver §9.3 y el manual de marca. Cada imagen es una aplicación distinta (escenario, luz, ángulo); es un manual, no un
pitch deck; poco texto.

---

## 14. Voz y tono

Escribimos como una persona que sabe de inmobiliarias y respeta el tiempo del otro. La misma voz en todo lado; el tono
cambia con el momento. Fuente completa: front `docs/VOZ-Y-TONO.md`.

**Cuatro principios:** **claro** (qué pasa y qué hacer, una idea por frase, la acción primero) · **cercano** (de tú, en
español de Colombia, sin jerga ni anglicismos) · **preciso** (con la cifra, el nombre y la fecha exactos; nada de
«algunos» o «pronto») · **sereno** (lo grave se dice claro, no a gritos; sin culpas).

| Dónde | Sí | No |
|---|---|---|
| Botón | «Registrar el pago» · «Eliminar 3 borradores» · «Proponer el traslado de $ 1.007.135» | «Aceptar», «Enviar», «Continuar» a secas |
| Título de modal | «¿Aprobar la liquidación de octubre?» | «Confirmación» |
| Error de un campo | «Le falta un número: el NIT tiene 9, más el de verificación.» | «Campo inválido» |
| Error nuestro (5xx) | «Algo falló de nuestro lado. Referencia LSF-7Q2K.» | «Error 500. Revisa tu conexión.» |
| Sin respuesta | «No hay conexión con Leasefy. Lo que llevabas quedó guardado.» | «¡Ups! Algo salió mal» |
| Vacío | «Cuando un inquilino reporte un daño, Fixi lo abre aquí con fotos.» | «No hay datos» |
| Éxito | «Listo: salieron las 214 cartas.» | «¡Operación exitosa!» |
| Irreversible | «Se borran con sus documentos y no se pueden recuperar.» | «¿Estás seguro?» |
| Cobranza | «Tu canon de octubre sigue pendiente. ¿Te sirve pagarlo hoy o prefieres un acuerdo?» | «Evite acciones legales.» |
| Descripción de pantalla | Una línea: para qué sirve. | Dos párrafos con la ley |

**Palabras:** inmueble (no propiedad/unidad) · canon (no renta) · inquilino y propietario (arrendatario/arrendador sólo
en el contrato) · recaudo, giro, liquidación (no payout ni «dispersión» en frases) · mora, al día, paz y salvo · mandato
(con el propietario) y contrato (con el inquilino) · «vence en 9 días» (no SLA) · tablero, lista, tarjetas (no Kanban,
cards) · calificación (no score) · pasar a jurídico (no escalar, triage) · «Documento» si no se sabe el tipo (nunca
«parece un celular»). Un concepto, un solo nombre en el menú, el título y la tabla.

**Formatos:** plata `$ 2.450.000` (espacio duro, DM Mono) · negativos `− $ 770.000` · cero en tabla `—` · fecha en frase
«20 de octubre de 2026» · fecha en tabla «20 oct 2026» · distancia «en 4 meses», «vence hoy» · hora «4:00 p. m.» ·
porcentaje «72,4 %» · miles «1.893 contratos» · sólo la inicial en mayúscula · comillas «», raya —, N.º · sin punto en
botones ni títulos · todo en COP, nunca dólares · nunca un id interno, UUID o slug a la vista.

**Los agentes:** Ori habla en primera persona y dice qué revisó; lo que decide la persona se deja a la persona (el
agente propone, no da por hecho); nunca «✨ IA».

**Plantillas:** Vacío — «Todavía no hay {cosas}.» / «Cuando {quién} {haga qué}, aparece aquí.» / {Acción} · Éxito —
«Listo: {qué pasó, con la cifra}.» · Confirmar — «¿{Acción} {qué}?» / {qué pasa y si se puede reversar} / «{Acción}
{qué}» · Destructivo — «¿Eliminar {N cosas}?» / {qué se pierde}. No se puede deshacer. · Error nuestro — «No pudimos
{acción}.» / Algo falló de nuestro lado. Referencia {código}. / «Reintentar» · Pendiente — «Para {tarea} te faltan {N}
pasos» / {el que sigue, con su porqué}.

---

## 15. Responsive y accesibilidad

- 390 · 768 · 1024 · 1440, claro y oscuro, sin barra de lado, sin textos cortados, cifras que caben enteras
  (`fila="xl"` en `FranjaDeCifras` cuando son montos largos).
- Contraste AA medido (los grises de §3 ya pasan sobre papel y arena). Toque mínimo 44 px en controles sueltos
  (guardián `tap-targets`).
- Foco visible (anillo de voltaje), teclado completo, Esc cierra cajón y modal, el foco vuelve al botón que abrió.
- `aria-invalid` pinta el borde del campo; estados por palabra, no sólo por color.
- `prefers-reduced-motion` respetado (§10). Paneles nuevos pasan `panel-a11y` (Playwright + axe).
- Textos con `tr()`; la parte pública en ES y EN.

---

## 16. Lo que nunca

- Brillos, auras, resplandores, estrellitas, cruces decorativas, «✨ IA», degradados decorativos de color (§3.1).
- Emojis como marcadores o adorno en la interfaz.
- Íconos dentro de círculos o cuadros de colores; íconos de Lucide, SF Symbols o Material.
- Tarjeta con borde dentro de tarjeta con borde; cajas grises dentro de tarjetas.
- Colores de chispa en botones, textos, bordes o estados; paleta cruda de Tailwind; hex sueltos en clases.
- Más de una acción azul por pantalla; más de un campo de medianoche.
- Botones en pastilla dura o rectángulo duro; flechas decorativas en botones; botones en MAYÚSCULA.
- `font-bold`; negrilla para hacer jerarquía; MAYÚSCULAS en Host Grotesk; la clase `capitalize`.
- Un 0 en un contador; una franja de cifras en cero; el mismo número dicho dos veces.
- Selects sueltos flotando fuera de la tabla; quitar paginación, filtros o buscador.
- Diálogos del navegador; `Alert.alert` en la app; `<input type="date">`.
- Texto en inglés, ids internos o códigos a la vista; datos inventados; «¡Ups!».
- Un vacío sin ilustración; un estado sin salida; un botón que no hace nada.
- Contenedores centrados angostos en el panel o los portales.
- Imágenes del producto dibujadas a mano; el logo deformado o pegado plano sobre un objeto.
- Cambiar reglas de negocio o lo que hace el back en un rediseño: el diseño es front («NO ME CREES BUGS»).
- Rondas de propuestas visuales para elegir (Nico, 21-10): se decide con esta identidad, se construye y se muestra.

---

## 17. La vara: cómo se mide

**Mínimo 9,5 de 10 en cada pantalla y en cada caso de uso de cada sección** (Nico, 21-10). El puntaje no es a ojo:
cada punto lleva evidencia (captura a 390 y 1440, una prueba o la línea de código). Puntaje del principio = 10 ×
cumplidos / aplicables; el de la pantalla, el promedio. **9,5 = a lo sumo un punto fallado y ningún bloqueante.**

**Bloqueantes** (con uno solo la pantalla no pasa de 7): un botón que no hace nada · un estado sin salida · algo que
se corre de lado a 390 · un código, id, slug o inglés a la vista · un dato inventado.

| # | Principio de Nielsen | La pantalla cumple si… |
|---|---|---|
| 1a | Estado | mientras carga hay un esqueleto con la forma de lo que llega |
| 1b | Estado | toda acción que tarda dice que está en curso y no se dispara dos veces |
| 1c | Estado | al terminar, un aviso dice QUÉ pasó (con «Deshacer» si se puede) y ofrece lo siguiente |
| 1d | Estado | el estado de cada registro se lee en palabras, no sólo por color |
| 2a | Mundo real | palabras de la inmobiliaria; plata en COP, cifras en mono, fechas en español |
| 3a | Control | toda sub-pantalla tiene la vuelta arriba (`BackButton`), también en carga, vacío y fallo |
| 3b | Control | cajón y modal cierran con Esc y ✕; un formulario a medias no se pierde sin avisar |
| 3c | Control | lo destructivo pide confirmar o se puede deshacer |
| 4a | Consistencia | `EncabezadoDePantalla` + contenedor `p-6 lg:p-8`; UNA acción principal, arriba a la derecha |
| 4b | Consistencia | tabla con su barra adentro, filtros a la vista y tarjetas bajo 768 px |
| 4c | Consistencia | piezas de Cadence (Avatar, EmptyState, FalloDeCarga, Badge…), nada armado a mano |
| 5a | Prevenir | se valida en el campo antes de enviar, con los topes del back |
| 5b | Prevenir | un botón apagado dice qué falta; lo que no se puede no se ofrece |
| 6a | Reconocer | lo pendiente primero: orden, pestaña o filtro por defecto |
| 6b | Reconocer | el dato para decidir está en la misma pantalla; filtros y pestaña en la URL |
| 7a | Flexibilidad | acciones masivas donde se hace lo mismo a muchos; buscar y exportar donde hay listas |
| 8a | Minimalismo | cada bloque se gana su lugar; lo de consulta, plegado; nada se dice dos veces |
| 8b | Minimalismo | a 390 lo importante cabe en la primera pantalla |
| 9a | Errores | un fallo de lectura usa `FalloDeCarga` (qué pasó, reintentar, salida) |
| 9b | Errores | un error de acción va bajo su campo, en palabras, con qué hacer |
| 9c | Errores | un vacío dice por qué está vacío y qué hacer, con la acción |
| 10a | Ayuda | una línea dice para qué es la pantalla; «¿Cómo funciona?» donde la tarea es nueva |

**El flujo completo, en cinco puntos** (cada caso de uso, a 390 y 1440): 1) al entrar, ¿se entiende en 5 segundos para
qué es y qué toca primero? 2) ¿la acción principal está arriba a la derecha y es la única azul? 3) ¿cada paso dice qué
falta y por qué? 4) al terminar, ¿se confirma el resultado y se ofrece lo siguiente? 5) al volver mañana, ¿lo pendiente
está primero?

**Leyes que se revisan siempre:** Hick (una principal, pocas secundarias, el resto en «Más») · Fitts · Jakob (como las
herramientas que ya usan) · Miller (grupos de 5–7) · Tesler · proximidad y región común · Doherty (< 400 ms o
esqueleto) · Von Restorff (sólo UNA cosa destaca).

La revisión dura y su formato están en `referencias/revision.md` de la skill `diseno-leasefy`.

---

## 18. Estado actual y deuda (medido el 28-10-2026)

Medido con el auditor de la skill `diseno-leasefy` (`scripts/auditar-diseno.mjs --resumen`; sin pruebas ni historias,
comentarios descontados).

**Front `marketplace-facil`, `src/` (5.632 archivos): 638 errores y 1.051 avisos.**

| Regla | Nivel | Usos | Archivos | Dónde se concentra |
|---|---|---|---|---|
| `font-semibold` | aviso | 417 | 204 | panel, piloto, extracto bancario, planes |
| Hex en clases (`bg-[#…]`) | ERROR | 339 | 43 | `app/para/*` (inmobiliarias, agentes, propietarios, inquilinos), `landing-v2/para/piezas.tsx`, `app/brand` |
| `text-xs` (12 px) | aviso | 234 | 103 | congelado por el guardián `doce-pixeles` |
| Peso 600+ en CSS | ERROR | 171 | 3 | `app/(landing)/landing.css` y `landing-v2.css` (la landing React anterior) |
| `uppercase` sin mono | aviso | 167 | 83 | |
| Degradado neutro (revisar si es funcional) | aviso | 129 | 43 | |
| `font-bold` | ERROR | 52 | 28 | |
| Palabras que no se dicen (score, SLA, renta…) | aviso | 37 | 25 | |
| `capitalize` | ERROR | 26 | 18 | |
| Emojis en la interfaz | ERROR | 24 | 9 | |
| `shadow-lg/xl/2xl` | aviso | 24 | 22 | |
| Contenedor angosto en panel o portal | aviso | 20 | 13 | |
| Degradado de color | ERROR | 13 | 9 | `home/CTASection`, `contract/InsuranceSelector`, `intro-de-flujo/IntroHeroe` |
| Calendario del navegador (`type="date"`) | ERROR | 11 | 7 | `app/admin/(panel)/{gestiones,aliados,recaudo-en-linea}` |
| `lucide-react` | ERROR | 1 | 1 | |

**App nativa `app-expo/src` (1.974 archivos): 4 errores y 15 avisos** (7 `TextInput` crudos en las pantallas de
entrada, 2 emojis, 1 `fontWeight`, 1 hex). **Landing estática: 0 errores** (los degradados que quedan son el portátil,
velos y desvanecidos).

Bien: los grises crudos de Tailwind están en cero; las pantallas del glow up (`EncabezadoDePantalla`, `Button`…)
salen limpias; la app (`src/tema/tokens.ts`) y la landing usan los mismos tokens de Cadence 2; la letra (Host Grotesk +
DM Mono) es la misma en web, app y landing. La deuda está en pantallas viejas que no pasaron por el glow up.

**Cómo se paga la deuda:** el archivo que tocas sale limpio (lo que reporte el auditor en ese archivo, se arregla en
el mismo cambio, sin tocar el flujo ni las reglas de negocio). Barridos masivos, sólo si Nico los
pide.

---

## 19. Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Tokens (fuente de verdad) | Cadence `src/styles/tokens.css`, `tailwind.preset.ts` (escala de letra, radios, movimiento) |
| Identidad resumida | Cadence `docs/IDENTIDAD.md` · página viva https://claude.ai/artifact/E1o95TDQhSza4djDLQk5jn · 3D https://claude.ai/artifact/EeXwemUcVQurCt1sXJ7zkr |
| Piezas | Cadence `src/components/ui/*` (329 archivos), `src/icons`, `src/motion` |
| Front | `src/app/globals.css` (variables y la regla de la superelipse), `tailwind.config.ts`, `src/components/{ui,pantalla,estado}`, `docs/VOZ-Y-TONO.md` |
| Guardianes de diseño (pruebas) | front `src/components/ui/*.guardian.test.ts`, `pantallas-en-tokens.test.ts`, `sin-dialogos-del-navegador.test.ts`, `una-sola-aspa.test.tsx`, `components/doce-pixeles.guardian.test.ts` |
| App nativa | `app-expo/src/tema/tokens.ts`, `src/components/ui/*`, `src/lib/dialogo.ts` |
| Landing | `public/landing/index.html` (variables CSS), `public/internas/`, `scripts/landing/armar-paginas.mjs` |
| Detalle de cada pieza (numeración anterior, la que citan los comentarios del código) | front `docs/DESIGN-PIEZAS.md` |
| Este archivo | skill `diseno-leasefy/DESIGN.md` y front `docs/DESIGN.md`: el mismo texto, se cambian juntos |
| Manual de marca | https://claude.ai/artifact/KmyeY1Fqv5qVwAfQmxBX3R |
| Antes de cada commit (máquina de Nico) | `~/.claude/projects/-Users-nicolasgarcia-rent/memory/archivos/autonomo/revisar-perdidas.sh <repo> <archivos>` |

---

## 20. Cómo pedirle diseño a otro agente o a otra IA

Copia este bloque en el encargo (agente, Codex, generador de imágenes) y agrégale el trabajo concreto:

> Diseña en la identidad de Leasefy, Cadence 2 «papel, tinta y voltaje»: fondo papel #FBFAF8, superficies blancas,
> arena #F3F1ED para lo secundario, líneas piedra #E7E3DC, texto tinta #121110 / grafito #5B5751 / ceniza #706B64. UNA
> sola chispa de color: voltaje #1A40FF, sólo para la acción principal, el foco y lo activo. Medianoche #0A0F2C para un
> único momento de marca. Letra Host Grotesk con títulos livianos (400–500, sin negrilla) y DM Mono para cifras y rótulos
> cortos en mayúscula. Esquinas suavizadas (superelipse), sombras casi invisibles, sin tarjetas dentro de tarjetas.
> Íconos de trazo fino 1,5 redondeados, sin cajitas de color. Ilustraciones 3D mate en azul eléctrico o grafito. Nada de
> degradados morados, brillos, estrellitas, emojis ni «IA». Textos en español de Colombia, de tú, con la cifra exacta;
> los botones dicen lo que hacen. Una pantalla se arma por la tarea: encabezado con UNA acción azul, lo que falta, los
> pasos, la tabla con su barra adentro, lo de consulta plegado. Con su animación suave y su versión de celular.

Si el trabajo es código, el agente carga la skill `diseno-leasefy` y lee este archivo; no le basta el bloque.
