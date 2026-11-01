import { put } from '@vercel/blob';
const pw = process.env.ADMIN_PASSWORD || '';

export async function POST(request) {
  if (!pw || request.headers.get('x-admin') !== pw) return new Response('no', { status: 401 });
  const raw = new URL(request.url).searchParams.get('name') || 'file';
  const name = raw.replace(/[^\w.\-]+/g, '_').slice(0, 80);
  const blob = await put('uploads/' + name, request.body, {
    access: 'public', addRandomSuffix: true,
    contentType: request.headers.get('content-type') || undefined,
  });
  return Response.json({ url: blob.url });
}
