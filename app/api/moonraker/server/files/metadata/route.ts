import { moonrakerGetFileMetadata } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename')?.trim() ?? '';
    if (!filename) {
      return Response.json({ error: 'filename query param required' }, { status: 400 });
    }
    const metadata = await moonrakerGetFileMetadata(filename);
    return Response.json({ filename, metadata });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
