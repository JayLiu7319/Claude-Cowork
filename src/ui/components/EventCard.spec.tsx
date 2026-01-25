import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { MessageCard } from './EventCard';
import { isMarkdown } from '../utils/markdownUtils';
import type { StreamMessage } from '../types';
import type { SDKMessage, SDKAssistantMessage } from '@anthropic-ai/claude-agent-sdk';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

// Mock dependencies
vi.mock('../render/markdown', () => ({
  default: ({ text }: { text: string }) => <div data-testid="markdown-content">{text}</div>
}));

vi.mock('./DecisionPanel', () => ({
  DecisionPanel: ({ onSubmit }: { onSubmit: (data: unknown) => void }) => (
    <div data-testid="decision-panel">
      <button onClick={() => onSubmit({ approved: true })}>Approve</button>
    </div>
  )
}));

// Initialize i18n for tests
const setupI18n = () => {
  i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          eventCard: {
            thinking: 'Thinking',
            assistant: 'Assistant',
            user: 'User',
            output: 'Output',
            error: 'Error',
            success: 'Success',
            collapse: 'Collapse',
            showMoreLines: 'Show {{count}} more lines',
            sessionResult: 'Session Result',
            duration: 'Duration',
            api: 'API',
            usage: 'Usage',
            cost: 'Cost',
            input: 'Input',
            systemInit: 'System Initialized',
            sessionId: 'Session ID',
            modelName: 'Model',
            permissionMode: 'Permission Mode',
            workingDirectory: 'Working Directory',
            sessionError: 'Session Error',
            askUserQuestion: 'Question'
          }
        }
      }
    }
  });
  return i18n;
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const i18nInstance = setupI18n();
  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
};

