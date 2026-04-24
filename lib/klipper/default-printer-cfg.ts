/** Fallback template when Moonraker config is unreachable or empty. */
export const DEFAULT_PRINTER_CFG_TEMPLATE = `[printer]
kinematics: corexy
max_velocity: 300
max_accel: 3500
max_z_velocity: 15
max_z_accel: 100

[mcu]
serial: /dev/serial/by-id/replace-me

[stepper_x]
step_pin: PB9
dir_pin: !PC13
enable_pin: !PC14
microsteps: 16
rotation_distance: 40
endstop_pin: ^PA5
position_endstop: 0
position_max: 235
homing_speed: 50

[stepper_y]
step_pin: PB8
dir_pin: !PB7
enable_pin: !PC15
microsteps: 16
rotation_distance: 40
endstop_pin: ^PA6
position_endstop: 0
position_max: 235
homing_speed: 50

[stepper_z]
step_pin: PB6
dir_pin: !PB5
enable_pin: !PB4
microsteps: 16
rotation_distance: 8
endstop_pin: probe:z_virtual_endstop
position_min: -2
position_max: 250
homing_speed: 8

[extruder]
step_pin: PB3
dir_pin: !PA15
enable_pin: !PA8
microsteps: 16
rotation_distance: 7.5
nozzle_diameter: 0.400
filament_diameter: 1.750
heater_pin: PA2
sensor_type: EPCOS 100K B57560G104F
sensor_pin: PA1
control: pid
pid_kp: 22.2
pid_ki: 1.08
pid_kd: 114
min_temp: 0
max_temp: 270

[heater_bed]
heater_pin: PA3
sensor_type: EPCOS 100K B57560G104F
sensor_pin: PA0
control: pid
pid_kp: 54.0
pid_ki: 0.77
pid_kd: 948.0
min_temp: 0
max_temp: 130

[include macros.cfg]
`;
