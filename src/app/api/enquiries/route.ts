import { validate } from '@/lib/enquiry';
import { api, clientIp, insertEnquiry, json, limited, readJson } from '@/lib/server';

// The contact form posts here. Only POST, so Cache Components never prerenders it.
export const POST = (req: Request) =>
  api(async () => {
    const body = await readJson(req);
    // Bots fill the hidden field or submit faster than a person can. Pretend it worked.
    if (body.website || !(Number(body.elapsed) >= 2500)) return json(200, { ok: true, ref: 'ENQ-0000' });
    const { enquiry, errors } = validate(body);
    if (Object.keys(errors).length) return json(422, { error: 'Please check the highlighted fields.', fields: errors });
    if (limited('form:' + clientIp(req.headers), 5, 10 * 60e3)) {
      return json(429, { error: 'Too many enquiries from your network. Please try again later.' });
    }
    return json(201, { ok: true, ref: 'ENQ-' + String(insertEnquiry(enquiry)).padStart(4, '0') });
  });
