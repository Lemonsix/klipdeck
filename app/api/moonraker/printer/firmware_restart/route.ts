import { moonrakerFirmwareRestart } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function POST() {
  try {
    await moonrakerFirmwareRestart();
    return Response.json({ ok: true });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
