/**
 * Las pantallas de uso diario están escritas en TOKENS y en PRIMITIVAS.
 *
 * ── Por qué hace falta un test ─────────────────────────────────────────────
 *
 * Un `bg-white` no rompe nada: compila, pasa lint, se ve bien sobre el fondo
 * por defecto y sólo se nota el día que alguien mira dos pantallas juntas —
 * una en hueso `#FBFAF9` y la otra en blanco puro. Un `<button>` a mano
 * tampoco rompe nada: se ve *parecido* a un `Button`, hasta que no tiene el
 * pill, ni el foco cobalto, ni el `active:scale`, ni el alto táctil de 44px.
 * Por eso volvieron una y otra vez: nada los detiene.
 *
 * Este test es la compuerta. Es ESTÁTICO a propósito: montar 150 pantallas con
 * sus providers, permisos y hooks de red para comprobar el color de un borde
 * cuesta muchísimo más y falla por motivos que no son éste.
 *
 * ── Qué cubre y qué no ─────────────────────────────────────────────────────
 *
 * `COBERTURA` es la lista de archivos que la tanda del 2026-09-05 pasó a
 * tokens. No es todo el panel: es lo que un cliente ve todos los días
 * (cobros, contratos, inmuebles, propietarios, inquilinos, documentos,
 * agenda, mensajes, reportes, pagos, mantenimiento). Lo que quedó afuera está
 * anotado en el informe de esa tanda, y agregarlo acá es el trabajo de
 * cerrarlo, no de aflojar el test.
 *
 * Cada excepción va nombrada Y con su motivo. Una excepción sin nombre es la
 * puerta por la que vuelve el desorden; una excepción sin motivo es la misma
 * puerta con un cartel.
 */

import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RAIZ = join(process.cwd(), 'src')

// ============================================================================
// Detectores
// ============================================================================

/**
 * Los comentarios se sacan antes de medir: varios de estos archivos explican en
 * prosa qué color reemplazaron («`bg-emerald-100` → `bg-success-soft`»), y esa
 * documentación no es una violación. Medir el código, no lo que dice de sí.
 */
