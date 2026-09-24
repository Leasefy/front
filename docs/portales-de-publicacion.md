# Portales de publicación — qué hay construido, y por qué salió del menú

> **Estado: OCULTO del menú el 22-09-2026.** La ruta
> `/panel/inmobiliaria/inmuebles/portales` **sigue viva** y funciona igual: lo
> que se retiró es la fila del sidebar. Se borró la fila, no el trabajo.

## Por qué salió

Nico, 22-09: *«eso de portales no carga, pero siento que no sirve de nada
porque ¿para qué es eso si no tenemos integración directa? prácticamente no
hiciste la integración de cada una, sólo dejaste ahí unos inputs y ya».*

Tiene razón en lo que importa: **el producto no publica en ningún portal.** El
aviso lo sube una persona, a mano, entrando al portal. La pantalla misma lo
dice con todas las letras —*«Hoy el aviso lo subes tú al portal: todavía no
publicamos solos en ninguno»*— pero **una fila en el menú promete que el
producto hace ese trabajo**, y esa promesa es la que sobraba.

(El «no carga» de esa captura era otra cosa y no era del módulo: un
`ChunkLoadError` por haber reiniciado el servidor de desarrollo con la pestaña
abierta. La ruta responde 200.)

## Qué hay construido de verdad

No son «unos inputs»: son **1.235 líneas** de pantalla y **587 de pruebas**,
contra **ocho rutas del back** (`publicacionApi`):

| método | para qué |
|---|---|
| `cuentas` / `guardarCuenta` | qué cuentas de portal tiene contratadas la inmobiliaria |
| `tablero` | qué inmueble está publicado y en cuál portal |
| `publicar` / `despublicar` | marcar el estado de un inmueble en un portal |
| `confirmar` | confirmar que el aviso ya quedó arriba |
| `revision` | el paso de revisión antes de publicar |
| `exportarUrl` | bajar el archivo para subirlo al portal |

Los cinco portales del catálogo: **Fincaraíz, Metrocuadrado, Ciencuadras,
Properati y Mercado Libre**.

**Lo que ES:** un cuaderno compartido. Responde «¿dónde quedó publicado este
inmueble?» sin que nadie tenga que abrir cinco pestañas, y deja el archivo
listo para subir.

**Lo que NO ES:** una integración. Ningún portal recibe nada de Leasefy.

## Qué haría falta para prenderla

1. **Cuentas con paquete pagado en cada portal.** No las vendemos nosotros:
   son de la inmobiliaria. Para Mercado Libre ya está anotado que hace falta
   una cuenta con paquete pagado, y que **no es la integración más barata**.
2. **La API o el feed XML de cada portal**, uno por uno. No hay un estándar:
   Fincaraíz, Metrocuadrado y Ciencuadras tienen cada uno lo suyo.
3. **Decidir qué pasa cuando el portal rechaza un aviso** — hoy no hay a quién
   avisarle, porque nada se manda.

Mientras las tres no estén, el módulo no puede prometer más de lo que hace.

## Cómo volver a mostrarlo

Una línea en `src/lib/nav/arquitectura-del-panel.ts`, donde está el comentario
que explica por qué se retiró (buscar «PORTALES SALE DEL MENÚ»). Al devolverla
hay que subir a 26 el conteo de
`src/lib/nav/arquitectura-del-panel.test.ts`.
