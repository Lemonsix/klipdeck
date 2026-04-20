import { moonrakerListGcodeFiles, moonrakerUploadGcodeFile } from '@/lib/moonraker/client';
import { moonrakerErrorResponse } from '@/lib/moonraker/route-errors';

export async function GET() {
  try {
    const files = await moonrakerListGcodeFiles();
    return Response.json({ files });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return Response.json({ error: 'Expected multipart form with file field' }, { status: 400 });
    }
    await moonrakerUploadGcodeFile(file);
    return Response.json({ ok: true });
  } catch (err) {
    return moonrakerErrorResponse(err);
  }
}
