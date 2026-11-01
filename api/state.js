import { put, list } from '@vercel/blob';
const pw = process.env.ADMIN_PASSWORD || '';
const H = { 'cache-control': 'no-store' };

export async function GET() {
  const { blobs } = await list({ prefix: 'site/state.json' });
  if (!blobs.length) return Response.json({}, { headers: H });
  const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
  return new Response(await r.text(), { headers: { ...H, 'content-type': 'application/json' } });
}

export async function PUT(request) {
  if (!pw || request.headers.get('x-admin') !== pw) return new Response('no', { status: 401 });
  const body = await request.text();
  if (body.length > 3_000_000) return new Response('too big', { status: 413 });
  JSON.parse(body);
  await put('site/state.json', body, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60,
  });
  return Response.json({ ok: true });
}
