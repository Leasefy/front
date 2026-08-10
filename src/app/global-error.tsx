'use client'

/**
 * Último recurso: sólo se monta si el layout raíz explota, y reemplaza el
 * <html> entero — por eso trae sus propias etiquetas y estilos en línea (no
 * hay garantía de que el CSS de la app haya cargado).
 */

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
            Fue un problema nuestro. Volvé a cargar la página; si sigue igual,
            escribinos y pasanos la referencia.
          </p>
          <button
            type="button"
            onClick={() => reset()}
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
          {error.digest && (
            <p style={{ marginTop: '24px', fontSize: '11px', color: '#8c8880', fontFamily: 'ui-monospace, monospace' }}>
              Ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
