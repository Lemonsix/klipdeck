import { NextResponse } from 'next/server';
import {
  MoonrakerConfigError,
  MoonrakerHttpError,
  MoonrakerRpcError,
} from './client';

export function moonrakerErrorResponse(err: unknown): NextResponse {
  if (err instanceof MoonrakerConfigError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  if (err instanceof MoonrakerRpcError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: 502 }
    );
  }
  if (err instanceof MoonrakerHttpError) {
    return NextResponse.json(
      { error: err.message, detail: err.body },
      { status: 502 }
    );
  }
  throw err;
}
