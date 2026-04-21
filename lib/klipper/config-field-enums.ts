/**
 * Enum-like option lists from the Klipper Configuration Reference
 * (https://www.klipper3d.org/Config_Reference.html) — explicit "one of" / "must be" values.
 */

import type { FormManagedSectionHeader } from '@/lib/klipper/printer-cfg-merge';

/** [printer] kinematics — doc: cartesian, corexy, … or none */
export const KLIPPER_KINEMATICS = [
  'cartesian',
  'corexy',
  'corexz',
  'hybrid_corexy',
  'hybrid_corexz',
  'generic_cartesian',
  'rotary_delta',
  'delta',
  'deltesian',
  'polar',
  'winch',
  'none',
] as const;

/** [mcu] restart_method */
export const KLIPPER_MCU_RESTART_METHOD = ['arduino', 'cheetah', 'rpi_usb', 'command'] as const;

/** [extruder] / [heater_bed] control */
export const KLIPPER_HEATER_CONTROL = ['pid', 'watermark'] as const;

/** [stepper] homing_positive_dir — boolean as in typical printer.cfg */
export const KLIPPER_BOOL_STRING = ['true', 'false'] as const;

/** sensor_type values for heater sections (Klipper Config Reference — Temperature sensors + extruder). */
const KLIPPER_HEATER_SENSOR_TYPE_UNSORTED = [
  'EPCOS 100K B57560G104F',
  'ATC Semitec 104GT-2',
  'ATC Semitec 104NT-4-R025H42G',
  'Generic 3950',
  'Honeywell 100K 135-104LAG-J01',
  'NTC 100K MGB18-104F39050L32',
  'SliceEngineering 450',
  'TDK NTCG104LH104JT1',
  'PT1000',
  'PT100 INA826',
  'AD595',
  'AD597',
  'AD8494',
  'AD8495',
  'AD8496',
  'AD8497',
  'MAX6675',
  'MAX31855',
  'MAX31856',
  'MAX31865',
  'BMP180',
  'BMP280',
  'BME280',
  'BMP388',
  'BME680',
  'AHT1X',
  'AHT2X',
  'AHT3X',
  'HTU21D',
  'SI7013',
  'SI7020',
  'SI7021',
  'SHT21',
  'SHT3X',
  'LM75',
  'temperature_mcu',
  'temperature_host',
  'temperature_combined',
  'DS18B20',
] as const;

export const KLIPPER_HEATER_SENSOR_TYPE: readonly string[] = [...KLIPPER_HEATER_SENSOR_TYPE_UNSORTED].sort(
  (a, b) => a.localeCompare(b)
);

export function getKlipperEnumOptions(
  sectionHeader: FormManagedSectionHeader,
  key: string
): readonly string[] | null {
  const k = key.toLowerCase();

  if (k === 'kinematics' && sectionHeader === 'printer') {
    return KLIPPER_KINEMATICS;
  }
  if (k === 'restart_method' && sectionHeader === 'mcu') {
    return KLIPPER_MCU_RESTART_METHOD;
  }
  if (k === 'homing_positive_dir' && sectionHeader.startsWith('stepper_')) {
    return KLIPPER_BOOL_STRING;
  }
  if (k === 'sensor_type' && (sectionHeader === 'extruder' || sectionHeader === 'heater_bed')) {
    return KLIPPER_HEATER_SENSOR_TYPE;
  }
  if (k === 'control' && (sectionHeader === 'extruder' || sectionHeader === 'heater_bed')) {
    return KLIPPER_HEATER_CONTROL;
  }

  return null;
}