export function sinComentarios(fuente: string): string {
  return fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * La paleta cruda de Tailwind — la que NO pasa por el preset de Cadence.
 *
 * `neutral-*` NO está en la lista a propósito: en este repo es la escala
 * CÁLIDA del preset (sandy taupe, con contraparte oscura), y está permitida.
 * `blue-*` sí está: el preset define `blue-50…700` para gráficos, pero
 * `COLOR_SYSTEM.md` lo prohíbe explícitamente como acento de UI — el acento es
 * cobalto `primary`, y hay uno solo.
 */
const PALETA_CRUDA =
  'white|black|gray|slate|zinc|stone|emerald|indigo|violet|purple|rose|red|amber|yellow|orange|sky|cyan|blue|green|teal|lime|fuchsia|pink'

export const COLOR_CRUDO = new RegExp(
  `\\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|placeholder|decoration|outline|shadow|accent|caret)-(?:${PALETA_CRUDA})(?:-\\d{2,3})?\\b`,
  'g',
)

/** Controles a mano: los que se saltean el adapter de `@/components/ui`. */
export const CONTROL_A_MANO = /<(?:button|input|select|textarea)[\s>]/g

export function coloresCrudos(fuente: string): string[] {
  return sinComentarios(fuente).match(COLOR_CRUDO) ?? []
}

export function controlesAMano(fuente: string): string[] {
  return sinComentarios(fuente).match(CONTROL_A_MANO) ?? []
}

// ============================================================================
// Cobertura
// ============================================================================

/** Rutas relativas a `src/`. Ver el encabezado para el criterio. */
const COBERTURA: string[] = [
  // — contratos ————————————————————————————————————————————————
  'app/panel/inmobiliaria/contratos/(retencion)/layout.tsx',
  'app/panel/inmobiliaria/contratos/(retencion)/retencion/page.tsx',
  'app/panel/inmobiliaria/contratos/(retencion)/riesgo/BandejaClient.tsx',
  'app/panel/inmobiliaria/contratos/(retencion)/riesgo/[caseId]/CasoSidebar.tsx',
  'app/panel/inmobiliaria/contratos/(retencion)/riesgo/[caseId]/CasoDetailClient.tsx',
  'app/panel/inmobiliaria/contratos/(retencion)/aprobar/RevisionesClient.tsx',
  'app/panel/inmobiliaria/contratos/[id]/page.tsx',
  'app/panel/inmobiliaria/contratos/[id]/editar/page.tsx',
  'app/panel/inmobiliaria/contratos/[id]/firmar/page.tsx',
  'app/panel/inmobiliaria/contratos/nuevo/page.tsx',
  // — inmuebles / consignación —————————————————————————————————
  'components/inmobiliaria/ConsignacionCard.tsx',
  'components/inmobiliaria/ConsignacionDetailSections.tsx',
  'components/inmobiliaria/ConsignacionEditForm.tsx',
  'components/inmobiliaria/ConsignacionHeader.tsx',
  'components/inmobiliaria/ConsignacionTable.tsx',
  'components/inmobiliaria/ConsignacionTimeline.tsx',
  'components/inmobiliaria/ConsignacionWizardSteps.tsx',
  'components/inmobiliaria/FotosDelInmueble.tsx',
  'components/inmobiliaria/InmuebleSinMandatoCard.tsx',
  'components/inmobiliaria/inmueble/SubidaDeFotos.tsx',
  'components/inmobiliaria/inmueble/VisorDeFotos.tsx',
  // — mensajes ————————————————————————————————————————————————
  'components/messages/MessagesWidget.tsx',
  'components/messages/NuevoMensajeDrawer.tsx',
  'components/messages/PendientesDelHiloPopover.tsx',
  'components/messages/PlantillasDeMensajePopover.tsx',
  'components/messages/SelectorDeEmojis.tsx',
  // — reportes / exportación ——————————————————————————————————
  'components/inmobiliaria/ExportButton.tsx',
  // — mantenimiento ————————————————————————————————————————————
  'components/inmobiliaria/mantenimiento/TicketCard.tsx',
  'components/inmobiliaria/mantenimiento/InboxFilters.tsx',
  'components/inmobiliaria/mantenimiento/InboxList.tsx',
  'components/inmobiliaria/mantenimiento/ImagenesPanel.tsx',
  'components/inmobiliaria/mantenimiento/MantenimientoKpiStrip.tsx',
  'components/inmobiliaria/mantenimiento/ProveedorPanel.tsx',
  'components/inmobiliaria/mantenimiento/AprobacionPanel.tsx',
  'components/inmobiliaria/mantenimiento/ClasificacionPanel.tsx',
  'components/inmobiliaria/mantenimiento/QueEntendiPanel.tsx',
  'components/inmobiliaria/MantenimientoForm.tsx',
  'components/inmobiliaria/MantenimientoViewer.tsx',
  // — pagos / acta / comisiones ————————————————————————————————
  'components/inmobiliaria/pagos/PagosHomeMetricsStrip.tsx',
  'components/inmobiliaria/pagos/PagosHomeAttentionList.tsx',
  'components/inmobiliaria/ActaEntregaSteps.tsx',
  'components/inmobiliaria/ActaEntregaView.tsx',
  'components/inmobiliaria/ActaEntregaViewer.tsx',
  'components/inmobiliaria/ActaEntregaForm.tsx',
  'components/inmobiliaria/ComisionesTable.tsx',
  'components/inmobiliaria/ComisionDesglose.tsx',
  'components/inmobiliaria/VencimientosTable.tsx',
  'components/inmobiliaria/DispersionCard.tsx',
  'components/inmobiliaria/CobroTable.tsx',
  'components/inmobiliaria/ElegirCobroParaRecibo.tsx',
  'app/panel/inmobiliaria/inmuebles/[id]/acta/page.tsx',
  // — cobranza (tablas que dejaron de ser <table> a mano) ————————
  'components/inmobiliaria/cobranza/CobranzaDeudoresQuePesan.tsx',
  'components/inmobiliaria/cobranza/TopObjectionsTable.tsx',
  'components/inmobiliaria/cobranza/TopScriptsTable.tsx',
  'components/inmobiliaria/ComparadorCandidatos.tsx',
  // — contratos (componentes) ——————————————————————————————————
  'components/contratos/CobrosDelContrato.tsx',
  'components/contratos/VincularInmueble.tsx',
  'components/contract/CancelContractModal.tsx',
  // — listados diarios ————————————————————————————————————————
  'components/inmobiliaria/InquilinosTable.tsx',
  'components/inmobiliaria/InquilinoDrawer.tsx',
  'components/inmobiliaria/PropietarioTable.tsx',
  'components/inmobiliaria/PropietarioForm.tsx',
  'components/inmobiliaria/PropietarioBankInfo.tsx',
  'components/inmobiliaria/SelectorDePropietarios.tsx',
  'components/inmobiliaria/RenovacionesTable.tsx',
  'components/inmobiliaria/AgenteTable.tsx',
  'components/inmobiliaria/CandidateDrawer.tsx',
  'components/inmobiliaria/VisitasDelInmueble.tsx',
  'components/inmobiliaria/ReporteCard.tsx',
  'app/panel/inmobiliaria/agenda/page.tsx',
  'app/panel/inmobiliaria/documentos/page.tsx',
  'app/panel/inmobiliaria/reportes/resumen/page.tsx',
  // — cobros / cobranza ————————————————————————————————————————
  'app/panel/inmobiliaria/cobros/page.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/DeudoresListClient.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/DebtorActionRail.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/DebtorSidebar.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/AccionesTab.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/MemosTab.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/CompromisosTab.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/LlamadasTab.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/TimelineTab.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/llamadas/page.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/escalaciones/page.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/reportes-propietarios/page.tsx',
  'app/panel/inmobiliaria/cobros/cobranza/configuracion/page.tsx',
  'components/inmobiliaria/cobranza/AcuerdosGeneralesTabla.tsx',
  'components/inmobiliaria/cobranza/AcuerdosTabla.tsx',
  'components/inmobiliaria/cobranza/CobranzaNextActionsPanel.tsx',
  'components/inmobiliaria/cobranza/CobranzaStageCard.tsx',
  'components/inmobiliaria/cobranza/DisputasList.tsx',
  'components/inmobiliaria/cobranza/EscalationCard.tsx',
  'components/inmobiliaria/cobranza/PromesaCard.tsx',
  'components/inmobiliaria/cobranza/EscalationAssignDropdown.tsx',
  'components/inmobiliaria/cobranza/HeatmapGrid24x7.tsx',
  'components/inmobiliaria/cobranza/DebtorPicker.tsx',
  'components/inmobiliaria/cobranza/CobranzaImportCard.tsx',
  // — estados vacíos (el canónico y su adaptador) ————————————————
  'components/ui/empty-state.tsx',
  'components/data-display/EmptyState.tsx',
]

// ============================================================================
// Excepciones — una por una, con su motivo
// ============================================================================

/**
 * Archivos de `COBERTURA` a los que se les permite conservar color crudo.
 *
 * El patrón que se repite: **chrome encima de una fotografía o de un fondo
 * negro fijo**. Ahí el fondo no cambia con el tema, así que `text-fg` —que en
 * claro es tinta— dejaría el texto negro sobre negro. `bg-fg/60` sería aún
 * peor: en oscuro `--fg` es casi blanco.
 *
 * El otro patrón: **tinta sobre un relleno de feedback**. `danger-fg` y
 * `success-fg` son ALIAS del mismo rojo y del mismo verde (medido en el
 * preset), no un color de primer plano; usarlos sería tinta sobre su propio
 * color. El único par relleno+tinta real del DS es `bg-primary` /
 * `text-primary-fg`, y `Button variant="destructive"` de cadence hace
 * exactamente lo mismo que se permite acá.
 */
const COLOR_CRUDO_JUSTIFICADO: Record<string, string> = {
  'components/inmobiliaria/inmueble/VisorDeFotos.tsx':
    'Lightbox a pantalla completa sobre `bg-black/90`. Todo su chrome —contador, ' +
    'cerrar, flechas, borde de la miniatura activa— vive sobre negro fijo, no sobre ' +
    'una superficie del tema. Pasarlo a `text-fg` lo dejaría negro sobre negro en ' +
    'tema claro.',
  'components/inmobiliaria/ConsignacionHeader.tsx':
    'Scrim y píldoras sobre la FOTO de portada del inmueble (`bg-black/60`, ' +
    '`text-white`, `ring-white/70`). La foto no cambia con el tema.',
  'components/inmobiliaria/ConsignacionCard.tsx':
    'Píldora de comisión sobre la foto de la tarjeta (`bg-black/60 text-white`).',
  'components/inmobiliaria/FotosDelInmueble.tsx':
    'Degradé `from-black/60` y píldora «Subiendo» sobre la foto; y ' +
    '`bg-danger … text-white` en «No se subió» — `text-danger-fg` es el rojo mismo, ' +
    'así que sería rojo sobre rojo.',
  'components/inmobiliaria/ExportButton.tsx':
    '`text-white` sobre los rellenos `bg-danger` (PDF) y `bg-success` (Excel): ' +
    'mismo motivo, `danger-fg`/`success-fg` son alias del propio color.',
  'components/inmobiliaria/ActaEntregaView.tsx':
    'Scrim del lightbox de fotos del acta (`bg-black/80`, `bg-black/50 text-white`). ' +
    'Un scrim tiene que quedarse oscuro en LOS DOS temas: `bg-fg/80` se volvería ' +
    'casi blanco en oscuro. Cadence no tiene token de scrim con nombre.',
  'components/inmobiliaria/ActaEntregaViewer.tsx':
    'El mismo lightbox del acta, misma razón.',
  'components/inmobiliaria/MantenimientoViewer.tsx':
    'Velo `bg-black/20` sobre la foto del ticket, y `text-white` sobre el relleno ' +
    '`bg-success` del paso completado.',
  'components/inmobiliaria/MantenimientoForm.tsx':
    '`text-white` sobre el relleno `bg-danger`.',
  'components/inmobiliaria/ActaEntregaForm.tsx':
    '`text-white` sobre el relleno `bg-success` del círculo de paso completado.',
  'components/inmobiliaria/CandidateDrawer.tsx':
    '`text-white` sobre relleno `bg-success`.',
  'app/panel/inmobiliaria/documentos/page.tsx':
    'El `bg-white` es el del `<iframe>` de vista previa: no es una superficie del ' +
    'panel, es PAPEL. El `srcDoc` trae la plantilla con tinta oscura y sin fondo ' +
    'propio; con `bg-surface` la vista previa queda negro sobre negro en tema oscuro.',
}

/**
 * Archivos de `COBERTURA` a los que se les permite conservar un control a mano.
 *
 * Las tres formas legítimas, todas verificadas call site por call site:
 *  1. **fila / celda / miniatura clickeable entera** — un `<button>` sin
 *     apariencia de botón que envuelve una fila. Convertirlo a `Button` le
 *     pondría pill, padding y foco de CTA a algo que es una fila.
 *  2. **disparador de popover con estado seleccionado** — `aria-expanded` +
 *     `bg-primary-soft` cuando está abierto; `IconButton` no modela ese par.
 *  3. **`<input type="file">` escondido** detrás de un label o disparado por
 *     `ref.click()` — no es un campo, es un mecanismo del navegador.
 *
 * En los tres casos la exigencia que SÍ se cumple es `type="button"` (la
 * verifica el test de abajo).
 */
const CONTROL_A_MANO_JUSTIFICADO: Record<string, string> = {
  'components/inmobiliaria/ConsignacionDetailSections.tsx':
    'Dos filas de documento clickeables enteras (`documento-contrato`, ' +
    '`documento-contrato-adjuntar`) + el `<input type="file">` escondido.',
  'components/inmobiliaria/ConsignacionHeader.tsx':
    'La portada entera es clickeable (abre el visor de fotos).',
  'components/inmobiliaria/FotosDelInmueble.tsx':
    'Cada miniatura de la galería es clickeable entera (`foto-ver-N`): el `<button>` ' +
    'envuelve la `<img>` y no tiene apariencia propia.',
  'components/inmobiliaria/ConsignacionTable.tsx':
    'Cabecera de columna ordenable: hereda `font-[inherit] text-[inherit]`, no ' +
    'tiene apariencia de botón.',
  'components/inmobiliaria/inmueble/VisorDeFotos.tsx':
    'Miniatura clickeable entera de la tira inferior.',
  'components/inmobiliaria/inmueble/SubidaDeFotos.tsx':
    'Zona de arrastre (`border-dashed`, handlers de drag) que llena una celda de ' +
    'la grilla, más el `<input type="file">` escondido que dispara `ref.click()`. ' +
    'Cadence no tiene primitiva de dropzone.',
  'components/messages/MessagesWidget.tsx':
    'Fila «Ver ficha» del menú de la conversación, y el «Reintentar» en línea ' +
    'dentro del aviso de error —hereda `text-danger text-xs` del aviso; un ' +
    '`Button variant="link"` lo pintaría cobalto y con su propio tamaño.',
  'components/messages/NuevoMensajeDrawer.tsx':
    'Filas de destinatario (persona / inmobiliaria) clickeables enteras.',
  'components/messages/PendientesDelHiloPopover.tsx':
    'Disparador del popover con estado seleccionado, y filas de pendiente.',
  'components/messages/PlantillasDeMensajePopover.tsx':
    'Disparador del popover con estado seleccionado, filas de plantilla, y el ' +
    '«Reintentar» en línea.',
  'components/messages/SelectorDeEmojis.tsx':
    'Disparador del popover con estado seleccionado, y la grilla de emojis: cada ' +
    'emoji es una celda de 32px, no un CTA.',
  'components/inmobiliaria/ExportButton.tsx':
    'CTA con marca por formato (rojo PDF / verde Excel) y cambio de ícono con ' +
    '`AnimatePresence`: el `Button` del DS no tiene variante de éxito y su prop ' +
    '`isLoading` no modela el swap éxito→ícono. Ya estaba anotado en el archivo ' +
    'como «allowlist (Cadence GAP)».',
  'app/panel/inmobiliaria/contratos/[id]/editar/page.tsx':
    '`<input type="file" className="sr-only">` detrás de un `<label htmlFor>`: no ' +
    'tiene apariencia, y el adapter `<Input>` le inyectaría `h-11 px-4` peleando ' +
    'contra el `height:1px` de `sr-only`.',
  'app/panel/inmobiliaria/contratos/nuevo/page.tsx':
    'El mismo `<input type="file">` escondido, más el mosaico selector de modo ' +
    '(`aria-pressed`, título + descripción + insignia): es el caso «botón que ' +
    'envuelve una tarjeta entera».',
  'components/inmobiliaria/mantenimiento/InboxFilters.tsx':
    'Nueve píldoras de filtro con `aria-pressed`: semántica de toggle que `Button` ' +
    'no modela, y miden ~22px de alto cuando el size más chico del DS es `h-8`. El ' +
    'primitivo correcto sería un Chip/Toggle, que Cadence no expone.',
  'components/inmobiliaria/MantenimientoForm.tsx':
    'Tile de foto y celda de dropzone: cuadrados que se llenan de imagen.',
  'components/inmobiliaria/MantenimientoViewer.tsx':
    'Tile de imagen y celda de dropzone (ya traían comentario de allowlist propio).',
  'components/inmobiliaria/pagos/PagosHomeAttentionList.tsx':
    'La fila entera de la bandeja es clickeable.',
  'components/inmobiliaria/ActaEntregaView.tsx':
    'Miniaturas de foto clickeables enteras.',
  'components/inmobiliaria/ActaEntregaViewer.tsx':
    'Miniatura de foto clickeable entera.',
  'components/inmobiliaria/ActaEntregaForm.tsx':
    'Paso del stepper: la celda entera es el control.',
  'components/inmobiliaria/ComisionesTable.tsx':
    'Disparador de orden en `<TableHead>`: envuelve la celda de cabecera y no tiene ' +
    'chrome de botón. Cadence no tiene primitiva de sort header.',
  'components/inmobiliaria/VencimientosTable.tsx': 'Disparador de orden en `<TableHead>`.',
  'components/inmobiliaria/CobroTable.tsx': 'Disparador de orden en `<TableHead>`.',
  'components/inmobiliaria/PropietarioTable.tsx': 'Disparador de orden en `<TableHead>`.',
  'components/inmobiliaria/AgenteTable.tsx': 'Disparador de orden en `<TableHead>`.',
  'components/inmobiliaria/RenovacionesTable.tsx': 'Disparador de orden en `<TableHead>`.',
  'components/inmobiliaria/DispersionCard.tsx':
    'Cabecera desplegable de la tarjeta: el bloque entero abre y cierra.',
  'components/inmobiliaria/ComisionDesglose.tsx':
    'Dos cabeceras desplegables, mismo caso.',
  'components/inmobiliaria/ElegirCobroParaRecibo.tsx':
    'Fila de cobro clickeable entera (ya tenía su comentario de allowlist).',
  'components/inmobiliaria/InquilinosTable.tsx':
    'Disparador de orden en `<TableHead>`, y el nombre del inquilino: es el ÚNICO ' +
    'camino de teclado al cajón (un `<tr onClick>` no se tabula).',
  'components/inmobiliaria/SelectorDePropietarios.tsx':
    '«Editar» es un enlace DENTRO de una frase corrida («Nuevo propietario · ' +
    'Editar»); `Button variant="link"` es `inline-flex` y desalinea la línea base.',
  'components/inmobiliaria/VisitasDelInmueble.tsx':
    'Uno es `role="checkbox"` (tarjeta seleccionable entera) y el otro `role="tab"` ' +
    'dentro de un `role="tablist"`.',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/DeudoresListClient.tsx':
    'Tarjeta-fila de deudor en móvil: el equivalente exacto del `TableRow` de ≥md.',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/DebtorActionRail.tsx':
    'Tarjeta de acción a lo ancho (`border` + `bg-card` + `rounded-md`): chrome de ' +
    'tarjeta, no de botón. Y convertirla ROMPERÍA algo real: el `title` que explica ' +
    'por qué está deshabilitada por RBAC dejaría de verse, porque el `Button` del DS ' +
    'trae `disabled:pointer-events-none` y el navegador no dibuja tooltip sobre un ' +
    'elemento sin eventos de puntero.',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/AccionesTab.tsx':
    'Mismas tarjetas de acción en grilla 2×2, con el mismo problema del tooltip en ' +
    '`disabled`.',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/LlamadasTab.tsx':
    'Tarjeta-fila de móvil, equivalente del `TableRow` de escritorio.',
  'app/panel/inmobiliaria/cobros/cobranza/deudores/[id]/tabs/TimelineTab.tsx':
    'Fila del timeline: el borde lo pone el `<li>`, el botón no tiene chrome propio.',
  'app/panel/inmobiliaria/cobros/cobranza/reportes-propietarios/page.tsx':
    'Ítem seleccionable de una `<ul>` (`aria-pressed`, tres líneas con ícono).',
  'components/inmobiliaria/cobranza/CobranzaNextActionsPanel.tsx':
    'Fila de lista, sin fondo ni borde propios.',
  'components/inmobiliaria/cobranza/CobranzaStageCard.tsx':
    'Es una PESTAÑA con forma de KPI card: `role`/`aria-selected`/`tabIndex` de ' +
    'roving-tabindex y `forwardRef<HTMLButtonElement>`.',
  'components/inmobiliaria/cobranza/DisputasList.tsx':
    'Fila de lista; el único fondo es el estado seleccionado.',
  'components/inmobiliaria/cobranza/EscalationCard.tsx':
    'Superficie clicable dentro de la tarjeta (`w-full text-left`), sin chrome propio.',
  'components/inmobiliaria/cobranza/PromesaCard.tsx':
    'Cabecera de acordeón (`aria-expanded` / `aria-controls`), sin chrome propio.',
  'components/inmobiliaria/cobranza/EscalationAssignDropdown.tsx':
    'Fila de selección de miembro a dos líneas; el archivo ya traía su comentario ' +
    'ALLOWLIST explicando que no entra en `Button`/`IconButton`.',
  'components/inmobiliaria/cobranza/HeatmapGrid24x7.tsx':
    'Celda `role="gridcell"` del mapa de calor.',
  'components/inmobiliaria/cobranza/DebtorPicker.tsx':
    'Fila de sugerencia del buscador de deudores.',
  'app/panel/inmobiliaria/contratos/(retencion)/riesgo/[caseId]/CasoDetailClient.tsx':
    'Pestaña subrayada, sin superficie ni pill: un `Button` le pondría pill y foco ' +
    'de CTA a algo que es una pestaña.',
}

// ============================================================================
// Tests
// ============================================================================

const leer = (rel: string) => readFileSync(join(RAIZ, rel), 'utf8')

describe('el detector mide lo que dice medir', () => {
  // Verificación AL REVÉS: si alguien afloja las expresiones regulares para
  // «arreglar» un rojo, estos dos casos se caen antes que el resto del test se
  // vuelva silenciosamente inútil.
  it('encuentra un color crudo cuando lo hay', () => {
    expect(coloresCrudos('<div className="bg-white text-gray-500 border-emerald-200" />')).toEqual([
      'bg-white',
      'text-gray-500',
      'border-emerald-200',
    ])
  })

  it('NO marca los tokens de Cadence ni la escala neutral cálida', () => {
    expect(
      coloresCrudos(
        '<div className="bg-surface text-fg-muted border-border bg-primary-soft ' +
          'text-success bg-warning-soft neutral-200 text-neutral-700" />',
      ),
    ).toEqual([])
  })

  it('NO cuenta lo que está en un comentario', () => {
    expect(coloresCrudos('// antes decía bg-white\n/* y text-gray-500 */\n<p />')).toEqual([])
  })

  it('encuentra un control a mano cuando lo hay, y no confunde al primitivo', () => {
    expect(controlesAMano('<button type="button" /><input /><Button /><Input />')).toEqual([
      '<button ',
      '<input ',
    ])
  })
})

describe('cobertura', () => {
  it('la lista no está vacía ni se encogió sola', () => {
    expect(COBERTURA.length).toBeGreaterThanOrEqual(25)
  })

  it.each(COBERTURA)('%s existe', (rel) => {
    expect(
      existsSync(join(RAIZ, rel)),
      'Este archivo está en COBERTURA pero no existe. Si se renombró, actualizá la ' +
        'ruta; borrar la entrada deja la pantalla sin compuerta.',
    ).toBe(true)
  })
})

describe('pantallas de uso diario — colores por token', () => {
  it.each(COBERTURA)('%s no usa la paleta cruda de Tailwind', (rel) => {
    const encontrados = coloresCrudos(leer(rel))
    if (rel in COLOR_CRUDO_JUSTIFICADO) return
    expect(
      encontrados,
      `Colores crudos: ${[...new Set(encontrados)].join(', ')}. Usá los tokens de ` +
        'Cadence (bg-surface / text-fg / text-fg-muted / border-border / bg-primary-soft ' +
        '/ bg-success-soft / bg-warning-soft / bg-danger-soft / bg-info-soft). Si el caso ' +
        'es legítimo, agregá el archivo a COLOR_CRUDO_JUSTIFICADO **con su motivo**.',
    ).toEqual([])
  })

  // Una allowlist que ya no hace falta es basura que tapa la próxima regresión.
  it.each(Object.keys(COLOR_CRUDO_JUSTIFICADO))(
    '%s todavía necesita su excepción de color',
    (rel) => {
      expect(
        coloresCrudos(leer(rel)).length,
        'Este archivo ya no tiene colores crudos: sacalo de COLOR_CRUDO_JUSTIFICADO.',
      ).toBeGreaterThan(0)
    },
  )
})

describe('pantallas de uso diario — controles por primitiva', () => {
  it.each(COBERTURA)('%s no arma <button>/<input>/<select>/<textarea> a mano', (rel) => {
    const encontrados = controlesAMano(leer(rel))
    if (rel in CONTROL_A_MANO_JUSTIFICADO) return
    expect(
      encontrados,
      `Controles a mano: ${[...new Set(encontrados)].join(', ')}. Usá Button / ` +
        'IconButton / Input / Select / Textarea de @/components/ui. Si el caso es ' +
        'legítimo (fila clickeable, disparador de popover con estado, input de archivo ' +
        'escondido), agregá el archivo a CONTROL_A_MANO_JUSTIFICADO **con su motivo**.',
    ).toEqual([])
  })

  it.each(Object.keys(CONTROL_A_MANO_JUSTIFICADO))(
    '%s todavía necesita su excepción de control',
    (rel) => {
      expect(
        controlesAMano(leer(rel)).length,
        'Este archivo ya no tiene controles a mano: sacalo de CONTROL_A_MANO_JUSTIFICADO.',
      ).toBeGreaterThan(0)
    },
  )

  // La excepción se gana con `type="button"`. Sin él, un `<button>` dentro de un
  // formulario lo ENVÍA al hacer clic — el defecto silencioso clásico.
  it.each(Object.keys(CONTROL_A_MANO_JUSTIFICADO))(
    '%s: todo <button> que sobrevive lleva type="button"',
    (rel) => {
      const fuente = sinComentarios(leer(rel))
      const sinTipo = [...fuente.matchAll(/<button\b([^>]*)>/g)]
        .map((m) => m[1])
        .filter((attrs) => !/type=/.test(attrs))
      expect(
        sinTipo.length,
        'Un <button> sin `type` es `type="submit"`: dentro de un <form> lo envía al ' +
          'hacer clic.',
      ).toBe(0)
    },
  )
})

describe('un solo estado vacío', () => {
  it('el canónico encierra el ícono en un CÍRCULO, no en una loseta', () => {
    // «todo en grises y siempre encerrado en círculos» (Nico, 2026-09-03).
    const fuente = leer('components/ui/empty-state.tsx')
    expect(fuente).toMatch(/rounded-full bg-surface-muted/)
    expect(fuente).not.toMatch(/rounded-(?:2xl|xl|lg|md)\s+bg-surface-muted/)
  })

  it('data-display/EmptyState delega y no dibuja su propio markup', () => {
    const fuente = leer('components/data-display/EmptyState.tsx')
    expect(fuente).toContain("from '@/components/ui/empty-state'")
    expect(
      /<(?:div|span|a|button)\b/.test(sinComentarios(fuente)),
      'Volvió a tener markup propio: eso es el segundo estado vacío naciendo de nuevo.',
    ).toBe(false)
  })
})

describe('el toast entra por un solo lugar', () => {
  it('las pantallas cubiertas no importan `sonner` directo', () => {
    // `vi.mock('sonner')` sólo intercepta a los importadores que Vite procesa.
    // Un componente que importa sonner directo queda del lado equivocado del
    // seam; el envoltorio `@/components/ui/toast` es el único punto de entrada.
    const culpables = COBERTURA.filter((rel) => /from ['"]sonner['"]/.test(leer(rel)))
    expect(culpables).toEqual([])
  })

  it('el envoltorio toma `toast` de sonner, no de cadence', () => {
    // Por cadence el objeto es el mismo, pero sale de node_modules y `vi.mock`
    // no lo alcanza: los ~46 tests que espían el toast dejaban de verlo.
    expect(leer('components/ui/toast.tsx')).toMatch(/import \{ toast \} from ['"]sonner['"]/)
  })
})
