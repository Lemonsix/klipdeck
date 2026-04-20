# KlipDeck - Usage Examples

## Dashboard Customization Examples

### Creating a Custom Temperature Widget

1. Navigate to Dashboard
2. Click "Edit Layout"
3. The Temperature widget is already included by default
4. Resize by dragging the bottom-right corner
5. Move by dragging the widget itself
6. Click "Done Editing" to save

### Adding Macro Buttons to Dashboard

1. Go to Settings
2. In "Printer Macros" section, click "New Macro"
3. Enter a macro name (e.g., "Preheat Hotend")
4. Enter the GCode:
   ```gcode
   M117 Preheating hotend...
   M104 S210
   M117 Hotend heating to 210C
   ```
5. Click "Save Macro"
6. Return to Dashboard and click "Edit Layout"
7. Your new macro will appear as a widget
8. Arrange it and click "Done Editing"

### Example: Bed Leveling Macro

```gcode
; Start bed leveling sequence
M117 Starting bed leveling...
G28 ; Home all axes
M117 Homing complete
G29 ; Auto bed leveling
M117 Bed leveling complete!
```

### Example: Nozzle Cleaning Macro

```gcode
; Nozzle cleaning routine
M117 Cleaning nozzle...
G28 X Y ; Home XY only
M104 S200 ; Heat nozzle
G1 X10 Y10 Z20 F3000 ; Move away
M109 S200 ; Wait for temp
G1 X50 Y50 Z0.5 F1500 ; Move to clean area
G1 X50 Y100 Z0.5 F3000 E10 ; Extrude while moving
G1 Z10 F3000 ; Retract
M117 Nozzle cleaned!
```

## GCode Editor Examples

### Using the AI Assistant

1. Click "GCode Editor" in navigation
2. Click "AI" button in the header
3. Describe what you want:
   - "Generate a homing sequence"
   - "Create a print start macro"
   - "Write bed leveling code"
4. Click "Generate with AI"
5. Review the generated code
6. Edit if needed
7. Click "Save GCode"

### Generated Code: Simple Print Start

**Prompt**: "Generate a print start sequence"

**Output**:
```gcode
; Print start sequence
G28 ; Home all axes
G29 ; Bed leveling
M104 S210 ; Set hotend temperature
M140 S60 ; Set bed temperature
M109 S210 ; Wait for hotend
M190 S60 ; Wait for bed
G92 E0 ; Reset extruder
G1 Z2.0 F3000 ; Move to start height
G1 X0.1 Y20 Z0.28 F5000.0 ; Move to line start
G1 X0.1 Y200 Z0.28 F1500 E15 ; Prime nozzle
G92 E0 ; Reset extruder
M117 Printing...
```

### Copying Code Between Projects

1. In GCode Editor, select all code (Ctrl+A)
2. Click "Copy" button
3. Paste into your slicer or another tool
4. Code is copied to clipboard with proper formatting

## Settings Configuration

### Setting Up AI Assistant

1. Go to Settings
2. In "API Configuration" section
3. Enter your OpenAI API key (starts with `sk-`)
4. Click "Test" to verify it works
5. Your token is saved locally in browser storage

**Getting an OpenAI API Key**:
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste it in the settings (never share publicly)

### Managing Multiple Macros

Example macro set for a complete workflow:

**Macro 1: Quick Preheat**
```gcode
M104 S210
M140 S60
M117 Preheating...
```

**Macro 2: Auto Leveling**
```gcode
G28
G29
M117 Leveling done
```

**Macro 3: Nozzle Prime**
```gcode
G1 X5 Y5 Z0.3 F1500
G1 X50 Y50 Z0.3 E15 F1500
G1 Z2 E0 F1500
M117 Primed
```

**Macro 4: Print Pause**
```gcode
M25 ; Pause print
M104 S0 ; Turn off hotend
M140 S0 ; Turn off bed
M117 Paused
```

## Advanced Workflow

### Complete Print Preparation Workflow

1. **Create Macros** (in Settings):
   - "Preheat": M104 S210 + M140 S60
   - "Level Bed": G28 + G29
   - "Load Filament": Custom loading sequence
   - "Start Print": Full print start macro

2. **Customize Dashboard**:
   - Place Temperature widget at top
   - Arrange macro buttons for quick access
   - Add Mesh widget to verify leveling

3. **Before Printing**:
   - Click "Preheat" macro
   - Monitor temps in Temperature widget
   - Click "Level Bed" when ready
   - Verify mesh in Mesh widget
   - Use GCode Editor for any adjustments
   - Click "Start Print" macro

### Mesh Visualization Interpretation

The Mesh widget shows bed height deviation:
- **Cyan colors**: Low areas (bed closer to nozzle)
- **Red colors**: High areas (bed farther from nozzle)
- **Numbers**: Deviation in mm

**Example**:
```
-0.2  -0.1   0.0   +0.1
-0.1  +0.2   +0.1   0.0
 0.0   0.0   0.0   -0.1
+0.1  -0.1   0.0   +0.2
```

This mesh shows minor variation (±0.2mm) - good for printing.

## Keyboard Shortcuts (GCode Editor)

- `Ctrl+A`: Select all
- `Ctrl+Z`: Undo
- `Ctrl+Y` or `Ctrl+Shift+Z`: Redo
- `Ctrl+/`: Toggle comment
- `Ctrl+F`: Find
- `Ctrl+H`: Find & Replace
- `Alt+Up/Down`: Move line
- `Alt+Shift+Up/Down`: Duplicate line

## Common GCode Commands Reference

### Homing
- `G28` - Home all axes
- `G28 X Y` - Home only X and Y
- `G28 Z` - Home only Z

### Movement
- `G1 X10 Y20 Z5 F3000` - Move to position at 3000mm/min
- `G0 X10 Y20` - Rapid move (no extrusion)
- `G1 Z10 F1000` - Move Z up 10mm

### Temperature
- `M104 S210` - Set hotend to 210°C (no wait)
- `M109 S210` - Set hotend and wait
- `M140 S60` - Set bed to 60°C (no wait)
- `M190 S60` - Set bed and wait

### Extrusion
- `G92 E0` - Reset extruder position
- `G1 E10 F1500` - Extrude 10mm at 1500mm/min
- `G1 E-2 F2000` - Retract 2mm

### Utilities
- `M117 Message` - Display message
- `M600` - Filament change
- `G29` - Auto bed leveling
- `M25` - Pause print

## Troubleshooting

### AI Assistant Not Working
- Check OpenAI API key is correct
- Verify key hasn't expired
- Check internet connection
- Try a simpler prompt first

### Temperature Widget Not Updating
- Connect your Klipper instance backend
- Check WebSocket connection
- Verify printer is powered on
- Check temperature sensor connections

### Macros Not Executing
- Verify GCode syntax is correct
- Check macro name doesn't conflict
- Ensure printer is homed before movement commands
- Check temperature is safe before movements

### Dashboard Layout Reset
- Layouts are stored in browser localStorage
- Clearing browser data will reset layout
- Export your layout configuration regularly
- Use Settings to backup macro list
