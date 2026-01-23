# 主对话区域问题清单与分析

**文档版本**: 1.0
**创建日期**: 2025-01-23
**状态**: 待修复
**负责区域**: `src/ui/App.tsx`, `src/ui/components/EventCard.tsx`

---

## 概述

本文档全面梳理了 Agent Cowork 主对话区域的用户体验问题，包括已发现的关键问题和产品优化建议。问题按照严重程度分为**关键问题**（P0-P1）和**优化建议**（P2-P3），优先修复影响核心体验的问题。

### 当前架构概述

```
主对话区域结构：
├─ 左侧边栏（会话列表）280px
├─ 中间主区域（消息列表）
│   ├─ 顶部标题栏（draggable）
│   ├─ 消息滚动容器
│   │   ├─ 历史加载指示器
│   │   ├─ 消息卡片列表（MessageCard）
│   │   ├─ 流式输出区域（partialMessage）
│   │   └─ 滚动锚点
│   └─ 底部输入框（PromptInput）
└─ 右侧边栏（缺失）
```

---

## 🔴 关键问题（P0-P1）

### P0-1: 会话切换时的流式输出污染

**问题描述**：
切换会话时，`partialMessage` 和 `partialMessageRef` 没有清理，导致前一个会话的流式内容显示在新会话中。

**代码位置**：
- `src/ui/App.tsx` 第 90-116 行：`handlePartialMessages` 函数
- `src/ui/App.tsx` 第 227-235 行：会话切换时的状态重置

**根本原因**：
```typescript
// 问题代码：
handlePartialMessages 监听所有 stream.message 事件，
但没有检查 event.payload.sessionId === activeSessionId
```

**产品影响**：
- ❌ 严重的数据混乱，破坏用户信任
- ❌ 用户可能看到其他会话的输出内容
- ❌ 流式动画在错误的会话中播放

**修复方案**：

1. 在 `handlePartialMessages` 中添加会话 ID 检查：
```typescript
const handlePartialMessages = useCallback((partialEvent: ServerEvent) => {
  if (partialEvent.type !== "stream.message") return;

  // 添加会话ID检查
  if (partialEvent.payload.sessionId !== activeSessionId) return;

  if (partialEvent.payload.message.type !== "stream_event") return;
  // ... 其余逻辑
}, [shouldAutoScroll, activeSessionId]); // 添加 activeSessionId 依赖
```

2. 在会话切换时重置 partial message 状态：
```typescript
// Reset scroll state on session change
useEffect(() => {
  setShouldAutoScroll(true);
  setHasNewMessages(false);
  prevMessagesLengthRef.current = 0;

  // 添加 partial message 重置
  partialMessageRef.current = "";
  setPartialMessage("");
  setShowPartialMessage(false);

  setTimeout(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, 100);
}, [activeSessionId]);
```

**优先级**: P0（立即修复）
**预计工作量**: 30 分钟

---

### P0-2: 工具调用与结果 UI 分离

**问题描述**：
工具调用（ToolUseCard）和工具结果（ToolResult）分别渲染在不同的消息卡片中，导致关联性差，用户难以理解工具的输入输出关系。

**当前渲染结构**：
```
[Assistant Message]
  └─ ToolUseCard (Bash: pwd)         ← 工具调用

[User Message]
  └─ ToolResult (/home/user/project) ← 工具结果（分离）
```

**理想渲染结构**：
```
[Assistant Message]
  └─ ToolUseCard (Bash: pwd)
      ├─ 参数: pwd
      ├─ 状态: ✓ Success
      └─ 结果: /home/user/project    ← 内嵌显示
```

**代码位置**：
- `src/ui/components/EventCard.tsx` 第 176-211 行：`ToolUseCard` 组件
- `src/ui/components/EventCard.tsx` 第 109-161 行：`ToolResult` 组件
- `src/ui/components/EventCard.tsx` 第 361-372 行：User message 渲染逻辑

**根本原因**：
SDK 返回的消息结构本身就是分离的：
- `assistant` message 包含 `tool_use` 块
- 后续 `user` message 包含 `tool_result` 块

