# KlipDeck - Backend Integration Guide

This document outlines how to integrate KlipDeck with your Klipper instance and backend services.

## Architecture Overview

```
Frontend (KlipDeck)
    ↓
API Layer (Your Backend)
    ↓
Klipper Instance (moonraker/API)
    ↓
3D Printer Hardware
```

## State Management Setup

The application uses Zustand for state management. Current store structure:

```typescript
// lib/store.ts
interface AppState {
  // Widgets
  widgets: Widget[];
  layout: GridLayout[];
  addWidget(widget: Widget): void;
  removeWidget(id: string): void;
  updateLayout(layout: GridLayout[]): void;
  
  // Macros
  macros: Macro[];
  addMacro(macro: Macro): void;
  removeMacro(id: string): void;
  updateMacro(id: string, updates: Partial<Macro>): void;
  
  // Settings
  openaiApiToken: string;
  setOpenaiToken(token: string): void;
  
  // Temperature Data
  temperatureHistory: TempData[];
  addTemperatureData(data: TempData): void;
  
  // Mesh Data
  meshData: number[][];
  setMeshData(data: number[][]): void;
}
```

## API Endpoints to Implement

### Temperature Monitoring
```
GET /api/printer/temps
Response: {
  hotend_temp: number;
  hotend_target: number;
  bed_temp: number;
  bed_target: number;
  timestamp: ISO8601;
}

WebSocket: /ws/printer/temps (for real-time updates)
Event: {
  type: 'temp_update';
  data: { hotend: number; bed: number; time: string };
}
```

### Mesh Leveling
```
GET /api/printer/mesh
Response: {
  name: string;
  points: number[][];
  min: number;
  max: number;
}
```

### Macro Execution
```
POST /api/macros/{macroId}/execute
Body: { params?: Record<string, any> }
Response: { success: boolean; output?: string }

GET /api/macros
Response: Macro[]

POST /api/macros
Body: Macro (create new)
Response: Macro

PUT /api/macros/{id}
Body: Partial<Macro> (update)
Response: Macro

DELETE /api/macros/{id}
Response: { success: boolean }
```

### GCode Execution
```
POST /api/gcode/execute
Body: { code: string }
Response: { success: boolean; output?: string }

GET /api/gcode/validate
Query: ?code=<gcode_string>
Response: { valid: boolean; errors?: string[] }
```

### AI Integration
```
POST /api/ai/gcode
Body: { 
  prompt: string;
  context?: { current_code?: string };
  apiKey: string; // Client-side only
}
Response: { generated_code: string }
```

## Zustand Store - Integration Points

### Adding Real Temperature Data
```typescript
// In a useEffect or real-time listener
import { useStore } from '@/lib/store';

const { addTemperatureData } = useStore();

// WebSocket listener example
socket.on('temp_update', (data) => {
  addTemperatureData({
    timestamp: new Date().toISOString(),
    head: data.hotend_temp,
    bed: data.bed_temp,
  });
});
```

### Managing Macros from Backend
```typescript
const { addMacro, removeMacro, updateMacro } = useStore();

// Sync from backend on mount
useEffect(() => {
  fetch('/api/macros')
    .then(r => r.json())
    .then(macros => {
      macros.forEach(macro => addMacro(macro));
    });
}, []);

// Update backend when macro changes locally
const handleSaveMacro = async (macro: Macro) => {
  const response = await fetch(`/api/macros/${macro.id}`, {
    method: 'PUT',
    body: JSON.stringify(macro),
  });
  
  if (response.ok) {
    updateMacro(macro.id, macro);
  }
};
```

### Persisting Dashboard Layout
```typescript
// Save layout changes to backend
const handleLayoutChange = (layout: GridLayout[]) => {
  updateLayout(layout);
  
  // Persist to backend
  fetch('/api/user/dashboard-layout', {
    method: 'POST',
    body: JSON.stringify({ layout }),
  });
};

// Load on app init
useEffect(() => {
  fetch('/api/user/dashboard-layout')
    .then(r => r.json())
    .then(data => updateLayout(data.layout));
}, []);
```

## Environment Variables

Add these to your `.env.local`:

```
# Klipper/Moonraker API
NEXT_PUBLIC_KLIPPER_API_URL=http://localhost:7125

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: Pre-populate AI model
NEXT_PUBLIC_DEFAULT_AI_MODEL=gpt-4o-mini
```

## Database Schema (Recommended)

If you need persistent storage:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User macros
CREATE TABLE macros (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  gcode TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard layouts
CREATE TABLE dashboard_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  layout JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Temperature history
CREATE TABLE temperature_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  hotend_temp DECIMAL(5,2),
  hotend_target DECIMAL(5,2),
  bed_temp DECIMAL(5,2),
  bed_target DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mesh data
CREATE TABLE bed_meshes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  points JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Real-time Updates with WebSockets

```typescript
// Create a custom hook for real-time updates
export function useKlipperSocket() {
  const { addTemperatureData, setMeshData } = useStore();
  
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL);
    
    socket.on('temperature', (data) => {
      addTemperatureData({
        timestamp: data.timestamp,
        head: data.extruder.actual_temp,
        bed: data.heater_bed.actual_temp,
      });
    });
    
    socket.on('mesh_updated', (mesh) => {
      setMeshData(mesh.points);
    });
    
    return () => socket.disconnect();
  }, []);
}
```

## API Security Considerations

1. **API Token Validation**: Validate OpenAI tokens only on client-side for demo purposes
2. **CORS Configuration**: Set appropriate CORS headers for your backend
3. **Rate Limiting**: Implement rate limiting on macro execution endpoints
4. **Authentication**: Add user authentication before deploying to production
5. **Input Validation**: Validate all GCode before sending to printer

## Testing the Integration

1. Mock the API responses in development:
```typescript
// mock-data.ts
export const mockTemperatureData = {
  hotend_temp: 210.5,
  bed_temp: 60.2,
  hotend_target: 210,
  bed_target: 60,
};
```

2. Use MSW (Mock Service Worker) for consistent API mocking:
```typescript
// handlers.ts
export const handlers = [
  http.get('/api/printer/temps', () => {
    return HttpResponse.json(mockTemperatureData);
  }),
];
```

## Next Steps

1. Implement the backend API endpoints
2. Connect real Klipper/Moonraker instance
3. Add user authentication
4. Implement persistent storage
5. Add WebSocket support for real-time updates
6. Deploy to production with proper security measures

## Support

For questions on integrating with Klipper, refer to:
- [Moonraker API Documentation](https://moonraker.readthedocs.io/)
- [Klipper Documentation](https://www.klipper3d.org/)
