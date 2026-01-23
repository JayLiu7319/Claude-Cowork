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
```

### Building and Distribution

```bash
# Type check and build React app
bun run build

# Build production binaries
bun run dist:mac-arm64    # macOS Apple Silicon (M1/M2/M3)
bun run dist:mac-x64      # macOS Intel
bun run dist:win          # Windows x64
bun run dist:linux        # Linux x64
```

### Code Quality

```bash
# Run ESLint
bun run lint

# Rebuild native modules (better-sqlite3)
bun run rebuild
```

## Architecture

### Dual-Process Architecture

The application follows Electron's main/renderer process architecture:

**Main Process** (`src/electron/`):
- `main.ts` - Application entry point, window creation, IPC setup
- `ipc-handlers.ts` - Client event routing and session orchestration
- `libs/runner.ts` - Claude Agent SDK integration and execution
- `libs/session-store.ts` - SQLite-based session persistence
- `libs/claude-settings.ts` - Reads `~/.claude/settings.json` for API configuration
- `libs/config-store.ts` - Saves API configuration to user data directory
- `preload.cts` - Bridge between main and renderer processes

**Renderer Process** (`src/ui/`):
- `App.tsx` - Main React application component
- `store/useAppStore.ts` - Zustand store handling all UI state and server events
- `hooks/useIPC.ts` - IPC communication abstraction
- `components/` - React components for UI elements

### Event Flow

1. **User Action** → UI component dispatches IPC event via `window.electron.send()`
2. **Client Event** → Main process receives event in `ipc-handlers.ts`
3. **Session Management** → `SessionStore` creates/updates/deletes sessions in SQLite
4. **Claude Execution** → `runner.ts` invokes Claude Agent SDK with proper configuration
5. **Server Events** → Stream events are broadcast to all renderer windows
6. **State Update** → `useAppStore` handles server events and updates UI state

### Session Management

Sessions are persisted in SQLite (`sessions.db` in userData directory) with:
- Session metadata (id, title, status, cwd, timestamps)
- Message history (streamed SDK messages)
- Claude session IDs for resume capability
- Pending permission requests

### API Configuration

The app supports two configuration sources (priority order):
1. User-provided config saved in `config-store.ts` (stored in userData)
2. Claude Code settings from `~/.claude/settings.json`

Configuration includes:
- API key
- Model selection
- Base URL (for custom endpoints)

### Permission Handling

The app uses `bypassPermissions` mode but intercepts `AskUserQuestion` tool calls to show permission dialogs. Other tools are auto-approved. Permission requests are stored in session state and resolved when user responds.

## Key Technical Details

### Build Output Structure

- `dist-react/` - Vite build output (React app)
- `dist-electron/` - Transpiled Electron code
- Both are bundled by electron-builder into final application

### Patches

The project uses a patched version of `@anthropic-ai/claude-agent-sdk@0.2.6` (see `patches/` directory). This is applied during installation.

### Native Dependencies

`better-sqlite3` requires native compilation. After installation or Node version changes, run `bun run rebuild` to recompile for the current Electron version.

### Development Server Port

The Vite dev server port is configured via the `PORT` environment variable (case-sensitive, must be lowercase in code). Default development workflow kills existing processes on that port before starting.

### Window Management

- Main window uses `hiddenInset` title bar style for macOS integration
- Global shortcut `Cmd/Ctrl+Q` for quit
- All sessions are properly cleaned up on app quit to prevent orphaned processes

## Common Workflows

### Adding a New Server Event Type

1. Add type to `src/electron/types.ts` (ServerEvent union)
2. Add corresponding UI type to `src/ui/types.ts` if needed
3. Emit event from `ipc-handlers.ts` using `emit()` function
4. Handle in `useAppStore.ts` `handleServerEvent()` switch statement

### Adding a New IPC Handler

1. Add client event type to `src/electron/types.ts`
2. Add handler case in `ipc-handlers.ts` `handleClientEvent()`
3. Add corresponding UI hook/function in `src/ui/hooks/useIPC.ts`
4. Use in components via the hook

### Modifying Claude SDK Configuration

Edit `src/electron/libs/runner.ts` `runClaude()` function where the `query()` call is made. Configuration options include:
- `cwd` - Working directory
- `resume` - Session ID for continuation
- `env` - Environment variables
- `permissionMode` - Permission handling strategy
- `canUseTool` - Custom tool permission handler

## Important Notes

- The app reuses Claude Code's settings file (`~/.claude/settings.json`) - do not create a separate authentication system
- Session IDs are UUIDs generated by the app; `claudeSessionId` is the SDK's session identifier used for resume
- The main process broadcasts all events to all windows (future-proofing for multi-window support)
- SQLite database uses WAL mode for better concurrency
- All user prompts are recorded in session history for replay/debugging