**产品影响**：
- ❌ 工具调用和结果跨越不同消息类型，关联性差
- ❌ 用户需要上下查找才能理解工具的完整执行过程
- ❌ 长对话中工具结果可能被后续消息冲散，难以追溯
- ❌ 工具状态指示器（pending/success/error）与结果输出分离

**修复方案**：

1. **数据层改造**：在 `useAppStore` 中添加工具结果缓存
```typescript
// src/ui/store/useAppStore.ts
interface SessionView {
  // ... 现有字段
  toolResults: Record<string, ToolResultContent>; // toolUseId -> result
}

// 在 handleServerEvent 中缓存工具结果
case "stream.message": {
  const { sessionId, message } = event.payload;

  // 如果是 user message，提取 tool_result
  if (message.type === "user") {
    const toolResults = { ...existing.toolResults };
    message.message.content.forEach((content) => {
      if (content.type === "tool_result") {
        toolResults[content.tool_use_id] = content;
      }
    });
    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...existing,
          messages: [...existing.messages, message],
          toolResults
        }
      }
    };
  }
  // ...
}
```

2. **UI 层改造**：ToolUseCard 从 store 中读取对应的结果
```typescript
// src/ui/components/EventCard.tsx
const ToolUseCard = ({
  messageContent,
  toolResult, // 新增：从外部传入对应的结果
  showIndicator = false
}: {
  messageContent: MessageContent;
  toolResult?: ToolResultContent;
  showIndicator?: boolean;
}) => {
  // ...

  return (
    <div className="flex flex-col gap-2 rounded-[1rem] bg-surface-tertiary px-3 py-2 mt-4">
      {/* 工具调用头部 */}
      <div className="flex flex-row items-center gap-2 min-w-0">
        <StatusDot ... />
        <div className="flex flex-row items-center gap-2 tool-use-item min-w-0 flex-1">
          <span className="...">{messageContent.name}</span>
          <span className="...">{getToolInfo()}</span>
        </div>
      </div>

      {/* 工具结果（如果存在）*/}
      {toolResult && (
        <div className="mt-2 rounded-lg bg-surface-secondary p-2">
          <ToolResultInline content={toolResult} />
        </div>
      )}
    </div>
  );
};
```

3. **渲染逻辑调整**：在 Assistant message 渲染时传入结果
```typescript
// MessageCard 组件
if (sdkMessage.type === "assistant") {
  const contents = sdkMessage.message.content;
  const toolResults = useAppStore((s) => s.sessions[activeSessionId]?.toolResults ?? {});

  return (
    <>
      {contents.map((content: MessageContent, idx: number) => {
        // ...
        if (content.type === "tool_use") {
          const result = toolResults[content.id]; // 查找对应的结果

          if (content.name === "AskUserQuestion") {
            return <AskUserQuestionCard ... />;
          }
          return (
            <ToolUseCard
              key={idx}
              messageContent={content}
              toolResult={result} // 传入结果
              showIndicator={isLastContent && showIndicator}
            />
          );
        }
        // ...
      })}
    </>
  );
}

// User message 不再单独渲染 tool_result
if (sdkMessage.type === "user") {
  // 移除或隐藏 ToolResult 的独立渲染
  return null;
}
```

**优先级**: P0（立即修复）
**预计工作量**: 2-3 小时

---

### P1-1: 消息层次与视觉识别问题

**问题描述**：
所有消息标题（用户/系统初始化/助手/输出/会话结果）都使用相同的 `.header text-accent` 样式，导致视觉层次不清晰。

**代码位置**：
- `src/ui/components/EventCard.tsx` 所有 header 使用统一样式
- 第 79 行：`<div className="header text-accent">会话结果</div>`
- 第 146 行：`<div className="header text-accent">输出</div>`
- 第 167 行：`<div className="header text-accent ...">助手/思考</div>`
- 第 270 行：`<div className="header text-accent ...">系统初始化</div>`
- 第 288 行：`<div className="header text-accent ...">用户</div>`

