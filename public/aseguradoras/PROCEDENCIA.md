# Logos de aseguradoras — de dónde salió cada uno

Todos bajados de **Wikimedia Commons** el 2026-08-09, y todos con licencia de
**dominio público** (`PD-textlogo`: marcas por debajo del umbral de originalidad,
que no generan derecho de autor). Ninguno pide atribución.

| Archivo | Original en Commons | Licencia | viewBox |
|---|---|---|---|
| `sura.svg` | `File:Seguros SURA Logo.svg` | Public domain | 1000×388 |
| `mapfre.svg` | `File:Logo Mapfre 2026.svg` | Public domain (trademarked) | 1708×470 |
| `equidad.svg` | `File:La Equidad Seguros logo.svg` | Public domain | 100×110 |
| `zurich.svg` | `File:Zurich Insurance Group logo.svg` | Public domain | 604×379 |

Se les quitó el metadato de editor (Inkscape/sodipodi) y el prólogo XML. Ninguno
trae raster embebido, `<script>` ni referencias externas — verificado.

## Qué NO se bajó, y por qué

- **Seguros Mundial** — el único que hay es `CC BY-SA 3.0`. Pide atribución y
  obliga a compartir igual: una obligación legal que nadie iba a estar
  rastreando dentro de una tarjeta de 44px. Mejor monograma.
- **Seguros Bolívar, La Previsora, Solidaria, Sekure** — no están en Commons.
  Se dibujan con monograma hasta que alguien consiga el archivo oficial.

## ⚠️ Marca registrada ≠ derecho de autor

«Dominio público» acá es sobre el **copyright**. Los cuatro siguen siendo
**marcas registradas** de sus dueños. Mostrarlas es legítimo mientras Leasefy
efectivamente trabaje con esas aseguradoras y no se insinúe un patrocinio que no
existe. Si alguna deja de ser aliada, se saca de `LOGOS` en
`src/lib/aseguradoras/marca.ts` y vuelve a su monograma.

## Agregar uno nuevo

1. `public/aseguradoras/<nombre>.svg`
2. Registrarlo en `LOGOS` de `src/lib/aseguradoras/marca.ts`, con la clave en
   minúsculas igual al nombre que manda el agente.
3. Anotarlo en esta tabla con su licencia. Sin licencia verificada no entra.
