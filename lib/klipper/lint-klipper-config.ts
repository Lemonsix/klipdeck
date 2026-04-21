export type KlipperLintSeverity = 'error' | 'warning';

export interface KlipperLintIssue {
  line: number;
  column: number;
  endColumn: number;
  severity: KlipperLintSeverity;
  message: string;
  code: string;
}

export interface SectionRule {
  required?: string[];
  allowed: string[];
}

const RULES: Record<string, SectionRule> = {
  printer: {
    required: ['kinematics', 'max_velocity', 'max_accel', 'max_z_velocity', 'max_z_accel'],
    allowed: [
      'kinematics',
      'max_velocity',
      'max_accel',
      'max_z_velocity',
      'max_z_accel',
      'square_corner_velocity',
      'minimum_cruise_ratio',
    ],
  },
  mcu: {
    required: ['serial'],
    allowed: ['serial', 'baud', 'restart_method', 'canbus_uuid', 'canbus_interface'],
  },
  stepper: {
    required: ['step_pin', 'dir_pin', 'enable_pin', 'microsteps', 'rotation_distance'],
    allowed: [
      'step_pin',
      'dir_pin',
      'enable_pin',
      'microsteps',
      'rotation_distance',
      'gear_ratio',
      'full_steps_per_rotation',
      'position_endstop',
      'position_min',
      'position_max',
      'endstop_pin',
      'homing_speed',
      'second_homing_speed',
      'homing_retract_dist',
      'homing_positive_dir',
    ],
  },
  extruder: {
    required: ['step_pin', 'dir_pin', 'enable_pin', 'microsteps', 'rotation_distance', 'heater_pin', 'sensor_type', 'sensor_pin'],
    allowed: [
      'step_pin',
      'dir_pin',
      'enable_pin',
      'microsteps',
      'rotation_distance',
      'gear_ratio',
      'heater_pin',
      'sensor_type',
      'sensor_pin',
      'control',
      'pid_kp',
      'pid_ki',
      'pid_kd',
      'min_temp',
      'max_temp',
      'min_extrude_temp',
      'max_extrude_only_distance',
      'max_extrude_cross_section',
      'nozzle_diameter',
      'filament_diameter',
      'pressure_advance',
      'pressure_advance_smooth_time',
    ],
  },
  heater_bed: {
    required: ['heater_pin', 'sensor_type', 'sensor_pin'],
    allowed: ['heater_pin', 'sensor_type', 'sensor_pin', 'control', 'pid_kp', 'pid_ki', 'pid_kd', 'min_temp', 'max_temp'],
  },
  fan: {
    allowed: ['pin', 'max_power', 'shutdown_speed', 'kick_start_time', 'off_below'],
  },
  bed_mesh: {
    allowed: [
      'speed',
      'horizontal_move_z',
      'mesh_min',
      'mesh_max',
      'probe_count',
      'algorithm',
      'bicubic_tension',
      'fade_start',
      'fade_end',
      'fade_target',
    ],
  },
  gcode_macro: {
    required: ['gcode'],
    allowed: ['description', 'rename_existing', 'variable_*', 'gcode'],
  },
};

export function resolveLintRule(sectionType: string): SectionRule | null {
  if (RULES[sectionType]) return RULES[sectionType];
  if (sectionType.startsWith('stepper_')) return RULES.stepper;
  if (sectionType.startsWith('tmc')) {
    return {
      allowed: [
        'uart_pin',
        'tx_pin',
        'run_current',
        'hold_current',
        'sense_resistor',
        'stealthchop_threshold',
        'diag_pin',
        'driver_sgthrs',
        'interpolate',
      ],
    };
  }
  if (sectionType.startsWith('heater_fan')) return { allowed: ['pin', 'heater', 'heater_temp', 'max_power', 'shutdown_speed'] };
  if (sectionType.startsWith('temperature_sensor')) return { allowed: ['sensor_type', 'sensor_pin', 'min_temp', 'max_temp'] };
  return null;
}

