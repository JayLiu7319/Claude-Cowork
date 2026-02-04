# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agent Cowork** is an Electron-based desktop application that provides a GUI for the Claude Agent SDK. It acts as an open-source alternative to Claude Code's terminal interface, offering visual feedback, session management, and task tracking for AI-assisted development.

The application is built with:
- **Electron** for the desktop application shell
- **React 19** with TypeScript for the UI
- **Vite** for development and building
- **Zustand** for state management
- **Tailwind CSS v4** for styling
- **@anthropic-ai/claude-agent-sdk** for Claude AI integration
- **better-sqlite3** for session persistence
- **i18next** for internationalization (i18n) support

## Project Structure

```
Claude-Cowork/
├── .agent/                           # Agent configuration
│   └── skills/                       # AI skill definitions
├── assets/                           # Static assets
├── brands/                           # Brand specific configurations
│   ├── business.json
│   └── bio-research.json
├── docs/                             # Documentation
├── locales/                          # Internationalization resources
│   ├── en/                           # English translations
│   │   ├── common.json
│   │   ├── main.json
│   │   └── ui.json
│   ├── zh-CN/                        # Simplified Chinese translations
│   └── index.ts                      # i18n resource loader
├── patches/                          # NPM package patches
├── resources/                        # Build-time resources
├── scripts/                          # Build and dev scripts
│   ├── dev-runner.ts                 # Development runner
│   ├── setup-plugins.ts              # Plugin setup script
│   ├── write-brand-info.ts           # Brand info writer
│   └── validate-icon.cjs             # Icon validation
├── src/                              # Source code
│   ├── electron/                     # Main process (Node.js)
│   │   ├── aggregators/              # Data aggregation services
│   │   ├── handlers/                 # IPC event handlers modules
│   │   │   ├── index.ts              # ClientEvent dispatcher
│   │   │   ├── file-handlers.ts
│   │   │   ├── session-crud.ts
│   │   │   ├── session-lifecycle.ts
│   │   │   └── session-permissions.ts
│   │   ├── libs/                     # Core libraries
│   │   │   ├── config/               # Configuration management
│   │   │   ├── features/             # Feature modules (commands, skills)
│   │   │   ├── session/              # Session store and management
│   │   │   │   └── runner/           # Claude SDK runner logic
│   │   │   └── utils/                # Shared utilities
│   │   ├── services/                 # Backend services
│   │   │   ├── broadcast-service.ts
│   │   │   ├── server-event-emitter.ts
│   │   │   └── session-state-updater.ts
│   │   ├── dev-utils.ts              # Development utilities
│   │   ├── i18n.ts                   # Main process i18n setup
│   │   ├── ipc-registry.ts           # Central IPC registration
│   │   ├── lifecycle.ts              # App lifecycle management
│   │   ├── main.ts                   # Application entry point
│   │   ├── preload.cts               # Preload script
│   │   └── window-manager.ts         # Window creation and management
│   ├── shared/                       # Shared types (Main/Renderer)
│   │   ├── types/                    # Cross-boundary type definitions
│   │   │   └── index.ts              # Single source of truth for types
│   │   ├── extractors/               # Data extraction utilities
│   │   └── index.ts                  # Barrel export
│   └── ui/                           # Renderer process (React)
│       ├── assets/                   # UI assets
│       ├── components/               # React components (Atomic/Modular)
│       │   ├── ChatView/             # Chat interface components
│       │   ├── EventCard/            # Message event display
│       │   ├── RightPanel/           # Right side info panel
│       │   ├── Sidebar/              # Session list sidebar
│       │   ├── WelcomePage/          # Welcome screen
│       │   └── EnhancedPromptInput/  # Rich text input component
│       ├── hooks/                    # Custom React hooks
│       │   ├── index.ts              # Barrel export
│       │   ├── useAppSelectors.ts    # Zustand selector hooks
│       │   ├── useBrandTheme.ts      # Brand theming hook
│       │   ├── useElectronBridge.ts  # Electron bridge context
│       │   ├── useIPC.ts             # IPC communication hook
│       │   ├── useMessageWindow.ts   # Message windowing hook
│       │   ├── usePartialMessage.ts  # Streaming message hook
│       │   ├── usePromptActions.ts   # Prompt action handlers
│       │   ├── useResponsiveLayout.ts # Responsive layout logic
│       │   └── useScrollManagement.ts # Scroll behavior hook
│       ├── providers/                # Context providers
│       │   ├── AppProviders.tsx      # Combined app providers
│       │   └── ElectronBridgeProvider.tsx
│       ├── services/                 # Frontend services
│       │   ├── electron-bridge.ts    # IPC bridge service
│       │   └── error-service.ts      # Error handling service
│       ├── store/                    # Zustand global store
│       │   └── useAppStore.ts        # Central state store
│       ├── utils/                    # UI utility functions
│       │   ├── index.ts              # Barrel export
│       │   ├── formatters.ts
│       │   ├── markdownUtils.ts
│       │   ├── textMeasurement.ts
│       │   └── tokenUtils.ts
│       ├── App.tsx                   # Root React component
│       └── main.tsx                  # React entry point
├── dist-react/                       # Vite build output
├── dist-electron/                    # Transpiled Electron code
├── package.json                      # Project dependencies
└── vite.config.ts                    # Vite configuration
```

