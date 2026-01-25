import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { TodoItemData, UserPromptMessage, StreamMessage } from "../../electron/types.js";

type AnyMessage = SDKMessage | UserPromptMessage;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input = block.input as any;
      if (!Array.isArray(input?.todos)) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const todoMap = new Map<string, TodoItemData>();

  messages.forEach((message, messageIndex) => {
    const todos = extractTodosFromMessage(message, messageIndex);

    todos.forEach((todo) => {
      const key = `${todo.id}-${todo.taskIndex}`;
      todoMap.set(key, todo);
    });
  });

  const result = Array.from(todoMap.values());
  result.sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder: Record<string, number> = {
        completed: 0,
        in_progress: 1,
        pending: 2
      };
      return (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    }
    return a.taskIndex - b.taskIndex;
  });

  return result;
}
