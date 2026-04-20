import {
  moonrakerReadConfigFile,
  moonrakerWriteConfigFile,
} from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

function resolvePath(url: string): string {
  const u = new URL(url);
  const value = u.searchParams.get('path')?.trim();
  return value && value.length > 0 ? value : 'printer.cfg';
}

export async function GET(request: Request) {
  try {
    const path = resolvePath(request.url);
    const contents = await moonrakerReadConfigFile(path);
    return Response.json({ path, contents });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const path = typeof body?.path === 'string' && body.path.trim() ? body.path.trim() : 'printer.cfg';
    const contents = body?.contents;

    if (typeof contents !== 'string') {
      return Response.json({ error: 'Expected JSON body: { path?: string, contents: string }' }, { status: 400 });
    }

    const result = await moonrakerWriteConfigFile(path, contents);
    return Response.json({ ok: true, path, result });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
