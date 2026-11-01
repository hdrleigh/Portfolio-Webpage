import { put, list } from '@vercel/blob';
import { createHash, randomUUID } from 'node:crypto';
const pw = process.env.ADMIN_PASSWORD || '';
const admin = (r) => !!pw && r.headers.get('x-admin') === pw;
// the inbox file name is derived from your password, so its URL can't be guessed
const FILE = 'inbox-' + createHash('sha256').update('inbox' + pw).digest('hex').slice(0, 24) + '/messages.json';
const json = (d, s = 200) => Response.json(d, { status: s, headers: { 'cache-control': 'no-store' } });

async function read() {
  const { blobs } = await list({ prefix: FILE });
  if (!blobs.length) return [];
  const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
  return r.ok ? await r.json() : [];
}
const write = (m) => put(FILE, JSON.stringify(m), {
  access: 'public', addRandomSuffix: false, allowOverwrite: true,
  contentType: 'application/json', cacheControlMaxAge: 60,
});

export async function GET(r) {
  if (!admin(r)) return json({ error: 'no' }, 401);
  return json(await read());
}

export async function POST(r) {
  if (!pw) return json({ error: 'not configured' }, 500);
  const b = await r.json().catch(() => null);
  if (!b) return json({ error: 'bad request' }, 400);
  const text = String(b.text || '').slice(0, 400);
  let img = null;
  if (typeof b.img === 'string' && b.img.startsWith('data:image/png;base64,') && b.img.length < 900000) {
    const o = await put('doodles/doodle.png', Buffer.from(b.img.split(',')[1], 'base64'),
      { access: 'public', addRandomSuffix: true, contentType: 'image/png' });
    img = o.url;
  }
  if (!text && !img) return json({ error: 'empty' }, 400);
  const m = await read();
  m.unshift({ id: randomUUID(), text, img, date: new Date().toISOString() });
  await write(m.slice(0, 500));
  return json({ ok: true });
}

export async function DELETE(r) {
  if (!admin(r)) return json({ error: 'no' }, 401);
  const id = new URL(r.url).searchParams.get('id');
  await write((await read()).filter((x) => x.id !== id));
  return json({ ok: true });
}
