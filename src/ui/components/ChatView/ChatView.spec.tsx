import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatViewProps } from './types';
import { ChatView } from './ChatView';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./ChatHeader', () => ({
  ChatHeader: ({ title }: { title: string }) => <div data-testid="chat-header">{title}</div>,
}));

vi.mock('../EventCard', () => ({
  MessageCard: ({ message }: { message: { type: string } }) => (
    <div data-testid="message-card">{message.type}</div>
  ),
}));

vi.mock('../SkeletonLoader', () => ({
  SkeletonLoader: () => <div data-testid="skeleton-loader">loading</div>,
}));

vi.mock('../EnhancedPromptInput/EnhancedPromptInput', () => ({
  EnhancedPromptInput: ({
    disabled,
    showNewMessageButton,
    showScrollToBottomButton,
    onScrollToBottom,
  }: {
    disabled: boolean;
    showNewMessageButton: boolean;
    showScrollToBottomButton: boolean;
    onScrollToBottom: () => void;
  }) => (
    <div
      data-testid="enhanced-prompt-input"
      data-disabled={String(disabled)}
      data-new-message={String(showNewMessageButton)}
      data-scroll-to-bottom={String(showScrollToBottomButton)}
    >
      <button type="button" onClick={onScrollToBottom}>
        scroll-to-bottom
      </button>
    </div>
  ),
}));

vi.mock('../../render/markdown', () => ({
  default: ({ text }: { text: string }) => <div data-testid="partial-markdown">{text}</div>,
}));

describe('ChatView integration', () => {
  const makeProps = (overrides: Partial<ChatViewProps> = {}): ChatViewProps => ({
    activeSession: {
      id: 'session-1',
      title: 'Session Title',
      hydrated: true,
    } as ChatViewProps['activeSession'],
    activeSessionId: 'session-1',
    messages: [{ type: 'user_prompt', prompt: 'hello' } as ChatViewProps['messages'][number]],
    permissionRequests: [],
    isRunning: false,
    visibleMessages: [
      {
        originalIndex: 0,
        message: { type: 'user_prompt', prompt: 'hello' } as ChatViewProps['messages'][number],
      },
    ],
    hasMoreHistory: false,
    totalMessages: 1,
    scrollContainerRef: createRef<HTMLDivElement>(),
    messagesEndRef: createRef<HTMLDivElement>(),
    topSentinelRef: createRef<HTMLDivElement>(),
    shouldAutoScroll: true,
    hasNewMessages: false,
    handleScroll: vi.fn(),
    scrollToBottom: vi.fn(),
    partialMessage: '',
    showSkeleton: false,
    isWindows: false,
    isSidebarOpen: true,
    isRightPanelOpen: false,
    prefersReducedMotion: false,
    toggleSidebar: vi.fn(),
    toggleRightPanel: vi.fn(),
    sendEvent: vi.fn(),
    onPermissionResult: vi.fn(),
    onSendMessage: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show beginning marker when no more history and messages exist', () => {
    render(<ChatView {...makeProps({ hasMoreHistory: false, totalMessages: 2 })} />);

    expect(screen.getByText('sidebar.beginningOfConversation')).toBeInTheDocument();
  });

  it('should render skeleton when session is not hydrated and visible messages are empty', () => {
    render(
      <ChatView
        {...makeProps({
          activeSession: { id: 'session-1', title: 'Session Title', hydrated: false } as ChatViewProps['activeSession'],
          visibleMessages: [],
          totalMessages: 0,
        })}
      />
    );

    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('should render empty state when hydrated session has no visible messages', () => {
    render(
      <ChatView
        {...makeProps({
          activeSession: { id: 'session-1', title: 'Session Title', hydrated: true } as ChatViewProps['activeSession'],
          visibleMessages: [],
          totalMessages: 0,
        })}
      />
    );

    expect(screen.getByText('emptyState.title')).toBeInTheDocument();
    expect(screen.getByText('emptyState.description')).toBeInTheDocument();
  });

  it('should wire scroll handler to scroll container', () => {
    const handleScroll = vi.fn();
    const props = makeProps({ handleScroll });
    render(<ChatView {...props} />);

    expect(props.scrollContainerRef.current).not.toBeNull();
    fireEvent.scroll(props.scrollContainerRef.current!);
    expect(handleScroll).toHaveBeenCalledTimes(1);
  });

  it('should pass new-message CTA state to input when auto-scroll is off with new messages', () => {
    render(
      <ChatView
        {...makeProps({
          shouldAutoScroll: false,
          hasNewMessages: true,
        })}
      />
    );

    const input = screen.getByTestId('enhanced-prompt-input');
    expect(input).toHaveAttribute('data-new-message', 'true');
    expect(input).toHaveAttribute('data-scroll-to-bottom', 'false');
  });

  it('should pass scroll-to-bottom CTA state and trigger handler', () => {
    const scrollToBottom = vi.fn();
    render(
      <ChatView
        {...makeProps({
          shouldAutoScroll: false,
          hasNewMessages: false,
          scrollToBottom,
        })}
      />
    );

    const input = screen.getByTestId('enhanced-prompt-input');
    expect(input).toHaveAttribute('data-new-message', 'false');
    expect(input).toHaveAttribute('data-scroll-to-bottom', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'scroll-to-bottom' }));
    expect(scrollToBottom).toHaveBeenCalledTimes(1);
  });
});
