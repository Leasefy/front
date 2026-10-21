import type { Metadata } from 'next'
import './admin.css'

/**
 * /admin — el layout raíz del admin de Leasefy (login, enlace, prohibido,
 * segundo factor y el panel).
 *
 * 🔴 19-10-2026 (Nico): el admin es de Leasefy y se ve como Leasefy. Ya no
 * carga su propia letra ni su papel y tinta fijos: usa la Schibsted Grotesk y
 * la JetBrains Mono del layout raíz y los tokens de Cadence, con tema claro y
 * oscuro como el resto de la plataforma. `.admin-scope` queda sólo como el
 * alcance del puente de `admin.css` (clases viejas de otras ramas).
 *
 * Es una herramienta interna con datos de todas las inmobiliarias: fuera de los
 * buscadores.
 */
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-scope min-h-screen bg-bg text-fg antialiased">{children}</div>
}
