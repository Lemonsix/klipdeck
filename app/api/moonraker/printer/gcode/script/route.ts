import { moonrakerGcodeScript } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const script = body?.script;
    if (typeof script !== 'string' || !script.trim()) {
      return Response.json(
        { error: 'Expected JSON body: { script: string }' },
        { status: 400 }
      );
    }
    const result = await moonrakerGcodeScript(script);
    return Response.json({ result });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