**产品影响**：
- ❌ 用户无法快速区分消息来源（我说的 vs AI 说的 vs 系统消息）
- ❌ 对话历史难以扫视浏览，认知负担高
- ❌ 缺少对话的"呼吸感"，视觉疲劳
- ❌ 不符合用户对聊天界面的心智模型（用户消息通常在右侧/不同颜色）

**建议方案**：

1. **设计规范**：
```css
/* 用户消息 */
.message-user {
  background: #E8F0FE; /* 浅蓝色 */
  align-self: flex-end; /* 右对齐 */
  max-width: 80%;
  border-radius: 16px 16px 4px 16px;
}

/* 助手消息 */
.message-assistant {
  background: #F8F9FA; /* 浅灰色 */
  align-self: flex-start; /* 左对齐 */
  max-width: 100%;
  border-radius: 16px 16px 16px 4px;
}

/* 系统消息 */
.message-system {
  background: #FFF9E6; /* 浅黄色 */
  align-self: center; /* 居中 */
  max-width: 90%;
  font-size: 0.875rem; /* 更小字号 */
  opacity: 0.9;
}

/* 工具调用 */
.message-tool {
  background: #F1F3F4; /* 次要灰 */
  border-left: 3px solid var(--accent);
  opacity: 0.95;
}

/* 会话结果 */
.message-result {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 500;
}
```

2. **组件改造**：
```typescript
// 定义消息类型枚举
type MessageVariant = 'user' | 'assistant' | 'system' | 'tool' | 'result';

// 通用消息容器组件
const MessageContainer = ({
  variant,
  children
}: {
  variant: MessageVariant;
  children: React.ReactNode
}) => {
  const variantStyles = {
    user: 'bg-blue-50 self-end max-w-[80%] rounded-2xl rounded-br-sm',
    assistant: 'bg-surface-secondary self-start max-w-full rounded-2xl rounded-bl-sm',
    system: 'bg-yellow-50 self-center max-w-[90%] text-sm opacity-90 rounded-xl',
    tool: 'bg-surface-tertiary border-l-4 border-accent opacity-95 rounded-lg',
    result: 'bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl'
  };

  return (
    <div className={`flex flex-col gap-2 px-4 py-3 ${variantStyles[variant]}`}>
      {children}
    </div>
  );
};
```

3. **重构各消息卡片**：
```typescript
const UserMessageCard = ({ message, showIndicator }: ...) => (
  <MessageContainer variant="user">
    <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
      <UserIcon />
      <span>{t('eventCard.user')}</span>
      <StatusDot variant="accent" isActive={showIndicator} isVisible={showIndicator} />
    </div>
    <MDContent text={message.prompt} />
  </MessageContainer>
);

const AssistantBlockCard = ({ title, text, showIndicator }: ...) => (
  <MessageContainer variant="assistant">
    <div className="flex items-center gap-2 text-sm font-medium text-ink-700">
      <BotIcon />
      <span>{title === 'Thinking' ? t('eventCard.thinking') : t('eventCard.assistant')}</span>
      <StatusDot variant="success" isActive={showIndicator} isVisible={showIndicator} />
    </div>
    <MDContent text={text} />
  </MessageContainer>
);

const SystemInfoCard = ({ message, showIndicator }: ...) => (
  <MessageContainer variant="system">
    <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
      <SystemIcon />
      <span>{t('eventCard.systemInit')}</span>
      <StatusDot variant="success" isActive={showIndicator} isVisible={showIndicator} />
    </div>
    {/* ... */}
  </MessageContainer>
);
```

**优先级**: P1（本周完成）
**预计工作量**: 4-6 小时（包括设计审查）

---

### P1-2: 缺少右侧边栏功能面板

**问题描述**：
当前只有左侧会话列表，缺少右侧上下文面板，导致无法跟踪 AI 工作进度、文件变更等关键信息。

**产品影响**：
- ❌ 无法跟踪 AI 的工作进度（TodoWrite 工具调用后的任务列表）
- ❌ 无法可视化文件变更（哪些文件被创建、修改、删除）
- ❌ 工作目录结构不透明，用户缺少掌控感
- ❌ 缺少快速导航功能（跳转到特定文件/工具调用）