function isAllowedKey(key: string, allowed: string[]): boolean {
  return allowed.some((k) => (k.endsWith('*') ? key.startsWith(k.slice(0, -1)) : k === key));
}

export function lintKlipperConfig(source: string): KlipperLintIssue[] {
  const lines = source.split(/\r?\n/);
  const issues: KlipperLintIssue[] = [];

  let sectionHeader = '';
  let sectionType = '';
  let sectionLine = 0;
  let keysInSection = new Map<string, number>();

  const flushSectionRequired = () => {
    if (!sectionType) return;
    const rule = resolveLintRule(sectionType);
    if (!rule?.required?.length) return;
    for (const required of rule.required) {
      if (!keysInSection.has(required)) {
        issues.push({
          line: sectionLine,
          column: 1,
          endColumn: Math.max(sectionHeader.length, 2),
          severity: 'error',
          message: `Missing required key '${required}' in [${sectionHeader}]`,
          code: 'required-key',
        });
      }
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNo = idx + 1;
    const line = lines[idx];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

    const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch?.[1]) {
      flushSectionRequired();
      sectionHeader = sectionMatch[1].trim();
      sectionType = sectionHeader.split(/\s+/)[0].toLowerCase();
      sectionLine = lineNo;
      keysInSection = new Map();

      const known = resolveLintRule(sectionType);
      if (sectionType === 'gcode_macro') {
        const parts = sectionHeader.split(/\s+/);
        if (parts.length < 2 || !parts[1]) {
          issues.push({
            line: lineNo,
            column: 1,
            endColumn: line.length,
            severity: 'error',
            message: 'gcode_macro requires a macro name',
            code: 'macro-name',
          });
        }
      }
      continue;
    }

    const kv = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) {
      if (!/^\s+/.test(line)) {
        issues.push({
          line: lineNo,
          column: 1,
          endColumn: Math.max(line.length, 2),
          severity: 'error',
          message: 'Expected `key: value` or valid section header',
          code: 'invalid-line',
        });
      }
      continue;
    }

    if (!sectionType) {
      issues.push({
        line: lineNo,
        column: 1,
        endColumn: line.length,
        severity: 'error',
        message: 'Key-value entry outside any section',
        code: 'outside-section',
      });
      continue;
    }

    const key = kv[1].toLowerCase();
    const value = kv[2] ?? '';

    if (keysInSection.has(key)) {
      issues.push({
        line: lineNo,
        column: 1,
        endColumn: line.length,
        severity: 'error',
        message: `Duplicate key '${key}' in [${sectionHeader}]`,
        code: 'duplicate-key',
      });
    }
    keysInSection.set(key, lineNo);

    const rule = resolveLintRule(sectionType);
    if (rule && !isAllowedKey(key, rule.allowed)) {
      issues.push({
        line: lineNo,
        column: 1,
        endColumn: line.length,
        severity: 'error',
        message: `Key '${key}' is not valid for [${sectionHeader}]`,
        code: 'invalid-key',
      });
    }

    if (key.endsWith('_pin') && !value.trim()) {
      issues.push({
        line: lineNo,
        column: 1,
        endColumn: line.length,
        severity: 'error',
        message: `Pin key '${key}' cannot be empty`,
        code: 'empty-pin',
      });
    }

    if (key === 'gcode' && !value.trim()) {
      let hasIndented = false;
      for (let j = idx + 1; j < lines.length; j++) {
        const next = lines[j];
        if (!next.trim()) continue;
        if (/^\s/.test(next)) {
          hasIndented = true;
        }
        break;
      }
      if (!hasIndented) {
        issues.push({
          line: lineNo,
          column: 1,
          endColumn: line.length,
          severity: 'error',
          message: 'gcode key must have an indented macro body',
          code: 'empty-gcode',
        });
      }
    }
  }

  flushSectionRequired();

  return issues;
}
