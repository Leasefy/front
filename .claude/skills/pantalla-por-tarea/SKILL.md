---
name: pantalla-por-tarea
description: Rediseñar o crear cualquier pantalla de Leasefy pensando en el TRABAJO que la persona vino a hacer (UX por tarea, flujo de principio a fin, jerarquía, distribución de información) y MEDIR la UX antes y después con los 10 principios de Nielsen y las leyes de usabilidad. Usar SIEMPRE que se toque una pantalla del panel, un portal, el marketplace o el admin, o cuando alguien diga glow up, «no se entiende», «está confuso», UX, flujo, jerarquía.
license: MIT
metadata:
  author: leasefy-front
  version: 1.0.0
---

# pantalla-por-tarea — cada pantalla se organiza por el trabajo y se mide

Nico (20 y 21-10-2026): «nuestros usuarios no están comprendiendo la UX… quiero que cada pantalla sea top mundial, que la
midas por Jakob Nielsen… que optimice siempre el flujo de trabajo del usuario desde que ingresa hasta que sigue
gestionando». Reglas: SÓLO front (nunca back ni reglas de negocio), «NO ME CREES BUGS» (pruebas y data-testid vivos).

## 1. Antes de tocar nada
1. Escribe el trabajo en una línea: «Conciliar el extracto del banco de octubre».
2. Captura «antes» (1440 y 390) y puntúa los 10 de Nielsen (0–10 c/u) con las preguntas de `docs/DESIGN.md` §25.
3. Haz la lista de lo que la pantalla muestra y clasifícalo: **para hacer** (acciones, lo pendiente), **para decidir**
   (cifras que cambian la decisión) y **para consultar** (historial, términos, fuentes).

## 2. Las cinco capas (DESIGN.md §23)
1. **Encabezado** (`EncabezadoDePantalla`): sección · título · UNA línea de para qué es | ayuda · secundarias · la acción
   principal (la única azul).
2. **Lo que falta para empezar** (`ListaParaEmpezar`): «Para X te faltan N pasos» con «Sigue»; desaparece cuando todo está listo.
3. **Los pasos de la tarea** (`PasosDeLaTarea`): el actual abierto; lo hecho resumido con «Cambiar»; lo que falta, con su porqué.
4. **El trabajo de todos los días**: la tabla con su barra adentro, los filtros que más se usan a la vista, la fila abre el cajón.
5. **Lo que se consulta**: plegado en `MasDetalles`, en la misma pantalla.
   Si la página igual queda larga (más de tres pantallas), `IndiceDeLaPagina` arriba («En esta sección»).

## 3. El flujo completo
Recorre: entrar (¿se entiende en 5 s?) → empezar (¿qué toca primero?) → cada paso (¿dice qué falta y por qué?) → terminar
(¿confirma el resultado y ofrece lo siguiente?) → volver mañana (¿lo pendiente primero?). Cuenta clics y campos del camino
más común y quita los que sobran (Tesler: la complejidad la absorbe el sistema).

## 4. Con Cadence 2
Íconos de la familia, `Ilustracion` en vacíos grandes, `Avatar` (nunca iniciales a mano), `Table toolbar/footer`, cajón para
ver/editar, modal sólo para decidir, aviso con «Deshacer», cifras en mono, títulos livianos. Ver skill `leasefy-diseno`.

## 5. Al terminar
- Captura «después» (1440 y 390, claro y oscuro) y puntúa otra vez. Guarda antes/después y los dos puntajes en la página
  de revisión del glow up (https://claude.ai/artifact/GtyaVshi1GoSciCUw1DWzo).
- Pruebas del módulo (`vitest run --testTimeout=60000 <carpetas>`), tsc acotado, `revisar-perdidas.sh`, commit local.
- Nada se sube sin el «súbelo» de Nico, después de ver las capturas.
