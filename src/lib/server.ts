// Server side of the enquiry API: SQLite storage, admin session, rate limit and JSON helpers.
// Ported from reference/static-draft/server.js. No Next imports, so the tests can load it with plain Node.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Enquiry, Row } from './enquiry';

// Process-wide state lives on globalThis: Next bundles each route on its own and re-runs modules on hot reload.
const g = globalThis as typeof globalThis & { enhDb?: DatabaseSync; enhSecret?: string; enhHits?: Map<string, number[]> };

// --- storage ---------------------------------------------------------------

// Opened on first use, once per process.
function db() {
  if (!g.enhDb) {
    const file = process.env.DB_PATH || join(process.cwd(), 'storage', 'enquiries.db');
    mkdirSync(/* turbopackIgnore: true */ dirname(file), { recursive: true });
    // getBuiltinModule loads node:sqlite at runtime, out of the bundler's sight (Turbopack doesn't know the module).
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
    const d = new DatabaseSync(file);
    d.exec(`CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      name TEXT NOT NULL, company TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
      region TEXT NOT NULL, size TEXT NOT NULL, services TEXT NOT NULL, timeline TEXT, message TEXT
    )`);
    g.enhDb = d;
  }
  return g.enhDb;
}

export function insertEnquiry(e: Enquiry) {
  const { lastInsertRowid } = db()
    .prepare(`INSERT INTO enquiries (name, company, email, phone, region, size, services, timeline, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(e.name, e.company, e.email, e.phone || null, e.region, e.size, e.services.join(', '), e.timeline || null, e.message || null);
  return Number(lastInsertRowid);
}

export const listEnquiries = () => db().prepare('SELECT * FROM enquiries ORDER BY id DESC').all() as Row[];

export const deleteEnquiry = (id: number) => db().prepare('DELETE FROM enquiries WHERE id = ?').run(id);

// --- admin session ---------------------------------------------------------

const SESSION_S = 8 * 3600;
// Without SESSION_SECRET, admin sessions end whenever the server restarts.
const secret = () => process.env.SESSION_SECRET || (g.enhSecret ??= randomBytes(32).toString('hex'));
const sign = (v: string) => createHmac('sha256', secret()).update(v).digest('base64url');
const sha = (s: string) => createHash('sha256').update(s).digest();
const cookie = (value: string, maxAge: number) =>
  `enh_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

export const passwordOk = (password: unknown) =>
  typeof password === 'string' && !!process.env.ADMIN_PASSWORD && timingSafeEqual(sha(password), sha(process.env.ADMIN_PASSWORD));

// The session is "<expiry>.<hmac>" in an HttpOnly cookie.
export function sessionCookie(now = Date.now()) {
  const exp = String(now + SESSION_S * 1000);
  return cookie(`${exp}.${sign(exp)}`, SESSION_S);
}

export const clearedCookie = () => cookie('', 0);

export function isAdmin(cookieHeader: string | null) {
  const m = /(?:^|;\s*)enh_admin=([^;]+)/.exec(cookieHeader || '');
  if (!m) return false;
  const [exp, sig = ''] = m[1].split('.');
  if (!(Number(exp) > Date.now())) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

// Next copies Host into x-forwarded-host when no proxy has set it.
export function sameOrigin(h: Headers) {
  try {
    return new URL(h.get('origin') ?? '').host === (h.get('x-forwarded-host') || h.get('host'));
  } catch {
    return false;
  }
}

// --- rate limit --------------------------------------------------------------

// ponytail: in-memory limiter, per process. Use a shared store if you ever run several instances.
export function limited(key: string, max: number, windowMs: number, now = Date.now()) {
  const hits = (g.enhHits ??= new Map<string, number[]>());
  if (hits.size > 10000) hits.clear();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

// Route handlers can't see the socket. Next fills X-Forwarded-For from it when the header is absent,
// and a reverse proxy appends the address it saw, so the right-most entry is the client.
// ponytail: a client talking straight to `next start` can send its own header; run behind a proxy (you need one for TLS anyway).
export const clientIp = (h: Headers) => (h.get('x-forwarded-for') ?? '').split(',').pop()!.trim() || 'unknown';

// --- JSON in and out ---------------------------------------------------------

export const json = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

// Reads at most `limit` bytes, so a huge body can't fill memory.
export async function readJson(req: Request, limit = 32 * 1024): Promise<Record<string, unknown>> {
  if (!(req.headers.get('content-type') || '').includes('application/json')) throw fail(415, 'Expected JSON.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = req.body?.getReader();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw fail(413, 'Request too large.');
    }
    chunks.push(value);
  }
  let data: unknown;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw fail(400, 'Invalid JSON.');
  }
  if (!data || typeof data !== 'object') throw fail(400, 'Invalid JSON.');
  return data as Record<string, unknown>;
}

type Handler = () => Response | Promise<Response>;

// Thrown errors become JSON: 4xx with their message, anything unexpected as a logged 500.
export async function api(fn: Handler) {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (!status) console.error(err);
    return json(status || 500, { error: status ? (err as Error).message : 'Something went wrong.' });
  }
}

// Admin routes need the session cookie, and anything that changes data must come from our own pages.
export const adminApi = (req: Request, fn: Handler) =>
  api(() => {
    if (!isAdmin(req.headers.get('cookie'))) return json(401, { error: 'Please sign in.' });
    if (req.method !== 'GET' && !sameOrigin(req.headers)) return json(403, { error: 'Blocked: request came from another site.' });
    return fn();
  });
