import { adminApi, deleteEnquiry, json } from '@/lib/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminApi(req, () => {
    if (!/^\d+$/.test(id)) return json(404, { error: 'Not found.' });
    deleteEnquiry(Number(id));
    return json(200, { ok: true });
  });
}
