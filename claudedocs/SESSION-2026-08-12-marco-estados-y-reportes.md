# 2026-08-12 (madrugada): el marco, el barrido cerrado, y los reportes que no generaban

Continúa `SESSION-2026-08-11-noche-enlaces-editar-y-estados.md`.
**Todo en el PR #87** (`feat/portales-y-plantilla`), cuatro commits nuevos.

| commit | qué |
|---|---|
| `8cb52a48` | el fallo dejó de pintar una tarjeta adentro de otra |
| `0a353b60` | la pantalla se llama como el menú y abre donde promete |
| `99836e88` | cerrar el barrido: las dos listas de deuda quedan vacías |
| `2e0c6c33` | reportes que sí bajan, toasts del DS, dos selects invisibles |

---

## El hilo de esta tanda

Las dos sesiones anteriores fueron **«la pantalla afirma algo que nadie
verificó»** y **«la pantalla ofrece una salida que no lleva a ningún lado»**.
Ésta agrega la tercera de la familia:

> **La pantalla tiene la pieza correcta y no la usa.**

| dónde | la pieza estaba | y sin embargo |
|---|---|---|
| Propietarios | `SinDatos` va sin marco | el fallo se pintaba su propia tarjeta |
| Toasts | Cadence pasa la piel completa | sonner la pisaba por orden de cascada |
| Nuevo Agente | hay escala de z-index en globals.css | el modal usaba `99999` y tapaba sus campos |
| Reportes | el export CSV del back funciona | «Generar» era un `setTimeout` |
| Operaciones | Renovaciones ya tiene ruta propia | seguía siendo la pestaña por defecto |
| Guardados | el hook tiene `errorCrudo` | un `.catch(() => null)` lo volvía inalcanzable |

En cinco de los seis, **la señal ya estaba escrita en el código**: un
`className="border-0 bg-transparent"` parcheando a mano, un comentario que dice
que renovaciones se sacó de ahí, una escala de z-index declarada. Lo que faltó
no fue construir: fue leer lo que ya estaba.

---

## 1. El marco (`8cb52a48`)

`FalloDeCarga` pintaba `rounded-xl border bg-card` adentro de la tarjeta de la
tabla. Su gemelo `SinDatos` ocupa el mismo hueco sin marco.

Ahora `enmarcado` es una decisión declarada, y `EstadoDeDatos` lo pasa siempre
en `false` → 📌 `reference_el_marco_es_una_decision`.

De paso: Consignaciones pasaba `error` (el mensaje) en vez de `errorCrudo`, y
«Intentar de nuevo» podía dispararse dos veces — irrelevante en casi todas las
pantallas, **menos** en `/inquilino/aprobacion/pago`, donde inicia un cobro PSE
que no corta si ya está enviando.

## 2. Operaciones (`0a353b60`)

Tres nombres para un clic; una sola causa (la pestaña por defecto). La pestaña
pasó a vivir en `?tab=` → 📌 `reference_tres_nombres_para_un_clic`.

## 3. El barrido cerrado (`99836e88`)

Las dos listas de `cuatro-estados.test.ts` a cero. Pero lo que más va a servir
después es que **el guardián medía mal en las dos direcciones** —escondía 8,
marcaba 6 ya arregladas— → 📌 `reference_una_lista_de_deuda_puede_medir_mal`.

Y el hallazgo que no era de pantalla: `useWishlistedProperties` no podía fallar
nunca → 📌 `reference_un_hook_que_no_puede_fallar`.

## 4. Reportes, toasts, analítica, selects (`2e0c6c33`)

- «Reporte generado» era `setTimeout(1500)` + toast
  → 📌 `reference_operaciones_que_fingen_exito` (actualizada)
- Los toasts cargaban la piel del DS sin usarla
  → 📌 `reference_la_piel_del_ds_que_no_pinta`
- Los selects abrían detrás del backdrop
  → 📌 `reference_un_zindex_inventado_tapa_sus_propios_campos`
- Los tres «insights» de Analítica eran texto fijo de i18n, iguales para
  cualquier inmobiliaria. En la agencia de pruebas —1 inmueble, $0— las tres
  eran falsas al mismo tiempo, arriba de KPI en 0. Salieron.

---

## Lo que queda

- **PR #87 con 16 commits**, esperando a Víctor.
- ~11 «operaciones que fingen éxito» en inmobiliaria y propietario
  (`propietarios/[id]`, `ConfigFacturacion`, `CobroDetail`, `DispersionDetail`,
  `ReporteViewer`, `RecordatorioConfig`, `ContractExpandableItem`,
  `DocumentUpload`). Grep: `new Promise\(\(?resolve\)? => setTimeout`.
- **`unstyled: true` corresponde arriba**, en `@leasefy/cadence`: su
  `<Toaster>` debería nacer con eso. Quedó en el shim del front.
- **PDF de reportes no existe** para ninguno. Los 5 que bajan lo hacen en CSV;
  Extractos por propietario vive en Dispersiones; Rendimiento de Agentes no
  tiene export propio.
- Los insights de Analítica vuelven cuando el back exponga tendencia de
  ocupación, días en mercado y meta de recaudo.
- `LOCATIONIQ_API_KEY` sigue sin configurar en local.

## Gates de esta sesión

Los cuatro commits pasaron `tsc --noEmit`, la suite completa (**276 archivos ·
2379 tests**), `pnpm lint` sin errores y `next build` (251/251) con
`NEXT_DIST_DIR=.next-verify` para no matar el dev de Nico.

Lo que se verificó **contra la pantalla**, no leyendo código: el borde doble
(borde 0 dentro de tarjeta de 1px), la pestaña sobreviviendo a un F5, los KPI en
«—» con el 500 forzado y en número al soltarlo, la descarga real del CSV (169
bytes, `text/csv`), el toast con `bg-ink` y radio 12px, y los dos selects
eligiendo de verdad.