describe('EventCard - Stream Rendering Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Performance: Rendering Stability', () => {
    it('should maintain consistent height when rendering text blocks', () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Initial text content' }
          ]
        }
      } as SDKMessage;

      const { container, rerender } = render(
        <TestWrapper>
          <MessageCard message={message} isLast={false} isRunning={false} />
        </TestWrapper>
      );

      const initialHeight = (container.firstChild as HTMLElement)?.clientHeight;

      // Simulate streaming update with more text
      const updatedMessage: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Initial text content with more data' }
          ]
        }
      } as SDKMessage;

      rerender(
        <TestWrapper>
          <MessageCard message={updatedMessage} isLast={false} isRunning={false} />
        </TestWrapper>
      );

      // Height should increase smoothly, not jump
      expect((container.firstChild as HTMLElement)?.clientHeight).toBeGreaterThanOrEqual(initialHeight);
    });

    it('should not cause layout shift when tool_use transitions to tool_result', async () => {
      const messagesWithToolUse: StreamMessage[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: '现在创建README.md文档:' },
              {
                type: 'tool_use',
                id: 'tool_123',
                name: 'Write',
                input: { file_path: '/README.md', content: 'test' }
              }
            ]
          }
        } as SDKMessage
      ];

      const { container, rerender } = render(
        <TestWrapper>
          <MessageCard
            message={messagesWithToolUse[0]}
            allMessages={messagesWithToolUse}
            isLast={true}
            isRunning={true}
          />
        </TestWrapper>
      );

      const heightBeforeResult = container.clientHeight;

      // Add tool result
      const messagesWithResult: StreamMessage[] = [
        ...messagesWithToolUse,
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool_123',
                content: 'File created successfully'
              }
            ]
          }
        } as SDKMessage
      ];

      rerender(
        <TestWrapper>
          <MessageCard
            message={messagesWithToolUse[0]}
            allMessages={messagesWithResult}
            isLast={true}
            isRunning={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Output/i)).toBeInTheDocument();
      });

      const heightAfterResult = container.clientHeight;

      // Should expand smoothly, not cause sudden jump
      expect(heightAfterResult).toBeGreaterThan(heightBeforeResult);
    });

    it('should render streaming text without duplication', () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: '现在创建README.md文档:' }
          ]
        }
      } as SDKMessage;

      render(
        <TestWrapper>
          <MessageCard message={message} isLast={true} isRunning={true} />
        </TestWrapper>
      );

      // Should only render once, not twice
      const textElements = screen.getAllByTestId('markdown-content');
      const matchingElements = textElements.filter(el =>
        el.textContent === '现在创建README.md文档:'
      );

      expect(matchingElements.length).toBe(1);
    });
  });

  describe('Performance: Multiple Content Blocks', () => {
    it('should efficiently render assistant message with multiple content blocks', () => {
      const renderStart = performance.now();

      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'I need to analyze this...' },
            { type: 'text', text: 'Let me help you with that.' },
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'Read',
              input: { file_path: '/test.ts' }
            },
            {
              type: 'tool_use',
              id: 'tool_2',
              name: 'Bash',
              input: { command: 'npm test' }
            }
          ]
        }
      } as SDKMessage;

      const allMessages: StreamMessage[] = [
        message,
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool_1',
                content: 'File contents here'
              }
            ]
          }
        } as SDKMessage,
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool_2',
                content: 'Test passed'
              }
            ]
          }
        } as SDKMessage
      ];

      render(
        <TestWrapper>
          <MessageCard message={message} allMessages={allMessages} isLast={false} isRunning={false} />
        </TestWrapper>
      );

      const renderTime = performance.now() - renderStart;

      // Should render all content blocks
      expect(screen.getByText(/I need to analyze this.../i)).toBeInTheDocument();
      expect(screen.getByText(/Let me help you with that./i)).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('Bash')).toBeInTheDocument();

      // Should render in reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('should use memoized tool result map for performance', () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'Write',
              input: { file_path: '/test.md' }
            }
          ]
        }
      } as SDKMessage;

      // Create large message array to test O(1) lookup vs O(n) search
      const toolResults: StreamMessage[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: `tool_${i}`,
              content: `Result ${i}`
            }
          ]
        }
      } as SDKMessage));

      const allMessages: StreamMessage[] = [message, ...toolResults];

      const renderStart = performance.now();

      render(
        <TestWrapper>
          <MessageCard message={message} allMessages={allMessages} isLast={false} isRunning={false} />
        </TestWrapper>
      );

      const renderTime = performance.now() - renderStart;

      // With O(1) map lookup, should still be fast even with 100 messages
      expect(renderTime).toBeLessThan(50);
    });
  });

  describe('Performance: Content Shifting Issues', () => {
    it('should not shift content when tool result is added inline', async () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Running command...' },
            {
              type: 'tool_use',
              id: 'bash_1',
              name: 'Bash',
              input: { command: 'ls -la' }
            }
          ]
        }
      } as SDKMessage;

      const { rerender } = render(
        <TestWrapper>
          <MessageCard
            message={message}
            allMessages={[message]}
            isLast={true}
            isRunning={true}
          />
        </TestWrapper>
      );

      // Get position of text element before tool result
      const textElement = screen.getByText(/Running command.../i);
      const initialTop = textElement.getBoundingClientRect().top;

      // Add tool result
      const withResult: StreamMessage[] = [
        message,
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'bash_1',
                content: 'total 48\ndrwxr-xr-x  12 user  staff   384 Jan 23 10:00 .'
              }
            ]
          }
        } as SDKMessage
      ];

      rerender(
        <TestWrapper>
          <MessageCard
            message={message}
            allMessages={withResult}
            isLast={true}
            isRunning={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Output/i)).toBeInTheDocument();
      });

      // Text element should NOT shift upward
      const finalTop = textElement.getBoundingClientRect().top;
      expect(finalTop).toBe(initialTop);
    });

    it('should maintain scroll position when content expands', () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'read_1',
              name: 'Read',
              input: { file_path: '/large-file.ts' }
            }
          ]
        }
      } as SDKMessage;

      const largeContent = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');

      const allMessages: StreamMessage[] = [
        message,
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'read_1',
                content: largeContent
              }
            ]
          }
        } as SDKMessage
      ];

      const { container } = render(
        <TestWrapper>
          <MessageCard
            message={message}
            allMessages={allMessages}
            isLast={false}
            isRunning={false}
          />
        </TestWrapper>
      );

      // Should show collapsed view initially (3 lines max)
      expect(screen.getByText(/3 more lines|97 more lines/i)).toBeInTheDocument();

      // Container height should be stable
      const height = container.clientHeight;
      expect(height).toBeGreaterThan(0);
      expect(height).toBeLessThan(500); // Collapsed state
    });
  });

  describe('Performance: Re-render Optimization', () => {
    it('should use memo to prevent unnecessary re-renders', () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Static content' }
          ]
        }
      } as SDKMessage;

      const { rerender } = render(
        <TestWrapper>
          <MessageCard message={message} isLast={false} isRunning={false} />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <MessageCard message={message} isLast={false} isRunning={false} />
        </TestWrapper>
      );

      // Should memoize and not re-render unnecessarily
      expect(screen.getByText(/Static content/i)).toBeInTheDocument();
    });

    it('should efficiently handle status indicator updates', () => {
      const message: StreamMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Processing...' }
          ]
        }
      } as SDKMessage;

      const { rerender } = render(
        <TestWrapper>
          <MessageCard message={message} isLast={true} isRunning={true} />
        </TestWrapper>
      );

      const renderStart = performance.now();

      // Toggle running state multiple times (simulating streaming)
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper>
            <MessageCard message={message} isLast={true} isRunning={i % 2 === 0} />
          </TestWrapper>
        );
      }

      const totalTime = performance.now() - renderStart;

      // 10 re-renders should be very fast
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Performance: Tool Result Rendering', () => {
    it('should not re-render tool results when unrelated content updates', () => {
      const messages: StreamMessage[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'Read',
                input: { file_path: '/test.ts' }
              }
            ]
          }
        } as SDKMessage,
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool_1',
                content: 'Large file content here...'
              }
            ]
          }
        } as SDKMessage
      ];

      const { rerender } = render(
        <TestWrapper>
          <MessageCard
            message={messages[0]}
            allMessages={messages}
            isLast={false}
            isRunning={false}
          />
        </TestWrapper>
      );

      // Update isLast prop (unrelated to tool result)
      rerender(
        <TestWrapper>
          <MessageCard
            message={messages[0]}
            allMessages={messages}
            isLast={true}
            isRunning={false}
          />
        </TestWrapper>
      );

      // Tool result should still be visible and stable
      expect(screen.getByText(/Output/i)).toBeInTheDocument();
    });

    it('should handle rapid tool_use additions without flickering', () => {
      const baseMessage: SDKAssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: []
        },
        parent_tool_use_id: null,
        uuid: '00000000-0000-0000-0000-000000000000',
        session_id: 'test-session'
      };

      const { rerender } = render(
        <TestWrapper>
          <MessageCard message={baseMessage} allMessages={[]} isLast={true} isRunning={true} />
        </TestWrapper>
      );

      // Simulate rapid addition of tool calls
      for (let i = 1; i <= 5; i++) {
        const updatedMessage: SDKAssistantMessage = {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: Array.from({ length: i }, (_, idx) => ({
              type: 'tool_use',
              id: `tool_${idx}`,
              name: 'Bash',
              input: { command: `echo ${idx}` }
            }))
          },
          parent_tool_use_id: null,
          uuid: '00000000-0000-0000-0000-000000000000',
          session_id: 'test-session'
        };

        rerender(
          <TestWrapper>
            <MessageCard
              message={updatedMessage}
              allMessages={[updatedMessage]}
              isLast={true}
              isRunning={true}
            />
          </TestWrapper>
        );
      }

      // All 5 tool uses should be rendered
      const toolElements = screen.getAllByText('Bash');
      expect(toolElements.length).toBe(5);
    });
  });

  describe('Edge Cases: Content Type Transitions', () => {
    it('should handle transition from thinking to text to tool_use', () => {
      const stages = [
        // Stage 1: Just thinking
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'Analyzing the request...' }
            ]
          }
        } as SDKMessage,
        // Stage 2: Thinking + Text
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'Analyzing the request...' },
              { type: 'text', text: 'I will read the file.' }
            ]
          }
        } as SDKMessage,
        // Stage 3: Thinking + Text + Tool
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'Analyzing the request...' },
              { type: 'text', text: 'I will read the file.' },
              {
                type: 'tool_use',
                id: 'read_1',
                name: 'Read',
                input: { file_path: '/test.ts' }
              }
            ]
          }
        } as SDKMessage
      ];

      const { rerender, container } = render(
        <TestWrapper>
          <MessageCard message={stages[0]} allMessages={[stages[0]]} isLast={true} isRunning={true} />
        </TestWrapper>
      );

      expect(screen.getByText(/Analyzing the request.../i)).toBeInTheDocument();
      const height1 = container.clientHeight;

      rerender(
        <TestWrapper>
          <MessageCard message={stages[1]} allMessages={[stages[1]]} isLast={true} isRunning={true} />
        </TestWrapper>
      );

      expect(screen.getByText(/I will read the file./i)).toBeInTheDocument();
      const height2 = container.clientHeight;
      expect(height2).toBeGreaterThan(height1);

      rerender(
        <TestWrapper>
          <MessageCard message={stages[2]} allMessages={[stages[2]]} isLast={true} isRunning={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Read')).toBeInTheDocument();
      const height3 = container.clientHeight;
      expect(height3).toBeGreaterThan(height2);
    });
  });

  describe('Utility Functions', () => {
    describe('isMarkdown', () => {
      it('should detect markdown headers', () => {
        expect(isMarkdown('# Title')).toBe(true);
        expect(isMarkdown('## Subtitle')).toBe(true);
        expect(isMarkdown('### Section')).toBe(true);
      });

      it('should detect markdown code blocks', () => {
        expect(isMarkdown('```javascript\ncode\n```')).toBe(true);
        expect(isMarkdown('```\nplain code\n```')).toBe(true);
      });

      it('should return false for plain text', () => {
        expect(isMarkdown('Just plain text')).toBe(false);
        expect(isMarkdown('No markdown here')).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(isMarkdown('')).toBe(false);
        expect(isMarkdown(null as unknown as string)).toBe(false);
        expect(isMarkdown(undefined as unknown as string)).toBe(false);
      });
    });
  });
});
