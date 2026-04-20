import { moonrakerStartPrint } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    if (!filename) {
      return Response.json({ error: 'Expected JSON body: { filename: string }' }, { status: 400 });
    }
    await moonrakerStartPrint(filename);
    return Response.json({ ok: true });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
