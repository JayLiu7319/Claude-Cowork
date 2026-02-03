import type { ChangeEvent, KeyboardEvent, UIEvent, RefObject } from "react";
import type { InputToken } from "@ui/types";
import { InlineBadge } from "@ui/components/InlineBadge";

type TokenInputCoreProps = {
  inputValue: string;
  displayTokens: InputToken[];
  hasDisplayContent: boolean;
  placeholderText: string;
  isInputDisabled: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onScroll: (e: UIEvent<HTMLTextAreaElement>) => void;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  displayRef: RefObject<HTMLDivElement | null>;
};

export function TokenInputCore({
  inputValue,
  displayTokens,
  hasDisplayContent,
  placeholderText,
  isInputDisabled,
  onChange,
  onKeyDown,
  onScroll,
  promptRef,
  displayRef
}: TokenInputCoreProps) {
  return (
    <div className="relative flex-1">
      <div
        ref={displayRef}
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words py-1.5 text-base leading-6 text-ink-800"
        aria-hidden="true"
      >
        {hasDisplayContent ? (
          displayTokens.map((token, idx) => {
            if (token.type === "text") {
              return <span key={`text-${idx}`}>{token.value}</span>;
            }
            const tokenOrder = displayTokens
              .slice(0, idx)
              .filter((item) => item.type !== "text").length;
            return (
              <span
                key={`token-${idx}`}
                data-token-order={tokenOrder}
                data-token-name={token.name}
              >
                <InlineBadge token={token} />
              </span>
            );
          })
        ) : (
          <span className="text-muted">{placeholderText}</span>
        )}
      </div>
      <textarea
        id="enhanced-prompt-input"
        name="prompt"
        rows={1}
        autoComplete="off"
        spellCheck={false}
        className="relative z-10 w-full resize-none bg-transparent py-1.5 text-base leading-6 text-transparent caret-ink-800 selection:bg-blue-400/40 selection:text-transparent focus:outline-none disabled:cursor-not-allowed"
        value={inputValue}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        disabled={isInputDisabled}
        ref={promptRef}
      />
    </div>
  );
}
