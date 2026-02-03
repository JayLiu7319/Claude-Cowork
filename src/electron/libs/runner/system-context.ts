/**
 * Build the system context prompt for the first message in a new conversation.
 * This prompt is prepended to the user's actual message to provide important context.
 * It is NOT sent to the frontend and NOT rendered in the UI.
 */
export function buildFirstMessageSystemContext(cwd: string): string {
    return `<SYSTEM_CONTEXT>
当前工作路径: ${cwd}

重要规则：
1. 所有文件写入操作必须且只能在工作路径 "${cwd}" 或其子目录下执行
2. 所有文件删除操作必须且只能在工作路径 "${cwd}" 或其子目录下执行
3. 禁止在工作路径之外的任何位置进行写入或删除操作
4. 读取操作可以访问系统其他位置，但写入和删除必须严格限制在工作路径内
</SYSTEM_CONTEXT>

`;
}
