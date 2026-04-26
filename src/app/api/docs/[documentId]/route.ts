import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  const { documentId } = params;
  const applicationId = req.nextUrl.searchParams.get('app');

  if (!applicationId) {
    return NextResponse.json({ error: 'Missing app param' }, { status: 400 });
  }

  // Forward the user's auth token to the backend
  const authorization = req.headers.get('authorization') ?? '';

  // Get signed URL from backend
  const signRes = await fetch(
    `${BACKEND_URL}/applications/${applicationId}/documents/${documentId}/download`,
    { headers: { Authorization: authorization, 'Content-Type': 'application/json' } }
  );

  if (!signRes.ok) {
    return NextResponse.json({ error: 'Could not get download URL' }, { status: signRes.status });
  }

  const { url } = (await signRes.json()) as { url: string };

  // Proxy the file — fetch from Supabase and stream back
  const fileRes = await fetch(url);
  if (!fileRes.ok) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';
  const body = await fileRes.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-store',
    },
  });
}
