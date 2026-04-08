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
│   ├── App.jsx                  # Main app, state management, upload orchestration
│   ├── main.jsx                 # React entry point
│   ├── index.css                # All styles
│   ├── components/
│   │   ├── FileUpload.jsx       # Drag-and-drop file upload with CSV/TSV/HDF5 format selector
│   │   ├── ControlsUpload.jsx   # Control gene list upload (text files)
│   │   ├── LibrarySelect.jsx    # sgRNA library dropdown + custom upload + pretrained toggle
│   │   ├── HelpTooltip.jsx      # Hover/click help tooltips for input fields
│   │   ├── StatusBar.jsx        # Job status display with spinner
│   │   ├── ErrorModal.jsx       # Error display modal with close button
│   │   ├── Sidebar.jsx          # Previous jobs list for resuming analysis
│   │   ├── LogDisplay.jsx       # Auto-scrolling server log output
│   │   ├── ResultsPage.jsx      # Initial QC results, "Run Chronos" button
│   │   └── ChronosResultsPage.jsx  # Post-Chronos results (QC, Hits, Differential Dependency tabs)
│   └── hooks/
│       └── useWebSocket.js      # WebSocket connection with auto-reconnect
├── index.html
├── package.json
└── vite.config.js               # Vite config with API proxy to :8000
```

## Pages

### Landing Page (App.jsx)
- Job name input
- File uploads: readcounts, condition map, guide map/library, copy number, controls
- "Run Initial QC" button
- Sidebar shows previous jobs

### Initial QC Results (ResultsPage.jsx)
- Displays QC report sections (LFC distribution, control separation, replicate correlation)
- Server log output
- "Run Chronos" button to continue analysis

### Chronos Results (ChronosResultsPage.jsx)
Three tabbed report sections:
- **QC**: Post-Chronos quality metrics (control separation, efficacy, predictions)
- **Hits**: Hit calling results (FDR volcanos, specific biology)
- **Diff Dep**: Differential dependency analysis between conditions

Sidebar includes:
- Server output log
- Condition comparison controls (two dropdowns + "Compare Conditions" button)
- File download list with multi-select and ZIP download

## Features

- Drag-and-drop file uploads with format detection
- Real-time job status and logs via WebSocket
- Job persistence across page reloads and server restarts
- Auto-reconnecting WebSocket connection
- Tabbed report viewing with inline images
- Bulk file download as ZIP