**需求分析**：

右侧边栏应包含三个主要面板：

1. **任务列表面板（TodoList Panel）**
   - 数据来源：解析 `TodoWrite` 工具调用的 input
   - 功能：
     - 显示任务状态（pending/in_progress/completed）
     - 点击任务跳转到对应的消息位置
     - 实时更新（监听 TodoWrite 工具调用）
   - UI 设计：
     ```
     📋 Tasks (3/8 completed)
     ├─ ✅ Read configuration files
     ├─ ✅ Analyze project structure
     ├─ 🔄 Implement new feature
     │   └─ Create component files
     │   └─ Add unit tests
     ├─ ⏸️ Update documentation
     └─ ⏸️ Run final tests
     ```

2. **文件变更面板（File Changes Panel）**
   - 数据来源：监听 `Write`, `Edit`, `Bash` 等工具调用
   - 功能：
     - 新建文件（Write 工具且文件之前不存在）
     - 修改文件（Edit 工具或 Write 覆盖已有文件）
     - 删除文件（Bash rm 命令）
     - 点击文件名跳转到对应操作的消息
   - UI 设计：
     ```
     📝 File Changes (12 files)
     ├─ 🆕 src/components/NewFeature.tsx
     ├─ ✏️ src/App.tsx (3 edits)
     ├─ ✏️ package.json
     ├─ 🗑️ old-config.json
     └─ 🆕 tests/new-feature.test.ts
     ```

3. **文件树面板（File Tree Panel）**
   - 数据来源：
     - 初始：会话的 `cwd` 目录
     - 动态：监听文件系统变化
   - 功能：
     - 显示当前工作目录结构
     - 高亮 Claude 操作过的文件
     - 支持展开/折叠文件夹
     - 点击文件显示最近的相关操作
   - UI 设计：
     ```
     📁 /Users/me/project
     ├─ 📁 src
     │   ├─ 📄 App.tsx ✏️
     │   ├─ 📁 components
     │   │   ├─ 📄 Header.tsx
     │   │   └─ 📄 NewFeature.tsx 🆕
     │   └─ 📄 main.tsx
     ├─ 📄 package.json ✏️
     └─ 📄 README.md
     ```

**技术架构**：

```typescript
// src/ui/components/RightSidebar.tsx
type RightSidebarTab = 'tasks' | 'files' | 'tree';

interface RightSidebarProps {
  activeSessionId: string | null;
}

export const RightSidebar = ({ activeSessionId }: RightSidebarProps) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('tasks');

  return (
    <aside className="w-[320px] border-l border-ink-900/10 bg-surface flex flex-col">
      {/* Tab 切换 */}
      <div className="flex border-b border-ink-900/10">
        <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}>
          📋 Tasks
        </TabButton>
        <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
          📝 Changes
        </TabButton>
        <TabButton active={activeTab === 'tree'} onClick={() => setActiveTab('tree')}>
          📁 Files
        </TabButton>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'tasks' && <TaskListPanel sessionId={activeSessionId} />}
        {activeTab === 'files' && <FileChangesPanel sessionId={activeSessionId} />}
        {activeTab === 'tree' && <FileTreePanel sessionId={activeSessionId} />}
      </div>
    </aside>
  );
};
```

**数据层扩展**：

```typescript
// src/ui/store/useAppStore.ts
interface SessionView {
  // ... 现有字段
  todos: TodoItem[];
  fileChanges: FileChange[];
}

interface TodoItem {
  id: string;
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
  messageIndex: number; // 关联到哪条消息
}

interface FileChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  timestamp: number;
  messageIndex: number;
}

// 在 handleServerEvent 中解析工具调用
case "stream.message": {
  const message = event.payload.message;

  if (message.type === "assistant") {
    message.message.content.forEach((content) => {
      // 解析 TodoWrite
      if (content.type === "tool_use" && content.name === "TodoWrite") {
        const todos = parseTodoWriteInput(content.input);
        // 更新 session.todos
      }

      // 解析文件操作
      if (content.type === "tool_use" && ["Write", "Edit"].includes(content.name)) {
        const fileChange = parseFileOperation(content);
        // 更新 session.fileChanges
      }
    });
  }
  // ...
}
```

