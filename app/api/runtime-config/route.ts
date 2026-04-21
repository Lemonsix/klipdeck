import { readRuntimeConfig, writeRuntimeConfig, type TempPreset } from '@/lib/runtime-config';

export async function GET() {
  const config = await readRuntimeConfig();
  return Response.json({ config });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    moonrakerWsUrl?: string;
    openaiApiToken?: string;
    tempPresets?: TempPreset[];
  };

  let tempPresets: TempPreset[] | undefined;
  if (body.tempPresets !== undefined) {
    if (!Array.isArray(body.tempPresets)) {
      return Response.json({ error: 'tempPresets must be an array' }, { status: 400 });
    }
    tempPresets = body.tempPresets.filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.hotend === 'number' &&
        typeof p.bed === 'number' &&
        Number.isFinite(p.hotend) &&
        Number.isFinite(p.bed)
    );
  }

  const next = await writeRuntimeConfig({
    moonrakerWsUrl: typeof body.moonrakerWsUrl === 'string' ? body.moonrakerWsUrl : undefined,
    openaiApiToken: typeof body.openaiApiToken === 'string' ? body.openaiApiToken : undefined,
    tempPresets,
  });

  return Response.json({ config: next });
}
