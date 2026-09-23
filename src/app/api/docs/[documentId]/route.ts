import { NextRequest, NextResponse } from 'next/server';
import { esIdentificadorSeguro } from '@/lib/utils/identificador-seguro';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/**
 * Los únicos tipos que el back deja subir como documento de una postulación
 * (`documents.service.ts`, `ALLOWED_MIME_TYPES`, decidido por los bytes). Lo que
 * llegue con otro tipo se entrega como descarga opaca.
 *
 * ── Por qué importa (auditoría de seguridad 23-09) ─────────────────────────
 * Esta ruta sirve el archivo DESDE NUESTRO ORIGEN, y quien la llama
 * (`CandidateDrawer`) lo abre como `blob:` en una pestaña nueva — un `blob:`
 * hereda el origen de la página que lo creó. Si el archivo llegara como
 * `text/html` o `image/svg+xml`, su `<script>` correría como leasefy.co, con
 * la sesión de la inmobiliaria que revisa la postulación. Hoy el back no lo
 * deja subir; esto es la segunda puerta, por si alguna vez lo deja.
 */
const TIPOS_QUE_SE_MUESTRAN = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * ¿La URL firmada que devolvió el back apunta al Storage de Supabase?
 * Esta ruta la baja desde el servidor: si apuntara a cualquier lado, sería un
 * proxy abierto (SSRF) servido desde nuestro dominio.
 */
function esUrlDeAlmacenamiento(cruda: string): boolean {
  let url: URL;
  try {
    url = new URL(cruda);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const proyecto = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (proyecto) {
    try {
      if (url.hostname === new URL(proyecto).hostname) return true;
    } catch {
      // Variable mal escrita: queda la regla general de abajo.
    }
  }
  return url.hostname.endsWith('.supabase.co');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const applicationId = req.nextUrl.searchParams.get('app');

  if (!applicationId) {
    return NextResponse.json({ error: 'Missing app param' }, { status: 400 });
  }

  // Los dos van dentro de la ruta del back: nada que cambie su forma.
  if (!esIdentificadorSeguro(applicationId) || !esIdentificadorSeguro(documentId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  // Forward the user's auth token to the backend. Sin token no hay nada que
  // pedir: el back lo negaría igual, y así esta ruta no sirve de proxy anónimo.
  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Get signed URL from backend
  const signRes = await fetch(
    `${BACKEND_URL}/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}/download`,
    { headers: { Authorization: authorization, 'Content-Type': 'application/json' } }
  );

  if (!signRes.ok) {
    return NextResponse.json({ error: 'Could not get download URL' }, { status: signRes.status });
  }

  const { url } = (await signRes.json()) as { url: string };

  if (typeof url !== 'string' || !esUrlDeAlmacenamiento(url)) {
    return NextResponse.json({ error: 'Unexpected download URL' }, { status: 502 });
  }

  // Proxy the file — fetch from Supabase and stream back
  const fileRes = await fetch(url);
  if (!fileRes.ok) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const declarado = (fileRes.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const seMuestra = TIPOS_QUE_SE_MUESTRAN.has(declarado);
  const body = await fileRes.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': seMuestra ? declarado : 'application/octet-stream',
      'Content-Disposition': seMuestra ? 'inline' : 'attachment',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      // Si alguien abre la ruta directo en el navegador, el documento se
      // muestra pero no puede correr nada.
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'",
    },
  });
}
