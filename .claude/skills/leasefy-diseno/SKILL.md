---
name: leasefy-diseno
description: diseño UI UX pantalla nueva rediseño glow up botón tarjeta tabla cajón modal aviso avatar ícono ilustración 3D formulario estado vacío marca identidad Cadence 2 papel tinta voltaje Host Grotesk DM Mono superelipse esquina Mollie EsferaDeGrano FotoEnEstrias CampoDeMedianoche orbe Nielsen pantallas por tarea — usar SIEMPRE antes de crear o cambiar cualquier pantalla o componente visual
license: MIT
metadata:
  author: leasefy-front
  version: 3.0.0
---

# leasefy-diseno — la identidad de Leasefy y cómo se construye una pantalla

Cadence 2 «Papel, tinta y voltaje» (Nico, 20-10-2026: «quiero nuestra propia marca, que no se sienta que es IA»).
Fuente de verdad visual: `@leasefy/cadence` (repo `cadence`, `docs/IDENTIDAD.md`). Patrón de pantalla:
`docs/DESIGN.md` §23 «Pantallas por tarea». Esta skill resume lo que hay que cumplir; si algo no está acá, mirar esos dos.

## Activation Contract
Cualquier tarea que cree o cambie algo que se ve: pantallas, componentes, correos, PDFs, la landing, los portales.
También cuando alguien pide «hazlo más bonito», «glow up», «rediseña», «mejora la UX».

## Hard Rules — siempre
1. **Construir con Cadence.** Botón, Badge/StatusBadge, Input/Select, Tabs/SegmentedControl, Table, Card, FranjaDeCifras (varias cifras) / KpiCard (una),
   EmptyState, Dialog/Cajón salen de `@/components/ui/*` (adaptadores) o de `@leasefy/cadence`. Nada de estilos
   inventados en la pantalla: si falta una pieza, se agrega a Cadence o a `src/components/pantalla/`.
2. **La esquina suavizada** (la de Mollie): todo lo redondeado lleva `corner-shape: superellipse(1.5)`. Ya lo pone la
   regla global de `globals.css` para cualquier `rounded-*` que no sea `rounded-full`. Los botones van con radio completo
   + superelipse (lo trae el `Button`). Círculos (avatares, orbes, puntos) siguen `rounded-full`.
