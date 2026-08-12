# La noche del 2026-08-11: enlaces, editar, y los estados que mentían

Continúa `SESSION-2026-08-11-importar-consignacion-y-estados.md`.
**Todo en el PR #87** (`feat/portales-y-plantilla`), seis commits nuevos.

| commit | qué |
|---|---|
| `adb74138` | traer inmuebles pegando los enlaces de las fichas, con sus fotos |
| `d211c8b5` | completar y editar los datos en la revisión, donde se ven |
| `2208e92b` | el contador decía cuántos terminaron, no en cuál va |
| `833932d0` | un 401 por token recién renovado se repite, no se pinta como fallo |
| `2eb3a755` | el vacío son DOS vacíos + paginación en Inmuebles |
| `4882c94d` | inquilino, y los vacíos de asegurabilidad dejaron de flotar |
| `dc3e4f79` | dos botones que YO dejé rotos, y el test que lo impide |

---

## El hilo de esta tanda

La sesión anterior fue **«la pantalla afirma algo que nadie verificó»**. Esta es
su gemela: **«la pantalla ofrece una salida que no lleva a ningún lado»**.

| dónde | lo que ofrecía | qué pasaba al usarlo |
|---|---|---|
| Postulaciones (inquilino) | «Reintentar» | un `<a>` a la misma ruta: no pide nada |
| Propiedades | «Intentar de nuevo» | volvía a fallar igual (401 en curso) |
| Revisión de importación | aceptar o rechazar | si el valor era casi correcto, no había tercera opción |
| Resumen de importación | «faltan área y baños» | en una pantalla sin un solo campo editable |
| Contratos | «Crear contrato» | «Falta el parámetro applicationId» |

---

## 1. Traer inmuebles desde los enlaces (`adb74138`)

Los CRM del rubro y los portales generan por inmueble una **página pública para
mandar por WhatsApp**. Existe para que WhatsApp arme la vista previa, así que
trae el dato **rotulado**. Si se puede mandar por WhatsApp, se puede traer.

**Medido de punta a punta**: inmueble creado + **10 fotos** bajadas del CDN del
portal y subidas a nuestro storage.

Cuatro defectos que **sólo aparecieron contra una página real**, y los cuatro
devolvían un valor plausible → 📌 `reference_el_bloque_json_ld_de_la_empresa_no_es_el_inmueble`.

## 2. Editar en la revisión (`d211c8b5`)

Los requisitos del back se evaluaban en el **último paso**, que no tiene un solo
campo editable → 📌 `reference_los_requisitos_del_back_en_la_pantalla_equivocada`.

## 3. El contador (`2208e92b`)

La barra **no estaba rota** —medida: 85 px de 255 a 33%—. El contador decía
cuántos habían TERMINADO, así que durante el primer inmueble mostraba «0 de N».
Y mis dos primeras mediciones dieron 4,7 s y 10,4 s: **artefacto de mi sonda**
→ 📌 `reference_una_sonda_pesada_mide_su_propio_peso`.

## 4. El 401 de la renovación (`833932d0`)

    GET  …/arco/requests                          → 401
    POST supabase/token?grant_type=refresh_token  → 200
    GET  …/arco/requests                          → 200

→ 📌 `reference_un_401_por_token_renovado`.

## 5–7. Los estados (`2eb3a755`, `4882c94d`, `dc3e4f79`)

`SinDatos` + 11 rutas + el test de destinos
→ 📌 `reference_el_vacio_son_dos_vacios`.

---

## Lo que aprendí de proceso (y otra vez era mío)

**Verifiqué dos rutas listando el directorio en vez de abrirlas.** Las dos
estaban rotas: una exigía `?applicationId=` y la otra no existía (`nueva` vs
`nuevo`). Y el primer caso **ya estaba resuelto veinte líneas más arriba en el
mismo archivo**, con un comentario explicándolo. Pasé por al lado de la solución
y puse el bug de nuevo.

Ahora hay un test que lo impide, y **verifiqué que falla** reintroduciendo el
defecto. Una prueba que pasa sobre código roto no sirve.

---

## Lo que queda

- **~12 rutas** del inventario de `cuatro-estados.test.ts`: pagos y guardados de
  inquilino, postulaciones, créditos, documentos/revisión, candidatos, cobranza.
  Mecánico ahora: la primitiva, la regla y el test de destinos ya están.
- **12 inmuebles de prueba** en la agencia demo (míos y de las mediciones).
- `LOCATIONIQ_API_KEY` **no está en local**: toda geocodificación cae al centro
  de la ciudad. No rompe nada, pero ningún inmueble importado queda en su
  dirección exacta.
- El listado POBLADO del inbox de asegurabilidad quedó como estaba (filas
  sueltas). No lo cambié porque sin datos no lo puedo ver.
- El error al abrir «Nueva consulta» **no se pudo reproducir**; lo más probable
  es que fuera el 401 de `833932d0`.
