# 品牌插件分离设计方案

## 概述

本设计实现品牌级别的 Skills 和 Plugins 配置分离，使商业版本和生物版本能够加载不同的插件集合：

- **商业版本（business）**：使用 `startup-business-analyst` + `core-skills`
- **生物版本（bio-research）**：使用 `claude-scientific-skills` + `core-skills`

## 设计决策

### 1. 配置方案选择

**选定方案：在品牌配置文件中指定插件名称列表**

在 `brands/business.json` 和 `brands/bio-research.json` 中添加 `plugins` 字段：

```json
{
  "plugins": ["startup-business-analyst", "core-skills"]
}
```

**优势：**
- 配置简洁清晰
- 易于维护和扩展
- 符合约定优于配置原则
- 未来可平滑升级到更复杂的配置结构

### 2. 插件共享策略

**选定方案：两个版本都使用 core-skills**

- 商业版：`startup-business-analyst` + `core-skills`
- 生物版：`claude-scientific-skills` + `core-skills`

**理由：**
core-skills 包含文档处理（docx、pptx）等通用功能，两个版本都可能需要。

### 3. 插件集成方式

**选定方案：克隆到本地并打包进应用（自动化脚本）**

- 在构建时自动检查和克隆 `claude-scientific-skills` 仓库
- 打包进 `resources/builtin-plugins/` 目录
- 像现有插件一样随应用分发

**优势：**
- 离线可用
- 版本可控
- 开发体验好（自动化处理）

## 技术架构

### 1. TypeScript 类型定义

**文件：** `src/electron/types.ts`

在 `BrandConfig` 接口中添加 `plugins` 字段：

```typescript
export interface BrandConfig {
  id: 'business' | 'bio-research';
  name: string;
  displayName: string;
  appTitle: string;
  subtitle: string;
  colors: {
    accent: string;
    accentHover: string;
    accentLight: string;
    accentSubtle: string;
  };
  waterfall?: {
    items: string[];
    enabled: boolean;
  };
  icons: {
    app: string;
    logo: string;
  };
  // 新增字段
  plugins?: string[];  // 插件名称列表，如 ["startup-business-analyst", "core-skills"]
}
```

**默认行为：** 如果品牌配置中没有 `plugins` 字段，则使用默认插件列表 `["core-skills"]`，确保向后兼容。

### 2. 品牌配置文件更新

**文件：** `brands/business.json`

```json
{
  "id": "business",
  "name": "agent-cowork-business",
  "displayName": "观复君Cowork",
  "appTitle": "观复君Cowork",
  "subtitle": "商业咨询与分析 · 您的智能参谋",
  "plugins": ["startup-business-analyst", "core-skills"],
  // ... 其他配置
}
```

**文件：** `brands/bio-research.json`

```json
{
  "id": "bio-research",
  "name": "agent-cowork-bio",
  "displayName": "生物基因CoScientist",
  "appTitle": "生物基因CoScientist",
  "subtitle": "TJU出品 · 生物科研智能助手 · 您的科研伙伴",
  "plugins": ["claude-scientific-skills", "core-skills"],
  // ... 其他配置
}
```

### 3. Runner 插件加载逻辑

**文件：** `src/electron/libs/runner.ts`

**当前代码（约 107-110 行）：**
```typescript
plugins: [
  { type: "local", path: path.join(bundledPluginsPath, 'startup-business-analyst') },
  { type: "local", path: path.join(bundledPluginsPath, 'core-skills') }
]
```

**修改为：**
```typescript
// 导入品牌配置加载器
import { loadBrandConfig } from './brand-config.js';

// 在 runClaude 函数内部
const brandConfig = loadBrandConfig();
const pluginNames = brandConfig.plugins ?? ['core-skills']; // 默认只加载 core-skills

plugins: pluginNames.map(name => ({
  type: "local" as const,
  path: path.join(bundledPluginsPath, name)
}))
```

### 4. Commands 加载过滤逻辑

**文件：** `src/electron/libs/commands.ts`

**修改 `loadGlobalCommands` 函数：**

在函数开头添加品牌配置加载和过滤：

