import { connection } from 'next/server';
import { toCsv } from '@/lib/enquiry';
import { adminApi, listEnquiries } from '@/lib/server';

export async function GET(req: Request) {
  // Cache Components prerenders GET handlers at build time unless they wait for a real request first.
  await connection();
  return adminApi(req, () => {
    const day = new Date().toISOString().slice(0, 10);
    return new Response(toCsv(listEnquiries()), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="enhcept-enquiries-${day}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
