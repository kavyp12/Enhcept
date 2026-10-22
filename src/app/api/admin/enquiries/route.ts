import { connection } from 'next/server';
import { adminApi, json, listEnquiries } from '@/lib/server';

export async function GET(req: Request) {
  // Cache Components prerenders GET handlers at build time unless they wait for a real request first.
  await connection();
  return adminApi(req, () => json(200, { enquiries: listEnquiries() }));
}
