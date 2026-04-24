import type { Widget } from '@/lib/store';

export type WidgetLibraryItem = {
  type: Widget['type'];
  title: string;
  description: string;
  section: 'Control' | 'Monitoring' | 'Printing' | 'System';
};

export const WIDGET_LIBRARY_ITEMS: WidgetLibraryItem[] = [
  {
    type: 'motion',
    title: 'Manual Move',
    description: 'Move X/Y/Z axes with jog controls.',
    section: 'Control',
  },
  {
    type: 'estop',
    title: 'Emergency Stop',
    description: 'Quick-stop button for immediate halt.',
    section: 'Control',
  },
  {
    type: 'macro',
    title: 'Macro Button',
    description: 'Preconfigured HOME_XY macro shortcut.',
    section: 'Control',
  },
  {
    type: 'temperature',
    title: 'Temperature Monitor',
    description: 'Track hotend and bed temperatures.',
    section: 'Monitoring',
  },
  {
    type: 'mesh',
    title: 'Bed Mesh',
    description: 'Visualize bed leveling mesh.',
    section: 'Monitoring',
  },
  {
    type: 'console',
    title: 'G-code Console',
    description: 'Run and inspect manual G-code.',
    section: 'Monitoring',
  },
  {
    type: 'print',
    title: 'Print',
    description: 'Select files and control print jobs.',
    section: 'Printing',
  },
  {
    type: 'prusaslicer',
    title: 'PrusaSlicer',
    description: 'Launch PrusaSlicer quickly.',
    section: 'Printing',
  },
  {
    type: 'nav',
    title: 'Navigation',
    description: 'Route links and dashboard actions.',
    section: 'System',
  },
];

function nextWidgetY(widgets: Widget[]): number {
  return widgets.reduce((maxY, widget) => Math.max(maxY, widget.y + widget.h), 0);
}

function makeWidgetId(type: Widget['type']): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createLibraryWidget(type: Widget['type'], widgets: Widget[]): Widget {
  const y = nextWidgetY(widgets);

  switch (type) {
    case 'temperature':
      return { id: makeWidgetId(type), type, x: 0, y, w: 3, h: 3, config: { showGraph: true } };
    case 'macro':
      return {
        id: makeWidgetId(type),
        type,
        x: 0,
        y,
        w: 3,
        h: 1,
        config: {
          klipperMacroName: 'HOME_XY',
          buttonLabel: 'Home',
          icon: 'home',
          sizeVariant: '3x1',
          color: '#06b6d4',
        },
      };
    case 'mesh':
      return { id: makeWidgetId(type), type, x: 0, y, w: 6, h: 6, config: {} };
    case 'console':
      return { id: makeWidgetId(type), type, x: 0, y, w: 4, h: 4, config: {} };
    case 'motion':
      return { id: makeWidgetId(type), type, x: 0, y, w: 4, h: 3, config: {} };
    case 'print':
      return { id: makeWidgetId(type), type, x: 0, y, w: 6, h: 6, config: {} };
    case 'nav':
      return { id: makeWidgetId(type), type, x: 0, y, w: 3, h: 3, config: {} };
    case 'estop':
      return {
        id: makeWidgetId(type),
        type,
        x: 0,
        y,
        w: 3,
        h: 1,
        config: { sizeVariant: '3x1' },
      };
    case 'prusaslicer':
      return { id: makeWidgetId(type), type, x: 0, y, w: 1, h: 1, config: {} };
    case 'status':
    case 'files':
      return { id: makeWidgetId(type), type, x: 0, y, w: 3, h: 2, config: {} };
    default:
      return { id: makeWidgetId(type), type, x: 0, y, w: 3, h: 2, config: {} };
  }
}
