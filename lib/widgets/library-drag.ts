/** HTML5 drag-and-drop payload for widget library → dashboard. */
export const WIDGET_LIBRARY_DRAG_MIME = 'application/x-klipdeck-widget-library';

export const CLOSE_WIDGET_LIBRARY_EVENT = 'klipdeck-close-widget-library';

export function closeWidgetLibrarySheet(): void {
  window.dispatchEvent(new CustomEvent(CLOSE_WIDGET_LIBRARY_EVENT));
}

export function setWidgetLibraryDragData(dataTransfer: DataTransfer, widgetType: string): void {
  dataTransfer.setData(WIDGET_LIBRARY_DRAG_MIME, widgetType);
  dataTransfer.effectAllowed = 'copy';
}

export function isWidgetLibraryDragEvent(e: { dataTransfer: DataTransfer | null }): boolean {
  if (!e.dataTransfer) return false;
  return Array.from(e.dataTransfer.types).includes(WIDGET_LIBRARY_DRAG_MIME);
}
