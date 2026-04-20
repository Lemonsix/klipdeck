import { moonrakerPrinterInfo } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function GET() {
  try {
    const info = await moonrakerPrinterInfo();
    return Response.json(info);
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
