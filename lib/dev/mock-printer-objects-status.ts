import type { PrinterObjectsStatus } from '@/lib/moonraker/types';

const MESH_ROWS = 17;
const MESH_COLS = 17;
const PROBED_ROWS = 7;
const PROBED_COLS = 7;

function buildMockMeshMatrix(): number[][] {
  return Array.from({ length: MESH_ROWS }, (_, i) =>
    Array.from({ length: MESH_COLS }, (_, j) => {
      const u = i / (MESH_ROWS - 1);
      const v = j / (MESH_COLS - 1);
      return +(
        0.11 * Math.sin(u * Math.PI * 2.1) * Math.cos(v * Math.PI * 1.7) +
        0.05 * Math.cos(u * Math.PI * 3.5) +
        (((i * 11 + j * 17) % 7) / 7 - 0.5) * 0.025
      ).toFixed(4);
    })
  );
}

function buildMockProbedMatrix(): number[][] {
  return Array.from({ length: PROBED_ROWS }, (_, i) =>
    Array.from({ length: PROBED_COLS }, (_, j) => {
      const u = i / (PROBED_ROWS - 1);
      const v = j / (PROBED_COLS - 1);
      return +(
        0.095 * Math.sin((u + 0.08) * Math.PI * 1.8) * Math.cos((v + 0.12) * Math.PI * 1.6) +
        0.04 * Math.cos(u * Math.PI * 2.7) +
        (((i * 5 + j * 3) % 5) / 5 - 0.5) * 0.02
      ).toFixed(4);
    })
  );
}

/** Full `printer.objects` snapshot for dashboard widgets (dev mock). */
export function getMockPrinterObjectsStatus(): PrinterObjectsStatus {
  const mesh_matrix = buildMockMeshMatrix();
  const probed_matrix = buildMockProbedMatrix();
  const mesh_min: [number, number] = [15, 12];
  const mesh_max: [number, number] = [235, 198];
  return {
    extruder: { temperature: 212.4, target: 220 },
    heater_bed: { temperature: 61.2, target: 60 },
    toolhead: {
      position: [142.3, 88.7, 10.2, 0],
      axis_minimum: [0, 0, -0.5, 0],
      axis_maximum: [250, 210, 220, 0],
    },
    gcode_move: { gcode_position: [142.3, 88.7, 10.2, 0] },
    print_stats: {
      state: 'printing',
      filename: 'benchy_coarse.gcode',
      print_duration: 1240,
      total_duration: 1300,
      info: { current_layer: 42, total_layer: 248 },
    },
    virtual_sdcard: {
      file_path: 'benchy_coarse.gcode',
      progress: 0.47,
      is_active: true,
    },
    display_status: {
      message: 'Layer 42/248',
      progress: 0.47,
    },
    bed_mesh: {
      profile_name: 'default',
      mesh_min,
      mesh_max,
      probed_matrix,
      mesh_matrix,
      profiles: {
        default: {
          points: probed_matrix,
          mesh_params: {
            min_x: mesh_min[0],
            max_x: mesh_max[0],
            min_y: mesh_min[1],
            max_y: mesh_max[1],
            x_count: PROBED_COLS,
            y_count: PROBED_ROWS,
            mesh_x_pps: 2,
            mesh_y_pps: 2,
            algo: 'bicubic',
            tension: 0.5,
          },
        },
      },
    },
  } as PrinterObjectsStatus;
}
