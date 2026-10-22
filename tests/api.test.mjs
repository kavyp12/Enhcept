// HTTP tests against a running server: BASE_URL, default http://localhost:3000 (npm run dev).
// They skip when no server answers. The admin password comes from the environment or web/.env.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const envFile = new URL('../.env', import.meta.url);
if (!process.env.ADMIN_PASSWORD && existsSync(envFile)) process.loadEnvFile(envFile);
const PASSWORD = process.env.ADMIN_PASSWORD;

const up = await fetch(BASE, { signal: AbortSignal.timeout(5000) }).then(() => true, () => false);
const skip = !up ? `no server at ${BASE}` : !PASSWORD ? 'ADMIN_PASSWORD not set' : false;

// The dev server is shared and keeps its rate limits (5 enquiries per 10 min per IP), so each run
// poses as its own client. The server takes the right-most X-Forwarded-For hop as the client IP.
const run = `${process.pid}-${Date.now()}`;
const client = { 'X-Forwarded-For': `test-${run}` };
const good = {
  name: '=HYPERLINK("http://evil")', company: `Test run ${run}`, email: 'Ana@Acme.com', phone: '+1 416 555 0100',
  region: 'Canada', size: '10-250 people', services: ['BIM & Engineering', 'AI', 'bogus'], timeline: '1-3 months',
  message: 'Scan-to-BIM for a 3-storey clinic.', website: '', elapsed: 9000,
};
const post = (path, body, headers = {}) =>
  fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...client, ...headers }, body: JSON.stringify(body) });
const get = (path, headers = {}) => fetch(BASE + path, { headers: { ...client, ...headers } });
const del = (id, headers = {}) => fetch(`${BASE}/api/admin/enquiries/${id}`, { method: 'DELETE', headers: { ...client, ...headers } });

let auth, leftover;
after(async () => { if (leftover) await del(leftover, { ...auth, Origin: BASE }); });

test('enquiry flow: submit, admin list, CSV export, delete', { skip }, async () => {
  let r = await post('/api/enquiries', good);
  assert.equal(r.status, 201);
  assert.match((await r.json()).ref, /^ENQ-\d{4,}$/);

  r = await post('/api/enquiries', { ...good, email: 'nope' });
  assert.equal(r.status, 422);
  assert.equal((await r.json()).fields.email, 'Please enter a valid work email.');

  r = await post('/api/enquiries', { ...good, website: 'spam.biz' }); // honeypot: fake success, not stored
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, ref: 'ENQ-0000' });
  r = await post('/api/enquiries', { ...good, elapsed: 300 }); // faster than a person: fake success, not stored
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, ref: 'ENQ-0000' });

  r = await fetch(BASE + '/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'text/plain', ...client }, body: 'hi' });
  assert.equal(r.status, 415);

  r = await post('/api/admin/login', { password: PASSWORD });
  assert.equal(r.status, 200);
  const setCookie = r.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  auth = { Cookie: setCookie.split(';')[0] };

  r = await get('/api/admin/enquiries', auth);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const mine = (await r.json()).enquiries.filter((e) => e.company === good.company);
  assert.equal(mine.length, 1, 'bot submissions must not be stored');
  leftover = mine[0].id;
  assert.equal(mine[0].email, 'ana@acme.com');
  assert.equal(mine[0].services, 'BIM & Engineering, AI', 'unknown services are dropped');

  r = await get('/api/admin/export.csv', auth);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^text\/csv/);
  assert.match(r.headers.get('content-disposition'), /^attachment; filename="enhcept-enquiries-\d{4}-\d\d-\d\d\.csv"$/);
  const csv = Buffer.from(await r.arrayBuffer()).toString('utf8'); // r.text() would drop the BOM
  assert.ok(csv.startsWith('﻿id,created_at,name'));
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`), 'formula cells are neutralised');

  r = await del(leftover, { ...auth, Origin: 'http://evil.test' });
  assert.equal(r.status, 403, 'cross-site delete is blocked');
  r = await del(leftover, auth);
  assert.equal(r.status, 403, 'delete without an Origin is blocked');
  r = await del(leftover, { ...auth, Origin: BASE });
  assert.equal(r.status, 200);
  leftover = null;
  const left = (await (await get('/api/admin/enquiries', auth)).json()).enquiries.filter((e) => e.company === good.company);
  assert.equal(left.length, 0);
});

test('admin API refuses a missing or wrong session, and a wrong password', { skip }, async () => {
  assert.equal((await get('/api/admin/enquiries')).status, 401);
  assert.equal((await get('/api/admin/export.csv')).status, 401);
  assert.equal((await del(1, { Origin: BASE })).status, 401);
  assert.equal((await get('/api/admin/enquiries', { Cookie: `enh_admin=${Date.now() + 3600e3}.forged` })).status, 401);

  const r = await post('/api/admin/login', { password: 'wrong' });
  assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { error: 'Wrong password.' });
  assert.equal(r.headers.get('set-cookie'), null);
});

test('logout clears the cookie', { skip }, async () => {
  const r = await post('/api/admin/logout', {});
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie'), /^enh_admin=; .*Max-Age=0/);
});

test('pages carry the security headers', { skip: up ? false : `no server at ${BASE}` }, async () => {
  const r = await fetch(BASE + '/admin');
  assert.equal(r.status, 200);
  const csp = r.headers.get('content-security-policy');
  for (const part of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "media-src 'self'"]) assert.ok(csp.includes(part), part);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(await r.text(), /<meta name="robots" content="noindex, nofollow"/);
});
