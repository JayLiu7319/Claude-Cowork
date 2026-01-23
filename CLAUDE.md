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
├── .claude/                          # Claude configuration
│   └── settings.local.json
├── assets/                           # Static assets
│   └── partners/                     # Partner resources
├── docs/                             # Documentation
│   └── plans/                        # Implementation plans
│       ├── 2025-01-21-i18n-design.md
│       └── 2025-01-21-i18n-implementation.md
├── locales/                          # Internationalization resources
│   ├── en/                           # English translations
│   │   ├── common.json
│   │   ├── main.json
│   │   └── ui.json
│   ├── zh-CN/                        # Simplified Chinese translations
│   │   ├── common.json
│   │   ├── main.json
│   │   └── ui.json
│   └── index.ts                      # i18n resource loader
├── patches/                          # NPM package patches
│   └── @anthropic-ai%2Fclaude-agent-sdk@0.2.6.patch
├── src/                              # Source code
│   ├── electron/                     # Main process (Node.js)
│   │   ├── libs/                     # Core libraries
│   │   │   ├── claude-settings.ts    # Claude settings reader
│   │   │   ├── config-store.ts       # Configuration persistence
│   │   │   ├── runner.ts             # Claude SDK executor
│   │   │   ├── session-store.ts      # SQLite session storage
│   │   │   └── util.ts               # Utility functions
│   │   ├── i18n.ts                   # Main process i18n setup
│   │   ├── ipc-handlers.ts           # IPC event handlers
│   │   ├── main.ts                   # Application entry point
│   │   ├── pathResolver.ts           # Path resolution utilities
│   │   ├── preload.cts               # Preload script (context bridge)
│   │   ├── types.ts                  # TypeScript type definitions
│   │   └── util.ts                   # Main process utilities
│   └── ui/                           # Renderer process (React)
│       ├── assets/                   # UI assets
│       ├── components/               # React components
│       │   ├── DecisionPanel.tsx     # Permission decision UI
│       │   ├── EventCard.tsx         # Message event display
│       │   ├── PromptInput.tsx       # User input component
│       │   ├── SettingsModal.tsx     # Settings dialog
│       │   ├── Sidebar.tsx           # Session list sidebar
│       │   └── StartSessionModal.tsx # New session dialog
│       ├── hooks/                    # Custom React hooks
│       │   ├── useIPC.ts             # IPC communication hook
│       │   └── useMessageWindow.ts   # Message window hook
│       ├── render/                   # Rendering utilities
│       │   └── markdown.tsx          # Markdown renderer
│       ├── store/                    # State management
│       │   └── useAppStore.ts        # Zustand global store
│       ├── App.tsx                   # Root React component
│       ├── i18n.ts                   # Renderer process i18n setup
│       ├── main.tsx                  # React entry point
│       └── types.ts                  # UI type definitions
├── dist-react/                       # Vite build output (gitignored)
├── dist-electron/                    # Transpiled Electron code (gitignored)
├── out/                              # electron-builder output (gitignored)
├── electron-builder.json             # Electron packaging config
├── package.json                      # Project dependencies
├── tsconfig.json                     # Root TypeScript config
├── tsconfig.app.json                 # UI TypeScript config
├── tsconfig.node.json                # Node TypeScript config
├── vite.config.ts                    # Vite configuration
├── CLAUDE.md                         # This file
├── README.md                         # English README
└── README_ZH.md                      # Chinese README
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
- `i18n.ts` - i18next setup for main process

**Renderer Process** (`src/ui/`):
- `App.tsx` - Main React application component
- `store/useAppStore.ts` - Zustand store handling all UI state and server events
- `hooks/useIPC.ts` - IPC communication abstraction
- `components/` - React components for UI elements
- `i18n.ts` - i18next setup for renderer process

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

### Internationalization (i18n)

The application supports multiple languages using i18next:
- **Main Process**: Uses `i18next` with filesystem backend to load translations
- **Renderer Process**: Uses `react-i18next` with HTTP backend
- **Translation Files**: Organized in `locales/[language]/` directories
- **Supported Languages**: English (en), Simplified Chinese (zh-CN)
- **Namespaces**: `common` (shared), `main` (main process), `ui` (renderer process)

## Coding Standards and Rules

### 🎯 Core Principles

1. **Frontend Development**
   - **MANDATORY**: All frontend modifications MUST use the `vercel-react-best-practices` skill
   - This ensures optimal React performance patterns, proper hook usage, and adherence to Next.js/React best practices
   - Before making any changes to React components, hooks, or UI code, invoke the skill

2. **File and Folder Management**
   - **Code architecture is primarily reflected in the file tree structure**
   - A well-organized, scalable codebase MUST have a clean and clear directory structure
   - Folder organization is the CORE of global code management
   - Group related files together (components, hooks, utilities, types)
   - Follow the principle of "locality of behavior" - related code should be physically close

3. **File Size Limits**
   - **Single file MUST NOT exceed 800 lines of code**
   - When a file approaches or exceeds 800 lines, consider refactoring:
     - Extract reusable components into separate files
     - Split large components into smaller, focused components
     - Move utility functions to dedicated utility files
     - Separate type definitions into `types.ts` files
     - Apply proper component composition and separation of concerns
   - This rule ensures:
     - Better code readability and maintainability
     - Easier code reviews
     - Improved reusability
     - Clearer separation of concerns

### 📁 File Organization Guidelines

- **Group by feature/domain** rather than by file type when it makes sense
- **Keep related files close**: A component and its tests, styles, and types should be nearby
- **Use index files** for cleaner imports where appropriate
- **Naming conventions**:
  - Components: PascalCase (e.g., `SettingsModal.tsx`)
  - Hooks: camelCase with `use` prefix (e.g., `useIPC.ts`)
  - Utilities: camelCase (e.g., `util.ts`)
  - Types: PascalCase for types/interfaces, files can be `types.ts`

### 🚀 Performance and Quality

- Prefer composition over inheritance
- Keep components focused and single-purpose
- Use TypeScript strict mode
- Avoid prop drilling - use context or state management when needed
- Memoize expensive computations
- Lazy load components when appropriate

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

### Adding New UI Components

**IMPORTANT**: Before creating or modifying React components, use the `vercel-react-best-practices` skill.

1. Create component file in `src/ui/components/`
2. Use TypeScript with proper prop types
3. Follow React hooks best practices
4. Consider component composition
5. Keep components under 800 lines - split if necessary
6. Use i18n for all user-facing strings via `useTranslation()` hook

### Adding Translations

1. Add translation keys to `locales/[language]/[namespace].json`
   - `common.json` - Shared translations
   - `main.json` - Main process specific
   - `ui.json` - UI specific
2. Use `useTranslation()` hook in React components
3. Use `i18next.t()` in main process
4. Maintain consistency across all supported languages

## Important Notes

- The app reuses Claude Code's settings file (`~/.claude/settings.json`) - do not create a separate authentication system
- Session IDs are UUIDs generated by the app; `claudeSessionId` is the SDK's session identifier used for resume
- The main process broadcasts all events to all windows (future-proofing for multi-window support)
- SQLite database uses WAL mode for better concurrency
- All user prompts are recorded in session history for replay/debugging
- **Always check file size before committing** - enforce the 800-line limit
- **Think about folder structure first** when adding new features
- **Use the vercel-react-best-practices skill** for all React/UI work
