/**
 * UI Utils - 桶文件导出
 * 集中导出所有工具函数，简化导入路径
 *
 * @example
 * import { formatNumber, formatDuration, measureAverageCharWidth } from '@ui/utils';
 */

// Formatters
export {
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatDuration,
    formatPathForDisplay,
} from './formatters';

// Text measurement utilities
export {
    getSharedContext,
    measureAverageCharWidth,
    measureCharWidth,
    measurePlaceholderCharWidthDom,
} from './textMeasurement';

// Token utilities
export {
    TOKEN_PLACEHOLDER,
    TOKEN_PADDING_CHARS,
    TOKEN_SEPARATOR,
    createTokenId,
    createTokenPlaceholder,
    parseDisplayTokens,
    serializePrompt,
    findTrigger,
    countPlaceholders,
    getPlaceholderRuns,
    replacePlaceholderRuns,
    removePlaceholderBeforeCursor,
    removePlaceholderAtCursor,
    computeDiffRange,
} from './tokenUtils';

// Token utility types
export type {
    TokenRegistryItem,
    TriggerResult,
    ReplacePlaceholderResult,
    PlaceholderRemovalResult,
    DiffRange,
} from './tokenUtils';

// Markdown utilities
export { isMarkdown } from './markdownUtils';

// Extractors - Import directly from @shared/extractors for full functionality
// The following are available from @shared:
// - extractFileOperation, aggregateFileChanges (file-change-extractor)
// - findNodeByPath, updateFileTreeWithOperations, buildInitialFileTree (file-tree-builder)
// - extractTodosFromMessage, aggregateTodos (todo-extractor)
