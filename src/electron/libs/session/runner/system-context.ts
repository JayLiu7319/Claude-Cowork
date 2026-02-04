/**
 * Build the system context prompt for the first message in a new conversation.
 * This prompt is prepended to the user's actual message to provide important context.
 * It is NOT sent to the frontend and NOT rendered in the UI.
 */
export function buildFirstMessageSystemContext(cwd: string, planMode?: boolean): string {
    let context = `<SYSTEM_CONTEXT>
当前工作路径: ${cwd}

重要规则：
1. 所有文件写入操作必须且只能在工作路径 "${cwd}" 或其子目录下执行
2. 所有文件删除操作必须且只能在工作路径 "${cwd}" 或其子目录下执行
3. 禁止在工作路径之外的任何位置进行写入或删除操作
4. 读取操作可以访问系统其他位置，但写入和删除必须严格限制在工作路径内
</SYSTEM_CONTEXT>

`;

    if (planMode) {
        context += `<PLAN_MODE>
你当前处于"计划模式"。在执行任何实际操作之前，你必须：

1. **分析任务**：仔细分析用户的需求，理解任务目标
2. **制定计划**：输出一个详细的执行计划，包含：
   - 将要执行的具体步骤（按顺序编号）
   - 每个步骤将涉及的文件或操作
   - 预期的结果或产出
   - 可能的风险或注意事项

3. **请求确认**：计划输出完成后，使用 AskUserQuestion 工具询问用户是否确认执行此计划
   - 如果用户确认，按计划执行
   - 如果用户拒绝或要求修改，根据反馈调整计划

重要：在用户明确确认之前，不要执行任何会修改文件、运行命令或产生副作用的操作。
</PLAN_MODE>

`;
    }

    return context;
}
