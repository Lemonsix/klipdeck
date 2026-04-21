import { moonrakerPrintCancel } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function POST() {
  try {
    await moonrakerPrintCancel();
    return Response.json({ ok: true });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
