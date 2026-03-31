# Chronos Portal Client

React frontend for the CRISPR Analysis Portal.

## Requirements

- Node.js 18+

## Setup & Running

```bash
npm install
npm run dev
```

Client runs on http://localhost:5173

## Structure

```
client/
├── src/
│   ├── App.jsx              # Main app component, state management
│   ├── main.jsx             # React entry point
│   ├── index.css            # Styles
│   ├── components/
│   │   ├── FileUpload.jsx       # Drag-and-drop file upload with format selector
│   │   ├── ControlsUpload.jsx   # Control gene list upload
│   │   ├── LibrarySelect.jsx    # sgRNA library dropdown + custom upload
│   │   ├── CompareInput.jsx     # Condition comparison inputs
│   │   ├── StatusBar.jsx        # Job status display with spinner
│   │   └── ErrorModal.jsx       # Error display with acknowledgement
│   └── hooks/
│       └── useWebSocket.js      # WebSocket connection with auto-reconnect
├── index.html
├── package.json
└── vite.config.js           # Vite config with API proxy
```

## Features

- Drag-and-drop file uploads
- Real-time job status via WebSocket
- Job persistence across page reloads and server restarts
- Error handling with retry capability
