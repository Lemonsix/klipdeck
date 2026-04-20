import { readRuntimeConfig, writeRuntimeConfig } from '@/lib/runtime-config';

export async function GET() {
  const config = await readRuntimeConfig();
  return Response.json({ config });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    moonrakerWsUrl?: string;
    openaiApiToken?: string;
  };

  const next = await writeRuntimeConfig({
    moonrakerWsUrl: typeof body.moonrakerWsUrl === 'string' ? body.moonrakerWsUrl : undefined,
    openaiApiToken: typeof body.openaiApiToken === 'string' ? body.openaiApiToken : undefined,
  });

  return Response.json({ config: next });
}
