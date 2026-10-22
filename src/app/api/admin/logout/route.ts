import { clearedCookie, json } from '@/lib/server';

export const POST = () => json(200, { ok: true }, { 'Set-Cookie': clearedCookie() });
