# KlipDeck

UI web para controlar Klipper con enfoque en **layout editable**, **macros** y **editor de G-code**. Side project: buscaba más **customización y UX/UI** de la que me daba Mainsail. No soy experto en impresión 3D; trabajo **fullstack en Contarg**.

## Qué incluye

- **Dashboard** con grid drag-and-drop, resize y modo edición; widgets de temperatura (gráficos), mesh (visual 3D) y botones de macro.
- **Editor G-code** (Monaco): resaltado, contador de líneas, guardar/copiar/descargar, asistente con OpenAI.
- **Ajustes**: token de OpenAI (solo local), CRUD de macros, referencia rápida de G-code.

## Stack

Next.js 16 (App Router), React 19, Tailwind v4, Zustand, react-grid-layout, Recharts, Monaco, Framer Motion.

## Arranque

```bash
pnpm install && pnpm dev
```

Configurá el token en **Settings** para el asistente de IA. La integración real con Moonraker/Klipper es **pendiente** — ver `INTEGRATION.md`.

## Licencia

MIT
