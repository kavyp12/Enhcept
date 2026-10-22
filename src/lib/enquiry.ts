// Enquiry rules shared by the API, the admin and the contact form. No imports, so it is safe in client code.

// Allowed form values. The contact form should import these so the two never drift.
export const REGIONS = ['India', 'United States', 'United Kingdom', 'Europe', 'Canada', 'Australia', 'GCC', 'Other'];
export const SIZES = ['1-10 people', '10-250 people', '250+ people', 'Owner / public body', 'Education'];
export const SERVICES = ['BIM & Engineering', '3D & Mapping', 'Plugins & Tools', 'Software', 'CRM & ERP', 'AI', 'Consulting & Academy', 'Not sure yet'];
export const TIMELINES = ['As soon as possible', '1-3 months', '3-6 months', 'Just exploring'];

// A stored enquiry, as the admin API returns it. `services` is a ", "-joined list.
export type Row = {
  id: number; created_at: string; name: string; company: string; email: string; phone: string | null;
  region: string; size: string; services: string; timeline: string | null; message: string | null;
};

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function validate(body: Record<string, unknown>) {
  const e = {
    name: text(body.name, 120),
    company: text(body.company, 160),
    email: text(body.email, 254).toLowerCase(),
    phone: text(body.phone, 40),
    region: text(body.region, 40),
    size: text(body.size, 40),
    services: Array.isArray(body.services)
      ? [...new Set(body.services.filter((s: unknown): s is string => SERVICES.includes(s as string)))]
      : [],
    timeline: text(body.timeline, 40),
    message: text(body.message, 4000),
  };
  const errors: Record<string, string> = {};
  if (e.name.length < 2) errors.name = 'Please enter your name.';
  if (!e.company) errors.company = 'Please enter your company.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email)) errors.email = 'Please enter a valid work email.';
  if (e.phone && !/^[+()\d\s.-]{6,40}$/.test(e.phone)) errors.phone = 'Please check the phone number.';
  if (!REGIONS.includes(e.region)) errors.region = 'Please choose a region.';
  if (!SIZES.includes(e.size)) errors.size = 'Please choose a firm size.';
  if (!e.services.length) errors.services = 'Pick at least one.';
  if (e.timeline && !TIMELINES.includes(e.timeline)) errors.timeline = 'Please choose a timeline.';
  return { enquiry: e, errors };
}

export type Enquiry = ReturnType<typeof validate>['enquiry'];

// Excel would run cells starting with = + - @ as formulas; prefix them so they stay text.
export function csvCell(v: unknown) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

const COLUMNS = ['id', 'created_at', 'name', 'company', 'email', 'phone', 'region', 'size', 'services', 'timeline', 'message'] as const;

// BOM first so Excel reads the file as UTF-8.
export const toCsv = (rows: Row[]) =>
  '﻿' + [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))].join('\r\n');
