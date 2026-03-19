# Phase 9: Interactive Map - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<vision>
## How This Should Work

Un mapa interactivo estilo Airbnb/Zillow que permite descubrir propiedades visualmente. El usuario puede explorar el mapa, hacer zoom para ver clusters o propiedades individuales, y filtrar haciendo clic en los marcadores.

El layout es split: lista de propiedades a la izquierda, mapa a la derecha. Cuando hago zoom out, veo clusters con cantidades (e.g., "15" propiedades en esa zona). Cuando hago zoom in, veo marcadores individuales con el precio de renta.

Los marcadores muestran el precio (e.g., "$2.5M") para que pueda ver de un vistazo qué hay disponible en cada zona. Si hago clic en un marcador, la lista se filtra para mostrar esa propiedad.

</vision>

<essential>
## What Must Be Nailed

- **Split layout** - Lista de propiedades (izquierda) + mapa (derecha) en desktop
- **Marcadores con precio** - Cada propiedad muestra su renta como etiqueta
- **Clustering dinámico** - Zoom out = clusters con cantidad, zoom in = marcadores individuales
- **Interacción bidireccional** - Clic en marcador filtra la lista
- **Sync con filtros existentes** - El mapa respeta los filtros aplicados
- **Mobile friendly** - Toggle para mostrar/ocultar mapa en móvil

</essential>

<specifics>
## Specific Design Elements

**Reference (Airbnb/Zillow style):**
- Marcadores tipo "pill" con precio: fondo oscuro (primary), texto blanco
- Hover effect: marcador crece o cambia color
- Selected state: marcador destacado cuando la propiedad está seleccionada
- Clusters: círculos con número, mismo estilo que marcadores

**Cluster behavior:**
- Zoom level bajo (< 12): mostrar clusters
- Zoom level alto (>= 12): mostrar marcadores individuales
- Click en cluster: zoom hacia ese cluster
- Número en cluster: cantidad de propiedades

**Marker design:**
- Pill shape: rounded-full
- Background: primary gradient o slate-800
- Text: white, precio formateado ($ 2.5M)
- Hover: scale up, shadow
- Selected: ring indicator, larger

**Map provider options:**
- Mapbox GL JS (via react-map-gl) - Recommended
- Google Maps (expensive for high volume)
- Leaflet + OpenStreetMap (free but less polished)

**Layout:**
- Desktop: 50/50 split o 60/40 (list/map)
- Mobile: Lista por defecto, botón "Ver mapa" para toggle
- Map controls: zoom in/out, fullscreen, locate me

</specifics>

<notes>
## Additional Context

Las propiedades ya tienen coordenadas en el mock data (latitude, longitude). Si no, hay que agregarlas con coordenadas realistas de ciudades colombianas.

Mapbox es la mejor opción por calidad visual y clustering integrado. Tiene free tier de 50k loads/mes que es suficiente para MVP.

El mapa debe sentirse premium - animaciones suaves, transiciones fluidas, marcadores elegantes. Esto es un diferenciador visual importante.

La interacción debe ser bidireccional:
1. Mover el mapa → actualiza las propiedades visibles en la lista
2. Filtrar propiedades → actualiza los marcadores en el mapa
3. Click en marcador → scroll/highlight en la lista
4. Hover en card → highlight marcador en el mapa

</notes>

---

*Phase: 09-interactive-map*
*Context gathered: 2026-01-19*
