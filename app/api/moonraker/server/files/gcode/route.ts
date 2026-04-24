import { moonrakerReadGcodeFile } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename')?.trim() ?? '';
    if (!filename) {
      return Response.json({ error: 'filename query param required' }, { status: 400 });
    }
    const contents = await moonrakerReadGcodeFile(filename);
    return Response.json({ filename, contents });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