**优先级**: P1（重要功能，需先完成架构设计）
**预计工作量**: 8-12 小时（分阶段实现）
**实施建议**：
1. 第一阶段：实现右侧边栏框架和 Tab 切换（2h）
2. 第二阶段：实现 TaskListPanel（4h）
3. 第三阶段：实现 FileChangesPanel（3h）
4. 第四阶段：实现 FileTreePanel（需要后端支持，3h）

---

## 🟡 重要优化问题（P2）

### P2-1: 工具状态管理混乱

**问题描述**：
`toolStatusMap` 和 `toolStatusListeners` 是全局 Map/Set，不受 React 生命周期管理，切换会话时状态未清理。

**代码位置**：
- `src/ui/components/EventCard.tsx` 第 18-19 行
```typescript
const toolStatusMap = new Map<string, ToolStatus>();
const toolStatusListeners = new Set<() => void>();
```

**产品影响**：
- ⚠️ 切换回旧会话时，工具状态可能显示错误
- ⚠️ 长时间使用后可能导致内存泄漏
- ⚠️ 无法在不同会话之间隔离状态

**建议方案**：

方案 A：移到 Zustand Store（推荐）
```typescript
// src/ui/store/useAppStore.ts
interface SessionView {
  // ...
  toolStatuses: Record<string, ToolStatus>; // toolUseId -> status
}

// 添加更新方法
updateToolStatus: (sessionId: string, toolUseId: string, status: ToolStatus) => {
  set((state) => {
    const session = state.sessions[sessionId];
    if (!session) return {};

    return {
      sessions: {
        ...state.sessions,
        [sessionId]: {
          ...session,
          toolStatuses: {
            ...session.toolStatuses,
            [toolUseId]: status
          }
        }
      }
    };
  });
}
```

方案 B：使用 sessionId 复合键
```typescript
// 使用 sessionId + toolUseId 作为键
const toolStatusMap = new Map<string, ToolStatus>();

const getToolStatusKey = (sessionId: string, toolUseId: string) =>
  `${sessionId}:${toolUseId}`;

// 在会话删除时清理
case "session.deleted": {
  // 清理该会话的所有工具状态
  const keysToDelete = Array.from(toolStatusMap.keys())
    .filter(key => key.startsWith(`${sessionId}:`));
  keysToDelete.forEach(key => toolStatusMap.delete(key));
}
```

**优先级**: P2
**预计工作量**: 1-2 小时

---

### P2-2: 权限请求 UI 逻辑错误

**问题描述**：
`App.tsx` 第 332 行只传递 `permissionRequests[0]`，如果同时有多个待处理请求会丢失后续请求。

**代码位置**：
```typescript
// src/ui/App.tsx 第 327-335 行
visibleMessages.map((item, idx) => (
  <MessageCard
    key={`${activeSessionId}-msg-${item.originalIndex}`}
    message={item.message}
    isLast={idx === visibleMessages.length - 1}
    isRunning={isRunning}
    permissionRequest={permissionRequests[0]} // ❌ 问题：只取第一个
    onPermissionResult={handlePermissionResult}
  />
))
```

**产品影响**：
- ⚠️ 多个权限请求同时存在时，只能响应第一个
- ⚠️ 后续权限请求被忽略，导致会话卡住

**建议方案**：

在渲染时匹配对应的 `toolUseId`：
```typescript
// src/ui/App.tsx
visibleMessages.map((item, idx) => {
  // 查找与当前消息相关的权限请求
  let relevantPermission: PermissionRequest | undefined;

  if (item.message.type === "assistant") {
    const assistantMsg = item.message as SDKAssistantMessage;
    const toolUseIds = assistantMsg.message.content
      .filter((c) => c.type === "tool_use")
      .map((c: any) => c.id);

    relevantPermission = permissionRequests.find((req) =>
      toolUseIds.includes(req.toolUseId)
    );
  }

  return (
    <MessageCard
      key={`${activeSessionId}-msg-${item.originalIndex}`}
      message={item.message}
      isLast={idx === visibleMessages.length - 1}
      isRunning={isRunning}
      permissionRequest={relevantPermission} // ✅ 传递匹配的请求
      onPermissionResult={handlePermissionResult}
    />
  );
})
```

