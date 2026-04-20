# KlipDeck - Advanced 3D Printer Control Interface

A modern, neobrutalista-designed interface for Klipper 3D printer control with customizable widgets, drag-and-drop dashboard, AI-assisted GCode editor, and full macro support.

## Features

### Dashboard
- **Drag & Drop Widget System**: Rearrange your dashboard layout in real-time with smooth animations
- **Edit Mode**: Toggle between normal operation and customization mode
- **Real-time Temperature Monitoring**: Live graphs for hotend and bed temperatures
- **Bed Mesh Visualization**: Interactive 3D-like mesh height visualization with color gradients

### Widgets
- **Temperature Widget**: Displays current and target temperatures with historical graphs
- **Mesh Visualization Widget**: Shows bed leveling data with color-coded deviation values
- **Macro Buttons**: Bindable macro buttons that can trigger custom GCode sequences
- Fully customizable widget sizing (grid-based, 1x1 minimum)

### GCode Editor
- **Syntax Highlighting**: Full GCode syntax highlighting via Monaco Editor
- **AI Assistant Integration**: OpenAI-powered GCode generation and suggestions
- **File Management**: Copy, download, and save GCode files
- **Line Counter**: Real-time line and character counting

### Configuration Panel
- **API Configuration**: Set your OpenAI API token for AI assistant features
- **Macro Management**: Create, edit, and delete custom printer macros
- **GCode Reference**: Built-in reference guide for common GCode commands
- **Secure Token Storage**: Tokens stored locally, never sent to external servers

## Project Structure

```
app/
├── page.tsx              # Home/Dashboard page
├── settings/
│   └── page.tsx         # Settings configuration page
├── gcode/
│   └── page.tsx         # GCode editor page
├── layout.tsx           # Root layout with navbar
├── globals.css          # Theme and global styles
└── grid-layout.css      # React Grid Layout styles

components/
├── dashboard.tsx        # Main dashboard with DnD grid
├── navbar.tsx          # Navigation bar
├── gcode-editor.tsx    # GCode editor with AI integration
├── settings-panel.tsx  # Settings and configuration
└── widgets/
    ├── temperature-widget.tsx  # Temperature monitoring
    ├── mesh-widget.tsx        # Bed mesh visualization
    └── macro-widget.tsx       # Macro button widget

lib/
└── store.ts            # Zustand state management
```

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS v4 with custom design tokens
- **State Management**: Zustand
- **Drag & Drop**: @dnd-kit/core and react-grid-layout
- **Charts**: Recharts
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Color Palette (Neobrutalista Dark Theme)

- **Background**: #0a0a0a (Deep black)
- **Card**: #141414 (Dark gray)
- **Primary**: #06b6d4 (Teal)
- **Secondary**: #0d9488 (Emerald green)
- **Border**: #262626 (Charcoal)
- **Destructive**: #ef4444 (Red)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

The application will be available at `http://localhost:3000`

### Configuration

1. **API Token**: Navigate to Settings and enter your OpenAI API key for AI assistant features
2. **Create Macros**: Add custom GCode macros in Settings > Printer Macros
3. **Customize Dashboard**: Click "Edit Layout" to rearrange widgets
4. **GCode Editing**: Use the GCode page for editing and generating code with AI assistance

## Usage

### Dashboard Navigation
- **Home**: Main dashboard with widgets and macros
- **GCode Editor**: Full-featured GCode editor with syntax highlighting
- **Settings**: Configure API tokens, manage macros, and view GCode reference

### Edit Mode
1. Click "Edit Layout" button on the dashboard
2. Drag widgets to rearrange them
3. Drag edges/corners to resize widgets
4. Click "Done Editing" to save changes

### Creating Macros
1. Go to Settings
2. Click "New Macro"
3. Enter macro name and GCode
4. Save and it will be available as a widget

### Using AI Assistant
1. Open GCode Editor
2. Click "AI" button
3. Describe what you want to generate
4. Click "Generate with AI"
5. Review and edit the generated code

## Design Philosophy

This interface follows a **neobrutalista** design approach:
- Bold, geometric borders
- High contrast dark theme
- Minimalist color palette (3-5 colors)
- Technical, no-nonsense typography
- Emphasis on functionality over decoration

## Development Notes

- All widgets are fully configurable and can be added/removed from the store
- The dashboard uses a 12-column grid system for responsive layouts
- All animations use Framer Motion for smooth performance
- API tokens and user data are stored in Zustand (in-memory for now)

## Future Enhancements

- Real Klipper API integration
- Persistent storage (database backend)
- Multi-language support
- Custom widget creation
- Temperature profile management
- Print job history and analytics
- Real-time camera feed integration
- Mobile responsive optimization

## License

MIT
