'use client'

import { useState } from 'react'

/**
 * Último recurso: sólo se monta si el layout raíz explota, y reemplaza el
 * <html> entero — por eso trae sus propias etiquetas y estilos en línea (no
 * hay garantía de que el CSS de la app haya cargado).
 */

export default function ErrorGlobal({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // ── Por qué NO se usa `reset()` acá (Nico, 2026-08-27: «cuando le da uno
  // clic a ese botón no sirve») ─────────────────────────────────────────
  //
  // Esta es la frontera de la RAÍZ: sólo se monta cuando el layout raíz
  // entero se rompió. `reset()` intenta volver a montar exactamente ese
  // layout, que vuelve a romperse por lo mismo — el clic no hace nada
  // visible. En la frontera de una sección (`panel/inmobiliaria/error.tsx`)
  // reintentar sí tiene sentido, porque se remonta sólo esa sección con el
  // resto de la app sana debajo. Acá no queda nada sano debajo: lo único que
  // de verdad empieza de cero es recargar.
  const recargar = () => {
    window.location.reload()
  }

  // ── La referencia que el texto promete ────────────────────────────────
  // «pasanos la referencia», pero sólo se mostraba cuando había `digest`, y
  // en errores del cliente casi nunca lo hay: se le pedía a la persona un
  // dato que no se le dio. Mismo arreglo que `FalloDeCarga`: si no hay
  // digest, una referencia con la hora, que a soporte le sirve para ubicar
  // el evento en los logs. Se calcula una vez (inicializador), no en cada
  // render, para que no cambie mientras la persona la copia.
  const [referencia] = useState(() => {
    if (error.digest) return error.digest
    const ahora = new Date()
    const hhmm =
      String(ahora.getHours()).padStart(2, '0') +
      String(ahora.getMinutes()).padStart(2, '0')
    return `RAIZ-${hhmm}`
  })

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fbfaf9',
          color: '#14130f',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
            Leasefy no pudo abrir
          </h1>
          <p style={{ fontSize: '15px', lineHeight: 1.55, color: '#6e6a63', marginTop: '12px' }}>
            Fue un problema nuestro. Vuelve a cargar la página; si sigue igual,
            escríbenos y pásanos la referencia.
          </p>
          <button
            type="button"
            onClick={recargar}
            style={{
              marginTop: '24px',
              height: '44px',
              padding: '0 24px',
              borderRadius: '9999px',
              border: 'none',
              background: '#1a40ff',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Volver a cargar
          </button>
          <p style={{ marginTop: '24px', fontSize: '11px', color: '#8c8880', fontFamily: 'ui-monospace, monospace' }}>
            Ref: {referencia}
          </p>
        </div>
      </body>
    </html>
  )
}