**优先级**: P2
**预计工作量**: 30 分钟

---

### P2-3: 消息滚动体验问题

**问题描述**：
- 加载历史消息时的滚动位置恢复逻辑复杂
- "New messages" 按钮定位依赖左侧边栏宽度（`ml-[140px]`）
- 没有"滚动到顶部"按钮

**代码位置**：
- `src/ui/App.tsx` 第 214-225 行：滚动恢复逻辑
- `src/ui/App.tsx` 第 368-378 行："New messages" 按钮

**建议方案**：

1. 使用 CSS 变量处理间距：
```typescript
// src/ui/App.tsx
<div className="flex h-screen bg-surface" style={{ '--sidebar-width': '280px' } as any}>
  {/* ... */}

  <button
    onClick={scrollToBottom}
    className="fixed bottom-28 left-[calc(var(--sidebar-width)+50%)] z-40 -translate-x-1/2 ..."
  >
    New messages
  </button>
</div>
```

2. 添加"滚动到顶部"按钮：
```typescript
{!shouldAutoScroll && scrollContainerRef.current?.scrollTop > 1000 && (
  <button
    onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
    className="fixed top-20 left-[calc(var(--sidebar-width)+50%)] z-40 ..."
  >
    ↑ Scroll to top
  </button>
)}
```

**优先级**: P2
**预计工作量**: 1 小时

---

### P2-4: 空状态与加载状态不完善

**问题描述**：
- 空状态只有简单文本
- 加载历史消息时只有转圈动画
- 没有会话创建中的状态提示

**代码位置**：
- `src/ui/App.tsx` 第 320-324 行：空状态
- `src/ui/App.tsx` 第 308-318 行：加载状态

**建议方案**：

1. 丰富空状态：
```typescript
{visibleMessages.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="text-6xl mb-4">🤖</div>
    <div className="text-lg font-medium text-ink-700">
      {t('emptyState.title')}
    </div>
    <p className="mt-2 text-sm text-muted max-w-md">
      {t('emptyState.description')}
    </p>

    {/* 示例提示词 */}
    <div className="mt-6 flex flex-col gap-2 w-full max-w-md">
      <button className="text-left p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition">
        💡 {t('emptyState.example1')}
      </button>
      <button className="text-left p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition">
        💡 {t('emptyState.example2')}
      </button>
      <button className="text-left p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition">
        💡 {t('emptyState.example3')}
      </button>
    </div>
  </div>
) : (
  // 现有消息列表
)}
```

2. 会话创建中的骨架屏：
```typescript
{pendingStart && (
  <div className="flex flex-col gap-4 animate-pulse">
    <div className="h-20 bg-surface-tertiary rounded-xl" />
    <div className="h-32 bg-surface-tertiary rounded-xl" />
    <div className="h-16 bg-surface-tertiary rounded-xl" />
  </div>
)}
```

**优先级**: P2
**预计工作量**: 2 小时

---

## 🟢 细节优化问题（P3）

### P3-1: Partial Message 渲染逻辑问题

**问题描述**：
- Partial message 直接用 `MDContent` 渲染，不完整的 Markdown 可能解析错误
- 骨架屏动画与实际内容分离，视觉跳跃

**代码位置**：`src/ui/App.tsx` 第 339-360 行

**建议方案**：
- 流式输出时使用打字机效果
- 骨架屏根据实际内容长度动态调整

**优先级**: P3
**预计工作量**: 1 小时

---

### P3-2: 消息类型缺失

**问题描述**：
- 没有系统通知（如 "Session paused" / "API rate limited"）
- 没有用户操作记录（如 "Approved permission request"）

