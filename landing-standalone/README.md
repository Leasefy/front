# Leasefy — Landing

Landing completa de Leasefy: home con scroll teatral (shader fluido, eclipse, riel del caso, ecuación de finanzas, video del cierre), blog, contacto y las 8 internas de producto (CRM, ERP y 6 agentes AI), todo autocontenido en un solo archivo.

## Ver
Abrir `index.html` directo en el navegador. No requiere build ni servidor (todos los assets van embebidos en base64). Sirve tal cual en GitHub Pages.

## Estructura
- `index.html` — el sitio completo (~17MB por los assets embebidos). 3 scripts: router temprano del `<head>`, sitio base, y sistema scroll-driven + internas de producto.
- `HANDOFF.md` — documentación de arquitectura, decisiones de diseño, reglas de oro del código y pendientes. **Leer antes de tocar el código.**
- `assets/textures/` — las texturas de marca en alta resolución (t1–t9, 1600×1600 WebP) y la textura del shader del hero, como archivos sueltos para el port a producción.
- `tools/gen_textures.py` — generador de las texturas (numpy/PIL/scipy): gradientes de marca con domain-warp direccional + grano fino.

## Producción (pendiente, ver HANDOFF.md)
- Reemplazar el WebP del cierre por `<video>` con `cierre-4k.mp4` + poster.
- Externalizar los base64 a archivos (fotos, texturas).
- Port a React + framer-motion mapeando los scrubbers a useScroll/useTransform.
