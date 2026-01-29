import { useState } from "react";
import type { InputToken } from "../types";

interface InlineBadgeProps {
  token: InputToken;
  onRemove?: () => void;
}

export function InlineBadge({ token, onRemove }: InlineBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (token.type === 'text') {
    return null; // Text tokens are rendered as regular text
  }

  const getIcon = () => {
    switch (token.type) {
      case 'command':
        return '⚡';
      case 'skill':
        return '🔧';
      case 'file':
        return '📄';
      default:
        return '';
    }
  };

  const getBadgeStyle = () => {
    switch (token.type) {
      case 'command':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'skill':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'file':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getTooltipContent = () => {
    switch (token.type) {
      case 'command':
        return `Command: /${token.name}`;
      case 'skill':
        return `Skill: ${token.name}`;
      case 'file':
        return `File: ${token.path}`;
      default:
        return '';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-base font-medium leading-6 border ${getBadgeStyle()} cursor-default relative align-middle`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="leading-none">{getIcon()}</span>
      <span className="leading-none">{token.name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 leading-none hover:bg-black/10 rounded px-1"
          aria-label="Remove"
        >
          ×
        </button>
      )}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
          {getTooltipContent()}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}