**建议方案**：
增加消息类型枚举，支持更多场景。

**优先级**: P3
**预计工作量**: 2 小时

---

### P3-3: 工具调用信息展示不完整

**问题描述**：
`ToolUseCard` 只显示主参数，完整的 input 对象被隐藏。

**建议方案**：
添加"查看完整参数"折叠面板。

**优先级**: P3
**预计工作量**: 1 小时

---

### P3-4: 错误消息处理粗糙

**问题描述**：
直接显示 JSON，用户难以理解。

**代码位置**：`src/ui/components/EventCard.tsx` 第 327-334 行

**建议方案**：
- 解析错误类型（API 错误/工具错误/网络错误）
- 提供可操作的建议（"Retry" / "Check API key"）

**优先级**: P3
**预计工作量**: 2 小时

---

### P3-5: 国际化不完整

**问题描述**：
部分硬编码文本未翻译。

**代码位置**：
- `src/ui/App.tsx` 第 302 行："Beginning of conversation"
- `src/ui/App.tsx` 第 315 行："Loading..."
- `src/ui/App.tsx` 第 322 行："No messages yet"
- `src/ui/App.tsx` 第 376 行："New messages"

**建议方案**：
```typescript
// locales/en/ui.json
{
  "conversation": {
    "beginning": "Beginning of conversation",
    "loading": "Loading...",
    "noMessages": "No messages yet",
    "newMessages": "New messages"
  }
}

// 使用
<span>{t('ui:conversation.beginning')}</span>
```

**优先级**: P3
**预计工作量**: 30 分钟

---

### P3-6: 性能优化缺失

**问题描述**：
- `visibleMessages.map()` 没有使用虚拟滚动
- Markdown 渲染没有缓存
- 大量消息时滚动卡顿

**建议方案**：
- 消息超过 100 条时启用虚拟滚动（react-window）
- 对已渲染的 Markdown 内容做 memoization

**优先级**: P3
**预计工作量**: 3-4 小时

---

### P3-7: 消息时间戳缺失

**问题描述**：
消息卡片没有显示时间戳。

**建议方案**：
- 每条消息显示相对时间（"2 minutes ago"）
- Hover 时显示绝对时间

**优先级**: P3
**预计工作量**: 1 小时

---

### P3-8: 可访问性问题

**问题描述**：
- 没有键盘快捷键支持
- 没有 ARIA 标签
- 颜色对比度可能不足

**建议方案**：
- 添加键盘导航（Cmd+↑/↓ 浏览消息）
- 消息区域添加 `role="log"` 和 `aria-live="polite"`

**优先级**: P3
**预计工作量**: 2-3 小时

---

### P3-9: 搜索与过滤功能缺失

**问题描述**：
长对话中无法搜索消息内容。

**建议方案**：
- 添加消息搜索框（Cmd+F）
- 支持过滤消息类型（只看错误/只看工具调用）

**优先级**: P3
**预计工作量**: 4 小时

---

## 📊 问题优先级总览

| 优先级 | 问题编号 | 问题名称 | 预计影响 | 实现难度 | 工作量 |
|--------|---------|---------|---------|---------|--------|
| **P0** | P0-1 | 会话切换时的流式输出污染 | 🔴 高 | 低 | 30min |
| **P0** | P0-2 | 工具调用与结果 UI 分离 | 🔴 高 | 中 | 2-3h |
| **P1** | P1-1 | 消息层次与视觉识别问题 | 🔴 高 | 中 | 4-6h |
| **P1** | P1-2 | 缺少右侧边栏功能面板 | 🔴 高 | 高 | 8-12h |
| **P2** | P2-1 | 工具状态管理混乱 | 🟡 中 | 中 | 1-2h |
| **P2** | P2-2 | 权限请求 UI 逻辑错误 | 🟡 中 | 低 | 30min |
| **P2** | P2-3 | 消息滚动体验问题 | 🟡 中 | 低 | 1h |
| **P2** | P2-4 | 空状态与加载状态不完善 | 🟡 中 | 低 | 2h |
| **P3** | P3-1 | Partial Message 渲染逻辑 | 🟢 低 | 中 | 1h |
| **P3** | P3-2 | 消息类型缺失 | 🟢 低 | 低 | 2h |
| **P3** | P3-3 | 工具调用信息展示不完整 | 🟢 低 | 低 | 1h |
| **P3** | P3-4 | 错误消息处理粗糙 | 🟢 低 | 低 | 2h |
| **P3** | P3-5 | 国际化不完整 | 🟢 低 | 低 | 30min |
| **P3** | P3-6 | 性能优化缺失 | 🟢 低 | 中 | 3-4h |
| **P3** | P3-7 | 消息时间戳缺失 | 🟢 低 | 低 | 1h |
| **P3** | P3-8 | 可访问性问题 | 🟢 低 | 中 | 2-3h |
| **P3** | P3-9 | 搜索与过滤功能缺失 | 🟢 低 | 中 | 4h |