## Development Commands

### Running the Application

```bash
# Start development mode (runs both Vite dev server and Electron)
bun run dev

# Run only the React dev server
bun run dev:react

# Run only Electron (requires transpiled electron code)
bun run dev:electron

# Transpile Electron TypeScript code
bun run transpile:electron

# Run with specific brand configuration
bun run dev:business
bun run dev:bio
```

### Building and Distribution

```bash
# Type check and build React app
bun run build

# Build with specific brand
bun run build:business
bun run build:bio

# Build production binaries
bun run dist:mac-arm64    # macOS Apple Silicon
bun run dist:mac-x64      # macOS Intel
bun run dist:win          # Windows x64
bun run dist:linux        # Linux x64

# Build branded binaries (examples)
bun run dist:business:mac-arm64
bun run dist:bio:win
```

### Code Quality

```bash
# Run ESLint
bun run lint

# Rebuild native modules (better-sqlite3)
bun run rebuild

# Run tests
bun run test

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage
```

### Plugin Management

```bash
# Setup plugins (runs automatically in dev/build)
bun run setup-plugins

# Update plugins
bun run setup-plugins:update
```

## Architecture

### Modular Main Process

The Main Process (`src/electron/`) has been refactored into a modular architecture:

- **Entry Point** (`main.ts`): Orchestrates initialization, i18n, and lifecycle events (~30 lines).
- **IPC Registry** (`ipc-registry.ts`): Centralizes the registration of all IPC handlers.
- **Handlers** (`handlers/`): Specific logic for IPC events, split by domain:
  - `index.ts`: ClientEvent dispatcher
  - `session-crud.ts`: Session CRUD operations
  - `session-lifecycle.ts`: Session start/continue/stop
  - `session-permissions.ts`: Permission handling
  - `file-handlers.ts`: File operations
- **Libraries** (`libs/`): Core logic grouped by functional area:
  - `config/`: Configuration persistence and management
  - `session/`: SQLite session storage and state management
    - `runner/`: Claude SDK runner with plugin loading
  - `features/`: Slash commands and skills loading
  - `utils/`: Common helpers (file operations, title generation)
- **Services** (`services/`): Broadcast and state update services
- **Window Management** (`window-manager.ts`): Handles browser window creation and configuration.

### Shared Types

The `src/shared/` directory contains the single source of truth for all cross-boundary types used by both Main and Renderer processes. Key types include:

- `SessionInfo`, `SessionStatus`: Session metadata
- `StreamMessage`, `UserPromptMessage`: Message types
- `ServerEvent`, `ClientEvent`: IPC event types
- `BrandConfig`, `ApiConfig`: Configuration types
- `EventPayloadMapping`, `IpcArgsMapping`: Type-safe IPC definitions

