# Logos de aseguradoras — de dónde salió cada uno

**Siete de nueve tienen su logo.** Vienen de dos fuentes con estatus legal
distinto, y la diferencia importa: leé las dos secciones antes de agregar uno.

## A. Wikimedia Commons — dominio público, verificado

Bajados el 2026-08-09. Todos con licencia **`PD-textlogo`**: marcas por debajo
del umbral de originalidad, que no generan derecho de autor. **No piden
atribución.**

| Archivo | Original | Licencia | viewBox |
|---|---|---|---|
| `sura.svg` | `File:Seguros SURA Logo.svg` | Public domain | 1000×388 |
| `mapfre.svg` | `File:Logo Mapfre 2026.svg` | Public domain (trademarked) | 1708×470 |
| `equidad.svg` | `File:La Equidad Seguros logo.svg` | Public domain | 100×110 |
| `zurich.svg` | `File:Zurich Insurance Group logo.svg` | Public domain | 604×379 |

## B. Del sitio oficial de cada compañía — copyright NO verificado

Bajados el 2026-08-09 **directamente del sitio de cada aseguradora**, que es la
fuente autoritativa y actual. Pero **su estatus de copyright no está
verificado**: un logo figurativo (el escudo de Bolívar, el árbol de Previsora)
puede estar por encima del umbral de originalidad, a diferencia de un logotipo
de puro texto.

| Archivo | De dónde | Nota |
|---|---|---|
| `bolivar.png` | `d9b6rardqz97a.cloudfront.net` (header de segurosbolivar.com) | 600×315, transparente |
| `previsora.png` | `previsora.gov.co/documents/d/global/logoprevisoranuevo-400x191` | 400×197. Su sitio lo sirve en **escala de grises** |
| `solidaria.svg` | `safilepwebprod.blob.core.windows.net` (header de aseguradorasolidaria.com.co) | SVG oficial 200×60 |

⚠️ **Se usan como identificación de aliado comercial.** Eso es legítimo mientras
Leasefy efectivamente trabaje con esas aseguradoras y no se insinúe un
patrocinio que no existe. Si alguna deja de ser aliada, se saca de `LOGOS` en
`src/lib/aseguradoras/marca.ts` y vuelve a su monograma — sin tocar nada más.

Si el equipo legal quiere respaldo formal, lo que corresponde es pedirle a cada
aseguradora su **manual de marca**, que autoriza el uso y fija los mínimos.

## Qué NO se bajó, y por qué

- **Seguros Mundial** — el único disponible es `CC BY-SA 3.0`. Obliga a
  atribuir y a compartir igual: una carga legal que nadie iba a rastrear dentro
  de una tarjeta de 44px. Monograma.
- **Sekure** — su dominio no responde y **no aparece como aseguradora
  colombiana** en ninguna búsqueda. Está en `CARRIER_DISPLAY` del contrato del
  agente; puede ser una afianzadora (no aseguradora) o un nombre viejo.
  **Vale la pena confirmarlo con Víctor.** Monograma.

## Verificado

Ninguno trae raster embebido, `<script>` ni referencias externas. A los SVG se
les quitó el metadato de editor y el prólogo XML.

## Agregar uno nuevo

1. `public/aseguradoras/<nombre>.svg`
2. Registrarlo en `LOGOS` de `src/lib/aseguradoras/marca.ts`, con la clave en
   **minúsculas** igual al nombre que manda el agente
   (`aseguradoraDisplayName` en `funnel.service.ts`).
3. Anotarlo acá con su procedencia. **Sin fuente anotada no entra.**

⚠️ Preferí siempre el sitio oficial o Commons por encima de los agregadores
(seeklogo, brandsoftheworld, vectorlogo). Ahí los suben usuarios, sin licencia
clara, y suelen estar desactualizados: el de Previsora que ofrece Brands of the
World está marcado como **obsoleto**.