**总预计工作量**: 约 40-50 小时

---

## 🎯 实施路线图

### 第一阶段：核心问题修复（Week 1）
**目标**: 修复破坏性 bug，稳定核心体验

- [ ] **Day 1**: 修复会话切换流式输出污染（P0-1）
- [ ] **Day 2-3**: 实现工具调用与结果 UI 关联（P0-2）
- [ ] **Day 4**: 修复权限请求逻辑错误（P2-2）
- [ ] **Day 5**: 代码审查与测试

**交付物**: 修复版本 v0.2.1

---

### 第二阶段：视觉与交互优化（Week 2）
**目标**: 提升对话区域可读性和用户体验

- [ ] **Day 1-2**: 重构消息视觉层次（P1-1）
- [ ] **Day 3**: 优化滚动体验（P2-3）
- [ ] **Day 4**: 完善空状态与加载状态（P2-4）
- [ ] **Day 5**: 修复工具状态管理（P2-1）

**交付物**: 优化版本 v0.3.0

---

### 第三阶段：右侧边栏功能（Week 3-4）
**目标**: 实现上下文跟踪功能

- [ ] **Week 3 Day 1-2**: 右侧边栏架构设计与框架实现
- [ ] **Week 3 Day 3-4**: 实现 TaskListPanel
- [ ] **Week 3 Day 5**: 实现 FileChangesPanel
- [ ] **Week 4 Day 1-2**: 实现 FileTreePanel（需后端支持）
- [ ] **Week 4 Day 3-5**: 集成测试与优化

**交付物**: 功能版本 v0.4.0

---

### 第四阶段：细节打磨（Week 5）
**目标**: 完善边界情况和辅助功能

- [ ] **Day 1**: 国际化完善（P3-5）+ 消息时间戳（P3-7）
- [ ] **Day 2**: 工具信息展示优化（P3-3）+ 错误处理（P3-4）
- [ ] **Day 3**: Partial Message 优化（P3-1）
- [ ] **Day 4**: 性能优化（P3-6）
- [ ] **Day 5**: 可访问性改进（P3-8）

**交付物**: 完善版本 v0.5.0

---

### 第五阶段：高级功能（Future）
**目标**: 增强用户掌控感

- [ ] 搜索与过滤功能（P3-9）
- [ ] 消息导出功能
- [ ] 自定义主题支持
- [ ] 快捷键系统

---

## 📝 备注

### 设计原则
1. **用户心智模型优先**: 遵循用户对聊天界面的认知习惯
2. **渐进式披露**: 默认隐藏复杂信息，需要时展开
3. **一致性**: 所有消息卡片遵循统一的视觉语言
4. **性能优先**: 大量消息时保持流畅性

### 技术债务
- 全局状态管理（toolStatusMap）需要重构
- 消息渲染逻辑复杂度过高，需要拆分组件
- 缺少 E2E 测试覆盖

### 相关文档
- [i18n 设计文档](./2025-01-21-i18n-design.md)
- [i18n 实现文档](./2025-01-21-i18n-implementation.md)

---

**文档维护者**: Claude Code
**最后更新**: 2025-01-23
**状态**: ✅ 待审查
