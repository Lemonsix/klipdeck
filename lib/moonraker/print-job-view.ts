import type { PrinterObjectsStatus } from './types';

export type PrintJobView = {
  jobState: string | null;
  filename: string | null;
  progressPct: number | null;
  currentLayer: number | null;
  totalLayer: number | null;
  printDurationSec: number | null;
  totalDurationSec: number | null;
  displayMessage: string | null;
  sdIsActive: boolean;
};

export const EMPTY_PRINT_JOB_VIEW: PrintJobView = {
  jobState: null,
  filename: null,
  progressPct: null,
  currentLayer: null,
  totalLayer: null,
  printDurationSec: null,
  totalDurationSec: null,
  displayMessage: null,
  sdIsActive: false,
};

export function isActiveJob(view: PrintJobView): boolean {
  return (
    view.sdIsActive ||
    view.jobState === 'printing' ||
    view.jobState === 'paused'
  );
}

export function printJobViewFromStatus(status: PrinterObjectsStatus): PrintJobView {
  const ps = status.print_stats;
  const vs = status.virtual_sdcard;
  const ds = status.display_status;

  const jobState = typeof ps?.state === 'string' ? ps.state : null;
  const filename =
    (typeof ps?.filename === 'string' && ps.filename.length > 0 ? ps.filename : null) ??
    (typeof vs?.file_path === 'string' && vs.file_path.length > 0 ? vs.file_path : null);

  let progressPct: number | null = null;
  if (typeof vs?.progress === 'number' && Number.isFinite(vs.progress)) {
    progressPct = Math.round(Math.min(1, Math.max(0, vs.progress)) * 100);
  } else if (typeof ds?.progress === 'number' && Number.isFinite(ds.progress)) {
    const p = ds.progress;
    progressPct = p <= 1 ? Math.round(p * 100) : Math.round(Math.min(100, Math.max(0, p)));
  }

  const info = ps?.info;
  const currentLayer =
    info && typeof info.current_layer === 'number' ? info.current_layer : null;
  const totalLayer =
    info && typeof info.total_layer === 'number' ? info.total_layer : null;

  return {
    jobState,
    filename,
    progressPct,
    currentLayer,
    totalLayer,
    printDurationSec: typeof ps?.print_duration === 'number' ? ps.print_duration : null,
    totalDurationSec: typeof ps?.total_duration === 'number' ? ps.total_duration : null,
    displayMessage: typeof ds?.message === 'string' ? ds.message : null,
    sdIsActive: vs?.is_active === true,
  };
}