```typescript
import { loadBrandConfig } from './brand-config.js';

export async function loadGlobalCommands(): Promise<Command[]> {
    const brandConfig = loadBrandConfig();
    const allowedPlugins = new Set(brandConfig.plugins ?? ['core-skills']);

    const commandsDir = getGlobalCommandsPath();
    const commands: Command[] = [];

    // ... 保持现有的 ~/.claude/commands 加载逻辑

    // 2. Load from bundled plugins
    try {
        const resourcesPath = getResourcesPath();
        const bundledPluginsPath = path.join(resourcesPath, 'resources', 'builtin-plugins');

        if (await fs.stat(bundledPluginsPath).then(s => s.isDirectory()).catch(() => false)) {
            const pluginDirs = await fs.readdir(bundledPluginsPath, { withFileTypes: true });

            for (const pluginDir of pluginDirs) {
                if (!pluginDir.isDirectory()) continue;

                // 只加载品牌配置中指定的插件
                if (!allowedPlugins.has(pluginDir.name)) continue;

                // ... 保持现有的命令加载逻辑
            }
        }
    } catch (err) {
        console.error("Failed to read bundled plugins commands:", err);
    }

    // ... 保持现有的排序和返回逻辑
}
```

### 5. 目录结构

```
resources/
└── builtin-plugins/
    ├── startup-business-analyst/    (现有)
    ├── core-skills/                 (现有)
    └── claude-scientific-skills/    (新增，自动克隆)
        ├── .claude-plugin/
        │   └── plugin.json
        ├── skills/
        │   ├── bioinformatics/
        │   ├── molecular-biology/
        │   └── ...
        └── commands/               (如果存在)
            └── ...
```

### 6. 自动化脚本设计

**文件：** `scripts/setup-plugins.ts`

**功能：**
1. 检查 `resources/builtin-plugins/claude-scientific-skills` 是否存在
2. 不存在则克隆 https://github.com/K-Dense-AI/claude-scientific-skills
3. 存在则可选择更新（根据参数）
4. 验证插件结构是否正确（检查 `.claude-plugin/plugin.json`）

**主要函数：**
```typescript
- checkPluginExists(): boolean
  // 检查目录是否存在

- clonePlugin(): Promise<void>
  // 使用 git clone 克隆仓库

- updatePlugin(): Promise<void>
  // 拉取最新代码（可选）

- verifyPlugin(): Promise<boolean>
  // 验证插件结构是否正确
```

**脚本参数：**
- `--update` - 更新已存在的插件到最新版本
- `--skip-verify` - 跳过插件结构验证
- `--quiet` - 静默模式，只输出错误

**环境变量：**
- `SKIP_PLUGIN_SETUP=1` - 跳过插件设置（CI 环境或离线开发）
- `FORCE_PLUGIN_UPDATE=1` - 强制更新已存在的插件

**错误处理策略：**
- **网络失败**：提示用户手动克隆，提供克隆命令
- **验证失败**：警告但不阻止构建（可能是开发中的插件）
- **Git 未安装**：明确提示需要安装 Git

### 7. NPM Scripts 集成

**文件：** `package.json`

添加以下 scripts：

```json
{
  "scripts": {
    "setup-plugins": "tsx scripts/setup-plugins.ts",
    "setup-plugins:update": "tsx scripts/setup-plugins.ts --update",
    "predev": "bun run setup-plugins",
    "prebuild": "bun run setup-plugins"
  }
}
```

**执行时机：**
- `bun run dev` 之前自动执行
- `bun run build` 之前自动执行
- 手动执行 `bun run setup-plugins:update` 可强制更新

### 8. Git 忽略配置

**文件：** `.gitignore`

添加：
```
# Auto-downloaded plugins
resources/builtin-plugins/claude-scientific-skills/
```

## 实施步骤

### 阶段 0：调研准备
1. **调研 claude-scientific-skills 仓库**
   - 访问 https://github.com/K-Dense-AI/claude-scientific-skills
   - 查看仓库结构，确认是否符合 Claude Plugin 规范
   - 阅读 README，了解插件功能和使用方式
   - 检查是否有 `.claude-plugin/plugin.json` 文件
   - 确认 skills 和 commands 的目录结构
   - 评估是否需要额外的配置或适配工作

