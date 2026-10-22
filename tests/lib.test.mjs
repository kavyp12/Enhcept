// Unit tests for the pure logic. Node strips the TypeScript types, so the lib files load as they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, csvCell, toCsv } from '../src/lib/enquiry.ts';
import { sessionCookie, clearedCookie, isAdmin, passwordOk, sameOrigin, limited, clientIp } from '../src/lib/server.ts';

process.env.SESSION_SECRET = 'test-secret';
process.env.ADMIN_PASSWORD = 'test-pass';

const good = {
  name: ' Ana Silva ', company: 'Acme Studio', email: 'Ana@Acme.com', phone: '+1 416 555 0100',
  region: 'Canada', size: '10-250 people', services: ['BIM & Engineering', 'AI', 'AI', 'bogus', 7], timeline: '1-3 months',
  message: 'Scan-to-BIM for a 3-storey clinic.',
};

test('validate cleans a good enquiry', () => {
  const { enquiry, errors } = validate(good);
  assert.deepEqual(errors, {});
  assert.equal(enquiry.name, 'Ana Silva');
  assert.equal(enquiry.email, 'ana@acme.com');
  assert.deepEqual(enquiry.services, ['BIM & Engineering', 'AI'], 'unknown and repeated services are dropped');
});

test('validate gives a message per bad field', () => {
  const { errors } = validate({ name: 'A', company: ' ', email: 'nope', phone: 'call me', region: 'Mars', size: 5, services: 'AI', timeline: 'someday' });
  assert.deepEqual(errors, {
    name: 'Please enter your name.',
    company: 'Please enter your company.',
    email: 'Please enter a valid work email.',
    phone: 'Please check the phone number.',
    region: 'Please choose a region.',
    size: 'Please choose a firm size.',
    services: 'Pick at least one.',
    timeline: 'Please choose a timeline.',
  });
});

test('validate: phone, timeline and message are optional; text is capped', () => {
  assert.deepEqual(validate({ ...good, phone: '', timeline: '', message: undefined }).errors, {});
  assert.equal(validate({ ...good, message: 'x'.repeat(5000) }).enquiry.message.length, 4000);
});

test('csv cells are quoted and formulas neutralised', () => {
  assert.equal(csvCell('=HYPERLINK("http://evil")'), `"'=HYPERLINK(""http://evil"")"`);
  for (const s of ['+1', '-1', '@SUM(A1)', '\tx', '\rx']) assert.equal(csvCell(s), `"'${s}"`);
  assert.equal(csvCell('Acme, "Ltd"'), '"Acme, ""Ltd"""');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(42), '"42"');
});

test('toCsv: BOM, header row, CRLF lines', () => {
  const csv = toCsv([{ id: 1, created_at: '2026-10-21T09:00:00Z', name: 'Ana', company: 'Acme', email: 'a@acme.com', phone: null, region: 'Canada', size: 'Education', services: 'AI', timeline: null, message: 'Hi\nthere' }]);
  assert.equal(csv, '﻿id,created_at,name,company,email,phone,region,size,services,timeline,message\r\n'
    + '"1","2026-10-21T09:00:00Z","Ana","Acme","a@acme.com","","Canada","Education","AI","","Hi\nthere"');
});

test('session cookie: signed, HttpOnly, 8 hours; tampered or expired ones fail', () => {
  const set = sessionCookie();
  assert.match(set, /^enh_admin=\d+\.[\w-]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=28800$/);
  const pair = set.split(';')[0];
  const [exp, sig] = pair.slice('enh_admin='.length).split('.');
  assert.ok(isAdmin(pair));
  assert.ok(isAdmin(`theme=dark; ${pair}; other=1`));
  assert.ok(!isAdmin(`enh_admin=${Number(exp) + 1000}.${sig}`), 'extended expiry');
  assert.ok(!isAdmin(`enh_admin=${exp}.${sig.slice(0, -2)}`), 'cut signature');
  assert.ok(!isAdmin(`enh_admin=${exp}.${sig.at(-1) === 'A' ? sig.slice(0, -1) + 'B' : sig.slice(0, -1) + 'A'}`), 'changed signature');
  assert.ok(!isAdmin(`enh_admin=${exp}`), 'no signature');
  assert.ok(!isAdmin(sessionCookie(Date.now() - 9 * 3600e3).split(';')[0]), 'expired');
  assert.ok(!isAdmin(null));
  assert.ok(!isAdmin(`xenh_admin=${exp}.${sig}`), 'other cookie name');
  process.env.SESSION_SECRET = 'another-secret';
  assert.ok(!isAdmin(pair), 'signed with another secret');
  process.env.SESSION_SECRET = 'test-secret';
  assert.equal(clearedCookie(), 'enh_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
});

test('session cookie is Secure in production', () => {
  const env = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.ok(sessionCookie().endsWith('; Secure'));
    assert.ok(clearedCookie().endsWith('; Secure'));
  } finally {
    process.env.NODE_ENV = env;
  }
});

test('password check', () => {
  assert.ok(passwordOk('test-pass'));
  assert.ok(!passwordOk('test-pas'));
  assert.ok(!passwordOk('test-pass '));
  assert.ok(!passwordOk(['test-pass']));
  assert.ok(!passwordOk(undefined));
  delete process.env.ADMIN_PASSWORD;
  assert.ok(!passwordOk(''), 'no password set means nobody gets in');
  process.env.ADMIN_PASSWORD = 'test-pass';
});

test('same-origin check', () => {
  const h = (extra) => new Headers({ host: 'localhost:3000', ...extra });
  assert.ok(sameOrigin(h({ origin: 'http://localhost:3000' })));
  assert.ok(!sameOrigin(h({ origin: 'http://evil.test' })));
  assert.ok(!sameOrigin(h({ origin: 'http://localhost:3001' })));
  assert.ok(!sameOrigin(h({ origin: 'null' })));
  assert.ok(!sameOrigin(h({})), 'no Origin header');
  assert.ok(sameOrigin(h({ origin: 'https://enhcept.com', 'x-forwarded-host': 'enhcept.com' })), 'behind a proxy');
});

test('rate limiter: max hits per window, per key', () => {
  const t = 1_000_000, ten = 10 * 60e3;
  for (let i = 0; i < 5; i++) assert.equal(limited('unit:a', 5, ten, t + i), false);
  assert.equal(limited('unit:a', 5, ten, t + 10), true, 'sixth in the window');
  assert.equal(limited('unit:b', 5, ten, t + 10), false, 'other keys are separate');
  assert.equal(limited('unit:a', 5, ten, t + ten + 11), false, 'old hits age out');
});

test('client IP is the right-most X-Forwarded-For hop', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '::1' })), '::1');
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })), '203.0.113.9');
  assert.equal(clientIp(new Headers()), 'unknown');
});
