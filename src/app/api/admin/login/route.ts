import { api, clientIp, json, limited, passwordOk, readJson, sessionCookie } from '@/lib/server';

export const POST = (req: Request) =>
  api(async () => {
    if (!process.env.ADMIN_PASSWORD) {
      return json(503, { error: 'Admin is not set up yet. Add ADMIN_PASSWORD to the .env file and restart the server.' });
    }
    if (limited('login:' + clientIp(req.headers), 10, 15 * 60e3)) return json(429, { error: 'Too many attempts. Try again in 15 minutes.' });
    const { password } = await readJson(req, 4096);
    if (!passwordOk(password)) return json(401, { error: 'Wrong password.' });
    return json(200, { ok: true }, { 'Set-Cookie': sessionCookie() });
  });