3. **Color**: papel (`bg-bg`) de fondo, superficie blanca para tarjetas, arena (`bg-surface-muted`) para lo secundario,
   piedra para las líneas. **El voltaje (#1A40FF, `primary`) es la ÚNICA chispa de la interfaz**: la acción principal,
   el foco, un enlace, el paso actual, la fila activa del menú. La medianoche (`ink`) es para UN momento de marca por
   pantalla (Ori, plan, onboarding, entrada). Las chispas (lila, ámbar, cielo, rosa, menta) SÓLO en ilustración.
4. **Letra**: Host Grotesk para leer; títulos livianos (`h1 text-h2` = 26–32 px, peso 420), nunca negrilla para
   jerarquía. **DM Mono (`font-mono`) para cifras, etiquetas y textos cortos en MAYÚSCULA** (sobretítulos, cabeceras de
   tabla, estados). Plata siempre en `font-mono` (tabular). Contenido nunca por debajo de 13 px.
5. **Botones**: UNO primario (voltaje) por pantalla o bloque —el que más se hace ahí—; lo demás `secondary`/`outline`
   (arena), `ghost` o `link`. `ink` para lo fuerte que no es la marca (aprobar y girar). Sin flechas decorativas. El
   texto dice lo que pasa («Seguir a condiciones», «Proponer el traslado de $ X»), nunca «Continuar» a secas.
6. **Estados**: `StatusBadge` (punto + palabra en mono mayúscula) o `Badge` rectangular suave. El estado se lee por el
   punto y la palabra, no por un bloque de color.
7. **Ilustración**: el monograma en estrías (`BrandMotif`, `FotoEnEstrias`), `EsferaDeGrano` (quieta) y la orbe viva
   `AgentOrb` Nebulosa (no cambiarle el look: Nico la eligió tal cual; ya trae grano). Cada estado vacío lleva su
   ilustración, qué va a aparecer, quién lo trae y su botón para empezar.
8. **Cifras sin definición no se publican**: la definición puede ir plegada («Qué mide cada cifra», `TarjetaDeCifras`).

## Hard Rules — nunca
- Brillos, degradados morados, emojis como marcadores, íconos dentro de círculos de colores, «✨ IA».
- Tarjetas con borde dentro de tarjetas con borde: separar con aire o con una línea fina.
- Botones en pastilla redonda dura o en rectángulo duro; `rounded-xl` pensando que son 12 px (son 32).
- Cambiar reglas de negocio o lo que hace el back en un rediseño: es front («NO ME CREES BUGS»).
- `var(--primary)` o `var(--border)` sueltos en una sombra o un `style`: en el front son canales HSL; usar `ring-*`,
  `bg-primary`, `border-border` o los hex del puente (`--bg`, `--border-faint`…).

## Decision Gates — cómo se arma una pantalla (§23, las cinco capas)
1. **Encabezado** (`EncabezadoDePantalla`): sección en mono · título · UNA línea de para qué sirve | ayuda · secundarias
   · principal (todo `size="sm"`).
2. **Lo que falta para empezar** (`ListaParaEmpezar`): sólo si la tarea tiene requisitos; dice cuántos faltan y cuál sigue.
3. **La tarea en pasos** (`PasosDeLaTarea`) cuando hay un orden: el paso actual abierto, lo hecho en una línea, lo que
   falta con su porqué.
4. **El trabajo**: la tabla o el formulario; el detalle en un cajón, no en otra pantalla.
5. **Lo demás**: explicaciones, historial, opciones avanzadas → `MasDetalles`, cajón o vista propia.

## Execution Steps
1. Antes de tocar: captura «antes» y puntaje Nielsen (10 heurísticas, 0–10) de la pantalla.
2. Escribir la tarea de la persona (qué vino a hacer, primero qué, después qué, cuándo terminó).
3. Construir con las piezas de arriba; textos en español con `tr()` y su inglés en `lib/i18n/frases-en-del-glow-up.ts`.
4. Pruebas de la carpeta + tsc acotado; `revisar-perdidas.sh` antes del commit; data-testid vivos.
5. Captura «después» (escritorio 1440 y celular 390, claro y oscuro), puntaje Nielsen, y mostrarle a Nico ANTES de subir.

## Output Contract
Pantalla que se entiende sin explicar: qué se hace primero se ve primero, una sola acción azul, cifras en mono que caben
enteras, la esquina suavizada en todo, ninguna regla de negocio cambiada, pruebas verdes y capturas antes/después.

## References
- `cadence/docs/IDENTIDAD.md` — la identidad completa (tokens, piezas, motivos, ejemplos).
- `docs/DESIGN.md` §23 — Pantallas por tarea. · `src/components/pantalla/*` — piezas del patrón.
- Página de revisión con 9 pantallas y 252 piezas gráficas con código: https://claude.ai/artifact/E1o95TDQhSza4djDLQk5jn


## Cadence 2 completo (21-10-2026) — lo que llegó con la identidad v3/v4 y el 3D
- **Íconos propios en TODA la plataforma**: se importan como siempre de `@phosphor-icons/react`; el alias de
  `next.config.mjs`/`vitest.config.ts` los dibuja con la familia de Leasefy (trazo 1,5). Un ícono que no esté en el mapa
  sale de Phosphor: pedir/dibujar el nuestro en Cadence (`scripts/iconos/familia.py`, `npm run iconos`). Nunca Lucide.
- **Ilustraciones 3D** (`<Ilustracion nombre tono>`, `public/ilustraciones/`): vacíos grandes, éxitos, bienvenida. Grafito o
  voltaje; una por pantalla.
- **Tabla con su barra ADENTRO** (`<Table toolbar={<TableToolbar>…} footer={<TableFooter>…}>`): buscar, vista, filtros y
  densidad pertenecen a la tabla. Cifras en mono a la derecha. La fila abre el cajón.
- **Avatar de Cadence** (persona superelipse + tono del nombre; agente círculo + orbe; inmueble foto): nunca iniciales a mano.
- **Modales para decidir**, título = pregunta, `ConfirmarEscribiendo` para lo irreversible; **avisos** claros con punto y
  «Deshacer»; **botón cargando** que conserva el ancho; **contador** sólo > 0.
- Medir antes/después con §25 de DESIGN.md (skill `pantalla-por-tarea`).