### Enhanced Renderer Process

The Renderer Process (`src/ui/`) follows a feature-based and hook-centric architecture:

- **Providers** (`providers/`): Context providers for app-wide services (e.g., `ElectronBridgeProvider`, `AppProviders`).
- **Services** (`services/`): Singleton services for communication and error handling.
- **Components** (`components/`): Large components are split into directories with dedicated sub-components.
- **Hooks** (`hooks/`): Complex logic extracted into custom hooks with barrel export via `index.ts`.
- **State** (`store/`): Zustand store (`useAppStore.ts`) handles global UI state and server events.
- **Utils** (`utils/`): Utility functions with barrel export via `index.ts`.

### Event Flow

1. **Frontend Action** → UI Component calls hook → `window.electron` bridge.
2. **IPC Bridge** → `preload.cts` → `ipcMain` in Main Process.
3. **Routing** → `ipc-registry.ts` or `handlers/index.ts` routes to specific handler.
4. **Processing** → Handler invokes `libs/*` or `services/*` logic.
5. **Feedback** → Result returned to UI or `server-event` broadcast to all windows.

## Coding Standards and Rules

### 🎯 Core Principles

1.  **Strict Modularization**
    *   **Max 800 Lines**: No file should exceed 800 lines. Refactor immediately if approached.
    *   **Directory-first**: Prefer creating a directory for a component (`Button/index.tsx`, `Button/styles.css`) over a single huge file if it grows.

2.  **Frontend Development**
    *   **MANDATORY**: Use the `vercel-react-best-practices` skill for all UI changes (located in `.agent/skills/`).
    *   **Hooks**: Extract logic into custom hooks (`src/ui/hooks/`) to keep components presentational.
    *   **Composition**: Use component composition over complex prop drilling.

3.  **Type Safety**
    *   **Shared Types**: Use types from `src/shared/types/` for cross-boundary communication.
    *   **Explicit Imports**: Implementation files should export what is needed; use `index.ts` for clean public APIs of modules.

4.  **File Organization**
    *   **Locality of Behavior**: Keep related code close.
    *   **Barrel Exports**: Use `index.ts` files for clean module APIs (see `hooks/index.ts`, `utils/index.ts`).

### 🚀 Performance

*   Use `React.memo` and `useCallback` judiciously to prevent unnecessary re-renders.
*   Virtualize long lists in the UI (e.g., chat history).
*   Offload heavy fs/processing to the Main Process.

## Common Workflows

### Adding a New IPC Handler

1.  Define the handler logic in a new or existing file in `src/electron/handlers/`.
2.  If it's a ClientEvent, add the case to `handlers/index.ts`.
3.  If it's a direct invoke, register in `src/electron/ipc-registry.ts`.
4.  Add the corresponding types in `src/shared/types/index.ts`.
5.  Expose via `preload.cts` and update `src/ui/services/electron-bridge.ts`.

### Adding a New UI Feature

1.  Create a directory in `src/ui/components/[FeatureName]/`.
2.  Implement the UI using sub-components.
3.  Create a custom hook in `src/ui/hooks/use[FeatureName].ts` for logic.
4.  Export from `src/ui/hooks/index.ts`.
5.  If global state is needed, add to `src/ui/store/useAppStore.ts`.
6.  Use `useTranslation` for all text.

### Internationalization

*   **Main Process**: Use `i18n.t(key)` from `src/electron/i18n.ts`.
*   **Renderer**: Use `const { t } = useTranslation([namespace])`.
*   **Files**: Update `locales/{en,zh-CN}/{common,main,ui}.json`.

### Multi-Brand Builds

The project supports multiple brand configurations:

1.  **Brand Config Files**: Located in `brands/` (e.g., `business.json`, `bio-research.json`).
2.  **Environment Variable**: Set `BRAND=business` or `BRAND=bio-research`.
3.  **Build Commands**: Use `bun run dist:business:*` or `bun run dist:bio:*`.
4.  **Config Loading**: `src/electron/libs/config/brand-config.ts` loads the appropriate config.
