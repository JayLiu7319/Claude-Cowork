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

// Markdown utilities
export { isMarkdown } from './markdownUtils';

// Extractors - Import directly from @shared/extractors for full functionality
// The following are available from @shared:
// - extractFileOperation, aggregateFileChanges (file-change-extractor)
// - findNodeByPath, updateFileTreeWithOperations, buildInitialFileTree (file-tree-builder)
// - extractTodosFromMessage, aggregateTodos (todo-extractor)
