# face-api 1.7.15 (MIT)

Copia tal cual de `@vladmandic/face-api@1.7.15` (npm, huella sha512 verificada el 28-10-2026):
`dist/face-api.esm.js` (trae TensorFlow.js adentro) y el modelo `tiny_face_detector` (≈190 KB).

Lo usa la página de firmar (`/firmar/documento/[token]`) para revisar que haya UNA cara de frente antes de tomar la
foto del firmante (Nico, 28-10-2026: «cámara propia + revisar la cara», sin Didit). Corre en el navegador: la foto no
sale a ningún tercero. Se carga con `import()` desde `src/lib/firmas/revisor-de-la-cara.ts`, sólo cuando la persona abre
la cámara. Se sirve desde nuestro origen para no abrir la política de contenido a otro dominio.

Para cambiar de versión: bajar el paquete de npm, verificar su `dist.integrity`, copiar esos tres archivos a una
carpeta con la versión nueva y cambiar `VERSION` en `revisor-de-la-cara.ts`.
