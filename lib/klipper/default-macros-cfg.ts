/** Fallback `macros.cfg` when Moonraker has none yet (paired with `printer.cfg` + `[include macros.cfg]`). */
export const DEFAULT_MACROS_CFG_TEMPLATE = `[gcode_macro HOME_XY]
description: Home X and Y
gcode:
  G28 X Y
  M117 Homed XY
`;

