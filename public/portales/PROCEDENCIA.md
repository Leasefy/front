# Logos de portales — de dónde salió cada uno

**Cuatro de seis tienen su logo.** Vienen de dos fuentes con estatus legal
distinto, y la diferencia importa: leé las tres secciones antes de agregar uno.

Mismo criterio que `public/aseguradoras/PROCEDENCIA.md`.

## A. Wikimedia Commons — dominio público, verificado

Bajados el 2026-09-18. Licencia **dominio público**: marcas por debajo del
umbral de originalidad, que no generan derecho de autor. **No piden
atribución.**

| Archivo | Original en Commons | Licencia | Tamaño |
|---|---|---|---|
| `mercado-libre.svg` | `File:Mercado Libre wordmark (Spanish version).svg` | Public domain | 7,2 KB · viewBox 112,8×46,9 |
| `properati.png` | `File:Properati-logo-portal-inmuebles.png` | Public domain | 56,5 KB · 1430×396 |

## B. 🔴 Wikimedia Commons — CC BY-SA 4.0, **PIDE ATRIBUCIÓN**

| Archivo | Original en Commons | Licencia | Tamaño |
|---|---|---|---|
| `fincaraiz.png` | `File:Logo fr.png` | **CC BY-SA 4.0** | 6,6 KB · 388×52 |

**Autor declarado**: fincaraíz.com.co.
**Crédito original**: `fincaraiz.com.co/App_Theme/images/landig_page/landing_apps/logo_fr.png`

🔴 CC BY-SA obliga a **dar crédito** y a compartir igual cualquier obra
derivada. Dentro del panel se usa **sin modificar** y sólo para identificar al
portal, que es el caso más defendible. Si algún día este logo se compone dentro
de otra pieza gráfica (una landing, un PDF, un correo), hay que poner el
crédito visible o sacarlo. Si preferís no cargar con esa obligación: borrá el
archivo y quitá la entrada de `LOGOS` en `src/lib/portales/marca.ts` — la
tarjeta vuelve sola a su monograma.

## C. Del sitio oficial — copyright NO verificado

Bajado el 2026-09-18 **directamente del sitio del portal**, que es la fuente
autoritativa y actual. Su estatus de copyright **no está verificado**.

| Archivo | Origen | Tamaño |
|---|---|---|
| `ciencuadras.svg` | `https://www.ciencuadras.com/sources/images/logo-cc-color.svg` | 14,6 KB · viewBox 162×38 |

## Los que faltan, y por qué

- **Metrocuadrado** — no está en Commons y su sitio sirve el logo desde JavaScript:
  lo único público es un `favicon.ico`, que no sirve como marca en una tarjeta.
  Queda con monograma («ME») hasta conseguir el archivo. Si alguien tiene
  contacto con ellos, pedir el manual de marca es el camino limpio.
- **Sitio propio** — es el catálogo de Leasefy, o sea nosotros. No lleva archivo
  acá: usa nuestro propio símbolo del sistema de diseño.

## Antes de agregar uno

1. El archivo va en esta carpeta.
2. **Una fila en la tabla que corresponda**, con de dónde salió y con qué
   licencia. Sin esto no entra: un logo sin procedencia es una demanda
   esperando.
3. Una entrada en `LOGOS` en `src/lib/portales/marca.ts`.

🔴 Y lo que NUNCA se hace: redibujar el logo de memoria o teñir un cuadrado con
«más o menos su color». Eso deja una **marca falsa de una empresa que existe**,
en la pantalla que le dice a una inmobiliaria dónde se publica el inmueble de su
cliente.
