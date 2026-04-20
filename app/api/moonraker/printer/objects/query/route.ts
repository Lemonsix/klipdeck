import { moonrakerObjectsQuery } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const objects = body?.objects;
    if (!objects || typeof objects !== 'object' || Array.isArray(objects)) {
      return Response.json(
        { error: 'Expected JSON body: { objects: Record<string, string[] | null> }' },
        { status: 400 }
      );
    }
    const result = await moonrakerObjectsQuery(objects);
    return Response.json(result);
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
