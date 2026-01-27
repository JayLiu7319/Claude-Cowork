# 多品牌构建问题修复文档

## 问题描述

在实施多品牌架构后，开发环境（`bun run dev:bio`）工作正常，但打包后的应用（`bun run dist:bio:win` 和 GitHub Actions 构建）出现问题：
- 欢迎页、配色等依然是商业版本
- 图标 logo 路径不正确

## 根本原因

**环境变量丢失**：构建时设置的 `BRAND` 环境变量只影响构建过程，但在打包后的应用中，`process.env.BRAND` 无法读取（总是 undefined），导致默认加载 business 配置。

## 解决方案

### 1. 创建品牌标识文件机制

在构建过程中将品牌信息写入 `.brand` 文件，打包后的应用读取此文件而非环境变量。

**新增文件：`scripts/write-brand-info.ts`**
```typescript
#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';

const BRAND = process.env.BRAND || 'business';

// 写入品牌信息到构建输出目录
const brandInfoPath = path.join(process.cwd(), 'dist-electron', '.brand');
fs.mkdirSync(path.dirname(brandInfoPath), { recursive: true });
fs.writeFileSync(brandInfoPath, BRAND, 'utf-8');

console.log(`✓ Written brand info: ${BRAND} to ${brandInfoPath}`);
```

### 2. 修改品牌配置加载逻辑

**修改：`src/electron/libs/brand-config.ts`**

改为按优先级读取品牌 ID：
1. **优先级 1**：读取 `.brand` 文件（生产构建）
2. **优先级 2**：读取环境变量 `BRAND`（开发环境）
3. **优先级 3**：默认为 `business`

关键代码：
```typescript
function getBrandId(): string {
  if (cachedBrandId) {
    return cachedBrandId;
  }

  // Priority 1: Read from .brand file (production builds)
  try {
    const brandFilePath = path.join(__dirname, '../../.brand');
    if (fs.existsSync(brandFilePath)) {
      cachedBrandId = fs.readFileSync(brandFilePath, 'utf-8').trim();
      return cachedBrandId;
    }
  } catch (error) {
    // Continue to next priority
  }

  // Priority 2: Environment variable (development)
  const envBrand = process.env.BRAND;
  if (envBrand) {
    cachedBrandId = envBrand;
    return cachedBrandId;
  }

  // Priority 3: Default to business
  cachedBrandId = 'business';
  return cachedBrandId;
}
```

### 3. 更新构建脚本

**修改：`package.json`**

在所有品牌构建脚本中添加 `bun run scripts/write-brand-info.ts` 步骤：

```json
{
  "scripts": {
    "dist:business:win": "cross-env BRAND=business bun run transpile:electron && bun run scripts/write-brand-info.ts && cross-env BRAND=business bun run build && electron-builder --win --x64 --config electron-builder.business.json",
    "dist:bio:win": "cross-env BRAND=bio-research bun run transpile:electron && bun run scripts/write-brand-info.ts && cross-env BRAND=bio-research bun run build && electron-builder --win --x64 --config electron-builder.bio.json"
  }
}
```

### 4. 更新 GitHub Actions Workflow

**修改：`.github/workflows/build.yaml`**

添加环境变量设置步骤，确保 BRAND 值在整个构建过程中可用：

```yaml
- name: Set Brand Environment (Linux/Mac)
  if: runner.os != 'Windows'
  run: echo "BRAND=${{ matrix.brand == 'bio' && 'bio-research' || 'business' }}" >> $GITHUB_ENV

- name: Set Brand Environment (Windows)
  if: runner.os == 'Windows'
  run: echo "BRAND=${{ matrix.brand == 'bio' && 'bio-research' || 'business' }}" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append
```

## 构建流程

### 本地构建

```bash
# 商业版本
bun run dist:business:win

# 生物科研版本
bun run dist:bio:win
```

### GitHub Actions 构建

推送标签或手动触发 workflow：
```bash
git tag v0.1.1
git push origin v0.1.1
```

或在 GitHub 网页界面手动触发 "Build and Release" workflow。

## 验证方法

### 1. 检查 .brand 文件

构建后检查：
```bash
cat dist-electron/.brand
# 应该输出: bio-research 或 business
```

### 2. 运行打包后的应用

- 打开应用，检查欢迎页标题和副标题
- 检查主题配色（生物版应为蓝绿色系）
- 检查瀑布流内容（生物版应显示科研术语）

### 3. 检查日志

应用启动时会在控制台输出：
```
Brand ID loaded from .brand file: bio-research
```

## 关键文件清单

| 文件 | 作用 |
|-----|-----|
| `scripts/write-brand-info.ts` | 构建时写入品牌标识文件 |
| `src/electron/libs/brand-config.ts` | 运行时读取品牌配置 |
| `dist-electron/.brand` | 品牌标识文件（构建产物）|
| `brands/business.json` | 商业版品牌配置 |
| `brands/bio-research.json` | 生物科研版品牌配置 |
| `electron-builder.business.json` | 商业版打包配置 |
| `electron-builder.bio.json` | 生物科研版打包配置 |

## 常见问题

### Q: 为什么不直接使用环境变量？

A: 打包后的应用是独立的可执行文件，启动时没有构建时的环境变量。`.brand` 文件被打包到应用中，运行时可靠读取。

### Q: 开发环境为什么不需要 .brand 文件？

A: 开发环境使用 `cross-env` 设置环境变量，`brand-config.ts` 会优先读取 `.brand` 文件，如果不存在则回退到环境变量。

### Q: 图标路径问题如何解决？

A: 确保：
1. `electron-builder.bio.json` 中的 icon 路径正确：`./assets/icons/bio/app-icon.png`
2. extraResources 包含对应的图标文件
3. brands 配置中的 logo 路径使用相对路径：`./assets/icons/bio/logo.png`

## 相关文档

- [多品牌架构设计](./plans/2025-01-26-multi-brand-architecture.md)
- [构建配置说明](../README.md#构建)
