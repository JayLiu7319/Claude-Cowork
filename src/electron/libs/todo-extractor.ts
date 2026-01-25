import type { StreamMessage, TodoItemData } from "../types.js";

type AnyMessage = any;

export function extractTodosFromMessage(
  message: StreamMessage,
  messageIndex: number
): TodoItemData[] {
  const msg = message as AnyMessage;

  // Only process assistant messages with content
  if (!("message" in msg) || !msg.message || !("content" in msg.message)) {
    return [];
  }

  const content = msg.message.content;
  if (!Array.isArray(content)) {
    return [];
  }

  const todos: TodoItemData[] = [];
  const timestamp = Date.now();

  for (const block of content) {
    if (block.type === "tool_use" && block.name === "TodoWrite") {
      const input = block.input as any;
      if (!Array.isArray(input?.todos)) {
        continue;
      }

      input.todos.forEach((todo: any, index: number) => {
        if (todo && todo.content) {
          todos.push({
            id: block.id,
            taskIndex: index,
            content: todo.content,
            status: todo.status || "pending",
            messageIndex,
            timestamp
          });
        }
      });
    }
  }

  return todos;
}

export function aggregateTodos(messages: StreamMessage[]): TodoItemData[] {
  // Key: content, Value: TodoItemData
  const todoMap = new Map<string, TodoItemData>();

  messages.forEach((message, messageIndex) => {
    const todos = extractTodosFromMessage(message, messageIndex);

    todos.forEach((todo) => {
      // Use content as unique key to deduplicate
      // consistently across different tool calls
      const key = todo.content.trim();

      // If we already have this task, we only update it if the new one
      // is from a later message (which implies an update/status change)
      // Since we iterate chronologically, we can just set/overwrite.
      // We keep the original taskIndex from the first time we saw it 
      // to maintain stable sorting order if possible, OR we update everything.
      // 
      // BETTER APPROACH:
      // If we see the same task content again, it's likely a status update.
      // We should keep the *latest* status.
      // We should probably keep the *original* discovery timestamp/index to keep the list stable?
      // Actually, if we just overwrite, the list might jump around if we sort by timestamp.
      // Let's check the current sorting logic:
      // result.sort((a, b) => { ... status check ... return a.taskIndex - b.taskIndex; });

      if (todoMap.has(key)) {
        const existing = todoMap.get(key)!;
        // Update status and other metadata from the latest occurrence
        todoMap.set(key, {
          ...todo,
          // Keep original position to maintain list order
          messageIndex: existing.messageIndex,
          taskIndex: existing.taskIndex
        });
      } else {
        todoMap.set(key, todo);
      }
    });
  });

  const result = Array.from(todoMap.values());

  // Sort by appearance order (messageIndex then taskIndex) to keep original order
  result.sort((a, b) => {
    if (a.messageIndex !== b.messageIndex) {
      return a.messageIndex - b.messageIndex;
    }
    return a.taskIndex - b.taskIndex;
  });

  return result;
}
