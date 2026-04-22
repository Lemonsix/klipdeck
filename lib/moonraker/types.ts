/** Moonraker HTTP JSON body (most endpoints). */
export interface MoonrakerOk<T = unknown> {
  result: T;
}

export interface MoonrakerRpcErrorBody {
  error: {
    code: number;
    message: string;
  };
}

export interface MoonrakerPrinterInfo {
  state: string;
  state_message: string;
  hostname: string;
  software_version: string;
  cpu_info: string;
  klipper_path: string;
  python_path: string;
  log_file: string;
  config_file?: string;
  configfile?: string;
  process_id?: number;
  user_id?: number;
  group_id?: number;
}

/** Subset of Klipper object status we care about for the dashboard. */
export interface ExtruderStatus {
  temperature?: number;
  target?: number;
}

export interface HeaterBedStatus {
  temperature?: number;
  target?: number;
}

export interface ToolheadStatus {
  position?: [number, number, number, number?];
  axis_minimum?: [number, number, number, number?];
  axis_maximum?: [number, number, number, number?];
}

export interface GcodeMoveStatus {
  gcode_position?: [number, number, number, number?];
}

/** Subset of Klipper `print_stats` for the PRINT widget. */
export interface PrintStatsStatus {
  filename?: string;
  state?: string;
  message?: string;
  print_duration?: number;
  total_duration?: number;
  info?: { current_layer?: number; total_layer?: number };
}

export interface VirtualSdcardStatus {
  file_path?: string;
  progress?: number;
  is_active?: boolean;
}

export interface DisplayStatusStatus {
  message?: string;
  progress?: number;
}

/** Klipper `bed_mesh` (Moonraker printer_objects). */
export interface BedMeshProfileMeshParams {
  min_x: number;
  max_x: number;
  min_y: number;
  max_y: number;
  x_count: number;
  y_count: number;
  mesh_x_pps: number;
  mesh_y_pps: number;
  algo: 'lagrange' | 'bicubic' | string;
  tension: number;
}

export interface BedMeshProfile {
  points: number[][];
  mesh_params: BedMeshProfileMeshParams;
}

export interface BedMeshStatus {
  profile_name?: string;
  mesh_min?: [number, number];
  mesh_max?: [number, number];
  probed_matrix?: number[][];
  mesh_matrix?: number[][];
  profiles?: Record<string, BedMeshProfile>;
}

export interface PrinterObjectsStatus {
  extruder?: ExtruderStatus;
  heater_bed?: HeaterBedStatus;
  toolhead?: ToolheadStatus;
  gcode_move?: GcodeMoveStatus;
  print_stats?: PrintStatsStatus;
  virtual_sdcard?: VirtualSdcardStatus;
  display_status?: DisplayStatusStatus;
  bed_mesh?: BedMeshStatus;
  [key: string]: unknown;
}

export interface PrinterObjectsQueryResult {
  eventtime: number;
  status: PrinterObjectsStatus;
}

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: number;
};

export type JsonRpcResponse =
  | { jsonrpc: '2.0'; result: unknown; id: number }
  | { jsonrpc: '2.0'; error: { code: number; message: string }; id?: number };

export type JsonRpcNotification = {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
};