### 阶段 1：基础架构（核心功能）
2. 更新 TypeScript 类型定义（`src/electron/types.ts`）
3. 更新品牌配置文件（`brands/business.json`, `brands/bio-research.json`）
4. 修改 runner.ts 插件加载逻辑（`src/electron/libs/runner.ts`）
5. 修改 commands.ts 命令过滤逻辑（`src/electron/libs/commands.ts`）

### 阶段 2：自动化脚本（开发体验）
6. 创建 setup-plugins.ts 脚本（`scripts/setup-plugins.ts`）
7. 更新 package.json 添加 npm scripts 钩子
8. 更新 .gitignore 忽略自动下载的插件

### 阶段 3：测试验证（质量保证）
9. 测试商业版本（应加载 startup-business-analyst + core-skills）
   - 验证插件是否正确加载
   - 验证 commands 是否正确显示
   - 验证 skills 是否可用
10. 测试生物版本（应加载 claude-scientific-skills + core-skills）
    - 验证插件是否正确加载
    - 验证 commands 是否正确显示
    - 验证 skills 是否可用
11. 测试自动化脚本在不同场景下的表现
    - 首次克隆
    - 更新现有插件
    - 网络失败场景
    - 离线开发场景（SKIP_PLUGIN_SETUP=1）

### 阶段 4：文档更新（知识传递）
12. 更新 README.md 和 README_ZH.md
    - 添加插件设置说明
    - 说明如何添加新品牌和插件
13. 更新 CLAUDE.md
    - 更新项目架构说明
    - 添加品牌插件配置机制说明

## 文件变更清单

### 需要修改的文件

**类型定义：**
- `src/electron/types.ts`

**配置文件：**
- `brands/business.json`
- `brands/bio-research.json`

**核心逻辑：**
- `src/electron/libs/runner.ts`
- `src/electron/libs/commands.ts`

**构建配置：**
- `package.json`
- `.gitignore`

### 需要新增的文件

**自动化脚本：**
- `scripts/setup-plugins.ts`

**文档：**
- `docs/plans/2026-01-27-brand-plugins-separation-design.md`（本文件）

## 风险和缓解措施

### 潜在风险

1. **claude-scientific-skills 仓库结构可能与预期不符**
   - **缓解措施**：在阶段 0 调研时确认结构，如有差异则调整适配逻辑

2. **网络问题导致克隆失败**
   - **缓解措施**：脚本中提供清晰的错误提示和手动克隆指引

3. **插件版本兼容性问题**
   - **缓解措施**：首次集成后可选择锁定特定版本（记录 commit hash）

4. **Git 未安装导致脚本失败**
   - **缓解措施**：脚本中检测 Git 是否可用，提供明确的安装指引

5. **CI/CD 环境可能无法访问 GitHub**
   - **缓解措施**：提供 `SKIP_PLUGIN_SETUP` 环境变量跳过自动设置

## 向后兼容性

- 如果品牌配置中没有 `plugins` 字段，默认加载 `["core-skills"]`
- 现有构建流程不受影响
- 对于不需要 claude-scientific-skills 的环境，脚本会自动跳过

## 未来扩展

### 可能的增强方向

1. **插件版本管理**
   - 在品牌配置中指定插件版本或 commit hash
   - 自动检测和更新插件

2. **插件市场**
   - 支持从远程仓库安装插件
   - 支持用户自定义插件

3. **插件配置热重载**
   - 运行时动态加载/卸载插件
   - 无需重启应用即可切换插件集

4. **插件依赖管理**
   - 自动解析插件依赖关系
   - 自动安装依赖插件

## 总结

本方案通过在品牌配置中添加插件列表，实现了品牌级别的 Skills 和 Plugins 分离。核心设计原则：

- **简洁性**：配置简单明了，易于理解
- **自动化**：通过脚本自动处理插件依赖
- **灵活性**：未来可平滑升级到更复杂的配置
- **兼容性**：保持向后兼容，不影响现有功能

实施后，商业版本和生物版本将拥有各自独立的插件集合，同时共享核心通用功能（core-skills），满足不同用户群体的需求。
